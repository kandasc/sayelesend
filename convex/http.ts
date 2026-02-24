import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";

const http = httpRouter();

// Security headers for webhook/internal endpoints
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

// CORS headers — public API endpoints must be accessible from any customer website
const getCorsHeaders = (origin: string | null): Record<string, string> => {
  // Use the actual origin so credentials/cookies work if needed in the future,
  // fall back to wildcard when no Origin header is present (e.g. server-to-server)
  const allowOrigin = origin ?? "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Expose-Headers": "X-RateLimit-Remaining, X-RateLimit-Reset",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
};

// Request size limit (1MB for single requests)
const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB

// OPTIONS handler for CORS preflight
http.route({
  path: "/api/v1/sms/send",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    const origin = request.headers.get("Origin");
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }),
});

http.route({
  path: "/api/v1/sms/send",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const origin = request.headers.get("Origin");
      const headers = getCorsHeaders(origin);

      // Check content length
      const contentLength = request.headers.get("Content-Length");
      if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
        return new Response(
          JSON.stringify({ error: "Request too large. Maximum 1MB allowed." }),
          { status: 413, headers }
        );
      }

      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid authorization header" }),
          { status: 401, headers }
        );
      }

      const apiKey = authHeader.substring(7);

      const verification = await ctx.runAction(api.apiKeys.verifyApiKey, {
        key: apiKey,
      });

      if (!verification) {
        // Log unauthorized access attempt
        await ctx.runMutation(internal.httpHelpers.logUnauthorizedAccess, {
          action: "API key verification failed",
        });
        
        return new Response(
          JSON.stringify({ error: "Invalid or inactive API key" }),
          { status: 401, headers }
        );
      }

      // Check rate limit
      const rateLimit = await ctx.runMutation(internal.httpHelpers.checkAndIncrementRateLimit, {
        identifier: verification.keyHash,
      });

      if (!rateLimit.allowed) {
        // Log rate limit exceeded
        await ctx.runMutation(internal.httpHelpers.logRateLimitExceeded, {
          clientId: verification.clientId,
          identifier: verification.keyHash,
        });

        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded",
            resetAt: new Date(rateLimit.resetAt).toISOString(),
          }),
          { 
            status: 429,
            headers: {
              ...headers,
              "X-RateLimit-Remaining": rateLimit.remaining.toString(),
              "X-RateLimit-Reset": rateLimit.resetAt.toString(),
              "Retry-After": Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
            },
          }
        );
      }

      const body = await request.json();

      if (!body.to || !body.message) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: to, message" }),
          { status: 400, headers }
        );
      }

      // Log API key usage
      await ctx.runMutation(internal.httpHelpers.logApiKeyUsage, {
        apiKeyId: verification.apiKeyId,
        clientId: verification.clientId,
      });

      await ctx.runMutation(api.apiKeys.updateLastUsed, {
        apiKeyId: verification.apiKeyId,
      });

      const messageId = await ctx.runMutation(api.messages.sendSmsViaApi, {
        clientId: verification.clientId,
        to: body.to,
        message: body.message,
        from: body.from,
        scheduledAt: body.scheduledAt,
        channel: body.channel,
      });

      return new Response(
        JSON.stringify({
          success: true,
          messageId,
          status: body.scheduledAt ? "scheduled" : "pending",
        }),
        {
          status: 200,
          headers: {
            ...headers,
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.resetAt.toString(),
          },
        }
      );
    } catch (error) {
      const origin = request.headers.get("Origin");
      const headers = getCorsHeaders(origin);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return new Response(JSON.stringify({ error: "An error occurred processing your request" }), {
        status: 500,
        headers,
      });
    }
  }),
});

// OPTIONS handler for status endpoint
http.route({
  pathPrefix: "/api/v1/sms/status/",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    const origin = request.headers.get("Origin");
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }),
});

http.route({
  pathPrefix: "/api/v1/sms/status/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const origin = request.headers.get("Origin");
      const headers = getCorsHeaders(origin);

      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid authorization header" }),
          { status: 401, headers }
        );
      }

      const apiKey = authHeader.substring(7);

      const verification = await ctx.runAction(api.apiKeys.verifyApiKey, {
        key: apiKey,
      });

      if (!verification) {
        return new Response(
          JSON.stringify({ error: "Invalid or inactive API key" }),
          { status: 401, headers }
        );
      }

      const url = new URL(request.url);
      const pathParts = url.pathname.split("/");
      const messageId = pathParts[pathParts.length - 1];

      if (!messageId) {
        return new Response(
          JSON.stringify({ error: "Message ID required" }),
          { status: 400, headers }
        );
      }

      const message = await ctx.runQuery(api.messages.getMessageViaApi, {
        messageId: messageId as Id<"messages">,
        clientId: verification.clientId,
      });

      if (!message) {
        return new Response(
          JSON.stringify({ error: "Message not found" }),
          { status: 404, headers }
        );
      }

      return new Response(JSON.stringify(message), {
        status: 200,
        headers,
      });
    } catch (error) {
      const origin = request.headers.get("Origin");
      const headers = getCorsHeaders(origin);
      return new Response(JSON.stringify({ error: "An error occurred" }), {
        status: 500,
        headers,
      });
    }
  }),
});

// Webhook endpoints with signature verification
// Create a reusable handler for delivery webhooks
const deliveryWebhookHandler = (providerName: "twilio" | "vonage" | "africastalking" | "mtarget" | "other") =>
  httpAction(async (ctx, request) => {
    try {
      const body = await request.text();
      console.log("[DLR HTTP]", providerName, "received webhook, body length:", body.length);

      // Parse body (JSON or form-encoded)
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(body);
      } catch {
        const params = new URLSearchParams(body);
        data = Object.fromEntries(params.entries());
        // Convert Status to number if string (MTarget)
        if (typeof data.Status === "string") {
          data.Status = parseInt(data.Status as string, 10);
        }
      }
      console.log("[DLR HTTP]", providerName, "parsed data:", JSON.stringify(data));

      // Process webhook
      await ctx.runMutation(internal.sms.webhooks.handleDeliveryUpdate, {
        provider: providerName,
        data: JSON.stringify(data),
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[DLR HTTP]", providerName, "error:", error);
      await ctx.runMutation(internal.httpHelpers.logWebhookFailure, {
        action: `Delivery webhook processing failed (${providerName})`,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
        status: 500,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }
  });

// MTarget sends ALL DLR reports (both single and bulk) to the same webhook URL
// So this handler must try both individual message and bulk recipient matching
http.route({
  path: "/webhooks/sms/delivery/mtarget",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.text();
      console.log("[DLR HTTP] mtarget received webhook (unified), body length:", body.length);

      // Parse body (JSON or form-encoded)
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(body);
      } catch {
        const params = new URLSearchParams(body);
        data = Object.fromEntries(params.entries());
        if (typeof data.Status === "string") {
          data.Status = parseInt(data.Status as string, 10);
        }
      }
      console.log("[DLR HTTP] mtarget parsed data:", JSON.stringify(data));

      const dataStr = JSON.stringify(data);

      // Try individual message handler first, then bulk handler
      // Both are called because MTarget uses the same callback URL for all DLRs
      await ctx.runMutation(internal.sms.webhooks.handleDeliveryUpdate, {
        provider: "mtarget",
        data: dataStr,
      });

      // Also try the dedicated bulk handler in case the individual handler didn't match
      await ctx.runMutation(internal.sms.webhooks.handleBulkDeliveryUpdate, {
        data: dataStr,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[DLR HTTP] mtarget unified error:", error);
      await ctx.runMutation(internal.httpHelpers.logWebhookFailure, {
        action: "Delivery webhook processing failed (mtarget unified)",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
        status: 500,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }
  }),
});

// Explicit routes for each provider (path params like :provider can be unreliable)

http.route({
  path: "/webhooks/sms/delivery/twilio",
  method: "POST",
  handler: deliveryWebhookHandler("twilio"),
});

http.route({
  path: "/webhooks/sms/delivery/vonage",
  method: "POST",
  handler: deliveryWebhookHandler("vonage"),
});

http.route({
  path: "/webhooks/sms/delivery/africastalking",
  method: "POST",
  handler: deliveryWebhookHandler("africastalking"),
});

// Also handle GET for MTarget DLR (some callbacks use GET) - unified for both single and bulk
http.route({
  path: "/webhooks/sms/delivery/mtarget",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const data: Record<string, unknown> = Object.fromEntries(url.searchParams.entries());
      if (typeof data.Status === "string") {
        data.Status = parseInt(data.Status as string, 10);
      }
      console.log("[DLR HTTP GET] mtarget unified data:", JSON.stringify(data));

      const dataStr = JSON.stringify(data);

      // Try both individual and bulk handlers
      await ctx.runMutation(internal.sms.webhooks.handleDeliveryUpdate, {
        provider: "mtarget",
        data: dataStr,
      });

      await ctx.runMutation(internal.sms.webhooks.handleBulkDeliveryUpdate, {
        data: dataStr,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[DLR HTTP GET] mtarget unified error:", error);
      return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
        status: 500,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }
  }),
});

// Dedicated bulk DLR webhook endpoint for MTarget bulk campaigns
http.route({
  path: "/webhooks/bulk/delivery/mtarget",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.text();

      // Parse body (JSON or form-encoded)
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(body);
      } catch {
        const params = new URLSearchParams(body);
        data = Object.fromEntries(params.entries());
        // Convert Status to number if it came as string from form data
        if (typeof data.Status === "string") {
          data.Status = parseInt(data.Status as string, 10);
        }
      }

      await ctx.runMutation(internal.sms.webhooks.handleBulkDeliveryUpdate, {
        data: JSON.stringify(data),
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      await ctx.runMutation(internal.httpHelpers.logWebhookFailure, {
        action: "Bulk DLR webhook processing failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
        status: 500,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }
  }),
});

// Also handle GET for MTarget DLR (some providers send GET requests)
http.route({
  path: "/webhooks/bulk/delivery/mtarget",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const data: Record<string, unknown> = Object.fromEntries(url.searchParams.entries());
      // Convert Status to number
      if (typeof data.Status === "string") {
        data.Status = parseInt(data.Status as string, 10);
      }

      await ctx.runMutation(internal.sms.webhooks.handleBulkDeliveryUpdate, {
        data: JSON.stringify(data),
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      await ctx.runMutation(internal.httpHelpers.logWebhookFailure, {
        action: "Bulk DLR webhook (GET) processing failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
        status: 500,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }
  }),
});

// Incoming SMS webhooks - explicit routes per provider
const incomingWebhookHandler = (providerName: "twilio" | "vonage" | "africastalking" | "mtarget" | "other") =>
  httpAction(async (ctx, request) => {
    try {
      const body = await request.text();
      let data: Record<string, unknown> = {};

      try {
        data = JSON.parse(body);
      } catch {
        const params = new URLSearchParams(body);
        data = Object.fromEntries(params.entries());
      }

      await ctx.runMutation(internal.sms.webhooks.handleIncomingSms, {
        provider: providerName,
        data: JSON.stringify(data),
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      await ctx.runMutation(internal.httpHelpers.logWebhookFailure, {
        action: `Incoming webhook processing failed (${providerName})`,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
        status: 500,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }
  });

http.route({
  path: "/webhooks/sms/incoming/mtarget",
  method: "POST",
  handler: incomingWebhookHandler("mtarget"),
});

http.route({
  path: "/webhooks/sms/incoming/twilio",
  method: "POST",
  handler: incomingWebhookHandler("twilio"),
});

http.route({
  path: "/webhooks/sms/incoming/vonage",
  method: "POST",
  handler: incomingWebhookHandler("vonage"),
});

http.route({
  path: "/webhooks/sms/incoming/africastalking",
  method: "POST",
  handler: incomingWebhookHandler("africastalking"),
});

// ─── AI Chat API ───────────────────────────────────────────────────────────

// OPTIONS for AI Chat
http.route({
  path: "/api/v1/ai/chat",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    const origin = request.headers.get("Origin");
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  }),
});

// POST /api/v1/ai/chat - Send a message to an AI assistant (public, no auth)
http.route({
  path: "/api/v1/ai/chat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("Origin");
    const headers = getCorsHeaders(origin);

    try {
      const body = await request.json();

      if (!body.assistantId || !body.message) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: assistantId, message" }),
          { status: 400, headers }
        );
      }

      // Generate a session ID if not provided
      const sessionId = body.sessionId || `api_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const channel = body.channel || "api";

      // Validate channel
      const validChannels = ["web", "sms", "whatsapp", "api"];
      if (!validChannels.includes(channel)) {
        return new Response(
          JSON.stringify({ error: "Invalid channel. Must be: web, sms, whatsapp, or api" }),
          { status: 400, headers }
        );
      }

      const result = await ctx.runAction(internal.aiAssistantsActions.publicChat, {
        assistantId: body.assistantId as Id<"aiAssistants">,
        sessionId,
        message: body.message,
        channel: channel as "web" | "sms" | "whatsapp" | "api",
        visitorName: body.visitorName,
        visitorEmail: body.visitorEmail,
        visitorPhone: body.visitorPhone,
      });

      return new Response(
        JSON.stringify({
          success: true,
          response: result.response,
          sessionId: result.sessionId,
        }),
        { status: 200, headers }
      );
    } catch (error) {
      console.error("AI Chat API error:", error);
      return new Response(
        JSON.stringify({ error: "An error occurred processing your request" }),
        { status: 500, headers }
      );
    }
  }),
});

// OPTIONS for AI Assistant info
http.route({
  pathPrefix: "/api/v1/ai/assistants/",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    const origin = request.headers.get("Origin");
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  }),
});

// GET /api/v1/ai/assistants/{assistantId} - Get public assistant info
http.route({
  pathPrefix: "/api/v1/ai/assistants/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("Origin");
    const headers = getCorsHeaders(origin);

    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/");
      const assistantId = pathParts[pathParts.length - 1];

      if (!assistantId) {
        return new Response(
          JSON.stringify({ error: "Assistant ID required" }),
          { status: 400, headers }
        );
      }

      const assistant = await ctx.runQuery(api.aiAssistants.getPublicAssistant, {
        assistantId: assistantId as Id<"aiAssistants">,
      });

      if (!assistant) {
        return new Response(
          JSON.stringify({ error: "Assistant not found or inactive" }),
          { status: 404, headers }
        );
      }

      return new Response(JSON.stringify(assistant), { status: 200, headers });
    } catch (error) {
      console.error("AI Assistant info error:", error);
      return new Response(
        JSON.stringify({ error: "An error occurred" }),
        { status: 500, headers }
      );
    }
  }),
});

// ─── AI Chat Handover API ─────────────────────────────────────────────────

// OPTIONS for handover
http.route({
  path: "/api/v1/ai/handover",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    const origin = request.headers.get("Origin");
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  }),
});

// POST /api/v1/ai/handover - Request human handover (public, for widget)
http.route({
  path: "/api/v1/ai/handover",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get("Origin");
    const headers = getCorsHeaders(origin);

    try {
      const body = await request.json();

      if (!body.assistantId || !body.sessionId) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: assistantId, sessionId" }),
          { status: 400, headers }
        );
      }

      const result = await ctx.runAction(internal.aiHandoverActions.requestPublicHandover, {
        assistantId: body.assistantId as Id<"aiAssistants">,
        sessionId: body.sessionId,
        reason: body.reason,
      });

      return new Response(
        JSON.stringify({
          success: result.success,
          error: result.error,
          message: result.success
            ? "Your conversation has been forwarded to a human agent. They will get back to you soon."
            : result.error,
        }),
        { status: result.success ? 200 : 400, headers }
      );
    } catch (error) {
      console.error("Handover API error:", error);
      return new Response(
        JSON.stringify({ error: "An error occurred processing your request" }),
        { status: 500, headers }
      );
    }
  }),
});

// ─── Email Assistant API ─────────────────────────────────────────────────

// OPTIONS for email assistant endpoints
http.route({
  path: "/api/v1/email/summarize",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    const origin = request.headers.get("Origin");
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  }),
});

http.route({
  path: "/api/v1/email/reply",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    const origin = request.headers.get("Origin");
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  }),
});

http.route({
  path: "/api/v1/email/compose",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    const origin = request.headers.get("Origin");
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  }),
});

http.route({
  path: "/api/v1/email/review",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    const origin = request.headers.get("Origin");
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  }),
});

http.route({
  path: "/api/v1/email/improve",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    const origin = request.headers.get("Origin");
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  }),
});

// Helper: verify API key for email assistant endpoints
const emailApiHandler = (
  processFn: (
    ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
    body: Record<string, unknown>,
    headers: Record<string, string>,
  ) => Promise<Response>,
) =>
  httpAction(async (ctx, request) => {
    const origin = request.headers.get("Origin");
    const headers = getCorsHeaders(origin);

    try {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid authorization header" }),
          { status: 401, headers },
        );
      }

      const apiKey = authHeader.substring(7);
      const verification = await ctx.runAction(api.apiKeys.verifyApiKey, { key: apiKey });

      if (!verification) {
        return new Response(
          JSON.stringify({ error: "Invalid or inactive API key" }),
          { status: 401, headers },
        );
      }

      const rateLimit = await ctx.runMutation(internal.httpHelpers.checkAndIncrementRateLimit, {
        identifier: verification.keyHash,
      });

      if (!rateLimit.allowed) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded", resetAt: new Date(rateLimit.resetAt).toISOString() }),
          { status: 429, headers: { ...headers, "Retry-After": Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString() } },
        );
      }

      const body = await request.json();
      return processFn(ctx, body as Record<string, unknown>, headers);
    } catch (error) {
      console.error("Email API error:", error);
      return new Response(
        JSON.stringify({ error: "An error occurred processing your request" }),
        { status: 500, headers },
      );
    }
  });

// POST /api/v1/email/summarize
http.route({
  path: "/api/v1/email/summarize",
  method: "POST",
  handler: emailApiHandler(async (ctx, body, headers) => {
    if (!body.emailContent) {
      return new Response(
        JSON.stringify({ error: "Missing required field: emailContent" }),
        { status: 400, headers },
      );
    }
    const result = await ctx.runAction(internal.emailAssistantActions.summarizeEmailInternal, {
      emailContent: body.emailContent as string,
      language: (body.language as string) || undefined,
    });
    return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers });
  }),
});

// POST /api/v1/email/reply
http.route({
  path: "/api/v1/email/reply",
  method: "POST",
  handler: emailApiHandler(async (ctx, body, headers) => {
    if (!body.originalEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required field: originalEmail" }),
        { status: 400, headers },
      );
    }
    const result = await ctx.runAction(internal.emailAssistantActions.draftReplyInternal, {
      originalEmail: body.originalEmail as string,
      instructions: (body.instructions as string) || undefined,
      tone: (body.tone as "professional" | "friendly" | "formal" | "casual" | "apologetic" | "assertive") || undefined,
      language: (body.language as string) || undefined,
    });
    return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers });
  }),
});

// POST /api/v1/email/compose
http.route({
  path: "/api/v1/email/compose",
  method: "POST",
  handler: emailApiHandler(async (ctx, body, headers) => {
    if (!body.prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required field: prompt" }),
        { status: 400, headers },
      );
    }
    const result = await ctx.runAction(internal.emailAssistantActions.composeEmailInternal, {
      prompt: body.prompt as string,
      tone: (body.tone as "professional" | "friendly" | "formal" | "casual" | "marketing" | "persuasive") || undefined,
      recipientContext: (body.recipientContext as string) || undefined,
      language: (body.language as string) || undefined,
    });
    return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers });
  }),
});

// POST /api/v1/email/review
http.route({
  path: "/api/v1/email/review",
  method: "POST",
  handler: emailApiHandler(async (ctx, body, headers) => {
    if (!body.content) {
      return new Response(
        JSON.stringify({ error: "Missing required field: content" }),
        { status: 400, headers },
      );
    }
    const result = await ctx.runAction(internal.emailAssistantActions.reviewDocumentInternal, {
      content: body.content as string,
      reviewType: (body.reviewType as "grammar" | "style" | "clarity" | "comprehensive") || undefined,
      language: (body.language as string) || undefined,
    });
    return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers });
  }),
});

// POST /api/v1/email/improve
http.route({
  path: "/api/v1/email/improve",
  method: "POST",
  handler: emailApiHandler(async (ctx, body, headers) => {
    if (!body.text || !body.improvement) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: text, improvement" }),
        { status: 400, headers },
      );
    }
    const validImprovements = ["shorten", "expand", "professional", "simplify", "persuasive", "translate"];
    if (!validImprovements.includes(body.improvement as string)) {
      return new Response(
        JSON.stringify({ error: `Invalid improvement. Must be one of: ${validImprovements.join(", ")}` }),
        { status: 400, headers },
      );
    }
    const result = await ctx.runAction(internal.emailAssistantActions.improveWritingInternal, {
      text: body.text as string,
      improvement: body.improvement as "shorten" | "expand" | "professional" | "simplify" | "persuasive" | "translate",
      targetLanguage: (body.targetLanguage as string) || undefined,
    });
    return new Response(JSON.stringify({ success: true, ...result }), { status: 200, headers });
  }),
});

export default http;
