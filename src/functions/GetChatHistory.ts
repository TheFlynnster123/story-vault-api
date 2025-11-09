import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { ResponseBuilder } from "../utils/responseBuilder";
import type { Message, Chat } from "../models/ChatPage";
import { d } from "../utils/Dependencies";

interface GetChatHistoryRequestBody {
  chatId: string;
}

class GetChatHistoryFunction extends BaseHttpFunction {
  protected validateRequestBody(
    body: GetChatHistoryRequestBody
  ): string | null {
    if (!body.chatId) {
      return "Invalid request body. Missing chatId.";
    }
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const { chatId } = body as GetChatHistoryRequestBody;
    const blobName = `${chatId}/chat-messages`;

    const content = await d.UserStorageClient().getBlob(userId, blobName);

    if (content === undefined) {
      return ResponseBuilder.success(createEmptyChat(chatId));
    }

    try {
      const messages = parseMessagesFromContent(content, context);
      const chat = createChat(chatId, messages);

      return successResponse(context, userId, blobName, chat);
    } catch (parseError) {
      return errorResponse(context, userId, blobName, parseError);
    }
  }
}

const createEmptyChat = (chatId: string): Chat => ({
  chatId,
  messages: [],
});

const parseMessagesFromContent = (
  content: string,
  context: InvocationContext
): Message[] => {
  const lines = content
    .trim()
    .split("\n")
    .filter(line => line.trim() !== "");

  const messages: Message[] = [];

  for (const line of lines) {
    try {
      const message = JSON.parse(line) as Message;
      messages.push(message);
    } catch (parseError) {
      context.warn(`Failed to parse message line: ${line}`, parseError);
      // Skip invalid lines but continue processing
    }
  }

  return messages;
};

const createChat = (chatId: string, messages: Message[]): Chat => ({
  chatId,
  messages,
});

const successResponse = (
  context: InvocationContext,
  userId: string,
  blobName: string,
  chat: Chat
) => {
  context.log(`Successfully retrieved chat history: ${userId}/${blobName}`);
  return ResponseBuilder.success(chat);
};

const errorResponse = (
  context: InvocationContext,
  userId: string,
  blobName: string,
  error: any
) => {
  context.error(
    `Failed to parse chat history for blob: ${userId}/${blobName}`,
    error
  );
  return ResponseBuilder.error("Failed to parse chat history.");
};

const getChatHistoryFunction = new GetChatHistoryFunction();

export async function GetChatHistory(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return getChatHistoryFunction.handler(request, context);
}

app.http("GetChatHistory", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: GetChatHistory,
});
