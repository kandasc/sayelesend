"use node";

import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

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
    const message = await ctx.runQuery(internal.sms.queries.getMessageById, {
      messageId: args.messageId,
    });

    if (!message) {
      throw new Error("Message not found");
    }

    const provider = await ctx.runQuery(internal.sms.queries.getProviderById, {
      providerId: message.providerId,
    });

    if (!provider || !provider.isActive) {
      await ctx.runMutation(internal.messages.updateMessageStatus, {
        messageId: message._id,
        status: "failed",
        failureReason: "Provider not available or inactive",
      });
      return { success: false, error: "Provider not available" };
    }

    try {
      const result = await sendViaSmsProvider(provider, message);

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
    type: "twilio" | "vonage" | "africas_talking" | "mtarget" | "custom";
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
    };
  },
  message: { to: string; from: string; message: string; _id: string; clientId: string }
): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
  switch (provider.type) {
    case "twilio":
      return await sendViaTwilio(provider.config, message);
    case "vonage":
      return await sendViaVonage(provider.config, message);
    case "africas_talking":
      return await sendViaAfricasTalking(provider.config, message);
    case "mtarget":
      return await sendViaMTarget(provider.config, message);
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
  message: { to: string; from: string; message: string }
): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
  try {
    const accountSid = config.accountSid || config.apiKey;
    const authToken = config.authToken || config.apiSecret;
    
    if (!accountSid || !authToken) {
      return { success: false, error: "Missing Twilio credentials" };
    }
    const from = config.senderId || message.from;

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
          To: message.to,
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
      return {
        success: false,
        error: data.message || "Failed to send via Twilio",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
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

    if (response.ok) {
      return {
        success: true,
        providerMessageId: uniqueId,
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
