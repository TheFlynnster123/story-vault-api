import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { saveGrokKeyRequest } from "../databaseRequests/saveGrokKeyRequest";
import { ResponseBuilder } from "../utils/responseBuilder";

interface SaveGrokKeyRequestBody {
  grokKey: string;
}

class SaveGrokKeyFunction extends BaseHttpFunction {
  protected validateRequestBody(body: SaveGrokKeyRequestBody): string | null {
    if (!body.grokKey) {
      return "Missing grokKey in request body";
    }
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const { grokKey } = body as SaveGrokKeyRequestBody;

    await saveGrokKeyRequest(userId, grokKey);

    context.log(`Successfully saved grok key for user: ${userId}`);
    return ResponseBuilder.successMessage("Grok key saved successfully", 201);
  }
}

const saveGrokKeyFunction = new SaveGrokKeyFunction();

export async function SaveGrokKey(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return saveGrokKeyFunction.handler(request, context);
}

app.http("SaveGrokKey", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: SaveGrokKey,
});
