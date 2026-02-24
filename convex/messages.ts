import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import { validatePhoneNumber, validateMessage, sanitizeMessage } from "./lib/validation";

// Send a single SMS
export const sendSms = mutation({
  args: {
    to: v.string(),
    message: v.string(),
    from: v.optional(v.string()),
    scheduledAt: v.optional(v.number()),
    clientId: v.optional(v.id("clients")),
    channel: v.optional(v.union(
      v.literal("sms"),
      v.literal("whatsapp"),
      v.literal("telegram"),
      v.literal("facebook_messenger")
    )),
  },
  handler: async (ctx, args) => {
    // Validate inputs first
    validatePhoneNumber(args.to);
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

    let clientId = args.clientId;

    if (user.role === "client") {
      if (!user.clientId) {
        throw new ConvexError({
          message: "User not associated with a client",
          code: "FORBIDDEN",
        });
      }
      clientId = user.clientId;
    } else if (user.role === "admin" && !clientId) {
      throw new ConvexError({
        message: "Client ID required for admin users",
        code: "BAD_REQUEST",
      });
    }

    if (!clientId) {
      throw new ConvexError({
        message: "Client ID not found",
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
        message: `${channel} provider is not active`,
        code: "BAD_REQUEST",
      });
    }

    // Check opt-out compliance before sending
    const recipientContact = await ctx.db
      .query("contacts")
      .withIndex("by_client_and_phone", (q) =>
        q.eq("clientId", clientId).eq("phoneNumber", args.to)
      )
      .unique();

    // Fetch compliance settings once (used for opt-out blocking and footer)
    const complianceSettings = await ctx.db
      .query("complianceSettings")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .unique();

    if (recipientContact?.isOptedOut) {
      // Block by default, or if explicitly enabled
      if (!complianceSettings || complianceSettings.blockOptedOut) {
        throw new ConvexError({
          message: "Cannot send to this number — recipient has opted out. Remove from suppression list first.",
          code: "FORBIDDEN",
        });
      }
    }

    if (client.credits < provider.costPerSms) {
      throw new ConvexError({
        message: "Insufficient credits",
        code: "BAD_REQUEST",
      });
    }

    // Append unsubscribe footer if enabled
    let finalMessage = sanitizedMessage;
    if (complianceSettings?.addUnsubscribeFooter && complianceSettings.unsubscribeFooterText) {
      finalMessage = `${sanitizedMessage}\n\n${complianceSettings.unsubscribeFooterText}`;
    }

    await ctx.db.patch(clientId, {
      credits: client.credits - provider.costPerSms,
    });

    const messageId = await ctx.db.insert("messages", {
      clientId: clientId,
      to: args.to,
      from: client.senderId || args.from || provider.config.senderId || "SAYELE",
      message: finalMessage,
      channel,
      status: args.scheduledAt ? "scheduled" : "pending",
      providerId,
      scheduledAt: args.scheduledAt,
      creditsUsed: provider.costPerSms,
      type: args.scheduledAt ? "scheduled" : "single",
    });

    // Update or create conversation thread
    await ctx.scheduler.runAfter(0, internal.conversations.upsertConversation, {
      clientId,
      contactPhone: args.to,
      channel,
      messageText: sanitizedMessage,
      direction: "outbound",
      messageId,
    });

    if (args.scheduledAt) {
      await ctx.scheduler.runAt(args.scheduledAt, internal.sms.send.sendScheduledMessage, {
        messageId,
      });
    } else {
      // Send immediately using sendSingleMessage for this specific message
      await ctx.scheduler.runAfter(0, internal.sms.send.sendSingleMessage, {
        messageId,
      });
    }

    return messageId;
  },
});

export const getMessages = query({
  args: {
    clientId: v.optional(v.id("clients")),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("queued"),
        v.literal("sent"),
        v.literal("delivered"),
        v.literal("failed"),
        v.literal("scheduled")
      )
    ),
  },
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

    let clientId = args.clientId;

    if (user.role === "client") {
      if (!user.clientId) {
        throw new ConvexError({
          message: "User not associated with a client",
          code: "FORBIDDEN",
        });
      }
      clientId = user.clientId;
    }

    if (!clientId) {
      if (user.role !== "admin") {
        throw new ConvexError({
          message: "Client ID required",
          code: "BAD_REQUEST",
        });
      }
      return await ctx.db.query("messages").order("desc").take(100);
    }

    if (args.status) {
      return await ctx.db
        .query("messages")
        .withIndex("by_client_and_status", (q) =>
          q.eq("clientId", clientId!).eq("status", args.status!)
        )
        .order("desc")
        .take(100);
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_client", (q) => q.eq("clientId", clientId!))
      .order("desc")
      .take(100);
  },
});

export const getMessage = query({
  args: { messageId: v.id("messages") },
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

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new ConvexError({
        message: "Message not found",
        code: "NOT_FOUND",
      });
    }

    if (user.role === "client" && user.clientId !== message.clientId) {
      throw new ConvexError({
        message: "Access denied",
        code: "FORBIDDEN",
      });
    }

    return message;
  },
});

export const updateMessageStatus = internalMutation({
  args: {
    messageId: v.id("messages"),
    status: v.union(
      v.literal("pending"),
      v.literal("queued"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed")
    ),
    providerMessageId: v.optional(v.string()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new ConvexError({
        message: "Message not found",
        code: "NOT_FOUND",
      });
    }

    const updates: {
      status: "pending" | "queued" | "sent" | "delivered" | "failed";
      providerMessageId?: string;
      sentAt?: number;
      deliveredAt?: number;
      failureReason?: string;
    } = {
      status: args.status,
    };

    if (args.providerMessageId) {
      updates.providerMessageId = args.providerMessageId;
    }

    if (args.status === "sent" && !message.sentAt) {
      updates.sentAt = Date.now();
    }

    if (args.status === "delivered" && !message.deliveredAt) {
      updates.deliveredAt = Date.now();
    }

    if (args.status === "failed") {
      updates.failureReason = args.failureReason || "Unknown error";

      const client = await ctx.db.get(message.clientId);
      if (client) {
        await ctx.db.patch(message.clientId, {
          credits: client.credits + message.creditsUsed,
        });
      }
    }

    await ctx.db.patch(args.messageId, updates);

    return args.messageId;
  },
});

export const getRecentMessages = query({
  args: {
    clientId: v.optional(v.id("clients")),
    limit: v.optional(v.number()),
  },
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

    let clientId = args.clientId;
    const limit = args.limit || 10;

    if (user.role === "client") {
      if (!user.clientId) {
        throw new ConvexError({
          message: "User not associated with a client",
          code: "FORBIDDEN",
        });
      }
      clientId = user.clientId;
    }

    if (!clientId) {
      if (user.role !== "admin") {
        throw new ConvexError({
          message: "Client ID required",
          code: "BAD_REQUEST",
        });
      }
      return await ctx.db.query("messages").order("desc").take(limit);
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_client", (q) => q.eq("clientId", clientId!))
      .order("desc")
      .take(limit);
  },
});

export const sendSmsViaApi = mutation({
  args: {
    clientId: v.id("clients"),
    to: v.string(),
    message: v.string(),
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
    // Validate inputs
    validatePhoneNumber(args.to);
    validateMessage(args.message);
    const sanitizedMessage = sanitizeMessage(args.message);

    const client = await ctx.db.get(args.clientId);
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
        message: `${channel} provider is not active`,
        code: "BAD_REQUEST",
      });
    }

    if (client.credits < provider.costPerSms) {
      throw new ConvexError({
        message: "Insufficient credits",
        code: "BAD_REQUEST",
      });
    }

    await ctx.db.patch(args.clientId, {
      credits: client.credits - provider.costPerSms,
    });

    const messageId = await ctx.db.insert("messages", {
      clientId: args.clientId,
      to: args.to,
      from: client.senderId || args.from || provider.config.senderId || "SAYELE",
      message: sanitizedMessage,
      channel,
      status: args.scheduledAt ? "scheduled" : "pending",
      providerId,
      scheduledAt: args.scheduledAt,
      creditsUsed: provider.costPerSms,
      type: args.scheduledAt ? "scheduled" : "single",
    });

    if (args.scheduledAt) {
      await ctx.scheduler.runAt(args.scheduledAt, internal.sms.send.sendScheduledMessage, {
        messageId,
      });
    } else {
      // Send immediately using sendSingleMessage for this specific message
      await ctx.scheduler.runAfter(0, internal.sms.send.sendSingleMessage, {
        messageId,
      });
    }

    return messageId;
  },
});

export const getMessageViaApi = query({
  args: {
    messageId: v.id("messages"),
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      return null;
    }

    if (message.clientId !== args.clientId) {
      return null;
    }

    return message;
  },
});

// One-time cleanup: mark old "sent" messages as "delivered" (runs in batches, self-scheduling)
export const bulkMarkDelivered = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sentMessages = await ctx.db
      .query("messages")
      .withIndex("by_status", (q) => q.eq("status", "sent"))
      .take(200);

    let updated = 0;
    for (const msg of sentMessages) {
      await ctx.db.patch(msg._id, {
        status: "delivered",
        deliveredAt: msg.sentAt || msg._creationTime,
      });
      updated++;
    }

    // If there are more, schedule the next batch
    if (sentMessages.length === 200) {
      await ctx.scheduler.runAfter(500, internal.messages.bulkMarkDelivered, {});
    }

    console.log(`[Cleanup] Marked ${updated} messages as delivered. More remaining: ${sentMessages.length === 200}`);
    return { updated, remaining: sentMessages.length === 200 };
  },
});

// Trigger the bulk cleanup (admin-only)
export const triggerBulkMarkDelivered = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || user.role !== "admin") {
      throw new ConvexError({ message: "Admin access required", code: "FORBIDDEN" });
    }

    await ctx.scheduler.runAfter(0, internal.messages.bulkMarkDelivered, {});
    return { started: true };
  },
});

// One-time cleanup: mark old "sent" bulk recipients as "delivered" (runs in batches, self-scheduling)
export const bulkRecipientsMarkDelivered = internalMutation({
  args: {},
  handler: async (ctx) => {
    const sentRecipients = await ctx.db
      .query("bulkMessageRecipients")
      .withIndex("by_status", (q) => q.eq("status", "sent"))
      .take(200);

    let updated = 0;
    const campaignIds = new Set<string>();

    for (const recipient of sentRecipients) {
      await ctx.db.patch(recipient._id, {
        status: "delivered",
        deliveredAt: recipient._creationTime,
      });
      campaignIds.add(recipient.bulkMessageId);
      updated++;
    }

    // Refresh campaign stats for affected campaigns
    for (const campaignId of campaignIds) {
      const allRecipients = await ctx.db
        .query("bulkMessageRecipients")
        .withIndex("by_bulk", (q) => q.eq("bulkMessageId", campaignId as Id<"bulkMessages">))
        .collect();
      const deliveredCount = allRecipients.filter((r) => r.status === "delivered").length;
      const failedCount = allRecipients.filter((r) => r.status === "failed").length;
      const sentCount = allRecipients.filter((r) => r.status === "sent" || r.status === "delivered").length;
      await ctx.db.patch(campaignId as Id<"bulkMessages">, { deliveredCount, failedCount, sentCount });
    }

    // If there are more, schedule the next batch
    if (sentRecipients.length === 200) {
      await ctx.scheduler.runAfter(500, internal.messages.bulkRecipientsMarkDelivered, {});
    }

    console.log(`[Cleanup] Marked ${updated} bulk recipients as delivered. Campaigns updated: ${campaignIds.size}. More remaining: ${sentRecipients.length === 200}`);
    return { updated, remaining: sentRecipients.length === 200 };
  },
});

// Trigger the bulk recipients cleanup (admin-only)
export const triggerBulkRecipientsMarkDelivered = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || user.role !== "admin") {
      throw new ConvexError({ message: "Admin access required", code: "FORBIDDEN" });
    }

    await ctx.scheduler.runAfter(0, internal.messages.bulkRecipientsMarkDelivered, {});
    return { started: true };
  },
});
