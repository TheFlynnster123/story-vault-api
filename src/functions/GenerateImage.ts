import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { CivitaiClient, ImageGenerationSettings } from "../utils/civitaiClient";
import { ResponseBuilder } from "../utils/responseBuilder";

interface GenerateImageRequestBody extends ImageGenerationSettings {}

class GenerateImageFunction extends BaseHttpFunction {
  protected validateRequestBody(body: GenerateImageRequestBody): string | null {
    if (!body.model) {
      return "Missing model in request body";
    }
    if (!body.params) {
      return "Missing params in request body";
    }
    if (!body.params.prompt) {
      return "Missing prompt in params";
    }
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const input = body as GenerateImageRequestBody;
    const encryptionKey = request.headers.get("Encryptionkey") || undefined;

    const response = await CivitaiClient.generateImage(
      userId,
      input,
      encryptionKey
    );

    if (!response) {
      context.log(`Failed to generate image for user: ${userId}`);
      return ResponseBuilder.badRequest(
        "Failed to generate image. Please ensure you have a valid Civitai API key."
      );
    }

    if (response.errors) {
      context.log(
        `Civitai API returned an error for user: ${userId}, error: ${JSON.stringify(response.error)}`
      );
      return ResponseBuilder.badRequest(JSON.stringify(response.errors));
    }

    context.log(
      `Successfully generated image for user: ${userId}, token: ${response.token}`
    );
    return ResponseBuilder.success(response, 200);
  }
}

const generateImageFunction = new GenerateImageFunction();

export async function GenerateImage(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return generateImageFunction.handler(request, context);
}

app.http("GenerateImage", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: GenerateImage,
});
