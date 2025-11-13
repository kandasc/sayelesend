import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

export const submitContactForm = mutation({
  args: {
    companyName: v.string(),
    contactName: v.string(),
    email: v.string(),
    phone: v.string(),
    country: v.string(),
    industry: v.optional(v.string()),
    expectedMonthlyVolume: v.optional(v.string()),
    useCase: v.optional(v.string()),
    additionalNotes: v.optional(v.string()),
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

    // Check if user already submitted
    const existingSubmission = await ctx.db
      .query("contactFormSubmissions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existingSubmission) {
      throw new ConvexError({
        message: "Contact form already submitted",
        code: "CONFLICT",
      });
    }

    // Create submission
    await ctx.db.insert("contactFormSubmissions", {
      userId: user._id,
      companyName: args.companyName,
      contactName: args.contactName,
      email: args.email,
      phone: args.phone,
      country: args.country,
      industry: args.industry,
      expectedMonthlyVolume: args.expectedMonthlyVolume,
      useCase: args.useCase,
      additionalNotes: args.additionalNotes,
      status: "pending",
    });

    // Mark user as having submitted the form
    await ctx.db.patch(user._id, {
      hasSubmittedContactForm: true,
    });

    return { success: true };
  },
});

export const getContactFormSubmission = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return null;
    }

    return await ctx.db
      .query("contactFormSubmissions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
  },
});

// Admin queries
export const listContactFormSubmissions = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("reviewed"),
        v.literal("approved"),
        v.literal("rejected")
      )
    ),
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

    if (args.status !== undefined) {
      return await ctx.db
        .query("contactFormSubmissions")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }

    return await ctx.db.query("contactFormSubmissions").order("desc").collect();
  },
});

export const updateContactFormStatus = mutation({
  args: {
    submissionId: v.id("contactFormSubmissions"),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("approved"),
      v.literal("rejected")
    ),
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

    await ctx.db.patch(args.submissionId, {
      status: args.status,
    });

    return { success: true };
  },
});
