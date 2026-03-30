import { v } from "convex/values";
import { mutation, query, internalMutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import { validateBulkRecipients, validateMessage, sanitizeMessage } from "./lib/validation";

// Internal mutation to update bulk campaign status (called by bulk sending actions)
export const updateBulkCampaignStatus = internalMutation({
  args: {
    bulkMessageId: v.id("bulkMessages"),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
    sentCount: v.optional(v.number()),
    failedCount: v.optional(v.number()),
    providerCampaignId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      status: args.status,
    };
    
    if (args.sentCount !== undefined) {
      updates.sentCount = args.sentCount;
    }
    if (args.failedCount !== undefined) {
      updates.failedCount = args.failedCount;
    }
    if (args.providerCampaignId !== undefined) {
      updates.providerCampaignId = args.providerCampaignId;
    }
    if (args.errorMessage !== undefined) {
      updates.errorMessage = args.errorMessage;
    }
    
    await ctx.db.patch(args.bulkMessageId, updates);
    
    // Update all recipient statuses based on campaign status
    const recipients = await ctx.db
      .query("bulkMessageRecipients")
      .withIndex("by_bulk", (q) => q.eq("bulkMessageId", args.bulkMessageId))
      .collect();
    
    const recipientStatus = args.status === "completed" ? "sent" : args.status === "failed" ? "failed" : "sending";
    
    for (const recipient of recipients) {
      await ctx.db.patch(recipient._id, { status: recipientStatus });
    }
  },
});

// Create a bulk SMS campaign
export const createBulkMessage = mutation({
  args: {
    name: v.string(),
    message: v.string(),
    recipients: v.array(v.string()), // Array of phone numbers
    from: v.optional(v.string()),
    scheduledAt: v.optional(v.number()),
    channel: v.optional(v.union(
      v.literal("sms"),
      v.literal("whatsapp"),
      v.literal("telegram"),
      v.literal("facebook_messenger")
    )),
  },
  handler: async (ctx, args) => {
    // Validate inputs first
    validateBulkRecipients(args.recipients, 10000);
    validateMessage(args.message);
    const sanitizedMessage = sanitizeMessage(args.message);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Support test mode: admin can test as client
    let clientId: Id<"clients"> | undefined;
    if (user.role === "admin" && user.testModeClientId) {
      clientId = user.testModeClientId;
    } else if (user.role === "client" && user.clientId) {
      clientId = user.clientId;
    }
    
    if (!clientId) {
      throw new ConvexError({
        message: "User not associated with a client",
        code: "FORBIDDEN",
      });
    }

    const client = await ctx.db.get(clientId);
    if (!client) {
      throw new ConvexError({
        message: "Client not found",
        code: "NOT_FOUND",
      });
    }

    if (client.status !== "active") {
      throw new ConvexError({
        message: "Client account is not active",
        code: "FORBIDDEN",
      });
    }

    // Determine which provider to use based on channel
    const channel = args.channel || "sms";
    let providerId = client.smsProviderId;
    
    if (channel === "whatsapp" && client.whatsappProviderId) {
      providerId = client.whatsappProviderId;
    } else if (channel === "telegram" && client.telegramProviderId) {
      providerId = client.telegramProviderId;
    } else if (channel === "facebook_messenger" && client.facebookMessengerProviderId) {
      providerId = client.facebookMessengerProviderId;
    }

    const provider = await ctx.db.get(providerId);
    if (!provider) {
      throw new ConvexError({
        message: `${channel} provider not found for this client`,
        code: "NOT_FOUND",
      });
    }

    if (!provider.isActive) {
      throw new ConvexError({
        message: "SMS provider is not active",
        code: "BAD_REQUEST",
      });
    }

    // Filter out opted-out contacts for compliance
    const complianceSettings = await ctx.db
      .query("complianceSettings")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .unique();

    const shouldBlock = !complianceSettings || complianceSettings.blockOptedOut;

    let filteredRecipients = args.recipients;
    let optedOutCount = 0;

    if (shouldBlock) {
      const filtered: string[] = [];
      for (const phone of args.recipients) {
        const contact = await ctx.db
          .query("contacts")
          .withIndex("by_client_and_phone", (q) =>
            q.eq("clientId", clientId).eq("phoneNumber", phone)
          )
          .unique();
        if (contact?.isOptedOut) {
          optedOutCount++;
        } else {
          filtered.push(phone);
        }
      }
      filteredRecipients = filtered;

      if (filteredRecipients.length === 0) {
        throw new ConvexError({
          message: `All ${optedOutCount} recipients are opted out. No messages will be sent.`,
          code: "BAD_REQUEST",
        });
      }
    }

    const totalRecipients = filteredRecipients.length;
    const totalCost = totalRecipients * provider.costPerSms;

    if (client.credits < totalCost) {
      throw new ConvexError({
        message: `Insufficient credits. Need ${totalCost} credits for ${totalRecipients} recipients`,
        code: "BAD_REQUEST",
      });
    }

    // Deduct credits upfront
    await ctx.db.patch(clientId, {
      credits: client.credits - totalCost,
    });

    // Create bulk message record
    const bulkMessageId = await ctx.db.insert("bulkMessages", {
      clientId,
      name: args.name,
      message: sanitizedMessage,
      from: args.from,
      channel,
      totalRecipients,
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      status: args.scheduledAt ? "pending" : "pending",
      scheduledAt: args.scheduledAt,
      creditsUsed: totalCost,
    });

    // Create recipient records
    for (const phoneNumber of filteredRecipients) {
      await ctx.db.insert("bulkMessageRecipients", {
        bulkMessageId,
        phoneNumber,
        status: "pending",
      });
    }

    // Schedule or start processing
    if (args.scheduledAt) {
      await ctx.scheduler.runAt(
        args.scheduledAt,
        internal.bulk.processBulkMessage,
        {
          bulkMessageId,
        }
      );
    } else {
      await ctx.scheduler.runAfter(0, internal.bulk.processBulkMessage, {
        bulkMessageId,
      });
    }

    return bulkMessageId;
  },
});

// Internal: Process bulk message
export const processBulkMessage = internalMutation({
  args: { bulkMessageId: v.id("bulkMessages") },
  handler: async (ctx, args) => {
    const bulkMessage = await ctx.db.get(args.bulkMessageId);
    if (!bulkMessage) {
      throw new ConvexError({
        message: "Bulk message not found",
        code: "NOT_FOUND",
      });
    }

    // Update status to processing
    await ctx.db.patch(args.bulkMessageId, {
      status: "processing",
    });

    const client = await ctx.db.get(bulkMessage.clientId);
    if (!client) {
      await ctx.db.patch(args.bulkMessageId, { status: "failed" });
      return;
    }

    // Use bulkSmsProviderId if available, otherwise fall back to smsProviderId
    const providerId = client.bulkSmsProviderId || client.smsProviderId;
    const provider = await ctx.db.get(providerId);
    if (!provider) {
      await ctx.db.patch(args.bulkMessageId, { status: "failed" });
      return;
    }

    // Get all pending recipients
    const recipients = await ctx.db
      .query("bulkMessageRecipients")
      .withIndex("by_bulk_and_status", (q) =>
        q.eq("bulkMessageId", args.bulkMessageId).eq("status", "pending")
      )
      .collect();

    // Check if provider is MTarget - use bulk API for efficiency
    if (provider.type === "mtarget") {
      // Format recipients for MTarget bulk API
      const formattedRecipients = recipients.map((r) => ({
        phoneNumber: r.phoneNumber,
        recipientId: r._id,
      }));

      // Update all recipients to "sending" status
      for (const recipient of recipients) {
        await ctx.db.patch(recipient._id, { status: "sending" });
      }

      // Schedule the MTarget bulk action
      await ctx.scheduler.runAfter(0, internal.sms.send.sendBulkCampaignMTarget, {
        bulkMessageId: args.bulkMessageId,
        config: {
          username: provider.config.username,
          password: provider.config.password,
          senderId: client.senderId || provider.config.senderId,
          serviceId: provider.config.serviceId,
        },
        campaign: {
          message: bulkMessage.message,
          sender: client.senderId || provider.config.senderId || "SAYELESEND",
          recipients: formattedRecipients,
          scheduledAt: bulkMessage.scheduledAt,
        },
      });

      return;
    }

    // For non-MTarget providers, process each recipient individually
    for (const recipient of recipients) {
      try {
        // Create individual message
        const messageId = await ctx.db.insert("messages", {
          clientId: bulkMessage.clientId,
          to: recipient.phoneNumber,
          from: client.senderId || bulkMessage.from || provider.config.senderId || "SAYELESEND",
          message: bulkMessage.message,
          channel: provider.channel || "sms",
          status: "pending",
          providerId: providerId,
          creditsUsed: provider.costPerSms,
          type: "bulk",
          bulkMessageId: args.bulkMessageId,
        });

        // Update recipient with messageId
        await ctx.db.patch(recipient._id, {
          messageId,
        });

        // Schedule sending
        await ctx.scheduler.runAfter(0, internal.sms.send.sendSingleMessage, {
          messageId,
        });
      } catch (error) {
        // Mark recipient as failed
        await ctx.db.patch(recipient._id, {
          status: "failed",
        });
      }
    }

    // Update bulk message status
    await ctx.db.patch(args.bulkMessageId, {
      status: "completed",
    });
  },
});

// Get bulk messages for a client
export const getBulkMessages = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Get clientId based on role and test mode
    let clientId: Id<"clients"> | undefined;
    if (user.role === "admin" && user.testModeClientId) {
      clientId = user.testModeClientId;
    } else if (user.role === "client" && user.clientId) {
      clientId = user.clientId;
    }

    // Admin (not in test mode) can see all bulk messages
    if (user.role === "admin" && !user.testModeClientId) {
      return await ctx.db
        .query("bulkMessages")
        .order("desc")
        .take(50);
    }

    // Client users or admin in test mode can only see their client's bulk messages
    if (!clientId) {
      return [];
    }

    return await ctx.db
      .query("bulkMessages")
      .withIndex("by_client", (q) => q.eq("clientId", clientId!))
      .order("desc")
      .take(50);
  },
});

// Get bulk message details
export const getBulkMessageDetails = query({
  args: { bulkMessageId: v.id("bulkMessages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    const bulkMessage = await ctx.db.get(args.bulkMessageId);
    if (!bulkMessage) {
      throw new ConvexError({
        message: "Bulk message not found",
        code: "NOT_FOUND",
      });
    }

    // Check access: admin has access to all, client/test mode only to their own
    if (user.role === "client" && user.clientId !== bulkMessage.clientId) {
      throw new ConvexError({
        message: "Access denied",
        code: "FORBIDDEN",
      });
    }
    
    // Admin in test mode can only access their test client's campaigns
    if (user.role === "admin" && user.testModeClientId && user.testModeClientId !== bulkMessage.clientId) {
      throw new ConvexError({
        message: "Access denied",
        code: "FORBIDDEN",
      });
    }

    const recipients = await ctx.db
      .query("bulkMessageRecipients")
      .withIndex("by_bulk", (q) => q.eq("bulkMessageId", args.bulkMessageId))
      .collect();

    return {
      bulkMessage,
      recipients,
    };
  },
});

// Update bulk message stats (called by message status updates)
export const updateBulkMessageStats = internalMutation({
  args: {
    bulkMessageId: v.id("bulkMessages"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_bulk", (q) => q.eq("bulkMessageId", args.bulkMessageId))
      .collect();

    const sentCount = messages.filter((m) => m.status !== "failed").length;
    const deliveredCount = messages.filter((m) => m.status === "delivered")
      .length;
    const failedCount = messages.filter((m) => m.status === "failed").length;

    await ctx.db.patch(args.bulkMessageId, {
      sentCount,
      deliveredCount,
      failedCount,
    });
  },
});

// Resend a completed or failed bulk campaign
export const resendBulkMessage = mutation({
  args: { bulkMessageId: v.id("bulkMessages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    const originalBulkMessage = await ctx.db.get(args.bulkMessageId);
    if (!originalBulkMessage) {
      throw new ConvexError({
        message: "Bulk message not found",
        code: "NOT_FOUND",
      });
    }

    // Check access
    let clientId: Id<"clients"> | undefined;
    if (user.role === "admin" && user.testModeClientId) {
      clientId = user.testModeClientId;
    } else if (user.role === "client" && user.clientId) {
      clientId = user.clientId;
    } else if (user.role === "admin") {
      clientId = originalBulkMessage.clientId;
    }

    if (!clientId || clientId !== originalBulkMessage.clientId) {
      throw new ConvexError({
        message: "Access denied",
        code: "FORBIDDEN",
      });
    }

    // Only allow resending completed or failed campaigns
    if (originalBulkMessage.status !== "completed" && originalBulkMessage.status !== "failed") {
      throw new ConvexError({
        message: "Can only resend completed or failed campaigns",
        code: "BAD_REQUEST",
      });
    }

    const client = await ctx.db.get(clientId);
    if (!client) {
      throw new ConvexError({
        message: "Client not found",
        code: "NOT_FOUND",
      });
    }

    if (client.status !== "active") {
      throw new ConvexError({
        message: "Client account is not active",
        code: "FORBIDDEN",
      });
    }

    // Get original recipients
    const originalRecipients = await ctx.db
      .query("bulkMessageRecipients")
      .withIndex("by_bulk", (q) => q.eq("bulkMessageId", args.bulkMessageId))
      .collect();

    const recipients = originalRecipients.map((r) => r.phoneNumber);

    // Check provider
    const channel = originalBulkMessage.channel || "sms";
    let providerId = client.smsProviderId;
    
    if (channel === "whatsapp" && client.whatsappProviderId) {
      providerId = client.whatsappProviderId;
    } else if (channel === "telegram" && client.telegramProviderId) {
      providerId = client.telegramProviderId;
    } else if (channel === "facebook_messenger" && client.facebookMessengerProviderId) {
      providerId = client.facebookMessengerProviderId;
    }

    const provider = await ctx.db.get(providerId);
    if (!provider) {
      throw new ConvexError({
        message: `${channel} provider not found for this client`,
        code: "NOT_FOUND",
      });
    }

    if (!provider.isActive) {
      throw new ConvexError({
        message: "Provider is not active",
        code: "BAD_REQUEST",
      });
    }

    const totalRecipients = recipients.length;
    const totalCost = totalRecipients * provider.costPerSms;

    if (client.credits < totalCost) {
      throw new ConvexError({
        message: `Insufficient credits. Need ${totalCost} credits for ${totalRecipients} recipients`,
        code: "BAD_REQUEST",
      });
    }

    // Deduct credits
    await ctx.db.patch(clientId, {
      credits: client.credits - totalCost,
    });

    // Create new bulk message record
    const newBulkMessageId = await ctx.db.insert("bulkMessages", {
      clientId,
      name: `${originalBulkMessage.name} (Resend)`,
      message: originalBulkMessage.message,
      from: originalBulkMessage.from,
      channel: originalBulkMessage.channel,
      totalRecipients,
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      status: "pending",
      creditsUsed: totalCost,
    });

    // Create recipient records
    for (const phoneNumber of recipients) {
      await ctx.db.insert("bulkMessageRecipients", {
        bulkMessageId: newBulkMessageId,
        phoneNumber,
        status: "pending",
      });
    }

    // Schedule processing
    await ctx.scheduler.runAfter(0, internal.bulk.processBulkMessage, {
      bulkMessageId: newBulkMessageId,
    });

    return newBulkMessageId;
  },
});
