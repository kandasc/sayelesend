"use node";

import { v } from "convex/values";
import OpenAI from "openai";
import { action, internalAction } from "./_generated/server";

// AI model for email assistant tasks
const AI_MODEL = "gpt-4o-mini";

function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ─── Summarize Email ───────────────────────────────────────────────────────

export const summarizeEmail = action({
  args: {
    emailContent: v.string(),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    summary: string;
    keyPoints: string[];
    sentiment: string;
    actionItems: string[];
    priority: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const openai = getOpenAI();
    const lang = args.language || "English";

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert email analyst. Analyze the email and return a JSON object with:
- "summary": A concise 2-3 sentence summary
- "keyPoints": Array of 3-5 key points extracted from the email
- "sentiment": One of "positive", "negative", "neutral", "urgent"
- "actionItems": Array of action items or follow-ups needed
- "priority": One of "high", "medium", "low"

Respond in ${lang}. Return ONLY valid JSON, no markdown fences.`,
        },
        { role: "user", content: args.emailContent },
      ],
      max_tokens: 1024,
    });

    const content = response.choices[0]?.message?.content ?? "";
    try {
      const parsed = JSON.parse(content) as {
        summary: string;
        keyPoints: string[];
        sentiment: string;
        actionItems: string[];
        priority: string;
      };
      return {
        summary: parsed.summary || "Unable to summarize.",
        keyPoints: parsed.keyPoints || [],
        sentiment: parsed.sentiment || "neutral",
        actionItems: parsed.actionItems || [],
        priority: parsed.priority || "medium",
      };
    } catch {
      return {
        summary: content || "Unable to summarize this email.",
        keyPoints: [],
        sentiment: "neutral",
        actionItems: [],
        priority: "medium",
      };
    }
  },
});

// ─── Draft Reply ───────────────────────────────────────────────────────────

export const draftReply = action({
  args: {
    originalEmail: v.string(),
    instructions: v.optional(v.string()),
    tone: v.optional(
      v.union(
        v.literal("professional"),
        v.literal("friendly"),
        v.literal("formal"),
        v.literal("casual"),
        v.literal("apologetic"),
        v.literal("assertive")
      )
    ),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ reply: string; subject: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const openai = getOpenAI();
    const tone = args.tone || "professional";
    const lang = args.language || "English";

    const toneMap: Record<string, string> = {
      professional: "Be professional, clear, and courteous.",
      friendly: "Be warm, approachable, and helpful.",
      formal: "Use very formal and business-appropriate language.",
      casual: "Be relaxed and conversational.",
      apologetic: "Be empathetic and apologetic where appropriate.",
      assertive: "Be direct, firm, and confident while remaining polite.",
    };

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert email writer. Draft a reply to the following email.
Tone: ${toneMap[tone]}
${args.instructions ? `Additional instructions: ${args.instructions}` : ""}

Respond in ${lang}. Return a JSON object with:
- "reply": The full reply email body (without the greeting/closing — just the body)
- "subject": A suggested subject line (with Re: prefix if appropriate)

Return ONLY valid JSON, no markdown fences.`,
        },
        { role: "user", content: args.originalEmail },
      ],
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content ?? "";
    try {
      const parsed = JSON.parse(content) as { reply: string; subject: string };
      return {
        reply: parsed.reply || "Unable to draft a reply.",
        subject: parsed.subject || "Re: Your email",
      };
    } catch {
      return {
        reply: content || "Unable to draft a reply.",
        subject: "Re: Your email",
      };
    }
  },
});

// ─── Compose New Email ─────────────────────────────────────────────────────

export const composeEmail = action({
  args: {
    prompt: v.string(),
    tone: v.optional(
      v.union(
        v.literal("professional"),
        v.literal("friendly"),
        v.literal("formal"),
        v.literal("casual"),
        v.literal("marketing"),
        v.literal("persuasive")
      )
    ),
    recipientContext: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    subject: string;
    body: string;
    greeting: string;
    closing: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const openai = getOpenAI();
    const tone = args.tone || "professional";
    const lang = args.language || "English";

    const toneMap: Record<string, string> = {
      professional: "Professional and business-appropriate.",
      friendly: "Warm and approachable.",
      formal: "Very formal and business-like.",
      casual: "Relaxed and conversational.",
      marketing: "Persuasive marketing language with call-to-action.",
      persuasive: "Convincing and compelling.",
    };

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert email writer. Compose an email based on the user's instructions.
Tone: ${toneMap[tone]}
${args.recipientContext ? `Recipient context: ${args.recipientContext}` : ""}

Respond in ${lang}. Return a JSON object with:
- "subject": The subject line
- "greeting": The greeting (e.g., "Dear John,")
- "body": The email body
- "closing": The closing (e.g., "Best regards,")

Return ONLY valid JSON, no markdown fences.`,
        },
        { role: "user", content: args.prompt },
      ],
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content ?? "";
    try {
      const parsed = JSON.parse(content) as {
        subject: string;
        body: string;
        greeting: string;
        closing: string;
      };
      return {
        subject: parsed.subject || "New Email",
        body: parsed.body || "",
        greeting: parsed.greeting || "Hello,",
        closing: parsed.closing || "Best regards,",
      };
    } catch {
      return {
        subject: "New Email",
        body: content || "Unable to compose email.",
        greeting: "Hello,",
        closing: "Best regards,",
      };
    }
  },
});

// ─── Review / Proofread Document ───────────────────────────────────────────

export const reviewDocument = action({
  args: {
    content: v.string(),
    reviewType: v.optional(
      v.union(
        v.literal("grammar"),
        v.literal("style"),
        v.literal("clarity"),
        v.literal("comprehensive")
      )
    ),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    correctedText: string;
    changes: string[];
    score: number;
    suggestions: string[];
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const openai = getOpenAI();
    const reviewType = args.reviewType || "comprehensive";
    const lang = args.language || "English";

    const reviewInstructions: Record<string, string> = {
      grammar: "Focus on grammar, spelling, and punctuation errors.",
      style: "Focus on writing style, tone consistency, and word choice.",
      clarity: "Focus on clarity, readability, and logical flow.",
      comprehensive:
        "Perform a comprehensive review: grammar, style, clarity, and overall quality.",
    };

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert editor and proofreader. ${reviewInstructions[reviewType]}

Respond in ${lang}. Return a JSON object with:
- "correctedText": The full corrected text
- "changes": Array of specific changes made (e.g., "Changed 'their' to 'there' in paragraph 2")
- "score": Quality score from 1-100
- "suggestions": Array of improvement suggestions

Return ONLY valid JSON, no markdown fences.`,
        },
        { role: "user", content: args.content },
      ],
      max_tokens: 2048,
    });

    const contentStr = response.choices[0]?.message?.content ?? "";
    try {
      const parsed = JSON.parse(contentStr) as {
        correctedText: string;
        changes: string[];
        score: number;
        suggestions: string[];
      };
      return {
        correctedText: parsed.correctedText || args.content,
        changes: parsed.changes || [],
        score: parsed.score || 0,
        suggestions: parsed.suggestions || [],
      };
    } catch {
      return {
        correctedText: args.content,
        changes: [],
        score: 0,
        suggestions: [contentStr || "Unable to review the document."],
      };
    }
  },
});

// ─── Improve Writing ───────────────────────────────────────────────────────

export const improveWriting = action({
  args: {
    text: v.string(),
    improvement: v.union(
      v.literal("shorten"),
      v.literal("expand"),
      v.literal("professional"),
      v.literal("simplify"),
      v.literal("persuasive"),
      v.literal("translate")
    ),
    targetLanguage: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ improvedText: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const openai = getOpenAI();

    const instructions: Record<string, string> = {
      shorten: "Make this text shorter and more concise while keeping all key information.",
      expand: "Expand this text with more detail, context, and supporting information.",
      professional: "Rewrite this text to be more professional and business-appropriate.",
      simplify: "Simplify this text to be easier to understand. Use plain language.",
      persuasive: "Rewrite this text to be more persuasive and compelling.",
      translate: `Translate this text to ${args.targetLanguage || "French"}.`,
    };

    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: `${instructions[args.improvement]}
Return ONLY the improved text, no quotes, no explanations, no extra formatting.`,
        },
        { role: "user", content: args.text },
      ],
      max_tokens: 2048,
    });

    return {
      improvedText: response.choices[0]?.message?.content ?? args.text,
    };
  },
});

// ─── Internal variants for HTTP API ────────────────────────────────────────
// These mirror the authenticated actions but skip auth checks (auth is
// handled by API-key verification in the HTTP layer).

export const summarizeEmailInternal = internalAction({
  args: {
    emailContent: v.string(),
    language: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{
    summary: string;
    keyPoints: string[];
    sentiment: string;
    actionItems: string[];
    priority: string;
  }> => {
    const openai = getOpenAI();
    const lang = args.language || "English";
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert email analyst. Analyze the email and return a JSON object with:
- "summary": A concise 2-3 sentence summary
- "keyPoints": Array of 3-5 key points
- "sentiment": One of "positive", "negative", "neutral", "urgent"
- "actionItems": Array of action items needed
- "priority": One of "high", "medium", "low"
Respond in ${lang}. Return ONLY valid JSON, no markdown fences.`,
        },
        { role: "user", content: args.emailContent },
      ],
      max_tokens: 1024,
    });
    const content = response.choices[0]?.message?.content ?? "";
    try {
      const p = JSON.parse(content) as {
        summary: string; keyPoints: string[]; sentiment: string; actionItems: string[]; priority: string;
      };
      return { summary: p.summary || "", keyPoints: p.keyPoints || [], sentiment: p.sentiment || "neutral", actionItems: p.actionItems || [], priority: p.priority || "medium" };
    } catch {
      return { summary: content, keyPoints: [], sentiment: "neutral", actionItems: [], priority: "medium" };
    }
  },
});

export const draftReplyInternal = internalAction({
  args: {
    originalEmail: v.string(),
    instructions: v.optional(v.string()),
    tone: v.optional(v.union(v.literal("professional"), v.literal("friendly"), v.literal("formal"), v.literal("casual"), v.literal("apologetic"), v.literal("assertive"))),
    language: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{ reply: string; subject: string }> => {
    const openai = getOpenAI();
    const tone = args.tone || "professional";
    const lang = args.language || "English";
    const toneMap: Record<string, string> = {
      professional: "Be professional, clear, and courteous.", friendly: "Be warm, approachable, and helpful.",
      formal: "Use very formal language.", casual: "Be relaxed and conversational.",
      apologetic: "Be empathetic and apologetic.", assertive: "Be direct, firm, and confident.",
    };
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: `Draft a reply. Tone: ${toneMap[tone]}. ${args.instructions ? `Instructions: ${args.instructions}` : ""} Respond in ${lang}. Return JSON: {"reply":"...","subject":"..."}. ONLY valid JSON.` },
        { role: "user", content: args.originalEmail },
      ],
      max_tokens: 1500,
    });
    const content = response.choices[0]?.message?.content ?? "";
    try { const p = JSON.parse(content) as { reply: string; subject: string }; return { reply: p.reply || content, subject: p.subject || "Re: Your email" }; }
    catch { return { reply: content, subject: "Re: Your email" }; }
  },
});

export const composeEmailInternal = internalAction({
  args: {
    prompt: v.string(),
    tone: v.optional(v.union(v.literal("professional"), v.literal("friendly"), v.literal("formal"), v.literal("casual"), v.literal("marketing"), v.literal("persuasive"))),
    recipientContext: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{ subject: string; body: string; greeting: string; closing: string }> => {
    const openai = getOpenAI();
    const tone = args.tone || "professional";
    const lang = args.language || "English";
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: `Compose an email. Tone: ${tone}. ${args.recipientContext ? `Recipient: ${args.recipientContext}` : ""} Respond in ${lang}. Return JSON: {"subject":"...","greeting":"...","body":"...","closing":"..."}. ONLY valid JSON.` },
        { role: "user", content: args.prompt },
      ],
      max_tokens: 1500,
    });
    const content = response.choices[0]?.message?.content ?? "";
    try { const p = JSON.parse(content) as { subject: string; body: string; greeting: string; closing: string }; return { subject: p.subject || "", body: p.body || content, greeting: p.greeting || "Hello,", closing: p.closing || "Best regards," }; }
    catch { return { subject: "New Email", body: content, greeting: "Hello,", closing: "Best regards," }; }
  },
});

export const reviewDocumentInternal = internalAction({
  args: {
    content: v.string(),
    reviewType: v.optional(v.union(v.literal("grammar"), v.literal("style"), v.literal("clarity"), v.literal("comprehensive"))),
    language: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{ correctedText: string; changes: string[]; score: number; suggestions: string[] }> => {
    const openai = getOpenAI();
    const reviewType = args.reviewType || "comprehensive";
    const lang = args.language || "English";
    const reviewInstructions: Record<string, string> = {
      grammar: "Focus on grammar, spelling, punctuation.", style: "Focus on writing style and word choice.",
      clarity: "Focus on clarity and readability.", comprehensive: "Full review: grammar, style, clarity.",
    };
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: `Expert editor. ${reviewInstructions[reviewType]} Respond in ${lang}. Return JSON: {"correctedText":"...","changes":[],"score":0,"suggestions":[]}. ONLY valid JSON.` },
        { role: "user", content: args.content },
      ],
      max_tokens: 2048,
    });
    const c = response.choices[0]?.message?.content ?? "";
    try { const p = JSON.parse(c) as { correctedText: string; changes: string[]; score: number; suggestions: string[] }; return { correctedText: p.correctedText || args.content, changes: p.changes || [], score: p.score || 0, suggestions: p.suggestions || [] }; }
    catch { return { correctedText: args.content, changes: [], score: 0, suggestions: [c] }; }
  },
});

export const improveWritingInternal = internalAction({
  args: {
    text: v.string(),
    improvement: v.union(v.literal("shorten"), v.literal("expand"), v.literal("professional"), v.literal("simplify"), v.literal("persuasive"), v.literal("translate")),
    targetLanguage: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{ improvedText: string }> => {
    const openai = getOpenAI();
    const instructions: Record<string, string> = {
      shorten: "Make shorter and concise.", expand: "Expand with more detail.",
      professional: "Rewrite professionally.", simplify: "Simplify to plain language.",
      persuasive: "Rewrite persuasively.", translate: `Translate to ${args.targetLanguage || "French"}.`,
    };
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: `${instructions[args.improvement]} Return ONLY the improved text.` },
        { role: "user", content: args.text },
      ],
      max_tokens: 2048,
    });
    return { improvedText: response.choices[0]?.message?.content ?? args.text };
  },
});
