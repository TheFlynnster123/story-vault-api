import OpenAI from "openai";
import { Config } from "../config";
import { Message } from "../models/Chat";

export interface UsageInfo {
  promptTokens: number;
  completionTokens: number;
  /** Internal reasoning tokens consumed (e.g. o1, gpt-5). Not included in completionTokens. */
  reasoningTokens: number | null;
  /** Exact billed cost in USD as reported by OpenRouter. Null if not returned. */
  cost: number | null;
}

export interface ChatCompletionResult {
  content: string | null;
  usage: UsageInfo | null;
}

/**
 * A stream token is either a plain text delta or a usage event.
 * The usage event is emitted once as the final yielded value.
 */
export type StreamToken = string | { type: "usage"; data: UsageInfo };

function createOpenRouterClient(openRouterKey: string): OpenAI {
  return new OpenAI({
    apiKey: openRouterKey,
    baseURL: Config.OPENROUTER_BASE_URL,
  });
}

function extractUsage(rawUsage: any): UsageInfo | null {
  if (!rawUsage) return null;
  return {
    promptTokens: rawUsage.prompt_tokens ?? 0,
    completionTokens: rawUsage.completion_tokens ?? 0,
    reasoningTokens:
      rawUsage.completion_tokens_details?.reasoning_tokens ?? null,
    cost: rawUsage.cost ?? null,
  };
}

export async function getOpenRouterChatCompletion(
  openRouterKey: string,
  messages: Message[],
  model: string = "x-ai/grok-4.1-mini"
): Promise<ChatCompletionResult> {
  const client = createOpenRouterClient(openRouterKey);

  const completion = await client.chat.completions.create({
    model: model,
    messages: messages,
    stream: false,
  });

  return {
    content: completion.choices[0]?.message?.content || null,
    usage: extractUsage((completion as any).usage),
  };
}

export async function* streamOpenRouterChatCompletion(
  openRouterKey: string,
  messages: Message[],
  model: string = "x-ai/grok-4.1-mini"
): AsyncGenerator<StreamToken> {
  const client = createOpenRouterClient(openRouterKey);

  const stream = (await client.chat.completions.create({
    model: model,
    messages: messages,
    stream: true,
    stream_options: { include_usage: true },
  } as any)) as unknown as AsyncIterable<any>;

  let usageInfo: UsageInfo | null = null;

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      yield delta;
    }
    const rawUsage = (chunk as any).usage;
    if (rawUsage) {
      usageInfo = extractUsage(rawUsage);
    }
  }

  if (usageInfo) {
    yield { type: "usage", data: usageInfo };
  }
}

