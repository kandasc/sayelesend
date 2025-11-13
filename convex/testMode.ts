import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import { logSecurityEvent } from "./lib/securityLogger";

// Test mode session timeout (30 minutes)
const TEST_MODE_TIMEOUT = 30 * 60 * 1000;

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

    // Store test mode with expiration
    await ctx.db.patch(user._id, {
      testModeClientId: args.clientId ?? undefined,
      testModeExpiresAt: args.clientId ? Date.now() + TEST_MODE_TIMEOUT : undefined,
    });

    // Log admin action
    await logSecurityEvent({
      ctx,
      eventType: "admin_action",
      action: args.clientId ? `Entered test mode for client ${args.clientId}` : "Exited test mode",
      success: true,
      userId: user._id,
      clientId: args.clientId || undefined,
    });

    // Schedule cleanup if entering test mode
    if (args.clientId) {
      await ctx.scheduler.runAfter(TEST_MODE_TIMEOUT, internal.testMode.cleanupExpiredTestMode, {
        userId: user._id,
      });
    }

    return { success: true, expiresAt: args.clientId ? Date.now() + TEST_MODE_TIMEOUT : undefined };
  },
});

// Cleanup expired test mode sessions
export const cleanupExpiredTestMode = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.testModeExpiresAt) {
      return;
    }

    // Check if test mode has expired
    if (Date.now() >= user.testModeExpiresAt) {
      await ctx.db.patch(args.userId, {
        testModeClientId: undefined,
        testModeExpiresAt: undefined,
      });
    }
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
