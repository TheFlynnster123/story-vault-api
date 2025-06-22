import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { UserStorageClient } from "../utils/UserStorageClient";
import type { ChatPage } from "../models/ChatPage";
import { getAuthenticatedUserId } from "../utils/getAuthenticatedUserId";

export async function SaveChatPage(
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
    const chatPage = (await request.json()) as ChatPage;

    if (
      !chatPage ||
      !chatPage.chatId ||
      !chatPage.pageId ||
      !chatPage.messages
    ) {
      return {
        status: 400,
        body: "Invalid request body. Missing chatId, pageId, or messages.",
      };
    }

    const userStorageClient = new UserStorageClient();
    const blobName = `${chatPage.chatId}/${chatPage.pageId}.txt`;
    const content = JSON.stringify(chatPage);

    await userStorageClient.uploadBlob(userId, blobName, content);

    context.log(`Successfully saved chat page to blob: ${userId}/${blobName}`);
    return {
      status: 200,
      body: "Chat page saved successfully.",
    };
  } catch (error) {
    context.error("Error saving chat page:", error);
    if (error instanceof SyntaxError) {
      return {
        status: 400,
        body: "Invalid JSON format in request body.",
      };
    }
    return {
      status: 500,
      body: "Failed to save chat page.",
    };
  }
}

app.http("SaveChatPage", {
  methods: ["POST"],
  authLevel: "anonymous", // Authentication is handled by getAuthenticatedUserId
  handler: SaveChatPage,
});
