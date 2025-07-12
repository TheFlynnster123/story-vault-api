import OpenAI from "openai";
import { Config } from "../config";
import { Message } from "../models/ChatPage";
import { EncryptionManager } from "./encryptionManager";

export async function getGrokChatCompletion(
  grokKey: string,
  messages: Message[],
  reasoningEffort: "high" | "low" = "high",
  model: string = "grok-3-mini",
  temperature: number = 0.7
): Promise<string | null> {
  const client = new OpenAI({
    apiKey: grokKey,
    baseURL: Config.GROK_BASE_URL,
  });

  const completion = await client.chat.completions.create({
    model: model,
    messages: messages,
    stream: false,
    reasoning_effort: reasoningEffort,
    temperature: temperature, // between 0.0 and 2.0
  });

  return completion.choices[0]?.message?.content || null;
}
