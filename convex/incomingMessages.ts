import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import { internal } from "./_generated/api";

export const listIncomingMessages = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return [];
    }

    // Use test mode client if active
    const effectiveClientId = user.testModeClientId || user.clientId;

    if (!effectiveClientId) {
      return [];
    }

    return await ctx.db
      .query("incomingMessages")
      .withIndex("by_client", (q) => q.eq("clientId", effectiveClientId))
      .order("desc")
      .take(100);
  },
});

export const getIncomingMessage = query({
  args: { messageId: v.id("incomingMessages") },
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

    // Use test mode client if active
    const effectiveClientId = user.testModeClientId || user.clientId;

    if (message.clientId !== effectiveClientId) {
      throw new ConvexError({
        message: "Access denied",
        code: "FORBIDDEN",
      });
    }

    return message;
  },
});

export const receiveIncomingSms = internalMutation({
  args: {
    clientId: v.id("clients"),
    from: v.string(),
    to: v.string(),
    message: v.string(),
    channel: v.optional(v.union(
      v.literal("sms"),
      v.literal("whatsapp"),
      v.literal("telegram"),
      v.literal("facebook_messenger")
    )),
    providerId: v.id("smsProviders"),
    providerMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const channel = args.channel || "sms";
    const messageId = await ctx.db.insert("incomingMessages", {
      clientId: args.clientId,
      from: args.from,
      to: args.to,
      channel,
      message: args.message,
      providerId: args.providerId,
      providerMessageId: args.providerMessageId,
      receivedAt: Date.now(),
      processed: false,
    });

    // Update or create conversation thread
    await ctx.scheduler.runAfter(0, internal.conversations.upsertConversation, {
      clientId: args.clientId,
      contactPhone: args.from,
      channel,
      messageText: args.message,
      direction: "inbound",
      incomingMessageId: messageId,
    });

    // Create webhook event for incoming message
    const client = await ctx.db.get(args.clientId);
    if (client && client.webhookUrl) {
      const payload = {
        event: "message.received",
        messageId,
        from: args.from,
        to: args.to,
        message: args.message,
        receivedAt: Date.now(),
      };

      await ctx.db.insert("webhookEvents", {
        clientId: args.clientId,
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

    // Trigger automation processing
    await ctx.scheduler.runAfter(0, internal.automation.processIncomingMessage, {
      incomingMessageId: messageId,
    });

    return messageId;
  },
});

export const markAsProcessed = mutation({
  args: { messageId: v.id("incomingMessages") },
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

    // Use test mode client if active
    const effectiveClientId = user.testModeClientId || user.clientId;

    if (message.clientId !== effectiveClientId) {
      throw new ConvexError({
        message: "Access denied",
        code: "FORBIDDEN",
      });
    }

    await ctx.db.patch(args.messageId, { processed: true });
    return args.messageId;
  },
});

export const getIncomingStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { total: 0, unprocessed: 0, todayCount: 0 };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return { total: 0, unprocessed: 0, todayCount: 0 };
    }

    // Use test mode client if active
    const effectiveClientId = user.testModeClientId || user.clientId;

    if (!effectiveClientId) {
      return { total: 0, unprocessed: 0, todayCount: 0 };
    }

    const allMessages = await ctx.db
      .query("incomingMessages")
      .withIndex("by_client", (q) => q.eq("clientId", effectiveClientId))
      .collect();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTimestamp = todayStart.getTime();

    return {
      total: allMessages.length,
      unprocessed: allMessages.filter((m) => !m.processed).length,
      todayCount: allMessages.filter((m) => m.receivedAt >= todayTimestamp)
        .length,
    };
  },
});
