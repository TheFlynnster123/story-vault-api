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

class SaveCharacterFunction extends BaseHttpFunction {
  protected validateRequestBody(body: Character): string | null {
    if (!body.id || !body.chatId || !body.name) {
      return "Invalid request body. Missing id, chatId, or name.";
    }
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const character = body as Character;

    const userStorageClient = UserStorageClientSingleton.getInstance();
    const blobName = `${character.chatId}/characters/${character.id}.character`;

    const characterContent = JSON.stringify(character);

    await userStorageClient.uploadBlob(userId, blobName, characterContent);

    context.log(
      `Successfully saved character to blob: ${userId}/${blobName}`
    );
    return ResponseBuilder.successMessage("Character saved successfully.");
  }
}

const saveCharacterFunction = new SaveCharacterFunction();

export async function SaveCharacter(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return saveCharacterFunction.handler(request, context);
}

app.http("SaveCharacter", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: SaveCharacter,
});
