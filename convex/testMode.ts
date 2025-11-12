import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

// Set test mode for admin to impersonate a client
export const setTestMode = mutation({
  args: {
    clientId: v.union(v.id("clients"), v.null()),
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

    if (!user || user.role !== "admin") {
      throw new ConvexError({
        message: "Admin access required",
        code: "FORBIDDEN",
      });
    }

    // Store test mode in a session table or return it
    // For now, we'll use a simple approach: update user temporarily
    await ctx.db.patch(user._id, {
      testModeClientId: args.clientId ?? undefined,
    });

    return { success: true };
  },
});

// Get effective user (returns client view if in test mode)
export const getEffectiveUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return null;
    }

    // If admin is in test mode, return modified user
    if (user.role === "admin" && user.testModeClientId) {
      return {
        ...user,
        role: "client" as const,
        clientId: user.testModeClientId as Id<"clients">,
        isTestMode: true,
      };
    }

    return {
      ...user,
      isTestMode: false,
    };
  },
});
