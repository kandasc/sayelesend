import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import { validateWebhookUrl, validateEmail, validatePhoneNumber } from "./lib/validation";
import { logSecurityEvent } from "./lib/securityLogger";

export const getCurrentClient = query({
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

    // Check for test mode first (admin testing as client)
    if (user.role === "admin" && user.testModeClientId) {
      const client = await ctx.db.get(user.testModeClientId);
      return client ?? null;
    }

    // Regular client user
    if (user.role !== "client" || !user.clientId) {
      return null;
    }

    const client = await ctx.db.get(user.clientId);
    return client ?? null;
  },
});

export const listClients = query({
  args: {
    status: v.optional(
      v.union(v.literal("active"), v.literal("suspended"), v.literal("inactive"))
    ),
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

    if (args.status) {
      return await ctx.db
        .query("clients")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }

    return await ctx.db.query("clients").collect();
  },
});

export const getClient = query({
  args: { clientId: v.id("clients") },
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

    const client = await ctx.db.get(args.clientId);
    if (!client) {
      throw new ConvexError({
        message: "Client not found",
        code: "NOT_FOUND",
      });
    }

    return client;
  },
});

export const createClient = mutation({
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

    // Validate email and phone
    validateEmail(args.email);
    validatePhoneNumber(args.phone);

    // Validate webhook URL if provided
    if (args.webhookUrl) {
      validateWebhookUrl(args.webhookUrl);
    }

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

    // Log client creation
    await logSecurityEvent({
      ctx,
      eventType: "client_created",
      action: `Client created: ${args.companyName}`,
      success: true,
      userId: user._id,
      clientId,
    });

    return clientId;
  },
});

export const updateClient = mutation({
  args: {
    clientId: v.id("clients"),
    companyName: v.optional(v.string()),
    contactName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    credits: v.optional(v.number()),
    smsProviderId: v.optional(v.id("smsProviders")),
    bulkSmsProviderId: v.optional(v.id("smsProviders")),
    whatsappProviderId: v.optional(v.id("smsProviders")),
    telegramProviderId: v.optional(v.id("smsProviders")),
    facebookMessengerProviderId: v.optional(v.id("smsProviders")),
    status: v.optional(
      v.union(v.literal("active"), v.literal("suspended"), v.literal("inactive"))
    ),
    webhookUrl: v.optional(v.string()),
    senderId: v.optional(v.string()),
    remoteId: v.optional(v.string()),
    emailAssistantEnabled: v.optional(v.boolean()),
    marketingEnabled: v.optional(v.boolean()),
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

    const client = await ctx.db.get(args.clientId);
    if (!client) {
      throw new ConvexError({
        message: "Client not found",
        code: "NOT_FOUND",
      });
    }

    const updates: Partial<{
      companyName: string;
      contactName: string;
      email: string;
      phone: string;
      credits: number;
      smsProviderId: Id<"smsProviders">;
      bulkSmsProviderId: Id<"smsProviders"> | undefined;
      whatsappProviderId: Id<"smsProviders"> | undefined;
      telegramProviderId: Id<"smsProviders"> | undefined;
      facebookMessengerProviderId: Id<"smsProviders"> | undefined;
      status: "active" | "suspended" | "inactive";
      webhookUrl: string;
      senderId: string;
      remoteId: string;
      emailAssistantEnabled: boolean;
      marketingEnabled: boolean;
    }> = {};

    if (args.companyName !== undefined) updates.companyName = args.companyName;
    if (args.contactName !== undefined) updates.contactName = args.contactName;
    
    // Only validate email if it's actually changed
    if (args.email !== undefined && args.email !== client.email) {
      validateEmail(args.email);
      updates.email = args.email;
    } else if (args.email !== undefined) {
      updates.email = args.email;
    }
    
    // Only validate phone if it's actually changed
    if (args.phone !== undefined && args.phone !== client.phone) {
      validatePhoneNumber(args.phone);
      updates.phone = args.phone;
    } else if (args.phone !== undefined) {
      updates.phone = args.phone;
    }
    
    if (args.credits !== undefined) updates.credits = args.credits;
    if (args.smsProviderId !== undefined)
      updates.smsProviderId = args.smsProviderId;
    if (args.bulkSmsProviderId !== undefined)
      updates.bulkSmsProviderId = args.bulkSmsProviderId;
    if (args.whatsappProviderId !== undefined)
      updates.whatsappProviderId = args.whatsappProviderId;
    if (args.telegramProviderId !== undefined)
      updates.telegramProviderId = args.telegramProviderId;
    if (args.facebookMessengerProviderId !== undefined)
      updates.facebookMessengerProviderId = args.facebookMessengerProviderId;
    if (args.status !== undefined) updates.status = args.status;
    
    // Only validate webhook URL if it's actually changed
    if (args.webhookUrl !== undefined) {
      if (args.webhookUrl && args.webhookUrl !== client.webhookUrl) {
        validateWebhookUrl(args.webhookUrl);
      }
      updates.webhookUrl = args.webhookUrl;
    }
    if (args.senderId !== undefined) updates.senderId = args.senderId;
    if (args.remoteId !== undefined) updates.remoteId = args.remoteId;
    if (args.emailAssistantEnabled !== undefined) updates.emailAssistantEnabled = args.emailAssistantEnabled;
    if (args.marketingEnabled !== undefined) updates.marketingEnabled = args.marketingEnabled;

    await ctx.db.patch(args.clientId, updates);

    return args.clientId;
  },
});

export const addCredits = mutation({
  args: {
    clientId: v.id("clients"),
    amount: v.number(),
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

    const client = await ctx.db.get(args.clientId);
    if (!client) {
      throw new ConvexError({
        message: "Client not found",
        code: "NOT_FOUND",
      });
    }

    await ctx.db.patch(args.clientId, {
      credits: client.credits + args.amount,
    });

    return client.credits + args.amount;
  },
});

export const getClientStats = query({
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

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_client", (q) => q.eq("clientId", clientId!))
      .collect();

    const totalSent = messages.filter((m) => m.status !== "failed").length;
    const totalDelivered = messages.filter((m) => m.status === "delivered")
      .length;
    const totalFailed = messages.filter((m) => m.status === "failed").length;
    const totalCreditsUsed = messages.reduce(
      (sum, m) => sum + m.creditsUsed,
      0
    );

    // Per-channel stats
    const smsMessages = messages.filter((m) => !m.channel || m.channel === "sms");
    const whatsappMessages = messages.filter((m) => m.channel === "whatsapp");
    const telegramMessages = messages.filter((m) => m.channel === "telegram");
    const facebookMessages = messages.filter((m) => m.channel === "facebook_messenger");

    return {
      totalSent,
      totalDelivered,
      totalFailed,
      totalCreditsUsed,
      totalMessages: messages.length,
      smsCount: smsMessages.length,
      whatsappCount: whatsappMessages.length,
      telegramCount: telegramMessages.length,
      facebookMessengerCount: facebookMessages.length,
    };
  },
});
