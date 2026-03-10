"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api.js";
import { ConvexError } from "convex/values";

const SAYELE_GATEWAY_URL = process.env.SAYELE_GATEWAY_URL || "https://gate.sayele.co/sdk";

// Credit packages available for purchase (10 XOF per SMS, min 5,000 SMS)
export const CREDIT_PACKAGES = [
  { id: "starter", name: "Starter", credits: 5000, amount: 50000, currency: "XOF" },
  { id: "basic", name: "Basic", credits: 10000, amount: 100000, currency: "XOF" },
  { id: "standard", name: "Standard", credits: 25000, amount: 250000, currency: "XOF" },
  { id: "premium", name: "Premium", credits: 50000, amount: 500000, currency: "XOF" },
  { id: "business", name: "Business", credits: 100000, amount: 1000000, currency: "XOF" },
  { id: "enterprise", name: "Enterprise", credits: 250000, amount: 2500000, currency: "XOF" },
] as const;

type PaymentResponse = {
  success: boolean;
  payment_url?: string;
  transaction_id?: string;
  error?: string;
};

// Create a payment session for credit purchase
export const createPaymentSession = action({
  args: {
    packageId: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ paymentUrl: string; transactionId: string }> => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    // Find the selected package
    const selectedPackage = CREDIT_PACKAGES.find((p) => p.id === args.packageId);
    if (!selectedPackage) {
      throw new ConvexError({
        message: "Invalid package selected",
        code: "BAD_REQUEST",
      });
    }

    // Get user details
    const user = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Get client details
    const client = await ctx.runQuery(api.clients.getCurrentClient, {});

    // Create payment request
    const paymentRequest = {
      amount: selectedPackage.amount,
      currency: selectedPackage.currency,
      payment_method_types: ["card", "mobile_money"],
      description: `SAYELE Credits - ${selectedPackage.name} Package (${selectedPackage.credits} credits)`,
      customer_email: user.email || identity.email || "customer@sayele.co",
      customer_name: user.name || identity.name || "SAYELE Customer",
      return_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: {
        package_id: selectedPackage.id,
        credits: selectedPackage.credits.toString(),
        user_id: user._id,
        client_id: client?._id || "",
      },
    };

    // Call SAYELE payment gateway
    console.log(`[Payment] Calling gateway: ${SAYELE_GATEWAY_URL}`);
    console.log(`[Payment] Package: ${selectedPackage.id}, Amount: ${selectedPackage.amount} ${selectedPackage.currency}`);

    let response: Response;
    try {
      response = await fetch(SAYELE_GATEWAY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentRequest),
      });
    } catch (fetchError) {
      console.error(`[Payment] Gateway connection failed:`, fetchError);
      throw new ConvexError({
        message: "Unable to reach payment gateway. Please check SAYELE_GATEWAY_URL or try again later.",
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Payment] Gateway error ${response.status}: ${errorText}`);
      throw new ConvexError({
        message: `Payment gateway error (${response.status}): ${errorText || "No details returned"}`,
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }

    const result = (await response.json()) as PaymentResponse;

    if (!result.success || !result.payment_url) {
      throw new ConvexError({
        message: result.error || "Failed to create payment session",
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }

    // Store pending transaction
    await ctx.runMutation(api.paymentMutations.createPendingTransaction, {
      transactionId: result.transaction_id || `txn_${Date.now()}`,
      packageId: selectedPackage.id,
      credits: selectedPackage.credits,
      amount: selectedPackage.amount,
      currency: selectedPackage.currency,
    });

    return {
      paymentUrl: result.payment_url,
      transactionId: result.transaction_id || "",
    };
  },
});

// Verify payment and add credits
export const verifyPayment = action({
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

    // Verify with SAYELE gateway
    const response = await fetch(`${SAYELE_GATEWAY_URL}/verify/${args.transactionId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // If verification endpoint doesn't exist, check pending transaction
      const result = await ctx.runMutation(api.paymentMutations.completePendingTransaction, {
        transactionId: args.transactionId,
      });
      return result;
    }

    const result = (await response.json()) as {
      success: boolean;
      status: string;
      metadata?: {
        credits?: string;
        package_id?: string;
      };
    };

    if (result.success && result.status === "completed") {
      const credits = parseInt(result.metadata?.credits || "0", 10);
      await ctx.runMutation(api.paymentMutations.addCreditsToClient, {
        credits,
        transactionId: args.transactionId,
        description: `Credit purchase - ${result.metadata?.package_id || "unknown"} package`,
      });

      return {
        success: true,
        credits,
        message: `Successfully added ${credits} credits to your account`,
      };
    }

    return {
      success: false,
      message: "Payment not completed or verification failed",
    };
  },
});
