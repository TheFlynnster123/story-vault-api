import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { UserStorageClientSingleton } from "../utils/userStorageClientSingleton";
import { ResponseBuilder } from "../utils/responseBuilder";

interface DeleteCharacterRequestBody {
  chatId: string;
  characterId: string;
}

class DeleteCharacterFunction extends BaseHttpFunction {
  protected validateRequestBody(
    body: DeleteCharacterRequestBody
  ): string | null {
    if (!body.chatId || !body.characterId) {
      return "Invalid request body. Missing chatId or characterId.";
    }
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const { chatId, characterId } = body as DeleteCharacterRequestBody;

    const userStorageClient = UserStorageClientSingleton.getInstance();
    const blobName = `${chatId}/characters/${characterId}.character`;

    await userStorageClient.deleteBlob(userId, blobName);

    context.log(
      `Successfully deleted character from blob: ${userId}/${blobName}`
    );
    return ResponseBuilder.successMessage("Character deleted successfully.");
  }
}

const deleteCharacterFunction = new DeleteCharacterFunction();

export async function DeleteCharacter(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return deleteCharacterFunction.handler(request, context);
}

app.http("DeleteCharacter", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: DeleteCharacter,
});
