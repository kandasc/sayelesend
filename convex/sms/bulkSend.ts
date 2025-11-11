"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel.d.ts";

// Send bulk SMS via MTarget API
export const sendBulkViaMTarget = action({
  args: {
    bulkMessageId: v.id("bulkMessages"),
  },
  handler: async (ctx, args) => {
    // Get bulk message details
    const bulkMessage = await ctx.runQuery(
      internal.sms.bulkHelpers.getBulkMessageForSending,
      { bulkMessageId: args.bulkMessageId }
    );

    if (!bulkMessage) {
      throw new ConvexError({
        message: "Bulk message not found",
        code: "NOT_FOUND",
      });
    }

    const { bulk, client, provider, recipients } = bulkMessage;

    if (provider.type !== "mtarget") {
      throw new ConvexError({
        message: "This action only supports MTarget provider",
        code: "BAD_REQUEST",
      });
    }

    // Build MTarget bulk API request
    const msisdns = recipients.map((recipient: Doc<"bulkMessageRecipients">, idx: number) => ({
      msisdn: recipient.phoneNumber,
      remoteid: `${args.bulkMessageId}_${idx}`,
    }));

    const requestBody = {
      msg: bulk.message,
      msisdns,
      sender: bulk.from || provider.config.senderId || "SAYELE",
      serviceid: Number(provider.config.serviceId || 33189),
      validationrequired: false,
      packetsize: 50,
      interval: 300,
    };

    // Build URL with auth params
    const url = new URL("https://api-public-2.mtarget.fr/api-campaignsms");
    url.searchParams.set("username", provider.config.username || "");
    url.searchParams.set("password", provider.config.password || "");

    try {
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(
          `MTarget API error: ${response.status} - ${responseText}`
        );
      }

      // Parse response
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        result = { raw: responseText };
      }

      // Mark all recipients as sent (MTarget will handle delivery)
      await ctx.runMutation(internal.sms.bulkHelpers.updateBulkMessageSent, {
        bulkMessageId: args.bulkMessageId,
        recipientIds: recipients.map((r: Doc<"bulkMessageRecipients">) => r._id),
      });

      return {
        success: true,
        response: result,
        recipientCount: recipients.length,
      };
    } catch (error) {
      // Mark bulk message as failed
      await ctx.runMutation(internal.sms.bulkHelpers.updateBulkMessageFailed, {
        bulkMessageId: args.bulkMessageId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw new ConvexError({
        message: `Failed to send bulk SMS via MTarget: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }
  },
});
