import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { ResponseBuilder } from "../utils/responseBuilder";
import { getGrokKeyRequest } from "../databaseRequests/getGrokKeyRequest";
import OpenAI from "openai";
import { getGrokChatCompletion } from "../utils/grokClient";
import { Message } from "../models/ChatPage";

interface PostChatRequest {
  messages: Message[];
}

class PostChatFunction extends BaseHttpFunction {
  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    context.log("PostChat (non-streaming) function processed a request.");

    try {
      const requestBody = body as PostChatRequest;
      const encryptionKey = request.headers.get("EncryptionKey");
      const grokKey = await getGrokKeyRequest(userId, encryptionKey);

      if (!grokKey) {
        return ResponseBuilder.unauthorized("No valid Grok API key found.");
      }

      // Extract and validate optional reasoning header
      const reasoning = request.headers.get("Reasoning") as
        | "high"
        | "low"
        | null;
      if (reasoning && reasoning !== "high" && reasoning !== "low") {
        return ResponseBuilder.badRequest(
          "Invalid Reasoning header. Must be 'high' or 'low'."
        );
      }

      context.log("Sending request to Grok API via grokClient...");
      const replyContent = await getGrokChatCompletion(
        grokKey,
        requestBody.messages,
        reasoning || undefined
      );

      if (replyContent) {
        context.log("Successfully received reply from Grok API.");
        return ResponseBuilder.success({ reply: replyContent });
      } else {
        context.log("Grok API response did not contain expected content.");
        return ResponseBuilder.error(
          "Failed to get a valid response from Grok API.",
          500
        );
      }
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        context.error("Error in PostChat function:", error);
        return ResponseBuilder.jsonError(
          "Grok API error",
          error.message,
          error.status || 500
        );
      }

      return ResponseBuilder.error("An unexpected error occurred.", 500);
    }
  }

  protected validateRequestBody(body: any): string | null {
    if (!body) {
      return "Request body is required.";
    }
    if (!body.messages || !Array.isArray(body.messages)) {
      return "Missing or invalid messages array in request body.";
    }
    if (body.messages.length === 0) {
      return "Messages array cannot be empty.";
    }
    return null;
  }
}

const postChatFunction = new PostChatFunction();

export async function PostChat(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return postChatFunction.handler(request, context);
}

app.http("PostChat", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: PostChat,
});
