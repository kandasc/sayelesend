"use node";

import { v } from "convex/values";
import { Resend } from "resend";
import OpenAI from "openai";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";

// ─── Request human handover (authenticated, from dashboard) ────────────────

export const requestHandover = action({
  args: {
    sessionId: v.id("aiChatSessions"),
    assistantId: v.id("aiAssistants"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { success: false, error: "Not authenticated" };
    }

    // Get assistant details
    const assistant = await ctx.runQuery(api.aiAssistants.getById, {
      assistantId: args.assistantId,
    });
    if (!assistant) {
      return { success: false, error: "Assistant not found" };
    }

    // Get session details
    const session = await ctx.runQuery(internal.aiAssistants.getSessionByPublicIdInternal, {
      sessionId: "", // We need to get by ID, not public ID
    });

    // Get chat messages for summary
    const messages = await ctx.runQuery(api.aiAssistants.getChatMessages, {
      sessionId: args.sessionId,
    });

    // Generate AI summary of the conversation
    const summary = await generateConversationSummary(messages.map((m) => ({
      role: m.role,
      content: m.content,
    })));

    // Get session for visitor info
    const allSessions = await ctx.runQuery(api.aiAssistants.getChatSessions, {
      assistantId: args.assistantId,
    });
    const currentSession = allSessions.find((s) => s._id === args.sessionId);

    // Create handover request
    const handoverId = await ctx.runMutation(internal.aiAssistants.createHandoverRequest, {
      sessionId: args.sessionId,
      assistantId: args.assistantId,
      clientId: assistant.clientId,
      reason: args.reason,
      summary,
      visitorName: currentSession?.visitorName,
      visitorEmail: currentSession?.visitorEmail,
      visitorPhone: currentSession?.visitorPhone,
    });

    // Send email if handover email is configured
    if (assistant.handoverEmail) {
      try {
        await sendHandoverEmailInternal({
          to: assistant.handoverEmail,
          assistantName: assistant.name,
          companyName: assistant.companyName,
          summary,
          reason: args.reason,
          visitorName: currentSession?.visitorName,
          visitorEmail: currentSession?.visitorEmail,
          visitorPhone: currentSession?.visitorPhone,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });

        await ctx.runMutation(internal.aiAssistants.markHandoverEmailSent, {
          handoverId: handoverId as Id<"aiHandoverRequests">,
          emailSentTo: assistant.handoverEmail,
        });
      } catch (error) {
        console.error("Failed to send handover email:", error);
        // Still return success since the handover request was created
      }
    }

    // Add system message to the chat
    await ctx.runMutation(internal.aiAssistants.addChatMessage, {
      sessionId: args.sessionId,
      role: "system",
      content: "This conversation has been transferred to a human agent. Someone will review your conversation and get back to you soon.",
    });

    return { success: true };
  },
});

// ─── Public handover (no auth, for widget/API) ────────────────────────────

export const requestPublicHandover = internalAction({
  args: {
    assistantId: v.id("aiAssistants"),
    sessionId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    // Get assistant
    const assistant = await ctx.runQuery(internal.aiAssistants.getByIdInternal, {
      assistantId: args.assistantId,
    });
    if (!assistant || !assistant.isActive) {
      return { success: false, error: "Assistant not available" };
    }

    // Get session
    const session = await ctx.runQuery(internal.aiAssistants.getSessionByPublicIdInternal, {
      sessionId: args.sessionId,
    });
    if (!session) {
      return { success: false, error: "Session not found" };
    }

    // Get messages
    const messages = await ctx.runQuery(internal.aiAssistants.getChatMessagesInternal, {
      sessionId: session._id,
    });

    // Generate summary
    const summary = await generateConversationSummary(messages.map((m) => ({
      role: m.role,
      content: m.content,
    })));

    // Create handover request
    const handoverId = await ctx.runMutation(internal.aiAssistants.createHandoverRequest, {
      sessionId: session._id,
      assistantId: args.assistantId,
      clientId: assistant.clientId,
      reason: args.reason,
      summary,
      visitorName: session.visitorName,
      visitorEmail: session.visitorEmail,
      visitorPhone: session.visitorPhone,
    });

    // Send email
    if (assistant.handoverEmail) {
      try {
        await sendHandoverEmailInternal({
          to: assistant.handoverEmail,
          assistantName: assistant.name,
          companyName: assistant.companyName,
          summary,
          reason: args.reason,
          visitorName: session.visitorName,
          visitorEmail: session.visitorEmail,
          visitorPhone: session.visitorPhone,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        });

        await ctx.runMutation(internal.aiAssistants.markHandoverEmailSent, {
          handoverId: handoverId as Id<"aiHandoverRequests">,
          emailSentTo: assistant.handoverEmail,
        });
      } catch (error) {
        console.error("Failed to send handover email:", error);
      }
    }

    // Add system message
    await ctx.runMutation(internal.aiAssistants.addChatMessage, {
      sessionId: session._id,
      role: "system",
      content: "This conversation has been transferred to a human agent. Someone will review your conversation and get back to you soon.",
    });

    return { success: true };
  },
});

// ─── Generate conversation summary using AI ────────────────────────────────

async function generateConversationSummary(
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  try {
    const openai = new OpenAI({
      baseURL: "http://ai-gateway.hercules.app/v1",
      apiKey: process.env.HERCULES_API_KEY,
    });

    const conversationText = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => `${m.role === "user" ? "Visitor" : "AI"}: ${m.content}`)
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a conversation summarizer. Summarize the following chat conversation in a clear, concise way for a human agent who will take over. Include:
1. What the visitor wanted/asked about
2. Key details provided by the visitor
3. What the AI already answered or attempted
4. Any unresolved questions or issues
Keep it under 300 words. Use bullet points.`,
        },
        { role: "user", content: conversationText || "No messages in conversation." },
      ],
    });

    return response.choices[0]?.message?.content ?? "Unable to generate summary.";
  } catch (error) {
    console.error("Summary generation error:", error);
    // Fallback: create a basic summary from messages
    const userMessages = messages.filter((m) => m.role === "user");
    if (userMessages.length === 0) return "No conversation messages to summarize.";
    return `Visitor sent ${userMessages.length} message(s). Last message: "${userMessages[userMessages.length - 1].content.slice(0, 200)}"`;
  }
}

// ─── Send handover email ───────────────────────────────────────────────────

async function sendHandoverEmailInternal(params: {
  to: string;
  assistantName: string;
  companyName: string;
  summary: string;
  reason?: string;
  visitorName?: string;
  visitorEmail?: string;
  visitorPhone?: string;
  messages: Array<{ role: string; content: string }>;
}): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const resend = new Resend(resendApiKey);

  const conversationHtml = params.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map(
      (m) => `
      <div style="margin-bottom:12px;padding:10px 14px;border-radius:8px;max-width:85%;${
        m.role === "user"
          ? "background:#e3f2fd;margin-left:auto;text-align:right;"
          : "background:#f5f5f5;margin-right:auto;"
      }">
        <div style="font-size:11px;color:#666;margin-bottom:4px;font-weight:600;">
          ${m.role === "user" ? "Visitor" : "AI Assistant"}
        </div>
        <div style="font-size:14px;color:#333;white-space:pre-wrap;">${escapeHtml(m.content)}</div>
      </div>`,
    )
    .join("");

  const summaryHtml = params.summary.replace(/\n/g, "<br>");

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f9fafb;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <!-- Header -->
        <div style="background:#dc2626;color:white;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="margin:0;font-size:22px;">Human Handover Request</h1>
          <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">
            ${params.assistantName} &bull; ${params.companyName}
          </p>
        </div>

        <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;">
          <!-- Visitor Info -->
          <div style="background:#fef2f2;padding:16px;border-radius:8px;margin-bottom:20px;">
            <h3 style="margin:0 0 10px;color:#dc2626;font-size:15px;">Visitor Information</h3>
            <table style="width:100%;font-size:14px;">
              <tr><td style="color:#666;padding:3px 12px 3px 0;white-space:nowrap;">Name:</td><td style="color:#333;font-weight:500;">${escapeHtml(params.visitorName ?? "Anonymous")}</td></tr>
              <tr><td style="color:#666;padding:3px 12px 3px 0;white-space:nowrap;">Email:</td><td style="color:#333;font-weight:500;">${escapeHtml(params.visitorEmail ?? "Not provided")}</td></tr>
              <tr><td style="color:#666;padding:3px 12px 3px 0;white-space:nowrap;">Phone:</td><td style="color:#333;font-weight:500;">${escapeHtml(params.visitorPhone ?? "Not provided")}</td></tr>
            </table>
          </div>

          ${params.reason ? `
          <div style="background:#fffbeb;padding:16px;border-radius:8px;margin-bottom:20px;">
            <h3 style="margin:0 0 8px;color:#d97706;font-size:15px;">Handover Reason</h3>
            <p style="margin:0;font-size:14px;color:#333;">${escapeHtml(params.reason)}</p>
          </div>` : ""}

          <!-- AI Summary -->
          <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin-bottom:20px;">
            <h3 style="margin:0 0 8px;color:#16a34a;font-size:15px;">AI-Generated Summary</h3>
            <div style="font-size:14px;color:#333;line-height:1.6;">${summaryHtml}</div>
          </div>

          <!-- Full Conversation -->
          <div style="margin-bottom:20px;">
            <h3 style="margin:0 0 12px;color:#333;font-size:15px;">Full Conversation</h3>
            <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;max-height:400px;overflow-y:auto;">
              ${conversationHtml || "<p style='color:#999;text-align:center;'>No messages</p>"}
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align:center;padding:16px;border-radius:0 0 12px 12px;background:#f3f4f6;border:1px solid #e5e7eb;border-top:none;">
          <p style="margin:0;font-size:12px;color:#999;">
            Sent by SAYELE AI Assistant &bull; ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </body>
    </html>`;

  await resend.emails.send({
    from: "SAYELE AI <onboarding@resend.dev>",
    to: [params.to],
    subject: `[Handover] ${params.visitorName ?? "Visitor"} needs human assistance - ${params.assistantName}`,
    html,
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
