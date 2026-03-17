"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api.js";
import { ConvexError } from "convex/values";

// SayeleGate API endpoint for creating payment intents
const SAYELE_API_URL = "https://gate-api.sayele.co/api/v1/payment-intents";

// Credit packages available for purchase (10 XOF per SMS, min 5,000 SMS)
export const CREDIT_PACKAGES = [
  { id: "mini", name: "Mini", credits: 2000, amount: 20000, currency: "XOF" },
  { id: "starter", name: "Starter", credits: 5000, amount: 50000, currency: "XOF" },
  { id: "basic", name: "Basic", credits: 10000, amount: 100000, currency: "XOF" },
  { id: "standard", name: "Standard", credits: 25000, amount: 250000, currency: "XOF" },
  { id: "premium", name: "Premium", credits: 50000, amount: 500000, currency: "XOF" },
  { id: "business", name: "Business", credits: 100000, amount: 1000000, currency: "XOF" },
  { id: "enterprise", name: "Enterprise", credits: 250000, amount: 2500000, currency: "XOF" },
] as const;

type PaymentIntentResponse = {
  client_secret?: string;
  id?: string;
  error?: string;
  message?: string;
};

// Create a payment intent via SayeleGate API
export const createPaymentIntent = action({
  args: {
    packageId: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ clientSecret: string; transactionId: string }> => {
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

    // Get the secret key from environment
    const secretKey = process.env.SAYELE_GATE_SECRET_KEY;
    if (!secretKey) {
      console.error("[Payment] SAYELE_GATE_SECRET_KEY not configured");
      throw new ConvexError({
        message: "Payment gateway not configured. Please add SAYELE_GATE_SECRET_KEY in Secrets.",
        code: "EXTERNAL_SERVICE_ERROR",
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

    const client = await ctx.runQuery(api.clients.getCurrentClient, {});

    // Build payment intent request per SayeleGate API docs
    const paymentIntentBody = {
      amount: selectedPackage.amount,
      currency: selectedPackage.currency,
      payment_method_types: ["card", "mobile_money"],
      description: `SAYELE Credits - ${selectedPackage.name} Package (${selectedPackage.credits.toLocaleString()} credits)`,
      return_url: args.successUrl,
      metadata: {
        package_id: selectedPackage.id,
        credits: selectedPackage.credits.toString(),
        user_id: user._id,
        client_id: client?._id || "",
        cancel_url: args.cancelUrl,
      },
    };

    console.log(`[Payment] Creating payment intent: ${selectedPackage.id}, ${selectedPackage.amount} ${selectedPackage.currency}`);

    let response: Response;
    try {
      response = await fetch(SAYELE_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentIntentBody),
      });
    } catch (fetchError) {
      console.error("[Payment] Gateway connection failed:", fetchError);
      throw new ConvexError({
        message: "Unable to reach payment gateway. Please try again later.",
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }

    const responseText = await response.text();
    console.log(`[Payment] Gateway response ${response.status}: ${responseText}`);

    if (!response.ok) {
      throw new ConvexError({
        message: `Payment gateway error (${response.status}): ${responseText || "No details returned"}`,
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }

    let result: PaymentIntentResponse;
    try {
      result = JSON.parse(responseText) as PaymentIntentResponse;
    } catch {
      throw new ConvexError({
        message: "Invalid response from payment gateway",
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }

    if (!result.client_secret) {
      throw new ConvexError({
        message: result.error || result.message || "Failed to create payment intent",
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }

    const transactionId = result.id || `txn_${Date.now()}`;

    // Store pending transaction
    await ctx.runMutation(api.paymentMutations.createPendingTransaction, {
      transactionId,
      packageId: selectedPackage.id,
      credits: selectedPackage.credits,
      amount: selectedPackage.amount,
      currency: selectedPackage.currency,
    });

    return {
      clientSecret: result.client_secret,
      transactionId,
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

    // Try to complete the pending transaction directly
    const result = await ctx.runMutation(api.paymentMutations.completePendingTransaction, {
      transactionId: args.transactionId,
    });
    return result;
  },
});
