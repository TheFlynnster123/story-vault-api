import OpenAI from "openai";
import { Config } from "../config";
import { Message } from "../models/Chat";

function createOpenRouterClient(openRouterKey: string): OpenAI {
  return new OpenAI({
    apiKey: openRouterKey,
    baseURL: Config.OPENROUTER_BASE_URL,
  });
}

export async function getOpenRouterChatCompletion(
  openRouterKey: string,
  messages: Message[],
  model: string = "x-ai/grok-4.1-mini"
): Promise<string | null> {
  const client = createOpenRouterClient(openRouterKey);

  const completion = await client.chat.completions.create({
    model: model,
    messages: messages,
    stream: false,
  });

  return completion.choices[0]?.message?.content || null;
}

export async function* streamOpenRouterChatCompletion(
  openRouterKey: string,
  messages: Message[],
  model: string = "x-ai/grok-4.1-mini"
): AsyncGenerator<string> {
  const client = createOpenRouterClient(openRouterKey);

  const stream = await client.chat.completions.create({
    model: model,
    messages: messages,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      yield delta;
    }
  }
}
