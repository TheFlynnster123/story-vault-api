import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getAuthenticatedUserId } from "../utils/getAuthenticatedUserId";
import { getGrokKeyRequest } from "../databaseRequests/getGrokKeyRequest";
import OpenAI from "openai";
import { getGrokChatCompletion } from "../utils/grokClient";
import { Message } from "../models/ChatPage";

export async function PostChat(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log("PostChat (non-streaming) function processed a request.");

  try {
    const userId = await getAuthenticatedUserId(request);
    const encryptionKey = request.headers.get("EncryptionKey");
    const grokKey = await getGrokKeyRequest(userId, encryptionKey);

    if (!grokKey) {
      return {
        status: 401,
        jsonBody: {
          error: "No valid Grok API key found.",
        },
      };
    }

    // Extract and validate optional reasoning header
    const reasoning = request.headers.get("Reasoning") as "high" | "low" | null;
    if (reasoning && reasoning !== "high" && reasoning !== "low") {
      return {
        status: 400,
        jsonBody: {
          error: "Invalid Reasoning header. Must be 'high' or 'low'.",
        },
      };
    }

    const messages = (await request.json()) as Message[];

    if (!messages) return NoMessagesFoundResponse();

    context.log("Sending request to Grok API via grokClient...");
    const replyContent = await getGrokChatCompletion(
      grokKey,
      messages,
      reasoning || undefined
    );

    if (replyContent) return ReplyContentResponse(context, replyContent);
    else return NoContentFromGrokResponse(context);
  } catch (error) {
    if (error instanceof OpenAI.APIError)
      return GrokApiErrorResponse(context, error);

    return InternalServerErrorResponse(error);
  }
}

app.http("PostChat", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: PostChat,
});

function NoMessagesFoundResponse(): HttpResponseInit {
  return {
    status: 400,
    jsonBody: { error: "Missing messages in request body." },
  };
}

function ReplyContentResponse(
  context: InvocationContext,
  replyContent: string
): HttpResponseInit {
  context.log("Successfully received reply from Grok API.");
  return {
    status: 200,
    body: JSON.stringify({ reply: replyContent }),
    headers: {
      "Content-Type": "application/json",
    },
  };
}

function NoContentFromGrokResponse(
  context: InvocationContext
): HttpResponseInit {
  context.log("Grok API response did not contain expected content.");
  return {
    status: 500,
    jsonBody: { error: "Failed to get a valid response from Grok API." },
  };
}

function GrokApiErrorResponse(
  context: InvocationContext,
  error: any
): HttpResponseInit {
  context.error("Error in PostChat function:", error);
  return {
    status: error.status || 500,
    jsonBody: {
      error: "Grok API error",
      details: error.message,
      code: error.code,
    },
  };
}

function InternalServerErrorResponse(error: any): HttpResponseInit {
  return {
    status: 500,
    jsonBody: {
      error: "An unexpected error occurred.",
      details: error.message,
    },
  };
}
