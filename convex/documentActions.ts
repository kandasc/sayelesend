"use node";

import { v } from "convex/values";
import OpenAI from "openai";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

// ─── System Prompts per Document Type ────────────────────────

const DOCUMENT_TYPE_PROMPTS: Record<string, string> = {
  product_presentation: `You are an expert business consultant and presentation designer for SAYELE, a leading multi-channel messaging platform in Africa.

Create a compelling, professional product/service presentation. Structure it with clear sections that would translate beautifully into slides or a PDF document.

The presentation should include:
1. **Cover / Title Slide** - Eye-catching title with subtitle
2. **Executive Summary** - 2-3 sentence hook about the product/service value
3. **Problem Statement** - The market pain point or business challenge addressed
4. **Our Solution** - What the product/service does and how it solves the problem
5. **Key Features & Benefits** - Detailed feature breakdown with concrete benefits (use bullet points)
6. **How It Works** - Step-by-step process or technical overview
7. **Use Cases** - 2-3 real-world scenarios with outcomes
8. **Competitive Advantages** - What differentiates from competitors
9. **Pricing & Packages** - If applicable, pricing tiers or engagement model
10. **Client Testimonials / Social Proof** - Placeholder for success stories
11. **Next Steps / Call to Action** - Clear CTA with contact information

Use persuasive, professional language. Include concrete numbers and statistics where possible. Make it compelling for decision-makers.`,

  tender_response: `You are an expert bid writer and tender response specialist with deep experience in technology and telecommunications in Africa.

Create a comprehensive, professional tender/RFP response document. The response should demonstrate deep understanding of the requirements, strong technical capability, and competitive value.

The response should include:
1. **Cover Letter** - Professional cover letter addressed to the issuing organization
2. **Executive Summary** - Concise summary of our understanding and proposed solution
3. **Company Profile** - SAYELE company overview, experience, certifications, and key personnel
4. **Understanding of Requirements** - Demonstrate deep understanding of the tender requirements
5. **Technical Proposal** - Detailed technical solution, architecture, and methodology
6. **Implementation Plan** - Timeline, phases, milestones, and deliverables
7. **Quality Assurance** - QA/QC processes, SLAs, and support framework
8. **Team & Resources** - Key team members, roles, and qualifications
9. **Risk Management** - Risk identification, mitigation strategies, and contingency plans
10. **Financial Proposal** - Cost breakdown, pricing model, and payment terms
11. **References & Experience** - Relevant past projects and client references
12. **Compliance Matrix** - Point-by-point compliance with tender requirements
13. **Appendices** - Technical specifications, certifications, legal documents

Use formal, precise language. Be specific and factual. Address every requirement point by point.`,

  techno_commercial: `You are an expert techno-commercial analyst and sales engineer specializing in technology solutions in Africa.

Create a thorough technical-commercial analysis/offer document. This combines technical feasibility with commercial viability to support sales and business development decisions.

The analysis should include:
1. **Executive Overview** - Brief overview of the opportunity and recommendation
2. **Client/Market Context** - Analysis of the client's industry, challenges, and needs
3. **Technical Requirements Analysis** - Detailed breakdown of technical requirements
4. **Proposed Technical Solution** - Architecture, components, integrations, and technology stack
5. **Technical Feasibility Assessment** - What's feasible, risks, and constraints
6. **Cost-Benefit Analysis** - Detailed cost structure vs. expected benefits and ROI
7. **Commercial Terms** - Pricing strategy, licensing model, payment terms
8. **Deployment Strategy** - Rollout plan, phases, and timeline
9. **Resource Requirements** - Human, technical, and infrastructure needs
10. **Risk Assessment** - Technical and commercial risks with mitigation
11. **SWOT Analysis** - Strengths, Weaknesses, Opportunities, Threats
12. **Recommendations** - Final recommendation with rationale
13. **Financial Projections** - Revenue projections, break-even analysis

Use analytical, data-driven language. Include tables, metrics, and concrete figures. Be balanced and objective.`,
};

// ─── Generate Document Action ────────────────────────────────

export const generateDocument = action({
  args: {
    documentId: v.id("generatedDocuments"),
    documentType: v.string(),
    briefing: v.string(),
    language: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const openai = new OpenAI({
      baseURL: "http://ai-gateway.hercules.app/v1",
      apiKey: process.env.HERCULES_API_KEY,
    });

    const typePrompt = DOCUMENT_TYPE_PROMPTS[args.documentType] || DOCUMENT_TYPE_PROMPTS.product_presentation;

    const systemPrompt = `${typePrompt}

IMPORTANT RULES:
- Write entirely in ${args.language}
- Return your response as a valid JSON object with this structure:
{
  "title": "Generated document title",
  "sections": [
    { "title": "Section Title", "content": "Section content in markdown format" },
    ...
  ]
}
- Each section should have rich, detailed content with proper markdown formatting (headings, bullets, bold, tables where appropriate)
- Content should be specific to the briefing provided, not generic
- Make it production-ready — something that could be sent to a client or used in a meeting
- Do NOT wrap the JSON in markdown code blocks`;

    try {
      const response = await openai.chat.completions.create({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Title: ${args.title}\n\nBriefing / Details:\n${args.briefing}`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 8000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        await ctx.runMutation(api.documents.updateDocumentSections, {
          documentId: args.documentId as Id<"generatedDocuments">,
          sections: "[]",
          status: "failed",
        });
        return;
      }

      const parsed = JSON.parse(content) as {
        title?: string;
        sections?: Array<{ title: string; content: string }>;
      };

      await ctx.runMutation(api.documents.updateDocumentSections, {
        documentId: args.documentId as Id<"generatedDocuments">,
        sections: JSON.stringify(parsed.sections || []),
        status: "completed",
        title: parsed.title || undefined,
      });
    } catch (error) {
      console.error("[DocumentAgent] Generation error:", error);
      await ctx.runMutation(api.documents.updateDocumentSections, {
        documentId: args.documentId as Id<"generatedDocuments">,
        sections: "[]",
        status: "failed",
      });
    }
  },
});

// ─── Regenerate a single section ─────────────────────────────

export const regenerateSection = action({
  args: {
    documentId: v.id("generatedDocuments"),
    sectionIndex: v.number(),
    sectionTitle: v.string(),
    instruction: v.string(),
    currentContent: v.string(),
    language: v.string(),
    documentType: v.string(),
    fullBriefing: v.string(),
  },
  handler: async (ctx, args): Promise<{ content: string }> => {
    const openai = new OpenAI({
      baseURL: "http://ai-gateway.hercules.app/v1",
      apiKey: process.env.HERCULES_API_KEY,
    });

    const systemPrompt = `You are an expert document editor. You are editing a section of a ${args.documentType.replace("_", " ")} document.

Original briefing context: ${args.fullBriefing}

The section title is: "${args.sectionTitle}"

Current content:
${args.currentContent}

Instruction from the user: ${args.instruction}

RULES:
- Write entirely in ${args.language}
- Return ONLY the improved section content in markdown format
- Keep it professional and detailed
- Do not include the section title in the output
- Make it production-ready`;

    try {
      const response = await openai.chat.completions.create({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: args.instruction },
        ],
      });

      return {
        content: response.choices[0]?.message?.content || args.currentContent,
      };
    } catch (error) {
      console.error("[DocumentAgent] Section regeneration error:", error);
      throw new ConvexError({
        message: "Failed to regenerate section",
        code: "EXTERNAL_SERVICE_ERROR",
      });
    }
  },
});
