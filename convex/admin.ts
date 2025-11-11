import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Create a client and their admin user
export const createClientWithAdmin = mutation({
  args: {
    companyName: v.string(),
    contactName: v.string(),
    email: v.string(),
    phone: v.string(),
    credits: v.number(),
    smsProviderId: v.id("smsProviders"),
    webhookUrl: v.optional(v.string()),
    adminEmail: v.string(),
    adminName: v.string(),
    senderId: v.optional(v.string()),
    remoteId: v.optional(v.string()),
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

    // Check if client already exists
    const existing = await ctx.db
      .query("clients")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) {
      throw new ConvexError({
        message: "Client with this email already exists",
        code: "CONFLICT",
      });
    }

    // Create client
    const clientId = await ctx.db.insert("clients", {
      companyName: args.companyName,
      contactName: args.contactName,
      email: args.email,
      phone: args.phone,
      credits: args.credits,
      smsProviderId: args.smsProviderId,
      status: "active",
      webhookUrl: args.webhookUrl,
      senderId: args.senderId,
      remoteId: args.remoteId,
    });

    return {
      clientId,
      message: `Client created successfully. Admin user should sign in with: ${args.adminEmail}`,
    };
  },
});

// Assign user to client as admin
export const assignUserToClient = mutation({
  args: {
    userEmail: v.string(),
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!admin || admin.role !== "admin") {
      throw new ConvexError({
        message: "Admin access required",
        code: "FORBIDDEN",
      });
    }

    // Find user by email
    const allUsers = await ctx.db.query("users").collect();
    const targetUser = allUsers.find((u) => u.email === args.userEmail);

    if (!targetUser) {
      throw new ConvexError({
        message: `User with email ${args.userEmail} not found. They need to sign in first.`,
        code: "NOT_FOUND",
      });
    }

    // Update user
    await ctx.db.patch(targetUser._id, {
      role: "client",
      clientId: args.clientId,
    });

    return { success: true };
  },
});

// Get all users
export const listUsers = query({
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

    return await ctx.db.query("users").collect();
  },
});

// List all clients (admin only)
export const listClients = query({
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

    return await ctx.db.query("clients").collect();
  },
});

// Get system stats for admin
export const getSystemStats = query({
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
    const messages = await ctx.db.query("messages").collect();
    const totalCredits = clients.reduce((sum, c) => sum + c.credits, 0);
    const activeClients = clients.filter((c) => c.status === "active").length;
    const totalSent = messages.filter((m) => m.status !== "failed").length;
    const totalDelivered = messages.filter((m) => m.status === "delivered")
      .length;

    return {
      totalClients: clients.length,
      activeClients,
      totalCredits,
      totalMessages: messages.length,
      totalSent,
      totalDelivered,
    };
  },
});
