import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { saveCivitaiKeyRequest } from "../databaseRequests/saveCivitaiKeyRequest";
import { ResponseBuilder } from "../utils/responseBuilder";

interface SaveCivitaiKeyRequestBody {
  civitaiKey: string;
}

class SaveCivitaiKeyFunction extends BaseHttpFunction {
  protected validateRequestBody(
    body: SaveCivitaiKeyRequestBody
  ): string | null {
    if (!body.civitaiKey) {
      return "Missing civitaiKey in request body";
    }
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const { civitaiKey } = body as SaveCivitaiKeyRequestBody;

    await saveCivitaiKeyRequest(userId, civitaiKey);

    context.log(`Successfully saved civitai key for user: ${userId}`);
    return ResponseBuilder.successMessage(
      "Civitai key saved successfully",
      201
    );
  }
}

const saveCivitaiKeyFunction = new SaveCivitaiKeyFunction();

export async function SaveCivitaiKey(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return saveCivitaiKeyFunction.handler(request, context);
}

app.http("SaveCivitaiKey", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: SaveCivitaiKey,
});
