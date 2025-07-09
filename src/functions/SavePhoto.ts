import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { UserStorageClientSingleton } from "../utils/userStorageClientSingleton";
import { ResponseBuilder } from "../utils/responseBuilder";

interface SavePhotoRequestBody {
  chatId: string;
  photoName: string;
  photoData: object;
}

class SavePhotoFunction extends BaseHttpFunction {
  protected validateRequestBody(body: SavePhotoRequestBody): string | null {
    if (!body.chatId || !body.photoName || body.photoData === undefined) {
      return "Invalid request body. Missing chatId, photoName, or photoData.";
    }
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const { chatId, photoName, photoData } = body as SavePhotoRequestBody;

    const userStorageClient = UserStorageClientSingleton.getInstance();
    const blobName = `${chatId}/${photoName}.photo`;

    // Convert the photo data object to JSON string for storage
    const photoContent = JSON.stringify(photoData);

    await userStorageClient.uploadBlob(userId, blobName, photoContent);

    context.log(`Successfully saved photo to blob: ${userId}/${blobName}`);
    return ResponseBuilder.successMessage("Photo saved successfully.");
  }
}

const savePhotoFunction = new SavePhotoFunction();

export async function SavePhoto(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return savePhotoFunction.handler(request, context);
}

app.http("SavePhoto", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: SavePhoto,
});
