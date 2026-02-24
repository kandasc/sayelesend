import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import { logSecurityEvent } from "./lib/securityLogger";

// Add credits to a client
export const addCredits = mutation({
  args: {
    clientId: v.id("clients"),
    amount: v.number(),
    type: v.union(
      v.literal("purchase"),
      v.literal("bonus"),
      v.literal("adjustment"),
      v.literal("refund")
    ),
    description: v.string(),
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
        message: "Admin access required",
        code: "FORBIDDEN",
      });
    }

    if (args.amount <= 0) {
      throw new ConvexError({
        message: "Amount must be positive",
        code: "BAD_REQUEST",
      });
    }

    const client = await ctx.db.get(args.clientId);
    if (!client) {
      throw new ConvexError({
        message: "Client not found",
        code: "NOT_FOUND",
      });
    }

    const balanceBefore = client.credits;
    const balanceAfter = balanceBefore + args.amount;

    // Update client credits
    await ctx.db.patch(args.clientId, {
      credits: balanceAfter,
    });

    // Record transaction
    await ctx.db.insert("creditTransactions", {
      clientId: args.clientId,
      amount: args.amount,
      type: args.type,
      description: args.description,
      balanceBefore,
      balanceAfter,
      performedBy: user._id,
    });

    // Log credit modification
    await logSecurityEvent({
      ctx,
      eventType: "credit_modified",
      action: `Added ${args.amount} credits (${args.type})`,
      success: true,
      userId: user._id,
      clientId: args.clientId,
      metadata: { amount: args.amount, type: args.type, balanceAfter },
    });

    return { success: true, newBalance: balanceAfter };
  },
});

// Deduct credits from a client
export const deductCredits = mutation({
  args: {
    clientId: v.id("clients"),
    amount: v.number(),
    description: v.string(),
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
        message: "Admin access required",
        code: "FORBIDDEN",
      });
    }

    if (args.amount <= 0) {
      throw new ConvexError({
        message: "Amount must be positive",
        code: "BAD_REQUEST",
      });
    }

    const client = await ctx.db.get(args.clientId);
    if (!client) {
      throw new ConvexError({
        message: "Client not found",
        code: "NOT_FOUND",
      });
    }

    const balanceBefore = client.credits;
    const balanceAfter = balanceBefore - args.amount;

    if (balanceAfter < 0) {
      throw new ConvexError({
        message: "Insufficient credits",
        code: "BAD_REQUEST",
      });
    }

    // Update client credits
    await ctx.db.patch(args.clientId, {
      credits: balanceAfter,
    });

    // Record transaction
    await ctx.db.insert("creditTransactions", {
      clientId: args.clientId,
      amount: -args.amount,
      type: "deduction",
      description: args.description,
      balanceBefore,
      balanceAfter,
      performedBy: user._id,
    });

    // Log credit deduction
    await logSecurityEvent({
      ctx,
      eventType: "credit_modified",
      action: `Deducted ${args.amount} credits`,
      success: true,
      userId: user._id,
      clientId: args.clientId,
      metadata: { amount: -args.amount, balanceAfter },
    });

    return { success: true, newBalance: balanceAfter };
  },
});

// Get credit transaction history for a client
export const getClientTransactions = query({
  args: {
    clientId: v.id("clients"),
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

    // Allow admin or client user with matching clientId
    if (user.role !== "admin" && user.clientId !== args.clientId) {
      throw new ConvexError({
        message: "Access denied",
        code: "FORBIDDEN",
      });
    }

    const limit = args.limit || 50;
    const transactions = await ctx.db
      .query("creditTransactions")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .take(limit);

    // Get performer info for each transaction
    const transactionsWithPerformers = await Promise.all(
      transactions.map(async (transaction) => {
        let performerName = "System";
        if (transaction.performedBy) {
          const performer = await ctx.db.get(transaction.performedBy);
          performerName = performer?.name || "Unknown";
        }
        return {
          ...transaction,
          performerName,
        };
      })
    );

    return transactionsWithPerformers;
  },
});

// Get all credit transactions (admin only)
export const getAllTransactions = query({
  args: {
    limit: v.optional(v.number()),
    type: v.optional(
      v.union(
        v.literal("purchase"),
        v.literal("deduction"),
        v.literal("refund"),
        v.literal("bonus"),
        v.literal("adjustment")
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

    if (!user || user.role !== "admin") {
      throw new ConvexError({
        message: "Admin access required",
        code: "FORBIDDEN",
      });
    }

    const limit = args.limit || 100;

    let transactions;
    if (args.type !== undefined) {
      transactions = await ctx.db
        .query("creditTransactions")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .order("desc")
        .take(limit);
    } else {
      transactions = await ctx.db
        .query("creditTransactions")
        .order("desc")
        .take(limit);
    }

    // Get client and performer info for each transaction
    const transactionsWithDetails = await Promise.all(
      transactions.map(async (transaction) => {
        const client = await ctx.db.get(transaction.clientId);
        let performerName = "System";
        if (transaction.performedBy) {
          const performer = await ctx.db.get(transaction.performedBy);
          performerName = performer?.name || "Unknown";
        }
        return {
          ...transaction,
          clientName: client?.companyName || "Unknown",
          performerName,
        };
      })
    );

    return transactionsWithDetails;
  },
});

// Get credit statistics
export const getCreditStats = query({
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

    if (!user || user.role !== "admin") {
      throw new ConvexError({
        message: "Admin access required",
        code: "FORBIDDEN",
      });
    }

    const clients = await ctx.db.query("clients").collect();
    const transactions = await ctx.db.query("creditTransactions").collect();

    const totalCredits = clients.reduce((sum, c) => sum + c.credits, 0);
    
    const purchasedCredits = transactions
      .filter((t) => t.type === "purchase")
      .reduce((sum, t) => sum + t.amount, 0);
    
    const usedCredits = transactions
      .filter((t) => t.type === "deduction")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const bonusCredits = transactions
      .filter((t) => t.type === "bonus")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalCredits,
      purchasedCredits,
      usedCredits,
      bonusCredits,
      transactionCount: transactions.length,
    };
  },
});

// Get credit usage stats for the current client (client-facing)
export const getMyUsageStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) return null;

    const effectiveClientId = user.testModeClientId || user.clientId;
    if (!effectiveClientId) return null;

    const client = await ctx.db.get(effectiveClientId);
    if (!client) return null;

    // Get transactions for this client
    const transactions = await ctx.db
      .query("creditTransactions")
      .withIndex("by_client", (q) => q.eq("clientId", effectiveClientId))
      .order("desc")
      .take(200);

    // Get messages for channel breakdown
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_client", (q) => q.eq("clientId", effectiveClientId))
      .collect();

    // Channel usage breakdown
    const channelUsage: Record<string, { sent: number; credits: number }> = {};
    for (const msg of messages) {
      const ch = msg.channel || "sms";
      if (!channelUsage[ch]) {
        channelUsage[ch] = { sent: 0, credits: 0 };
      }
      channelUsage[ch].sent++;
      channelUsage[ch].credits += msg.creditsUsed;
    }

    // Calculate monthly usage (last 6 months)
    const monthlyUsage: { month: string; credits: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = d.getTime();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      const monthCredits = messages
        .filter((m) => m._creationTime >= monthStart && m._creationTime < monthEnd)
        .reduce((sum, m) => sum + m.creditsUsed, 0);
      monthlyUsage.push({
        month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        credits: monthCredits,
      });
    }

    // Total purchased vs used
    const totalPurchased = transactions
      .filter((t) => t.type === "purchase" || t.type === "add" || t.type === "bonus")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalUsed = transactions
      .filter((t) => t.type === "deduction")
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Low balance threshold: less than 500 credits
    const isLowBalance = client.credits < 500;
    const isCriticalBalance = client.credits < 100;

    return {
      currentBalance: client.credits,
      totalPurchased,
      totalUsed,
      isLowBalance,
      isCriticalBalance,
      channelUsage,
      monthlyUsage,
      recentTransactions: transactions.slice(0, 20),
    };
  },
});
