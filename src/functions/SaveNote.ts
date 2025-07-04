import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { UserStorageClientSingleton } from "../utils/userStorageClientSingleton";
import { ResponseBuilder } from "../utils/responseBuilder";

interface SaveNoteRequestBody {
  chatId: string;
  noteName: string;
  content: string;
}

class SaveNoteFunction extends BaseHttpFunction {
  protected validateRequestBody(body: SaveNoteRequestBody): string | null {
    if (!body.chatId || !body.noteName || body.content === undefined) {
      return "Invalid request body. Missing chatId, noteName, or content.";
    }
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string
  ): Promise<HttpResponseInit> {
    const body = (await request.json()) as SaveNoteRequestBody;
    const { chatId, noteName, content } = body;

    const userStorageClient = UserStorageClientSingleton.getInstance();
    const blobName = `${chatId}/${noteName}`;

    await userStorageClient.uploadBlob(userId, blobName, content);

    context.log(`Successfully saved note to blob: ${userId}/${blobName}`);
    return ResponseBuilder.successMessage("Note saved successfully.");
  }
}

const saveNoteFunction = new SaveNoteFunction();

export async function SaveNote(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return saveNoteFunction.handler(request, context);
}

app.http("SaveNote", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: SaveNote,
});
