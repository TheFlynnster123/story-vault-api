import { HttpRequest, InvocationContext } from "@azure/functions";
import { BaseHttpFunction } from "../../src/utils/baseHttpFunction";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";

// Mock dependencies
jest.mock("../../src/utils/getAuthenticatedUserId");

const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;

// Create a concrete implementation for testing
class TestHttpFunction extends BaseHttpFunction {
  protected validateRequestBody(body: any): string | null {
    if (!body.testField) {
      return "Missing testField";
    }
    return null;
  }

  protected async execute(
    request: HttpRequest,
    context: InvocationContext,
    userId: string
  ) {
    const body = await request.json();
    return {
      status: 200,
      body: JSON.stringify({ success: true, userId, data: body }),
    };
  }
}

describe("BaseHttpFunction", () => {
  let testFunction: TestHttpFunction;
  let mockRequest: Partial<HttpRequest>;
  let mockContext: Partial<InvocationContext>;

  beforeEach(() => {
    testFunction = new TestHttpFunction();
    mockRequest = {
      url: "http://localhost:7071/api/test",
      json: jest.fn(),
    };
    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 401 when user is not authenticated", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("");

    const response = await testFunction.handler(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(401);
    expect(response.body).toBe("Unauthorized. No user ID found.");
  });

  it("should return 400 when request body validation fails", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue({});

    const response = await testFunction.handler(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe("Missing testField");
  });

  it("should execute successfully with valid input", async () => {
    const testData = { testField: "value" };
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue(testData);

    const response = await testFunction.handler(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(200);
    const responseBody = JSON.parse(response.body as string);
    expect(responseBody.success).toBe(true);
    expect(responseBody.userId).toBe("user123");
    expect(responseBody.data).toEqual(testData);
  });

  it("should handle unexpected errors", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue({ testField: "value" });

    // Create a function that throws an error in execute
    class ErrorTestFunction extends BaseHttpFunction {
      protected validateRequestBody(): string | null {
        return null;
      }

      protected async execute(): Promise<any> {
        throw new Error("Test error");
      }
    }

    const errorFunction = new ErrorTestFunction();
    const response = await errorFunction.handler(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(500);
    expect(response.body).toBe("An unexpected error occurred.");
    expect(mockContext.error).toHaveBeenCalledWith(
      "Error in function:",
      expect.any(Error)
    );
  });

  it("should log request processing", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue({ testField: "value" });

    await testFunction.handler(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(mockContext.log).toHaveBeenCalledWith(
      'Http function processed request for url "http://localhost:7071/api/test"'
    );
  });
});
