import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { ResponseBuilder } from "../utils/responseBuilder";
import { d } from "../utils/Dependencies";

interface GetPhotoRequestBody {
  chatId: string;
  photoName: string;
}

interface GetPhotoResponse {
  photoData: object;
}

class GetPhotoFunction extends BaseHttpFunction {
  protected validateRequestBody(body: GetPhotoRequestBody): string | null {
    if (!body.chatId || !body.photoName) {
      return "Invalid request body. Missing chatId or photoName.";
    }
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const { chatId, photoName } = body as GetPhotoRequestBody;

    const blobName = `${chatId}/${photoName}.photo`;

    const photoContent = await d.UserStorageClient().getBlob(userId, blobName);

    if (photoContent === undefined) {
      return ResponseBuilder.notFound("Photo not found.");
    }

    try {
      const photoData = JSON.parse(photoContent);

      context.log(
        `Successfully retrieved photo from blob: ${userId}/${blobName}`
      );
      const response: GetPhotoResponse = { photoData };
      return ResponseBuilder.success(response);
    } catch (parseError) {
      context.error(
        `Failed to parse photo data for blob: ${userId}/${blobName}`,
        parseError
      );
      return ResponseBuilder.error("Failed to parse photo data.");
    }
  }
}

const getPhotoFunction = new GetPhotoFunction();

export async function GetPhoto(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return getPhotoFunction.handler(request, context);
}

app.http("GetPhoto", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: GetPhoto,
});
