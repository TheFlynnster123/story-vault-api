import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { UserStorageClientSingleton } from "../utils/userStorageClientSingleton";
import { ResponseBuilder } from "../utils/responseBuilder";

interface SaveBlobRequestBody {
  chatId: string;
  blobName: string;
  content: string;
}

class SaveBlobFunction extends BaseHttpFunction {
  protected validateRequestBody(body: SaveBlobRequestBody): string | null {
    if (!body.chatId || !body.blobName || body.content === undefined) {
      return "Invalid request body. Missing chatId, blobName, or content.";
    }
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const { chatId, blobName, content } = body as SaveBlobRequestBody;

    const userStorageClient = UserStorageClientSingleton.getInstance();
    const fullName = `${chatId}/${blobName}`;

    await userStorageClient.uploadBlob(userId, fullName, content);

    context.log(`Successfully saved blob to blob: ${userId}/${fullName}`);
    return ResponseBuilder.successMessage("Blob saved successfully.");
  }
}

const saveBlobFunction = new SaveBlobFunction();

export async function SaveBlob(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return saveBlobFunction.handler(request, context);
}

app.http("SaveBlob", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: SaveBlob,
});
