import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

// ─── Queries ────────────────────────────────────────────────────────────────

export const listByClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    return await ctx.db
      .query("aiAssistants")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();
  },
});

export const getById = query({
  args: { assistantId: v.id("aiAssistants") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    return await ctx.db.get(args.assistantId);
  },
});

export const getKnowledgeBase = query({
  args: { assistantId: v.id("aiAssistants") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    return await ctx.db
      .query("aiKnowledgeBase")
      .withIndex("by_assistant", (q) => q.eq("assistantId", args.assistantId))
      .collect();
  },
});

export const getChatSessions = query({
  args: { assistantId: v.id("aiAssistants") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    return await ctx.db
      .query("aiChatSessions")
      .withIndex("by_assistant", (q) => q.eq("assistantId", args.assistantId))
      .order("desc")
      .take(50);
  },
});

export const getChatMessages = query({
  args: { sessionId: v.id("aiChatSessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    return await ctx.db
      .query("aiChatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

// Public query: get assistant by ID without auth (for widget/API usage)
export const getPublicAssistant = query({
  args: { assistantId: v.id("aiAssistants") },
  handler: async (ctx, args) => {
    const assistant = await ctx.db.get(args.assistantId);
    if (!assistant || !assistant.isActive) return null;
    // Return only public-safe fields
    return {
      _id: assistant._id,
      name: assistant.name,
      companyName: assistant.companyName,
      welcomeMessage: assistant.welcomeMessage,
      personality: assistant.personality,
      primaryColor: assistant.primaryColor,
      logoUrl: assistant.logoUrl,
    };
  },
});

// Public query: get chat messages by session string ID
export const getPublicChatMessages = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("aiChatSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (!session) return [];
    return await ctx.db
      .query("aiChatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    clientId: v.id("clients"),
    name: v.string(),
    description: v.optional(v.string()),
    companyName: v.string(),
    companyDescription: v.optional(v.string()),
    industry: v.optional(v.string()),
    welcomeMessage: v.optional(v.string()),
    personality: v.union(
      v.literal("professional"),
      v.literal("friendly"),
      v.literal("casual"),
      v.literal("formal")
    ),
    primaryColor: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    customInstructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    return await ctx.db.insert("aiAssistants", {
      ...args,
      isActive: true,
      totalConversations: 0,
      totalMessages: 0,
    });
  },
});

export const update = mutation({
  args: {
    assistantId: v.id("aiAssistants"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    companyName: v.optional(v.string()),
    companyDescription: v.optional(v.string()),
    industry: v.optional(v.string()),
    welcomeMessage: v.optional(v.string()),
    personality: v.optional(v.union(
      v.literal("professional"),
      v.literal("friendly"),
      v.literal("casual"),
      v.literal("formal")
    )),
    primaryColor: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    customInstructions: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    const { assistantId, ...updates } = args;
    // Remove undefined fields
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    await ctx.db.patch(assistantId, cleanUpdates);
  },
});

export const remove = mutation({
  args: { assistantId: v.id("aiAssistants") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    // Delete knowledge base entries
    const entries = await ctx.db
      .query("aiKnowledgeBase")
      .withIndex("by_assistant", (q) => q.eq("assistantId", args.assistantId))
      .collect();
    for (const entry of entries) {
      await ctx.db.delete(entry._id);
    }
    // Delete chat sessions and messages
    const sessions = await ctx.db
      .query("aiChatSessions")
      .withIndex("by_assistant", (q) => q.eq("assistantId", args.assistantId))
      .collect();
    for (const session of sessions) {
      const messages = await ctx.db
        .query("aiChatMessages")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }
      await ctx.db.delete(session._id);
    }
    await ctx.db.delete(args.assistantId);
  },
});

// ─── Knowledge Base ─────────────────────────────────────────────────────────

export const addKnowledge = mutation({
  args: {
    assistantId: v.id("aiAssistants"),
    clientId: v.id("clients"),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    return await ctx.db.insert("aiKnowledgeBase", {
      ...args,
      isActive: true,
    });
  },
});

export const updateKnowledge = mutation({
  args: {
    entryId: v.id("aiKnowledgeBase"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    const { entryId, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    await ctx.db.patch(entryId, cleanUpdates);
  },
});

export const removeKnowledge = mutation({
  args: { entryId: v.id("aiKnowledgeBase") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    await ctx.db.delete(args.entryId);
  },
});

// ─── Chat Session Management (used by HTTP actions) ─────────────────────────

export const createChatSession = mutation({
  args: {
    assistantId: v.id("aiAssistants"),
    sessionId: v.string(),
    channel: v.union(
      v.literal("web"),
      v.literal("sms"),
      v.literal("whatsapp"),
      v.literal("api")
    ),
    visitorName: v.optional(v.string()),
    visitorEmail: v.optional(v.string()),
    visitorPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiChatSessions", {
      ...args,
      status: "active",
      messageCount: 0,
    });
  },
});

export const addChatMessage = internalMutation({
  args: {
    sessionId: v.id("aiChatSessions"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiChatMessages", {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
    });
    // Update session counters
    const session = await ctx.db.get(args.sessionId);
    if (session) {
      await ctx.db.patch(args.sessionId, {
        messageCount: session.messageCount + 1,
        lastMessageAt: new Date().toISOString(),
      });
      // Update assistant counters
      const assistant = await ctx.db.get(session.assistantId);
      if (assistant && args.role === "user") {
        await ctx.db.patch(session.assistantId, {
          totalMessages: assistant.totalMessages + 1,
        });
      }
    }
  },
});

export const incrementConversationCount = internalMutation({
  args: { assistantId: v.id("aiAssistants") },
  handler: async (ctx, args) => {
    const assistant = await ctx.db.get(args.assistantId);
    if (assistant) {
      await ctx.db.patch(args.assistantId, {
        totalConversations: assistant.totalConversations + 1,
      });
    }
  },
});

// Get session by public session ID (internal)
export const getSessionByPublicId = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiChatSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();
  },
});

export const closeChatSession = mutation({
  args: { sessionId: v.id("aiChatSessions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    await ctx.db.patch(args.sessionId, { status: "closed" });
  },
});
