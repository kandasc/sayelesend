"use node";

import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

// Check DLR (Delivery Reports) for a bulk campaign via MTarget API
export const checkBulkDlr = action({
  args: { bulkMessageId: v.id("bulkMessages") },
  handler: async (ctx, args): Promise<{ checked: number; delivered: number; failed: number; unchanged: number; error?: string }> => {
    const campaignData = await ctx.runQuery(internal.sms.queries.getBulkCampaignForDlr, {
      bulkMessageId: args.bulkMessageId,
    });

    if (!campaignData) {
      return { checked: 0, delivered: 0, failed: 0, unchanged: 0, error: "Campaign not found" };
    }

    const { provider, pendingRecipients, client } = campaignData;

    if (!provider || provider.type !== "mtarget") {
      return { checked: 0, delivered: 0, failed: 0, unchanged: 0, error: "DLR check is only supported for MTarget provider" };
    }

    if (pendingRecipients.length === 0) {
      return { checked: 0, delivered: 0, failed: 0, unchanged: 0, error: "No pending recipients to check" };
    }

    const username = provider.config.username;
    const password = provider.config.password;

    if (!username || !password) {
      return { checked: 0, delivered: 0, failed: 0, unchanged: 0, error: "Missing MTarget credentials" };
    }

    let delivered = 0;
    let failed = 0;
    let unchanged = 0;

    // Check DLR for each pending recipient by phone number
    // MTarget DLR API: GET https://api-public-2.mtarget.fr/messages?username=X&password=X&msisdn=X
    const batchSize = 50;
    for (let i = 0; i < pendingRecipients.length; i += batchSize) {
      const batch = pendingRecipients.slice(i, i + batchSize);

      for (const recipient of batch) {
        try {
          const cleanPhone = recipient.phoneNumber.replace(/[^\d+]/g, "");
          const url = new URL("https://api-public-2.mtarget.fr/messages");
          url.searchParams.append("username", username);
          url.searchParams.append("password", password);
          url.searchParams.append("msisdn", cleanPhone);

          const response = await fetch(url.toString());

          if (response.ok) {
            const text = await response.text();
            // Try to parse XML or JSON response
            let dlrStatus: "delivered" | "failed" | null = null;
            let deliveryTime: number | undefined;
            let failureReason: string | undefined;

            // MTarget typically returns status codes: 3=delivered, 4=refused, 6=not delivered
            if (text.includes("Status>3<") || text.includes("\"Status\":3") || text.includes("status\":3")) {
              dlrStatus = "delivered";
              deliveryTime = Date.now();
            } else if (text.includes("Status>4<") || text.includes("Status>6<") || 
                       text.includes("\"Status\":4") || text.includes("\"Status\":6") ||
                       text.includes("status\":4") || text.includes("status\":6")) {
              dlrStatus = "failed";
              failureReason = "Delivery failed (DLR check)";
            }

            if (dlrStatus) {
              await ctx.runMutation(internal.sms.webhooks.updateBulkRecipientDlr, {
                recipientId: recipient._id,
                bulkMessageId: args.bulkMessageId,
                status: dlrStatus,
                deliveredAt: deliveryTime,
                failureReason,
              });

              if (dlrStatus === "delivered") delivered++;
              else failed++;
            } else {
              unchanged++;
            }
          } else {
            unchanged++;
          }
        } catch {
          unchanged++;
        }
      }

      // Small delay between batches
      if (i + batchSize < pendingRecipients.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return {
      checked: pendingRecipients.length,
      delivered,
      failed,
      unchanged,
    };
  },
});

// Internal action to send bulk campaign via MTarget
export const sendBulkCampaignMTarget = internalAction({
  args: {
    bulkMessageId: v.id("bulkMessages"),
    config: v.object({
      username: v.optional(v.string()),
      password: v.optional(v.string()),
      senderId: v.optional(v.string()),
      serviceId: v.optional(v.string()),
    }),
    campaign: v.object({
      message: v.string(),
      sender: v.string(),
      recipients: v.array(v.object({
        phoneNumber: v.string(),
        recipientId: v.string(),
      })),
      scheduledAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string; campaignId?: string }> => {
    const result = await sendBulkViaMTarget(args.config, args.campaign);
    
    if (result.success) {
      // Update bulk message status to completed
      await ctx.runMutation(internal.bulk.updateBulkCampaignStatus, {
        bulkMessageId: args.bulkMessageId,
        status: "completed",
        sentCount: result.successCount || args.campaign.recipients.length,
        failedCount: result.failedCount || 0,
        providerCampaignId: result.campaignId,
      });
      
      return { success: true, campaignId: result.campaignId };
    } else {
      // Update bulk message status to failed
      await ctx.runMutation(internal.bulk.updateBulkCampaignStatus, {
        bulkMessageId: args.bulkMessageId,
        status: "failed",
        sentCount: 0,
        failedCount: args.campaign.recipients.length,
        errorMessage: result.error,
      });
      
      return { success: false, error: result.error };
    }
  },
});

export const processPendingMessages = internalAction({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.runQuery(
      internal.sms.queries.getPendingMessages,
      {}
    );

    for (const message of messages) {
      try {
        const provider = await ctx.runQuery(
          internal.sms.queries.getProviderById,
          { providerId: message.providerId }
        );

        if (!provider || !provider.isActive) {
          await ctx.runMutation(internal.messages.updateMessageStatus, {
            messageId: message._id,
            status: "failed",
            failureReason: "Provider not available or inactive",
          });
          continue;
        }

        const result = await sendViaSmsProvider(provider, message);

        if (result.success) {
          await ctx.runMutation(internal.messages.updateMessageStatus, {
            messageId: message._id,
            status: "sent",
            providerMessageId: result.providerMessageId,
          });
        } else {
          await ctx.runMutation(internal.messages.updateMessageStatus, {
            messageId: message._id,
            status: "failed",
            failureReason: result.error || "Unknown error",
          });
        }
      } catch (error) {
        await ctx.runMutation(internal.messages.updateMessageStatus, {
          messageId: message._id,
          status: "failed",
          failureReason:
            error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  },
});

export const sendScheduledMessage = internalAction({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.runQuery(internal.sms.queries.getMessageById, {
      messageId: args.messageId,
    });

    if (!message || message.status !== "scheduled") {
      return;
    }

    await ctx.runMutation(internal.messages.updateMessageStatus, {
      messageId: args.messageId,
      status: "pending",
    });

    const provider = await ctx.runQuery(internal.sms.queries.getProviderById, {
      providerId: message.providerId,
    });

    if (!provider || !provider.isActive) {
      await ctx.runMutation(internal.messages.updateMessageStatus, {
        messageId: message._id,
        status: "failed",
        failureReason: "Provider not available or inactive",
      });
      return;
    }

    try {
      const result = await sendViaSmsProvider(provider, message);

      if (result.success) {
        await ctx.runMutation(internal.messages.updateMessageStatus, {
          messageId: message._id,
          status: "sent",
          providerMessageId: result.providerMessageId,
        });
      } else {
        await ctx.runMutation(internal.messages.updateMessageStatus, {
          messageId: message._id,
          status: "failed",
          failureReason: result.error || "Unknown error",
        });
      }
    } catch (error) {
      await ctx.runMutation(internal.messages.updateMessageStatus, {
        messageId: message._id,
        status: "failed",
        failureReason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

export const sendSingleMessage = internalAction({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    console.log(`[sendSingleMessage] Starting for message ${args.messageId}`);
    
    const message = await ctx.runQuery(internal.sms.queries.getMessageById, {
      messageId: args.messageId,
    });

    if (!message) {
      console.log(`[sendSingleMessage] Message ${args.messageId} not found`);
      throw new Error("Message not found");
    }
    
    console.log(`[sendSingleMessage] Message status: ${message.status}, to: ${message.to}`);

    const provider = await ctx.runQuery(internal.sms.queries.getProviderById, {
      providerId: message.providerId,
    });

    if (!provider || !provider.isActive) {
      console.log(`[sendSingleMessage] Provider not available or inactive for message ${args.messageId}`);
      await ctx.runMutation(internal.messages.updateMessageStatus, {
        messageId: message._id,
        status: "failed",
        failureReason: "Provider not available or inactive",
      });
      return { success: false, error: "Provider not available" };
    }
    
    console.log(`[sendSingleMessage] Using provider: ${provider.name} (${provider.type})`);

    try {
      const result = await sendViaSmsProvider(provider, message);
      console.log(`[sendSingleMessage] Send result:`, result);

      if (result.success) {
        await ctx.runMutation(internal.messages.updateMessageStatus, {
          messageId: message._id,
          status: "sent",
          providerMessageId: result.providerMessageId,
        });
        return { success: true };
      } else {
        await ctx.runMutation(internal.messages.updateMessageStatus, {
          messageId: message._id,
          status: "failed",
          failureReason: result.error || "Unknown error",
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.log(`[sendSingleMessage] Error:`, error);
      await ctx.runMutation(internal.messages.updateMessageStatus, {
        messageId: message._id,
        status: "failed",
        failureReason: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

async function sendViaSmsProvider(
  provider: {
    type: "twilio" | "vonage" | "africas_talking" | "mtarget" | "whatsapp" | "telegram" | "facebook_messenger" | "custom";
    channel?: "sms" | "whatsapp" | "telegram" | "facebook_messenger";
    config: {
      apiKey?: string;
      apiSecret?: string;
      accountSid?: string;
      authToken?: string;
      username?: string;
      password?: string;
      senderId?: string;
      endpoint?: string;
      serviceId?: string;
      remoteId?: string;
      uniqueId?: string;
      phoneNumberId?: string;
      businessAccountId?: string;
      accessToken?: string;
      botToken?: string;
      pageAccessToken?: string;
      pageId?: string;
      appSecret?: string;
    };
  },
  message: { to: string; from: string; message: string; _id: string; clientId: string; channel?: "sms" | "whatsapp" | "telegram" | "facebook_messenger" }
): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
  switch (provider.type) {
    case "twilio":
      // Twilio can handle both SMS and WhatsApp - pass channel info
      return await sendViaTwilio(provider.config, { ...message, channel: message.channel || provider.channel });
    case "vonage":
      return await sendViaVonage(provider.config, message);
    case "africas_talking":
      return await sendViaAfricasTalking(provider.config, message);
    case "mtarget":
      return await sendViaMTarget(provider.config, message);
    case "whatsapp":
      return await sendViaWhatsApp(provider.config, message);
    case "telegram":
      return await sendViaTelegram(provider.config, message);
    case "facebook_messenger":
      return await sendViaFacebookMessenger(provider.config, message);
    case "custom":
      return await sendViaCustomProvider(provider.config, message);
    default:
      return { success: false, error: "Unsupported provider type" };
  }
}

async function sendViaTwilio(
  config: {
    apiKey?: string;
    apiSecret?: string;
    accountSid?: string;
    authToken?: string;
    username?: string;
    senderId?: string;
    endpoint?: string;
  },
  message: { to: string; from: string; message: string; channel?: "sms" | "whatsapp" | "telegram" | "facebook_messenger" }
): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
  try {
    const accountSid = config.accountSid || config.apiKey;
    const authToken = config.authToken || config.apiSecret;
    
    if (!accountSid || !authToken) {
      return { success: false, error: "Missing Twilio credentials (Account SID and Auth Token required)" };
    }
    
    let from = config.senderId || message.from;
    let to = message.to;
    
    // Add channel prefix for WhatsApp
    if (message.channel === "whatsapp") {
      // Ensure phone numbers are in E.164 format
      const cleanFrom = from.replace(/\D/g, "");
      const cleanTo = to.replace(/\D/g, "");
      
      if (!cleanFrom || cleanFrom.length < 10 || !cleanTo || cleanTo.length < 10) {
        return { success: false, error: "Invalid phone number format. WhatsApp requires E.164 format (e.g., +15551234567)" };
      }
      
      from = `whatsapp:+${cleanFrom}`;
      to = `whatsapp:+${cleanTo}`;
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        },
        body: new URLSearchParams({
          To: to,
          From: from,
          Body: message.message,
        }).toString(),
      }
    );

    const data = await response.json();

    if (response.ok && data.sid) {
      return {
        success: true,
        providerMessageId: data.sid,
      };
    } else {
      const errorMessage = data.message || "Failed to send via Twilio";
      const errorCode = data.code || "";
      return {
        success: false,
        error: errorCode ? `${errorMessage} (Code: ${errorCode})` : errorMessage,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error connecting to Twilio API",
    };
  }
}

async function sendViaVonage(
  config: {
    apiKey?: string;
    apiSecret?: string;
    accountSid?: string;
    authToken?: string;
    username?: string;
    senderId?: string;
    endpoint?: string;
  },
  message: { to: string; from: string; message: string }
): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
  try {
    if (!config.apiKey || !config.apiSecret) {
      return { success: false, error: "Missing Vonage credentials" };
    }
    const from = config.senderId || message.from;

    const response = await fetch("https://rest.nexmo.com/sms/json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: message.to,
        text: message.message,
        api_key: config.apiKey,
        api_secret: config.apiSecret,
      }),
    });

    const data = await response.json();

    if (
      response.ok &&
      data.messages &&
      data.messages[0] &&
      data.messages[0].status === "0"
    ) {
      return {
        success: true,
        providerMessageId: data.messages[0]["message-id"],
      };
    } else {
      return {
        success: false,
        error:
          data.messages?.[0]?.["error-text"] || "Failed to send via Vonage",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function sendViaAfricasTalking(
  config: {
    apiKey?: string;
    apiSecret?: string;
    accountSid?: string;
    authToken?: string;
    username?: string;
    senderId?: string;
    endpoint?: string;
  },
  message: { to: string; from: string; message: string }
): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
  try {
    if (!config.username || !config.apiKey) {
      return { success: false, error: "Missing Africa's Talking credentials" };
    }
    const username = config.username;
    const from = config.senderId || message.from;

    const response = await fetch(
      "https://api.africastalking.com/version1/messaging",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          apiKey: config.apiKey,
        },
        body: new URLSearchParams({
          username,
          to: message.to,
          message: message.message,
          from,
        }).toString(),
      }
    );

    const data = await response.json();

    if (
      response.ok &&
      data.SMSMessageData &&
      data.SMSMessageData.Recipients &&
      data.SMSMessageData.Recipients.length > 0
    ) {
      const recipient = data.SMSMessageData.Recipients[0];
      if (recipient.status === "Success") {
        return {
          success: true,
          providerMessageId: recipient.messageId,
        };
      } else {
        return {
          success: false,
          error: recipient.status || "Failed to send via Africa's Talking",
        };
      }
    } else {
      return {
        success: false,
        error: data.SMSMessageData?.Message || "Failed to send via Africa's Talking",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function sendViaMTarget(
  config: {
    apiKey?: string;
    apiSecret?: string;
    accountSid?: string;
    authToken?: string;
    username?: string;
    password?: string;
    senderId?: string;
    endpoint?: string;
    serviceId?: string;
    remoteId?: string;
    uniqueId?: string;
  },
  message: { to: string; from: string; message: string }
): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
  try {
    if (!config.username || !config.password) {
      return { success: false, error: "Missing MTarget credentials" };
    }

    // Sender from message.from (set from client's senderId when creating message)
    const sender = message.from;
    const serviceId = config.serviceId || "33189";
    // Generate unique IDs per SMS for tracking
    const uniqueId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const remoteId = `msg_${Date.now()}`;

    const url = new URL("https://api-public-2.mtarget.fr/messages");
    url.searchParams.append("username", config.username);
    url.searchParams.append("password", config.password);
    url.searchParams.append("msisdn", message.to);
    url.searchParams.append("msg", message.message);
    url.searchParams.append("allowunicode", "true");
    url.searchParams.append("serviceid", serviceId);
    url.searchParams.append("sender", sender);
    url.searchParams.append("encoding", "UTF-8");
    url.searchParams.append("remoteid", remoteId);
    url.searchParams.append("uniqueid", uniqueId);

    const response = await fetch(url.toString(), {
      method: "POST",
    });

    const data = await response.text();
    console.log("[MTarget] Send response:", data);

    if (response.ok) {
      // Try to extract MTarget's real message ID from response
      // MTarget may return just the ID as text, or JSON, or "MsgId=xxx"
      let realMsgId = uniqueId; // fallback to our local ID
      try {
        const trimmed = data.trim();
        // Check if response is JSON
        if (trimmed.startsWith("{")) {
          const json = JSON.parse(trimmed);
          if (json.MsgId) realMsgId = String(json.MsgId);
          else if (json.msgid) realMsgId = String(json.msgid);
          else if (json.id) realMsgId = String(json.id);
        } else if (trimmed.includes("MsgId=")) {
          // Parse key=value response
          const match = trimmed.match(/MsgId=([^\s&]+)/);
          if (match) realMsgId = match[1];
        } else if (/^\d+$/.test(trimmed)) {
          // Plain numeric ID
          realMsgId = trimmed;
        }
      } catch {
        // Keep fallback uniqueId
      }
      console.log("[MTarget] Using providerMessageId:", realMsgId);
      return {
        success: true,
        providerMessageId: realMsgId,
      };
    } else {
      return {
        success: false,
        error: data || "Failed to send via MTarget",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function sendViaCustomProvider(
  config: {
    apiKey?: string;
    apiSecret?: string;
    accountSid?: string;
    authToken?: string;
    username?: string;
    password?: string;
    senderId?: string;
    endpoint?: string;
    serviceId?: string;
    remoteId?: string;
    uniqueId?: string;
  },
  message: { to: string; from: string; message: string }
): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
  try {
    if (!config.endpoint || !config.apiKey) {
      return { success: false, error: "Missing custom provider credentials" };
    }

    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        to: message.to,
        from: config.senderId || message.from,
        message: message.message,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        providerMessageId: data.id || data.messageId || "custom",
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || "Failed to send via custom provider",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function sendViaWhatsApp(
  config: {
    phoneNumberId?: string;
    accessToken?: string;
    appSecret?: string;
  },
  message: { to: string; from: string; message: string }
): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
  try {
    if (!config.phoneNumberId || !config.accessToken) {
      return { success: false, error: "Missing WhatsApp credentials (Phone Number ID and Access Token required)" };
    }

    // Ensure phone number is in E.164 format (digits only, with country code)
    let cleanPhone = message.to.replace(/\D/g, "");
    
    // If phone doesn't start with a country code, we can't send it
    if (!cleanPhone || cleanPhone.length < 10) {
      return { success: false, error: "Invalid phone number format. Must include country code (E.164 format)" };
    }

    // Use latest Graph API version (v21.0)
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "text",
          text: {
            body: message.message,
          },
        }),
      }
    );

    const data = await response.json();

    if (response.ok && data.messages && data.messages[0]) {
      return {
        success: true,
        providerMessageId: data.messages[0].id,
      };
    } else {
      // Provide more detailed error messages
      const errorMessage = data.error?.message || "Failed to send via WhatsApp Cloud API";
      const errorCode = data.error?.code || "unknown";
      const errorType = data.error?.type || "";
      
      return {
        success: false,
        error: `${errorMessage} (Code: ${errorCode}${errorType ? `, Type: ${errorType}` : ""})`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error connecting to WhatsApp Cloud API",
    };
  }
}

async function sendViaTelegram(
  config: {
    botToken?: string;
  },
  message: { to: string; from: string; message: string }
): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
  try {
    if (!config.botToken) {
      return { success: false, error: "Missing Telegram bot token" };
    }

    // The 'to' field should be a Telegram chat ID
    const chatId = message.to;

    const response = await fetch(
      `https://api.telegram.org/bot${config.botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message.message,
          parse_mode: "HTML",
        }),
      }
    );

    const data = await response.json();

    if (response.ok && data.ok && data.result) {
      return {
        success: true,
        providerMessageId: data.result.message_id.toString(),
      };
    } else {
      return {
        success: false,
        error: data.description || "Failed to send via Telegram",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function sendViaFacebookMessenger(
  config: {
    pageAccessToken?: string;
  },
  message: { to: string; from: string; message: string }
): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
  try {
    if (!config.pageAccessToken) {
      return { success: false, error: "Missing Facebook Messenger credentials" };
    }

    // The 'to' field should be a Facebook-scoped user ID (PSID)
    const recipientId = message.to;

    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${config.pageAccessToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId,
          },
          message: {
            text: message.message,
          },
        }),
      }
    );

    const data = await response.json();

    if (response.ok && data.message_id) {
      return {
        success: true,
        providerMessageId: data.message_id,
      };
    } else {
      return {
        success: false,
        error: data.error?.message || "Failed to send via Facebook Messenger",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// MTarget maximum recipients per request
const MTARGET_MAX_BATCH_SIZE = 500;

// MTarget Bulk Campaign API - automatically batches recipients if over 500
export async function sendBulkViaMTarget(
  config: {
    username?: string;
    password?: string;
    senderId?: string;
    serviceId?: string;
  },
  campaign: {
    message: string;
    sender: string;
    recipients: Array<{ phoneNumber: string; recipientId: string }>;
    scheduledAt?: number;
  }
): Promise<{ 
  success: boolean; 
  campaignId?: string; 
  error?: string;
  successCount?: number;
  failedCount?: number;
}> {
  try {
    if (!config.username || !config.password) {
      return { success: false, error: "Missing MTarget credentials (username and password required)" };
    }

    if (campaign.recipients.length === 0) {
      return { success: false, error: "No recipients provided" };
    }

    const sender = config.senderId || campaign.sender || "SAYELE";
    const serviceId = config.serviceId || "34916";
    
    // Format time for MTarget: yyyy-MM-dd HH:mm:ss
    const now = campaign.scheduledAt ? new Date(campaign.scheduledAt) : new Date();
    const timesend = formatDateForMTarget(now);
    
    // Split recipients into batches of 500 (MTarget limit)
    const batches: Array<Array<{ phoneNumber: string; recipientId: string }>> = [];
    for (let i = 0; i < campaign.recipients.length; i += MTARGET_MAX_BATCH_SIZE) {
      batches.push(campaign.recipients.slice(i, i + MTARGET_MAX_BATCH_SIZE));
    }
    
    console.log(`MTarget Bulk: Splitting ${campaign.recipients.length} recipients into ${batches.length} batch(es) of max ${MTARGET_MAX_BATCH_SIZE}`);
    
    // Track totals across all batches
    let totalSuccess = 0;
    let totalFailed = 0;
    const errors: string[] = [];
    const campaignId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Send each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`MTarget Bulk: Sending batch ${batchIndex + 1}/${batches.length} with ${batch.length} recipients`);
      
      // Build msisdns array in MTarget format
      const msisdns = batch.map((recipient, index) => {
        const entry: Record<string, string | number> = {
          msisdn: normalizePhoneNumber(recipient.phoneNumber),
          remoteid: String(batchIndex * MTARGET_MAX_BATCH_SIZE + index)
        };
        // Add param with index (param1, param2, etc.)
        entry[`param${index + 1}`] = "sayele";
        return entry;
      });

      // Build the POST body for MTarget bulk API
      const postBody = {
        username: config.username,
        password: config.password,
        sender: sender,
        msg: campaign.message,
        timetosend: timesend,
        serviceid: parseInt(serviceId, 10),
        msisdns: msisdns,
        validationrequired: true,
        packetsize: 50,
        interval: 300
      };

      // MTarget bulk API endpoint
      const url = "https://api-public.mtarget.fr/messages";

      console.log(`MTarget Bulk API Request (Batch ${batchIndex + 1}):`, JSON.stringify({ ...postBody, msisdns: `[${msisdns.length} recipients]` }));

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": "SERVERID=A"
        },
        body: JSON.stringify(postBody)
      });

      const responseText = await response.text();
      console.log(`MTarget Bulk API Response (Batch ${batchIndex + 1}):`, response.status, responseText);
      
      if (response.ok) {
        totalSuccess += batch.length;
      } else {
        totalFailed += batch.length;
        // Try to parse error
        try {
          const errorData = JSON.parse(responseText) as Record<string, unknown>;
          const results = errorData.results as Array<{ reason?: string }> | undefined;
          if (results && results[0]?.reason) {
            errors.push(`Batch ${batchIndex + 1}: ${results[0].reason}`);
          } else {
            errors.push(`Batch ${batchIndex + 1}: ${responseText}`);
          }
        } catch {
          errors.push(`Batch ${batchIndex + 1}: ${responseText}`);
        }
      }
      
      // Small delay between batches to avoid rate limiting
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Determine overall success
    if (totalSuccess > 0) {
      return {
        success: true,
        campaignId: campaignId,
        successCount: totalSuccess,
        failedCount: totalFailed,
        error: errors.length > 0 ? errors.join("; ") : undefined
      };
    } else {
      return {
        success: false,
        error: errors.join("; ") || "All batches failed",
        successCount: 0,
        failedCount: totalFailed
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error connecting to MTarget bulk API",
      successCount: 0,
      failedCount: campaign.recipients.length
    };
  }
}

// Helper function to format date for MTarget (yyyy-MM-dd HH:mm:ss)
function formatDateForMTarget(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Helper function to normalize phone number for MTarget
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, "");
  
  // Ensure it starts with +
  if (!cleaned.startsWith("+")) {
    // If it looks like it has a country code (starts with common codes)
    if (cleaned.startsWith("225") || cleaned.startsWith("33") || cleaned.startsWith("1")) {
      cleaned = "+" + cleaned;
    } else {
      // Default to +225 (Côte d'Ivoire) if no country code
      cleaned = "+225" + cleaned;
    }
  }
  
  return cleaned;
}
