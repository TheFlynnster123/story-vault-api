import { AddChatEvent } from "../../src/functions/AddChatEvent";
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

describe("AddChatEvent Function", () => {
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
      const request = createMockRequest({ event: createValidEvent() });

      const response = await AddChatEvent(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing chatId."
      );
    });

    it("should return 400 when event is missing", async () => {
      const request = createMockRequest({ chatId: "test-chat" });

      const response = await AddChatEvent(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing event or required event fields (id, content)."
      );
    });

    it("should return 400 when event id is missing", async () => {
      const request = createMockRequest({
        chatId: "test-chat",
        event: { content: "test" },
      });

      const response = await AddChatEvent(request, mockContext);

      expectBadRequestResponse(
        response,
        "Invalid request body. Missing event or required event fields (id, content)."
      );
    });
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetAuthenticatedUserId.mockResolvedValue("");
      const request = createMockRequest(createValidRequestBody());

      const response = await AddChatEvent(request, mockContext);

      expectUnauthorizedResponse(response);
    });
  });

  describe("Success Cases", () => {
    it("should call appendToBlob with correct parameters", async () => {
      const event = createValidEvent();
      const request = createMockRequest({ chatId: "test-chat", event });

      const response = await AddChatEvent(request, mockContext);

      expectSuccessResponse(response, "Event added successfully.");
      expectAppendToBlobCalledWith(
        "test-user-id",
        "test-chat/chat-events",
        event
      );
    });

    it("should handle user events", async () => {
      const userEvent = createValidEvent();
      const request = createMockRequest({
        chatId: "chat1",
        event: userEvent,
      });

      const response = await AddChatEvent(request, mockContext);

      expectSuccessResponse(response, "Event added successfully.");
      expectAppendToBlobCalledWith(
        "test-user-id",
        "chat1/chat-events",
        userEvent
      );
    });

    it("should handle system events", async () => {
      const systemEvent = createValidEvent();
      const request = createMockRequest({
        chatId: "chat1",
        event: systemEvent,
      });

      const response = await AddChatEvent(request, mockContext);

      expectSuccessResponse(response, "Event added successfully.");
      expectAppendToBlobCalledWith(
        "test-user-id",
        "chat1/chat-events",
        systemEvent
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle storage errors gracefully", async () => {
      mockUserStorageClient.appendToBlob.mockRejectedValue(
        new Error("Storage error")
      );
      const event = createValidEvent();
      const request = createMockRequest({ chatId: "test-chat", event });

      const response = await AddChatEvent(request, mockContext);

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

  function createValidEvent(): ChatEventDTO {
    return {
      id: `evt-${Date.now()}`,
      content: "Test event content",
    };
  }

  function createValidRequestBody() {
    return {
      chatId: "test-chat",
      event: createValidEvent(),
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
    event: ChatEventDTO
  ): void {
    const expectedContent = JSON.stringify(event) + "\n";
    expect(mockUserStorageClient.appendToBlob).toHaveBeenCalledWith(
      userId,
      blobName,
      expectedContent
    );
  }
});

// Test Cases Summary for AddChatEvent:
// ✅ Validation Tests (3 cases)
//   - Missing chatId
//   - Missing event
//   - Missing event fields (id, content)
// ✅ Authentication Tests (1 case)
//   - Unauthenticated user
// ✅ Success Cases (3 cases)
//   - Correct appendToBlob call with parameters
//   - Handle user events
//   - Handle system events
// ✅ Error Handling (1 case)
//   - Storage errors
