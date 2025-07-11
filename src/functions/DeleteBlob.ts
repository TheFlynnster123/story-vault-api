import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { UserStorageClientSingleton } from "../utils/userStorageClientSingleton";
import { ResponseBuilder } from "../utils/responseBuilder";

interface DeleteBlobRequestBody {
  chatId: string;
  blobName: string;
}

class DeleteBlobFunction extends BaseHttpFunction {
  protected validateRequestBody(body: DeleteBlobRequestBody): string | null {
    if (!body.chatId || !body.blobName) {
      return "Invalid request body. Missing chatId or blobName.";
    }
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const { chatId, blobName } = body as DeleteBlobRequestBody;

    const userStorageClient = UserStorageClientSingleton.getInstance();
    const fullName = `${chatId}/${blobName}`;

    await userStorageClient.deleteBlob(userId, fullName);

    context.log(`Successfully deleted blob from blob: ${userId}/${fullName}`);
    return ResponseBuilder.successMessage("Blob deleted successfully.");
  }
}

const deleteBlobFunction = new DeleteBlobFunction();

export async function DeleteBlob(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return deleteBlobFunction.handler(request, context);
}

app.http("DeleteBlob", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: DeleteBlob,
});
