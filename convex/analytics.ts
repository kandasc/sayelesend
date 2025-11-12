import { v } from "convex/values";
import { query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Get message statistics for a date range
export const getMessageStats = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
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

    // Build query based on user role
    let messages;
    
    if (user.role === "client" && user.clientId) {
      const clientId = user.clientId;
      messages = await ctx.db
        .query("messages")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .collect();
    } else if (user.role === "admin" && args.clientId) {
      const clientId = args.clientId;
      messages = await ctx.db
        .query("messages")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .collect();
    } else {
      messages = await ctx.db.query("messages").collect();
    }

    // Filter by date range if provided
    const filteredMessages = messages.filter((msg) => {
      if (args.startDate && msg._creationTime < args.startDate) return false;
      if (args.endDate && msg._creationTime > args.endDate) return false;
      return true;
    });

    const totalMessages = filteredMessages.length;
    const sentMessages = filteredMessages.filter((m) => m.status === "sent").length;
    const deliveredMessages = filteredMessages.filter((m) => m.status === "delivered").length;
    const failedMessages = filteredMessages.filter((m) => m.status === "failed").length;
    const pendingMessages = filteredMessages.filter((m) => m.status === "pending").length;

    const deliveryRate = totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 0;
    const failureRate = totalMessages > 0 ? (failedMessages / totalMessages) * 100 : 0;

    return {
      totalMessages,
      sentMessages,
      deliveredMessages,
      failedMessages,
      pendingMessages,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
    };
  },
});

// Get daily message volume for charts
export const getDailyMessageVolume = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
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

    // Build query based on user role
    let messages;
    
    if (user.role === "client" && user.clientId) {
      const clientId = user.clientId;
      messages = await ctx.db
        .query("messages")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .collect();
    } else if (user.role === "admin" && args.clientId) {
      const clientId = args.clientId;
      messages = await ctx.db
        .query("messages")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .collect();
    } else {
      messages = await ctx.db.query("messages").collect();
    }

    // Filter by date range
    const filteredMessages = messages.filter((msg) => {
      return msg._creationTime >= args.startDate && msg._creationTime <= args.endDate;
    });

    // Group by day
    const dailyData: Record<string, { sent: number; delivered: number; failed: number }> = {};

    filteredMessages.forEach((msg) => {
      const date = new Date(msg._creationTime);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { sent: 0, delivered: 0, failed: 0 };
      }

      if (msg.status === "sent" || msg.status === "delivered") {
        dailyData[dateKey].sent++;
      }
      if (msg.status === "delivered") {
        dailyData[dateKey].delivered++;
      }
      if (msg.status === "failed") {
        dailyData[dateKey].failed++;
      }
    });

    // Convert to array and sort by date
    return Object.entries(dailyData)
      .map(([date, stats]) => ({
        date,
        ...stats,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

// Get provider performance statistics
export const getProviderStats = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
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

    // Build query based on user role
    let messages;
    
    if (user.role === "client" && user.clientId) {
      const clientId = user.clientId;
      messages = await ctx.db
        .query("messages")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .collect();
    } else if (user.role === "admin" && args.clientId) {
      const clientId = args.clientId;
      messages = await ctx.db
        .query("messages")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .collect();
    } else {
      messages = await ctx.db.query("messages").collect();
    }

    // Filter by date range if provided
    const filteredMessages = messages.filter((msg) => {
      if (args.startDate && msg._creationTime < args.startDate) return false;
      if (args.endDate && msg._creationTime > args.endDate) return false;
      return true;
    });

    // Group by provider
    const providerStats: Record<string, {
      name: string;
      total: number;
      delivered: number;
      failed: number;
      deliveryRate: number;
    }> = {};

    for (const msg of filteredMessages) {
      const provider = await ctx.db.get(msg.providerId);
      if (!provider) continue;

      const providerId = msg.providerId;
      if (!providerStats[providerId]) {
        providerStats[providerId] = {
          name: provider.name,
          total: 0,
          delivered: 0,
          failed: 0,
          deliveryRate: 0,
        };
      }

      providerStats[providerId].total++;
      if (msg.status === "delivered") {
        providerStats[providerId].delivered++;
      }
      if (msg.status === "failed") {
        providerStats[providerId].failed++;
      }
    }

    // Calculate delivery rates
    return Object.values(providerStats).map((stats) => ({
      ...stats,
      deliveryRate: stats.total > 0 
        ? Math.round((stats.delivered / stats.total) * 100 * 100) / 100
        : 0,
    }));
  },
});

// Get top recipients
export const getTopRecipients = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
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

    // Build query based on user role
    let messages;
    
    if (user.role === "client" && user.clientId) {
      const clientId = user.clientId;
      messages = await ctx.db
        .query("messages")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .collect();
    } else if (user.role === "admin" && args.clientId) {
      const clientId = args.clientId;
      messages = await ctx.db
        .query("messages")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .collect();
    } else {
      messages = await ctx.db.query("messages").collect();
    }

    // Filter by date range if provided
    const filteredMessages = messages.filter((msg) => {
      if (args.startDate && msg._creationTime < args.startDate) return false;
      if (args.endDate && msg._creationTime > args.endDate) return false;
      return true;
    });

    // Count messages per recipient
    const recipientCounts: Record<string, number> = {};
    filteredMessages.forEach((msg) => {
      recipientCounts[msg.to] = (recipientCounts[msg.to] || 0) + 1;
    });

    // Convert to array and sort
    const sortedRecipients = Object.entries(recipientCounts)
      .map(([phone, count]) => ({ phone, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, args.limit || 10);

    return sortedRecipients;
  },
});

// Get client usage stats (admin only)
export const getClientUsageStats = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
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

    if (!user || user.role !== "admin") {
      throw new ConvexError({
        message: "Unauthorized - Admin access required",
        code: "FORBIDDEN",
      });
    }

    const clients = await ctx.db.query("clients").collect();
    const messages = await ctx.db.query("messages").collect();

    // Filter by date range if provided
    const filteredMessages = messages.filter((msg) => {
      if (args.startDate && msg._creationTime < args.startDate) return false;
      if (args.endDate && msg._creationTime > args.endDate) return false;
      return true;
    });

    // Calculate stats per client
    const clientStats = await Promise.all(
      clients.map(async (client) => {
        const clientMessages = filteredMessages.filter((m) => m.clientId === client._id);
        const totalMessages = clientMessages.length;
        const deliveredMessages = clientMessages.filter((m) => m.status === "delivered").length;
        const failedMessages = clientMessages.filter((m) => m.status === "failed").length;

        return {
          clientId: client._id,
          clientName: client.companyName,
          totalMessages,
          deliveredMessages,
          failedMessages,
          credits: client.credits,
          deliveryRate: totalMessages > 0 
            ? Math.round((deliveredMessages / totalMessages) * 100 * 100) / 100
            : 0,
        };
      })
    );

    return clientStats.sort((a, b) => b.totalMessages - a.totalMessages);
  },
});

// Get messages for export (with provider names)
export const getMessagesForExport = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
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

    // Build query based on user role
    let messages;
    
    if (user.role === "client" && user.clientId) {
      const clientId = user.clientId;
      messages = await ctx.db
        .query("messages")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .collect();
    } else if (user.role === "admin" && args.clientId) {
      const clientId = args.clientId;
      messages = await ctx.db
        .query("messages")
        .withIndex("by_client", (q) => q.eq("clientId", clientId))
        .collect();
    } else if (user.role === "admin") {
      messages = await ctx.db.query("messages").collect();
    } else {
      return [];
    }

    // Filter by date range
    const filteredMessages = messages.filter((msg) => {
      return msg._creationTime >= args.startDate && msg._creationTime <= args.endDate;
    });

    // Enrich with provider names
    const enrichedMessages = await Promise.all(
      filteredMessages.map(async (msg) => {
        const provider = await ctx.db.get(msg.providerId);
        return {
          ...msg,
          providerName: provider?.name || "Unknown",
        };
      })
    );

    return enrichedMessages;
  },
});
