import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

// ─── Queries ──────────────────────────────────────────────────

export const listContent = query({
  args: {
    platform: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user?.clientId) return [];

    let contents = await ctx.db
      .query("marketingContent")
      .withIndex("by_client", (q) => q.eq("clientId", user.clientId!))
      .order("desc")
      .collect();

    if (args.platform && args.platform !== "all") {
      contents = contents.filter((c) => c.platform === args.platform);
    }
    if (args.status && args.status !== "all") {
      contents = contents.filter((c) => c.status === args.status);
    }

    // Resolve image URLs
    return Promise.all(
      contents.map(async (c) => ({
        ...c,
        imageUrl: c.imageStorageId ? await ctx.storage.getUrl(c.imageStorageId) : c.imageUrl,
      }))
    );
  },
});

export const getContent = query({
  args: { contentId: v.id("marketingContent") },
  handler: async (ctx, args) => {
    const content = await ctx.db.get(args.contentId);
    if (!content) return null;
    return {
      ...content,
      imageUrl: content.imageStorageId
        ? await ctx.storage.getUrl(content.imageStorageId)
        : content.imageUrl,
    };
  },
});

// ─── Mutations ────────────────────────────────────────────────

export const saveContent = mutation({
  args: {
    platform: v.union(
      v.literal("facebook"),
      v.literal("instagram"),
      v.literal("x"),
      v.literal("linkedin"),
      v.literal("whatsapp"),
      v.literal("tiktok"),
      v.literal("general")
    ),
    tone: v.union(
      v.literal("professional"),
      v.literal("casual"),
      v.literal("humorous"),
      v.literal("inspirational"),
      v.literal("promotional"),
      v.literal("educational")
    ),
    language: v.string(),
    topic: v.string(),
    generatedText: v.string(),
    hashtags: v.optional(v.string()),
    callToAction: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user?.clientId) {
      throw new ConvexError({ message: "No client assigned", code: "FORBIDDEN" });
    }

    return await ctx.db.insert("marketingContent", {
      clientId: user.clientId,
      userId: user._id,
      platform: args.platform,
      tone: args.tone,
      language: args.language,
      topic: args.topic,
      generatedText: args.generatedText,
      hashtags: args.hashtags,
      callToAction: args.callToAction,
      imageStorageId: args.imageStorageId,
      status: "saved",
    });
  },
});

export const updateContent = mutation({
  args: {
    contentId: v.id("marketingContent"),
    generatedText: v.optional(v.string()),
    hashtags: v.optional(v.string()),
    callToAction: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("saved"),
      v.literal("published")
    )),
    isFavorite: v.optional(v.boolean()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { contentId, ...updates } = args;
    const existing = await ctx.db.get(contentId);
    if (!existing) {
      throw new ConvexError({ message: "Content not found", code: "NOT_FOUND" });
    }

    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }

    await ctx.db.patch(contentId, cleanUpdates);
  },
});

export const deleteContent = mutation({
  args: { contentId: v.id("marketingContent") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.contentId);
    if (!existing) {
      throw new ConvexError({ message: "Content not found", code: "NOT_FOUND" });
    }
    // Delete associated image from storage
    if (existing.imageStorageId) {
      await ctx.storage.delete(existing.imageStorageId);
    }
    await ctx.db.delete(args.contentId);
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
