import OpenAI from "openai";
import { Config } from "../config";

export async function getGrokChatCompletion(
  grokKey: string,
  userMessage: string
): Promise<string | null> {
  const client = new OpenAI({
    apiKey: grokKey,
    baseURL: Config.GROK_BASE_URL,
  });

  const completion = await client.chat.completions.create({
    model: "grok-3",
    messages: [
      {
        role: "system",
        content: "You are Grok, a highly intelligent, helpful AI assistant.",
      },
      {
        role: "user",
        content: userMessage,
      },
    ],
    stream: false,
  });

  return completion.choices[0]?.message?.content || null;
}
