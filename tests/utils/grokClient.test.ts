import { getGrokChatCompletion } from "../../src/utils/grokClient";
import { Config } from "../../src/config";
import { Message } from "../../src/models/ChatPage";
import OpenAI from "openai";

// Mock OpenAI
jest.mock("openai");
jest.mock("../../src/config");

const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
const mockConfig = Config as jest.Mocked<typeof Config>;

describe("grokClient", () => {
  let mockClient: jest.Mocked<OpenAI>;
  let mockChatCompletions: any;

  beforeEach(() => {
    mockChatCompletions = {
      create: jest.fn(),
    };

    mockClient = {
      chat: {
        completions: mockChatCompletions,
      },
    } as any;

    mockOpenAI.mockImplementation(() => mockClient);
    mockConfig.GROK_BASE_URL = "https://api.x.ai/v1";

    jest.clearAllMocks();
  });

  describe("getGrokChatCompletion", () => {
    const testMessages: Message[] = [
      {
        id: "msg1",
        role: "user",
        content: "Hello, how are you?",
      },
      {
        id: "msg2",
        role: "system",
        content: "I'm doing well, thank you!",
      },
    ];

    it("should create OpenAI client with correct configuration", async () => {
      const grokKey = "test-api-key";
      mockChatCompletions.create.mockResolvedValue({
        choices: [{ message: { content: "Test response" } }],
      });

      await getGrokChatCompletion(grokKey, testMessages);

      expect(mockOpenAI).toHaveBeenCalledWith({
        apiKey: grokKey,
        baseURL: "https://api.x.ai/v1",
      });
    });

    it("should call chat completions with correct parameters", async () => {
      const grokKey = "test-api-key";
      mockChatCompletions.create.mockResolvedValue({
        choices: [{ message: { content: "Test response" } }],
      });

      await getGrokChatCompletion(grokKey, testMessages, "high");

      expect(mockChatCompletions.create).toHaveBeenCalledWith({
        model: "grok-3-mini",
        messages: testMessages,
        stream: false,
        reasoning_effort: "high",
      });
    });

    it("should default to high reasoning effort when not specified", async () => {
      const grokKey = "test-api-key";
      mockChatCompletions.create.mockResolvedValue({
        choices: [{ message: { content: "Test response" } }],
      });

      await getGrokChatCompletion(grokKey, testMessages);

      expect(mockChatCompletions.create).toHaveBeenCalledWith({
        model: "grok-3-mini",
        messages: testMessages,
        stream: false,
        reasoning_effort: "high",
      });
    });

    it("should use low reasoning effort when specified", async () => {
      const grokKey = "test-api-key";
      mockChatCompletions.create.mockResolvedValue({
        choices: [{ message: { content: "Test response" } }],
      });

      await getGrokChatCompletion(grokKey, testMessages, "low");

      expect(mockChatCompletions.create).toHaveBeenCalledWith({
        model: "grok-3-mini",
        messages: testMessages,
        stream: false,
        reasoning_effort: "low",
      });
    });

    it("should return the content from the first choice", async () => {
      const grokKey = "test-api-key";
      const expectedContent = "This is the AI response";
      mockChatCompletions.create.mockResolvedValue({
        choices: [{ message: { content: expectedContent } }],
      });

      const result = await getGrokChatCompletion(grokKey, testMessages);

      expect(result).toBe(expectedContent);
    });

    it("should return null when no choices are returned", async () => {
      const grokKey = "test-api-key";
      mockChatCompletions.create.mockResolvedValue({
        choices: [],
      });

      const result = await getGrokChatCompletion(grokKey, testMessages);

      expect(result).toBeNull();
    });

    it("should return null when first choice has no message", async () => {
      const grokKey = "test-api-key";
      mockChatCompletions.create.mockResolvedValue({
        choices: [{}],
      });

      const result = await getGrokChatCompletion(grokKey, testMessages);

      expect(result).toBeNull();
    });

    it("should return null when first choice message has no content", async () => {
      const grokKey = "test-api-key";
      mockChatCompletions.create.mockResolvedValue({
        choices: [{ message: {} }],
      });

      const result = await getGrokChatCompletion(grokKey, testMessages);

      expect(result).toBeNull();
    });

    it("should handle empty messages array", async () => {
      const grokKey = "test-api-key";
      mockChatCompletions.create.mockResolvedValue({
        choices: [{ message: { content: "Response to empty messages" } }],
      });

      const result = await getGrokChatCompletion(grokKey, []);

      expect(result).toBe("Response to empty messages");
      expect(mockChatCompletions.create).toHaveBeenCalledWith({
        model: "grok-3-mini",
        messages: [],
        stream: false,
        reasoning_effort: "high",
      });
    });

    it("should propagate OpenAI API errors", async () => {
      const grokKey = "test-api-key";
      const apiError = new Error("API Error");
      mockChatCompletions.create.mockRejectedValue(apiError);

      await expect(
        getGrokChatCompletion(grokKey, testMessages)
      ).rejects.toThrow("API Error");
    });
  });
});
