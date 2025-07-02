import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { UserStorageClient } from "../utils/UserStorageClient";
import { getAuthenticatedUserId } from "../utils/getAuthenticatedUserId";

interface SaveNoteRequestBody {
  chatId: string;
  noteName: string;
  content: string;
}

export async function SaveNote(
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
    const body = (await request.json()) as SaveNoteRequestBody;
    const { chatId, noteName, content } = body;

    if (!chatId || !noteName || content === undefined) {
      return {
        status: 400,
        body: "Invalid request body. Missing chatId, noteName, or content.",
      };
    }

    const userStorageClient = new UserStorageClient();
    const blobName = `${chatId}/${noteName}`;

    await userStorageClient.uploadBlob(userId, blobName, content);

    context.log(`Successfully saved note to blob: ${userId}/${blobName}`);
    return {
      status: 200,
      body: "Note saved successfully.",
    };
  } catch (error) {
    context.error("Error saving note:", error);
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
      return {
        status: 400,
        body: "Invalid JSON format in request body.",
      };
    }
    return {
      status: 500,
      body: "Failed to save note.",
    };
  }
}

app.http("SaveNote", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: SaveNote,
});
