import { GetChats } from "../../src/functions/GetChats";
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

describe("GetChats Function", () => {
  let mockUserStorageClient: any;
  let mockContext: InvocationContext;

  beforeEach(() => {
    // Create focused mock for UserStorageClient with only listChatIds
    mockUserStorageClient = {
      listChatIds: jest.fn(),
    };

    // Mock the dependency injection
    (d.UserStorageClient as jest.Mock) = jest.fn(() => mockUserStorageClient);

    mockContext = createMockContext();
    mockGetAuthenticatedUserId.mockResolvedValue("test-user-id");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetAuthenticatedUserId.mockResolvedValue("");
      const request = createMockRequest({});

      const response = await GetChats(request, mockContext);

      expectUnauthorizedResponse(response);
    });
  });

  describe("Success Cases", () => {
    it("should return empty array when no chats exist", async () => {
      mockUserStorageClient.listChatIds.mockResolvedValue([]);
      const request = createMockRequest({});

      const response = await GetChats(request, mockContext);

      expectSuccessResponse(response);
      expectChatIds(response, []);
    });

    it("should return chat IDs when chats exist", async () => {
      const chatIds = ["chat1", "chat2", "my-conversation"];
      mockUserStorageClient.listChatIds.mockResolvedValue(chatIds);
      const request = createMockRequest({});

      const response = await GetChats(request, mockContext);

      expectSuccessResponse(response);
      expectChatIds(response, chatIds);
    });

    it("should filter out global system folder", async () => {
      const allChatIds = ["chat1", "global", "chat2", "user-chat"];
      const expectedChatIds = ["chat1", "chat2", "user-chat"];
      mockUserStorageClient.listChatIds.mockResolvedValue(allChatIds);
      const request = createMockRequest({});

      const response = await GetChats(request, mockContext);

      expectSuccessResponse(response);
      expectChatIds(response, expectedChatIds);
    });

    it("should handle multiple global folders correctly", async () => {
      const allChatIds = ["chat1", "global", "chat2", "global", "chat3"];
      const expectedChatIds = ["chat1", "chat2", "chat3"];
      mockUserStorageClient.listChatIds.mockResolvedValue(allChatIds);
      const request = createMockRequest({});

      const response = await GetChats(request, mockContext);

      expectSuccessResponse(response);
      expectChatIds(response, expectedChatIds);
    });

    it("should call listChatIds with correct user ID", async () => {
      mockUserStorageClient.listChatIds.mockResolvedValue([]);
      const request = createMockRequest({});

      await GetChats(request, mockContext);

      expect(mockUserStorageClient.listChatIds).toHaveBeenCalledWith(
        "test-user-id"
      );
    });

    it("should handle special chat ID characters", async () => {
      const specialChatIds = [
        "chat-with-dashes",
        "chat_with_underscores",
        "chat.with.dots",
      ];
      mockUserStorageClient.listChatIds.mockResolvedValue(specialChatIds);
      const request = createMockRequest({});

      const response = await GetChats(request, mockContext);

      expectSuccessResponse(response);
      expectChatIds(response, specialChatIds);
    });

    it("should log successful retrieval", async () => {
      const chatIds = ["chat1", "chat2"];
      mockUserStorageClient.listChatIds.mockResolvedValue(chatIds);
      const request = createMockRequest({});

      await GetChats(request, mockContext);

      expect(mockContext.log).toHaveBeenCalledWith(
        "Successfully retrieved 2 chats for user: test-user-id"
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle storage errors gracefully", async () => {
      mockUserStorageClient.listChatIds.mockRejectedValue(
        new Error("Storage error")
      );
      const request = createMockRequest({});

      const response = await GetChats(request, mockContext);

      expectServerErrorResponse(response);
    });

    it("should handle permission errors", async () => {
      mockUserStorageClient.listChatIds.mockRejectedValue(
        new Error("Access denied")
      );
      const request = createMockRequest({});

      const response = await GetChats(request, mockContext);

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

  function expectUnauthorizedResponse(response: any): void {
    expect(response.status).toBe(401);
  }

  function expectSuccessResponse(response: any): void {
    expect(response.status).toBe(200);
  }

  function expectServerErrorResponse(response: any): void {
    expect(response.status).toBe(500);
  }

  function expectChatIds(response: any, expectedChatIds: string[]): void {
    const responseBody = JSON.parse(response.body);
    expect(responseBody).toEqual(expectedChatIds);
  }
});

// Test Cases Summary for GetChats:
// ✅ Authentication Tests (1 case)
//   - Unauthenticated user
// ✅ Success Cases (7 cases)
//   - Return empty array when no chats exist
//   - Return chat IDs when chats exist
//   - Filter out global system folder
//   - Handle multiple global folders correctly
//   - Call listChatIds with correct user ID
//   - Handle special chat ID characters
//   - Log successful retrieval
// ✅ Error Handling (2 cases)
//   - Storage errors
//   - Permission errors
