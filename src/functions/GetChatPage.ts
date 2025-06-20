import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { UserStorageClient } from "../utils/UserStorageClient";
import type { ChatPage } from "../models/ChatPage";
import { getAuthenticatedUserId } from "../utils/getAuthenticatedUserId";

interface GetChatPageRequestBody {
  chatId: string;
  pageId: string;
}

export async function GetChatPage(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return {
      status: 401,
      body: "Unauthorized. No user ID found.",
    };
  }

  try {
    // Even though it's a GET, the frontend sends a body
    const body = (await request.json()) as GetChatPageRequestBody;
    const { chatId, pageId } = body;

    if (!chatId || !pageId) {
      return {
        status: 400,
        body: "Invalid request. Missing chatId or pageId in the request body.",
      };
    }

    const userStorageClient = new UserStorageClient();
    const blobName = `${chatId}/${pageId}.txt`;

    const content = await userStorageClient.getBlob(userId, blobName);

    if (content === undefined) {
      return {
        status: 404,
        body: "Chat page not found.",
      };
    }

    const chatPage: ChatPage = JSON.parse(content);

    return {
      status: 200,
      jsonBody: chatPage,
    };
  } catch (error) {
    context.error("Error getting chat page:", error);
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
      return {
        status: 400,
        body: "Invalid JSON format in request body.",
      };
    }

    if (error.name === "RestError" && error.code === "BlobNotFound") {
      return {
        status: 404,
        body: "Chat page not found.",
      };
    }
    return {
      status: 500,
      body: "Failed to get chat page.",
    };
  }
}

app.http("GetChatPage", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: GetChatPage,
});
