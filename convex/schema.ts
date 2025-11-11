import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("client"))),
    clientId: v.optional(v.id("clients")),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_client", ["clientId"]),

  clients: defineTable({
    companyName: v.string(),
    contactName: v.string(),
    email: v.string(),
    phone: v.string(),
    credits: v.number(),
    smsProviderId: v.id("smsProviders"),
    status: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("inactive")
    ),
    webhookUrl: v.optional(v.string()),
    senderId: v.optional(v.string()),
    remoteId: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  smsProviders: defineTable({
    name: v.string(),
    type: v.union(
      v.literal("twilio"),
      v.literal("vonage"),
      v.literal("africas_talking"),
      v.literal("mtarget"),
      v.literal("custom")
    ),
    isActive: v.boolean(),
    costPerSms: v.number(),
    config: v.object({
      apiKey: v.optional(v.string()),
      apiSecret: v.optional(v.string()),
      accountSid: v.optional(v.string()),
      authToken: v.optional(v.string()),
      username: v.optional(v.string()),
      password: v.optional(v.string()),
      senderId: v.optional(v.string()),
      endpoint: v.optional(v.string()),
      serviceId: v.optional(v.string()),
      remoteId: v.optional(v.string()),
      uniqueId: v.optional(v.string()),
    }),
  }).index("by_active", ["isActive"]),

  messages: defineTable({
    clientId: v.id("clients"),
    to: v.string(),
    from: v.string(),
    message: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("queued"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed"),
      v.literal("scheduled")
    ),
    type: v.union(
      v.literal("single"),
      v.literal("bulk"),
      v.literal("scheduled")
    ),
    providerId: v.id("smsProviders"),
    providerMessageId: v.optional(v.string()),
    creditsUsed: v.number(),
    scheduledAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    bulkMessageId: v.optional(v.id("bulkMessages")),
  })
    .index("by_client", ["clientId"])
    .index("by_status", ["status"])
    .index("by_client_and_status", ["clientId", "status"])
    .index("by_bulk", ["bulkMessageId"]),

  bulkMessages: defineTable({
    clientId: v.id("clients"),
    name: v.string(),
    message: v.string(),
    from: v.optional(v.string()),
    totalRecipients: v.number(),
    sentCount: v.number(),
    deliveredCount: v.number(),
    failedCount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    scheduledAt: v.optional(v.number()),
    creditsUsed: v.number(),
  })
    .index("by_client", ["clientId"])
    .index("by_status", ["status"]),

  bulkMessageRecipients: defineTable({
    bulkMessageId: v.id("bulkMessages"),
    phoneNumber: v.string(),
    messageId: v.optional(v.id("messages")),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed")
    ),
  })
    .index("by_bulk", ["bulkMessageId"])
    .index("by_bulk_and_status", ["bulkMessageId", "status"]),

  templates: defineTable({
    clientId: v.id("clients"),
    name: v.string(),
    message: v.string(),
    variables: v.array(v.string()),
  }).index("by_client", ["clientId"]),

  apiKeys: defineTable({
    clientId: v.id("clients"),
    key: v.string(),
    name: v.string(),
    isActive: v.boolean(),
    lastUsedAt: v.optional(v.number()),
  })
    .index("by_client", ["clientId"])
    .index("by_key", ["key"]),
});
