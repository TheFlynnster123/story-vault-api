import { OpenRouterProxy } from "../../src/functions/OpenRouterProxy";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";
import { getOpenRouterKeyRequest } from "../../src/databaseRequests/getOpenRouterKeyRequest";
import { Config } from "../../src/config";

// Mock external dependencies
jest.mock("../../src/utils/getAuthenticatedUserId");
jest.mock("../../src/databaseRequests/getOpenRouterKeyRequest");

// Mock Azure Functions app registration to eliminate runtime warnings
jest.mock("@azure/functions", () => ({
  ...jest.requireActual("@azure/functions"),
  app: { http: jest.fn() },
}));

const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;
const mockGetOpenRouterKeyRequest =
  getOpenRouterKeyRequest as jest.MockedFunction<
    typeof getOpenRouterKeyRequest
  >;

const MOCK_USER_ID = "test-user-id";
const MOCK_OR_KEY = "sk-or-test-key";
const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const ORIGINAL_OPENROUTER_BASE_URL = Config.OPENROUTER_BASE_URL;

describe("OpenRouterProxy", () => {
  let mockContext: InvocationContext;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    Config.OPENROUTER_BASE_URL = DEFAULT_OPENROUTER_BASE_URL;
    mockContext = createMockContext();
    mockGetAuthenticatedUserId.mockResolvedValue(MOCK_USER_ID);
    mockGetOpenRouterKeyRequest.mockResolvedValue(MOCK_OR_KEY);

    // Reset and re-install fetch spy before each test
    fetchSpy = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    Config.OPENROUTER_BASE_URL = ORIGINAL_OPENROUTER_BASE_URL;
  });

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------
  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockGetAuthenticatedUserId.mockResolvedValue("");

      const request = createMockRequest("GET", "models");
      const response = await OpenRouterProxy(request, mockContext);

      expect(response.status).toBe(401);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("should return 401 (not 500) when getAuthenticatedUserId throws", async () => {
      mockGetAuthenticatedUserId.mockRejectedValue(
        new Error("Missing or malformed Authorization header")
      );

      const request = createMockRequest("GET", "models");
      const response = await OpenRouterProxy(request, mockContext);

      expect(response.status).toBe(401);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("should return 401 when OpenRouter key is missing", async () => {
      mockGetOpenRouterKeyRequest.mockResolvedValue(undefined);

      const request = createMockRequest("GET", "models");
      const response = await OpenRouterProxy(request, mockContext);

      expect(response.status).toBe(401);
      expect(response.body).toContain("No valid OpenRouter API key found.");
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Route validation
  // ---------------------------------------------------------------------------
  describe("Route validation", () => {
    it("should return 400 for path traversal with ..", async () => {
      const request = createMockRequest("GET", "../secret");
      const response = await OpenRouterProxy(request, mockContext);

      expect(response.status).toBe(400);
      expect(response.body).toContain("Invalid route path.");
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("should return 400 for percent-encoded path traversal", async () => {
      const request = createMockRequest("GET", "%2e%2e/secret");
      const response = await OpenRouterProxy(request, mockContext);

      expect(response.status).toBe(400);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("should return 400 for null byte in route", async () => {
      const request = createMockRequest("GET", "models\x00inject");
      const response = await OpenRouterProxy(request, mockContext);

      expect(response.status).toBe(400);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("should accept a normal route like models", async () => {
      fetchSpy.mockResolvedValue(
        createMockUpstreamResponse(200, '{"data":[]}')
      );

      const request = createMockRequest("GET", "models");
      const response = await OpenRouterProxy(request, mockContext);

      expect(response.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("https://openrouter.ai/api/v1/models"),
        expect.any(Object)
      );
    });

    it("should accept a nested route like chat/completions", async () => {
      fetchSpy.mockResolvedValue(createMockUpstreamResponse(200, "{}"));

      const request = createMockRequest("POST", "chat/completions");
      const response = await OpenRouterProxy(request, mockContext);

      expect(response.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "https://openrouter.ai/api/v1/chat/completions"
        ),
        expect.any(Object)
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Upstream URL construction
  // ---------------------------------------------------------------------------
  describe("Upstream URL construction", () => {
    it("should return 500 when OPENROUTER_BASE_URL is missing", async () => {
      Config.OPENROUTER_BASE_URL = undefined;

      const request = createMockRequest("GET", "models");
      const response = await OpenRouterProxy(request, mockContext);

      expect(response.status).toBe(500);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("should return 500 when OPENROUTER_BASE_URL points to a non-openrouter.ai host", async () => {
      Config.OPENROUTER_BASE_URL = "https://evil.example.com/api/v1";

      const request = createMockRequest("GET", "models");
      const response = await OpenRouterProxy(request, mockContext);

      expect(response.status).toBe(500);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("should return 500 when OPENROUTER_BASE_URL uses http instead of https", async () => {
      Config.OPENROUTER_BASE_URL = "http://openrouter.ai/api/v1";

      const request = createMockRequest("GET", "models");
      const response = await OpenRouterProxy(request, mockContext);

      expect(response.status).toBe(500);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("should always target openrouter.ai/api/v1 regardless of route", async () => {
      fetchSpy.mockResolvedValue(createMockUpstreamResponse(200, "{}"));

      const request = createMockRequest("GET", "models");
      await OpenRouterProxy(request, mockContext);

      const calledUrl: string = fetchSpy.mock.calls[0][0];
      expect(calledUrl.startsWith("https://openrouter.ai/api/v1")).toBe(true);
    });

    it("should forward query string parameters to upstream", async () => {
      fetchSpy.mockResolvedValue(createMockUpstreamResponse(200, "{}"));

      const request = createMockRequest("GET", "models", {
        url: "https://host/api/openrouter/models?supported_parameters=true",
      });
      await OpenRouterProxy(request, mockContext);

      const calledUrl: string = fetchSpy.mock.calls[0][0];
      expect(calledUrl).toContain("supported_parameters=true");
    });
  });

  // ---------------------------------------------------------------------------
  // Header policy
  // ---------------------------------------------------------------------------
  describe("Header policy", () => {
    it("should set Authorization header with the decrypted OpenRouter key", async () => {
      fetchSpy.mockResolvedValue(createMockUpstreamResponse(200, "{}"));

      const request = createMockRequest("GET", "models");
      await OpenRouterProxy(request, mockContext);

      const fetchOptions = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(
        (fetchOptions.headers as Record<string, string>)["Authorization"]
      ).toBe(`Bearer ${MOCK_OR_KEY}`);
    });

    it("should trim the OpenRouter key before setting Authorization header", async () => {
      mockGetOpenRouterKeyRequest.mockResolvedValue(`  ${MOCK_OR_KEY}\n`);
      fetchSpy.mockResolvedValue(createMockUpstreamResponse(200, "{}"));

      const request = createMockRequest("GET", "models");
      await OpenRouterProxy(request, mockContext);

      const fetchOptions = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(
        (fetchOptions.headers as Record<string, string>)["Authorization"]
      ).toBe(`Bearer ${MOCK_OR_KEY}`);
    });

    it("should forward Content-Type header from client", async () => {
      fetchSpy.mockResolvedValue(createMockUpstreamResponse(200, "{}"));

      const request = createMockRequest("POST", "chat/completions", {
        headers: { "content-type": "application/json" },
      });
      await OpenRouterProxy(request, mockContext);

      const fetchOptions = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(
        (fetchOptions.headers as Record<string, string>)["content-type"]
      ).toBe("application/json");
    });

    it("should forward Accept header from client", async () => {
      fetchSpy.mockResolvedValue(createMockUpstreamResponse(200, "{}"));

      const request = createMockRequest("GET", "models", {
        headers: { accept: "application/json" },
      });
      await OpenRouterProxy(request, mockContext);

      const fetchOptions = fetchSpy.mock.calls[0][1] as RequestInit;
      expect((fetchOptions.headers as Record<string, string>)["accept"]).toBe(
        "application/json"
      );
    });

    it("should not pass EncryptionKey header to upstream", async () => {
      fetchSpy.mockResolvedValue(createMockUpstreamResponse(200, "{}"));

      const request = createMockRequest("GET", "models", {
        headers: { EncryptionKey: "client-secret" },
      });
      await OpenRouterProxy(request, mockContext);

      const fetchOptions = fetchSpy.mock.calls[0][1] as RequestInit;
      const headers = fetchOptions.headers as Record<string, string>;
      expect(headers["EncryptionKey"]).toBeUndefined();
      expect(headers["encryptionkey"]).toBeUndefined();
    });

    it("should strip hop-by-hop headers from upstream response", async () => {
      const upstreamHeaders = new Headers({
        "content-type": "application/json",
        "transfer-encoding": "chunked",
        connection: "keep-alive",
      });
      fetchSpy.mockResolvedValue(
        createMockUpstreamResponse(200, "{}", upstreamHeaders)
      );

      const request = createMockRequest("GET", "models");
      const response = await OpenRouterProxy(request, mockContext);

      const responseHeaders = response.headers as Record<string, string>;
      expect(responseHeaders["transfer-encoding"]).toBeUndefined();
      expect(responseHeaders["connection"]).toBeUndefined();
      expect(responseHeaders["content-type"]).toBe("application/json");
    });

    it("should strip content-encoding and content-length from upstream response", async () => {
      const upstreamHeaders = new Headers({
        "content-type": "application/json",
        "content-encoding": "gzip",
        "content-length": "42",
      });
      fetchSpy.mockResolvedValue(
        createMockUpstreamResponse(200, "{}", upstreamHeaders)
      );

      const request = createMockRequest("GET", "auth/key");
      const response = await OpenRouterProxy(request, mockContext);

      const responseHeaders = response.headers as Record<string, string>;
      expect(responseHeaders["content-encoding"]).toBeUndefined();
      expect(responseHeaders["content-length"]).toBeUndefined();
      expect(responseHeaders["content-type"]).toBe("application/json");
    });

    it("should add X-Trace-Id to response headers", async () => {
      fetchSpy.mockResolvedValue(createMockUpstreamResponse(200, "{}"));

      const request = createMockRequest("GET", "models");
      const response = await OpenRouterProxy(request, mockContext);

      const responseHeaders = response.headers as Record<string, string>;
      expect(responseHeaders["X-Trace-Id"]).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // HTTP method passthrough
  // ---------------------------------------------------------------------------
  describe("HTTP method passthrough", () => {
    it.each(["GET", "POST", "PUT", "PATCH", "DELETE"])(
      "should forward %s method to upstream unchanged",
      async method => {
        fetchSpy.mockResolvedValue(createMockUpstreamResponse(200, "{}"));

        const request = createMockRequest(method, "models");
        await OpenRouterProxy(request, mockContext);

        const fetchOptions = fetchSpy.mock.calls[0][1] as RequestInit;
        expect(fetchOptions.method).toBe(method);
      }
    );

    it("should not attach a body for GET requests", async () => {
      fetchSpy.mockResolvedValue(createMockUpstreamResponse(200, "{}"));

      const request = createMockRequest("GET", "models");
      await OpenRouterProxy(request, mockContext);

      const fetchOptions = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(fetchOptions.body).toBeNull();
    });

    it("should not attach a body for HEAD requests", async () => {
      fetchSpy.mockResolvedValue(createMockUpstreamResponse(200, "{}"));

      const request = createMockRequest("HEAD", "models");
      await OpenRouterProxy(request, mockContext);

      const fetchOptions = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(fetchOptions.body).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Upstream response passthrough
  // ---------------------------------------------------------------------------
  describe("Upstream response passthrough", () => {
    it("should return the upstream status code as-is", async () => {
      fetchSpy.mockResolvedValue(
        createMockUpstreamResponse(429, '{"error":"rate limited"}')
      );

      const request = createMockRequest("POST", "chat/completions");
      const response = await OpenRouterProxy(request, mockContext);

      expect(response.status).toBe(429);
    });

    it("should pass through 4xx upstream errors without wrapping", async () => {
      const errorBody = '{"error":{"code":400,"message":"Bad request"}}';
      fetchSpy.mockResolvedValue(createMockUpstreamResponse(400, errorBody));

      const request = createMockRequest("POST", "chat/completions");
      const response = await OpenRouterProxy(request, mockContext);

      expect(response.status).toBe(400);
    });

    it("should preserve X-Generation-Id in response headers", async () => {
      const upstreamHeaders = new Headers({
        "content-type": "application/json",
        "x-generation-id": "gen-abc-123",
      });
      fetchSpy.mockResolvedValue(
        createMockUpstreamResponse(200, "{}", upstreamHeaders)
      );

      const request = createMockRequest("POST", "chat/completions");
      const response = await OpenRouterProxy(request, mockContext);

      expect(
        (response.headers as Record<string, string>)["x-generation-id"]
      ).toBe("gen-abc-123");
    });

    it("should pipe response body stream directly", async () => {
      const mockStream = {} as ReadableStream;
      const upstream = {
        status: 200,
        headers: new Headers({ "content-type": "text/event-stream" }),
        body: mockStream,
      } as unknown as Response;
      fetchSpy.mockResolvedValue(upstream);

      const request = createMockRequest("POST", "chat/completions", {
        headers: { accept: "text/event-stream" },
      });
      const response = await OpenRouterProxy(request, mockContext);

      expect(response.body).toBe(mockStream);
    });
  });

  // ---------------------------------------------------------------------------
  // Timeout / resilience
  // ---------------------------------------------------------------------------
  describe("Timeout handling", () => {
    it("should return 504 when upstream request times out", async () => {
      fetchSpy.mockRejectedValue(
        Object.assign(new Error("The operation was aborted"), {
          name: "AbortError",
        })
      );

      const request = createMockRequest("GET", "models");
      const response = await OpenRouterProxy(request, mockContext);

      expect(response.status).toBe(504);
      expect(response.body).toContain("timed out");
    });
  });

  // ---------------------------------------------------------------------------
  // Unexpected errors
  // ---------------------------------------------------------------------------
  describe("Error handling", () => {
    it("should return 500 for unexpected errors", async () => {
      fetchSpy.mockRejectedValue(new Error("network failure"));

      const request = createMockRequest("GET", "models");
      const response = await OpenRouterProxy(request, mockContext);

      expect(response.status).toBe(500);
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockContext(): InvocationContext {
  return {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    invocationId: "test-invocation-id",
  } as unknown as InvocationContext;
}

function createMockRequest(
  method: string,
  route: string,
  options: {
    headers?: Record<string, string>;
    url?: string;
    body?: ReadableStream | null;
  } = {}
): HttpRequest {
  const headers = new Map<string, string>(
    Object.entries(options.headers ?? {})
  );

  return {
    method,
    url: options.url ?? `https://host/api/openrouter/${route}`,
    params: { route },
    headers: {
      get: (key: string) => headers.get(key.toLowerCase()) ?? null,
    },
    body: options.body ?? null,
    json: jest.fn(),
    text: jest.fn(),
  } as unknown as HttpRequest;
}

function createMockUpstreamResponse(
  status: number,
  body: string,
  headers?: Headers
): Response {
  return {
    status,
    headers: headers ?? new Headers({ "content-type": "application/json" }),
    body: body as unknown as ReadableStream,
  } as unknown as Response;
}
