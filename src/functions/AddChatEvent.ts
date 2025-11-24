import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { ResponseBuilder } from "../utils/responseBuilder";
import type { ChatEventDTO } from "../models/Chat";
import { d } from "../utils/Dependencies";

interface AddChatEventRequestBody {
  chatId: string;
  event: ChatEventDTO;
}

class AddChatEventFunction extends BaseHttpFunction {
  protected validateRequestBody(body: AddChatEventRequestBody): string | null {
    if (!body.chatId) {
      return "Invalid request body. Missing chatId.";
    }

    const eventValidationError = validateEvent(body.event);
    if (eventValidationError) return eventValidationError;

    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const { chatId, event } = body as AddChatEventRequestBody;

    const eventContent = formatEventForStorage(event);
    const blobName = `${chatId}/chat-events`;

    await d.UserStorageClient().appendToBlob(userId, blobName, eventContent);

    return successResponse(context, userId, blobName);
  }
}

const validateEvent = (event: ChatEventDTO): string | null => {
  if (!event || !event.id || !event.content)
    return "Invalid request body. Missing event or required event fields (id, content).";

  return null;
};

const formatEventForStorage = (event: ChatEventDTO): string =>
  JSON.stringify(event) + "\n";

const successResponse = (
  context: InvocationContext,
  userId: string,
  blobName: string
) => {
  context.log(`Successfully appended event to chat: ${userId}/${blobName}`);
  return ResponseBuilder.successMessage("Event added successfully.");
};

const addChatEventFunction = new AddChatEventFunction();

export async function AddChatEvent(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return addChatEventFunction.handler(request, context);
}

app.http("AddChatEvent", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: AddChatEvent,
});
