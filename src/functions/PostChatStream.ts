import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getAuthenticatedUserId } from "../utils/getAuthenticatedUserId";
import { ResponseBuilder } from "../utils/responseBuilder";
import { getOpenRouterKeyRequest } from "../databaseRequests/getOpenRouterKeyRequest";
import { streamOpenRouterChatCompletion } from "../utils/openRouterClient";
import { Message } from "../models/Chat";
import OpenAI from "openai";

interface PostChatStreamRequest {
  messages: Message[];
  model?: string;
}

export async function PostChatStream(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log("PostChatStream (streaming) function processed a request.");

  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return ResponseBuilder.unauthorized();
    }

    let body: PostChatStreamRequest;
    try {
      body = (await request.json()) as PostChatStreamRequest;
    } catch {
      return ResponseBuilder.invalidJson();
    }

    if (
      !body?.messages ||
      !Array.isArray(body.messages) ||
      body.messages.length === 0
    ) {
      return ResponseBuilder.badRequest(
        "Missing or invalid messages array in request body."
      );
    }

    const encryptionKey = request.headers.get("EncryptionKey");
    const openRouterKey = await getOpenRouterKeyRequest(userId, encryptionKey);

    if (!openRouterKey) {
      return ResponseBuilder.unauthorized("No valid OpenRouter API key found.");
    }

    const tokenStream = streamOpenRouterChatCompletion(
      openRouterKey,
      body.messages,
      body.model
    );

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const token of tokenStream) {
            // Send each token as an SSE data event
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(token)}\n\n`)
            );
          }
          // Signal stream completion
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          context.error("Error during streaming:", error);

          let errorMessage = "Streaming error";
          if (error instanceof OpenAI.APIError) {
            errorMessage = error.message;
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: errorMessage })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
      body: readableStream as any,
    };
  } catch (error) {
    context.error("Error in PostChatStream:", error);
    return ResponseBuilder.error("An unexpected error occurred.");
  }
}

app.http("PostChatStream", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: PostChatStream,
});
