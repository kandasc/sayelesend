import { internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Internal query to get bulk message data for sending
export const getBulkMessageForSending = internalQuery({
  args: { bulkMessageId: v.id("bulkMessages") },
  handler: async (ctx, args) => {
    const bulk = await ctx.db.get(args.bulkMessageId);
    if (!bulk) return null;

    const client = await ctx.db.get(bulk.clientId);
    if (!client) return null;

    const provider = await ctx.db.get(client.smsProviderId);
    if (!provider) return null;

    const recipients = await ctx.db
      .query("bulkMessageRecipients")
      .withIndex("by_bulk_and_status", (q) =>
        q.eq("bulkMessageId", args.bulkMessageId).eq("status", "pending")
      )
      .collect();

    return { bulk, client, provider, recipients };
  },
});

// Internal mutation to mark recipients as sent
export const updateBulkMessageSent = internalMutation({
  args: {
    bulkMessageId: v.id("bulkMessages"),
    recipientIds: v.array(v.id("bulkMessageRecipients")),
  },
  handler: async (ctx, args) => {
    // Update all recipients to sent
    for (const recipientId of args.recipientIds) {
      await ctx.db.patch(recipientId, { status: "sent" });
    }

    // Update bulk message status
    await ctx.db.patch(args.bulkMessageId, {
      status: "completed",
      sentCount: args.recipientIds.length,
    });
  },
});

// Internal mutation to mark bulk message as failed
export const updateBulkMessageFailed = internalMutation({
  args: {
    bulkMessageId: v.id("bulkMessages"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.bulkMessageId, {
      status: "failed",
    });

    // Mark all pending recipients as failed
    const recipients = await ctx.db
      .query("bulkMessageRecipients")
      .withIndex("by_bulk_and_status", (q) =>
        q.eq("bulkMessageId", args.bulkMessageId).eq("status", "pending")
      )
      .collect();

    for (const recipient of recipients) {
      await ctx.db.patch(recipient._id, { status: "failed" });
    }
  },
});
