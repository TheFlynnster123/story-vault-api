import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getAuthenticatedUserId } from "./getAuthenticatedUserId";
import { ResponseBuilder } from "./responseBuilder";

export abstract class BaseHttpFunction {
  protected abstract execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string,
    body?: any
  ): Promise<HttpResponseInit>;

  protected abstract validateRequestBody(body: any): string | null;

  async handler(
    request: HttpRequest,
    context: InvocationContext
  ): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    try {
      // Authentication
      const userId = await getAuthenticatedUserId(request);
      if (!userId) {
        return ResponseBuilder.unauthorized();
      }

      // Parse request body - try JSON first, then text, then allow undefined
      let body: any;
      try {
        body = await request.json();
      } catch (jsonError) {
        try {
          const textBody = await request.text();
          body = textBody || undefined;
        } catch (textError) {
          body = undefined;
        }
      }

      // Validate request body
      const validationError = this.validateRequestBody(body);
      if (validationError) {
        return ResponseBuilder.badRequest(validationError);
      }

      // Execute the specific function logic
      return await this.execute(request, context, userId, body);
    } catch (error) {
      context.error("Error in function:", error);
      if (error instanceof SyntaxError && error.message.includes("JSON")) {
        return ResponseBuilder.invalidJson();
      }
      return ResponseBuilder.error("An unexpected error occurred.");
    }
  }
}
