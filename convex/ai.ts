"use node";

import { v } from "convex/values";
import OpenAI from "openai";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const generateMessage = action({
  args: {
    prompt: v.string(),
    channel: v.optional(v.union(
      v.literal("sms"),
      v.literal("whatsapp"),
      v.literal("telegram"),
      v.literal("facebook_messenger")
    )),
    tone: v.optional(v.union(
      v.literal("professional"),
      v.literal("friendly"),
      v.literal("casual"),
      v.literal("formal"),
      v.literal("marketing")
    )),
  },
  handler: async (ctx, { prompt, channel = "sms", tone = "professional" }) => {
    const openai = new OpenAI({
      baseURL: "http://ai-gateway.hercules.app/v1",
      apiKey: process.env.HERCULES_API_KEY,
    });

    // Channel-specific instructions
    const channelInstructions: Record<string, string> = {
      sms: "Generate a concise SMS message (max 160 characters). Be brief and direct.",
      whatsapp: "Generate a WhatsApp message. You can use emojis and formatting. Keep it conversational.",
      telegram: "Generate a Telegram message. You can use markdown formatting and be more detailed.",
      facebook_messenger: "Generate a Facebook Messenger message. Be friendly and conversational.",
    };

    const toneInstructions: Record<string, string> = {
      professional: "Use professional language and formal tone.",
      friendly: "Use friendly and warm language.",
      casual: "Use casual, relaxed language.",
      formal: "Use very formal and business-appropriate language.",
      marketing: "Use persuasive marketing language with call-to-action.",
    };

    const systemPrompt = `You are a messaging assistant helping to compose messages for ${channel}.
${channelInstructions[channel]}
${toneInstructions[tone]}

Important: Return ONLY the message text, no quotes, no explanations, no extra formatting.`;

    const response = await openai.chat.completions.create({
      model: "openai/gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    return {
      message: response.choices[0]?.message?.content ?? "",
    };
  },
});

export const improveMessage = action({
  args: {
    message: v.string(),
    improvement: v.union(
      v.literal("shorten"),
      v.literal("expand"),
      v.literal("professional"),
      v.literal("friendly"),
      v.literal("fix_grammar"),
      v.literal("add_emojis")
    ),
  },
  handler: async (ctx, { message, improvement }) => {
    const openai = new OpenAI({
      baseURL: "http://ai-gateway.hercules.app/v1",
      apiKey: process.env.HERCULES_API_KEY,
    });

    const improvementInstructions: Record<string, string> = {
      shorten: "Make this message shorter and more concise while keeping the key points.",
      expand: "Expand this message with more detail and context.",
      professional: "Rewrite this message to be more professional and formal.",
      friendly: "Rewrite this message to be more friendly and warm.",
      fix_grammar: "Fix any grammar, spelling, and punctuation errors in this message.",
      add_emojis: "Add appropriate emojis to make this message more engaging (suitable for WhatsApp/social media).",
    };

    const systemPrompt = `You are a messaging assistant. ${improvementInstructions[improvement]}
Return ONLY the improved message text, no quotes, no explanations.`;

    const response = await openai.chat.completions.create({
      model: "openai/gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
    });

    return {
      improvedMessage: response.choices[0]?.message?.content ?? message,
    };
  },
});

export const generateBulkMessages = action({
  args: {
    prompt: v.string(),
    count: v.number(),
    channel: v.optional(v.union(
      v.literal("sms"),
      v.literal("whatsapp"),
      v.literal("telegram"),
      v.literal("facebook_messenger")
    )),
    personalize: v.optional(v.boolean()),
  },
  handler: async (ctx, { prompt, count, channel = "sms", personalize = false }) => {
    const openai = new OpenAI({
      baseURL: "http://ai-gateway.hercules.app/v1",
      apiKey: process.env.HERCULES_API_KEY,
    });

    const channelInstructions: Record<string, string> = {
      sms: "Each message should be concise (max 160 characters).",
      whatsapp: "Each message can use emojis and be conversational.",
      telegram: "Each message can be more detailed.",
      facebook_messenger: "Each message should be friendly and engaging.",
    };

    const personalizeInstruction = personalize 
      ? "Make each message unique and personalized with slight variations."
      : "Generate similar messages with variations.";

    const systemPrompt = `You are a bulk messaging assistant. Generate ${count} different messages for ${channel}.
${channelInstructions[channel]}
${personalizeInstruction}

Return ONLY a JSON array of messages, like: ["message 1", "message 2", ...]
No explanations, no extra text.`;

    const response = await openai.chat.completions.create({
      model: "openai/gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content ?? "[]";
    
    try {
      const messages = JSON.parse(content) as string[];
      return {
        messages: messages.slice(0, count),
      };
    } catch {
      // Fallback: split by newlines if JSON parsing fails
      const messages = content
        .split("\n")
        .filter(line => line.trim() && !line.startsWith("[") && !line.startsWith("]"))
        .map(line => line.replace(/^["'\d.-]\s*/, "").replace(/["']$/, ""))
        .slice(0, count);
      
      return { messages };
    }
  },
});

export const chatAssistant = action({
  args: {
    message: v.string(),
    context: v.optional(v.string()),
  },
  handler: async (ctx, { message, context }) => {
    const openai = new OpenAI({
      baseURL: "http://ai-gateway.hercules.app/v1",
      apiKey: process.env.HERCULES_API_KEY,
    });

    const systemPrompt = `You are a helpful messaging platform assistant for SAYELE Message.
You help users with:
- Composing messages for SMS, WhatsApp, Telegram, and Facebook Messenger
- Best practices for bulk messaging
- Marketing message tips
- Message delivery and troubleshooting
- Platform features and how to use them

Be helpful, concise, and actionable.
${context ? `\n\nContext: ${context}` : ""}`;

    const response = await openai.chat.completions.create({
      model: "openai/gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
    });

    return {
      response: response.choices[0]?.message?.content ?? "I'm sorry, I couldn't generate a response.",
    };
  },
});

export const generateTemplateVariations = action({
  args: {
    template: v.string(),
    count: v.number(),
  },
  handler: async (ctx, { template, count }) => {
    const openai = new OpenAI({
      baseURL: "http://ai-gateway.hercules.app/v1",
      apiKey: process.env.HERCULES_API_KEY,
    });

    const systemPrompt = `You are a template variation generator. Given a message template, create ${count} variations that:
- Maintain the same meaning and variables (keep {{variable}} format exactly as is)
- Use different wording and phrasing
- Keep the same tone and style
- Are suitable for the same use case

Return ONLY a JSON array of variations, like: ["variation 1", "variation 2", ...]`;

    const response = await openai.chat.completions.create({
      model: "openai/gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: template },
      ],
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content ?? "[]";
    
    try {
      const variations = JSON.parse(content) as string[];
      return {
        variations: variations.slice(0, count),
      };
    } catch {
      return {
        variations: [template],
      };
    }
  },
});

export const suggestImprovements = action({
  args: {
    message: v.string(),
    channel: v.optional(v.string()),
  },
  handler: async (ctx, { message, channel = "sms" }) => {
    const openai = new OpenAI({
      baseURL: "http://ai-gateway.hercules.app/v1",
      apiKey: process.env.HERCULES_API_KEY,
    });

    const systemPrompt = `You are a message optimization expert. Analyze the message and provide 3-5 specific suggestions to improve it for ${channel}.
Consider:
- Clarity and conciseness
- Channel-specific best practices
- Grammar and spelling
- Engagement and call-to-action
- Length optimization

Return ONLY a JSON array of suggestions, like: ["suggestion 1", "suggestion 2", ...]`;

    const response = await openai.chat.completions.create({
      model: "openai/gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content ?? "[]";
    
    try {
      const suggestions = JSON.parse(content) as string[];
      return {
        suggestions,
      };
    } catch {
      return {
        suggestions: ["Consider reviewing your message for clarity and engagement."],
      };
    }
  },
});
