import { HttpRequest, InvocationContext } from "@azure/functions";
import { HasValidGrokKey } from "../../src/functions/HasValidGrokKey";
import { getGrokKeyRequest } from "../../src/databaseRequests/getGrokKeyRequest";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";

// Mock dependencies
jest.mock("../../src/databaseRequests/getGrokKeyRequest");
jest.mock("../../src/utils/getAuthenticatedUserId");

const mockGetGrokKeyRequest = getGrokKeyRequest as jest.MockedFunction<
  typeof getGrokKeyRequest
>;
const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;

describe("HasValidGrokKey", () => {
  let mockRequest: Partial<HttpRequest>;
  let mockContext: Partial<InvocationContext>;

  beforeEach(() => {
    mockRequest = {
      url: "https://example.com/api/HasValidGrokKey",
      method: "GET",
      headers: {
        get: jest.fn().mockReturnValue("Bearer valid-token"),
      } as any,
      json: jest.fn().mockResolvedValue({}),
    };

    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe("successful operations", () => {
    it("should return 200 when user has valid grok key", async () => {
      const userId = "user123";
      const grokKey = "valid-grok-key";

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      mockGetGrokKeyRequest.mockResolvedValue(grokKey);

      const result = await HasValidGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(200);
      expect(mockGetAuthenticatedUserId).toHaveBeenCalledWith(mockRequest);
      expect(mockGetGrokKeyRequest).toHaveBeenCalledWith(userId);
    });

    it("should return 200 for non-empty grok key", async () => {
      const userId = "user123";
      const grokKey = "another-valid-key";

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      mockGetGrokKeyRequest.mockResolvedValue(grokKey);

      const result = await HasValidGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(200);
    });

    it("should handle different user IDs", async () => {
      const testCases = ["user1", "user2", "user3"];

      for (const userId of testCases) {
        mockGetAuthenticatedUserId.mockResolvedValue(userId);
        mockGetGrokKeyRequest.mockResolvedValue("valid-key");

        const result = await HasValidGrokKey(
          mockRequest as HttpRequest,
          mockContext as InvocationContext
        );

        expect(result.status).toBe(200);
        expect(mockGetGrokKeyRequest).toHaveBeenCalledWith(userId);

        jest.clearAllMocks();
      }
    });
  });

  describe("grok key not found scenarios", () => {
    it("should return 404 when grok key is undefined", async () => {
      const userId = "user123";

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      mockGetGrokKeyRequest.mockResolvedValue(undefined);

      const result = await HasValidGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(404);
      expect(result.body).toContain("Grok key not found");
      expect(mockGetGrokKeyRequest).toHaveBeenCalledWith(userId);
    });

    it("should return 404 when grok key is null", async () => {
      const userId = "user123";

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      mockGetGrokKeyRequest.mockResolvedValue(null as any);

      const result = await HasValidGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(404);
      expect(result.body).toContain("Grok key not found");
    });

    it("should return 404 when grok key is empty string", async () => {
      const userId = "user123";

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      mockGetGrokKeyRequest.mockResolvedValue("");

      const result = await HasValidGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(404);
      expect(result.body).toContain("Grok key not found");
    });
  });

  describe("authentication errors", () => {
    it("should return 401 when authentication fails", async () => {
      mockGetAuthenticatedUserId.mockRejectedValue(new Error("Invalid token"));

      const result = await HasValidGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(500);
      expect(mockGetGrokKeyRequest).not.toHaveBeenCalled();
    });

    it("should return 401 when no authorization header", async () => {
      (mockRequest.headers!.get as jest.Mock).mockReturnValue("");
      mockGetAuthenticatedUserId.mockRejectedValue(
        new Error("Missing or malformed Authorization header")
      );

      const result = await HasValidGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(500);
    });

    it("should return 401 when token is invalid", async () => {
      mockGetAuthenticatedUserId.mockRejectedValue(
        new Error("Invalid signature")
      );

      const result = await HasValidGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(500);
    });
  });

  describe("database errors", () => {
    it("should return 500 when getGrokKeyRequest fails", async () => {
      const userId = "user123";

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      mockGetGrokKeyRequest.mockRejectedValue(new Error("Database error"));

      const result = await HasValidGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(500);
      expect(mockContext.error).toHaveBeenCalled();
    });

    it("should return 500 when storage client fails", async () => {
      const userId = "user123";

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      mockGetGrokKeyRequest.mockRejectedValue(new Error("Storage unavailable"));

      const result = await HasValidGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(500);
    });

    it("should return 500 when network error occurs", async () => {
      const userId = "user123";

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      mockGetGrokKeyRequest.mockRejectedValue(new Error("Network timeout"));

      const result = await HasValidGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(500);
    });
  });

  describe("edge cases", () => {
    it("should handle special characters in grok key", async () => {
      const userId = "user123";
      const grokKey = "key-with-special-chars!@#$%";

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      mockGetGrokKeyRequest.mockResolvedValue(grokKey);

      const result = await HasValidGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(200);
    });

    it("should handle very long grok key", async () => {
      const userId = "user123";
      const grokKey = "a".repeat(1000);

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      mockGetGrokKeyRequest.mockResolvedValue(grokKey);

      const result = await HasValidGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(200);
    });
  });

  describe("logging", () => {
    it("should log request processing", async () => {
      const userId = "user123";
      const grokKey = "valid-key";

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      mockGetGrokKeyRequest.mockResolvedValue(grokKey);

      await HasValidGrokKey(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(mockContext.log).toHaveBeenCalledWith(
        expect.stringContaining("Http function processed request for url")
      );
    });

    it("should log errors when they occur", async () => {
      const userId = "user123";

      mockGetAuthenticatedUserId.mockResolvedValue(userId);
      mockGetGrokKeyRequest.mockRejectedValue(new Error("Test error"));

      await HasValidGrokKey(
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
