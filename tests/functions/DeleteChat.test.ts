import { DeleteChat } from "../../src/functions/DeleteChat";
import { d } from "../../src/utils/Dependencies";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";

// Mock external dependencies
jest.mock("../../src/utils/getAuthenticatedUserId");
jest.mock("../../src/utils/Dependencies");

// Mock Azure Functions app to eliminate runtime warnings
jest.mock("@azure/functions", () => ({
  ...jest.requireActual("@azure/functions"),
  app: {
    http: jest.fn(),
  },
}));

const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;

describe("DeleteChat Function", () => {
  let mockUserStorageClient: any;
  let mockContext: InvocationContext;

  beforeEach(() => {
    // Create focused mock for UserStorageClient with only deleteFolder
    mockUserStorageClient = {
      deleteFolder: jest.fn().mockResolvedValue(void 0),
    };

    // Mock the dependency injection
    (d.UserStorageClient as jest.Mock) = jest.fn(() => mockUserStorageClient);

    mockContext = createMockContext();
    mockGetAuthenticatedUserId.mockResolvedValue("test-user-id");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Validation", () => {
    it("should return 400 when chatId is missing", async () => {
      const request = createMockRequest({});

      const response = await DeleteChat(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing chatId."
      );
    });

    it("should return 400 when chatId is empty string", async () => {
      const request = createMockRequest({ chatId: "" });

      const response = await DeleteChat(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing chatId."
      );
    });

    it("should return 400 when chatId is null", async () => {
      const request = createMockRequest({ chatId: null });

      const response = await DeleteChat(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing chatId."
      );
    });
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetAuthenticatedUserId.mockResolvedValue("");
      const request = createMockRequest({ chatId: "test-chat" });

      const response = await DeleteChat(request, mockContext);

      expectUnauthorizedResponse(response);
    });
  });

  describe("Success Cases", () => {
    it("should call deleteFolder with correct parameters", async () => {
      const request = createMockRequest({ chatId: "chat-to-delete" });

      const response = await DeleteChat(request, mockContext);

      expectSuccessResponse(response, "Chat deleted successfully.");
      expect(mockUserStorageClient.deleteFolder).toHaveBeenCalledWith(
        "test-user-id",
        "chat-to-delete"
      );
    });

    it("should handle different chat IDs correctly", async () => {
      const chatIds = ["chat1", "my-special-chat", "chat_with_underscores"];

      for (const chatId of chatIds) {
        const request = createMockRequest({ chatId });
        const response = await DeleteChat(request, mockContext);

        expectSuccessResponse(response, "Chat deleted successfully.");
        expect(mockUserStorageClient.deleteFolder).toHaveBeenCalledWith(
          "test-user-id",
          chatId
        );
      }
    });

    it("should log successful deletion", async () => {
      const request = createMockRequest({ chatId: "test-chat" });

      await DeleteChat(request, mockContext);

      expect(mockContext.log).toHaveBeenCalledWith(
        "Successfully deleted chat from blob: test-user-id/test-chat"
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle storage errors gracefully", async () => {
      mockUserStorageClient.deleteFolder.mockRejectedValue(
        new Error("Storage error")
      );
      const request = createMockRequest({ chatId: "error-chat" });

      const response = await DeleteChat(request, mockContext);

      expectServerErrorResponse(response);
    });

    it("should handle permission errors", async () => {
      mockUserStorageClient.deleteFolder.mockRejectedValue(
        new Error("Access denied")
      );
      const request = createMockRequest({ chatId: "restricted-chat" });

      const response = await DeleteChat(request, mockContext);

      expectServerErrorResponse(response);
    });
  });

  // Helper Functions
  function createMockContext(): InvocationContext {
    return {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;
  }

  function createMockRequest(body: any): HttpRequest {
    return {
      json: jest.fn().mockResolvedValue(body),
      headers: new Map(),
    } as any;
  }

  function expectBadRequestResponse(
    response: any,
    expectedMessage: string
  ): void {
    expect(response.status).toBe(400);
    expect(response.body).toBe(expectedMessage);
  }

  function expectUnauthorizedResponse(response: any): void {
    expect(response.status).toBe(401);
  }

  function expectSuccessResponse(response: any, expectedMessage: string): void {
    expect(response.status).toBe(200);
    expect(response.body).toBe(expectedMessage);
  }

  function expectServerErrorResponse(response: any): void {
    expect(response.status).toBe(500);
  }
});

// Test Cases Summary for DeleteChat:
// ✅ Validation Tests (3 cases)
//   - Missing chatId
//   - Empty string chatId
//   - Null chatId
// ✅ Authentication Tests (1 case)
//   - Unauthenticated user
// ✅ Success Cases (3 cases)
//   - Call deleteFolder with correct parameters
//   - Handle different chat ID formats
//   - Log successful deletion
// ✅ Error Handling (2 cases)
//   - Storage errors
//   - Permission errors
