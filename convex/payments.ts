"use node";

import { Buffer } from "node:buffer";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api.js";
import { ConvexError } from "convex/values";

// SayelePay API — payment intents (override with SAYELE_PAY_INTENTS_URL in Convex env)
const DEFAULT_PAYMENT_INTENTS_URL = "https://api.sayelepay.com/api/v1/payment-intents";
const SAYELE_PAY_INTENTS_URL =
  process.env.SAYELE_PAY_INTENTS_URL?.trim() || DEFAULT_PAYMENT_INTENTS_URL;

function normalizeEnvSecret(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let t = value.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t || undefined;
}

/** First non-empty of common Convex env names (dashboard copy/paste sometimes uses different labels). */
function resolvePaymentApiKey(): string | undefined {
  const candidates = [
    process.env.SAYELE_PAY_API_KEY,
    process.env.SAYELE_PAY_SECRET_KEY,
    process.env.SAYELE_GATE_SECRET_KEY,
    process.env.SAYELE_PAY_PRIVATE_KEY,
  ];
  for (const raw of candidates) {
    const n = normalizeEnvSecret(raw);
    if (n) return n;
  }
  return undefined;
}

/**
 * SAYELE_PAY_AUTH_MODE in Convex (optional):
 * - bearer (default): Authorization: Bearer <key>
 * - raw: Authorization: <exact value> (paste full header value)
 * - x-api-key: X-API-Key: <key>
 * - basic: Authorization: Basic base64("<key>:")
 */
function buildPaymentGatewayAuthHeaders(apiKey: string): Record<string, string> {
  const mode = (process.env.SAYELE_PAY_AUTH_MODE || "bearer").toLowerCase().trim();
  const key = apiKey.trim();

  if (mode === "x-api-key" || mode === "api_key" || mode === "apikey") {
    return { "X-API-Key": key };
  }
  if (mode === "basic") {
    const token = Buffer.from(`${key}:`).toString("base64");
    return { Authorization: `Basic ${token}` };
  }
  if (mode === "raw") {
    return { Authorization: key };
  }
  if (/^(bearer|token)\s+/i.test(key)) {
    return { Authorization: key };
  }
  return { Authorization: `Bearer ${key}` };
}

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
  clientSecret?: string;
  id?: string;
  transaction_id?: string;
  error?: string;
  message?: string;
  data?: {
    client_secret?: string;
    clientSecret?: string;
    id?: string;
  };
};

function extractPaymentIntentSecretAndId(raw: PaymentIntentResponse): {
  clientSecret: string | null;
  id: string | null;
} {
  let clientSecret =
    raw.client_secret ??
    raw.clientSecret ??
    raw.data?.client_secret ??
    raw.data?.clientSecret ??
    null;
  let id = raw.id ?? raw.transaction_id ?? raw.data?.id ?? null;
  if (typeof clientSecret !== "string") clientSecret = null;
  if (typeof id !== "string") id = null;
  return { clientSecret, id };
}

// Create a payment intent via SayelePay API
export const createPaymentIntent = action({
  args: {
    packageId: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ clientSecret: string; transactionId: string; customerName: string; customerEmail: string }> => {
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

    const secretKey = resolvePaymentApiKey();
    if (!secretKey) {
      console.error("[Payment] No payment API key in Convex");
      throw new ConvexError({
        message:
          "Payment gateway not configured. Set SAYELE_PAY_API_KEY or SAYELE_PAY_SECRET_KEY (or legacy SAYELE_GATE_SECRET_KEY) in Convex environment variables.",
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }

    if (secretKey.startsWith("pk_")) {
      throw new ConvexError({
        message:
          "Payment key looks like a publishable key (pk_). Use the secret/server key from SayelePay in Convex (SAYELE_PAY_API_KEY or SAYELE_PAY_SECRET_KEY).",
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }

    const authHeaders = buildPaymentGatewayAuthHeaders(secretKey);

    const user = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!user) {
      throw new ConvexError({
        message: "User not found — try signing out and back in so your account syncs.",
        code: "NOT_FOUND",
      });
    }

    const client = await ctx.runQuery(api.clients.getCurrentClient, {});
    if (!client) {
      throw new ConvexError({
        message:
          "No billing client is loaded. If you are an admin, enable Test Mode and select a client. Client accounts must be assigned to an organization.",
        code: "FORBIDDEN",
      });
    }

    // Resolve customer name & email from client or user record
    const customerName = client?.contactName || user.name || "";
    const customerEmail = client?.email || user.email || "";

    // Build payment intent request per SayelePay API docs
    const paymentIntentBody = {
      amount: selectedPackage.amount,
      currency: selectedPackage.currency,
      payment_method_types: ["card", "mobile_money"],
      description: `Sayelesend Credits - ${selectedPackage.name} Package (${selectedPackage.credits.toLocaleString()} credits)`,
      return_url: args.successUrl,
      ...(customerName ? { customer_name: customerName } : {}),
      ...(customerEmail ? { customer_email: customerEmail } : {}),
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
      response = await fetch(SAYELE_PAY_INTENTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
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
      let extra = "";
      if (response.status === 401) {
        const mode = process.env.SAYELE_PAY_AUTH_MODE || "bearer";
        const keyHint = secretKey.startsWith("sk_test")
          ? "sk_test…"
          : secretKey.startsWith("sk_live")
            ? "sk_live…"
            : secretKey.startsWith("sk_")
              ? "sk_…"
              : "non-sk_ key";
        console.error(
          `[Payment] SayelePay 401: auth mode=${mode}, key shape=${keyHint}, length=${secretKey.length}. Convex vars checked: SAYELE_PAY_API_KEY, SAYELE_PAY_SECRET_KEY, SAYELE_GATE_SECRET_KEY.`,
        );
        extra =
          " SayelePay returned “Invalid API key”: the server expects Authorization: Bearer &lt;secret&gt; (default). Set SAYELE_PAY_SECRET_KEY or SAYELE_PAY_API_KEY in **this** Convex deployment (same project as production) to the **secret** key from the SayelePay dashboard — not a publishable key, no wrapping quotes. Using SAYELE_PAY_AUTH_MODE=x-api-key causes a different error on this API; keep Bearer unless SayelePay docs say otherwise. Match **test vs live** key to your merchant environment.";
      }
      throw new ConvexError({
        message: `Payment gateway error (${response.status}): ${responseText || "No details returned"}${extra}`,
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }

    let result: PaymentIntentResponse;
    try {
      result = JSON.parse(responseText) as PaymentIntentResponse;
    } catch {
      throw new ConvexError({
        message: `Invalid JSON from payment gateway (HTTP ${response.status})`,
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }

    const { clientSecret, id: gatewayId } = extractPaymentIntentSecretAndId(result);
    if (!clientSecret) {
      throw new ConvexError({
        message:
          result.error ||
          result.message ||
          "Payment gateway did not return a client secret. Check SAYELE_PAY_INTENTS_URL and API credentials.",
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }

    const transactionId = gatewayId || `txn_${Date.now()}`;

    // Store pending transaction
    await ctx.runMutation(api.paymentMutations.createPendingTransaction, {
      transactionId,
      packageId: selectedPackage.id,
      credits: selectedPackage.credits,
      amount: selectedPackage.amount,
      currency: selectedPackage.currency,
      clientId: client._id,
    });

    return {
      clientSecret,
      transactionId,
      customerName,
      customerEmail,
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
