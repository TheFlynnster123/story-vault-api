import OpenAI from "openai";
import { Config } from "../config";
import { Message } from "../models/ChatPage";
import { EncryptionManager } from "./encryptionManager";

export async function getGrokChatCompletion(
  grokKey: string,
  messages: Message[],
  model: string = "grok-3-mini"
): Promise<string | null> {
  const client = new OpenAI({
    apiKey: grokKey,
    baseURL: Config.GROK_BASE_URL,
  });

  const completion = await client.chat.completions.create({
    model: model,
    messages: messages,
    stream: false,
  });

  return completion.choices[0]?.message?.content || null;
}
