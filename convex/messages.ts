import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";

// Send a single SMS
export const sendSms = mutation({
  args: {
    to: v.string(),
    message: v.string(),
    from: v.optional(v.string()),
    scheduledAt: v.optional(v.number()),
    clientId: v.optional(v.id("clients")),
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

    if (client.credits < provider.costPerSms) {
      throw new ConvexError({
        message: "Insufficient credits",
        code: "BAD_REQUEST",
      });
    }

    await ctx.db.patch(clientId, {
      credits: client.credits - provider.costPerSms,
    });

    const messageId = await ctx.db.insert("messages", {
      clientId: clientId,
      to: args.to,
      from: client.senderId || args.from || provider.config.senderId || "SAYELE",
      message: args.message,
      status: args.scheduledAt ? "scheduled" : "pending",
      providerId: client.smsProviderId,
      scheduledAt: args.scheduledAt,
      creditsUsed: provider.costPerSms,
      type: args.scheduledAt ? "scheduled" : "single",
    });

    if (args.scheduledAt) {
      await ctx.scheduler.runAt(args.scheduledAt, internal.sms.send.sendScheduledMessage, {
        messageId,
      });
    } else {
      await ctx.scheduler.runAfter(0, internal.sms.send.processPendingMessages, {});
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
  },
  handler: async (ctx, args) => {
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
      from: args.from || provider.config.senderId || "SAYELE",
      message: args.message,
      status: args.scheduledAt ? "scheduled" : "pending",
      providerId: client.smsProviderId,
      scheduledAt: args.scheduledAt,
      creditsUsed: provider.costPerSms,
      type: args.scheduledAt ? "scheduled" : "single",
    });

    if (args.scheduledAt) {
      await ctx.scheduler.runAt(args.scheduledAt, internal.sms.send.sendScheduledMessage, {
        messageId,
      });
    } else {
      await ctx.scheduler.runAfter(0, internal.sms.send.processPendingMessages, {});
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
