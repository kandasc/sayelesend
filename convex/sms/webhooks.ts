import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel.d.ts";

export const handleDeliveryUpdate = internalMutation({
  args: {
    provider: v.union(
      v.literal("twilio"),
      v.literal("vonage"),
      v.literal("africastalking"),
      v.literal("other")
    ),
    data: v.string(),
  },
  handler: async (ctx, args) => {
    const data = JSON.parse(args.data) as Record<string, unknown>;

    let providerMessageId: string | undefined;
    let status: "delivered" | "failed" | undefined;

    switch (args.provider) {
      case "twilio": {
        providerMessageId = data.MessageSid as string;
        const twilioStatus = data.MessageStatus as string;
        if (twilioStatus === "delivered") {
          status = "delivered";
        } else if (
          twilioStatus === "failed" ||
          twilioStatus === "undelivered"
        ) {
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
    }

    if (providerMessageId && status) {
      const messages = await ctx.db.query("messages").collect();
      const message = messages.find(
        (m) => m.providerMessageId === providerMessageId
      );

      if (message) {
        const updates: {
          status: "delivered" | "failed";
          deliveredAt?: number;
          failureReason?: string;
        } = {
          status,
        };

        if (status === "delivered") {
          updates.deliveredAt = Date.now();
        } else if (status === "failed") {
          updates.failureReason = "Delivery failed";

          const client = await ctx.db.get(message.clientId);
          if (client) {
            await ctx.db.patch(message.clientId, {
              credits: client.credits + message.creditsUsed,
            });
          }
        }

        await ctx.db.patch(message._id, updates);

        // Create webhook event for delivery status
        const client = await ctx.db.get(message.clientId);
        if (client && client.webhookUrl) {
          const payload = {
            event: status === "delivered" ? "message.delivered" : "message.failed",
            messageId: message._id,
            status: status,
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
    }
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
      // Find the client based on the "to" number (their registered number)
      // For simplicity, we'll find the first active provider for this type
      const providers = await ctx.db
        .query("smsProviders")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();

      const provider = providers[0];

      if (provider) {
        // Find client using this provider (simplified - in production you'd match by phone number)
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
            providerId: provider._id,
            providerMessageId: providerMessageId,
            receivedAt: Date.now(),
            processed: false,
          });

          // Create webhook event for incoming message
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

          // Mark as processed
          await ctx.db.patch(messageId, { processed: true });
        }
      }
    }
  },
});
