import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import { internal } from "./_generated/api";

// Default opt-out keywords (English + French)
const DEFAULT_OPT_OUT_KEYWORDS = [
  "STOP",
  "UNSUBSCRIBE",
  "CANCEL",
  "QUIT",
  "END",
  "ARRET",
  "ARRETER",
  "DESINSCRIRE",
  "DESINSCRIPTION",
  "FIN",
];

const DEFAULT_OPT_IN_KEYWORDS = [
  "START",
  "SUBSCRIBE",
  "YES",
  "OUI",
  "REPRENDRE",
  "INSCRIRE",
];

// ─── Queries ────────────────────────────────────────────────

// Get compliance settings for the current client
export const getComplianceSettings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) return null;

    const effectiveClientId = user.testModeClientId || user.clientId;
    if (!effectiveClientId) return null;

    const settings = await ctx.db
      .query("complianceSettings")
      .withIndex("by_client", (q) => q.eq("clientId", effectiveClientId))
      .unique();

    // Return defaults if no settings exist yet
    if (!settings) {
      return {
        _id: null,
        clientId: effectiveClientId,
        optOutKeywords: DEFAULT_OPT_OUT_KEYWORDS,
        optInKeywords: DEFAULT_OPT_IN_KEYWORDS,
        optOutAutoReply: "You have been unsubscribed. Reply START to resubscribe.",
        optInAutoReply: "Welcome back! You have been resubscribed.",
        autoReplyEnabled: true,
        blockOptedOut: true,
        addUnsubscribeFooter: false,
        unsubscribeFooterText: "Reply STOP to unsubscribe",
      };
    }

    return settings;
  },
});

// Get opt-out log entries for the current client
export const getOptOutLog = query({
  args: {
    searchQuery: v.optional(v.string()),
    actionFilter: v.optional(v.union(v.literal("opt_out"), v.literal("opt_in"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) return [];

    const effectiveClientId = user.testModeClientId || user.clientId;
    if (!effectiveClientId) return [];

    let logs = await ctx.db
      .query("optOutLog")
      .withIndex("by_client", (q) => q.eq("clientId", effectiveClientId))
      .order("desc")
      .take(200);

    // Apply filters
    if (args.actionFilter) {
      logs = logs.filter((l) => l.action === args.actionFilter);
    }

    if (args.searchQuery) {
      const q = args.searchQuery.toLowerCase();
      logs = logs.filter((l) => l.phoneNumber.toLowerCase().includes(q));
    }

    return logs;
  },
});

// Get suppression list (all currently opted-out contacts)
export const getSuppressionList = query({
  args: {
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) return [];

    const effectiveClientId = user.testModeClientId || user.clientId;
    if (!effectiveClientId) return [];

    let contacts = await ctx.db
      .query("contacts")
      .withIndex("by_client", (q) => q.eq("clientId", effectiveClientId))
      .collect();

    // Only opted-out contacts
    contacts = contacts.filter((c) => c.isOptedOut);

    if (args.searchQuery) {
      const q = args.searchQuery.toLowerCase();
      contacts = contacts.filter(
        (c) =>
          c.phoneNumber.toLowerCase().includes(q) ||
          c.firstName?.toLowerCase().includes(q) ||
          c.lastName?.toLowerCase().includes(q)
      );
    }

    return contacts;
  },
});

// Get compliance stats
export const getComplianceStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) return null;

    const effectiveClientId = user.testModeClientId || user.clientId;
    if (!effectiveClientId) return null;

    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_client", (q) => q.eq("clientId", effectiveClientId))
      .collect();

    const logs = await ctx.db
      .query("optOutLog")
      .withIndex("by_client", (q) => q.eq("clientId", effectiveClientId))
      .order("desc")
      .take(200);

    const totalContacts = contacts.length;
    const optedOut = contacts.filter((c) => c.isOptedOut).length;
    const active = totalContacts - optedOut;

    // Recent opt-outs (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentOptOuts = logs.filter(
      (l) => l.action === "opt_out" && l._creationTime >= thirtyDaysAgo
    ).length;

    const recentOptIns = logs.filter(
      (l) => l.action === "opt_in" && l._creationTime >= thirtyDaysAgo
    ).length;

    // Opt-out rate
    const optOutRate = totalContacts > 0
      ? Math.round((optedOut / totalContacts) * 100 * 10) / 10
      : 0;

    // Blocked messages (messages that were prevented from sending)
    const blockedMessages = logs.filter(
      (l) => l.action === "opt_out" && l.source === "keyword"
    ).length;

    return {
      totalContacts,
      optedOut,
      active,
      recentOptOuts,
      recentOptIns,
      optOutRate,
      blockedMessages,
      totalLogEntries: logs.length,
    };
  },
});

// ─── Mutations ──────────────────────────────────────────────

// Save or update compliance settings
export const saveComplianceSettings = mutation({
  args: {
    optOutKeywords: v.array(v.string()),
    optInKeywords: v.array(v.string()),
    optOutAutoReply: v.optional(v.string()),
    optInAutoReply: v.optional(v.string()),
    autoReplyEnabled: v.boolean(),
    blockOptedOut: v.boolean(),
    addUnsubscribeFooter: v.boolean(),
    unsubscribeFooterText: v.optional(v.string()),
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

    if (!user) {
      throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    }

    const effectiveClientId = user.testModeClientId || user.clientId;
    if (!effectiveClientId) {
      throw new ConvexError({
        message: "No client associated",
        code: "FORBIDDEN",
      });
    }

    const existing = await ctx.db
      .query("complianceSettings")
      .withIndex("by_client", (q) => q.eq("clientId", effectiveClientId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        optOutKeywords: args.optOutKeywords,
        optInKeywords: args.optInKeywords,
        optOutAutoReply: args.optOutAutoReply,
        optInAutoReply: args.optInAutoReply,
        autoReplyEnabled: args.autoReplyEnabled,
        blockOptedOut: args.blockOptedOut,
        addUnsubscribeFooter: args.addUnsubscribeFooter,
        unsubscribeFooterText: args.unsubscribeFooterText,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("complianceSettings", {
        clientId: effectiveClientId,
        optOutKeywords: args.optOutKeywords,
        optInKeywords: args.optInKeywords,
        optOutAutoReply: args.optOutAutoReply,
        optInAutoReply: args.optInAutoReply,
        autoReplyEnabled: args.autoReplyEnabled,
        blockOptedOut: args.blockOptedOut,
        addUnsubscribeFooter: args.addUnsubscribeFooter,
        unsubscribeFooterText: args.unsubscribeFooterText,
      });
    }
  },
});

// Manually opt out a contact
export const manualOptOut = mutation({
  args: {
    phoneNumber: v.string(),
    channel: v.optional(
      v.union(
        v.literal("sms"),
        v.literal("whatsapp"),
        v.literal("telegram"),
        v.literal("facebook_messenger")
      )
    ),
    note: v.optional(v.string()),
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

    if (!user) {
      throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    }

    const effectiveClientId = user.testModeClientId || user.clientId;
    if (!effectiveClientId) {
      throw new ConvexError({
        message: "No client associated",
        code: "FORBIDDEN",
      });
    }

    // Find or create contact
    let contact = await ctx.db
      .query("contacts")
      .withIndex("by_client_and_phone", (q) =>
        q
          .eq("clientId", effectiveClientId)
          .eq("phoneNumber", args.phoneNumber)
      )
      .unique();

    if (!contact) {
      // Create contact in opted-out state
      const contactId = await ctx.db.insert("contacts", {
        clientId: effectiveClientId,
        phoneNumber: args.phoneNumber,
        tags: ["opted-out"],
        isOptedOut: true,
        optedOutAt: Date.now(),
      });
      contact = await ctx.db.get(contactId);
    } else {
      // Update existing contact
      await ctx.db.patch(contact._id, {
        isOptedOut: true,
        optedOutAt: Date.now(),
      });
    }

    // Log the opt-out event
    await ctx.db.insert("optOutLog", {
      clientId: effectiveClientId,
      contactId: contact?._id,
      phoneNumber: args.phoneNumber,
      channel: args.channel || "sms",
      action: "opt_out",
      source: "manual",
      performedBy: user._id,
      note: args.note,
    });
  },
});

// Manually opt in (re-subscribe) a contact
export const manualOptIn = mutation({
  args: {
    contactId: v.id("contacts"),
    note: v.optional(v.string()),
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

    if (!user) {
      throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    }

    const contact = await ctx.db.get(args.contactId);
    if (!contact) {
      throw new ConvexError({
        message: "Contact not found",
        code: "NOT_FOUND",
      });
    }

    if (!contact.isOptedOut) {
      throw new ConvexError({
        message: "Contact is not opted out",
        code: "BAD_REQUEST",
      });
    }

    // Re-subscribe the contact
    await ctx.db.patch(args.contactId, {
      isOptedOut: false,
      optedOutAt: undefined,
    });

    // Log the opt-in event
    await ctx.db.insert("optOutLog", {
      clientId: contact.clientId,
      contactId: args.contactId,
      phoneNumber: contact.phoneNumber,
      channel: "sms",
      action: "opt_in",
      source: "manual",
      performedBy: user._id,
      note: args.note,
    });
  },
});

// ─── Internal: Process opt-out keywords from incoming messages ──

export const processOptOutKeyword = internalMutation({
  args: {
    incomingMessageId: v.id("incomingMessages"),
  },
  handler: async (ctx, args) => {
    const incomingMessage = await ctx.db.get(args.incomingMessageId);
    if (!incomingMessage) return;

    const clientId = incomingMessage.clientId;
    const messageText = incomingMessage.message.trim().toUpperCase();
    const channel = incomingMessage.channel || "sms";

    // Get compliance settings (or use defaults)
    const settings = await ctx.db
      .query("complianceSettings")
      .withIndex("by_client", (q) => q.eq("clientId", clientId))
      .unique();

    const optOutKeywords = settings?.optOutKeywords ?? DEFAULT_OPT_OUT_KEYWORDS;
    const optInKeywords = settings?.optInKeywords ?? DEFAULT_OPT_IN_KEYWORDS;

    const isOptOut = optOutKeywords.some(
      (kw) => messageText === kw.toUpperCase()
    );
    const isOptIn = optInKeywords.some(
      (kw) => messageText === kw.toUpperCase()
    );

    if (!isOptOut && !isOptIn) return;

    // Find or create the contact
    let contact = await ctx.db
      .query("contacts")
      .withIndex("by_client_and_phone", (q) =>
        q.eq("clientId", clientId).eq("phoneNumber", incomingMessage.from)
      )
      .unique();

    if (isOptOut) {
      if (!contact) {
        const contactId = await ctx.db.insert("contacts", {
          clientId,
          phoneNumber: incomingMessage.from,
          tags: ["opted-out"],
          isOptedOut: true,
          optedOutAt: Date.now(),
        });
        contact = await ctx.db.get(contactId);
      } else if (!contact.isOptedOut) {
        await ctx.db.patch(contact._id, {
          isOptedOut: true,
          optedOutAt: Date.now(),
        });
      }

      // Log opt-out
      await ctx.db.insert("optOutLog", {
        clientId,
        contactId: contact?._id,
        phoneNumber: incomingMessage.from,
        channel,
        action: "opt_out",
        source: "keyword",
        keyword: messageText,
        incomingMessageId: args.incomingMessageId,
      });

      // Send auto-reply if enabled
      if (settings?.autoReplyEnabled !== false && settings?.optOutAutoReply) {
        await sendComplianceReply(ctx, clientId, incomingMessage.from, incomingMessage.to, channel, settings.optOutAutoReply);
      } else if (!settings) {
        // Default auto-reply when no settings exist
        await sendComplianceReply(ctx, clientId, incomingMessage.from, incomingMessage.to, channel, "You have been unsubscribed. Reply START to resubscribe.");
      }
    }

    if (isOptIn) {
      if (!contact) {
        // Create as active contact
        const contactId = await ctx.db.insert("contacts", {
          clientId,
          phoneNumber: incomingMessage.from,
          tags: [],
          isOptedOut: false,
        });
        contact = await ctx.db.get(contactId);
      } else if (contact.isOptedOut) {
        await ctx.db.patch(contact._id, {
          isOptedOut: false,
          optedOutAt: undefined,
        });
      }

      // Log opt-in
      await ctx.db.insert("optOutLog", {
        clientId,
        contactId: contact?._id,
        phoneNumber: incomingMessage.from,
        channel,
        action: "opt_in",
        source: "keyword",
        keyword: messageText,
        incomingMessageId: args.incomingMessageId,
      });

      // Send auto-reply if enabled
      if (settings?.autoReplyEnabled !== false && settings?.optInAutoReply) {
        await sendComplianceReply(ctx, clientId, incomingMessage.from, incomingMessage.to, channel, settings.optInAutoReply);
      } else if (!settings) {
        await sendComplianceReply(ctx, clientId, incomingMessage.from, incomingMessage.to, channel, "Welcome back! You have been resubscribed.");
      }
    }
  },
});

// Helper: send an auto-reply compliance message
async function sendComplianceReply(
  ctx: {
    db: {
      get: (id: Id<"clients">) => ReturnType<typeof Object.create>;
      insert: (table: "messages", doc: {
        clientId: Id<"clients">;
        to: string;
        from: string;
        message: string;
        channel: "sms" | "whatsapp" | "telegram" | "facebook_messenger";
        status: "pending";
        type: "single";
        providerId: Id<"smsProviders">;
        creditsUsed: number;
      }) => Promise<Id<"messages">>;
    };
    scheduler: {
      runAfter: (ms: number, ref: typeof internal.sms.send.sendSingleMessage, args: { messageId: Id<"messages"> }) => Promise<void>;
    };
  },
  clientId: Id<"clients">,
  recipientPhone: string,
  senderNumber: string,
  channel: "sms" | "whatsapp" | "telegram" | "facebook_messenger",
  replyText: string
) {
  const client = await ctx.db.get(clientId);
  if (!client) return;

  let providerId: Id<"smsProviders"> = client.smsProviderId;
  if (channel === "whatsapp" && client.whatsappProviderId) {
    providerId = client.whatsappProviderId;
  } else if (channel === "telegram" && client.telegramProviderId) {
    providerId = client.telegramProviderId;
  } else if (channel === "facebook_messenger" && client.facebookMessengerProviderId) {
    providerId = client.facebookMessengerProviderId;
  }

  const messageId = await ctx.db.insert("messages", {
    clientId,
    to: recipientPhone,
    from: senderNumber,
    message: replyText,
    channel,
    status: "pending",
    type: "single",
    providerId,
    creditsUsed: 0,
  });

  await ctx.scheduler.runAfter(0, internal.sms.send.sendSingleMessage, {
    messageId,
  });
}

// Internal query: check if a phone number is opted out for a client
export const isPhoneOptedOut = query({
  args: {
    clientId: v.id("clients"),
    phoneNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_client_and_phone", (q) =>
        q.eq("clientId", args.clientId).eq("phoneNumber", args.phoneNumber)
      )
      .unique();

    return contact?.isOptedOut ?? false;
  },
});
