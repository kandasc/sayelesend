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
    bulkSmsProviderId: v.optional(v.id("smsProviders")), // Separate provider for bulk SMS
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
    conversationId: v.optional(v.id("conversations")),
  })
    .index("by_client", ["clientId"])
    .index("by_status", ["status"])
    .index("by_client_and_status", ["clientId", "status"])
    .index("by_bulk", ["bulkMessageId"])
    .index("by_channel", ["channel"])
    .index("by_conversation", ["conversationId"]),

  conversations: defineTable({
    clientId: v.id("clients"),
    contactPhone: v.string(),
    channel: v.union(
      v.literal("sms"),
      v.literal("whatsapp"),
      v.literal("telegram"),
      v.literal("facebook_messenger")
    ),
    contactId: v.optional(v.id("contacts")),
    contactName: v.optional(v.string()),
    lastMessageText: v.string(),
    lastMessageAt: v.string(),
    lastMessageDirection: v.union(
      v.literal("inbound"),
      v.literal("outbound")
    ),
    unreadCount: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("archived")
    ),
  })
    .index("by_client", ["clientId"])
    .index("by_client_and_phone", ["clientId", "contactPhone"])
    .index("by_client_and_status", ["clientId", "status"]),

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
    // MTarget bulk campaign tracking
    providerCampaignId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_client", ["clientId"])
    .index("by_status", ["status"]),

  bulkMessageRecipients: defineTable({
    bulkMessageId: v.id("bulkMessages"),
    phoneNumber: v.string(),
    messageId: v.optional(v.id("messages")),
    providerMessageId: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed")
    ),
    deliveredAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  })
    .index("by_bulk", ["bulkMessageId"])
    .index("by_bulk_and_status", ["bulkMessageId", "status"])
    .index("by_status", ["status"])
    .index("by_provider_msg", ["providerMessageId"]),

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
    conversationId: v.optional(v.id("conversations")),
  })
    .index("by_client", ["clientId"])
    .index("by_processed", ["processed"])
    .index("by_client_and_received", ["clientId", "receivedAt"])
    .index("by_conversation", ["conversationId"]),

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

  aiAssistants: defineTable({
    clientId: v.id("clients"),
    name: v.string(),
    description: v.optional(v.string()),
    companyName: v.string(),
    companyDescription: v.optional(v.string()),
    industry: v.optional(v.string()),
    welcomeMessage: v.optional(v.string()),
    personality: v.union(
      v.literal("professional"),
      v.literal("friendly"),
      v.literal("casual"),
      v.literal("formal")
    ),
    primaryColor: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    isActive: v.boolean(),
    customInstructions: v.optional(v.string()),
    handoverEmail: v.optional(v.string()),
    handoverPhoneNumber: v.optional(v.string()), // Phone number for call option
    // Departments for specialist routing
    handoverDepartments: v.optional(v.array(v.object({
      name: v.string(),
      description: v.string(),
      email: v.optional(v.string()),
      phoneNumber: v.optional(v.string()),
    }))),
    // Subjects that should proactively trigger handover suggestion
    handoverSubjects: v.optional(v.array(v.object({
      topic: v.string(),
      department: v.optional(v.string()), // maps to a department name
      message: v.optional(v.string()), // custom AI message when suggesting handover
    }))),
    // Training & tone configuration
    toneDescription: v.optional(v.string()),
    sampleQA: v.optional(v.array(v.object({ question: v.string(), answer: v.string() }))),
    responseGuidelines: v.optional(v.array(v.string())),
    restrictionGuidelines: v.optional(v.array(v.string())),
    vocabulary: v.optional(v.array(v.object({ term: v.string(), definition: v.string() }))),
    greetingStyle: v.optional(v.string()),
    closingStyle: v.optional(v.string()),
    responseLength: v.optional(v.union(v.literal("short"), v.literal("medium"), v.literal("detailed"))),
    primaryLanguage: v.optional(v.string()),
    totalConversations: v.number(),
    totalMessages: v.number(),
  })
    .index("by_client", ["clientId"]),

  aiKnowledgeBase: defineTable({
    assistantId: v.id("aiAssistants"),
    clientId: v.id("clients"),
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    sourceType: v.union(
      v.literal("manual"),
      v.literal("api"),
      v.literal("document"),
      v.literal("website")
    ),
    sourceUrl: v.optional(v.string()),
    sourceHeaders: v.optional(v.string()),
    lastSyncedAt: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_assistant", ["assistantId"])
    .index("by_client", ["clientId"]),

  aiAssistantTasks: defineTable({
    assistantId: v.id("aiAssistants"),
    clientId: v.id("clients"),
    name: v.string(),
    description: v.string(),
    apiEndpoint: v.string(),
    httpMethod: v.union(
      v.literal("GET"),
      v.literal("POST"),
      v.literal("PUT"),
      v.literal("DELETE")
    ),
    headers: v.optional(v.string()),
    bodyTemplate: v.optional(v.string()),
    parameters: v.array(v.object({
      name: v.string(),
      description: v.string(),
      type: v.union(v.literal("string"), v.literal("number"), v.literal("boolean")),
      required: v.boolean(),
    })),
    isActive: v.boolean(),
    executionCount: v.number(),
    lastExecutedAt: v.optional(v.string()),
  })
    .index("by_assistant", ["assistantId"])
    .index("by_client", ["clientId"]),

  aiTaskExecutionLogs: defineTable({
    taskId: v.id("aiAssistantTasks"),
    sessionId: v.id("aiChatSessions"),
    assistantId: v.id("aiAssistants"),
    parameters: v.string(),
    responseStatus: v.number(),
    responseBody: v.optional(v.string()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    executedAt: v.string(),
  })
    .index("by_task", ["taskId"])
    .index("by_assistant", ["assistantId"])
    .index("by_session", ["sessionId"]),

  aiChatSessions: defineTable({
    assistantId: v.id("aiAssistants"),
    sessionId: v.string(),
    visitorName: v.optional(v.string()),
    visitorEmail: v.optional(v.string()),
    visitorPhone: v.optional(v.string()),
    channel: v.union(
      v.literal("web"),
      v.literal("sms"),
      v.literal("whatsapp"),
      v.literal("api")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("closed"),
      v.literal("transferred"),
      v.literal("handed_over")
    ),
    messageCount: v.number(),
    lastMessageAt: v.optional(v.string()),
  })
    .index("by_assistant", ["assistantId"])
    .index("by_session_id", ["sessionId"]),

  aiHandoverRequests: defineTable({
    sessionId: v.id("aiChatSessions"),
    assistantId: v.id("aiAssistants"),
    clientId: v.id("clients"),
    reason: v.optional(v.string()),
    summary: v.string(),
    visitorName: v.optional(v.string()),
    visitorEmail: v.optional(v.string()),
    visitorPhone: v.optional(v.string()),
    emailSentTo: v.optional(v.string()),
    emailSentAt: v.optional(v.string()),
    department: v.optional(v.string()), // specialist department
    handoverType: v.optional(v.union(
      v.literal("chat"),
      v.literal("call"),
      v.literal("email")
    )),
    status: v.union(
      v.literal("pending"),
      v.literal("email_sent"),
      v.literal("in_progress"), // agent has taken over
      v.literal("resolved")
    ),
    takenOverBy: v.optional(v.id("users")), // agent who took over
    takenOverAt: v.optional(v.string()),
    resolvedAt: v.optional(v.string()),
    resolvedBy: v.optional(v.id("users")),
  })
    .index("by_assistant", ["assistantId"])
    .index("by_client", ["clientId"])
    .index("by_session", ["sessionId"])
    .index("by_status", ["status"]),

  aiChatMessages: defineTable({
    sessionId: v.id("aiChatSessions"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
    ),
    content: v.string(),
  })
    .index("by_session", ["sessionId"]),

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
