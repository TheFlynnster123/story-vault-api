import OpenAI from "openai";
import { Config } from "../config";
import { Message } from "../models/ChatPage";
import { EncryptionManager } from "./encryptionManager";
import { MoodResponse } from "../models/CharacterMood";

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

export async function getCharacterMoods(
  grokKey: string,
  messages: Message[],
  model: string = "grok-3-mini"
): Promise<MoodResponse | null> {
  const client = new OpenAI({
    apiKey: grokKey,
    baseURL: Config.GROK_BASE_URL,
  });

  // Create a mood query message
  const moodQueryMessage: Message = {
    id: "mood-query",
    role: "system",
    content:
      'Based on the conversation above, describe each character\'s:\n1. Mood\n2. Realistic Reaction\n\nRespond in JSON format: {"characters": [{"characterName": "name", "mood": "description", "realisticReaction": "description"}]}',
  };

  const completion = await client.chat.completions.create({
    model: model,
    messages: [...messages, moodQueryMessage],
    stream: false,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return null;
  }

  try {
    // Parse the JSON response
    const moodResponse: MoodResponse = JSON.parse(content);
    return moodResponse;
  } catch (error) {
    // If JSON parsing fails, return null
    return null;
  }
}
