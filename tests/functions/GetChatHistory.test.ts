import { HttpRequest, InvocationContext } from "@azure/functions";
import { GetChatHistory } from "../../src/functions/GetChatHistory";
import { UserStorageClient } from "../../src/utils/UserStorageClient";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";
import type { ChatPage } from "../../src/models/ChatPage";

// Mock dependencies
jest.mock("../../src/utils/UserStorageClient");
jest.mock("../../src/utils/getAuthenticatedUserId");

const mockUserStorageClient = UserStorageClient as jest.MockedClass<
  typeof UserStorageClient
>;
const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;

describe("GetChatHistory", () => {
  let mockRequest: Partial<HttpRequest>;
  let mockContext: Partial<InvocationContext>;
  let mockStorageInstance: jest.Mocked<UserStorageClient>;

  beforeEach(() => {
    mockRequest = {
      url: "https://example.com/api/GetChatHistory",
      method: "POST",
      headers: {
        get: jest.fn().mockReturnValue("Bearer valid-token"),
      } as any,
      json: jest.fn(),
    };

    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    mockStorageInstance = {
      listBlobsByPrefix: jest.fn(),
      getBlob: jest.fn(),
    } as any;

    mockUserStorageClient.mockImplementation(() => mockStorageInstance);

    jest.clearAllMocks();
  });

  describe("successful operations", () => {
    it("should return chat history successfully", async () => {
      const userId = "user123";
      const chatId = "chat456";
      const requestBody = { chatId };

      const mockChatPages: ChatPage[] = [
        {
          chatId: "chat456",
          pageId: "page1",
          messages: [
            { id: "msg1", role: "user", content: "Hello" },
            { id: "msg2", role: "system", content: "Hi there!" },
          ],
        },
        {
          chatId: "chat456",
          pageId: "page2",
          messages: [
            { id: "msg3", role: "user", content: "How are you?" },
            { id: "msg4", role: "system", content: "I'm doing well!" },
          ],
        },
      ];

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockStorageInstance.listBlobsByPrefix.mockResolvedValue([
        "chat456/page1.txt",
        "chat456/page2.txt",
      ]);
      mockStorageInstance.getBlob
        .mockResolvedValueOnce(JSON.stringify(mockChatPages[0]))
        .mockResolvedValueOnce(JSON.stringify(mockChatPages[1]));

      const result = await GetChatHistory(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(200);
      expect(result.jsonBody).toEqual(mockChatPages);
      expect(mockGetAuthenticatedUserId).toHaveBeenCalledWith(mockRequest);
      expect(mockStorageInstance.listBlobsByPrefix).toHaveBeenCalledWith(
        userId,
        "chat456/"
      );
      expect(mockStorageInstance.getBlob).toHaveBeenCalledTimes(2);
      expect(mockStorageInstance.getBlob).toHaveBeenCalledWith(
        userId,
        "chat456/page1.txt"
      );
      expect(mockStorageInstance.getBlob).toHaveBeenCalledWith(
        userId,
        "chat456/page2.txt"
      );
    });

    it("should handle chatId with trailing slash", async () => {
      const userId = "user123";
      const chatId = "chat456/";
      const requestBody = { chatId };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockStorageInstance.listBlobsByPrefix.mockResolvedValue([]);

      const result = await GetChatHistory(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(200);
      expect(result.jsonBody).toEqual([]);
      expect(mockStorageInstance.listBlobsByPrefix).toHaveBeenCalledWith(
        userId,
        "chat456/"
      );
    });

    it("should return empty array when no chat pages found", async () => {
      const userId = "user123";
      const chatId = "nonexistent-chat";
      const requestBody = { chatId };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockStorageInstance.listBlobsByPrefix.mockResolvedValue([]);

      const result = await GetChatHistory(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(200);
      expect(result.jsonBody).toEqual([]);
    });

    it("should filter out non-txt files", async () => {
      const userId = "user123";
      const chatId = "chat456";
      const requestBody = { chatId };

      const mockChatPage: ChatPage = {
        chatId: "chat456",
        pageId: "page1",
        messages: [{ id: "msg1", role: "user", content: "Hello" }],
      };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockStorageInstance.listBlobsByPrefix.mockResolvedValue([
        "chat456/page1.txt",
        "chat456/image.jpg",
        "chat456/document.pdf",
        "chat456/other.json",
      ]);
      mockStorageInstance.getBlob.mockResolvedValue(
        JSON.stringify(mockChatPage)
      );

      const result = await GetChatHistory(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(200);
      expect(result.jsonBody).toEqual([mockChatPage]);
      expect(mockStorageInstance.getBlob).toHaveBeenCalledTimes(1);
      expect(mockStorageInstance.getBlob).toHaveBeenCalledWith(
        userId,
        "chat456/page1.txt"
      );
    });

    it("should handle different chat IDs", async () => {
      const userId = "user123";
      const testChatIds = [
        "chat1",
        "chat-with-dashes",
        "chat_with_underscores",
      ];

      for (const chatId of testChatIds) {
        const requestBody = { chatId };

        mockGetAuthenticatedUserId.mockResolvedValue(userId);
        (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
        mockStorageInstance.listBlobsByPrefix.mockResolvedValue([]);

        const result = await GetChatHistory(
          mockRequest as HttpRequest,
          mockContext as InvocationContext
        );

        expect(result.status).toBe(200);
        expect(mockStorageInstance.listBlobsByPrefix).toHaveBeenCalledWith(
          userId,
          `${chatId}/`
        );

        jest.clearAllMocks();
      }
    });
  });

  describe("validation errors", () => {
    it("should return 400 when chatId is missing", async () => {
      const userId = "user123";
      const requestBody = {}; // Missing chatId

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

      const result = await GetChatHistory(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(400);
      expect(result.body).toBe(
        "Invalid request. Missing chatId in the request body."
      );
      expect(mockStorageInstance.listBlobsByPrefix).not.toHaveBeenCalled();
    });

    it("should return 400 when chatId is null", async () => {
      const userId = "user123";
      const requestBody = { chatId: null };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

      const result = await GetChatHistory(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(400);
      expect(result.body).toBe(
        "Invalid request. Missing chatId in the request body."
      );
    });

    it("should return 400 when chatId is empty string", async () => {
      const userId = "user123";
      const requestBody = { chatId: "" };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

      const result = await GetChatHistory(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(400);
      expect(result.body).toBe(
        "Invalid request. Missing chatId in the request body."
      );
    });

    it("should return 400 when request body is invalid JSON", async () => {
      const userId = "user123";

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockRejectedValue(
        new SyntaxError("Unexpected token in JSON")
      );

      const result = await GetChatHistory(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(400);
      expect(result.body).toBe("Invalid JSON format in request body.");
      expect(mockStorageInstance.listBlobsByPrefix).not.toHaveBeenCalled();
    });
  });

  describe("authentication errors", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetAuthenticatedUserId.mockResolvedValue(null as any);

      const result = await GetChatHistory(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(401);
      expect(result.body).toBe("Unauthorized. No user ID found.");
      expect(mockStorageInstance.listBlobsByPrefix).not.toHaveBeenCalled();
    });
  });

  describe("storage errors", () => {
    it("should return 500 when listBlobsByPrefix fails", async () => {
      const userId = "user123";
      const chatId = "chat456";
      const requestBody = { chatId };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockStorageInstance.listBlobsByPrefix.mockRejectedValue(
        new Error("Storage error")
      );

      const result = await GetChatHistory(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(500);
      expect(result.body).toBe("Failed to get chat history.");
      expect(mockContext.error).toHaveBeenCalledWith(
        "Error getting chat history:",
        expect.any(Error)
      );
    });

    it("should return 500 when getBlob fails", async () => {
      const userId = "user123";
      const chatId = "chat456";
      const requestBody = { chatId };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockStorageInstance.listBlobsByPrefix.mockResolvedValue([
        "chat456/page1.txt",
      ]);
      mockStorageInstance.getBlob.mockRejectedValue(new Error("Blob error"));

      const result = await GetChatHistory(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(500);
      expect(result.body).toBe("Failed to get chat history.");
    });
  });

  describe("data parsing", () => {
    it("should skip invalid JSON content and warn", async () => {
      const userId = "user123";
      const chatId = "chat456";
      const requestBody = { chatId };

      const validChatPage: ChatPage = {
        chatId: "chat456",
        pageId: "page2",
        messages: [{ id: "msg1", role: "user", content: "Hello" }],
      };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockStorageInstance.listBlobsByPrefix.mockResolvedValue([
        "chat456/page1.txt",
        "chat456/page2.txt",
      ]);
      mockStorageInstance.getBlob
        .mockResolvedValueOnce("invalid json content")
        .mockResolvedValueOnce(JSON.stringify(validChatPage));

      const result = await GetChatHistory(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(200);
      expect(result.jsonBody).toEqual([validChatPage]);
      expect(mockContext.warn).toHaveBeenCalledWith(
        "Failed to parse content for blob: user123/chat456/page1.txt",
        expect.any(SyntaxError)
      );
    });

    it("should handle null blob content", async () => {
      const userId = "user123";
      const chatId = "chat456";
      const requestBody = { chatId };

      const validChatPage: ChatPage = {
        chatId: "chat456",
        pageId: "page2",
        messages: [{ id: "msg1", role: "user", content: "Hello" }],
      };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockStorageInstance.listBlobsByPrefix.mockResolvedValue([
        "chat456/page1.txt",
        "chat456/page2.txt",
      ]);
      mockStorageInstance.getBlob
        .mockResolvedValueOnce(null as any)
        .mockResolvedValueOnce(JSON.stringify(validChatPage));

      const result = await GetChatHistory(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(200);
      expect(result.jsonBody).toEqual([validChatPage]);
    });

    it("should handle empty blob content", async () => {
      const userId = "user123";
      const chatId = "chat456";
      const requestBody = { chatId };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockStorageInstance.listBlobsByPrefix.mockResolvedValue([
        "chat456/page1.txt",
      ]);
      mockStorageInstance.getBlob.mockResolvedValue("");

      const result = await GetChatHistory(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(200);
      expect(result.jsonBody).toEqual([]);
      // Empty string is falsy, so it won't try to parse and won't warn
      expect(mockContext.warn).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle very large chat history", async () => {
      const userId = "user123";
      const chatId = "chat456";
      const requestBody = { chatId };

      const largeChatPages: ChatPage[] = Array.from(
        { length: 100 },
        (_, i) => ({
          chatId: "chat456",
          pageId: `page${i}`,
          messages: [{ id: `msg${i}`, role: "user", content: `Message ${i}` }],
        })
      );

      const blobNames = largeChatPages.map((_, i) => `chat456/page${i}.txt`);

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockStorageInstance.listBlobsByPrefix.mockResolvedValue(blobNames);

      // Mock getBlob to return each chat page
      largeChatPages.forEach((page, i) => {
        mockStorageInstance.getBlob.mockResolvedValueOnce(JSON.stringify(page));
      });

      const result = await GetChatHistory(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(200);
      expect(result.jsonBody).toHaveLength(100);
      expect(mockStorageInstance.getBlob).toHaveBeenCalledTimes(100);
    });

    it("should handle special characters in chatId", async () => {
      const userId = "user123";
      const chatId = "chat-with-special-chars!@#$%";
      const requestBody = { chatId };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockStorageInstance.listBlobsByPrefix.mockResolvedValue([]);

      const result = await GetChatHistory(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(200);
      expect(result.jsonBody).toEqual([]);
      expect(mockStorageInstance.listBlobsByPrefix).toHaveBeenCalledWith(
        userId,
        "chat-with-special-chars!@#$%/"
      );
    });

    it("should handle mixed file types in blob list", async () => {
      const userId = "user123";
      const chatId = "chat456";
      const requestBody = { chatId };

      const validChatPage: ChatPage = {
        chatId: "chat456",
        pageId: "page1",
        messages: [{ id: "msg1", role: "user", content: "Hello" }],
      };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockStorageInstance.listBlobsByPrefix.mockResolvedValue([
        "chat456/page1.txt",
        "chat456/metadata.json",
        "chat456/image.png",
        "chat456/document.docx",
        "chat456/backup.txt",
      ]);
      mockStorageInstance.getBlob
        .mockResolvedValueOnce(JSON.stringify(validChatPage))
        .mockResolvedValueOnce(JSON.stringify(validChatPage));

      const result = await GetChatHistory(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(200);
      expect(result.jsonBody).toHaveLength(2);
      expect(mockStorageInstance.getBlob).toHaveBeenCalledTimes(2);
      expect(mockStorageInstance.getBlob).toHaveBeenCalledWith(
        userId,
        "chat456/page1.txt"
      );
      expect(mockStorageInstance.getBlob).toHaveBeenCalledWith(
        userId,
        "chat456/backup.txt"
      );
    });
  });

  describe("logging", () => {
    it("should log request processing", async () => {
      const userId = "user123";
      const chatId = "chat456";
      const requestBody = { chatId };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockStorageInstance.listBlobsByPrefix.mockResolvedValue([]);

      await GetChatHistory(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(mockContext.log).toHaveBeenCalledWith(
        'Http function processed request for url "https://example.com/api/GetChatHistory"'
      );
    });

    it("should log errors when they occur", async () => {
      const userId = "user123";
      const chatId = "chat456";
      const requestBody = { chatId };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockStorageInstance.listBlobsByPrefix.mockRejectedValue(
        new Error("Test error")
      );

      await GetChatHistory(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(mockContext.error).toHaveBeenCalledWith(
        "Error getting chat history:",
        expect.any(Error)
      );
    });
  });
});
