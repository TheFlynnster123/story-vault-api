import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { UserStorageClientSingleton } from "../utils/userStorageClientSingleton";
import { ResponseBuilder } from "../utils/responseBuilder";

interface DeleteNoteRequestBody {
  chatId: string;
  noteName: string;
}

class DeleteNoteFunction extends BaseHttpFunction {
  protected validateRequestBody(body: DeleteNoteRequestBody): string | null {
    if (!body.chatId || !body.noteName) {
      return "Invalid request body. Missing chatId or noteName.";
    }
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string
  ): Promise<HttpResponseInit> {
    const body = (await request.json()) as DeleteNoteRequestBody;
    const { chatId, noteName } = body;

    const userStorageClient = UserStorageClientSingleton.getInstance();
    const blobName = `${chatId}/${noteName}`;

    await userStorageClient.deleteBlob(userId, blobName);

    context.log(`Successfully deleted note from blob: ${userId}/${blobName}`);
    return ResponseBuilder.successMessage("Note deleted successfully.");
  }
}

const deleteNoteFunction = new DeleteNoteFunction();

export async function DeleteNote(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return deleteNoteFunction.handler(request, context);
}

app.http("DeleteNote", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: DeleteNote,
});
