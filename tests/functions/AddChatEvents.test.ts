import { AddChatEvents } from "../../src/functions/AddChatEvents";
import { d } from "../../src/utils/Dependencies";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";
import { ChatEventDTO } from "../../src/models/Chat";

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

describe("AddChatEvents Function", () => {
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
      const request = createMockRequest({ events: [createValidEvent()] });

      const response = await AddChatEvents(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing chatId."
      );
    });

    it("should return 400 when events is missing", async () => {
      const request = createMockRequest({ chatId: "test-chat" });

      const response = await AddChatEvents(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing events array."
      );
    });

    it("should return 400 when events is not an array", async () => {
      const request = createMockRequest({
        chatId: "test-chat",
        events: "not-array",
      });

      const response = await AddChatEvents(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing events array."
      );
    });

    it("should return 400 when events array is empty", async () => {
      const request = createMockRequest({ chatId: "test-chat", events: [] });

      const response = await AddChatEvents(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Events array cannot be empty."
      );
    });

    it("should return 400 when event id is missing", async () => {
      const invalidEvent = { content: "Hello" }; // Missing id
      const request = createMockRequest({
        chatId: "test-chat",
        events: [invalidEvent],
      });

      const response = await AddChatEvents(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid event at index 0. Missing required fields (id, content)."
      );
    });

    it("should return 400 when event content is missing", async () => {
      const invalidEvent = { id: "evt-1" }; // Missing content
      const request = createMockRequest({
        chatId: "test-chat",
        events: [invalidEvent],
      });

      const response = await AddChatEvents(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid event at index 0. Missing required fields (id, content)."
      );
    });

    it("should return 400 when one event in array is invalid", async () => {
      const validEvent = createValidEvent();
      const invalidEvent = { id: "evt-2" }; // Missing content
      const request = createMockRequest({
        chatId: "test-chat",
        events: [validEvent, invalidEvent],
      });

      const response = await AddChatEvents(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid event at index 1. Missing required fields (id, content)."
      );
    });

    it("should accept events with only id and content", async () => {
      const minimalEvent = {
        id: "evt-1",
        content: "Hello",
      };
      const request = createMockRequest({
        chatId: "test-chat",
        events: [minimalEvent],
      });

      const response = await AddChatEvents(request, mockContext);

      expectSuccessResponse(response, "1 events added successfully.");
    });
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetAuthenticatedUserId.mockResolvedValue("");
      const request = createMockRequest(createValidRequestBody());

      const response = await AddChatEvents(request, mockContext);

      expectUnauthorizedResponse(response);
    });
  });

  describe("Success Cases", () => {
    it("should append single event successfully", async () => {
      const event = createValidEvent("Hello");
      const request = createMockRequest({
        chatId: "single-chat",
        events: [event],
      });

      const response = await AddChatEvents(request, mockContext);

      expectSuccessResponse(response, "1 events added successfully.");
      expectAppendToBlobCalledWith("test-user-id", "single-chat/chat-events", [
        event,
      ]);
    });

    it("should append multiple events successfully", async () => {
      const events = [
        createValidEvent("Hello"),
        createValidEvent("Hi there!"),
        createValidEvent("How are you?"),
      ];
      const request = createMockRequest({
        chatId: "multi-chat",
        events,
      });

      const response = await AddChatEvents(request, mockContext);

      expectSuccessResponse(response, "3 events added successfully.");
      expectAppendToBlobCalledWith(
        "test-user-id",
        "multi-chat/chat-events",
        events
      );
    });

    it("should handle events with newlines in content", async () => {
      const eventWithNewlines = createValidEvent("Line 1\nLine 2\nLine 3");
      const request = createMockRequest({
        chatId: "newline-test",
        events: [eventWithNewlines],
      });

      const response = await AddChatEvents(request, mockContext);

      expectSuccessResponse(response, "1 events added successfully.");
      expectAppendToBlobCalledWith("test-user-id", "newline-test/chat-events", [
        eventWithNewlines,
      ]);
    });

    it("should format events as JSONL correctly", async () => {
      const events = [createValidEvent("First"), createValidEvent("Second")];
      const request = createMockRequest({
        chatId: "format-test",
        events,
      });

      await AddChatEvents(request, mockContext);

      const expectedContent =
        events.map(e => JSON.stringify(e)).join("\n") + "\n";
      expect(mockUserStorageClient.appendToBlob).toHaveBeenCalledWith(
        "test-user-id",
        "format-test/chat-events",
        expectedContent
      );
    });

    it("should log successful event count", async () => {
      const events = [createValidEvent(), createValidEvent()];
      const request = createMockRequest({
        chatId: "log-test",
        events,
      });

      await AddChatEvents(request, mockContext);

      expect(mockContext.log).toHaveBeenCalledWith(
        "Successfully appended 2 events to chat: test-user-id/log-test/chat-events"
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle storage errors gracefully", async () => {
      mockUserStorageClient.appendToBlob.mockRejectedValue(
        new Error("Storage error")
      );
      const request = createMockRequest(createValidRequestBody());

      const response = await AddChatEvents(request, mockContext);

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

  function createValidEvent(
    content: string = "Test event content"
  ): ChatEventDTO {
    return {
      id: `evt-${Date.now()}-${Math.random()}`,
      content,
    };
  }

  function createValidRequestBody() {
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

  function expectAppendToBlobCalledWith(
    userId: string,
    blobName: string,
    events: ChatEventDTO[]
  ): void {
    const expectedContent =
      events.map(e => JSON.stringify(e)).join("\n") + "\n";
    expect(mockUserStorageClient.appendToBlob).toHaveBeenCalledWith(
      userId,
      blobName,
      expectedContent
    );
  }
});

// Test Cases Summary for AddChatEvents:
// ✅ Validation Tests (8 cases)
//   - Missing chatId, events, empty array, invalid event fields
//   - Validates each event in array, accepts events with only id and content
// ✅ Authentication Tests (1 case)
//   - Unauthenticated user returns 401
// ✅ Success Cases (6 cases)
//   - Single and multiple event append, newlines handling, JSONL formatting, logging
// ✅ Error Handling (1 case)
//   - Storage error handling
