import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { ResponseBuilder } from "../utils/responseBuilder";
import type { Message } from "../models/ChatPage";
import { d } from "../utils/Dependencies";

interface AddChatMessagesRequestBody {
  chatId: string;
  messages: Message[];
}

class AddChatMessagesFunction extends BaseHttpFunction {
  protected validateRequestBody(
    body: AddChatMessagesRequestBody
  ): string | null {
    if (!body.chatId) {
      return "Invalid request body. Missing chatId.";
    }

    if (!body.messages || !Array.isArray(body.messages)) {
      return "Invalid request body. Missing messages array.";
    }

    if (body.messages.length === 0) {
      return "Invalid request body. Messages array cannot be empty.";
    }

    const validationError = validateMessages(body.messages);
    if (validationError) return validationError;

    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const { chatId, messages } = body as AddChatMessagesRequestBody;

    const messagesContent = formatMessagesForStorage(messages);
    const blobName = `${chatId}/chat-messages`;

    await d.UserStorageClient().appendToBlob(userId, blobName, messagesContent);

    return successResponse(context, userId, blobName, messages.length);
  }
}

const validateMessages = (messages: Message[]): string | null => {
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (!message || !message.id || !message.content) {
      return `Invalid message at index ${i}. Missing required fields (id, content).`;
    }
  }
  return null;
};

const formatMessagesForStorage = (messages: Message[]): string =>
  messages.map(message => JSON.stringify(message)).join("\n") + "\n";

const successResponse = (
  context: InvocationContext,
  userId: string,
  blobName: string,
  messageCount: number
) => {
  context.log(
    `Successfully appended ${messageCount} messages to chat: ${userId}/${blobName}`
  );
  return ResponseBuilder.successMessage(
    `${messageCount} messages added successfully.`
  );
};

const addChatMessagesFunction = new AddChatMessagesFunction();

export async function AddChatMessages(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return addChatMessagesFunction.handler(request, context);
}

app.http("AddChatMessages", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: AddChatMessages,
});
