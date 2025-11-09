import { SaveChatHistory } from "../../src/functions/SaveChatHistory";
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

describe("SaveChatHistory Function", () => {
  let mockUserStorageClient: any;
  let mockContext: InvocationContext;

  beforeEach(() => {
    // Create focused mock for UserStorageClient with replaceAppendBlob
    mockUserStorageClient = {
      replaceAppendBlob: jest.fn().mockResolvedValue(void 0),
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
      const request = createMockRequest({ messages: [] });

      const response = await SaveChatHistory(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing chatId."
      );
    });

    it("should return 400 when messages is missing", async () => {
      const request = createMockRequest({ chatId: "test-chat" });

      const response = await SaveChatHistory(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing messages array."
      );
    });

    it("should return 400 when messages is not an array", async () => {
      const request = createMockRequest({
        chatId: "test-chat",
        messages: "not-an-array",
      });

      const response = await SaveChatHistory(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing messages array."
      );
    });
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetAuthenticatedUserId.mockResolvedValue("");
      const request = createMockRequest(createValidRequestBody());

      const response = await SaveChatHistory(request, mockContext);

      expectUnauthorizedResponse(response);
    });
  });

  describe("Success Cases", () => {
    it("should save empty chat history", async () => {
      const chat: Chat = { chatId: "empty-chat", messages: [] };
      const request = createMockRequest(chat);

      const response = await SaveChatHistory(request, mockContext);

      expectSuccessResponse(response, "Chat history saved successfully.");
      expectReplaceAppendBlobCalledWith(
        "test-user-id",
        "empty-chat/chat-messages",
        []
      );
    });

    it("should save single message chat", async () => {
      const message = createValidMessage();
      const chat: Chat = { chatId: "single-chat", messages: [message] };
      const request = createMockRequest(chat);

      const response = await SaveChatHistory(request, mockContext);

      expectSuccessResponse(response, "Chat history saved successfully.");
      expectReplaceAppendBlobCalledWith(
        "test-user-id",
        "single-chat/chat-messages",
        [message]
      );
    });

    it("should save multiple message chat", async () => {
      const messages = [
        createValidMessage("user", "Hello"),
        createValidMessage("system", "Hi there!"),
        createValidMessage("user", "How are you?"),
      ];
      const chat: Chat = { chatId: "multi-chat", messages };
      const request = createMockRequest(chat);

      const response = await SaveChatHistory(request, mockContext);

      expectSuccessResponse(response, "Chat history saved successfully.");
      expectReplaceAppendBlobCalledWith(
        "test-user-id",
        "multi-chat/chat-messages",
        messages
      );
    });

    it("should format messages as JSONL", async () => {
      const messages = [
        createValidMessage("user", "First"),
        createValidMessage("system", "Second"),
      ];
      const chat: Chat = { chatId: "format-test", messages };
      const request = createMockRequest(chat);

      await SaveChatHistory(request, mockContext);

      const expectedContent =
        messages.map(m => JSON.stringify(m)).join("\n") + "\n";
      expect(mockUserStorageClient.replaceAppendBlob).toHaveBeenCalledWith(
        "test-user-id",
        "format-test/chat-messages",
        expectedContent
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle storage errors gracefully", async () => {
      mockUserStorageClient.replaceAppendBlob.mockRejectedValue(
        new Error("Storage error")
      );
      const request = createMockRequest(createValidRequestBody());

      const response = await SaveChatHistory(request, mockContext);

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

  function createValidRequestBody(): Chat {
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

  function expectReplaceAppendBlobCalledWith(
    userId: string,
    blobName: string,
    messages: Message[]
  ): void {
    const expectedContent =
      messages.map(m => JSON.stringify(m)).join("\n") + "\n";
    expect(mockUserStorageClient.replaceAppendBlob).toHaveBeenCalledWith(
      userId,
      blobName,
      expectedContent
    );
  }
});

// Test Cases Summary for SaveChatHistory:
// ✅ Validation Tests (3 cases)
//   - Missing chatId
//   - Missing messages array
//   - Invalid messages type (not array)
// ✅ Authentication Tests (1 case)
//   - Unauthenticated user
// ✅ Success Cases (4 cases)
//   - Save empty chat history
//   - Save single message chat
//   - Save multiple message chat
//   - Correct JSONL formatting
// ✅ Error Handling (1 case)
//   - Storage errors
