import { HttpRequest, InvocationContext } from "@azure/functions";
import { SaveGrokKey } from "../../src/functions/SaveGrokKey";
import { saveGrokKeyRequest } from "../../src/databaseRequests/saveGrokKeyRequest";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";

// Mock dependencies
jest.mock("../../src/databaseRequests/saveGrokKeyRequest");
jest.mock("../../src/utils/getAuthenticatedUserId");

const mockSaveGrokKeyRequest = saveGrokKeyRequest as jest.MockedFunction<
  typeof saveGrokKeyRequest
>;
const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;

describe("SaveGrokKey", () => {
  let mockRequest: Partial<HttpRequest>;
  let mockContext: Partial<InvocationContext>;

  beforeEach(() => {
    mockRequest = {
      url: "https://example.com/api/SaveGrokKey",
      method: "POST",
      headers: {
        get: jest.fn().mockReturnValue("Bearer valid-token"),
      } as any,
      json: jest.fn(),
    };

    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe("successful operations", () => {
    it("should save grok key successfully", async () => {
      const userId = "user123";
      const grokKey = "valid-grok-key-456";
      const requestBody = { grokKey };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockSaveGrokKeyRequest.mockResolvedValue(undefined);

      const result = await SaveGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(201);
      expect(result.body).toBe("Grok key saved successfully");
      expect(mockGetAuthenticatedUserId).toHaveBeenCalledWith(mockRequest);
      expect(mockSaveGrokKeyRequest).toHaveBeenCalledWith(userId, grokKey);
      expect(mockContext.log).toHaveBeenCalledWith(
        `Successfully saved grok key for user: ${userId}`
      );
    });

    it("should handle different grok key formats", async () => {
      const userId = "user123";
      const testKeys = [
        "simple-key",
        "complex-key-with-dashes",
        "key_with_underscores",
        "KeyWithMixedCase123",
        "key-with-special-chars!@#$%",
      ];

      for (const grokKey of testKeys) {
        const requestBody = { grokKey };

        mockGetAuthenticatedUserId.mockResolvedValue(userId);
        (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
        mockSaveGrokKeyRequest.mockResolvedValue(undefined);

        const result = await SaveGrokKey(
          mockRequest as HttpRequest,
          mockContext as InvocationContext
        );

        expect(result.status).toBe(201);
        expect(mockSaveGrokKeyRequest).toHaveBeenCalledWith(userId, grokKey);

        jest.clearAllMocks();
      }
    });

    it("should handle different user IDs", async () => {
      const testUsers = ["user1", "user2", "user3"];
      const grokKey = "test-key";

      for (const userId of testUsers) {
        const requestBody = { grokKey };

        mockGetAuthenticatedUserId.mockResolvedValue(userId);
        (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
        mockSaveGrokKeyRequest.mockResolvedValue(undefined);

        const result = await SaveGrokKey(
          mockRequest as HttpRequest,
          mockContext as InvocationContext
        );

        expect(result.status).toBe(201);
        expect(mockSaveGrokKeyRequest).toHaveBeenCalledWith(userId, grokKey);

        jest.clearAllMocks();
      }
    });
  });

  describe("validation errors", () => {
    it("should return 400 when grokKey is missing", async () => {
      const userId = "user123";
      const requestBody = {}; // Missing grokKey

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

      const result = await SaveGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(400);
      expect(result.body).toBe("Missing grokKey in request body");
      expect(mockSaveGrokKeyRequest).not.toHaveBeenCalled();
    });

    it("should return 400 when grokKey is null", async () => {
      const userId = "user123";
      const requestBody = { grokKey: null };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

      const result = await SaveGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(400);
      expect(result.body).toBe("Missing grokKey in request body");
      expect(mockSaveGrokKeyRequest).not.toHaveBeenCalled();
    });

    it("should return 400 when grokKey is undefined", async () => {
      const userId = "user123";
      const requestBody = { grokKey: undefined };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

      const result = await SaveGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(400);
      expect(result.body).toBe("Missing grokKey in request body");
      expect(mockSaveGrokKeyRequest).not.toHaveBeenCalled();
    });

    it("should return 400 when grokKey is empty string", async () => {
      const userId = "user123";
      const requestBody = { grokKey: "" };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

      const result = await SaveGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(400);
      expect(result.body).toBe("Missing grokKey in request body");
      expect(mockSaveGrokKeyRequest).not.toHaveBeenCalled();
    });
  });

  describe("authentication errors", () => {
    it("should return 500 when authentication fails", async () => {
      mockGetAuthenticatedUserId.mockRejectedValue(new Error("Invalid token"));

      const result = await SaveGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(500);
      expect(mockSaveGrokKeyRequest).not.toHaveBeenCalled();
    });

    it("should return 500 when no authorization header", async () => {
      (mockRequest.headers!.get as jest.Mock).mockReturnValue("");
      mockGetAuthenticatedUserId.mockRejectedValue(
        new Error("Missing or malformed Authorization header")
      );

      const result = await SaveGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(500);
    });

    it("should return 500 when token is invalid", async () => {
      mockGetAuthenticatedUserId.mockRejectedValue(
        new Error("Invalid signature")
      );

      const result = await SaveGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(500);
    });
  });

  describe("database errors", () => {
    it("should return 500 when saveGrokKeyRequest fails", async () => {
      const userId = "user123";
      const grokKey = "test-key";
      const requestBody = { grokKey };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockSaveGrokKeyRequest.mockRejectedValue(new Error("Database error"));

      const result = await SaveGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(500);
      expect(mockContext.error).toHaveBeenCalled();
    });

    it("should return 500 when storage client fails", async () => {
      const userId = "user123";
      const grokKey = "test-key";
      const requestBody = { grokKey };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockSaveGrokKeyRequest.mockRejectedValue(
        new Error("Storage unavailable")
      );

      const result = await SaveGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(500);
    });

    it("should return 500 when network error occurs", async () => {
      const userId = "user123";
      const grokKey = "test-key";
      const requestBody = { grokKey };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockSaveGrokKeyRequest.mockRejectedValue(new Error("Network timeout"));

      const result = await SaveGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(500);
    });
  });

  describe("edge cases", () => {
    it("should handle very long grok key", async () => {
      const userId = "user123";
      const grokKey = "a".repeat(1000);
      const requestBody = { grokKey };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockSaveGrokKeyRequest.mockResolvedValue(undefined);

      const result = await SaveGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(201);
      expect(mockSaveGrokKeyRequest).toHaveBeenCalledWith(userId, grokKey);
    });

    it("should handle request body with extra fields", async () => {
      const userId = "user123";
      const grokKey = "test-key";
      const requestBody = {
        grokKey,
        extraField: "should be ignored",
        anotherField: 123,
      };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockSaveGrokKeyRequest.mockResolvedValue(undefined);

      const result = await SaveGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(201);
      expect(mockSaveGrokKeyRequest).toHaveBeenCalledWith(userId, grokKey);
    });
  });

  describe("logging", () => {
    it("should log request processing", async () => {
      const userId = "user123";
      const grokKey = "test-key";
      const requestBody = { grokKey };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockSaveGrokKeyRequest.mockResolvedValue(undefined);

      await SaveGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(mockContext.log).toHaveBeenCalledWith(
        expect.stringContaining("Http function processed request for url")
      );
    });

    it("should log successful save operation", async () => {
      const userId = "user123";
      const grokKey = "test-key";
      const requestBody = { grokKey };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockSaveGrokKeyRequest.mockResolvedValue(undefined);

      await SaveGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(mockContext.log).toHaveBeenCalledWith(
        `Successfully saved grok key for user: ${userId}`
      );
    });

    it("should log errors when they occur", async () => {
      const userId = "user123";
      const grokKey = "test-key";
      const requestBody = { grokKey };

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
      mockSaveGrokKeyRequest.mockRejectedValue(new Error("Test error"));

      await SaveGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(mockContext.error).toHaveBeenCalledWith(
        "Error in function:",
        expect.any(Error)
      );
    });
  });
});
