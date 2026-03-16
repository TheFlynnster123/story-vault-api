import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { saveOpenRouterKeyRequest } from "../databaseRequests/saveOpenRouterKeyRequest";
import { ResponseBuilder } from "../utils/responseBuilder";

interface SaveOpenRouterKeyRequestBody {
  openRouterKey: string;
}

class SaveOpenRouterKeyFunction extends BaseHttpFunction {
  protected validateRequestBody(body: SaveOpenRouterKeyRequestBody): string | null {
    if (!body.openRouterKey) {
      return "Missing openRouterKey in request body";
    }
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const { openRouterKey } = body as SaveOpenRouterKeyRequestBody;

    await saveOpenRouterKeyRequest(userId, openRouterKey);

    context.log(`Successfully saved OpenRouter key for user: ${userId}`);
    return ResponseBuilder.successMessage("OpenRouter key saved successfully", 201);
  }
}

const saveOpenRouterKeyFunction = new SaveOpenRouterKeyFunction();

export async function SaveOpenRouterKey(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return saveOpenRouterKeyFunction.handler(request, context);
}

app.http("SaveOpenRouterKey", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: SaveOpenRouterKey,
});
