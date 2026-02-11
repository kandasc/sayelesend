"use node";

import { v } from "convex/values";
import OpenAI from "openai";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel.d.ts";

// ─── System Prompt Builder ──────────────────────────────────────────────────

function buildSystemPrompt(
  assistant: Doc<"aiAssistants">,
  knowledgeEntries: Doc<"aiKnowledgeBase">[],
  hasTasks: boolean,
): string {
  const activeKnowledge = knowledgeEntries.filter((e) => e.isActive);

  let prompt = `You are "${assistant.name}", an AI assistant for ${assistant.companyName}.`;

  if (assistant.companyDescription) {
    prompt += `\n\nAbout the company:\n${assistant.companyDescription}`;
  }
  if (assistant.industry) {
    prompt += `\nIndustry: ${assistant.industry}`;
  }

  const personalityMap: Record<string, string> = {
    professional: "Be professional, clear, and concise. Use formal language.",
    friendly: "Be warm, approachable, and helpful. Use a conversational tone.",
    casual: "Be relaxed and conversational. Use simple language and appropriate emojis.",
    formal: "Be very formal and business-appropriate. Use polished language.",
  };
  prompt += `\n\nCommunication style: ${personalityMap[assistant.personality] ?? personalityMap.professional}`;

  if (activeKnowledge.length > 0) {
    prompt += "\n\n--- KNOWLEDGE BASE ---";
    for (const entry of activeKnowledge) {
      prompt += `\n\n### ${entry.title}`;
      if (entry.category) prompt += ` [${entry.category}]`;
      prompt += ` (Source: ${entry.sourceType})`;
      prompt += `\n${entry.content}`;
    }
    prompt += "\n\n--- END KNOWLEDGE BASE ---";
  }

  if (assistant.customInstructions) {
    prompt += `\n\nAdditional instructions:\n${assistant.customInstructions}`;
  }

  prompt += `\n\nIMPORTANT RULES:
- Answer questions using the knowledge base and general knowledge about the company.
- If you don't know the answer, politely say so and suggest contacting the company directly.
- Never make up information that isn't in your knowledge base.
- Keep responses concise and helpful.
- Always be respectful and on-brand.`;

  if (hasTasks) {
    prompt += `\n- When a user request matches an available task, use the corresponding function to execute it.
- After executing a task, summarize the result in a natural, user-friendly way.
- If a task requires parameters that the user hasn't provided, ask them for the missing information before executing.`;
  }

  prompt += `\n- If the user asks to speak with a human, a real person, or an agent, respond with exactly: "[HANDOVER_REQUEST]" followed by a brief explanation of why they need human assistance.
- If you cannot answer a question after 2 attempts, suggest that the user can request to speak with a human agent for further help.`;

  return prompt;
}

// ─── Convert tasks to OpenAI tools ──────────────────────────────────────────

type TaskParam = {
  name: string;
  description: string;
  type: "string" | "number" | "boolean";
  required: boolean;
};

function tasksToOpenAITools(
  tasks: Doc<"aiAssistantTasks">[],
): OpenAI.ChatCompletionTool[] {
  return tasks.map((task) => {
    const properties: Record<string, { type: string; description: string }> = {};
    const required: string[] = [];

    for (const param of task.parameters as TaskParam[]) {
      properties[param.name] = {
        type: param.type === "number" ? "number" : param.type === "boolean" ? "boolean" : "string",
        description: param.description,
      };
      if (param.required) {
        required.push(param.name);
      }
    }

    return {
      type: "function" as const,
      function: {
        name: `task_${task._id}`,
        description: task.description,
        parameters: {
          type: "object",
          properties,
          required,
        },
      },
    };
  });
}

// ─── Execute a task by calling client's API ─────────────────────────────────

async function executeTask(
  task: Doc<"aiAssistantTasks">,
  params: Record<string, unknown>,
): Promise<{ status: number; body: string; success: boolean }> {
  try {
    // Build URL: for GET, append params as query string
    let url = task.apiEndpoint;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Parse custom headers
    if (task.headers) {
      try {
        const customHeaders = JSON.parse(task.headers) as Record<string, string>;
        Object.assign(headers, customHeaders);
      } catch {
        // Ignore invalid headers JSON
      }
    }

    let body: string | undefined;

    if (task.httpMethod === "GET" || task.httpMethod === "DELETE") {
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        queryParams.set(key, String(value));
      }
      const separator = url.includes("?") ? "&" : "?";
      if (queryParams.toString()) {
        url = `${url}${separator}${queryParams.toString()}`;
      }
    } else {
      // For POST/PUT, use body template if available
      if (task.bodyTemplate) {
        let templateBody = task.bodyTemplate;
        for (const [key, value] of Object.entries(params)) {
          templateBody = templateBody.replace(
            new RegExp(`\\{\\{${key}\\}\\}`, "g"),
            String(value),
          );
        }
        body = templateBody;
      } else {
        body = JSON.stringify(params);
      }
    }

    const response = await fetch(url, {
      method: task.httpMethod,
      headers,
      body,
    });

    const responseText = await response.text();

    return {
      status: response.status,
      body: responseText.slice(0, 2000), // Limit response size
      success: response.ok,
    };
  } catch (error) {
    return {
      status: 0,
      body: error instanceof Error ? error.message : "Request failed",
      success: false,
    };
  }
}

// ─── Main Chat Action ───────────────────────────────────────────────────────

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
    // 1. Get assistant
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
      internalSessionId = await ctx.runMutation(api.aiAssistants.createChatSession, {
        assistantId: args.assistantId,
        sessionId: args.sessionId,
        channel: args.channel,
        visitorName: args.visitorName,
        visitorEmail: args.visitorEmail,
        visitorPhone: args.visitorPhone,
      });
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

    // 4. Get context data
    const [history, knowledgeBase, activeTasks] = await Promise.all([
      ctx.runQuery(api.aiAssistants.getChatMessages, { sessionId: internalSessionId }),
      ctx.runQuery(api.aiAssistants.getKnowledgeBase, { assistantId: args.assistantId }),
      ctx.runQuery(api.aiAssistants.getActiveTasksInternal, { assistantId: args.assistantId }),
    ]);

    // 5. Build OpenAI messages
    const systemPrompt = buildSystemPrompt(assistant, knowledgeBase, activeTasks.length > 0);
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add recent history (last 20 messages)
    const recentHistory = history.slice(-20);
    for (const msg of recentHistory) {
      if (msg.role === "user" || msg.role === "assistant") {
        openaiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // 6. Build tools from active tasks
    const tools = activeTasks.length > 0 ? tasksToOpenAITools(activeTasks) : undefined;

    // 7. Call AI via Hercules AI Gateway
    const openai = new OpenAI({
      baseURL: "http://ai-gateway.hercules.app/v1",
      apiKey: process.env.HERCULES_API_KEY,
    });

    try {
      const completionArgs: OpenAI.ChatCompletionCreateParamsNonStreaming = {
        model: "openai/gpt-4o-mini",
        messages: openaiMessages,
      };
      if (tools && tools.length > 0) {
        completionArgs.tools = tools;
      }

      let response = await openai.chat.completions.create(completionArgs);
      let choice = response.choices[0];

      // Handle function calls (up to 3 iterations to prevent infinite loops)
      let iterations = 0;
      while (choice?.finish_reason === "tool_calls" && choice.message.tool_calls && iterations < 3) {
        iterations++;

        // Add assistant message with tool calls
        openaiMessages.push(choice.message);

        // Execute each tool call
        for (const toolCall of choice.message.tool_calls) {
          // Narrow to function tool calls only
          if (toolCall.type !== "function") continue;
          const funcCall = toolCall as { type: "function"; id: string; function: { name: string; arguments: string } };
          const taskId = funcCall.function.name.replace("task_", "") as Id<"aiAssistantTasks">;
          const task = activeTasks.find((t) => t._id === taskId);

          let toolResult: string;

          if (task) {
            const params = JSON.parse(funcCall.function.arguments) as Record<string, unknown>;
            const result = await executeTask(task, params);

            // Log execution
            await ctx.runMutation(internal.aiAssistants.logTaskExecution, {
              taskId: task._id,
              sessionId: internalSessionId,
              assistantId: args.assistantId,
              parameters: JSON.stringify(params),
              responseStatus: result.status,
              responseBody: result.body,
              success: result.success,
              errorMessage: result.success ? undefined : result.body,
            });

            toolResult = result.success
              ? result.body
              : `Task failed: ${result.body}`;
          } else {
            toolResult = "Task not found or unavailable.";
          }

          openaiMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResult,
          });
        }

        // Get next response after tool execution
        response = await openai.chat.completions.create({
          model: "openai/gpt-4o-mini",
          messages: openaiMessages,
          tools,
        });
        choice = response.choices[0];
      }

      const aiResponse =
        choice?.message?.content ??
        "I apologize, but I'm unable to respond right now. Please try again.";

      // 8. Save assistant response
      await ctx.runMutation(internal.aiAssistants.addChatMessage, {
        sessionId: internalSessionId,
        role: "assistant",
        content: aiResponse,
      });

      return { response: aiResponse, sessionId: args.sessionId };
    } catch (error) {
      console.error("AI chat error:", error);
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

// ─── Public Chat Action (no auth, for HTTP API / widget) ───────────────────

export const publicChat = internalAction({
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
    // 1. Get assistant (internal - no auth)
    const assistant = await ctx.runQuery(internal.aiAssistants.getByIdInternal, {
      assistantId: args.assistantId,
    });
    if (!assistant || !assistant.isActive) {
      return { response: "This assistant is currently unavailable.", sessionId: args.sessionId };
    }

    // 2. Get or create session
    const session = await ctx.runQuery(internal.aiAssistants.getSessionByPublicIdInternal, {
      sessionId: args.sessionId,
    });

    let internalSessionId: Id<"aiChatSessions">;

    if (!session) {
      internalSessionId = await ctx.runMutation(internal.aiAssistants.createChatSessionInternal, {
        assistantId: args.assistantId,
        sessionId: args.sessionId,
        channel: args.channel,
        visitorName: args.visitorName,
        visitorEmail: args.visitorEmail,
        visitorPhone: args.visitorPhone,
      });
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

    // 4. Get context data (internal - no auth)
    const [history, knowledgeBase, activeTasks] = await Promise.all([
      ctx.runQuery(internal.aiAssistants.getChatMessagesInternal, { sessionId: internalSessionId }),
      ctx.runQuery(internal.aiAssistants.getKnowledgeBaseInternal, { assistantId: args.assistantId }),
      ctx.runQuery(internal.aiAssistants.getActiveTasksInternalQuery, { assistantId: args.assistantId }),
    ]);

    // 5. Build OpenAI messages
    const systemPrompt = buildSystemPrompt(assistant, knowledgeBase, activeTasks.length > 0);
    const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
    ];

    const recentHistory = history.slice(-20);
    for (const msg of recentHistory) {
      if (msg.role === "user" || msg.role === "assistant") {
        openaiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    // 6. Build tools from active tasks
    const tools = activeTasks.length > 0 ? tasksToOpenAITools(activeTasks) : undefined;

    // 7. Call AI via Hercules AI Gateway
    const openai = new OpenAI({
      baseURL: "http://ai-gateway.hercules.app/v1",
      apiKey: process.env.HERCULES_API_KEY,
    });

    try {
      const completionArgs: OpenAI.ChatCompletionCreateParamsNonStreaming = {
        model: "openai/gpt-4o-mini",
        messages: openaiMessages,
      };
      if (tools && tools.length > 0) {
        completionArgs.tools = tools;
      }

      let response = await openai.chat.completions.create(completionArgs);
      let choice = response.choices[0];

      let iterations = 0;
      while (choice?.finish_reason === "tool_calls" && choice.message.tool_calls && iterations < 3) {
        iterations++;
        openaiMessages.push(choice.message);

        for (const toolCall of choice.message.tool_calls) {
          if (toolCall.type !== "function") continue;
          const funcCall = toolCall as { type: "function"; id: string; function: { name: string; arguments: string } };
          const taskId = funcCall.function.name.replace("task_", "") as Id<"aiAssistantTasks">;
          const task = activeTasks.find((t) => t._id === taskId);

          let toolResult: string;

          if (task) {
            const params = JSON.parse(funcCall.function.arguments) as Record<string, unknown>;
            const result = await executeTask(task, params);

            await ctx.runMutation(internal.aiAssistants.logTaskExecution, {
              taskId: task._id,
              sessionId: internalSessionId,
              assistantId: args.assistantId,
              parameters: JSON.stringify(params),
              responseStatus: result.status,
              responseBody: result.body,
              success: result.success,
              errorMessage: result.success ? undefined : result.body,
            });

            toolResult = result.success ? result.body : `Task failed: ${result.body}`;
          } else {
            toolResult = "Task not found or unavailable.";
          }

          openaiMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResult,
          });
        }

        response = await openai.chat.completions.create({
          model: "openai/gpt-4o-mini",
          messages: openaiMessages,
          tools,
        });
        choice = response.choices[0];
      }

      const aiResponse =
        choice?.message?.content ??
        "I apologize, but I'm unable to respond right now. Please try again.";

      await ctx.runMutation(internal.aiAssistants.addChatMessage, {
        sessionId: internalSessionId,
        role: "assistant",
        content: aiResponse,
      });

      return { response: aiResponse, sessionId: args.sessionId };
    } catch (error) {
      console.error("AI chat error:", error);
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

// ─── Test Chat (authenticated) ──────────────────────────────────────────────

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

// ─── Sync knowledge from API source ─────────────────────────────────────────

export const syncKnowledgeFromApi = action({
  args: {
    entryId: v.id("aiKnowledgeBase"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // We need to get the entry directly. Since we're in an action, use runQuery
    const entries = await ctx.runQuery(api.aiAssistants.getKnowledgeBase, {
      assistantId: "placeholder" as Id<"aiAssistants">, // We need the entry
    });

    // Actually, let's fetch via a different approach - get all entries for this client
    // For now, we'll use a direct approach
    try {
      // Get the entry via a helper pattern
      const allEntries = await ctx.runQuery(api.aiAssistants.getKnowledgeBase, {
        assistantId: args.entryId as unknown as Id<"aiAssistants">, // workaround
      });

      // We need a dedicated query, but for simplicity let's restructure
      return { success: false, error: "Use the dedicated sync endpoint" };
    } catch {
      return { success: false, error: "Sync failed" };
    }
  },
});

// ─── Fetch content from URL (for API/website sources) ───────────────────────

export const fetchSourceContent = action({
  args: {
    url: v.string(),
    headers: v.optional(v.string()),
    entryId: v.id("aiKnowledgeBase"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; content?: string; error?: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    try {
      const fetchHeaders: Record<string, string> = {};
      if (args.headers) {
        try {
          Object.assign(fetchHeaders, JSON.parse(args.headers));
        } catch {
          // Ignore invalid JSON
        }
      }

      const response = await fetch(args.url, { headers: fetchHeaders });
      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const content = await response.text();
      const trimmedContent = content.slice(0, 50000); // Limit to 50K chars

      // Update the knowledge entry with fetched content
      await ctx.runMutation(api.aiAssistants.updateKnowledge, {
        entryId: args.entryId,
        content: trimmedContent,
        lastSyncedAt: new Date().toISOString(),
      });

      return { success: true, content: trimmedContent.slice(0, 200) + "..." };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch content",
      };
    }
  },
});

// ─── Text-to-Speech (TTS) ──────────────────────────────────────────────────

export const textToSpeech = action({
  args: {
    text: v.string(),
    voice: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ storageId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: (args.voice ?? "coral") as "coral",
      input: args.text.slice(0, 4096),
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    const storageId = await ctx.storage.store(
      new Blob([buffer], { type: "audio/mpeg" })
    );

    return { storageId: storageId as string };
  },
});

// ─── Speech-to-Text (STT) ──────────────────────────────────────────────────

export const speechToText = action({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args): Promise<{ text: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const audioBlob = await ctx.storage.get(args.storageId);
    if (!audioBlob) {
      throw new Error("Audio file not found");
    }

    const audioFile = new File([audioBlob], "audio.webm", { type: "audio/webm" });

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    return { text: transcription.text };
  },
});
