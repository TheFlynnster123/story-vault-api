import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { UserStorageClient } from "../utils/UserStorageClient";
import { getAuthenticatedUserId } from "../utils/getAuthenticatedUserId";

export async function GetChats(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(
    `Http function processed request for url "${request.url}" (GetChats)`
  );

  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return {
      status: 401,
      body: "Unauthorized. No user ID found.",
    };
  }

  try {
    const userStorageClient = new UserStorageClient();
    const chatIds = await userStorageClient.listChatIds(userId);

    return {
      status: 200,
      jsonBody: chatIds,
    };
  } catch (error) {
    context.error("Error getting chats:", error);
    return {
      status: 500,
      body: "Failed to get chats.",
    };
  }
}

app.http("GetChats", {
  methods: ["POST"], // As requested by the user
  authLevel: "anonymous",
  handler: GetChats,
});
