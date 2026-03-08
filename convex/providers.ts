import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

export const listProviders = query({
  args: { activeOnly: v.optional(v.boolean()) },
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

    if (args.activeOnly) {
      return await ctx.db
        .query("smsProviders")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
    }

    return await ctx.db.query("smsProviders").collect();
  },
});

export const getProvider = query({
  args: { providerId: v.id("smsProviders") },
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

    const provider = await ctx.db.get(args.providerId);
    if (!provider) {
      throw new ConvexError({
        message: "Provider not found",
        code: "NOT_FOUND",
      });
    }

    return provider;
  },
});

export const createProvider = mutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal("twilio"),
      v.literal("vonage"),
      v.literal("africas_talking"),
      v.literal("mtarget"),
      v.literal("whatsapp"),
      v.literal("telegram"),
      v.literal("facebook_messenger"),
      v.literal("custom")
    ),
    channel: v.union(
      v.literal("sms"),
      v.literal("whatsapp"),
      v.literal("telegram"),
      v.literal("facebook_messenger")
    ),
    costPerSms: v.number(),
    isActive: v.boolean(),
    config: v.object({
      apiKey: v.optional(v.string()),
      apiSecret: v.optional(v.string()),
      accountSid: v.optional(v.string()),
      authToken: v.optional(v.string()),
      username: v.optional(v.string()),
      password: v.optional(v.string()),
      senderId: v.optional(v.string()),
      endpoint: v.optional(v.string()),
      serviceId: v.optional(v.string()),
      remoteId: v.optional(v.string()),
      uniqueId: v.optional(v.string()),
      phoneNumberId: v.optional(v.string()),
      businessAccountId: v.optional(v.string()),
      accessToken: v.optional(v.string()),
      botToken: v.optional(v.string()),
      pageAccessToken: v.optional(v.string()),
      pageId: v.optional(v.string()),
      appSecret: v.optional(v.string()),
    }),
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

    const providerId = await ctx.db.insert("smsProviders", {
      name: args.name,
      type: args.type,
      channel: args.channel,
      config: args.config,
      isActive: args.isActive,
      costPerSms: args.costPerSms,
    });

    return providerId;
  },
});

export const updateProvider = mutation({
  args: {
    providerId: v.id("smsProviders"),
    name: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal("twilio"),
      v.literal("vonage"),
      v.literal("africas_talking"),
      v.literal("mtarget"),
      v.literal("whatsapp"),
      v.literal("telegram"),
      v.literal("facebook_messenger"),
      v.literal("custom")
    )),
    channel: v.optional(v.union(
      v.literal("sms"),
      v.literal("whatsapp"),
      v.literal("telegram"),
      v.literal("facebook_messenger")
    )),
    costPerSms: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    config: v.optional(v.object({
      apiKey: v.optional(v.string()),
      apiSecret: v.optional(v.string()),
      accountSid: v.optional(v.string()),
      authToken: v.optional(v.string()),
      username: v.optional(v.string()),
      password: v.optional(v.string()),
      senderId: v.optional(v.string()),
      endpoint: v.optional(v.string()),
      serviceId: v.optional(v.string()),
      remoteId: v.optional(v.string()),
      uniqueId: v.optional(v.string()),
      phoneNumberId: v.optional(v.string()),
      businessAccountId: v.optional(v.string()),
      accessToken: v.optional(v.string()),
      botToken: v.optional(v.string()),
      pageAccessToken: v.optional(v.string()),
      pageId: v.optional(v.string()),
      appSecret: v.optional(v.string()),
    })),
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

    const provider = await ctx.db.get(args.providerId);
    if (!provider) {
      throw new ConvexError({
        message: "Provider not found",
        code: "NOT_FOUND",
      });
    }

    const updates: Record<string, unknown> = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.type !== undefined) updates.type = args.type;
    if (args.channel !== undefined) updates.channel = args.channel;
    if (args.costPerSms !== undefined) updates.costPerSms = args.costPerSms;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.config !== undefined) updates.config = args.config;

    await ctx.db.patch(args.providerId, updates);

    return args.providerId;
  },
});

export const deleteProvider = mutation({
  args: { providerId: v.id("smsProviders") },
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

    const clients = await ctx.db.query("clients").collect();
    const hasClients = clients.some(
      (client) => client.smsProviderId === args.providerId ||
        client.whatsappProviderId === args.providerId ||
        client.telegramProviderId === args.providerId ||
        client.facebookMessengerProviderId === args.providerId
    );

    if (hasClients) {
      throw new ConvexError({
        message:
          "Cannot delete provider: it is currently assigned to one or more clients",
        code: "CONFLICT",
      });
    }

    await ctx.db.delete(args.providerId);

    return args.providerId;
  },
});
