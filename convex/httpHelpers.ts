import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { checkRateLimit } from "./lib/rateLimiter";
import { logSecurityEvent } from "./lib/securityLogger";
import type { Id } from "./_generated/dataModel.d.ts";

export const checkAndIncrementRateLimit = internalMutation({
  args: { identifier: v.string() },
  handler: async (ctx, args) => {
    return await checkRateLimit(ctx, args.identifier, 100);
  },
});

export const logApiKeyUsage = internalMutation({
  args: {
    apiKeyId: v.id("apiKeys"),
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    await logSecurityEvent({
      ctx,
      eventType: "api_key_used",
      action: `API key used: ${args.apiKeyId}`,
      success: true,
      clientId: args.clientId,
    });
  },
});

export const logUnauthorizedAccess = internalMutation({
  args: { action: v.string() },
  handler: async (ctx, args) => {
    await logSecurityEvent({
      ctx,
      eventType: "unauthorized_access",
      action: args.action,
      success: false,
    });
  },
});

export const logRateLimitExceeded = internalMutation({
  args: {
    clientId: v.id("clients"),
    identifier: v.string(),
  },
  handler: async (ctx, args) => {
    await logSecurityEvent({
      ctx,
      eventType: "rate_limit_exceeded",
      action: `Rate limit exceeded for ${args.identifier}`,
      success: false,
      clientId: args.clientId,
    });
  },
});

export const logWebhookFailure = internalMutation({
  args: {
    action: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await logSecurityEvent({
      ctx,
      eventType: "webhook_failed",
      action: args.action,
      success: false,
      metadata: { error: args.error },
    });
  },
});
