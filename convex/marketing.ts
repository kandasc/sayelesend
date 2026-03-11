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
      v.literal("scheduled"),
      v.literal("published")
    )),
    scheduledAt: v.optional(v.string()),
    publishedAt: v.optional(v.string()),
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

export const listAllLibraryItems = query({
  args: {
    platform: v.optional(v.string()),
    status: v.optional(v.string()),
    itemType: v.optional(v.union(v.literal("content"), v.literal("image"), v.literal("all"))),
    search: v.optional(v.string()),
    favoritesOnly: v.optional(v.boolean()),
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

    const type = args.itemType ?? "all";
    const items: Array<{
      _id: string;
      _creationTime: number;
      itemType: "content" | "image";
      platform: string;
      topic: string;
      text: string;
      hashtags?: string;
      status: string;
      isFavorite: boolean;
      imageUrl?: string | null;
      style?: string;
      scheduledAt?: string;
      publishedAt?: string;
      tone?: string;
      language?: string;
    }> = [];

    // Fetch text content
    if (type === "all" || type === "content") {
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
      if (args.favoritesOnly) {
        contents = contents.filter((c) => c.isFavorite);
      }
      if (args.search) {
        const searchLower = args.search.toLowerCase();
        contents = contents.filter(
          (c) =>
            c.topic.toLowerCase().includes(searchLower) ||
            c.generatedText.toLowerCase().includes(searchLower)
        );
      }

      for (const c of contents) {
        items.push({
          _id: c._id,
          _creationTime: c._creationTime,
          itemType: "content",
          platform: c.platform,
          topic: c.topic,
          text: c.generatedText,
          hashtags: c.hashtags,
          status: c.status,
          isFavorite: c.isFavorite ?? false,
          imageUrl: c.imageStorageId ? await ctx.storage.getUrl(c.imageStorageId) : c.imageUrl,
          scheduledAt: c.scheduledAt,
          publishedAt: c.publishedAt,
          tone: c.tone,
          language: c.language,
        });
      }
    }

    // Fetch images
    if (type === "all" || type === "image") {
      let images = await ctx.db
        .query("marketingImages")
        .withIndex("by_client", (q) => q.eq("clientId", user.clientId!))
        .order("desc")
        .collect();

      if (args.favoritesOnly) {
        images = images.filter((img) => img.isFavorite);
      }
      if (args.search) {
        const searchLower = args.search.toLowerCase();
        images = images.filter((img) =>
          img.prompt.toLowerCase().includes(searchLower)
        );
      }

      for (const img of images) {
        items.push({
          _id: img._id,
          _creationTime: img._creationTime,
          itemType: "image",
          platform: img.platform ?? "general",
          topic: img.prompt,
          text: img.prompt,
          status: "saved",
          isFavorite: img.isFavorite ?? false,
          imageUrl: await ctx.storage.getUrl(img.storageId),
          style: img.style,
        });
      }
    }

    // Sort by creation time descending
    items.sort((a, b) => b._creationTime - a._creationTime);

    return items;
  },
});

export const listCalendarContent = query({
  args: {
    startDate: v.string(), // ISO 8601 date string (start of range)
    endDate: v.string(), // ISO 8601 date string (end of range)
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

    const contents = await ctx.db
      .query("marketingContent")
      .withIndex("by_client", (q) => q.eq("clientId", user.clientId!))
      .collect();

    // Filter to items with scheduledAt or publishedAt within the date range
    const rangeStart = args.startDate;
    const rangeEnd = args.endDate;

    const calendarItems = contents.filter((c) => {
      const date = c.scheduledAt ?? c.publishedAt;
      if (!date) return false;
      return date >= rangeStart && date <= rangeEnd;
    });

    return Promise.all(
      calendarItems.map(async (c) => ({
        ...c,
        imageUrl: c.imageStorageId ? await ctx.storage.getUrl(c.imageStorageId) : c.imageUrl,
      }))
    );
  },
});

export const scheduleContent = mutation({
  args: {
    contentId: v.id("marketingContent"),
    scheduledAt: v.string(), // ISO 8601 UTC
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.contentId);
    if (!existing) {
      throw new ConvexError({ message: "Content not found", code: "NOT_FOUND" });
    }
    await ctx.db.patch(args.contentId, {
      status: "scheduled",
      scheduledAt: args.scheduledAt,
    });
  },
});

export const markPublished = mutation({
  args: { contentId: v.id("marketingContent") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.contentId);
    if (!existing) {
      throw new ConvexError({ message: "Content not found", code: "NOT_FOUND" });
    }
    await ctx.db.patch(args.contentId, {
      status: "published",
      publishedAt: new Date().toISOString(),
    });
  },
});

// ─── Marketing Images ────────────────────────────────────────

export const saveImage = mutation({
  args: {
    prompt: v.string(),
    style: v.string(),
    platform: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
    storageId: v.id("_storage"),
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

    return await ctx.db.insert("marketingImages", {
      clientId: user.clientId,
      userId: user._id,
      prompt: args.prompt,
      style: args.style,
      platform: args.platform,
      aspectRatio: args.aspectRatio,
      storageId: args.storageId,
    });
  },
});

export const listImages = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user?.clientId) return [];

    const images = await ctx.db
      .query("marketingImages")
      .withIndex("by_client", (q) => q.eq("clientId", user.clientId!))
      .order("desc")
      .collect();

    return Promise.all(
      images.map(async (img) => ({
        ...img,
        imageUrl: await ctx.storage.getUrl(img.storageId),
      }))
    );
  },
});

export const updateImage = mutation({
  args: {
    imageId: v.id("marketingImages"),
    isFavorite: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.imageId);
    if (!existing) {
      throw new ConvexError({ message: "Image not found", code: "NOT_FOUND" });
    }
    const updates: Record<string, unknown> = {};
    if (args.isFavorite !== undefined) updates.isFavorite = args.isFavorite;
    await ctx.db.patch(args.imageId, updates);
  },
});

export const deleteImage = mutation({
  args: { imageId: v.id("marketingImages") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.imageId);
    if (!existing) {
      throw new ConvexError({ message: "Image not found", code: "NOT_FOUND" });
    }
    await ctx.storage.delete(existing.storageId);
    await ctx.db.delete(args.imageId);
  },
});
