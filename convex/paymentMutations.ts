import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

// Create a pending transaction record
export const createPendingTransaction = mutation({
  args: {
    transactionId: v.string(),
    packageId: v.string(),
    credits: v.number(),
    amount: v.number(),
    currency: v.string(),
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
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Get client ID
    let clientId: Id<"clients"> | undefined;
    if (user.role === "admin" && user.testModeClientId) {
      clientId = user.testModeClientId;
    } else if (user.clientId) {
      clientId = user.clientId;
    }

    if (!clientId) {
      throw new ConvexError({
        message: "No client associated with user",
        code: "FORBIDDEN",
      });
    }

    // Store the pending transaction
    await ctx.db.insert("paymentTransactions", {
      transactionId: args.transactionId,
      clientId,
      userId: user._id,
      packageId: args.packageId,
      credits: args.credits,
      amount: args.amount,
      currency: args.currency,
      status: "pending",
    });

    return { success: true };
  },
});

// Complete a pending transaction and add credits
export const completePendingTransaction = mutation({
  args: {
    transactionId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; credits?: number; message: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    // Find the pending transaction
    const transaction = await ctx.db
      .query("paymentTransactions")
      .withIndex("by_transaction_id", (q) => q.eq("transactionId", args.transactionId))
      .unique();

    if (!transaction) {
      return {
        success: false,
        message: "Transaction not found",
      };
    }

    if (transaction.status === "completed") {
      return {
        success: true,
        credits: transaction.credits,
        message: "Transaction already completed",
      };
    }

    // Get the client
    const client = await ctx.db.get(transaction.clientId);
    if (!client) {
      return {
        success: false,
        message: "Client not found",
      };
    }

    // Add credits to client
    await ctx.db.patch(transaction.clientId, {
      credits: client.credits + transaction.credits,
    });

    // Update transaction status
    await ctx.db.patch(transaction._id, {
      status: "completed",
      completedAt: Date.now(),
    });

    // Record in credit transactions
    await ctx.db.insert("creditTransactions", {
      clientId: transaction.clientId,
      type: "add",
      amount: transaction.credits,
      description: `Credit purchase - ${transaction.packageId} package`,
      performedBy: transaction.userId,
      balanceAfter: client.credits + transaction.credits,
    });

    return {
      success: true,
      credits: transaction.credits,
      message: `Successfully added ${transaction.credits} credits to your account`,
    };
  },
});

// Cancel a pending transaction
export const cancelPendingTransaction = mutation({
  args: {
    transactionId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const transaction = await ctx.db
      .query("paymentTransactions")
      .withIndex("by_transaction_id", (q) => q.eq("transactionId", args.transactionId))
      .unique();

    if (!transaction) {
      return { success: false, message: "Transaction not found" };
    }

    if (transaction.status !== "pending") {
      return { success: false, message: `Transaction is already ${transaction.status}` };
    }

    await ctx.db.patch(transaction._id, {
      status: "cancelled",
      failedAt: Date.now(),
      failureReason: "Cancelled by user",
    });

    return { success: true, message: "Transaction cancelled" };
  },
});

// Add credits to client (called by action after payment verification)
export const addCreditsToClient = mutation({
  args: {
    credits: v.number(),
    transactionId: v.string(),
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
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Get client ID
    let clientId: Id<"clients"> | undefined;
    if (user.role === "admin" && user.testModeClientId) {
      clientId = user.testModeClientId;
    } else if (user.clientId) {
      clientId = user.clientId;
    }

    if (!clientId) {
      throw new ConvexError({
        message: "No client associated with user",
        code: "FORBIDDEN",
      });
    }

    const client = await ctx.db.get(clientId);
    if (!client) {
      throw new ConvexError({
        message: "Client not found",
        code: "NOT_FOUND",
      });
    }

    // Check if this transaction was already processed
    const existingTransaction = await ctx.db
      .query("paymentTransactions")
      .withIndex("by_transaction_id", (q) => q.eq("transactionId", args.transactionId))
      .unique();

    if (existingTransaction?.status === "completed") {
      return { success: true, message: "Transaction already processed" };
    }

    // Add credits
    await ctx.db.patch(clientId, {
      credits: client.credits + args.credits,
    });

    // Update transaction status if exists
    if (existingTransaction) {
      await ctx.db.patch(existingTransaction._id, {
        status: "completed",
        completedAt: Date.now(),
      });
    }

    // Record in credit transactions
    await ctx.db.insert("creditTransactions", {
      clientId,
      type: "add",
      amount: args.credits,
      description: args.description,
      performedBy: user._id,
      balanceAfter: client.credits + args.credits,
    });

    return { success: true };
  },
});

// Get payment history for a client
export const getPaymentHistory = query({
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
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Get client ID
    let clientId: Id<"clients"> | undefined;
    if (user.role === "admin" && user.testModeClientId) {
      clientId = user.testModeClientId;
    } else if (user.clientId) {
      clientId = user.clientId;
    }

    if (!clientId) {
      return [];
    }

    return await ctx.db
      .query("paymentTransactions")
      .withIndex("by_client", (q) => q.eq("clientId", clientId!))
      .order("desc")
      .take(50);
  },
});

// Get available credit packages
export const getCreditPackages = query({
  args: {},
  handler: async () => {
    return [
      { id: "mini", name: "Mini", credits: 2000, amount: 20000, currency: "XOF" },
      { id: "starter", name: "Starter", credits: 5000, amount: 50000, currency: "XOF" },
      { id: "basic", name: "Basic", credits: 10000, amount: 100000, currency: "XOF" },
      { id: "standard", name: "Standard", credits: 25000, amount: 250000, currency: "XOF" },
      { id: "premium", name: "Premium", credits: 50000, amount: 500000, currency: "XOF" },
      { id: "business", name: "Business", credits: 100000, amount: 1000000, currency: "XOF" },
      { id: "enterprise", name: "Enterprise", credits: 250000, amount: 2500000, currency: "XOF" },
    ];
  },
});
