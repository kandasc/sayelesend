import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { ConvexError } from "convex/values";

// ─── Validators ─────────────────────────────────────────────────────────────

const personalityValidator = v.union(
  v.literal("professional"),
  v.literal("friendly"),
  v.literal("casual"),
  v.literal("formal")
);

const channelValidator = v.union(
  v.literal("web"),
  v.literal("sms"),
  v.literal("whatsapp"),
  v.literal("api")
);

const sourceTypeValidator = v.union(
  v.literal("manual"),
  v.literal("api"),
  v.literal("document"),
  v.literal("website")
);

const httpMethodValidator = v.union(
  v.literal("GET"),
  v.literal("POST"),
  v.literal("PUT"),
  v.literal("DELETE")
);

const taskParamValidator = v.object({
  name: v.string(),
  description: v.string(),
  type: v.union(v.literal("string"), v.literal("number"), v.literal("boolean")),
  required: v.boolean(),
});

// ─── Helpers ───────────────────────────────────────────────────────────────

// (access checks are inlined in each handler for type safety)

// ─── Assistant Queries ──────────────────────────────────────────────────────

// Query for the current user's assistants (works for both admin and client)
export const listMyAssistants = query({
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
    if (!user) {
      throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    }
    // Superadmins (admin without clientId) see all; client admins and clients see only their own
    if (user.role === "admin" && !user.clientId) {
      return await ctx.db.query("aiAssistants").collect();
    }
    if (user.clientId) {
      return await ctx.db
        .query("aiAssistants")
        .withIndex("by_client", (q) => q.eq("clientId", user.clientId!))
        .collect();
    }
    return [];
  },
});

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

export const getTasks = query({
  args: { assistantId: v.id("aiAssistants") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    return await ctx.db
      .query("aiAssistantTasks")
      .withIndex("by_assistant", (q) => q.eq("assistantId", args.assistantId))
      .collect();
  },
});

export const getTaskExecutionLogs = query({
  args: { assistantId: v.id("aiAssistants") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    return await ctx.db
      .query("aiTaskExecutionLogs")
      .withIndex("by_assistant", (q) => q.eq("assistantId", args.assistantId))
      .order("desc")
      .take(50);
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

// ─── Admin Queries ─────────────────────────────────────────────────────────

export const listAll = query({
  args: { clientId: v.optional(v.id("clients")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || user.role !== "admin") {
      throw new ConvexError({ message: "Admin access required", code: "FORBIDDEN" });
    }
    if (args.clientId) {
      return await ctx.db
        .query("aiAssistants")
        .withIndex("by_client", (q) => q.eq("clientId", args.clientId!))
        .collect();
    }
    return await ctx.db.query("aiAssistants").collect();
  },
});

// ─── Internal Queries (no auth, for HTTP API / internal use) ───────────────

export const getByIdInternal = internalQuery({
  args: { assistantId: v.id("aiAssistants") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.assistantId);
  },
});

export const getKnowledgeBaseInternal = internalQuery({
  args: { assistantId: v.id("aiAssistants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiKnowledgeBase")
      .withIndex("by_assistant", (q) => q.eq("assistantId", args.assistantId))
      .collect();
  },
});

export const getChatMessagesInternal = internalQuery({
  args: { sessionId: v.id("aiChatSessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiChatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const getActiveTasksInternalQuery = internalQuery({
  args: { assistantId: v.id("aiAssistants") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("aiAssistantTasks")
      .withIndex("by_assistant", (q) => q.eq("assistantId", args.assistantId))
      .collect();
    return tasks.filter((t) => t.isActive);
  },
});

export const getSessionByPublicIdInternal = internalQuery({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiChatSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();
  },
});

export const createChatSessionInternal = internalMutation({
  args: {
    assistantId: v.id("aiAssistants"),
    sessionId: v.string(),
    channel: channelValidator,
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

// ─── Public Queries (no auth, for widget/API) ───────────────────────────────

export const getPublicAssistant = query({
  args: { assistantId: v.id("aiAssistants") },
  handler: async (ctx, args) => {
    const assistant = await ctx.db.get(args.assistantId);
    if (!assistant || !assistant.isActive) return null;
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

export const getSessionByPublicId = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiChatSessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();
  },
});

// Internal query: get active tasks for an assistant (used by chat action)
export const getActiveTasksInternal = query({
  args: { assistantId: v.id("aiAssistants") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("aiAssistantTasks")
      .withIndex("by_assistant", (q) => q.eq("assistantId", args.assistantId))
      .collect();
    return tasks.filter((t) => t.isActive);
  },
});

// ─── Assistant Mutations ────────────────────────────────────────────────────

export const create = mutation({
  args: {
    clientId: v.id("clients"),
    name: v.string(),
    description: v.optional(v.string()),
    companyName: v.string(),
    companyDescription: v.optional(v.string()),
    industry: v.optional(v.string()),
    welcomeMessage: v.optional(v.string()),
    personality: personalityValidator,
    primaryColor: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    customInstructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    // Admin only
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || user.role !== "admin") {
      throw new ConvexError({ message: "Admin access required", code: "FORBIDDEN" });
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
    personality: v.optional(personalityValidator),
    primaryColor: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    customInstructions: v.optional(v.string()),
    handoverEmail: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
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
    if (!user) {
      throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    }
    // Check access: admin can update any, client can update own
    const assistant = await ctx.db.get(args.assistantId);
    if (!assistant) {
      throw new ConvexError({ message: "Assistant not found", code: "NOT_FOUND" });
    }
    const isAdmin = user.role === "admin";
    const isOwnerClient = user.role === "client" && user.clientId === assistant.clientId;
    if (!isAdmin && !isOwnerClient) {
      throw new ConvexError({ message: "Access denied", code: "FORBIDDEN" });
    }
    const { assistantId, ...updates } = args;
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
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || user.role !== "admin") {
      throw new ConvexError({ message: "Admin access required", code: "FORBIDDEN" });
    }
    // Delete knowledge base entries
    const entries = await ctx.db
      .query("aiKnowledgeBase")
      .withIndex("by_assistant", (q) => q.eq("assistantId", args.assistantId))
      .collect();
    for (const entry of entries) {
      await ctx.db.delete(entry._id);
    }
    // Delete tasks
    const tasks = await ctx.db
      .query("aiAssistantTasks")
      .withIndex("by_assistant", (q) => q.eq("assistantId", args.assistantId))
      .collect();
    for (const task of tasks) {
      await ctx.db.delete(task._id);
    }
    // Delete task execution logs
    const logs = await ctx.db
      .query("aiTaskExecutionLogs")
      .withIndex("by_assistant", (q) => q.eq("assistantId", args.assistantId))
      .collect();
    for (const log of logs) {
      await ctx.db.delete(log._id);
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

// ─── Knowledge Base Mutations ───────────────────────────────────────────────

export const addKnowledge = mutation({
  args: {
    assistantId: v.id("aiAssistants"),
    clientId: v.id("clients"),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    sourceType: sourceTypeValidator,
    sourceUrl: v.optional(v.string()),
    sourceHeaders: v.optional(v.string()),
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
    if (!user) {
      throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    }
    const isAdmin = user.role === "admin";
    const isOwnerClient = user.role === "client" && user.clientId === args.clientId;
    if (!isAdmin && !isOwnerClient) {
      throw new ConvexError({ message: "Access denied", code: "FORBIDDEN" });
    }
    return await ctx.db.insert("aiKnowledgeBase", {
      ...args,
      isActive: true,
      lastSyncedAt: args.sourceType !== "manual" ? new Date().toISOString() : undefined,
    });
  },
});

export const updateKnowledge = mutation({
  args: {
    entryId: v.id("aiKnowledgeBase"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    sourceHeaders: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    lastSyncedAt: v.optional(v.string()),
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

// ─── Task Mutations ─────────────────────────────────────────────────────────

export const createTask = mutation({
  args: {
    assistantId: v.id("aiAssistants"),
    clientId: v.id("clients"),
    name: v.string(),
    description: v.string(),
    apiEndpoint: v.string(),
    httpMethod: httpMethodValidator,
    headers: v.optional(v.string()),
    bodyTemplate: v.optional(v.string()),
    parameters: v.array(taskParamValidator),
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
    if (!user) {
      throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    }
    const isAdmin = user.role === "admin";
    const isOwnerClient = user.role === "client" && user.clientId === args.clientId;
    if (!isAdmin && !isOwnerClient) {
      throw new ConvexError({ message: "Access denied", code: "FORBIDDEN" });
    }
    return await ctx.db.insert("aiAssistantTasks", {
      ...args,
      isActive: true,
      executionCount: 0,
    });
  },
});

export const updateTask = mutation({
  args: {
    taskId: v.id("aiAssistantTasks"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    apiEndpoint: v.optional(v.string()),
    httpMethod: v.optional(httpMethodValidator),
    headers: v.optional(v.string()),
    bodyTemplate: v.optional(v.string()),
    parameters: v.optional(v.array(taskParamValidator)),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    const { taskId, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    await ctx.db.patch(taskId, cleanUpdates);
  },
});

export const removeTask = mutation({
  args: { taskId: v.id("aiAssistantTasks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    // Delete execution logs
    const logs = await ctx.db
      .query("aiTaskExecutionLogs")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }
    await ctx.db.delete(args.taskId);
  },
});

// ─── Chat Session Management ────────────────────────────────────────────────

export const createChatSession = mutation({
  args: {
    assistantId: v.id("aiAssistants"),
    sessionId: v.string(),
    channel: channelValidator,
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
    const session = await ctx.db.get(args.sessionId);
    if (session) {
      await ctx.db.patch(args.sessionId, {
        messageCount: session.messageCount + 1,
        lastMessageAt: new Date().toISOString(),
      });
      if (args.role === "user") {
        const assistant = await ctx.db.get(session.assistantId);
        if (assistant) {
          await ctx.db.patch(session.assistantId, {
            totalMessages: assistant.totalMessages + 1,
          });
        }
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

export const logTaskExecution = internalMutation({
  args: {
    taskId: v.id("aiAssistantTasks"),
    sessionId: v.id("aiChatSessions"),
    assistantId: v.id("aiAssistants"),
    parameters: v.string(),
    responseStatus: v.number(),
    responseBody: v.optional(v.string()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiTaskExecutionLogs", {
      ...args,
      executedAt: new Date().toISOString(),
    });
    // Update task execution count
    const task = await ctx.db.get(args.taskId);
    if (task) {
      await ctx.db.patch(args.taskId, {
        executionCount: task.executionCount + 1,
        lastExecutedAt: new Date().toISOString(),
      });
    }
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

// ─── Handover Queries and Mutations ────────────────────────────────────────

export const getHandoverRequests = query({
  args: { assistantId: v.id("aiAssistants") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    return await ctx.db
      .query("aiHandoverRequests")
      .withIndex("by_assistant", (q) => q.eq("assistantId", args.assistantId))
      .order("desc")
      .take(50);
  },
});

export const createHandoverRequest = internalMutation({
  args: {
    sessionId: v.id("aiChatSessions"),
    assistantId: v.id("aiAssistants"),
    clientId: v.id("clients"),
    reason: v.optional(v.string()),
    summary: v.string(),
    visitorName: v.optional(v.string()),
    visitorEmail: v.optional(v.string()),
    visitorPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Mark session as handed over
    await ctx.db.patch(args.sessionId, { status: "handed_over" });

    // Create handover request
    return await ctx.db.insert("aiHandoverRequests", {
      ...args,
      status: "pending",
    });
  },
});

export const markHandoverEmailSent = internalMutation({
  args: {
    handoverId: v.id("aiHandoverRequests"),
    emailSentTo: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.handoverId, {
      emailSentTo: args.emailSentTo,
      emailSentAt: new Date().toISOString(),
      status: "email_sent",
    });
  },
});

export const resolveHandover = mutation({
  args: { handoverId: v.id("aiHandoverRequests") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) {
      throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    }
    await ctx.db.patch(args.handoverId, {
      status: "resolved",
      resolvedAt: new Date().toISOString(),
      resolvedBy: user._id,
    });
  },
});
