"use node";

import { v } from "convex/values";
import OpenAI from "openai";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { ConvexError } from "convex/values";

// ─── Platform-specific guidelines ─────────────────────────────

const PLATFORM_GUIDELINES: Record<string, string> = {
  facebook:
    "Optimize for Facebook: conversational tone, 1-3 paragraphs, encourage engagement with questions. Ideal length: 40-80 words. Can use emojis sparingly.",
  instagram:
    "Optimize for Instagram: visual-first, compelling caption, line breaks for readability. Use relevant hashtags (5-15). Max 2,200 chars. Start with a hook.",
  x: "Optimize for X (Twitter): concise and punchy, under 280 characters. Use 1-3 hashtags max. Make it retweetable.",
  linkedin:
    "Optimize for LinkedIn: professional and insightful, thought-leadership style. 150-300 words. Use line breaks and bullet points. Include a professional CTA.",
  whatsapp:
    "Optimize for WhatsApp: short, direct, personal. Keep under 100 words. Use simple language. Include a clear next step.",
  tiktok:
    "Optimize for TikTok: trendy, energetic, Gen-Z friendly tone. Include video concept ideas and trending sound suggestions. Use 3-5 hashtags.",
  general:
    "Create versatile content that can be adapted across multiple platforms. 100-200 words. Include hashtag suggestions.",
};

const TONE_DESCRIPTIONS: Record<string, string> = {
  professional: "Professional and authoritative. Use industry-appropriate language. Build credibility.",
  casual: "Relaxed and friendly. Use everyday language. Be approachable and relatable.",
  humorous: "Light-hearted and witty. Use humor naturally. Make people smile or laugh.",
  inspirational: "Motivational and uplifting. Use powerful words. Inspire action and positive emotion.",
  promotional: "Sales-oriented but not pushy. Highlight value propositions. Create urgency naturally.",
  educational: "Informative and helpful. Break down complex topics. Provide actionable tips.",
};

// ─── Generate Social Media Post ───────────────────────────────

export const generatePost = action({
  args: {
    topic: v.string(),
    platform: v.string(),
    tone: v.string(),
    language: v.string(),
    additionalContext: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{
    text: string;
    hashtags: string;
    callToAction: string;
  }> => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const platformGuide = PLATFORM_GUIDELINES[args.platform] || PLATFORM_GUIDELINES.general;
    const toneGuide = TONE_DESCRIPTIONS[args.tone] || TONE_DESCRIPTIONS.professional;

    const systemPrompt = `You are an expert social media marketing content creator.
Your job is to create engaging, high-quality social media posts.

Platform: ${platformGuide}

Tone: ${toneGuide}

Language: Write entirely in ${args.language}.

Rules:
- Create original, engaging content
- Include a compelling hook at the start
- Ensure the post sounds natural, not AI-generated
- Adapt the format to the platform
- If the language is not English, write the ENTIRE post including hashtags in that language

Respond in JSON format:
{
  "text": "The main post content",
  "hashtags": "Relevant hashtags separated by spaces",
  "callToAction": "A clear call to action"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Create a ${args.platform} post about: ${args.topic}${args.additionalContext ? `\n\nAdditional context: ${args.additionalContext}` : ""}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new ConvexError({ message: "No content generated", code: "EXTERNAL_SERVICE_ERROR" });
      }

      const parsed = JSON.parse(content) as {
        text?: string;
        hashtags?: string;
        callToAction?: string;
      };

      return {
        text: parsed.text || "",
        hashtags: parsed.hashtags || "",
        callToAction: parsed.callToAction || "",
      };
    } catch (error) {
      if (error instanceof ConvexError) throw error;
      console.error("[Marketing] Generation error:", error);
      throw new ConvexError({
        message: "Failed to generate content. Please try again.",
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }
  },
});

// ─── Rewrite / Improve Content ────────────────────────────────

export const improveContent = action({
  args: {
    text: v.string(),
    instruction: v.string(),
    language: v.string(),
  },
  handler: async (_ctx, args): Promise<{ text: string }> => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a social media content editor. Improve the given content based on the instruction. Write in ${args.language}. Return ONLY the improved text, nothing else.`,
          },
          {
            role: "user",
            content: `Original:\n${args.text}\n\nInstruction: ${args.instruction}`,
          },
        ],
      });

      return { text: response.choices[0]?.message?.content || args.text };
    } catch (error) {
      console.error("[Marketing] Improve error:", error);
      throw new ConvexError({
        message: "Failed to improve content",
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }
  },
});

// ─── Generate Multiple Variations ─────────────────────────────

export const generateVariations = action({
  args: {
    topic: v.string(),
    platform: v.string(),
    tone: v.string(),
    language: v.string(),
    count: v.number(),
  },
  handler: async (_ctx, args): Promise<{ variations: string[] }> => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const platformGuide = PLATFORM_GUIDELINES[args.platform] || PLATFORM_GUIDELINES.general;
    const toneGuide = TONE_DESCRIPTIONS[args.tone] || TONE_DESCRIPTIONS.professional;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert social media content creator. Generate ${args.count} different variations of a social media post.
Platform: ${platformGuide}
Tone: ${toneGuide}
Language: Write entirely in ${args.language}.

Return JSON: { "variations": ["variation1", "variation2", ...] }`,
          },
          { role: "user", content: `Topic: ${args.topic}` },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return { variations: [] };

      const parsed = JSON.parse(content) as { variations?: string[] };
      return { variations: parsed.variations || [] };
    } catch (error) {
      console.error("[Marketing] Variations error:", error);
      throw new ConvexError({
        message: "Failed to generate variations",
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }
  },
});

// ─── Generate Marketing Image ────────────────────────────────

export const generateMarketingImage = action({
  args: {
    prompt: v.string(),
    style: v.string(),
    platform: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    storageId: string;
    imageUrl: string;
  }> => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Build an enhanced prompt with style and platform context
    const platformHint = args.platform
      ? `Optimized for ${args.platform} social media.`
      : "";
    const aspectHint = args.aspectRatio
      ? `Aspect ratio: ${args.aspectRatio}.`
      : "";

    const fullPrompt = `Create a professional marketing image: ${args.prompt}
Style: ${args.style}. ${platformHint} ${aspectHint}
The image should be clean, visually appealing, and suitable for social media marketing. No text or watermarks unless explicitly requested.`;

    try {
      const response = await openai.responses.create({
        model: "gpt-5",
        instructions: "Generate a high-quality marketing image from the user's prompt.",
        input: fullPrompt,
        tools: [{ type: "image_generation" }],
      });

      // Extract image data from response
      const imageData = response.output
        .filter((output) => output.type === "image_generation_call")
        .map((output) => {
          if (output.type === "image_generation_call") {
            return output.result;
          }
          return "";
        })
        .filter(Boolean);

      if (imageData.length === 0) {
        throw new ConvexError({
          message: "No image was generated. Please try a different prompt.",
          code: "EXTERNAL_SERVICE_ERROR",
        });
      }

      const imageBase64 = imageData[0];

      if (!imageBase64) {
        throw new ConvexError({
          message: "No image data received. Please try again.",
          code: "EXTERNAL_SERVICE_ERROR",
        });
      }

      // Store in Convex file storage
      const byteArray = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
      const storageId = await ctx.storage.store(
        new Blob([byteArray], { type: "image/png" })
      );

      const imageUrl = await ctx.storage.getUrl(storageId);

      return {
        storageId: storageId as string,
        imageUrl: imageUrl || "",
      };
    } catch (error) {
      if (error instanceof ConvexError) throw error;
      console.error("[Marketing] Image generation error:", error);
      throw new ConvexError({
        message: "Failed to generate image. Please try again.",
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }
  },
});

// ─── Generate Image Prompt Suggestions ───────────────────────

export const suggestImagePrompts = action({
  args: {
    topic: v.string(),
    platform: v.optional(v.string()),
    style: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{ suggestions: string[] }> => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a creative marketing image consultant. Generate 4 detailed image prompt suggestions for social media marketing images. Each prompt should be specific, visual, and describe a complete scene. ${args.platform ? `Optimized for ${args.platform}.` : ""} ${args.style ? `Style preference: ${args.style}.` : ""}

Return JSON: { "suggestions": ["prompt1", "prompt2", "prompt3", "prompt4"] }`,
          },
          { role: "user", content: `Topic: ${args.topic}` },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return { suggestions: [] };

      const parsed = JSON.parse(content) as { suggestions?: string[] };
      return { suggestions: parsed.suggestions || [] };
    } catch (error) {
      console.error("[Marketing] Prompt suggestions error:", error);
      throw new ConvexError({
        message: "Failed to generate suggestions",
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }
  },
});
