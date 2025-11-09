import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { ResponseBuilder } from "../utils/responseBuilder";
import { d } from "../utils/Dependencies";

class GetChatsFunction extends BaseHttpFunction {
  protected validateRequestBody(body: any): string | null {
    // No request body validation needed for this endpoint
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const chatIds = await d.UserStorageClient().listChatIds(userId);
    const filteredChatIds = filterSystemChats(chatIds);

    context.log(
      `Successfully retrieved ${filteredChatIds.length} chats for user: ${userId}`
    );
    return ResponseBuilder.success(filteredChatIds);
  }
}

const filterSystemChats = (chatIds: string[]): string[] =>
  chatIds.filter(id => id !== "global");

const getChatsFunction = new GetChatsFunction();

export async function GetChats(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return getChatsFunction.handler(request, context);
}

app.http("GetChats", {
  methods: ["POST"], // As requested by the user
  authLevel: "anonymous",
  handler: GetChats,
});
