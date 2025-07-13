import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { getCivitaiKeyRequest } from "../databaseRequests/getCivitaiKeyRequest";
import { ResponseBuilder } from "../utils/responseBuilder";

class HasValidCivitaiKeyFunction extends BaseHttpFunction {
  protected validateRequestBody(body: any): string | null {
    // No request body validation needed for GET request
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string
  ): Promise<HttpResponseInit> {
    const civitaiKey = await getCivitaiKeyRequest(userId);

    if (civitaiKey) {
      return ResponseBuilder.success();
    } else {
      return ResponseBuilder.notFound("Civitai key not found");
    }
  }
}

const hasValidCivitaiKeyFunction = new HasValidCivitaiKeyFunction();

export async function HasValidCivitaiKey(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return hasValidCivitaiKeyFunction.handler(request, context);
}

app.http("HasValidCivitaiKey", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: HasValidCivitaiKey,
});
