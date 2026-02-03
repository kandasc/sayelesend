import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import { internal, api } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";
import { logSecurityEvent } from "./lib/securityLogger";

export const listApiKeys = query({
  args: { clientId: v.optional(v.id("clients")) },
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

    let clientId = args.clientId;

    if (user.role === "client" || user.role === "viewer") {
      if (!user.clientId) {
        throw new ConvexError({
          message: "User not associated with a client",
          code: "FORBIDDEN",
        });
      }
      clientId = user.clientId;
    } else if (user.role === "admin" && !clientId) {
      throw new ConvexError({
        message: "Client ID required for admin users",
        code: "BAD_REQUEST",
      });
    }

    if (!clientId) {
      throw new ConvexError({
        message: "Client ID not found",
        code: "BAD_REQUEST",
      });
    }

    return await ctx.db
      .query("apiKeys")
      .withIndex("by_client", (q) => q.eq("clientId", clientId!))
      .collect();
  },
});

export const createApiKey = action({
  args: {
    name: v.string(),
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args): Promise<{ id: Id<"apiKeys">; key: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const user = await ctx.runQuery(api.apiKeys.getUserForKeyCreation, {
      tokenIdentifier: identity.tokenIdentifier,
    });

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Viewers cannot create API keys
    if (user.role === "viewer") {
      throw new ConvexError({
        message: "Viewers cannot create API keys",
        code: "FORBIDDEN",
      });
    }

    let clientId = args.clientId;

    if (user.role === "client") {
      if (!user.clientId) {
        throw new ConvexError({
          message: "User not associated with a client",
          code: "FORBIDDEN",
        });
      }
      clientId = user.clientId;
    } else if (user.role === "admin" && !clientId) {
      throw new ConvexError({
        message: "Client ID required for admin users",
        code: "BAD_REQUEST",
      });
    }

    if (!clientId) {
      throw new ConvexError({
        message: "Client ID not found",
        code: "BAD_REQUEST",
      });
    }

    // Generate cryptographically secure API key
    const apiKey: string = await ctx.runAction(internal.lib.keyGeneration.generateApiKey, {});
    
    // Hash the key before storing
    const keyHash: string = await ctx.runAction(internal.apiKeysActions.hashApiKey, { key: apiKey });
    
    // Check for hash collision (extremely unlikely)
    const existing: boolean = await ctx.runQuery(api.apiKeys.checkKeyHashExists, { keyHash });

    if (existing) {
      throw new ConvexError({
        message: "Key generation collision. Please try again.",
        code: "CONFLICT",
      });
    }

    // Extract last 4 characters for preview
    const keyPreview = apiKey.slice(-4);

    const apiKeyId = await ctx.runMutation(internal.apiKeys.insertApiKeyInternal, {
      clientId: clientId as Id<"clients">,
      keyHash,
      keyPreview,
      name: args.name,
    });

    // Log security event
    await ctx.runMutation(internal.apiKeys.logApiKeyCreated, {
      userId: user._id,
      clientId: clientId as Id<"clients">,
      apiKeyId,
    });

    // Return the plain key ONLY once (never stored)
    return { id: apiKeyId, key: apiKey };
  },
});

export const getUserForKeyCreation = query({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .unique();
  },
});

export const checkKeyHashExists = query({
  args: { keyHash: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_key_hash", (q) => q.eq("keyHash", args.keyHash))
      .unique();
    return existing !== null;
  },
});



export const insertApiKeyInternal = internalMutation({
  args: {
    clientId: v.id("clients"),
    keyHash: v.string(),
    keyPreview: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKeyId = await ctx.db.insert("apiKeys", {
      clientId: args.clientId,
      keyHash: args.keyHash,
      keyPreview: args.keyPreview,
      name: args.name,
      isActive: true,
      requestCount: 0,
    });

    return apiKeyId;
  },
});

export const logApiKeyCreated = internalMutation({
  args: {
    userId: v.id("users"),
    clientId: v.id("clients"),
    apiKeyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    await logSecurityEvent({
      ctx,
      eventType: "api_key_created",
      action: `API key created: ${args.apiKeyId}`,
      success: true,
      userId: args.userId,
      clientId: args.clientId,
    });
  },
});

export const toggleApiKey = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
    isActive: v.boolean(),
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

    // Viewers cannot toggle API keys
    if (user.role === "viewer") {
      throw new ConvexError({
        message: "Viewers cannot modify API keys",
        code: "FORBIDDEN",
      });
    }

    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey) {
      throw new ConvexError({
        message: "API key not found",
        code: "NOT_FOUND",
      });
    }

    if (user.role === "client" && user.clientId !== apiKey.clientId) {
      throw new ConvexError({
        message: "Access denied",
        code: "FORBIDDEN",
      });
    }

    await ctx.db.patch(args.apiKeyId, {
      isActive: args.isActive,
    });

    return args.apiKeyId;
  },
});

export const deleteApiKey = mutation({
  args: { apiKeyId: v.id("apiKeys") },
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

    // Viewers cannot delete API keys
    if (user.role === "viewer") {
      throw new ConvexError({
        message: "Viewers cannot delete API keys",
        code: "FORBIDDEN",
      });
    }

    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey) {
      throw new ConvexError({
        message: "API key not found",
        code: "NOT_FOUND",
      });
    }

    if (user.role === "client" && user.clientId !== apiKey.clientId) {
      throw new ConvexError({
        message: "Access denied",
        code: "FORBIDDEN",
      });
    }

    await ctx.db.delete(args.apiKeyId);

    // Log security event
    await logSecurityEvent({
      ctx,
      eventType: "api_key_deleted",
      action: `API key deleted: ${args.apiKeyId}`,
      success: true,
      userId: user._id,
      clientId: apiKey.clientId,
    });

    return args.apiKeyId;
  },
});

export const verifyApiKey = action({
  args: { key: v.string() },
  handler: async (ctx, args): Promise<{
    apiKeyId: Id<"apiKeys">;
    keyHash: string;
    clientId: Id<"clients">;
    client: unknown;
  } | null> => {
    return await ctx.runAction(internal.apiKeysActions.verifyApiKeyAction, { key: args.key });
  },
});

export const verifyApiKeyHash = query({
  args: { keyHash: v.string() },
  handler: async (ctx, args) => {
    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_key_hash", (q) => q.eq("keyHash", args.keyHash))
      .unique();

    if (!apiKey || !apiKey.isActive) {
      return null;
    }

    const client = await ctx.db.get(apiKey.clientId);
    if (!client || client.status !== "active") {
      return null;
    }

    return {
      apiKeyId: apiKey._id,
      keyHash: args.keyHash,
      clientId: apiKey.clientId,
      client,
    };
  },
});

export const updateLastUsed = mutation({
  args: { apiKeyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey) return args.apiKeyId;

    await ctx.db.patch(args.apiKeyId, {
      lastUsedAt: Date.now(),
      requestCount: (apiKey.requestCount || 0) + 1,
      lastRequestAt: Date.now(),
    });

    return args.apiKeyId;
  },
});

// Query to verify legacy API keys (stored as plain text before security update)
export const verifyLegacyApiKeyQuery = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    // Find API key by the raw key value (legacy format)
    const allApiKeys = await ctx.db.query("apiKeys").collect();
    
    // Find the key that matches
    const apiKey = allApiKeys.find(k => k.key === args.key && k.isActive);
    
    if (!apiKey) {
      return null;
    }

    const client = await ctx.db.get(apiKey.clientId);
    if (!client || client.status !== "active") {
      return null;
    }

    return {
      apiKeyId: apiKey._id,
      keyHash: args.key, // Use the key itself as the identifier for legacy keys
      clientId: apiKey.clientId,
      client,
    };
  },
});
