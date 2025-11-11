import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const handleDeliveryUpdate = internalMutation({
  args: {
    provider: v.union(
      v.literal("twilio"),
      v.literal("vonage"),
      v.literal("africastalking"),
      v.literal("other")
    ),
    data: v.string(),
  },
  handler: async (ctx, args) => {
    const data = JSON.parse(args.data) as Record<string, unknown>;

    let providerMessageId: string | undefined;
    let status: "delivered" | "failed" | undefined;

    switch (args.provider) {
      case "twilio": {
        providerMessageId = data.MessageSid as string;
        const twilioStatus = data.MessageStatus as string;
        if (twilioStatus === "delivered") {
          status = "delivered";
        } else if (
          twilioStatus === "failed" ||
          twilioStatus === "undelivered"
        ) {
          status = "failed";
        }
        break;
      }

      case "vonage": {
        providerMessageId = data["message-id"] as string;
        const vonageStatus = data.status as string;
        if (vonageStatus === "delivered") {
          status = "delivered";
        } else if (vonageStatus === "failed" || vonageStatus === "rejected") {
          status = "failed";
        }
        break;
      }

      case "africastalking": {
        providerMessageId = data.id as string;
        const atStatus = data.status as string;
        if (atStatus === "Success") {
          status = "delivered";
        } else if (atStatus === "Failed") {
          status = "failed";
        }
        break;
      }
    }

    if (providerMessageId && status) {
      const messages = await ctx.db.query("messages").collect();
      const message = messages.find(
        (m) => m.providerMessageId === providerMessageId
      );

      if (message) {
        const updates: {
          status: "delivered" | "failed";
          deliveredAt?: number;
          failureReason?: string;
        } = {
          status,
        };

        if (status === "delivered") {
          updates.deliveredAt = Date.now();
        } else if (status === "failed") {
          updates.failureReason = "Delivery failed";

          const client = await ctx.db.get(message.clientId);
          if (client) {
            await ctx.db.patch(message.clientId, {
              credits: client.credits + message.creditsUsed,
            });
          }
        }

        await ctx.db.patch(message._id, updates);

        if (message.clientId) {
          const client = await ctx.db.get(message.clientId);
          if (client && client.webhookUrl) {
            try {
              await fetch(client.webhookUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  messageId: message._id,
                  status: status,
                  to: message.to,
                  sentAt: message.sentAt,
                  deliveredAt: updates.deliveredAt,
                }),
              });
            } catch (error) {
              console.error("Failed to send webhook:", error);
            }
          }
        }
      }
    }
  },
});
