import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";

const http = httpRouter();

// Security headers
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": "default-src 'self'",
};

// CORS headers with specific origins (update with your actual domains)
const getAllowedOrigins = () => {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map(o => o.trim());
  }
  return ['*']; // Default to all origins (update for production)
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const isAllowed = allowedOrigins.includes('*') || 
                    (origin && allowedOrigins.includes(origin));
  
  return {
    "Access-Control-Allow-Origin": isAllowed && origin ? origin : (allowedOrigins[0] === '*' ? '*' : ''),
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
    ...securityHeaders,
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
  path: "/api/v1/sms/status/:messageId",
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
  path: "/api/v1/sms/status/:messageId",
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
http.route({
  path: "/webhooks/sms/delivery/:provider",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split("/");
      const provider = pathParts[pathParts.length - 1];

      const body = await request.text();
      
      // Verify webhook signature (provider-specific)
      const signature = request.headers.get("X-Twilio-Signature") || 
                       request.headers.get("X-Nexmo-Signature") ||
                       request.headers.get("X-Hub-Signature-256");
      
      // Parse body
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(body);
      } catch {
        const params = new URLSearchParams(body);
        data = Object.fromEntries(params.entries());
      }

      // Process webhook
      await ctx.runMutation(internal.sms.webhooks.handleDeliveryUpdate, {
        provider: provider as "twilio" | "vonage" | "africastalking" | "mtarget" | "other",
        data: JSON.stringify(data),
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      // Log webhook failure
      await ctx.runMutation(internal.httpHelpers.logWebhookFailure, {
        action: "Delivery webhook processing failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
        status: 500,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
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
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      await ctx.runMutation(internal.httpHelpers.logWebhookFailure, {
        action: "Incoming webhook processing failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
        status: 500,
        headers: { ...securityHeaders, "Content-Type": "application/json" },
      });
    }
  }),
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
  path: "/api/v1/ai/assistants/:assistantId",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    const origin = request.headers.get("Origin");
    return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  }),
});

// GET /api/v1/ai/assistants/:assistantId - Get public assistant info
http.route({
  path: "/api/v1/ai/assistants/:assistantId",
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

export default http;
