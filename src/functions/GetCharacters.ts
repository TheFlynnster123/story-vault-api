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

interface GetCharactersRequestBody {
  chatId: string;
}

class GetCharactersFunction extends BaseHttpFunction {
  protected validateRequestBody(body: GetCharactersRequestBody): string | null {
    if (!body.chatId) {
      return "Invalid request body. Missing chatId.";
    }
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const { chatId } = body as GetCharactersRequestBody;

    const userStorageClient = UserStorageClientSingleton.getInstance();
    const charactersPrefix = `${chatId}/characters/`;

    const blobNames = await userStorageClient.listBlobsByPrefix(
      userId,
      charactersPrefix
    );

    const characters: Character[] = [];

    for (const blobName of blobNames) {
      if (
        blobName.startsWith(charactersPrefix) &&
        blobName.endsWith(".character")
      ) {
        const content = await userStorageClient.getBlob(userId, blobName);
        if (content) {
          try {
            const character = JSON.parse(content) as Character;
            characters.push(character);
          } catch (parseError) {
            context.warn(
              `Failed to parse content for blob: ${userId}/${blobName}`,
              parseError
            );
          }
        }
      }
    }

    context.log(
      `Successfully retrieved ${characters.length} characters for chat ${chatId}`
    );
    return ResponseBuilder.success(characters);
  }
}

const getCharactersFunction = new GetCharactersFunction();

export async function GetCharacters(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return getCharactersFunction.handler(request, context);
}

app.http("GetCharacters", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: GetCharacters,
});
