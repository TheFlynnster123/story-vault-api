import { GetChatHistory } from "../../src/functions/GetChatHistory";
import { d } from "../../src/utils/Dependencies";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";
import { Message, Chat } from "../../src/models/ChatPage";

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

describe("GetChatHistory Function", () => {
  let mockUserStorageClient: any;
  let mockContext: InvocationContext;

  beforeEach(() => {
    // Create focused mock for UserStorageClient with only getBlob
    mockUserStorageClient = {
      getBlob: jest.fn(),
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

      const response = await GetChatHistory(request, mockContext);

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

      const response = await GetChatHistory(request, mockContext);

      expectUnauthorizedResponse(response);
    });
  });

  describe("Success Cases", () => {
    it("should return empty chat when blob does not exist", async () => {
      mockUserStorageClient.getBlob.mockResolvedValue(undefined);
      const request = createMockRequest({ chatId: "nonexistent-chat" });

      const response = await GetChatHistory(request, mockContext);

      expectSuccessResponse(response);
      expectEmptyChatReturned(response, "nonexistent-chat");
    });

    it("should return empty chat when blob is empty", async () => {
      mockUserStorageClient.getBlob.mockResolvedValue("");
      const request = createMockRequest({ chatId: "empty-chat" });

      const response = await GetChatHistory(request, mockContext);

      expectSuccessResponse(response);
      expectEmptyChatReturned(response, "empty-chat");
    });

    it("should parse single message correctly", async () => {
      const message = createValidMessage("user", "Hello world");
      const blobContent = JSON.stringify(message) + "\n";
      mockUserStorageClient.getBlob.mockResolvedValue(blobContent);
      const request = createMockRequest({ chatId: "single-chat" });

      const response = await GetChatHistory(request, mockContext);

      expectSuccessResponse(response);
      expectChatWithMessages(response, "single-chat", [message]);
    });

    it("should parse multiple messages correctly", async () => {
      const messages = [
        createValidMessage("user", "Hello"),
        createValidMessage("system", "Hi there!"),
        createValidMessage("user", "How are you?"),
      ];
      const blobContent =
        messages.map(m => JSON.stringify(m)).join("\n") + "\n";
      mockUserStorageClient.getBlob.mockResolvedValue(blobContent);
      const request = createMockRequest({ chatId: "multi-chat" });

      const response = await GetChatHistory(request, mockContext);

      expectSuccessResponse(response);
      expectChatWithMessages(response, "multi-chat", messages);
    });

    it("should skip invalid JSON lines and continue processing", async () => {
      const validMessage1 = createValidMessage("user", "Valid message 1");
      const validMessage2 = createValidMessage("system", "Valid message 2");
      const blobContent =
        [
          JSON.stringify(validMessage1),
          "invalid json line",
          JSON.stringify(validMessage2),
          "", // empty line should be filtered out
          "another invalid line",
        ].join("\n") + "\n";

      mockUserStorageClient.getBlob.mockResolvedValue(blobContent);
      const request = createMockRequest({ chatId: "mixed-chat" });

      const response = await GetChatHistory(request, mockContext);

      expectSuccessResponse(response);
      expectChatWithMessages(response, "mixed-chat", [
        validMessage1,
        validMessage2,
      ]);
      expect(mockContext.warn).toHaveBeenCalledTimes(2); // Two invalid lines
    });

    it("should call getBlob with correct parameters", async () => {
      mockUserStorageClient.getBlob.mockResolvedValue("");
      const request = createMockRequest({ chatId: "param-test" });

      await GetChatHistory(request, mockContext);

      expect(mockUserStorageClient.getBlob).toHaveBeenCalledWith(
        "test-user-id",
        "param-test/chat-messages"
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle storage errors gracefully", async () => {
      mockUserStorageClient.getBlob.mockRejectedValue(
        new Error("Storage error")
      );
      const request = createMockRequest({ chatId: "error-chat" });

      const response = await GetChatHistory(request, mockContext);

      expectServerErrorResponse(response, "An unexpected error occurred.");
    });

    it("should handle JSON parsing errors gracefully", async () => {
      mockUserStorageClient.getBlob.mockResolvedValue(
        "completely invalid content"
      );
      const request = createMockRequest({ chatId: "parse-error-chat" });

      const response = await GetChatHistory(request, mockContext);

      expectSuccessResponse(response);
      expectEmptyChatReturned(response, "parse-error-chat");
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

  function createValidMessage(
    role: "user" | "system" = "user",
    content: string = "Test content"
  ): Message {
    return {
      id: `msg-${Date.now()}-${Math.random()}`,
      role,
      content,
    };
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

  function expectSuccessResponse(response: any): void {
    expect(response.status).toBe(200);
  }

  function expectServerErrorResponse(
    response: any,
    expectedMessage: string
  ): void {
    expect(response.status).toBe(500);
    expect(response.body).toBe(expectedMessage);
  }

  function expectEmptyChatReturned(
    response: any,
    expectedChatId: string
  ): void {
    const chat = JSON.parse(response.body);
    expect(chat).toEqual({
      chatId: expectedChatId,
      messages: [],
    });
  }

  function expectChatWithMessages(
    response: any,
    expectedChatId: string,
    expectedMessages: Message[]
  ): void {
    const chat = JSON.parse(response.body);
    expect(chat).toEqual({
      chatId: expectedChatId,
      messages: expectedMessages,
    });
  }
});

// Test Cases Summary for GetChatHistory:
// ✅ Validation Tests (1 case)
//   - Missing chatId
// ✅ Authentication Tests (1 case)
//   - Unauthenticated user
// ✅ Success Cases (6 cases)
//   - Return empty chat when blob doesn't exist
//   - Return empty chat when blob is empty
//   - Parse single message correctly
//   - Parse multiple messages correctly
//   - Skip invalid JSON lines and continue processing
//   - Call getBlob with correct parameters
// ✅ Error Handling (2 cases)
//   - Storage errors
//   - JSON parsing errors
