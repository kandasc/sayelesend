import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

// ─── Queries ──────────────────────────────────────────────────

export const listDocuments = query({
  args: {
    documentType: v.optional(v.string()),
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

    let documents = await ctx.db
      .query("generatedDocuments")
      .withIndex("by_client", (q) => q.eq("clientId", user.clientId!))
      .order("desc")
      .collect();

    if (args.documentType && args.documentType !== "all") {
      documents = documents.filter((d) => d.documentType === args.documentType);
    }

    return documents;
  },
});

export const getDocument = query({
  args: { documentId: v.id("generatedDocuments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.documentId);
  },
});

// ─── Mutations ────────────────────────────────────────────────

export const createDocument = mutation({
  args: {
    documentType: v.union(
      v.literal("product_presentation"),
      v.literal("tender_response"),
      v.literal("techno_commercial")
    ),
    title: v.string(),
    briefing: v.string(),
    language: v.string(),
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

    return await ctx.db.insert("generatedDocuments", {
      clientId: user.clientId,
      userId: user._id,
      documentType: args.documentType,
      title: args.title,
      briefing: args.briefing,
      language: args.language,
      sections: "[]",
      status: "generating",
    });
  },
});

export const updateDocumentSections = mutation({
  args: {
    documentId: v.id("generatedDocuments"),
    sections: v.string(),
    status: v.union(
      v.literal("generating"),
      v.literal("completed"),
      v.literal("failed")
    ),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.documentId);
    if (!existing) {
      throw new ConvexError({ message: "Document not found", code: "NOT_FOUND" });
    }

    const updates: Record<string, unknown> = {
      sections: args.sections,
      status: args.status,
    };
    if (args.title) {
      updates.title = args.title;
    }

    await ctx.db.patch(args.documentId, updates);
  },
});

export const toggleFavorite = mutation({
  args: { documentId: v.id("generatedDocuments") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.documentId);
    if (!existing) {
      throw new ConvexError({ message: "Document not found", code: "NOT_FOUND" });
    }
    await ctx.db.patch(args.documentId, {
      isFavorite: !existing.isFavorite,
    });
  },
});

export const deleteDocument = mutation({
  args: { documentId: v.id("generatedDocuments") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.documentId);
    if (!existing) {
      throw new ConvexError({ message: "Document not found", code: "NOT_FOUND" });
    }
    await ctx.db.delete(args.documentId);
  },
});
