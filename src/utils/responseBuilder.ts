import { HttpResponseInit } from "@azure/functions";

export class ResponseBuilder {
  static success(data?: any, status: number = 200): HttpResponseInit {
    return {
      status,
      headers: {
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    };
  }

  static successMessage(
    message: string,
    status: number = 200
  ): HttpResponseInit {
    return {
      status,
      body: message,
    };
  }

  static error(message: string, status: number = 500): HttpResponseInit {
    return {
      status,
      body: message,
    };
  }

  static jsonError(
    error: string,
    details?: string,
    status: number = 500
  ): HttpResponseInit {
    return {
      status,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error,
        ...(details && { details }),
      }),
    };
  }

  static unauthorized(
    message: string = "Unauthorized. No user ID found."
  ): HttpResponseInit {
    return {
      status: 401,
      body: message,
    };
  }

  static badRequest(message: string): HttpResponseInit {
    return {
      status: 400,
      body: message,
    };
  }

  static notFound(message: string = "Resource not found."): HttpResponseInit {
    return {
      status: 404,
      body: message,
    };
  }

  static invalidJson(): HttpResponseInit {
    return {
      status: 400,
      body: "Invalid JSON format in request body.",
    };
  }
}
