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

export const getBulkCampaignForDlr = internalQuery({
  args: { bulkMessageId: v.id("bulkMessages") },
  handler: async (ctx, args) => {
    const bulkMessage = await ctx.db.get(args.bulkMessageId);
    if (!bulkMessage) return null;

    const client = await ctx.db.get(bulkMessage.clientId);
    if (!client) return null;

    // Get the bulk provider
    const providerId = client.bulkSmsProviderId || client.smsProviderId;
    const provider = await ctx.db.get(providerId);

    // Get recipients that are still in "sending" or "sent" status (not yet delivered/failed)
    const recipients = await ctx.db
      .query("bulkMessageRecipients")
      .withIndex("by_bulk", (q) => q.eq("bulkMessageId", args.bulkMessageId))
      .collect();

    const pendingRecipients = recipients.filter(
      (r) => r.status === "sending" || r.status === "sent"
    );

    return {
      bulkMessage,
      client,
      provider,
      pendingRecipients,
      allRecipients: recipients,
    };
  },
});
