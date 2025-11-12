import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { ConvexError } from "convex/values";
import { internal, api } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";

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
    let apiKey: string = await ctx.runAction(internal.lib.keyGeneration.generateApiKey, {});
    let existing: boolean = await ctx.runQuery(api.apiKeys.checkKeyExists, { key: apiKey });

    // Retry if collision (extremely unlikely with 256-bit entropy)
    while (existing) {
      apiKey = await ctx.runAction(internal.lib.keyGeneration.generateApiKey, {});
      existing = await ctx.runQuery(api.apiKeys.checkKeyExists, { key: apiKey });
    }

    const result: { id: Id<"apiKeys">; key: string } = await ctx.runMutation(api.apiKeys.insertApiKey, {
      clientId: clientId as Id<"clients">,
      key: apiKey,
      name: args.name,
    });

    return result;
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

export const getUserForKeyCreationInternal = query({
  args: { tokenIdentifier: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
      .unique();
  },
});

export const checkKeyExists = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    return existing !== null;
  },
});

export const insertApiKeyInternal = mutation({
  args: {
    clientId: v.id("clients"),
    key: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKeyId = await ctx.db.insert("apiKeys", {
      clientId: args.clientId,
      key: args.key,
      name: args.name,
      isActive: true,
    });

    return { id: apiKeyId, key: args.key };
  },
});

export const insertApiKey = mutation({
  args: {
    clientId: v.id("clients"),
    key: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKeyId = await ctx.db.insert("apiKeys", {
      clientId: args.clientId,
      key: args.key,
      name: args.name,
      isActive: true,
    });

    return { id: apiKeyId, key: args.key };
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

    return args.apiKeyId;
  },
});

export const verifyApiKey = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) => q.eq("key", args.key))
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
      clientId: apiKey.clientId,
      client,
    };
  },
});

export const updateLastUsed = mutation({
  args: { apiKeyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.apiKeyId, {
      lastUsedAt: Date.now(),
    });
    return args.apiKeyId;
  },
});
