import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { UserStorageClientSingleton } from "../utils/userStorageClientSingleton";
import { ResponseBuilder } from "../utils/responseBuilder";

interface GetBlobRequestBody {
  chatId: string;
  blobName: string;
}

interface GetBlobResponse {
  content: string;
}

class GetBlobFunction extends BaseHttpFunction {
  protected validateRequestBody(body: GetBlobRequestBody): string | null {
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
    const { chatId, blobName } = body as GetBlobRequestBody;

    const userStorageClient = UserStorageClientSingleton.getInstance();
    const fullName = `${chatId}/${blobName}`;

    const content = await userStorageClient.getBlob(userId, fullName);

    if (content === undefined) {
      return ResponseBuilder.notFound("Blob not found.");
    }

    context.log(`Successfully retrieved blob from blob: ${userId}/${fullName}`);
    const response: GetBlobResponse = { content };
    return ResponseBuilder.success(response);
  }
}

const getBlobFunction = new GetBlobFunction();

export async function GetBlob(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return getBlobFunction.handler(request, context);
}

app.http("GetBlob", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: GetBlob,
});
