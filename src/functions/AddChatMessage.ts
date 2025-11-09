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

interface AddChatMessageRequestBody {
  chatId: string;
  message: Message;
}

class AddChatMessageFunction extends BaseHttpFunction {
  protected validateRequestBody(
    body: AddChatMessageRequestBody
  ): string | null {
    if (!body.chatId) {
      return "Invalid request body. Missing chatId.";
    }

    const messageValidationError = validateMessage(body.message);
    if (messageValidationError) return messageValidationError;

    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const { chatId, message } = body as AddChatMessageRequestBody;

    const messageContent = formatMessageForStorage(message);
    const blobName = `${chatId}/chat-messages`;

    await d.UserStorageClient().appendToBlob(userId, blobName, messageContent);

    return successResponse(context, userId, blobName);
  }
}

const validateMessage = (message: Message): string | null => {
  if (!message || !message.id || !message.role || !message.content)
    return "Invalid request body. Missing message or required message fields (id, role, content).";

  if (!["user", "system"].includes(message.role))
    return "Invalid message role. Must be 'user' or 'system'.";

  return null;
};

const formatMessageForStorage = (message: Message): string =>
  JSON.stringify(message) + "\n";

const successResponse = (
  context: InvocationContext,
  userId: string,
  blobName: string
) => {
  context.log(`Successfully appended message to chat: ${userId}/${blobName}`);
  return ResponseBuilder.successMessage("Message added successfully.");
};

const addChatMessageFunction = new AddChatMessageFunction();

export async function AddChatMessage(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return addChatMessageFunction.handler(request, context);
}

app.http("AddChatMessage", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: AddChatMessage,
});
