import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import { logSecurityEvent } from "./lib/securityLogger";

// Create a client and their admin user
export const createClientWithAdmin = mutation({
  args: {
    companyName: v.string(),
    contactName: v.string(),
    email: v.string(),
    phone: v.string(),
    credits: v.number(),
    smsProviderId: v.id("smsProviders"),
    whatsappProviderId: v.optional(v.id("smsProviders")),
    telegramProviderId: v.optional(v.id("smsProviders")),
    facebookMessengerProviderId: v.optional(v.id("smsProviders")),
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
      whatsappProviderId: args.whatsappProviderId,
      telegramProviderId: args.telegramProviderId,
      facebookMessengerProviderId: args.facebookMessengerProviderId,
      status: "active",
      webhookUrl: args.webhookUrl,
      senderId: args.senderId,
      remoteId: args.remoteId,
      smsCount: 0,
      whatsappCount: 0,
      telegramCount: 0,
      facebookMessengerCount: 0,
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
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user || user.role !== "admin") {
      return null;
    }

    return await ctx.db.query("clients").collect();
  },
});

// Update user role
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("client"), v.literal("viewer")),
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

    // Prevent admin from changing their own role
    if (admin._id === args.userId) {
      throw new ConvexError({
        message: "Cannot change your own role",
        code: "FORBIDDEN",
      });
    }

    const targetUser = await ctx.db.get(args.userId);
    
    await ctx.db.patch(args.userId, {
      role: args.role,
      clientId: args.clientId,
    });

    // Log role change
    await logSecurityEvent({
      ctx,
      eventType: "user_role_changed",
      action: `User role changed from ${targetUser?.role || "none"} to ${args.role}`,
      success: true,
      userId: admin._id,
      metadata: { targetUserId: args.userId, newRole: args.role },
    });

    return { success: true };
  },
});

// Update user details
export const updateUserDetails = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
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

    const updates: { name?: string; email?: string } = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.email !== undefined) updates.email = args.email;

    await ctx.db.patch(args.userId, updates);

    return { success: true };
  },
});

// Unassign user from client
export const unassignUserFromClient = mutation({
  args: {
    userId: v.id("users"),
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

    await ctx.db.patch(args.userId, {
      clientId: undefined,
      role: undefined,
    });

    return { success: true };
  },
});

// Delete user
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
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

    // Prevent admin from deleting themselves
    if (admin._id === args.userId) {
      throw new ConvexError({
        message: "Cannot delete your own account",
        code: "FORBIDDEN",
      });
    }

    const targetUser = await ctx.db.get(args.userId);
    
    await ctx.db.delete(args.userId);
    
    // Log user deletion
    await logSecurityEvent({
      ctx,
      eventType: "admin_action",
      action: `User deleted: ${targetUser?.email || args.userId}`,
      success: true,
      userId: admin._id,
    });
    
    return { success: true };
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

// Retry all pending messages
export const retryPendingMessages = mutation({
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

    // Get all pending messages
    const pendingMessages = await ctx.db
      .query("messages")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    // Schedule sending for each pending message
    let scheduledCount = 0;
    for (const message of pendingMessages) {
      await ctx.scheduler.runAfter(scheduledCount * 500, internal.sms.send.sendSingleMessage, {
        messageId: message._id,
      });
      scheduledCount++;
    }

    return {
      pendingCount: pendingMessages.length,
      scheduledCount,
    };
  },
});
