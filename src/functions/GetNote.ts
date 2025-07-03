import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { UserStorageClient } from "../utils/UserStorageClient";
import { getAuthenticatedUserId } from "../utils/getAuthenticatedUserId";

interface GetNoteRequestBody {
  chatId: string;
  noteName: string;
}

interface GetNoteResponse {
  content: string;
}

export async function GetNote(
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
    const body = (await request.json()) as GetNoteRequestBody;
    const { chatId, noteName } = body;

    if (!chatId || !noteName) {
      return {
        status: 400,
        body: "Invalid request body. Missing chatId or noteName.",
      };
    }

    const userStorageClient = new UserStorageClient();
    const blobName = `${chatId}/${noteName}`;

    const content = await userStorageClient.getBlob(userId, blobName);

    if (content === undefined) {
      return {
        status: 404,
        body: "Note not found.",
      };
    }

    context.log(`Successfully retrieved note from blob: ${userId}/${blobName}`);
    const response: GetNoteResponse = { content };
    return {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    context.error("Error getting note:", error);
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
      return {
        status: 400,
        body: "Invalid JSON format in request body.",
      };
    }
    return {
      status: 500,
      body: "Failed to get note.",
    };
  }
}

app.http("GetNote", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: GetNote,
});
