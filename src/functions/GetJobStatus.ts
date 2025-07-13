import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { BaseHttpFunction } from "../utils/baseHttpFunction";
import { CivitaiClient } from "../utils/civitaiClient";
import { ResponseBuilder } from "../utils/responseBuilder";

interface GetJobStatusRequestBody {
  jobId: string;
}

class GetJobStatusFunction extends BaseHttpFunction {
  protected validateRequestBody(body: GetJobStatusRequestBody): string | null {
    if (!body.jobId) {
      return "Missing jobId in request body";
    }
    if (typeof body.jobId !== "string") {
      return "jobId must be a string";
    }
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit> {
    const { jobId } = body as GetJobStatusRequestBody;
    const encryptionKey = request.headers.get("EncryptionKey") || undefined;

    const jobStatus = await CivitaiClient.getJobStatus(
      userId,
      jobId,
      encryptionKey
    );

    if (!jobStatus) {
      context.log(
        `Failed to get job status for user: ${userId}, jobId: ${jobId}`
      );
      return ResponseBuilder.badRequest(
        "Failed to get job status. Please ensure you have a valid Civitai API key and the job ID is correct."
      );
    }

    context.log(
      `Successfully retrieved job status for user: ${userId}, jobId: ${jobId}`
    );
    return ResponseBuilder.success(jobStatus, 200);
  }
}

const getJobStatusFunction = new GetJobStatusFunction();

export async function GetJobStatus(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return getJobStatusFunction.handler(request, context);
}

app.http("GetJobStatus", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: GetJobStatus,
});
