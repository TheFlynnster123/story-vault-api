import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { getGrokKeyRequest } from "../databaseRequests/getGrokKeyRequest";
import { ResponseBuilder } from "../utils/responseBuilder";

class HasValidGrokKeyFunction extends BaseHttpFunction {
  protected validateRequestBody(body: any): string | null {
    // No request body validation needed for GET request
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string
  ): Promise<HttpResponseInit> {
    const grokKey = await getGrokKeyRequest(userId);

    if (grokKey) {
      return ResponseBuilder.success();
    } else {
      return ResponseBuilder.notFound("Grok key not found");
    }
  }
}

const hasValidGrokKeyFunction = new HasValidGrokKeyFunction();

export async function HasValidGrokKey(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return hasValidGrokKeyFunction.handler(request, context);
}

app.http("HasValidGrokKey", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: HasValidGrokKey,
});
