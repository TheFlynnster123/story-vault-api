import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { UserStorageClient } from "../utils/UserStorageClient";
import type { ChatPage } from "../models/ChatPage";
import { getAuthenticatedUserId } from "../utils/getAuthenticatedUserId";

interface GetChatHistoryRequestBody {
  chatId: string;
}

export async function GetChatHistory(
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
    const body = (await request.json()) as GetChatHistoryRequestBody;
    const { chatId } = body;

    if (!chatId) {
      return {
        status: 400,
        body: "Invalid request. Missing chatId in the request body.",
      };
    }

    const userStorageClient = new UserStorageClient();
    // Ensure the prefix ends with a slash to list files within the "directory"
    const chatPrefix = chatId.endsWith("/") ? chatId : `${chatId}/`;

    const blobNames = await userStorageClient.listBlobsByPrefix(
      userId,
      chatPrefix
    );

    const chatPages: ChatPage[] = [];

    for (const blobName of blobNames) {
      // blobName from listBlobsByPrefix is already relative to userId folder (e.g., "chatId/pageId.txt")
      // and ends with .txt. We only want to process .txt files.
      if (blobName.startsWith(chatPrefix) && blobName.endsWith(".txt")) {
        const content = await userStorageClient.getBlob(userId, blobName);
        if (content) {
          try {
            const chatPage = JSON.parse(content) as ChatPage;
            chatPages.push(chatPage);
          } catch (parseError) {
            context.warn(
              `Failed to parse content for blob: ${userId}/${blobName}`,
              parseError
            );
            // Optionally skip this page or handle error
          }
        }
      }
    }

    return {
      status: 200,
      jsonBody: chatPages,
    };
  } catch (error) {
    context.error("Error getting chat history:", error);
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
      return {
        status: 400,
        body: "Invalid JSON format in request body.",
      };
    }
    return {
      status: 500,
      body: "Failed to get chat history.",
    };
  }
}

app.http("GetChatHistory", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: GetChatHistory,
});
