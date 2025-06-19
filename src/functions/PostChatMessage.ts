import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getAuthenticatedUserId } from "../utils/getAuthenticatedUserId";
import { getGrokKeyRequest } from "../databaseRequests/getGrokKeyRequest";
import { Config } from "../config";
import OpenAI from "openai";
import { getGrokChatCompletion } from "../utils/grokClient";

export async function PostChatMessage(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log("PostChatMessage (non-streaming) function processed a request.");

  try {
    const userId = await getAuthenticatedUserId(request);
    const grokKey = await getGrokKeyRequest(userId);

    const body = (await request.json()) as { message?: string };
    const userMessage = body?.message;

    if (!userMessage) return NoMessageFoundResponse();

    context.log("Sending request to Grok API via grokClient...");
    const replyContent = await getGrokChatCompletion(grokKey, userMessage);

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
  context.error("Error in PostChatMessage function:", error);
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

app.http("PostChatMessage", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: PostChatMessage,
});
function NoMessageFoundResponse():
  | HttpResponseInit
  | PromiseLike<HttpResponseInit> {
  return {
    status: 400,
    jsonBody: { error: "Missing 'message' in request body." },
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
