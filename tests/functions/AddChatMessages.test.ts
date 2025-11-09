import { AddChatMessages } from "../../src/functions/AddChatMessages";
import { d } from "../../src/utils/Dependencies";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";
import { Message } from "../../src/models/ChatPage";

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

describe("AddChatMessages Function", () => {
  let mockUserStorageClient: any;
  let mockContext: InvocationContext;

  beforeEach(() => {
    // Create focused mock for UserStorageClient with only appendToBlob
    mockUserStorageClient = {
      appendToBlob: jest.fn().mockResolvedValue(void 0),
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
      const request = createMockRequest({ messages: [createValidMessage()] });

      const response = await AddChatMessages(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing chatId."
      );
    });

    it("should return 400 when messages is missing", async () => {
      const request = createMockRequest({ chatId: "test-chat" });

      const response = await AddChatMessages(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing messages array."
      );
    });

    it("should return 400 when messages is not an array", async () => {
      const request = createMockRequest({
        chatId: "test-chat",
        messages: "not-array",
      });

      const response = await AddChatMessages(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing messages array."
      );
    });

    it("should return 400 when messages array is empty", async () => {
      const request = createMockRequest({ chatId: "test-chat", messages: [] });

      const response = await AddChatMessages(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Messages array cannot be empty."
      );
    });

    it("should return 400 when message id is missing", async () => {
      const invalidMessage = { role: "user", content: "Hello" }; // Missing id
      const request = createMockRequest({
        chatId: "test-chat",
        messages: [invalidMessage],
      });

      const response = await AddChatMessages(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid message at index 0. Missing required fields (id, content)."
      );
    });

    it("should return 400 when message content is missing", async () => {
      const invalidMessage = { id: "msg-1", role: "user" }; // Missing content
      const request = createMockRequest({
        chatId: "test-chat",
        messages: [invalidMessage],
      });

      const response = await AddChatMessages(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid message at index 0. Missing required fields (id, content)."
      );
    });

    it("should return 400 when one message in array is invalid", async () => {
      const validMessage = createValidMessage();
      const invalidMessage = { id: "msg-2", role: "user" }; // Missing content
      const request = createMockRequest({
        chatId: "test-chat",
        messages: [validMessage, invalidMessage],
      });

      const response = await AddChatMessages(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid message at index 1. Missing required fields (id, content)."
      );
    });

    it("should accept messages without role field", async () => {
      const messageWithoutRole = {
        id: "msg-1",
        content: "Hello without role",
      };
      const request = createMockRequest({
        chatId: "test-chat",
        messages: [messageWithoutRole],
      });

      const response = await AddChatMessages(request, mockContext);

      expectSuccessResponse(response, "1 messages added successfully.");
    });
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetAuthenticatedUserId.mockResolvedValue("");
      const request = createMockRequest(createValidRequestBody());

      const response = await AddChatMessages(request, mockContext);

      expectUnauthorizedResponse(response);
    });
  });

  describe("Success Cases", () => {
    it("should append single message successfully", async () => {
      const message = createValidMessage("user", "Hello");
      const request = createMockRequest({
        chatId: "single-chat",
        messages: [message],
      });

      const response = await AddChatMessages(request, mockContext);

      expectSuccessResponse(response, "1 messages added successfully.");
      expectAppendToBlobCalledWith(
        "test-user-id",
        "single-chat/chat-messages",
        [message]
      );
    });

    it("should append multiple messages successfully", async () => {
      const messages = [
        createValidMessage("user", "Hello"),
        createValidMessage("system", "Hi there!"),
        createValidMessage("user", "How are you?"),
      ];
      const request = createMockRequest({
        chatId: "multi-chat",
        messages,
      });

      const response = await AddChatMessages(request, mockContext);

      expectSuccessResponse(response, "3 messages added successfully.");
      expectAppendToBlobCalledWith(
        "test-user-id",
        "multi-chat/chat-messages",
        messages
      );
    });

    it("should handle messages with newlines in content", async () => {
      const messageWithNewlines = createValidMessage(
        "user",
        "Line 1\nLine 2\nLine 3"
      );
      const request = createMockRequest({
        chatId: "newline-test",
        messages: [messageWithNewlines],
      });

      const response = await AddChatMessages(request, mockContext);

      expectSuccessResponse(response, "1 messages added successfully.");
      expectAppendToBlobCalledWith(
        "test-user-id",
        "newline-test/chat-messages",
        [messageWithNewlines]
      );
    });

    it("should format messages as JSONL correctly", async () => {
      const messages = [
        createValidMessage("user", "First"),
        createValidMessage("system", "Second"),
      ];
      const request = createMockRequest({
        chatId: "format-test",
        messages,
      });

      await AddChatMessages(request, mockContext);

      const expectedContent =
        messages.map(m => JSON.stringify(m)).join("\n") + "\n";
      expect(mockUserStorageClient.appendToBlob).toHaveBeenCalledWith(
        "test-user-id",
        "format-test/chat-messages",
        expectedContent
      );
    });

    it("should log successful message count", async () => {
      const messages = [createValidMessage(), createValidMessage()];
      const request = createMockRequest({
        chatId: "log-test",
        messages,
      });

      await AddChatMessages(request, mockContext);

      expect(mockContext.log).toHaveBeenCalledWith(
        "Successfully appended 2 messages to chat: test-user-id/log-test/chat-messages"
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle storage errors gracefully", async () => {
      mockUserStorageClient.appendToBlob.mockRejectedValue(
        new Error("Storage error")
      );
      const request = createMockRequest(createValidRequestBody());

      const response = await AddChatMessages(request, mockContext);

      expectServerErrorResponse(response);
    });
  });

  // Helper Functions - Apply clean code principles here too!
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
    content: string = "Test message content"
  ): Message {
    return {
      id: `msg-${Date.now()}-${Math.random()}`,
      role,
      content,
    };
  }

  function createValidRequestBody() {
    return {
      chatId: "test-chat",
      messages: [createValidMessage()],
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

  function expectSuccessResponse(response: any, expectedMessage: string): void {
    expect(response.status).toBe(200);
    expect(response.body).toBe(expectedMessage);
  }

  function expectServerErrorResponse(response: any): void {
    expect(response.status).toBe(500);
  }

  function expectAppendToBlobCalledWith(
    userId: string,
    blobName: string,
    messages: Message[]
  ): void {
    const expectedContent =
      messages.map(m => JSON.stringify(m)).join("\n") + "\n";
    expect(mockUserStorageClient.appendToBlob).toHaveBeenCalledWith(
      userId,
      blobName,
      expectedContent
    );
  }
});

// Test Cases Summary for AddChatMessages:
// ✅ Validation Tests (8 cases)
//   - Missing chatId, messages, empty array, invalid message fields
//   - Validates each message in array, accepts messages without role
// ✅ Authentication Tests (1 case)
//   - Unauthenticated user returns 401
// ✅ Success Cases (6 cases)
//   - Single and multiple message append, newlines handling, JSONL formatting, logging
// ✅ Error Handling (1 case)
//   - Storage error handling
