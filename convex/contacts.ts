import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { validatePhoneNumber } from "./lib/validation";

// List contacts for a client
export const listContacts = query({
  args: {
    searchQuery: v.optional(v.string()),
    tag: v.optional(v.string()),
    isOptedOut: v.optional(v.boolean()),
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

    // Get effective client ID (test mode or actual)
    const effectiveClientId = user.testModeClientId || user.clientId;

    if (user.role === "admin") {
      // Admin can see all contacts
      let contacts = await ctx.db.query("contacts").collect();

      // Apply filters
      if (args.searchQuery) {
        const query = args.searchQuery.toLowerCase();
        contacts = contacts.filter(
          (c) =>
            c.phoneNumber.toLowerCase().includes(query) ||
            c.firstName?.toLowerCase().includes(query) ||
            c.lastName?.toLowerCase().includes(query) ||
            c.email?.toLowerCase().includes(query)
        );
      }

      if (args.tag) {
        contacts = contacts.filter((c) => c.tags.includes(args.tag!));
      }

      if (args.isOptedOut !== undefined) {
        contacts = contacts.filter((c) => c.isOptedOut === args.isOptedOut);
      }

      return contacts;
    }

    if (!effectiveClientId) {
      return [];
    }

    // Client can only see their contacts
    let contacts = await ctx.db
      .query("contacts")
      .withIndex("by_client", (q) => q.eq("clientId", effectiveClientId))
      .collect();

    // Apply filters
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      contacts = contacts.filter(
        (c) =>
          c.phoneNumber.toLowerCase().includes(query) ||
          c.firstName?.toLowerCase().includes(query) ||
          c.lastName?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query)
      );
    }

    if (args.tag) {
      contacts = contacts.filter((c) => c.tags.includes(args.tag!));
    }

    if (args.isOptedOut !== undefined) {
      contacts = contacts.filter((c) => c.isOptedOut === args.isOptedOut);
    }

    return contacts;
  },
});

// Get single contact
export const getContact = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const contact = await ctx.db.get(args.contactId);
    if (!contact) {
      throw new ConvexError({
        message: "Contact not found",
        code: "NOT_FOUND",
      });
    }

    return contact;
  },
});

// Create contact
export const createContact = mutation({
  args: {
    phoneNumber: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    customFields: v.optional(v.string()),
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

    // Get effective client ID (test mode or actual)
    const effectiveClientId = user.testModeClientId || user.clientId;

    if (!effectiveClientId) {
      throw new ConvexError({
        message: "No client associated with user",
        code: "FORBIDDEN",
      });
    }

    // Validate phone number
    validatePhoneNumber(args.phoneNumber);

    // Check if contact already exists
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_client_and_phone", (q) =>
        q.eq("clientId", effectiveClientId).eq("phoneNumber", args.phoneNumber)
      )
      .unique();

    if (existing) {
      throw new ConvexError({
        message: "Contact with this phone number already exists",
        code: "CONFLICT",
      });
    }

    const contactId = await ctx.db.insert("contacts", {
      clientId: effectiveClientId,
      phoneNumber: args.phoneNumber,
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      tags: args.tags || [],
      customFields: args.customFields,
      isOptedOut: false,
    });

    return contactId;
  },
});

// Update contact
export const updateContact = mutation({
  args: {
    contactId: v.id("contacts"),
    phoneNumber: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    customFields: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const contact = await ctx.db.get(args.contactId);
    if (!contact) {
      throw new ConvexError({
        message: "Contact not found",
        code: "NOT_FOUND",
      });
    }

    // Validate phone if provided
    if (args.phoneNumber) {
      validatePhoneNumber(args.phoneNumber);

      // Check for duplicates if phone is changing
      if (args.phoneNumber !== contact.phoneNumber) {
        const existing = await ctx.db
          .query("contacts")
          .withIndex("by_client_and_phone", (q) =>
            q.eq("clientId", contact.clientId).eq("phoneNumber", args.phoneNumber!)
          )
          .unique();

        if (existing) {
          throw new ConvexError({
            message: "Contact with this phone number already exists",
            code: "CONFLICT",
          });
        }
      }
    }

    await ctx.db.patch(args.contactId, {
      phoneNumber: args.phoneNumber,
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      tags: args.tags,
      customFields: args.customFields,
    });
  },
});

// Delete contact
export const deleteContact = mutation({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const contact = await ctx.db.get(args.contactId);
    if (!contact) {
      throw new ConvexError({
        message: "Contact not found",
        code: "NOT_FOUND",
      });
    }

    // Remove from all groups
    const memberships = await ctx.db
      .query("contactGroupMembers")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .collect();

    for (const membership of memberships) {
      await ctx.db.delete(membership._id);

      // Update group count
      const group = await ctx.db.get(membership.groupId);
      if (group) {
        await ctx.db.patch(membership.groupId, {
          contactCount: Math.max(0, group.contactCount - 1),
        });
      }
    }

    await ctx.db.delete(args.contactId);
  },
});

// Bulk import contacts
export const importContacts = mutation({
  args: {
    contacts: v.array(
      v.object({
        phoneNumber: v.string(),
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        email: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
      })
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

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Get effective client ID (test mode or actual)
    const effectiveClientId = user.testModeClientId || user.clientId;

    if (!effectiveClientId) {
      throw new ConvexError({
        message: "No client associated with user",
        code: "FORBIDDEN",
      });
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const contactData of args.contacts) {
      try {
        // Validate phone
        validatePhoneNumber(contactData.phoneNumber);

        // Check if exists
        const existing = await ctx.db
          .query("contacts")
          .withIndex("by_client_and_phone", (q) =>
            q.eq("clientId", effectiveClientId).eq("phoneNumber", contactData.phoneNumber)
          )
          .unique();

        if (existing) {
          results.skipped++;
          continue;
        }

        await ctx.db.insert("contacts", {
          clientId: effectiveClientId,
          phoneNumber: contactData.phoneNumber,
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          email: contactData.email,
          tags: contactData.tags || [],
          isOptedOut: false,
        });

        results.imported++;
      } catch (error) {
        results.errors.push(
          `${contactData.phoneNumber}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return results;
  },
});

// Get contact stats
export const getContactStats = query({
  args: {},
  handler: async (ctx) => {
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

    // Get effective client ID (test mode or actual)
    const effectiveClientId = user.testModeClientId || user.clientId;

    if (user.role === "admin") {
      const allContacts = await ctx.db.query("contacts").collect();
      return {
        total: allContacts.length,
        optedOut: allContacts.filter((c) => c.isOptedOut).length,
        active: allContacts.filter((c) => !c.isOptedOut).length,
      };
    }

    if (!effectiveClientId) {
      return { total: 0, optedOut: 0, active: 0 };
    }

    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_client", (q) => q.eq("clientId", effectiveClientId))
      .collect();

    return {
      total: contacts.length,
      optedOut: contacts.filter((c) => c.isOptedOut).length,
      active: contacts.filter((c) => !c.isOptedOut).length,
    };
  },
});

// Get all unique tags
export const getTags = query({
  args: {},
  handler: async (ctx) => {
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

    // Get effective client ID (test mode or actual)
    const effectiveClientId = user.testModeClientId || user.clientId;

    let contacts;
    if (user.role === "admin") {
      contacts = await ctx.db.query("contacts").collect();
    } else if (effectiveClientId) {
      contacts = await ctx.db
        .query("contacts")
        .withIndex("by_client", (q) => q.eq("clientId", effectiveClientId))
        .collect();
    } else {
      return [];
    }

    const tagSet = new Set<string>();
    for (const contact of contacts) {
      for (const tag of contact.tags) {
        tagSet.add(tag);
      }
    }

    return Array.from(tagSet).sort();
  },
});
