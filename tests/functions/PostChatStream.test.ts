import { PostChatStream } from "../../src/functions/PostChatStream";
import { HttpRequest, InvocationContext } from "@azure/functions";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";
import { getOpenRouterKeyRequest } from "../../src/databaseRequests/getOpenRouterKeyRequest";
import { streamOpenRouterChatCompletion } from "../../src/utils/openRouterClient";

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
const mockStreamOpenRouterChatCompletion =
  streamOpenRouterChatCompletion as jest.MockedFunction<
    typeof streamOpenRouterChatCompletion
  >;

const MOCK_USER_ID = "test-user-id";
const MOCK_OR_KEY = "sk-or-test-key";

function createMockRequest(body: object): HttpRequest {
  return {
    url: "https://host/api/PostChatStream",
    headers: {
      get: (key: string) => (key === "EncryptionKey" ? "enc-key" : null),
    },
    json: jest.fn().mockResolvedValue(body),
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

async function* emptyStream() {
  return;
}

describe("PostChatStream", () => {
  let context: InvocationContext;

  beforeEach(() => {
    context = createMockContext();
    mockGetAuthenticatedUserId.mockResolvedValue(MOCK_USER_ID);
    mockGetOpenRouterKeyRequest.mockResolvedValue(MOCK_OR_KEY);
    mockStreamOpenRouterChatCompletion.mockReturnValue(emptyStream());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("passes OpenRouter chat request fields through to the streaming client", async () => {
    const body = {
      messages: [{ role: "user", content: "Hello" }],
      model: "openai/o4-mini",
      reasoning: { effort: "high" },
      provider: { require_parameters: true },
      future_openrouter_option: { enabled: true },
    };

    const response = await PostChatStream(createMockRequest(body), context);

    expect(response.status).toBe(200);
    expect(mockStreamOpenRouterChatCompletion).toHaveBeenCalledWith(
      MOCK_OR_KEY,
      body
    );
  });

  it("returns 400 when messages array is missing", async () => {
    const response = await PostChatStream(createMockRequest({}), context);

    expect(response.status).toBe(400);
    expect(mockStreamOpenRouterChatCompletion).not.toHaveBeenCalled();
  });
});
