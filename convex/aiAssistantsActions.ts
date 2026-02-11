"use node";

import { v } from "convex/values";
import OpenAI from "openai";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel.d.ts";

// Build system prompt from assistant config + knowledge base
function buildSystemPrompt(
  assistant: Doc<"aiAssistants">,
  knowledgeEntries: Doc<"aiKnowledgeBase">[],
): string {
  const activeKnowledge = knowledgeEntries.filter((e) => e.isActive);

  let prompt = `You are "${assistant.name}", an AI assistant for ${assistant.companyName}.`;

  if (assistant.companyDescription) {
    prompt += `\n\nAbout the company:\n${assistant.companyDescription}`;
  }

  if (assistant.industry) {
    prompt += `\nIndustry: ${assistant.industry}`;
  }

  // Set personality
  const personalityMap: Record<string, string> = {
    professional:
      "Be professional, clear, and concise. Use formal language and provide well-structured responses.",
    friendly:
      "Be warm, approachable, and helpful. Use a conversational tone while remaining knowledgeable.",
    casual:
      "Be relaxed and conversational. Use simple language and feel free to use appropriate emojis.",
    formal:
      "Be very formal and business-appropriate. Use polished language and proper grammar at all times.",
  };
  prompt += `\n\nCommunication style: ${personalityMap[assistant.personality] ?? personalityMap.professional}`;

  // Add knowledge base content
  if (activeKnowledge.length > 0) {
    prompt += "\n\n--- KNOWLEDGE BASE ---";
    for (const entry of activeKnowledge) {
      prompt += `\n\n### ${entry.title}`;
      if (entry.category) prompt += ` [${entry.category}]`;
      prompt += `\n${entry.content}`;
    }
    prompt += "\n\n--- END KNOWLEDGE BASE ---";
  }

  // Custom instructions override
  if (assistant.customInstructions) {
    prompt += `\n\nAdditional instructions:\n${assistant.customInstructions}`;
  }

  prompt += `\n\nIMPORTANT RULES:
- Answer questions using ONLY the knowledge base provided above and general knowledge about the company.
- If you don't know the answer, politely say so and suggest contacting the company directly.
- Never make up information that isn't in your knowledge base.
- Keep responses concise and helpful.
- Always be respectful and on-brand.`;

  return prompt;
}

// Chat with the AI assistant (used by both internal test and HTTP API)
export const chat = action({
  args: {
    assistantId: v.id("aiAssistants"),
    sessionId: v.string(),
    message: v.string(),
    channel: v.union(
      v.literal("web"),
      v.literal("sms"),
      v.literal("whatsapp"),
      v.literal("api")
    ),
    visitorName: v.optional(v.string()),
    visitorEmail: v.optional(v.string()),
    visitorPhone: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ response: string; sessionId: string }> => {
    // 1. Get the assistant
    const assistant = await ctx.runQuery(api.aiAssistants.getById, {
      assistantId: args.assistantId,
    });
    if (!assistant || !assistant.isActive) {
      return { response: "This assistant is currently unavailable.", sessionId: args.sessionId };
    }

    // 2. Get or create session
    let session = await ctx.runQuery(api.aiAssistants.getSessionByPublicId, {
      sessionId: args.sessionId,
    });

    let internalSessionId: Id<"aiChatSessions">;

    if (!session) {
      // Create new session
      internalSessionId = await ctx.runMutation(api.aiAssistants.createChatSession, {
        assistantId: args.assistantId,
        sessionId: args.sessionId,
        channel: args.channel,
        visitorName: args.visitorName,
        visitorEmail: args.visitorEmail,
        visitorPhone: args.visitorPhone,
      });
      // Increment conversation count
      await ctx.runMutation(internal.aiAssistants.incrementConversationCount, {
        assistantId: args.assistantId,
      });
    } else {
      internalSessionId = session._id;
    }

    // 3. Save user message
    await ctx.runMutation(internal.aiAssistants.addChatMessage, {
      sessionId: internalSessionId,
      role: "user",
      content: args.message,
    });

    // 4. Get conversation history
    const history = await ctx.runQuery(api.aiAssistants.getChatMessages, {
      sessionId: internalSessionId,
    });

    // 5. Get knowledge base
    const knowledgeBase = await ctx.runQuery(api.aiAssistants.getKnowledgeBase, {
      assistantId: args.assistantId,
    });

    // 6. Build messages for OpenAI
    const systemPrompt = buildSystemPrompt(assistant, knowledgeBase);

    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add recent conversation history (last 20 messages for context window)
    const recentHistory = history.slice(-20);
    for (const msg of recentHistory) {
      if (msg.role === "user" || msg.role === "assistant") {
        openaiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // 7. Call OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: openaiMessages,
      });

      const aiResponse =
        response.choices[0]?.message?.content ??
        "I apologize, but I'm unable to respond right now. Please try again.";

      // 8. Save assistant response
      await ctx.runMutation(internal.aiAssistants.addChatMessage, {
        sessionId: internalSessionId,
        role: "assistant",
        content: aiResponse,
      });

      return { response: aiResponse, sessionId: args.sessionId };
    } catch (error) {
      const errorMsg =
        "I'm experiencing technical difficulties. Please try again later or contact support.";

      await ctx.runMutation(internal.aiAssistants.addChatMessage, {
        sessionId: internalSessionId,
        role: "assistant",
        content: errorMsg,
      });

      return { response: errorMsg, sessionId: args.sessionId };
    }
  },
});

// Test chat directly from the dashboard (requires auth)
export const testChat = action({
  args: {
    assistantId: v.id("aiAssistants"),
    message: v.string(),
  },
  handler: async (ctx, args): Promise<{ response: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Use a test session ID
    const testSessionId = `test_${identity.tokenIdentifier}_${args.assistantId}`;

    const result = await ctx.runAction(api.aiAssistantsActions.chat, {
      assistantId: args.assistantId,
      sessionId: testSessionId,
      message: args.message,
      channel: "web",
    });

    return { response: result.response };
  },
});
