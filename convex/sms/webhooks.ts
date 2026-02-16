import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const handleDeliveryUpdate = internalMutation({
  args: {
    provider: v.union(
      v.literal("twilio"),
      v.literal("vonage"),
      v.literal("africastalking"),
      v.literal("mtarget"),
      v.literal("other")
    ),
    data: v.string(),
  },
  handler: async (ctx, args) => {
    const data = JSON.parse(args.data) as Record<string, unknown>;

    let providerMessageId: string | undefined;
    let status: "delivered" | "failed" | "sent" | undefined;
    let deliveryTimestamp: number | undefined;
    let failureReason: string | undefined;
    let msisdn: string | undefined;

    switch (args.provider) {
      case "twilio": {
        providerMessageId = data.MessageSid as string;
        const twilioStatus = data.MessageStatus as string;
        if (twilioStatus === "delivered") {
          status = "delivered";
        } else if (twilioStatus === "failed" || twilioStatus === "undelivered") {
          status = "failed";
        }
        break;
      }

      case "vonage": {
        providerMessageId = data["message-id"] as string;
        const vonageStatus = data.status as string;
        if (vonageStatus === "delivered") {
          status = "delivered";
        } else if (vonageStatus === "failed" || vonageStatus === "rejected") {
          status = "failed";
        }
        break;
      }

      case "africastalking": {
        providerMessageId = data.id as string;
        const atStatus = data.status as string;
        if (atStatus === "Success") {
          status = "delivered";
        } else if (atStatus === "Failed") {
          status = "failed";
        }
        break;
      }

      case "mtarget": {
        providerMessageId = data.MsgId as string;
        msisdn = (data.Msisdn as string) || (data.msisdn as string);
        const mtargetStatus = data.Status as number;
        const statusText = data.StatusText as string;
        const reason = data.Reason as string;

        const deliveryDateTime = data.DeliveryDateTime as string;
        if (deliveryDateTime) {
          try {
            const parsedDate = new Date(deliveryDateTime.replace(" ", "T"));
            deliveryTimestamp = parsedDate.getTime();
          } catch {
            // Ignore parse errors
          }
        }

        // Status codes: 0=waiting, 1=in progress, 2=sent, 3=delivered, 4=refused, 6=not delivered
        switch (mtargetStatus) {
          case 3:
            status = "delivered";
            break;
          case 4:
          case 6:
            status = "failed";
            failureReason = reason || statusText || "Delivery failed";
            break;
          case 2:
            status = "sent";
            break;
        }
        break;
      }
    }

    if (providerMessageId && status) {
      // Check individual messages table first
      const messages = await ctx.db.query("messages").collect();
      const message = messages.find((m) => m.providerMessageId === providerMessageId);

      if (message) {
        const updates: {
          status: "delivered" | "failed" | "sent";
          deliveredAt?: number;
          sentAt?: number;
          failureReason?: string;
        } = { status };

        if (status === "delivered") {
          updates.deliveredAt = deliveryTimestamp || Date.now();
        } else if (status === "failed") {
          updates.failureReason = failureReason || "Delivery failed";
          // Refund credits on failure
          const client = await ctx.db.get(message.clientId);
          if (client) {
            await ctx.db.patch(message.clientId, {
              credits: client.credits + message.creditsUsed,
            });
          }
        } else if (status === "sent") {
          if (!message.sentAt) {
            updates.sentAt = Date.now();
          }
        }

        await ctx.db.patch(message._id, updates);

        // Create webhook event
        if (status === "delivered" || status === "failed") {
          const client = await ctx.db.get(message.clientId);
          if (client && client.webhookUrl) {
            const payload = {
              event: status === "delivered" ? "message.delivered" : "message.failed",
              messageId: message._id,
              status,
              to: message.to,
              from: message.from,
              message: message.message,
              sentAt: message.sentAt,
              deliveredAt: updates.deliveredAt,
              failureReason: updates.failureReason,
            };
            await ctx.db.insert("webhookEvents", {
              clientId: message.clientId,
              eventType: status === "delivered" ? "message.delivered" : "message.failed",
              messageId: message._id,
              payload: JSON.stringify(payload),
              status: "pending",
              attempts: 0,
              nextRetryAt: Date.now(),
            });
          }
        }
        return;
      }

      // If not in messages, check bulkMessageRecipients by providerMessageId
      const bulkRecipient = await ctx.db
        .query("bulkMessageRecipients")
        .withIndex("by_provider_msg", (q) => q.eq("providerMessageId", providerMessageId))
        .first();

      if (bulkRecipient) {
        const recipientUpdates: Record<string, unknown> = { status };
        if (status === "delivered") {
          recipientUpdates.deliveredAt = deliveryTimestamp || Date.now();
        } else if (status === "failed") {
          recipientUpdates.failureReason = failureReason || "Delivery failed";
        }
        await ctx.db.patch(bulkRecipient._id, recipientUpdates);

        // Refresh campaign stats
        const allRecipients = await ctx.db
          .query("bulkMessageRecipients")
          .withIndex("by_bulk", (q) => q.eq("bulkMessageId", bulkRecipient.bulkMessageId))
          .collect();
        const deliveredCount = allRecipients.filter((r) => r.status === "delivered").length;
        const failedCount = allRecipients.filter((r) => r.status === "failed").length;
        const sentCount = allRecipients.filter((r) => r.status === "sent" || r.status === "delivered").length;
        await ctx.db.patch(bulkRecipient.bulkMessageId, { deliveredCount, failedCount, sentCount });
        return;
      }
    }

    // Fallback for MTarget: match by phone number against recent bulk campaigns
    if (args.provider === "mtarget" && msisdn && status) {
      const cleanPhone = msisdn.replace(/[^\d]/g, "");
      const campaigns = await ctx.db
        .query("bulkMessages")
        .order("desc")
        .take(20);

      for (const campaign of campaigns) {
        if (campaign.status !== "processing" && campaign.status !== "completed") continue;

        // Check both "sent" and "sending" recipients (bug fix: was only checking "sending")
        const sentRecipients = await ctx.db
          .query("bulkMessageRecipients")
          .withIndex("by_bulk_and_status", (q) =>
            q.eq("bulkMessageId", campaign._id).eq("status", "sent")
          )
          .take(500);

        const sendingRecipients = await ctx.db
          .query("bulkMessageRecipients")
          .withIndex("by_bulk_and_status", (q) =>
            q.eq("bulkMessageId", campaign._id).eq("status", "sending")
          )
          .take(500);

        const allPending = [...sentRecipients, ...sendingRecipients];

        const match = allPending.find((r) => {
          const recipientClean = r.phoneNumber.replace(/[^\d]/g, "");
          return recipientClean === cleanPhone || recipientClean.endsWith(cleanPhone) || cleanPhone.endsWith(recipientClean);
        });

        if (match) {
          const recipientUpdates: Record<string, unknown> = { status };
          if (status === "delivered") {
            recipientUpdates.deliveredAt = deliveryTimestamp || Date.now();
          } else if (status === "failed") {
            recipientUpdates.failureReason = failureReason || "Delivery failed";
          }
          await ctx.db.patch(match._id, recipientUpdates);

          // Refresh campaign stats
          const allRecipients = await ctx.db
            .query("bulkMessageRecipients")
            .withIndex("by_bulk", (q) => q.eq("bulkMessageId", campaign._id))
            .collect();
          const deliveredCount = allRecipients.filter((r) => r.status === "delivered").length;
          const failedCount = allRecipients.filter((r) => r.status === "failed").length;
          const sentCount = allRecipients.filter((r) => r.status === "sent" || r.status === "delivered").length;
          await ctx.db.patch(campaign._id, { deliveredCount, failedCount, sentCount });
          return;
        }
      }
    }
  },
});

// Dedicated bulk DLR webhook handler for MTarget campaigns
export const handleBulkDeliveryUpdate = internalMutation({
  args: {
    data: v.string(),
  },
  handler: async (ctx, args) => {
    const data = JSON.parse(args.data) as Record<string, unknown>;

    const msgId = data.MsgId as string | undefined;
    const msisdn = (data.Msisdn as string) || (data.msisdn as string) || (data.MSISDN as string);
    const mtargetStatus = data.Status as number;
    const statusText = data.StatusText as string;
    const reason = data.Reason as string;

    let status: "delivered" | "failed" | "sent" | undefined;
    let deliveryTimestamp: number | undefined;
    let failureReason: string | undefined;

    const deliveryDateTime = data.DeliveryDateTime as string;
    if (deliveryDateTime) {
      try {
        const parsedDate = new Date(deliveryDateTime.replace(" ", "T"));
        deliveryTimestamp = parsedDate.getTime();
      } catch {
        // Ignore
      }
    }

    switch (mtargetStatus) {
      case 3:
        status = "delivered";
        break;
      case 4:
      case 6:
        status = "failed";
        failureReason = reason || statusText || "Delivery failed";
        break;
      case 2:
        status = "sent";
        break;
    }

    if (!status) return;

    // Try to find by providerMessageId first
    if (msgId) {
      const recipient = await ctx.db
        .query("bulkMessageRecipients")
        .withIndex("by_provider_msg", (q) => q.eq("providerMessageId", msgId))
        .first();

      if (recipient) {
        const updates: Record<string, unknown> = { status };
        if (status === "delivered") updates.deliveredAt = deliveryTimestamp || Date.now();
        if (status === "failed") updates.failureReason = failureReason || "Delivery failed";
        await ctx.db.patch(recipient._id, updates);

        // Refresh campaign stats
        const allRecipients = await ctx.db
          .query("bulkMessageRecipients")
          .withIndex("by_bulk", (q) => q.eq("bulkMessageId", recipient.bulkMessageId))
          .collect();
        const deliveredCount = allRecipients.filter((r) => r.status === "delivered").length;
        const failedCount = allRecipients.filter((r) => r.status === "failed").length;
        const sentCount = allRecipients.filter((r) => r.status === "sent" || r.status === "delivered").length;
        await ctx.db.patch(recipient.bulkMessageId, { deliveredCount, failedCount, sentCount });
        return;
      }
    }

    // Fallback: match by phone number against recent bulk campaigns
    if (msisdn) {
      const cleanPhone = msisdn.replace(/[^\d]/g, "");
      const campaigns = await ctx.db
        .query("bulkMessages")
        .order("desc")
        .take(20);

      for (const campaign of campaigns) {
        if (campaign.status !== "processing" && campaign.status !== "completed") continue;

        // Check both "sent" and "sending" recipients (bug fix: was only checking "sending")
        const sentRecipients = await ctx.db
          .query("bulkMessageRecipients")
          .withIndex("by_bulk_and_status", (q) =>
            q.eq("bulkMessageId", campaign._id).eq("status", "sent")
          )
          .take(500);

        const sendingRecipients = await ctx.db
          .query("bulkMessageRecipients")
          .withIndex("by_bulk_and_status", (q) =>
            q.eq("bulkMessageId", campaign._id).eq("status", "sending")
          )
          .take(500);

        const allPending = [...sentRecipients, ...sendingRecipients];

        const match = allPending.find((r) => {
          const recipientClean = r.phoneNumber.replace(/[^\d]/g, "");
          return recipientClean === cleanPhone || recipientClean.endsWith(cleanPhone) || cleanPhone.endsWith(recipientClean);
        });

        if (match) {
          const updates: Record<string, unknown> = { status };
          if (status === "delivered") updates.deliveredAt = deliveryTimestamp || Date.now();
          if (status === "failed") updates.failureReason = failureReason || "Delivery failed";
          await ctx.db.patch(match._id, updates);

          // Refresh campaign stats
          const allRecipients = await ctx.db
            .query("bulkMessageRecipients")
            .withIndex("by_bulk", (q) => q.eq("bulkMessageId", campaign._id))
            .collect();
          const deliveredCount = allRecipients.filter((r) => r.status === "delivered").length;
          const failedCount = allRecipients.filter((r) => r.status === "failed").length;
          const sentCount = allRecipients.filter((r) => r.status === "sent" || r.status === "delivered").length;
          await ctx.db.patch(campaign._id, { deliveredCount, failedCount, sentCount });
          return;
        }
      }
    }
  },
});

// Internal mutation to update a single bulk recipient's DLR status (called by checkBulkDlr action)
export const updateBulkRecipientDlr = internalMutation({
  args: {
    recipientId: v.id("bulkMessageRecipients"),
    bulkMessageId: v.id("bulkMessages"),
    status: v.union(v.literal("delivered"), v.literal("failed")),
    deliveredAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { status: args.status };
    if (args.status === "delivered") {
      updates.deliveredAt = args.deliveredAt || Date.now();
    }
    if (args.status === "failed" && args.failureReason) {
      updates.failureReason = args.failureReason;
    }
    await ctx.db.patch(args.recipientId, updates);

    // Refresh campaign-level stats
    const allRecipients = await ctx.db
      .query("bulkMessageRecipients")
      .withIndex("by_bulk", (q) => q.eq("bulkMessageId", args.bulkMessageId))
      .collect();
    const deliveredCount = allRecipients.filter((r) => r.status === "delivered").length;
    const failedCount = allRecipients.filter((r) => r.status === "failed").length;
    const sentCount = allRecipients.filter((r) => r.status === "sent" || r.status === "delivered").length;
    await ctx.db.patch(args.bulkMessageId, { deliveredCount, failedCount, sentCount });
  },
});

export const handleIncomingSms = internalMutation({
  args: {
    provider: v.union(
      v.literal("twilio"),
      v.literal("vonage"),
      v.literal("africastalking"),
      v.literal("mtarget"),
      v.literal("other")
    ),
    data: v.string(),
  },
  handler: async (ctx, args) => {
    const data = JSON.parse(args.data) as Record<string, unknown>;

    let from: string | undefined;
    let to: string | undefined;
    let message: string | undefined;
    let providerMessageId: string | undefined;

    switch (args.provider) {
      case "twilio": {
        from = data.From as string;
        to = data.To as string;
        message = data.Body as string;
        providerMessageId = data.MessageSid as string;
        break;
      }

      case "vonage": {
        from = data.msisdn as string;
        to = data.to as string;
        message = data.text as string;
        providerMessageId = data["message-id"] as string;
        break;
      }

      case "africastalking": {
        from = data.from as string;
        to = data.to as string;
        message = data.text as string;
        providerMessageId = data.id as string;
        break;
      }

      case "mtarget": {
        from = data.from as string;
        to = data.to as string;
        message = data.message as string;
        providerMessageId = data.id as string;
        break;
      }
    }

    if (from && to && message) {
      const providers = await ctx.db
        .query("smsProviders")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();

      const provider = providers[0];

      if (provider) {
        const clients = await ctx.db
          .query("clients")
          .filter((q) => q.eq(q.field("smsProviderId"), provider._id))
          .collect();

        const client = clients[0];

        if (client) {
          const messageId = await ctx.db.insert("incomingMessages", {
            clientId: client._id,
            from: from,
            to: to,
            message: message,
            channel: provider.channel || "sms",
            providerId: provider._id,
            providerMessageId: providerMessageId,
            receivedAt: Date.now(),
            processed: false,
          });

          if (client.webhookUrl) {
            const payload = {
              event: "message.received",
              messageId,
              from: from,
              to: to,
              message: message,
              receivedAt: Date.now(),
            };

            await ctx.db.insert("webhookEvents", {
              clientId: client._id,
              eventType: "message.received",
              incomingMessageId: messageId,
              payload: JSON.stringify(payload),
              status: "pending",
              attempts: 0,
              nextRetryAt: Date.now(),
            });
          }

          await ctx.db.patch(messageId, { processed: true });
        }
      }
    }
  },
});
