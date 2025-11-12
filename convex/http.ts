import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";

const http = httpRouter();

http.route({
  path: "/api/v1/sms/send",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid authorization header" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const apiKey = authHeader.substring(7);

      const verification = await ctx.runQuery(api.apiKeys.verifyApiKey, {
        key: apiKey,
      });

      if (!verification) {
        return new Response(
          JSON.stringify({ error: "Invalid or inactive API key" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const body = await request.json();

      if (!body.to || !body.message) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: to, message" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      await ctx.runMutation(api.apiKeys.updateLastUsed, {
        apiKeyId: verification.apiKeyId,
      });

      const messageId = await ctx.runMutation(api.messages.sendSmsViaApi, {
        clientId: verification.clientId,
        to: body.to,
        message: body.message,
        from: body.from,
        scheduledAt: body.scheduledAt,
      });

      return new Response(
        JSON.stringify({
          success: true,
          messageId,
          status: body.scheduledAt ? "scheduled" : "pending",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/api/v1/sms/status/:messageId",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid authorization header" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const apiKey = authHeader.substring(7);

      const verification = await ctx.runQuery(api.apiKeys.verifyApiKey, {
        key: apiKey,
      });

      if (!verification) {
        return new Response(
          JSON.stringify({ error: "Invalid or inactive API key" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const url = new URL(request.url);
      const pathParts = url.pathname.split("/");
      const messageId = pathParts[pathParts.length - 1];

      if (!messageId) {
        return new Response(
          JSON.stringify({ error: "Message ID required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const message = await ctx.runQuery(api.messages.getMessageViaApi, {
        messageId: messageId as Id<"messages">,
        clientId: verification.clientId,
      });

      if (!message) {
        return new Response(
          JSON.stringify({ error: "Message not found" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(JSON.stringify(message), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/webhooks/sms/delivery/:provider",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/");
      const provider = pathParts[pathParts.length - 1];

      const body = await request.text();
      let data: Record<string, unknown> = {};

      try {
        data = JSON.parse(body);
      } catch {
        const params = new URLSearchParams(body);
        data = Object.fromEntries(params.entries());
      }

      await ctx.runMutation(internal.sms.webhooks.handleDeliveryUpdate, {
        provider: provider as "twilio" | "vonage" | "africastalking" | "other",
        data: JSON.stringify(data),
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

http.route({
  path: "/webhooks/sms/incoming/:provider",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/");
      const provider = pathParts[pathParts.length - 1];

      const body = await request.text();
      let data: Record<string, unknown> = {};

      try {
        data = JSON.parse(body);
      } catch {
        const params = new URLSearchParams(body);
        data = Object.fromEntries(params.entries());
      }

      await ctx.runMutation(internal.sms.webhooks.handleIncomingSms, {
        provider: provider as "twilio" | "vonage" | "africastalking" | "mtarget" | "other",
        data: JSON.stringify(data),
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
