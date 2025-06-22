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

    const messages = (await request.json()) as Message[];

    if (!messages) return NoMessagesFoundResponse();

    context.log("Sending request to Grok API via grokClient...");
    const replyContent = await getGrokChatCompletion(grokKey, messages);

    if (replyContent) return ReplyContentResponse(context, replyContent);
    else return NoContentFromGrokResponse(context);
  } catch (error) {
    if (error instanceof OpenAI.APIError)
      return GrokApiErrorResponse(context, error);

    return InternalServerErrorResponse(error);
  }
}

const GrokApiErrorResponse = (
  context: InvocationContext,
  error: any
): HttpResponseInit | PromiseLike<HttpResponseInit> => {
  context.error("Error in PostChat function:", error);
  return {
    status: error.status || 500,
    jsonBody: {
      error: "Grok API error",
      details: error.message,
      code: error.code,
    },
  };
};

const InternalServerErrorResponse = (
  error: any
): HttpResponseInit | PromiseLike<HttpResponseInit> => {
  return {
    status: 500,
    jsonBody: {
      error: "An unexpected error occurred.",
      details: error.message,
    },
  };
};

app.http("PostChat", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: PostChat,
});
function NoMessagesFoundResponse():
  | HttpResponseInit
  | PromiseLike<HttpResponseInit> {
  return {
    status: 400,
    jsonBody: { error: "Missing messages in request body." },
  };
}

function ReplyContentResponse(
  context: InvocationContext,
  replyContent: string
) {
  context.log("Successfully received reply from Grok API.");
  return {
    status: 200,
    jsonBody: { reply: replyContent },
  };
}

function NoContentFromGrokResponse(context: InvocationContext) {
  context.log("Grok API response did not contain expected content.");
  return {
    status: 500,
    jsonBody: { error: "Failed to get a valid response from Grok API." },
  };
}
