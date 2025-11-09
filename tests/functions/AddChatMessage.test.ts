import { AddChatMessage } from "../../src/functions/AddChatMessage";
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

describe("AddChatMessage Function", () => {
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
      const request = createMockRequest({ message: createValidMessage() });

      const response = await AddChatMessage(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing chatId."
      );
    });

    it("should return 400 when message is missing", async () => {
      const request = createMockRequest({ chatId: "test-chat" });

      const response = await AddChatMessage(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing message or required message fields (id, role, content)."
      );
    });

    it("should return 400 when message id is missing", async () => {
      const request = createMockRequest({
        chatId: "test-chat",
        message: { role: "user", content: "test" },
      });

      const response = await AddChatMessage(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing message or required message fields (id, role, content)."
      );
    });

    it("should return 400 when message role is invalid", async () => {
      const request = createMockRequest({
        chatId: "test-chat",
        message: { id: "msg1", role: "admin", content: "test" },
      });

      const response = await AddChatMessage(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid message role. Must be 'user' or 'system'."
      );
    });
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetAuthenticatedUserId.mockResolvedValue("");
      const request = createMockRequest(createValidRequestBody());

      const response = await AddChatMessage(request, mockContext);

      expectUnauthorizedResponse(response);
    });
  });

  describe("Success Cases", () => {
    it("should call appendToBlob with correct parameters", async () => {
      const message = createValidMessage();
      const request = createMockRequest({ chatId: "test-chat", message });

      const response = await AddChatMessage(request, mockContext);

      expectSuccessResponse(response, "Message added successfully.");
      expectAppendToBlobCalledWith(
        "test-user-id",
        "test-chat/chat-messages",
        message
      );
    });

    it("should handle user messages", async () => {
      const userMessage = createValidMessage("user");
      const request = createMockRequest({
        chatId: "chat1",
        message: userMessage,
      });

      const response = await AddChatMessage(request, mockContext);

      expectSuccessResponse(response, "Message added successfully.");
      expectAppendToBlobCalledWith(
        "test-user-id",
        "chat1/chat-messages",
        userMessage
      );
    });

    it("should handle system messages", async () => {
      const systemMessage = createValidMessage("system");
      const request = createMockRequest({
        chatId: "chat1",
        message: systemMessage,
      });

      const response = await AddChatMessage(request, mockContext);

      expectSuccessResponse(response, "Message added successfully.");
      expectAppendToBlobCalledWith(
        "test-user-id",
        "chat1/chat-messages",
        systemMessage
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle storage errors gracefully", async () => {
      mockUserStorageClient.appendToBlob.mockRejectedValue(
        new Error("Storage error")
      );
      const message = createValidMessage();
      const request = createMockRequest({ chatId: "test-chat", message });

      const response = await AddChatMessage(request, mockContext);

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

  function createValidMessage(role: "user" | "system" = "user"): Message {
    return {
      id: `msg-${Date.now()}`,
      role,
      content: "Test message content",
    };
  }

  function createValidRequestBody() {
    return {
      chatId: "test-chat",
      message: createValidMessage(),
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
    message: Message
  ): void {
    const expectedContent = JSON.stringify(message) + "\n";
    expect(mockUserStorageClient.appendToBlob).toHaveBeenCalledWith(
      userId,
      blobName,
      expectedContent
    );
  }
});

// Test Cases Summary for AddChatMessage:
// ✅ Validation Tests (4 cases)
//   - Missing chatId
//   - Missing message
//   - Missing message fields (id, role, content)
//   - Invalid message role
// ✅ Authentication Tests (1 case)
//   - Unauthenticated user
// ✅ Success Cases (3 cases)
//   - Correct appendToBlob call with parameters
//   - Handle user messages
//   - Handle system messages
// ✅ Error Handling (1 case)
//   - Storage errors
