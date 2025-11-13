import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

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
