import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";

// List contact groups
export const listGroups = query({
  args: { searchQuery: v.optional(v.string()) },
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
      // Admin can see all groups
      let groups = await ctx.db.query("contactGroups").collect();

      if (args.searchQuery) {
        const query = args.searchQuery.toLowerCase();
        groups = groups.filter(
          (g) =>
            g.name.toLowerCase().includes(query) ||
            g.description?.toLowerCase().includes(query)
        );
      }

      return groups;
    }

    if (!effectiveClientId) {
      return [];
    }

    // Client can only see their groups
    let groups = await ctx.db
      .query("contactGroups")
      .withIndex("by_client", (q) => q.eq("clientId", effectiveClientId))
      .collect();

    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      groups = groups.filter(
        (g) =>
          g.name.toLowerCase().includes(query) ||
          g.description?.toLowerCase().includes(query)
      );
    }

    return groups;
  },
});

// Get single group
export const getGroup = query({
  args: { groupId: v.id("contactGroups") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new ConvexError({
        message: "Group not found",
        code: "NOT_FOUND",
      });
    }

    return group;
  },
});

// Get group members
export const getGroupMembers = query({
  args: { groupId: v.id("contactGroups") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const memberships = await ctx.db
      .query("contactGroupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const contacts = [];
    for (const membership of memberships) {
      const contact = await ctx.db.get(membership.contactId);
      if (contact) {
        contacts.push(contact);
      }
    }

    return contacts;
  },
});

// Create group
export const createGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
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

    const groupId = await ctx.db.insert("contactGroups", {
      clientId: effectiveClientId,
      name: args.name,
      description: args.description,
      contactCount: 0,
    });

    return groupId;
  },
});

// Update group
export const updateGroup = mutation({
  args: {
    groupId: v.id("contactGroups"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new ConvexError({
        message: "Group not found",
        code: "NOT_FOUND",
      });
    }

    await ctx.db.patch(args.groupId, {
      name: args.name,
      description: args.description,
    });
  },
});

// Delete group
export const deleteGroup = mutation({
  args: { groupId: v.id("contactGroups") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) {
      throw new ConvexError({
        message: "Group not found",
        code: "NOT_FOUND",
      });
    }

    // Delete all memberships
    const memberships = await ctx.db
      .query("contactGroupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    for (const membership of memberships) {
      await ctx.db.delete(membership._id);
    }

    await ctx.db.delete(args.groupId);
  },
});

// Add contact to group
export const addContactToGroup = mutation({
  args: {
    groupId: v.id("contactGroups"),
    contactId: v.id("contacts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    // Check if already exists
    const existing = await ctx.db
      .query("contactGroupMembers")
      .withIndex("by_group_and_contact", (q) =>
        q.eq("groupId", args.groupId).eq("contactId", args.contactId)
      )
      .unique();

    if (existing) {
      throw new ConvexError({
        message: "Contact already in group",
        code: "CONFLICT",
      });
    }

    await ctx.db.insert("contactGroupMembers", {
      groupId: args.groupId,
      contactId: args.contactId,
    });

    // Update count
    const group = await ctx.db.get(args.groupId);
    if (group) {
      await ctx.db.patch(args.groupId, {
        contactCount: group.contactCount + 1,
      });
    }
  },
});

// Remove contact from group
export const removeContactFromGroup = mutation({
  args: {
    groupId: v.id("contactGroups"),
    contactId: v.id("contacts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const membership = await ctx.db
      .query("contactGroupMembers")
      .withIndex("by_group_and_contact", (q) =>
        q.eq("groupId", args.groupId).eq("contactId", args.contactId)
      )
      .unique();

    if (!membership) {
      throw new ConvexError({
        message: "Contact not in group",
        code: "NOT_FOUND",
      });
    }

    await ctx.db.delete(membership._id);

    // Update count
    const group = await ctx.db.get(args.groupId);
    if (group) {
      await ctx.db.patch(args.groupId, {
        contactCount: Math.max(0, group.contactCount - 1),
      });
    }
  },
});

// Add multiple contacts to group
export const addContactsToGroup = mutation({
  args: {
    groupId: v.id("contactGroups"),
    contactIds: v.array(v.id("contacts")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    let addedCount = 0;

    for (const contactId of args.contactIds) {
      // Check if already exists
      const existing = await ctx.db
        .query("contactGroupMembers")
        .withIndex("by_group_and_contact", (q) =>
          q.eq("groupId", args.groupId).eq("contactId", contactId)
        )
        .unique();

      if (!existing) {
        await ctx.db.insert("contactGroupMembers", {
          groupId: args.groupId,
          contactId: contactId,
        });
        addedCount++;
      }
    }

    // Update count
    const group = await ctx.db.get(args.groupId);
    if (group) {
      await ctx.db.patch(args.groupId, {
        contactCount: group.contactCount + addedCount,
      });
    }

    return { added: addedCount };
  },
});

// Get groups for a contact
export const getContactGroups = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const memberships = await ctx.db
      .query("contactGroupMembers")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .collect();

    const groups = [];
    for (const membership of memberships) {
      const group = await ctx.db.get(membership.groupId);
      if (group) {
        groups.push(group);
      }
    }

    return groups;
  },
});
