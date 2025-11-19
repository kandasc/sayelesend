import { mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * Migration: Initialize per-channel credits for existing clients
 * This splits the legacy single credit balance into separate per-channel balances
 * Run this once after deploying the per-channel credit feature
 */
export const initializePerChannelCredits = mutation({
  args: {},
  handler: async (ctx) => {
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

    const clients = await ctx.db.query("clients").collect();
    let migratedCount = 0;

    for (const client of clients) {
      // Only migrate if per-channel credits haven't been set yet
      if (
        client.smsCredits === undefined &&
        client.whatsappCredits === undefined &&
        client.telegramCredits === undefined &&
        client.facebookMessengerCredits === undefined
      ) {
        // Split legacy credits equally across all channels
        const creditsPerChannel = Math.floor(client.credits / 4);
        
        await ctx.db.patch(client._id, {
          smsCredits: creditsPerChannel,
          whatsappCredits: creditsPerChannel,
          telegramCredits: creditsPerChannel,
          facebookMessengerCredits: creditsPerChannel,
        });
        
        migratedCount++;
      }
    }

    return {
      success: true,
      message: `Migrated ${migratedCount} clients to per-channel credits`,
      migratedCount,
    };
  },
});

/**
 * Migration: Reset all clients to use per-channel credits
 * This resets ALL clients, distributing their current credits equally
 * Use with caution - this will overwrite existing per-channel balances
 */
export const resetToPerChannelCredits = mutation({
  args: {},
  handler: async (ctx) => {
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

    const clients = await ctx.db.query("clients").collect();
    
    for (const client of clients) {
      // Split current total credits equally across all channels
      const creditsPerChannel = Math.floor(client.credits / 4);
      
      await ctx.db.patch(client._id, {
        smsCredits: creditsPerChannel,
        whatsappCredits: creditsPerChannel,
        telegramCredits: creditsPerChannel,
        facebookMessengerCredits: creditsPerChannel,
      });
    }

    return {
      success: true,
      message: `Reset ${clients.length} clients to per-channel credits`,
      resetCount: clients.length,
    };
  },
});
