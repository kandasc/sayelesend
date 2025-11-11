import { v } from "convex/values";
import { mutation, query, internalMutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

// Create a bulk SMS campaign
export const createBulkMessage = mutation({
  args: {
    name: v.string(),
    message: v.string(),
    recipients: v.array(v.string()), // Array of phone numbers
    from: v.optional(v.string()),
    scheduledAt: v.optional(v.number()),
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

    if (user.role !== "client" || !user.clientId) {
      throw new ConvexError({
        message: "User not associated with a client",
        code: "FORBIDDEN",
      });
    }

    const client = await ctx.db.get(user.clientId);
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

    const provider = await ctx.db.get(client.smsProviderId);
    if (!provider) {
      throw new ConvexError({
        message: "SMS provider not found",
        code: "NOT_FOUND",
      });
    }

    if (!provider.isActive) {
      throw new ConvexError({
        message: "SMS provider is not active",
        code: "BAD_REQUEST",
      });
    }

    const totalRecipients = args.recipients.length;
    const totalCost = totalRecipients * provider.costPerSms;

    if (client.credits < totalCost) {
      throw new ConvexError({
        message: `Insufficient credits. Need ${totalCost} credits for ${totalRecipients} recipients`,
        code: "BAD_REQUEST",
      });
    }

    // Deduct credits upfront
    await ctx.db.patch(user.clientId, {
      credits: client.credits - totalCost,
    });

    // Create bulk message record
    const bulkMessageId = await ctx.db.insert("bulkMessages", {
      clientId: user.clientId,
      name: args.name,
      message: args.message,
      from: args.from,
      totalRecipients,
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      status: args.scheduledAt ? "pending" : "pending",
      scheduledAt: args.scheduledAt,
      creditsUsed: totalCost,
    });

    // Create recipient records
    for (const phoneNumber of args.recipients) {
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

    // Get all pending recipients
    const recipients = await ctx.db
      .query("bulkMessageRecipients")
      .withIndex("by_bulk_and_status", (q) =>
        q.eq("bulkMessageId", args.bulkMessageId).eq("status", "pending")
      )
      .collect();

    const client = await ctx.db.get(bulkMessage.clientId);
    if (!client) {
      await ctx.db.patch(args.bulkMessageId, { status: "failed" });
      return;
    }

    const provider = await ctx.db.get(client.smsProviderId);
    if (!provider) {
      await ctx.db.patch(args.bulkMessageId, { status: "failed" });
      return;
    }

    // Process each recipient
    for (const recipient of recipients) {
      try {
        // Create individual message
        const messageId = await ctx.db.insert("messages", {
          clientId: bulkMessage.clientId,
          to: recipient.phoneNumber,
          from: bulkMessage.from || provider.config.senderId || "SAYELE",
          message: bulkMessage.message,
          status: "pending",
          providerId: client.smsProviderId,
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

    if (user.role !== "client" || !user.clientId) {
      throw new ConvexError({
        message: "User not associated with a client",
        code: "FORBIDDEN",
      });
    }

    return await ctx.db
      .query("bulkMessages")
      .withIndex("by_client", (q) => q.eq("clientId", user.clientId!))
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

    if (user.role === "client" && user.clientId !== bulkMessage.clientId) {
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
