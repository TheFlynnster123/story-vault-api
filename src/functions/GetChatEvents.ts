import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { ResponseBuilder } from "../utils/responseBuilder";
import type { ChatEventDTO, Chat } from "../models/Chat";
import { d } from "../utils/Dependencies";

interface GetChatEventsRequestBody {
  chatId: string;
}

class GetChatEventsFunction extends BaseHttpFunction {
  protected validateRequestBody(body: GetChatEventsRequestBody): string | null {
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
    const { chatId } = body as GetChatEventsRequestBody;
    const blobName = `${chatId}/chat-events`;

    const content = await d.UserStorageClient().getBlob(userId, blobName);

    if (content === undefined) {
      return ResponseBuilder.success(createEmptyChat(chatId));
    }

    try {
      const events = parseEventsFromContent(content, context);
      const chat = createChat(chatId, events);

      return successResponse(context, userId, blobName, chat);
    } catch (parseError) {
      return errorResponse(context, userId, blobName, parseError);
    }
  }
}

const createEmptyChat = (chatId: string): Chat => ({
  chatId,
  events: [],
});

const parseEventsFromContent = (
  content: string,
  context: InvocationContext
): ChatEventDTO[] => {
  const lines = content
    .trim()
    .split("\n")
    .filter(line => line.trim() !== "");

  const events: ChatEventDTO[] = [];

  for (const line of lines) {
    try {
      const event = JSON.parse(line) as ChatEventDTO;
      events.push(event);
    } catch (parseError) {
      context.warn(`Failed to parse event line: ${line}`, parseError);
      // Skip invalid lines but continue processing
    }
  }

  return events;
};

const createChat = (chatId: string, events: ChatEventDTO[]): Chat => ({
  chatId,
  events,
});

const successResponse = (
  context: InvocationContext,
  userId: string,
  blobName: string,
  chat: Chat
) => {
  context.log(`Successfully retrieved chat events: ${userId}/${blobName}`);
  return ResponseBuilder.success(chat);
};

const errorResponse = (
  context: InvocationContext,
  userId: string,
  blobName: string,
  error: any
) => {
  context.error(
    `Failed to parse chat events for blob: ${userId}/${blobName}`,
    error
  );
  return ResponseBuilder.error("Failed to parse chat events.");
};

const getChatEventsFunction = new GetChatEventsFunction();

export async function GetChatEvents(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return getChatEventsFunction.handler(request, context);
}

app.http("GetChatEvents", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: GetChatEvents,
});
