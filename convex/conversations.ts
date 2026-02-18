import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

// ─── Channel validator ──────────────────────────────────────────────────────

const channelValidator = v.union(
  v.literal("sms"),
  v.literal("whatsapp"),
  v.literal("telegram"),
  v.literal("facebook_messenger")
);

type Channel = "sms" | "whatsapp" | "telegram" | "facebook_messenger";

// ─── Queries ────────────────────────────────────────────────────────────────

export const listConversations = query({
  args: {
    clientId: v.id("clients"),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    channel: v.optional(channelValidator),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }

    let conversations = await ctx.db
      .query("conversations")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();

    // Filter by status (default: active)
    const statusFilter = args.status ?? "active";
    conversations = conversations.filter((c) => c.status === statusFilter);

    // Filter by channel
    if (args.channel) {
      conversations = conversations.filter((c) => c.channel === args.channel);
    }

    // Search by phone or contact name
    if (args.search) {
      const search = args.search.toLowerCase();
      conversations = conversations.filter(
        (c) =>
          c.contactPhone.toLowerCase().includes(search) ||
          (c.contactName && c.contactName.toLowerCase().includes(search))
      );
    }

    // Sort by lastMessageAt descending
    conversations.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));

    return conversations;
  },
});

export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    return await ctx.db.get(args.conversationId);
  },
});

/**
 * Get all messages for a conversation by merging outgoing + incoming,
 * sorted chronologically. Uses conversation indexes when available,
 * falls back to phone+channel matching for older messages.
 */
export const getConversationMessages = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new ConvexError({ message: "Conversation not found", code: "NOT_FOUND" });
    }

    const maxItems = args.limit ?? 100;

    // Fetch outgoing messages — try index first, then fall back to client scan
    let outgoing = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    // Also get messages that match by phone but don't have conversationId yet
    if (outgoing.length === 0) {
      const clientMessages = await ctx.db
        .query("messages")
        .withIndex("by_client", (q) => q.eq("clientId", conversation.clientId))
        .collect();
      outgoing = clientMessages.filter(
        (m) =>
          m.to === conversation.contactPhone &&
          (m.channel ?? "sms") === conversation.channel &&
          m.type === "single"
      );
    }

    // Fetch incoming messages
    let incoming = await ctx.db
      .query("incomingMessages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    if (incoming.length === 0) {
      const clientIncoming = await ctx.db
        .query("incomingMessages")
        .withIndex("by_client", (q) => q.eq("clientId", conversation.clientId))
        .collect();
      incoming = clientIncoming.filter(
        (m) =>
          m.from === conversation.contactPhone &&
          (m.channel ?? "sms") === conversation.channel
      );
    }

    // Merge into a unified timeline
    type ThreadMessage = {
      _id: string;
      direction: "inbound" | "outbound";
      text: string;
      timestamp: number;
      status?: string;
      channel: string;
    };

    const thread: ThreadMessage[] = [];

    for (const m of outgoing) {
      thread.push({
        _id: m._id,
        direction: "outbound",
        text: m.message,
        timestamp: m._creationTime,
        status: m.status,
        channel: m.channel ?? "sms",
      });
    }

    for (const m of incoming) {
      thread.push({
        _id: m._id,
        direction: "inbound",
        text: m.message,
        timestamp: m.receivedAt,
        channel: m.channel ?? "sms",
      });
    }

    // Sort oldest → newest, take last N
    thread.sort((a, b) => a.timestamp - b.timestamp);

    return thread.slice(-maxItems);
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────

export const markAsRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    await ctx.db.patch(args.conversationId, { unreadCount: 0 });
  },
});

export const archiveConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    await ctx.db.patch(args.conversationId, { status: "archived" });
  },
});

export const unarchiveConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }
    await ctx.db.patch(args.conversationId, { status: "active" });
  },
});

// ─── Internal helpers: find or create conversation ─────────────────────────

/**
 * Called by message send/receive flows to ensure a conversation exists
 * and update its metadata.
 */
export const upsertConversation = internalMutation({
  args: {
    clientId: v.id("clients"),
    contactPhone: v.string(),
    channel: channelValidator,
    messageText: v.string(),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    messageId: v.optional(v.id("messages")),
    incomingMessageId: v.optional(v.id("incomingMessages")),
  },
  handler: async (ctx, args): Promise<Id<"conversations">> => {
    // Find existing conversation
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_client_and_phone", (q) =>
        q.eq("clientId", args.clientId).eq("contactPhone", args.contactPhone)
      )
      .collect();

    const match = existing.find((c) => c.channel === args.channel);
    const now = new Date().toISOString();

    if (match) {
      // Update existing conversation
      const patch: Record<string, unknown> = {
        lastMessageText: args.messageText.slice(0, 200),
        lastMessageAt: now,
        lastMessageDirection: args.direction,
      };

      if (args.direction === "inbound") {
        patch.unreadCount = match.unreadCount + 1;
      }

      // Reactivate if archived
      if (match.status === "archived") {
        patch.status = "active";
      }

      await ctx.db.patch(match._id, patch);

      // Link the message to the conversation
      if (args.messageId) {
        await ctx.db.patch(args.messageId, { conversationId: match._id });
      }
      if (args.incomingMessageId) {
        await ctx.db.patch(args.incomingMessageId, { conversationId: match._id });
      }

      return match._id;
    }

    // Try to find a matching contact
    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_client_and_phone", (q) =>
        q.eq("clientId", args.clientId).eq("phoneNumber", args.contactPhone)
      )
      .unique();

    const contactName = contact
      ? [contact.firstName, contact.lastName].filter(Boolean).join(" ") || undefined
      : undefined;

    // Create new conversation
    const conversationId = await ctx.db.insert("conversations", {
      clientId: args.clientId,
      contactPhone: args.contactPhone,
      channel: args.channel as Channel,
      contactId: contact?._id,
      contactName,
      lastMessageText: args.messageText.slice(0, 200),
      lastMessageAt: now,
      lastMessageDirection: args.direction,
      unreadCount: args.direction === "inbound" ? 1 : 0,
      status: "active",
    });

    // Link the message
    if (args.messageId) {
      await ctx.db.patch(args.messageId, { conversationId });
    }
    if (args.incomingMessageId) {
      await ctx.db.patch(args.incomingMessageId, { conversationId });
    }

    return conversationId;
  },
});

// ─── Unread count (total across all conversations) ─────────────────────────

export const getTotalUnread = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    }

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .collect();

    return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  },
});

// ─── Admin trigger: build conversations from existing history ──────────────

export const triggerBuildHistory = mutation({
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

    if (!user || user.role !== "admin") {
      throw new ConvexError({ message: "Admin only", code: "FORBIDDEN" });
    }

    await ctx.scheduler.runAfter(0, internal.conversations.buildFromOutgoing, { skip: 0 });
    await ctx.scheduler.runAfter(0, internal.conversations.buildFromIncoming, { skip: 0 });
  },
});

/**
 * Process outgoing messages in batches to build conversation records.
 */
export const buildFromOutgoing = internalMutation({
  args: { skip: v.number() },
  handler: async (ctx, args) => {
    const batch = await ctx.db.query("messages").order("asc").take(args.skip + 200);
    const messages = batch.slice(args.skip);

    if (messages.length === 0) return;

    for (const msg of messages) {
      if (msg.conversationId) continue;
      if (msg.type !== "single") continue;

      const channel = (msg.channel ?? "sms") as Channel;

      const existing = await ctx.db
        .query("conversations")
        .withIndex("by_client_and_phone", (q) =>
          q.eq("clientId", msg.clientId).eq("contactPhone", msg.to)
        )
        .collect();

      const match = existing.find((c) => c.channel === channel);

      if (match) {
        await ctx.db.patch(msg._id, { conversationId: match._id });
        const msgTime = new Date(msg._creationTime).toISOString();
        if (msgTime > match.lastMessageAt) {
          await ctx.db.patch(match._id, {
            lastMessageText: msg.message.slice(0, 200),
            lastMessageAt: msgTime,
            lastMessageDirection: "outbound",
          });
        }
      } else {
        const contact = await ctx.db
          .query("contacts")
          .withIndex("by_client_and_phone", (q) =>
            q.eq("clientId", msg.clientId).eq("phoneNumber", msg.to)
          )
          .unique();

        const contactName = contact
          ? [contact.firstName, contact.lastName].filter(Boolean).join(" ") || undefined
          : undefined;

        const convId = await ctx.db.insert("conversations", {
          clientId: msg.clientId,
          contactPhone: msg.to,
          channel,
          contactId: contact?._id,
          contactName,
          lastMessageText: msg.message.slice(0, 200),
          lastMessageAt: new Date(msg._creationTime).toISOString(),
          lastMessageDirection: "outbound",
          unreadCount: 0,
          status: "active",
        });
        await ctx.db.patch(msg._id, { conversationId: convId });
      }
    }

    // Self-schedule if there might be more
    if (messages.length === 200) {
      await ctx.scheduler.runAfter(100, internal.conversations.buildFromOutgoing, {
        skip: args.skip + 200,
      });
    }
  },
});

/**
 * Process incoming messages in batches to link to conversations.
 */
export const buildFromIncoming = internalMutation({
  args: { skip: v.number() },
  handler: async (ctx, args) => {
    const batch = await ctx.db.query("incomingMessages").order("asc").take(args.skip + 200);
    const messages = batch.slice(args.skip);

    if (messages.length === 0) return;

    for (const msg of messages) {
      if (msg.conversationId) continue;

      const channel = (msg.channel ?? "sms") as Channel;

      const existing = await ctx.db
        .query("conversations")
        .withIndex("by_client_and_phone", (q) =>
          q.eq("clientId", msg.clientId).eq("contactPhone", msg.from)
        )
        .collect();

      const match = existing.find((c) => c.channel === channel);

      if (match) {
        await ctx.db.patch(msg._id, { conversationId: match._id });
        const msgTime = new Date(msg.receivedAt).toISOString();
        if (msgTime > match.lastMessageAt) {
          await ctx.db.patch(match._id, {
            lastMessageText: msg.message.slice(0, 200),
            lastMessageAt: msgTime,
            lastMessageDirection: "inbound",
          });
        }
      } else {
        const contact = await ctx.db
          .query("contacts")
          .withIndex("by_client_and_phone", (q) =>
            q.eq("clientId", msg.clientId).eq("phoneNumber", msg.from)
          )
          .unique();

        const contactName = contact
          ? [contact.firstName, contact.lastName].filter(Boolean).join(" ") || undefined
          : undefined;

        const convId = await ctx.db.insert("conversations", {
          clientId: msg.clientId,
          contactPhone: msg.from,
          channel,
          contactId: contact?._id,
          contactName,
          lastMessageText: msg.message.slice(0, 200),
          lastMessageAt: new Date(msg.receivedAt).toISOString(),
          lastMessageDirection: "inbound",
          unreadCount: 0,
          status: "active",
        });
        await ctx.db.patch(msg._id, { conversationId: convId });
      }
    }

    if (messages.length === 200) {
      await ctx.scheduler.runAfter(100, internal.conversations.buildFromIncoming, {
        skip: args.skip + 200,
      });
    }
  },
});
