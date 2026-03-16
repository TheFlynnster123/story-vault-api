import OpenAI from "openai";
import { Config } from "../config";
import { Message } from "../models/Chat";

export async function getOpenRouterChatCompletion(
  openRouterKey: string,
  messages: Message[],
  model: string = "x-ai/grok-4.1-mini"
): Promise<string | null> {
  const client = new OpenAI({
    apiKey: openRouterKey,
    baseURL: Config.OPENROUTER_BASE_URL,
  });

  const completion = await client.chat.completions.create({
    model: model,
    messages: messages,
    stream: false,
  });

  return completion.choices[0]?.message?.content || null;
}
