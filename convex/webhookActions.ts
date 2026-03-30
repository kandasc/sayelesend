"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { ConvexError } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";

export const testWebhook = action({
  args: {},
  handler: async (ctx): Promise<{ success: boolean; statusCode: number; statusText: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        message: "User not logged in",
        code: "UNAUTHENTICATED",
      });
    }

    const user = await ctx.runQuery(api.webhookEvents.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });

    if (!user) {
      throw new ConvexError({
        message: "User not found",
        code: "NOT_FOUND",
      });
    }

    // Use test mode client if active
    const effectiveClientId: Id<"clients"> | null | undefined = user.testModeClientId || user.clientId;

    if (!effectiveClientId) {
      throw new ConvexError({
        message: "User not associated with a client",
        code: "FORBIDDEN",
      });
    }

    const client = await ctx.runQuery(api.webhookEvents.getClient, {
      clientId: effectiveClientId,
    });

    if (!client || !client.webhookUrl) {
      throw new ConvexError({
        message: "No webhook URL configured",
        code: "BAD_REQUEST",
      });
    }

    const testPayload = {
      event: "webhook.test",
      message: "This is a test webhook from Sayelesend Message",
      timestamp: Date.now(),
    };

    try {
      const response: Response = await fetch(client.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Event-Type": "webhook.test",
        },
        body: JSON.stringify(testPayload),
      });

      return {
        success: response.ok,
        statusCode: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new ConvexError({
        message: `Webhook test failed: ${errorMessage}`,
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }
  },
});

export const processWebhooks = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const events = await ctx.runQuery(api.webhookEvents.getPendingEvents, {
      currentTime: now,
    });

    for (const event of events) {
      try {
        await ctx.runAction(internal.webhookActions.sendWebhook, {
          eventId: event._id,
        });
      } catch (error) {
        console.error(`Failed to process webhook ${event._id}:`, error);
      }
    }
  },
});

export const sendWebhook = internalAction({
  args: { eventId: v.id("webhookEvents") },
  handler: async (ctx, args) => {
    const event = await ctx.runQuery(api.webhookEvents.getEvent, {
      eventId: args.eventId,
    });

    if (!event) {
      return;
    }

    const client = await ctx.runQuery(api.webhookEvents.getClient, {
      clientId: event.clientId,
    });

    if (!client || !client.webhookUrl) {
      await ctx.runMutation(internal.webhookEvents.updateEventStatus, {
        eventId: args.eventId,
        status: "failed",
        errorMessage: "No webhook URL configured",
      });
      return;
    }

    try {
      const response = await fetch(client.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Event-Type": event.eventType,
          "X-Webhook-Delivery-Attempt": String(event.attempts + 1),
        },
        body: event.payload,
      });

      if (response.ok) {
        await ctx.runMutation(internal.webhookEvents.updateEventStatus, {
          eventId: args.eventId,
          status: "success",
          responseCode: response.status,
        });
      } else {
        const shouldRetry = event.attempts < 3;
        const nextRetryDelay = Math.pow(2, event.attempts) * 60 * 1000; // Exponential backoff

        await ctx.runMutation(internal.webhookEvents.updateEventStatus, {
          eventId: args.eventId,
          status: shouldRetry ? "pending" : "failed",
          responseCode: response.status,
          errorMessage: `HTTP ${response.status}`,
          nextRetryAt: shouldRetry ? Date.now() + nextRetryDelay : undefined,
        });
      }
    } catch (error) {
      const shouldRetry = event.attempts < 3;
      const nextRetryDelay = Math.pow(2, event.attempts) * 60 * 1000;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      await ctx.runMutation(internal.webhookEvents.updateEventStatus, {
        eventId: args.eventId,
        status: shouldRetry ? "pending" : "failed",
        errorMessage,
        nextRetryAt: shouldRetry ? Date.now() + nextRetryDelay : undefined,
      });
    }
  },
});
