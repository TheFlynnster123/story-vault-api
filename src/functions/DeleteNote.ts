import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { UserStorageClient } from "../utils/UserStorageClient";
import { getAuthenticatedUserId } from "../utils/getAuthenticatedUserId";

interface DeleteNoteRequestBody {
  chatId: string;
  noteName: string;
}

export async function DeleteNote(
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
    const body = (await request.json()) as DeleteNoteRequestBody;
    const { chatId, noteName } = body;

    if (!chatId || !noteName) {
      return {
        status: 400,
        body: "Invalid request body. Missing chatId or noteName.",
      };
    }

    const userStorageClient = new UserStorageClient();
    const blobName = `${chatId}/${noteName}`;

    await userStorageClient.deleteBlob(userId, blobName);

    context.log(`Successfully deleted note from blob: ${userId}/${blobName}`);
    return {
      status: 200,
      body: "Note deleted successfully.",
    };
  } catch (error) {
    context.error("Error deleting note:", error);
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
      return {
        status: 400,
        body: "Invalid JSON format in request body.",
      };
    }
    return {
      status: 500,
      body: "Failed to delete note.",
    };
  }
}

app.http("DeleteNote", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: DeleteNote,
});
