import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

export const getPendingMessages = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(10);
  },
});

export const getScheduledMessages = internalQuery({
  args: { currentTime: v.number() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .collect();

    return messages.filter(
      (m) => m.scheduledAt && m.scheduledAt <= args.currentTime
    );
  },
});

export const getMessageById = internalQuery({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.messageId);
  },
});

export const getProviderById = internalQuery({
  args: { providerId: v.id("smsProviders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.providerId);
  },
});
