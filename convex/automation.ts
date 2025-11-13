import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import { internal } from "./_generated/api";

// List automation rules
export const listAutomationRules = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return [];
    }

    const effectiveClientId = user.testModeClientId || user.clientId;
    if (!effectiveClientId) {
      return [];
    }

    return await ctx.db
      .query("automationRules")
      .withIndex("by_client", (q) => q.eq("clientId", effectiveClientId))
      .order("desc")
      .collect();
  },
});

// Get single automation rule
export const getAutomationRule = query({
  args: { ruleId: v.id("automationRules") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const rule = await ctx.db.get(args.ruleId);
    if (!rule) {
      throw new ConvexError({
        message: "Rule not found",
        code: "NOT_FOUND",
      });
    }

    return rule;
  },
});

// Create automation rule
export const createAutomationRule = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    triggerType: v.union(
      v.literal("keyword"),
      v.literal("any_message"),
      v.literal("first_message"),
      v.literal("time_based")
    ),
    keywords: v.optional(v.array(v.string())),
    matchType: v.optional(v.union(
      v.literal("exact"),
      v.literal("contains"),
      v.literal("starts_with"),
      v.literal("ends_with")
    )),
    channel: v.optional(v.union(
      v.literal("sms"),
      v.literal("whatsapp"),
      v.literal("telegram"),
      v.literal("facebook_messenger")
    )),
    actionType: v.union(
      v.literal("send_reply"),
      v.literal("forward_to_human"),
      v.literal("add_to_group"),
      v.literal("tag_contact")
    ),
    replyMessage: v.optional(v.string()),
    replyTemplateId: v.optional(v.id("templates")),
    forwardToNumbers: v.optional(v.array(v.string())),
    addToGroupId: v.optional(v.id("contactGroups")),
    addTags: v.optional(v.array(v.string())),
    activeHoursStart: v.optional(v.string()),
    activeHoursEnd: v.optional(v.string()),
    activeDays: v.optional(v.array(v.number())),
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
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    const effectiveClientId = user.testModeClientId || user.clientId;
    if (!effectiveClientId) {
      throw new ConvexError({
        message: "Client not assigned",
        code: "FORBIDDEN",
      });
    }

    const ruleId = await ctx.db.insert("automationRules", {
      clientId: effectiveClientId,
      name: args.name,
      description: args.description,
      isActive: true,
      triggerType: args.triggerType,
      keywords: args.keywords,
      matchType: args.matchType || "contains",
      channel: args.channel,
      actionType: args.actionType,
      replyMessage: args.replyMessage,
      replyTemplateId: args.replyTemplateId,
      forwardToNumbers: args.forwardToNumbers,
      addToGroupId: args.addToGroupId,
      addTags: args.addTags,
      activeHoursStart: args.activeHoursStart,
      activeHoursEnd: args.activeHoursEnd,
      activeDays: args.activeDays,
      triggerCount: 0,
    });

    return ruleId;
  },
});

// Update automation rule
export const updateAutomationRule = mutation({
  args: {
    ruleId: v.id("automationRules"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    triggerType: v.optional(v.union(
      v.literal("keyword"),
      v.literal("any_message"),
      v.literal("first_message"),
      v.literal("time_based")
    )),
    keywords: v.optional(v.array(v.string())),
    matchType: v.optional(v.union(
      v.literal("exact"),
      v.literal("contains"),
      v.literal("starts_with"),
      v.literal("ends_with")
    )),
    channel: v.optional(v.union(
      v.literal("sms"),
      v.literal("whatsapp"),
      v.literal("telegram"),
      v.literal("facebook_messenger")
    )),
    actionType: v.optional(v.union(
      v.literal("send_reply"),
      v.literal("forward_to_human"),
      v.literal("add_to_group"),
      v.literal("tag_contact")
    )),
    replyMessage: v.optional(v.string()),
    replyTemplateId: v.optional(v.id("templates")),
    forwardToNumbers: v.optional(v.array(v.string())),
    addToGroupId: v.optional(v.id("contactGroups")),
    addTags: v.optional(v.array(v.string())),
    activeHoursStart: v.optional(v.string()),
    activeHoursEnd: v.optional(v.string()),
    activeDays: v.optional(v.array(v.number())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const rule = await ctx.db.get(args.ruleId);
    if (!rule) {
      throw new ConvexError({
        message: "Rule not found",
        code: "NOT_FOUND",
      });
    }

    const { ruleId, ...updates } = args;
    await ctx.db.patch(ruleId, updates);
    return ruleId;
  },
});

// Delete automation rule
export const deleteAutomationRule = mutation({
  args: { ruleId: v.id("automationRules") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const rule = await ctx.db.get(args.ruleId);
    if (!rule) {
      throw new ConvexError({
        message: "Rule not found",
        code: "NOT_FOUND",
      });
    }

    await ctx.db.delete(args.ruleId);
    return args.ruleId;
  },
});

// Toggle automation rule status
export const toggleAutomationRule = mutation({
  args: { ruleId: v.id("automationRules") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const rule = await ctx.db.get(args.ruleId);
    if (!rule) {
      throw new ConvexError({
        message: "Rule not found",
        code: "NOT_FOUND",
      });
    }

    await ctx.db.patch(args.ruleId, { isActive: !rule.isActive });
    return args.ruleId;
  },
});

// Get automation stats
export const getAutomationStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { totalRules: 0, activeRules: 0, totalTriggers: 0 };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return { totalRules: 0, activeRules: 0, totalTriggers: 0 };
    }

    const effectiveClientId = user.testModeClientId || user.clientId;
    if (!effectiveClientId) {
      return { totalRules: 0, activeRules: 0, totalTriggers: 0 };
    }

    const rules = await ctx.db
      .query("automationRules")
      .withIndex("by_client", (q) => q.eq("clientId", effectiveClientId))
      .collect();

    return {
      totalRules: rules.length,
      activeRules: rules.filter((r) => r.isActive).length,
      totalTriggers: rules.reduce((sum, r) => sum + r.triggerCount, 0),
    };
  },
});

// Get automation logs
export const getAutomationLogs = query({
  args: { ruleId: v.optional(v.id("automationRules")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return [];
    }

    const effectiveClientId = user.testModeClientId || user.clientId;
    if (!effectiveClientId) {
      return [];
    }

    if (args.ruleId) {
      const ruleId = args.ruleId;
      return await ctx.db
        .query("automationLogs")
        .withIndex("by_rule", (q) => q.eq("ruleId", ruleId))
        .order("desc")
        .take(100);
    }

    return await ctx.db
      .query("automationLogs")
      .withIndex("by_client", (q) => q.eq("clientId", effectiveClientId))
      .order("desc")
      .take(100);
  },
});

// Process automation rules for incoming message (internal)
export const processIncomingMessage = internalMutation({
  args: {
    incomingMessageId: v.id("incomingMessages"),
  },
  handler: async (ctx, args) => {
    const incomingMessage = await ctx.db.get(args.incomingMessageId);
    if (!incomingMessage) {
      return;
    }

    // Get active automation rules for this client
    const rules = await ctx.db
      .query("automationRules")
      .withIndex("by_client_and_active", (q) =>
        q.eq("clientId", incomingMessage.clientId).eq("isActive", true)
      )
      .collect();

    for (const rule of rules) {
      // Check if rule should trigger
      const shouldTrigger = await checkRuleTrigger(ctx, rule, incomingMessage);
      
      if (shouldTrigger) {
        // Execute the action
        await executeAutomationAction(ctx, rule, incomingMessage);
        
        // Update trigger count
        await ctx.db.patch(rule._id, {
          triggerCount: rule.triggerCount + 1,
          lastTriggeredAt: Date.now(),
        });
      }
    }
  },
});

// Helper to check if rule should trigger
/* eslint-disable @typescript-eslint/no-explicit-any */
async function checkRuleTrigger(
  ctx: any,
  rule: any,
  incomingMessage: any
): Promise<boolean> {
  // Check channel filter
  if (rule.channel && rule.channel !== incomingMessage.channel) {
    return false;
  }

  // Check time conditions
  if (rule.activeHoursStart && rule.activeHoursEnd) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = rule.activeHoursStart.split(":").map(Number);
    const [endHour, endMinute] = rule.activeHoursEnd.split(":").map(Number);
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (currentTime < startTime || currentTime > endTime) {
      return false;
    }
  }

  // Check day of week
  if (rule.activeDays && rule.activeDays.length > 0) {
    const currentDay = new Date().getDay();
    if (!rule.activeDays.includes(currentDay)) {
      return false;
    }
  }

  // Check trigger type
  switch (rule.triggerType) {
    case "any_message":
      return true;

    case "first_message": {
      // Check if this is the first message from this sender
      const previousMessages = await ctx.db
        .query("incomingMessages")
        .withIndex("by_client", (q: unknown) =>
          (q as { eq: (field: string, value: string) => unknown }).eq("clientId", incomingMessage.clientId)
        )
        .filter((q: unknown) =>
          (q as { eq: (field: unknown, value: string) => unknown; field: (name: string) => unknown }).eq(
            (q as { field: (name: string) => unknown }).field("from"),
            incomingMessage.from
          )
        )
        .collect();
      return previousMessages.length === 1;
    }

    case "keyword": {
      if (!rule.keywords || rule.keywords.length === 0) {
        return false;
      }
      const message = incomingMessage.message.toLowerCase();
      return rule.keywords.some((keyword: string) => {
        const kw = keyword.toLowerCase();
        switch (rule.matchType) {
          case "exact":
            return message === kw;
          case "starts_with":
            return message.startsWith(kw);
          case "ends_with":
            return message.endsWith(kw);
          case "contains":
          default:
            return message.includes(kw);
        }
      });
    }

    case "time_based":
      // Time-based triggers are handled separately (scheduled)
      return false;

    default:
      return false;
  }
}

// Helper to execute automation action
/* eslint-disable @typescript-eslint/no-explicit-any */
async function executeAutomationAction(
  ctx: any,
  rule: any,
  incomingMessage: any
): Promise<void> {
  try {
    switch (rule.actionType) {
      case "send_reply": {
        let replyText = rule.replyMessage || "";
        
        // If template is specified, use it
        if (rule.replyTemplateId) {
          const template = await ctx.db.get(rule.replyTemplateId);
          if (template) {
            replyText = template.message;
          }
        }

        if (replyText) {
          // Get client and provider
          const client = await ctx.db.get(incomingMessage.clientId);
          if (!client) break;

          // Determine provider based on channel
          let providerId = client.smsProviderId;
          if (incomingMessage.channel === "whatsapp" && client.whatsappProviderId) {
            providerId = client.whatsappProviderId;
          } else if (incomingMessage.channel === "telegram" && client.telegramProviderId) {
            providerId = client.telegramProviderId;
          } else if (incomingMessage.channel === "facebook_messenger" && client.facebookMessengerProviderId) {
            providerId = client.facebookMessengerProviderId;
          }

          const provider = await ctx.db.get(providerId);
          if (!provider) break;

          // Create outgoing message
          const messageId = await ctx.db.insert("messages", {
            clientId: incomingMessage.clientId,
            to: incomingMessage.from,
            from: incomingMessage.to,
            message: replyText,
            channel: incomingMessage.channel,
            status: "pending",
            type: "single",
            providerId,
            creditsUsed: provider.costPerSms,
          });

          // Log success
          await ctx.db.insert("automationLogs", {
            ruleId: rule._id,
            clientId: incomingMessage.clientId,
            incomingMessageId: incomingMessage._id,
            actionTaken: "Sent auto-reply",
            success: true,
            responseMessageId: messageId,
          });
        }
        break;
      }

      case "forward_to_human": {
        if (rule.forwardToNumbers && rule.forwardToNumbers.length > 0) {
          const client = await ctx.db.get(incomingMessage.clientId);
          if (!client) break;

          const provider = await ctx.db.get(client.smsProviderId);
          if (!provider) break;

          const forwardText = `[Forwarded] From: ${incomingMessage.from}\nMessage: ${incomingMessage.message}`;

          for (const number of rule.forwardToNumbers) {
            await ctx.db.insert("messages", {
              clientId: incomingMessage.clientId,
              to: number,
              from: incomingMessage.to,
              message: forwardText,
              channel: incomingMessage.channel || "sms",
              status: "pending",
              type: "single",
              providerId: client.smsProviderId,
              creditsUsed: provider.costPerSms,
            });
          }

          await ctx.db.insert("automationLogs", {
            ruleId: rule._id,
            clientId: incomingMessage.clientId,
            incomingMessageId: incomingMessage._id,
            actionTaken: `Forwarded to ${rule.forwardToNumbers.length} number(s)`,
            success: true,
          });
        }
        break;
      }

      case "add_to_group": {
        if (rule.addToGroupId) {
          // Find or create contact
          let contact: unknown = await ctx.db
            .query("contacts")
            .withIndex("by_client_and_phone", (q: unknown) =>
              (q as { eq: (field: string, value: Id<"clients"> | string) => { eq: (field: string, value: string) => unknown } })
                .eq("clientId", incomingMessage.clientId)
                .eq("phoneNumber", incomingMessage.from)
            )
            .unique();

          if (!contact) {
            const contactId = await ctx.db.insert("contacts", {
              clientId: incomingMessage.clientId,
              phoneNumber: incomingMessage.from,
              tags: [],
              isOptedOut: false,
              lastMessagedAt: Date.now(),
            });
            contact = await ctx.db.get(contactId);
          }

          if (contact && typeof contact === "object" && "_id" in contact) {
            // Check if already in group
            const contactId = (contact as { _id: Id<"contacts"> })._id;
            const existing = await ctx.db
              .query("contactGroupMembers")
              .withIndex("by_group_and_contact", (q: unknown) =>
                (q as { eq: (field: string, value: Id<"contactGroups"> | Id<"contacts">) => { eq: (field: string, value: Id<"contacts">) => unknown } })
                  .eq("groupId", rule.addToGroupId!)
                  .eq("contactId", contactId)
              )
              .unique();

            if (!existing) {
              await ctx.db.insert("contactGroupMembers", {
                groupId: rule.addToGroupId,
                contactId: contactId,
              });

              // Update group count
              const group = await ctx.db.get(rule.addToGroupId);
              if (group) {
                await ctx.db.patch(rule.addToGroupId, {
                  contactCount: group.contactCount + 1,
                });
              }
            }

            await ctx.db.insert("automationLogs", {
              ruleId: rule._id,
              clientId: incomingMessage.clientId,
              incomingMessageId: incomingMessage._id,
              actionTaken: "Added to group",
              success: true,
            });
          }
        }
        break;
      }

      case "tag_contact": {
        if (rule.addTags && rule.addTags.length > 0) {
          // Find or create contact
          let contact: unknown = await ctx.db
            .query("contacts")
            .withIndex("by_client_and_phone", (q: unknown) =>
              (q as { eq: (field: string, value: Id<"clients"> | string) => { eq: (field: string, value: string) => unknown } })
                .eq("clientId", incomingMessage.clientId)
                .eq("phoneNumber", incomingMessage.from)
            )
            .unique();

          if (!contact) {
            const contactId = await ctx.db.insert("contacts", {
              clientId: incomingMessage.clientId,
              phoneNumber: incomingMessage.from,
              tags: rule.addTags,
              isOptedOut: false,
              lastMessagedAt: Date.now(),
            });
            contact = await ctx.db.get(contactId);
          } else if (typeof contact === "object" && "_id" in contact && "tags" in contact) {
            // Add new tags to existing tags
            const existingTags = (contact as { tags?: string[] }).tags || [];
            const newTags = [...new Set([...existingTags, ...rule.addTags])];
            const contactId = (contact as { _id: Id<"contacts"> })._id;
            await ctx.db.patch(contactId, { tags: newTags });
          }

          await ctx.db.insert("automationLogs", {
            ruleId: rule._id,
            clientId: incomingMessage.clientId,
            incomingMessageId: incomingMessage._id,
            actionTaken: `Tagged with: ${rule.addTags.join(", ")}`,
            success: true,
          });
        }
        break;
      }
    }
  } catch (error) {
    // Log failure
    await ctx.db.insert("automationLogs", {
      ruleId: rule._id,
      clientId: incomingMessage.clientId,
      incomingMessageId: incomingMessage._id,
      actionTaken: rule.actionType,
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
