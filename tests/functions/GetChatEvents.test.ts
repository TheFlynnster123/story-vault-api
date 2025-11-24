import { GetChatEvents } from "../../src/functions/GetChatEvents";
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

describe("GetChatEvents Function", () => {
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

      const response = await GetChatEvents(request, mockContext);

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

      const response = await GetChatEvents(request, mockContext);

      expectUnauthorizedResponse(response);
    });
  });

  describe("Success Cases", () => {
    it("should return empty chat when blob does not exist", async () => {
      mockUserStorageClient.getBlob.mockResolvedValue(undefined);
      const request = createMockRequest({ chatId: "nonexistent-chat" });

      const response = await GetChatEvents(request, mockContext);

      expectSuccessResponse(response);
      expectEmptyChatReturned(response, "nonexistent-chat");
    });

    it("should return empty chat when blob is empty", async () => {
      mockUserStorageClient.getBlob.mockResolvedValue("");
      const request = createMockRequest({ chatId: "empty-chat" });

      const response = await GetChatEvents(request, mockContext);

      expectSuccessResponse(response);
      expectEmptyChatReturned(response, "empty-chat");
    });

    it("should parse single event correctly", async () => {
      const event = createValidEvent("Hello world");
      const blobContent = JSON.stringify(event) + "\n";
      mockUserStorageClient.getBlob.mockResolvedValue(blobContent);
      const request = createMockRequest({ chatId: "single-chat" });

      const response = await GetChatEvents(request, mockContext);

      expectSuccessResponse(response);
      expectChatWithEvents(response, "single-chat", [event]);
    });

    it("should parse multiple events correctly", async () => {
      const events = [
        createValidEvent("Hello"),
        createValidEvent("Hi there!"),
        createValidEvent("How are you?"),
      ];
      const blobContent = events.map(e => JSON.stringify(e)).join("\n") + "\n";
      mockUserStorageClient.getBlob.mockResolvedValue(blobContent);
      const request = createMockRequest({ chatId: "multi-chat" });

      const response = await GetChatEvents(request, mockContext);

      expectSuccessResponse(response);
      expectChatWithEvents(response, "multi-chat", events);
    });

    it("should skip invalid JSON lines and continue processing", async () => {
      const validEvent1 = createValidEvent("Valid event 1");
      const validEvent2 = createValidEvent("Valid event 2");
      const blobContent =
        [
          JSON.stringify(validEvent1),
          "invalid json line",
          JSON.stringify(validEvent2),
          "", // empty line should be filtered out
          "another invalid line",
        ].join("\n") + "\n";

      mockUserStorageClient.getBlob.mockResolvedValue(blobContent);
      const request = createMockRequest({ chatId: "mixed-chat" });

      const response = await GetChatEvents(request, mockContext);

      expectSuccessResponse(response);
      expectChatWithEvents(response, "mixed-chat", [validEvent1, validEvent2]);
      expect(mockContext.warn).toHaveBeenCalledTimes(2); // Two invalid lines
    });

    it("should call getBlob with correct parameters", async () => {
      mockUserStorageClient.getBlob.mockResolvedValue("");
      const request = createMockRequest({ chatId: "param-test" });

      await GetChatEvents(request, mockContext);

      expect(mockUserStorageClient.getBlob).toHaveBeenCalledWith(
        "test-user-id",
        "param-test/chat-events"
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle storage errors gracefully", async () => {
      mockUserStorageClient.getBlob.mockRejectedValue(
        new Error("Storage error")
      );
      const request = createMockRequest({ chatId: "error-chat" });

      const response = await GetChatEvents(request, mockContext);

      expectServerErrorResponse(response, "An unexpected error occurred.");
    });

    it("should handle JSON parsing errors gracefully", async () => {
      mockUserStorageClient.getBlob.mockResolvedValue(
        "completely invalid content"
      );
      const request = createMockRequest({ chatId: "parse-error-chat" });

      const response = await GetChatEvents(request, mockContext);

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

  function createValidEvent(content: string = "Test content"): ChatEventDTO {
    return {
      id: `evt-${Date.now()}-${Math.random()}`,
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
      events: [],
    });
  }

  function expectChatWithEvents(
    response: any,
    expectedChatId: string,
    expectedEvents: ChatEventDTO[]
  ): void {
    const chat = JSON.parse(response.body);
    expect(chat).toEqual({
      chatId: expectedChatId,
      events: expectedEvents,
    });
  }
});

// Test Cases Summary for GetChatEvents:
// ✅ Validation Tests (1 case)
//   - Missing chatId
// ✅ Authentication Tests (1 case)
//   - Unauthenticated user
// ✅ Success Cases (6 cases)
//   - Return empty chat when blob doesn't exist
//   - Return empty chat when blob is empty
//   - Parse single event correctly
//   - Parse multiple events correctly
//   - Skip invalid JSON lines and continue processing
//   - Call getBlob with correct parameters
// ✅ Error Handling (2 cases)
//   - Storage errors
//   - JSON parsing errors
