import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { UserStorageClientSingleton } from "../utils/userStorageClientSingleton";
import { ResponseBuilder } from "../utils/responseBuilder";

interface GetNoteRequestBody {
  chatId: string;
  noteName: string;
}

interface GetNoteResponse {
  content: string;
}

class GetNoteFunction extends BaseHttpFunction {
  protected validateRequestBody(body: GetNoteRequestBody): string | null {
    if (!body.chatId || !body.noteName) {
      return "Invalid request body. Missing chatId or noteName.";
    }
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const { chatId, noteName } = body as GetNoteRequestBody;

    const userStorageClient = UserStorageClientSingleton.getInstance();
    const blobName = `${chatId}/${noteName}`;

    const content = await userStorageClient.getBlob(userId, blobName);

    if (content === undefined) {
      return ResponseBuilder.notFound("Note not found.");
    }

    context.log(`Successfully retrieved note from blob: ${userId}/${blobName}`);
    const response: GetNoteResponse = { content };
    return ResponseBuilder.success(response);
  }
}

const getNoteFunction = new GetNoteFunction();

export async function GetNote(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return getNoteFunction.handler(request, context);
}

app.http("GetNote", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: GetNote,
});
