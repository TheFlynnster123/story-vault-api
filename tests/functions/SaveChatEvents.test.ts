import { SaveChatEvents } from "../../src/functions/SaveChatEvents";
import { d } from "../../src/utils/Dependencies";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";
import { ChatEventDTO, Chat } from "../../src/models/Chat";

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

describe("SaveChatEvents Function", () => {
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
      const request = createMockRequest({ events: [] });

      const response = await SaveChatEvents(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing chatId."
      );
    });

    it("should return 400 when events is missing", async () => {
      const request = createMockRequest({ chatId: "test-chat" });

      const response = await SaveChatEvents(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing events array."
      );
    });

    it("should return 400 when events is not an array", async () => {
      const request = createMockRequest({
        chatId: "test-chat",
        events: "not-an-array",
      });

      const response = await SaveChatEvents(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing events array."
      );
    });
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetAuthenticatedUserId.mockResolvedValue("");
      const request = createMockRequest(createValidRequestBody());

      const response = await SaveChatEvents(request, mockContext);

      expectUnauthorizedResponse(response);
    });
  });

  describe("Success Cases", () => {
    it("should save empty chat events", async () => {
      const chat: Chat = { chatId: "empty-chat", events: [] };
      const request = createMockRequest(chat);

      const response = await SaveChatEvents(request, mockContext);

      expectSuccessResponse(response, "Chat events saved successfully.");
      expectReplaceAppendBlobCalledWith(
        "test-user-id",
        "empty-chat/chat-events",
        []
      );
    });

    it("should save single event chat", async () => {
      const event = createValidEvent();
      const chat: Chat = { chatId: "single-chat", events: [event] };
      const request = createMockRequest(chat);

      const response = await SaveChatEvents(request, mockContext);

      expectSuccessResponse(response, "Chat events saved successfully.");
      expectReplaceAppendBlobCalledWith(
        "test-user-id",
        "single-chat/chat-events",
        [event]
      );
    });

    it("should save multiple event chat", async () => {
      const events = [
        createValidEvent("Hello"),
        createValidEvent("Hi there!"),
        createValidEvent("How are you?"),
      ];
      const chat: Chat = { chatId: "multi-chat", events };
      const request = createMockRequest(chat);

      const response = await SaveChatEvents(request, mockContext);

      expectSuccessResponse(response, "Chat events saved successfully.");
      expectReplaceAppendBlobCalledWith(
        "test-user-id",
        "multi-chat/chat-events",
        events
      );
    });

    it("should format events as JSONL", async () => {
      const events = [createValidEvent("First"), createValidEvent("Second")];
      const chat: Chat = { chatId: "format-test", events };
      const request = createMockRequest(chat);

      await SaveChatEvents(request, mockContext);

      const expectedContent =
        events.map(e => JSON.stringify(e)).join("\n") + "\n";
      expect(mockUserStorageClient.replaceAppendBlob).toHaveBeenCalledWith(
        "test-user-id",
        "format-test/chat-events",
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

      const response = await SaveChatEvents(request, mockContext);

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

  function createValidEvent(content: string = "Test content"): ChatEventDTO {
    return {
      id: `evt-${Date.now()}-${Math.random()}`,
      content,
    };
  }

  function createValidRequestBody(): Chat {
    return {
      chatId: "test-chat",
      events: [createValidEvent()],
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
    events: ChatEventDTO[]
  ): void {
    const expectedContent =
      events.map(e => JSON.stringify(e)).join("\n") + "\n";
    expect(mockUserStorageClient.replaceAppendBlob).toHaveBeenCalledWith(
      userId,
      blobName,
      expectedContent
    );
  }
});

// Test Cases Summary for SaveChatEvents:
// ✅ Validation Tests (3 cases)
//   - Missing chatId
//   - Missing events array
//   - Invalid events type (not array)
// ✅ Authentication Tests (1 case)
//   - Unauthenticated user
// ✅ Success Cases (4 cases)
//   - Save empty chat events
//   - Save single event chat
//   - Save multiple event chat
//   - Correct JSONL formatting
// ✅ Error Handling (1 case)
//   - Storage errors
