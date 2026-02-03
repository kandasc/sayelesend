"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { hash } from "./lib/encryption";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";

export const hashApiKey = internalAction({
  args: { key: v.string() },
  handler: async (_ctx, args): Promise<string> => {
    return hash(args.key);
  },
});

type VerifyResult = {
  apiKeyId: Id<"apiKeys">;
  keyHash: string;
  clientId: Id<"clients">;
  client: unknown;
} | null;

export const verifyApiKeyAction = internalAction({
  args: { key: v.string() },
  handler: async (ctx, args): Promise<VerifyResult> => {
    // First, try to verify using the new hashed key format
    const keyHash = hash(args.key);
    const hashedResult = await ctx.runQuery(api.apiKeys.verifyApiKeyHash, { keyHash });
    
    if (hashedResult) {
      return hashedResult;
    }
    
    // Fall back to legacy key verification (direct key match)
    const legacyResult = await ctx.runQuery(api.apiKeys.verifyLegacyApiKeyQuery, { key: args.key });
    
    return legacyResult;
  },
});
