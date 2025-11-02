import OpenAI from "openai";
import { Config } from "../config";
import { Message } from "../models/ChatPage";
import { EncryptionManager } from "./encryptionManager";
import { MoodResponse } from "../models/CharacterMood";

const MOOD_QUERY_PROMPT = `Based on the conversation above, describe each character's:
1. Mood
2. Realistic Reaction

Respond in JSON format: {"characters": [{"characterName": "name", "mood": "description", "realisticReaction": "description"}]}`;

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
    content: MOOD_QUERY_PROMPT,
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
    const parsedResponse = JSON.parse(content);

    // Validate the structure matches MoodResponse
    if (
      parsedResponse &&
      typeof parsedResponse === "object" &&
      Array.isArray(parsedResponse.characters)
    ) {
      // Validate each character entry
      const validCharacters = parsedResponse.characters.every(
        (char: any) =>
          char &&
          typeof char === "object" &&
          typeof char.characterName === "string" &&
          typeof char.mood === "string" &&
          typeof char.realisticReaction === "string"
      );

      if (validCharacters) {
        return parsedResponse as MoodResponse;
      }
    }

    // If validation fails, return null
    return null;
  } catch (error) {
    // If JSON parsing fails, return null
    return null;
  }
}
