import { PostChat } from "../../src/functions/PostChat";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";
import { getOpenRouterKeyRequest } from "../../src/databaseRequests/getOpenRouterKeyRequest";
import { getOpenRouterChatCompletion } from "../../src/utils/openRouterClient";
import OpenAI from "openai";

jest.mock("../../src/utils/getAuthenticatedUserId");
jest.mock("../../src/databaseRequests/getOpenRouterKeyRequest");
jest.mock("../../src/utils/openRouterClient");

jest.mock("@azure/functions", () => ({
  ...jest.requireActual("@azure/functions"),
  app: { http: jest.fn() },
}));

const mockGetAuthenticatedUserId = getAuthenticatedUserId as jest.MockedFunction<
  typeof getAuthenticatedUserId
>;
const mockGetOpenRouterKeyRequest = getOpenRouterKeyRequest as jest.MockedFunction<
  typeof getOpenRouterKeyRequest
>;
const mockGetOpenRouterChatCompletion =
  getOpenRouterChatCompletion as jest.MockedFunction<
    typeof getOpenRouterChatCompletion
  >;

const MOCK_USER_ID = "test-user-id";
const MOCK_OR_KEY = "sk-or-test-key";

function createMockRequest(body: object): HttpRequest {
  return {
    url: "https://host/api/PostChat",
    headers: {
      get: (key: string) => (key === "EncryptionKey" ? "enc-key" : null),
    },
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn(),
  } as unknown as HttpRequest;
}

function createMockContext(): InvocationContext {
  return {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    invocationId: "test-invocation-id",
  } as unknown as InvocationContext;
}

const VALID_BODY = { messages: [{ role: "user", content: "Hello" }] };

describe("PostChat", () => {
  let context: InvocationContext;

  beforeEach(() => {
    context = createMockContext();
    mockGetAuthenticatedUserId.mockResolvedValue(MOCK_USER_ID);
    mockGetOpenRouterKeyRequest.mockResolvedValue(MOCK_OR_KEY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockGetAuthenticatedUserId.mockResolvedValue("");

      const response = await PostChat(createMockRequest(VALID_BODY), context);

      expect(response.status).toBe(401);
    });

    it("returns 401 when OpenRouter key is missing", async () => {
      mockGetOpenRouterKeyRequest.mockResolvedValue(undefined);

      const response = await PostChat(createMockRequest(VALID_BODY), context);

      expect(response.status).toBe(401);
    });
  });

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  describe("Request validation", () => {
    it("returns 400 when messages array is missing", async () => {
      const response = await PostChat(createMockRequest({}), context);

      expect(response.status).toBe(400);
    });

    it("returns 400 when messages array is empty", async () => {
      const response = await PostChat(
        createMockRequest({ messages: [] }),
        context
      );

      expect(response.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // Success
  // ---------------------------------------------------------------------------

  describe("Success", () => {
    it("returns 200 with reply and usage on success", async () => {
      mockGetOpenRouterChatCompletion.mockResolvedValue({
        content: "Hello back!",
        usage: {
          promptTokens: 5,
          completionTokens: 3,
          reasoningTokens: null,
          cost: 0.001,
        },
      });

      const response = await PostChat(createMockRequest(VALID_BODY), context);

      expect(response.status).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.reply).toBe("Hello back!");
      expect(body.usage.promptTokens).toBe(5);
    });

    it("passes OpenRouter chat request fields through to the client", async () => {
      const body = {
        messages: [{ role: "user", content: "Hello" }],
        model: "openai/o4-mini",
        reasoning: { effort: "high" },
        provider: { require_parameters: true },
        future_openrouter_option: { enabled: true },
      };
      mockGetOpenRouterChatCompletion.mockResolvedValue({
        content: "Hello back!",
        usage: null,
      });

      const response = await PostChat(createMockRequest(body), context);

      expect(response.status).toBe(200);
      expect(mockGetOpenRouterChatCompletion).toHaveBeenCalledWith(
        MOCK_OR_KEY,
        body
      );
    });

    it("returns 500 when API response contains no content", async () => {
      mockGetOpenRouterChatCompletion.mockResolvedValue({
        content: null,
        usage: null,
      });

      const response = await PostChat(createMockRequest(VALID_BODY), context);

      expect(response.status).toBe(500);
    });
  });

  // ---------------------------------------------------------------------------
  // Error propagation
  // ---------------------------------------------------------------------------

  describe("Error propagation", () => {
    it("returns the OpenRouter error code and message for a 404 deprecated model error", async () => {
      const apiError = new OpenAI.APIError(
        404,
        {
          message:
            "Grok 4.1 Fast is deprecated. xAI recommends switching to Grok 4.3",
          type: "error",
          code: "404",
        },
        "Not Found",
        new Headers()
      );

      mockGetOpenRouterChatCompletion.mockRejectedValue(apiError);

      const response = await PostChat(createMockRequest(VALID_BODY), context);

      expect(response.status).toBe(404);
      const body = JSON.parse(response.body as string);
      expect(body.error.code).toBe(404);
      expect(body.error.message).toContain("deprecated");
    });

    it("returns 401 error shape for an auth error", async () => {
      const apiError = new OpenAI.APIError(
        401,
        { message: "Invalid API key", type: "error", code: "401" },
        "Unauthorized",
        new Headers()
      );

      mockGetOpenRouterChatCompletion.mockRejectedValue(apiError);

      const response = await PostChat(createMockRequest(VALID_BODY), context);

      expect(response.status).toBe(401);
      const body = JSON.parse(response.body as string);
      expect(body.error.code).toBe(401);
      expect(body.error.message).toContain("Invalid API key");
    });

    it("returns 429 error shape for a rate limit error", async () => {
      const apiError = new OpenAI.APIError(
        429,
        { message: "Rate limit exceeded", type: "error", code: "429" },
        "Too Many Requests",
        new Headers()
      );

      mockGetOpenRouterChatCompletion.mockRejectedValue(apiError);

      const response = await PostChat(createMockRequest(VALID_BODY), context);

      expect(response.status).toBe(429);
      const body = JSON.parse(response.body as string);
      expect(body.error.code).toBe(429);
    });

    it("returns 500 for non-API unexpected errors", async () => {
      mockGetOpenRouterChatCompletion.mockRejectedValue(
        new Error("Unexpected failure")
      );

      const response = await PostChat(createMockRequest(VALID_BODY), context);

      expect(response.status).toBe(500);
    });

    it("error body is parseable by the OpenRouter error shape { error: { code, message } }", async () => {
      const apiError = new OpenAI.APIError(
        404,
        {
          message: "Model deprecated",
          type: "error",
          code: "404",
        },
        "Not Found",
        new Headers()
      );

      mockGetOpenRouterChatCompletion.mockRejectedValue(apiError);

      const response = await PostChat(createMockRequest(VALID_BODY), context);
      const body = JSON.parse(response.body as string);

      // Assert the exact shape the frontend's parseOpenRouterError expects
      expect(body).toMatchObject({
        error: {
          code: expect.any(Number),
          message: expect.any(String),
        },
      });
    });
  });
});
