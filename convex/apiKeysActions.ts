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
    // Hash the provided key
    const keyHash = hash(args.key);

    // Call query to check the hash
    return await ctx.runQuery(api.apiKeys.verifyApiKeyHash, { keyHash });
  },
});
