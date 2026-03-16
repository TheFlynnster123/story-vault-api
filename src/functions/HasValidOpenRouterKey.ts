import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { getOpenRouterKeyRequest } from "../databaseRequests/getOpenRouterKeyRequest";
import { ResponseBuilder } from "../utils/responseBuilder";

class HasValidOpenRouterKeyFunction extends BaseHttpFunction {
  protected validateRequestBody(body: any): string | null {
    // No request body validation needed for GET request
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string
  ): Promise<HttpResponseInit> {
    const openRouterKey = await getOpenRouterKeyRequest(userId);

    if (openRouterKey) {
      return ResponseBuilder.success();
    } else {
      return ResponseBuilder.notFound("OpenRouter key not found");
    }
  }
}

const hasValidOpenRouterKeyFunction = new HasValidOpenRouterKeyFunction();

export async function HasValidOpenRouterKey(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return hasValidOpenRouterKeyFunction.handler(request, context);
}

app.http("HasValidOpenRouterKey", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: HasValidOpenRouterKey,
});
