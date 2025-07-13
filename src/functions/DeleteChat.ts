import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { UserStorageClientSingleton } from "../utils/userStorageClientSingleton";
import { ResponseBuilder } from "../utils/responseBuilder";

interface DeleteChatRequestBody {
  chatId: string;
}

class DeleteChatFunction extends BaseHttpFunction {
  protected validateRequestBody(body: DeleteChatRequestBody): string | null {
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
    const { chatId } = body as DeleteChatRequestBody;

    const userStorageClient = UserStorageClientSingleton.getInstance();

    await userStorageClient.deleteFolder(userId, chatId);

    context.log(`Successfully deleted chat from blob: ${userId}/${chatId}`);
    return ResponseBuilder.successMessage("Chat deleted successfully.");
  }
}

const deleteChatFunction = new DeleteChatFunction();

export async function DeleteChat(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return deleteChatFunction.handler(request, context);
}

app.http("DeleteChat", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: DeleteChat,
});
