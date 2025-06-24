import OpenAI from "openai";
import { Config } from "../config";
import { Message } from "../models/ChatPage";
import { EncryptionManager } from "./encryptionManager";

export async function getGrokChatCompletion(
  grokKey: string,
  messages: Message[]
): Promise<string | null> {
  const client = new OpenAI({
    apiKey: grokKey,
    baseURL: Config.GROK_BASE_URL,
  });

  const completion = await client.chat.completions.create({
    model: "grok-3-mini",
    messages: messages,
    stream: false,
  });

  return completion.choices[0]?.message?.content || null;
}
