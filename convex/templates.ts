import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

export const listTemplates = query({
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

    // Use test mode client if active
    const effectiveClientId = user.testModeClientId || user.clientId;

    if (!effectiveClientId) {
      return [];
    }

    return await ctx.db
      .query("templates")
      .withIndex("by_client", (q) => q.eq("clientId", effectiveClientId))
      .order("desc")
      .collect();
  },
});

export const getTemplate = query({
  args: { templateId: v.id("templates") },
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

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new ConvexError({
        message: "Template not found",
        code: "NOT_FOUND",
      });
    }

    if (user.role === "client" && user.clientId !== template.clientId) {
      throw new ConvexError({
        message: "Access denied",
        code: "FORBIDDEN",
      });
    }

    return template;
  },
});

export const createTemplate = mutation({
  args: {
    name: v.string(),
    message: v.string(),
    variables: v.array(v.string()),
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

    // Use test mode client if active
    const effectiveClientId = user.testModeClientId || user.clientId;

    if (!effectiveClientId) {
      throw new ConvexError({
        message: "User not associated with a client",
        code: "FORBIDDEN",
      });
    }

    const templateId = await ctx.db.insert("templates", {
      clientId: effectiveClientId,
      name: args.name,
      message: args.message,
      variables: args.variables,
    });

    return templateId;
  },
});

export const updateTemplate = mutation({
  args: {
    templateId: v.id("templates"),
    name: v.optional(v.string()),
    message: v.optional(v.string()),
    variables: v.optional(v.array(v.string())),
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

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new ConvexError({
        message: "Template not found",
        code: "NOT_FOUND",
      });
    }

    // Use test mode client if active
    const effectiveClientId = user.testModeClientId || user.clientId;

    if (template.clientId !== effectiveClientId) {
      throw new ConvexError({
        message: "Access denied",
        code: "FORBIDDEN",
      });
    }

    const updates: Partial<{
      name: string;
      message: string;
      variables: string[];
    }> = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.message !== undefined) updates.message = args.message;
    if (args.variables !== undefined) updates.variables = args.variables;

    await ctx.db.patch(args.templateId, updates);

    return args.templateId;
  },
});

export const deleteTemplate = mutation({
  args: { templateId: v.id("templates") },
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

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new ConvexError({
        message: "Template not found",
        code: "NOT_FOUND",
      });
    }

    // Use test mode client if active
    const effectiveClientId = user.testModeClientId || user.clientId;

    if (template.clientId !== effectiveClientId) {
      throw new ConvexError({
        message: "Access denied",
        code: "FORBIDDEN",
      });
    }

    await ctx.db.delete(args.templateId);

    return args.templateId;
  },
});

// Helper query to extract variables from a message template
export const extractVariables = query({
  args: { message: v.string() },
  handler: async (ctx, args) => {
    // Extract variables like {name}, {code}, {amount} from the message
    const regex = /{([^}]+)}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = regex.exec(args.message)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  },
});
