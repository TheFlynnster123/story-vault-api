import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { ResponseBuilder } from "../utils/responseBuilder";
import type { Chat, ChatEventDTO } from "../models/Chat";
import { d } from "../utils/Dependencies";

interface SaveChatEventsRequestBody extends Chat {}

class SaveChatEventsFunction extends BaseHttpFunction {
  protected validateRequestBody(
    body: SaveChatEventsRequestBody
  ): string | null {
    if (!body.chatId) {
      return "Invalid request body. Missing chatId.";
    }

    if (!body.events || !Array.isArray(body.events)) {
      return "Invalid request body. Missing events array.";
    }

    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const { chatId, events } = body as SaveChatEventsRequestBody;

    const jsonEvents = toJson(events);

    const blobName = `${chatId}/chat-events`;
    await d.UserStorageClient().replaceAppendBlob(userId, blobName, jsonEvents);

    return SuccessResponse(context, userId, blobName);
  }
}

const toJson = (events: ChatEventDTO[]) =>
  events.map(event => JSON.stringify(event)).join("\n") + "\n";

const SuccessResponse = (
  context: InvocationContext,
  userId: string,
  blobName: string
) => {
  context.log(`Successfully saved chat events: ${userId}/${blobName}`);
  return ResponseBuilder.successMessage("Chat events saved successfully.");
};

const saveChatEventsFunction = new SaveChatEventsFunction();

export async function SaveChatEvents(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return saveChatEventsFunction.handler(request, context);
}

app.http("SaveChatEvents", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: SaveChatEvents,
});
