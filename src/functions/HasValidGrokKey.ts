import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getAuthenticatedUserId } from "../utils/getAuthenticatedUserId";
import { getGrokKeyRequest } from "../databaseRequests/getGrokKeyRequest";

export async function HasValidGrokKey(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const userId = await getAuthenticatedUserId(request);
    const grokKey = await getGrokKeyRequest(userId);

    if (grokKey) {
      return { status: 200 };
    } else {
      return { status: 404 };
    }
  } catch (err: any) {
    if (err.statusCode == 404) return { status: 404 };

    context.error("Error in HasValidGrokKey:", err.message);
    return { status: 500, body: JSON.stringify({ error: err.message }) };
  }
}

app.http("HasValidGrokKey", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: HasValidGrokKey,
});
