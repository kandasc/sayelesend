import { ConvexError } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";

async function findUserByEmail(ctx: MutationCtx, email: string | undefined) {
  if (!email?.trim()) return null;
  const trimmed = email.trim();
  const variants = Array.from(new Set([trimmed, trimmed.toLowerCase()]));
  for (const v of variants) {
    const hit = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", v))
      .first();
    if (hit) return hit;
  }
  return null;
}

export const createOrUpdateUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const byToken = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (byToken) {
      await ctx.db.patch(byToken._id, {
        name: identity.name,
        email: identity.email,
      });
      return byToken._id;
    }
    const byEmail = await findUserByEmail(ctx, identity.email ?? undefined);
    if (byEmail) {
      await ctx.db.patch(byEmail._id, {
        tokenIdentifier: identity.tokenIdentifier,
        name: identity.name ?? byEmail.name,
        email: identity.email ?? byEmail.email,
      });
      return byEmail._id;
    }
    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name: identity.name ?? "",
      email: identity.email ?? "",
      role: "admin",
      status: "approved",
      permissions: [],
    });
  },
});

export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const byToken = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (byToken !== null) {
      return byToken._id;
    }

    const byEmail = await findUserByEmail(ctx, identity.email ?? undefined);
    if (byEmail) {
      await ctx.db.patch(byEmail._id, {
        tokenIdentifier: identity.tokenIdentifier,
        name: identity.name ?? byEmail.name,
        email: identity.email ?? byEmail.email,
      });
      return byEmail._id;
    }

    // For new users, determine role based on environment variable
    // Set FIRST_ADMIN_EMAIL in environment to specify who should be admin
    const firstAdminEmail = process.env.FIRST_ADMIN_EMAIL;
    let role: "admin" | "client" = "client";
    
    if (firstAdminEmail && identity.email === firstAdminEmail) {
      role = "admin";
    } else {
      // Fallback: if no users exist and no FIRST_ADMIN_EMAIL set, make first user admin
      const allUsers = await ctx.db.query("users").collect();
      if (allUsers.length === 0) {
        role = "admin";
      }
    }

    // If it's a new identity, create a new User.
    return await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      tokenIdentifier: identity.tokenIdentifier,
      role,
    });
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    return user;
  },
});
