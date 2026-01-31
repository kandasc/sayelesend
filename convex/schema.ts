import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("client"), v.literal("viewer"))),
    clientId: v.optional(v.id("clients")),
    testModeClientId: v.optional(v.id("clients")),
    testModeExpiresAt: v.optional(v.number()),
    hasSubmittedContactForm: v.optional(v.boolean()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_client", ["clientId"]),

  contactFormSubmissions: defineTable({
    userId: v.id("users"),
    companyName: v.string(),
    contactName: v.string(),
    email: v.string(),
    phone: v.string(),
    country: v.string(),
    industry: v.optional(v.string()),
    expectedMonthlyVolume: v.optional(v.string()),
    useCase: v.optional(v.string()),
    additionalNotes: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("approved"),
      v.literal("rejected")
    ),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  clients: defineTable({
    companyName: v.string(),
    contactName: v.string(),
    email: v.string(),
    phone: v.string(),
    // Legacy: single credit balance (will be deprecated)
    credits: v.number(),
    // Per-channel credit balances
    smsCredits: v.optional(v.number()),
    whatsappCredits: v.optional(v.number()),
    telegramCredits: v.optional(v.number()),
    facebookMessengerCredits: v.optional(v.number()),
    // Provider assignments per channel
    smsProviderId: v.id("smsProviders"),
    whatsappProviderId: v.optional(v.id("smsProviders")),
    telegramProviderId: v.optional(v.id("smsProviders")),
    facebookMessengerProviderId: v.optional(v.id("smsProviders")),
    status: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("inactive")
    ),
    webhookUrl: v.optional(v.string()),
    senderId: v.optional(v.string()),
    remoteId: v.optional(v.string()),
    // Message counts per channel
    smsCount: v.optional(v.number()),
    whatsappCount: v.optional(v.number()),
    telegramCount: v.optional(v.number()),
    facebookMessengerCount: v.optional(v.number()),
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
      v.literal("whatsapp"),
      v.literal("telegram"),
      v.literal("facebook_messenger"),
      v.literal("custom")
    ),
    channel: v.optional(v.union(
      v.literal("sms"),
      v.literal("whatsapp"),
      v.literal("telegram"),
      v.literal("facebook_messenger")
    )),
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
      // WhatsApp specific
      phoneNumberId: v.optional(v.string()),
      businessAccountId: v.optional(v.string()),
      accessToken: v.optional(v.string()),
      // Telegram specific
      botToken: v.optional(v.string()),
      // Facebook Messenger specific
      pageAccessToken: v.optional(v.string()),
      pageId: v.optional(v.string()),
      appSecret: v.optional(v.string()),
    }),
  }).index("by_active", ["isActive"]),

  messages: defineTable({
    clientId: v.id("clients"),
    to: v.string(),
    from: v.string(),
    message: v.string(),
    channel: v.optional(v.union(
      v.literal("sms"),
      v.literal("whatsapp"),
      v.literal("telegram"),
      v.literal("facebook_messenger")
    )),
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
    .index("by_bulk", ["bulkMessageId"])
    .index("by_channel", ["channel"]),

  bulkMessages: defineTable({
    clientId: v.id("clients"),
    name: v.string(),
    message: v.string(),
    from: v.optional(v.string()),
    channel: v.optional(v.union(
      v.literal("sms"),
      v.literal("whatsapp"),
      v.literal("telegram"),
      v.literal("facebook_messenger")
    )),
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
    key: v.optional(v.string()), // Legacy field - kept for backward compatibility
    keyHash: v.optional(v.string()), // SHA-256 hash of the API key
    keyPreview: v.optional(v.string()), // Last 4 characters for display
    name: v.string(),
    isActive: v.boolean(),
    lastUsedAt: v.optional(v.number()),
    requestCount: v.optional(v.number()),
    lastRequestAt: v.optional(v.number()),
  })
    .index("by_client", ["clientId"])
    .index("by_key_hash", ["keyHash"]),

  incomingMessages: defineTable({
    clientId: v.id("clients"),
    from: v.string(),
    to: v.string(),
    message: v.string(),
    channel: v.optional(v.union(
      v.literal("sms"),
      v.literal("whatsapp"),
      v.literal("telegram"),
      v.literal("facebook_messenger")
    )),
    providerId: v.id("smsProviders"),
    providerMessageId: v.optional(v.string()),
    receivedAt: v.number(),
    processed: v.boolean(),
  })
    .index("by_client", ["clientId"])
    .index("by_processed", ["processed"])
    .index("by_client_and_received", ["clientId", "receivedAt"]),

  webhookEvents: defineTable({
    clientId: v.id("clients"),
    eventType: v.union(
      v.literal("message.sent"),
      v.literal("message.delivered"),
      v.literal("message.failed"),
      v.literal("message.received")
    ),
    messageId: v.optional(v.id("messages")),
    incomingMessageId: v.optional(v.id("incomingMessages")),
    payload: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed")
    ),
    attempts: v.number(),
    lastAttemptAt: v.optional(v.number()),
    nextRetryAt: v.optional(v.number()),
    responseCode: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_client", ["clientId"])
    .index("by_status", ["status"])
    .index("by_next_retry", ["nextRetryAt"]),

  contacts: defineTable({
    clientId: v.id("clients"),
    phoneNumber: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    tags: v.array(v.string()),
    customFields: v.optional(v.string()),
    isOptedOut: v.boolean(),
    optedOutAt: v.optional(v.number()),
    lastMessagedAt: v.optional(v.number()),
  })
    .index("by_client", ["clientId"])
    .index("by_client_and_phone", ["clientId", "phoneNumber"])
    .index("by_opted_out", ["isOptedOut"]),

  contactGroups: defineTable({
    clientId: v.id("clients"),
    name: v.string(),
    description: v.optional(v.string()),
    contactCount: v.number(),
  })
    .index("by_client", ["clientId"]),

  contactGroupMembers: defineTable({
    groupId: v.id("contactGroups"),
    contactId: v.id("contacts"),
  })
    .index("by_group", ["groupId"])
    .index("by_contact", ["contactId"])
    .index("by_group_and_contact", ["groupId", "contactId"]),

  creditTransactions: defineTable({
    clientId: v.id("clients"),
    amount: v.number(),
    type: v.union(
      v.literal("purchase"),
      v.literal("add"),
      v.literal("deduction"),
      v.literal("refund"),
      v.literal("bonus"),
      v.literal("adjustment")
    ),
    description: v.string(),
    balanceBefore: v.optional(v.number()),
    balanceAfter: v.number(),
    performedBy: v.optional(v.id("users")),
    relatedMessageId: v.optional(v.id("messages")),
  })
    .index("by_client", ["clientId"])
    .index("by_type", ["type"]),

  automationRules: defineTable({
    clientId: v.id("clients"),
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    
    // Trigger conditions
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
    
    // Action
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
    
    // Time conditions
    activeHoursStart: v.optional(v.string()),
    activeHoursEnd: v.optional(v.string()),
    activeDays: v.optional(v.array(v.number())),
    
    // Stats
    triggerCount: v.number(),
    lastTriggeredAt: v.optional(v.number()),
  })
    .index("by_client", ["clientId"])
    .index("by_client_and_active", ["clientId", "isActive"]),

  automationLogs: defineTable({
    ruleId: v.id("automationRules"),
    clientId: v.id("clients"),
    incomingMessageId: v.id("incomingMessages"),
    actionTaken: v.string(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    responseMessageId: v.optional(v.id("messages")),
  })
    .index("by_rule", ["ruleId"])
    .index("by_client", ["clientId"])
    .index("by_incoming", ["incomingMessageId"]),

  securityLogs: defineTable({
    userId: v.optional(v.id("users")),
    clientId: v.optional(v.id("clients")),
    eventType: v.union(
      v.literal("api_key_created"),
      v.literal("api_key_deleted"),
      v.literal("api_key_used"),
      v.literal("admin_action"),
      v.literal("credit_modified"),
      v.literal("provider_accessed"),
      v.literal("user_role_changed"),
      v.literal("client_created"),
      v.literal("client_suspended"),
      v.literal("webhook_failed"),
      v.literal("rate_limit_exceeded"),
      v.literal("unauthorized_access")
    ),
    action: v.string(),
    metadata: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    success: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_client", ["clientId"])
    .index("by_event_type", ["eventType"]),

  rateLimits: defineTable({
    identifier: v.string(), // API key hash or client ID
    windowStart: v.number(),
    requestCount: v.number(),
    lastRequest: v.number(),
  })
    .index("by_identifier", ["identifier"])
    .index("by_window", ["windowStart"]),

  paymentTransactions: defineTable({
    transactionId: v.string(),
    clientId: v.id("clients"),
    userId: v.id("users"),
    packageId: v.string(),
    credits: v.number(),
    amount: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    completedAt: v.optional(v.number()),
    failedAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  })
    .index("by_transaction_id", ["transactionId"])
    .index("by_client", ["clientId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),
});
