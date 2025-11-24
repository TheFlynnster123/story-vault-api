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

interface AddChatEventsRequestBody {
  chatId: string;
  events: ChatEventDTO[];
}

class AddChatEventsFunction extends BaseHttpFunction {
  protected validateRequestBody(body: AddChatEventsRequestBody): string | null {
    if (!body.chatId) {
      return "Invalid request body. Missing chatId.";
    }

    if (!body.events || !Array.isArray(body.events)) {
      return "Invalid request body. Missing events array.";
    }

    if (body.events.length === 0) {
      return "Invalid request body. Events array cannot be empty.";
    }

    const validationError = validateEvents(body.events);
    if (validationError) return validationError;

    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const { chatId, events } = body as AddChatEventsRequestBody;

    const eventsContent = formatEventsForStorage(events);
    const blobName = `${chatId}/chat-events`;

    await d.UserStorageClient().appendToBlob(userId, blobName, eventsContent);

    return successResponse(context, userId, blobName, events.length);
  }
}

const validateEvents = (events: ChatEventDTO[]): string | null => {
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (!event || !event.id || !event.content) {
      return `Invalid event at index ${i}. Missing required fields (id, content).`;
    }
  }
  return null;
};

const formatEventsForStorage = (events: ChatEventDTO[]): string =>
  events.map(event => JSON.stringify(event)).join("\n") + "\n";

const successResponse = (
  context: InvocationContext,
  userId: string,
  blobName: string,
  eventCount: number
) => {
  context.log(
    `Successfully appended ${eventCount} events to chat: ${userId}/${blobName}`
  );
  return ResponseBuilder.successMessage(
    `${eventCount} events added successfully.`
  );
};

const addChatEventsFunction = new AddChatEventsFunction();

export async function AddChatEvents(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return addChatEventsFunction.handler(request, context);
}

app.http("AddChatEvents", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: AddChatEvents,
});
