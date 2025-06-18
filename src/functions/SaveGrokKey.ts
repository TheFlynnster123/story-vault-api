import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getAuthenticatedUserId } from "../utils/getAuthenticatedUserId";
import { saveGrokKeyRequest } from "../databaseRequests/saveGrokKeyRequest";

export async function SaveGrokKey(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const userId = await getAuthenticatedUserId(request);

    const grokKey = await getKey(request);

    await saveGrokKeyRequest(userId, grokKey);

    return { status: 201 };
  } catch (err: any) {
    context.error("Error in SaveGrokKey:", err.message);
    return { status: 401, body: JSON.stringify({ error: err.message }) };
  }
}

const getKey = async (request: HttpRequest): Promise<string> => {
  const { grokKey } = (await request.json()) as any;

  if (!grokKey) {
    throw new Error("Missing grokKey in request body");
  }

  return grokKey;
};

app.http("SaveGrokKey", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: SaveGrokKey,
});
