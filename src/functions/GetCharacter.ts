import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { UserStorageClientSingleton } from "../utils/userStorageClientSingleton";
import { ResponseBuilder } from "../utils/responseBuilder";
import type { Character } from "../models/Character";

interface GetCharacterRequestBody {
  chatId: string;
  characterId: string;
}

class GetCharacterFunction extends BaseHttpFunction {
  protected validateRequestBody(body: GetCharacterRequestBody): string | null {
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
    const { chatId, characterId } = body as GetCharacterRequestBody;

    const userStorageClient = UserStorageClientSingleton.getInstance();
    const blobName = `${chatId}/characters/${characterId}.character`;

    const characterContent = await userStorageClient.getBlob(
      userId,
      blobName
    );

    if (characterContent === undefined) {
      return ResponseBuilder.notFound("Character not found.");
    }

    try {
      const character = JSON.parse(characterContent) as Character;

      context.log(
        `Successfully retrieved character from blob: ${userId}/${blobName}`
      );
      return ResponseBuilder.success(character);
    } catch (parseError) {
      context.error(
        `Failed to parse character data for blob: ${userId}/${blobName}`,
        parseError
      );
      return ResponseBuilder.error("Failed to parse character data.");
    }
  }
}

const getCharacterFunction = new GetCharacterFunction();

export async function GetCharacter(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return getCharacterFunction.handler(request, context);
}

app.http("GetCharacter", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: GetCharacter,
});
