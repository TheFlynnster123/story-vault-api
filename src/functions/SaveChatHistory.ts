import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { ResponseBuilder } from "../utils/responseBuilder";
import type { Chat, Message } from "../models/ChatPage";
import { d } from "../utils/Dependencies";

interface SaveChatHistoryRequestBody extends Chat {}

class SaveChatHistoryFunction extends BaseHttpFunction {
  protected validateRequestBody(
    body: SaveChatHistoryRequestBody
  ): string | null {
    if (!body.chatId) {
      return "Invalid request body. Missing chatId.";
    }

    if (!body.messages || !Array.isArray(body.messages)) {
      return "Invalid request body. Missing messages array.";
    }

    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const { chatId, messages } = body as SaveChatHistoryRequestBody;

    const jsonMessages = toJson(messages);

    const blobName = `${chatId}/chat-messages`;
    await d
      .UserStorageClient()
      .replaceAppendBlob(userId, blobName, jsonMessages);

    return SuccessResponse(context, userId, blobName);
  }
}

const toJson = (messages: Message[]) =>
  messages.map(message => JSON.stringify(message)).join("\n") + "\n";

const SuccessResponse = (
  context: InvocationContext,
  userId: string,
  blobName: string
) => {
  context.log(`Successfully saved chat history: ${userId}/${blobName}`);
  return ResponseBuilder.successMessage("Chat history saved successfully.");
};

const saveChatHistoryFunction = new SaveChatHistoryFunction();

export async function SaveChatHistory(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return saveChatHistoryFunction.handler(request, context);
}

app.http("SaveChatHistory", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: SaveChatHistory,
});
