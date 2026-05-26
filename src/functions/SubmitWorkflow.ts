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

class SubmitWorkflowFunction extends BaseHttpFunction {
  protected validateRequestBody(body: any): string | null {
    if (!body || !Array.isArray(body.steps) || body.steps.length === 0) {
      return "Request body must include a non-empty steps array";
    }
    return null;
  }

  protected async execute(
    request: HttpRequest,
    _context: InvocationContext,
    userId: string,
    body: any,
  ): Promise<HttpResponseInit> {
    const encryptionKey = request.headers.get("EncryptionKey") || undefined;
    const civitaiKey = await getCivitaiKeyRequest(userId, encryptionKey);

    if (!civitaiKey) {
      return ResponseBuilder.badRequest(
        "No CivitAI API key found for this user.",
      );
    }

    const waitParam = request.query.get("wait") ?? "0";
    const url = `${CIVITAI_ORCHESTRATION_BASE}/v2/consumer/workflows?wait=${waitParam}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${civitaiKey}`,
      },
      body: JSON.stringify(body),
    });

    const responseBody = await response.json();

    return {
      status: response.status,
      headers: { "Content-Type": "application/json" },
      jsonBody: responseBody,
    };
  }
}

const submitWorkflowFunction = new SubmitWorkflowFunction();

export async function SubmitWorkflow(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return submitWorkflowFunction.handler(request, context);
}

app.http("SubmitWorkflow", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: SubmitWorkflow,
});
