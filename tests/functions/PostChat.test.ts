import { HttpRequest, InvocationContext } from "@azure/functions";
import { PostChat } from "../../src/functions/PostChat";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";
import { getGrokKeyRequest } from "../../src/databaseRequests/getGrokKeyRequest";
import { getGrokChatCompletion } from "../../src/utils/grokClient";
import { Message } from "../../src/models/ChatPage";
import OpenAI from "openai";

// Mock dependencies
jest.mock("../../src/utils/getAuthenticatedUserId");
jest.mock("../../src/databaseRequests/getGrokKeyRequest");
jest.mock("../../src/utils/grokClient");
jest.mock("openai");

const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;
const mockGetGrokKeyRequest = getGrokKeyRequest as jest.MockedFunction<
  typeof getGrokKeyRequest
>;
const mockGetGrokChatCompletion = getGrokChatCompletion as jest.MockedFunction<
  typeof getGrokChatCompletion
>;

describe("PostChat", () => {
  let mockRequest: Partial<HttpRequest>;
  let mockContext: Partial<InvocationContext>;

  beforeEach(() => {
    mockRequest = {
      json: jest.fn(),
      headers: {
        get: jest.fn(),
      } as any,
      url: "http://localhost:7071/api/PostChat",
    };

    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
    };

    jest.clearAllMocks();
  });

  const testMessages: Message[] = [
    {
      id: "msg1",
      role: "user",
      content: "Hello, how are you?",
    },
  ];

  describe("successful requests", () => {
    beforeEach(() => {
      mockGetAuthenticatedUserId.mockResolvedValue("user123");
      mockGetGrokKeyRequest.mockResolvedValue("test-grok-key");
      (mockRequest.json as jest.Mock).mockResolvedValue({
        messages: testMessages,
      });
      (mockRequest.headers!.get as jest.Mock).mockReturnValue(null);
    });

    it("should process chat request successfully", async () => {
      const expectedReply = "Hello! I'm doing well, thank you for asking.";
      mockGetGrokChatCompletion.mockResolvedValue(expectedReply);

      const result = await PostChat(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(200);
      expect(JSON.parse(result.body as string)).toEqual({
        reply: expectedReply,
      });
      expect(mockGetGrokChatCompletion).toHaveBeenCalledWith(
        "test-grok-key",
        testMessages,
        undefined
      );
    });

    it("should handle high reasoning effort", async () => {
      const expectedReply = "Detailed response with high reasoning";
      (mockRequest.headers!.get as jest.Mock).mockImplementation(header => {
        if (header === "Reasoning") return "high";
        if (header === "EncryptionKey") return null;
        return null;
      });
      mockGetGrokChatCompletion.mockResolvedValue(expectedReply);

      const result = await PostChat(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(200);
      expect(mockGetGrokChatCompletion).toHaveBeenCalledWith(
        "test-grok-key",
        testMessages,
        "high"
      );
    });

    it("should handle low reasoning effort", async () => {
      const expectedReply = "Quick response with low reasoning";
      (mockRequest.headers!.get as jest.Mock).mockImplementation(header => {
        if (header === "Reasoning") return "low";
        if (header === "EncryptionKey") return null;
        return null;
      });
      mockGetGrokChatCompletion.mockResolvedValue(expectedReply);

      const result = await PostChat(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(200);
      expect(mockGetGrokChatCompletion).toHaveBeenCalledWith(
        "test-grok-key",
        testMessages,
        "low"
      );
    });

    it("should handle encrypted grok key", async () => {
      const encryptionKey = "test-encryption-key";
      const expectedReply = "Response with encrypted key";
      (mockRequest.headers!.get as jest.Mock).mockImplementation(header => {
        if (header === "EncryptionKey") return encryptionKey;
        return null;
      });
      mockGetGrokChatCompletion.mockResolvedValue(expectedReply);

      const result = await PostChat(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(200);
      expect(mockGetGrokKeyRequest).toHaveBeenCalledWith(
        "user123",
        encryptionKey
      );
    });
  });

  describe("authentication errors", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetAuthenticatedUserId.mockResolvedValue("");

      const result = await PostChat(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(401);
      expect(result.body).toBe("Unauthorized. No user ID found.");
    });
  });

  describe("validation errors", () => {
    beforeEach(() => {
      mockGetAuthenticatedUserId.mockResolvedValue("user123");
      mockGetGrokKeyRequest.mockResolvedValue("test-grok-key");
    });

    it("should return 400 when request body is missing", async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue(null);

      const result = await PostChat(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(400);
      expect(result.body).toBe("Request body is required.");
    });

    it("should return 400 when messages array is missing", async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({});

      const result = await PostChat(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(400);
      expect(result.body).toBe(
        "Missing or invalid messages array in request body."
      );
    });

    it("should return 400 when messages array is empty", async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({ messages: [] });

      const result = await PostChat(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(400);
      expect(result.body).toBe("Messages array cannot be empty.");
    });

    it("should return 400 for invalid reasoning header", async () => {
      (mockRequest.json as jest.Mock).mockResolvedValue({
        messages: testMessages,
      });
      (mockRequest.headers!.get as jest.Mock).mockImplementation(header => {
        if (header === "Reasoning") return "invalid";
        return null;
      });

      const result = await PostChat(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(400);
      expect(result.body).toBe(
        "Invalid Reasoning header. Must be 'high' or 'low'."
      );
    });
  });

  describe("grok key errors", () => {
    beforeEach(() => {
      mockGetAuthenticatedUserId.mockResolvedValue("user123");
      (mockRequest.json as jest.Mock).mockResolvedValue({
        messages: testMessages,
      });
      (mockRequest.headers!.get as jest.Mock).mockReturnValue(null);
    });

    it("should return 401 when no grok key is found", async () => {
      mockGetGrokKeyRequest.mockResolvedValue(undefined);

      const result = await PostChat(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(401);
      expect(result.body).toBe("No valid Grok API key found.");
    });
  });

  describe("grok api errors", () => {
    beforeEach(() => {
      mockGetAuthenticatedUserId.mockResolvedValue("user123");
      mockGetGrokKeyRequest.mockResolvedValue("test-grok-key");
      (mockRequest.json as jest.Mock).mockResolvedValue({
        messages: testMessages,
      });
      (mockRequest.headers!.get as jest.Mock).mockReturnValue(null);
    });

    it("should return 500 when grok returns no content", async () => {
      mockGetGrokChatCompletion.mockResolvedValue(null);

      const result = await PostChat(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(500);
      expect(result.body).toBe("Failed to get a valid response from Grok API.");
    });

    it("should handle OpenAI API errors", async () => {
      const apiError = Object.assign(new Error("Rate limit exceeded"), {
        status: 429,
        code: "rate_limit_exceeded",
      });
      Object.setPrototypeOf(apiError, OpenAI.APIError.prototype);
      mockGetGrokChatCompletion.mockRejectedValue(apiError);

      const result = await PostChat(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(429);
      expect(result.headers).toEqual(
        expect.objectContaining({
          "Content-Type": "application/json",
        })
      );
      const responseBody = JSON.parse(result.body as string);
      expect(responseBody.error).toBe("Grok API error");
      expect(responseBody.details).toBe("Rate limit exceeded");
    });

    it("should handle generic errors", async () => {
      const genericError = new Error("Network error");
      mockGetGrokChatCompletion.mockRejectedValue(genericError);

      const result = await PostChat(
        mockRequest as HttpRequest,
        mockContext as InvocationContext
      );

      expect(result.status).toBe(500);
      expect(result.body).toBe("An unexpected error occurred.");
    });
  });
});
