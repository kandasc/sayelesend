import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

function generateApiKey(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "sk_";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

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

export const createApiKey = mutation({
  args: {
    name: v.string(),
    clientId: v.optional(v.id("clients")),
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

    let apiKey = generateApiKey();
    let existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) => q.eq("key", apiKey))
      .unique();

    while (existing) {
      apiKey = generateApiKey();
      existing = await ctx.db
        .query("apiKeys")
        .withIndex("by_key", (q) => q.eq("key", apiKey))
        .unique();
    }

    const apiKeyId = await ctx.db.insert("apiKeys", {
      clientId: clientId,
      key: apiKey,
      name: args.name,
      isActive: true,
    });

    return { id: apiKeyId, key: apiKey };
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
