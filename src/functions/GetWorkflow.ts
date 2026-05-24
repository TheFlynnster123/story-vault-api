import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { getCivitaiKeyRequest } from "../databaseRequests/getCivitaiKeyRequest";
import { ResponseBuilder } from "../utils/responseBuilder";

const CIVITAI_ORCHESTRATION_BASE = "https://orchestration.civitai.com";

interface GetWorkflowRequestBody {
  workflowId: string;
}

class GetWorkflowFunction extends BaseHttpFunction {
  protected validateRequestBody(body: GetWorkflowRequestBody): string | null {
    if (!body?.workflowId) {
      return "Missing workflowId in request body";
    }
    return null;
  }

  protected async execute(
    request: HttpRequest,
    _context: InvocationContext,
    userId: string,
    body: GetWorkflowRequestBody,
  ): Promise<HttpResponseInit> {
    const encryptionKey = request.headers.get("EncryptionKey") || undefined;
    const civitaiKey = await getCivitaiKeyRequest(userId, encryptionKey);

    if (!civitaiKey) {
      return ResponseBuilder.badRequest(
        "No CivitAI API key found for this user.",
      );
    }

    const url = `${CIVITAI_ORCHESTRATION_BASE}/v2/consumer/workflows/${body.workflowId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${civitaiKey}`,
      },
    });

    const responseBody = await response.json();

    return {
      status: response.status,
      headers: { "Content-Type": "application/json" },
      jsonBody: responseBody,
    };
  }
}

const getWorkflowFunction = new GetWorkflowFunction();

export async function GetWorkflow(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return getWorkflowFunction.handler(request, context);
}

app.http("GetWorkflow", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: GetWorkflow,
});
