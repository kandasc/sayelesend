import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

export const listWebhookEvents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
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
      .query("webhookEvents")
      .withIndex("by_client", (q) => q.eq("clientId", effectiveClientId))
      .order("desc")
      .take(args.limit || 50);
  },
});

export const getWebhookStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { total: 0, pending: 0, success: 0, failed: 0 };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return { total: 0, pending: 0, success: 0, failed: 0 };
    }

    // Use test mode client if active
    const effectiveClientId = user.testModeClientId || user.clientId;

    if (!effectiveClientId) {
      return { total: 0, pending: 0, success: 0, failed: 0 };
    }

    const events = await ctx.db
      .query("webhookEvents")
      .withIndex("by_client", (q) => q.eq("clientId", effectiveClientId))
      .collect();

    return {
      total: events.length,
      pending: events.filter((e) => e.status === "pending").length,
      success: events.filter((e) => e.status === "success").length,
      failed: events.filter((e) => e.status === "failed").length,
    };
  },
});

export const createWebhookEvent = internalMutation({
  args: {
    clientId: v.id("clients"),
    eventType: v.union(
      v.literal("message.sent"),
      v.literal("message.delivered"),
      v.literal("message.failed"),
      v.literal("message.received")
    ),
    messageId: v.optional(v.id("messages")),
    incomingMessageId: v.optional(v.id("incomingMessages")),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("webhookEvents", {
      clientId: args.clientId,
      eventType: args.eventType,
      messageId: args.messageId,
      incomingMessageId: args.incomingMessageId,
      payload: args.payload,
      status: "pending",
      attempts: 0,
      nextRetryAt: Date.now(),
    });
  },
});

export const retryWebhookEvent = mutation({
  args: { eventId: v.id("webhookEvents") },
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

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new ConvexError({
        message: "Event not found",
        code: "NOT_FOUND",
      });
    }

    // Use test mode client if active
    const effectiveClientId = user.testModeClientId || user.clientId;

    if (event.clientId !== effectiveClientId) {
      throw new ConvexError({
        message: "Access denied",
        code: "FORBIDDEN",
      });
    }

    await ctx.db.patch(args.eventId, {
      status: "pending",
      nextRetryAt: Date.now(),
    });

    return args.eventId;
  },
});

export const getEvent = query({
  args: { eventId: v.id("webhookEvents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.eventId);
  },
});

export const getClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.clientId);
  },
});

export const getPendingEvents = query({
  args: { currentTime: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("webhookEvents")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .filter((q) =>
        q.or(
          q.eq(q.field("nextRetryAt"), undefined),
          q.lte(q.field("nextRetryAt"), args.currentTime)
        )
      )
      .take(10);
  },
});

export const updateEventStatus = internalMutation({
  args: {
    eventId: v.id("webhookEvents"),
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed")
    ),
    responseCode: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    nextRetryAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      return;
    }

    await ctx.db.patch(args.eventId, {
      status: args.status,
      attempts: event.attempts + 1,
      lastAttemptAt: Date.now(),
      responseCode: args.responseCode,
      errorMessage: args.errorMessage,
      nextRetryAt: args.nextRetryAt,
    });
  },
});

export const getUserByToken = query({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .unique();
  },
});
