import {
  getOpenRouterChatCompletion,
  streamOpenRouterChatCompletion,
} from "../../src/utils/openRouterClient";

const mockCreate = jest.fn();

jest.mock("openai", () =>
  jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }))
);

describe("openRouterClient", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  describe("getOpenRouterChatCompletion", () => {
    it("passes arbitrary OpenRouter chat completion fields through", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "ok" } }],
        usage: null,
      });

      await getOpenRouterChatCompletion("sk-or-test", {
        messages: [{ role: "user", content: "Hello" }],
        model: "openai/o4-mini",
        reasoning: { effort: "high" },
        provider: { require_parameters: true },
        future_openrouter_option: { enabled: true },
      });

      expect(mockCreate).toHaveBeenCalledWith({
        messages: [{ role: "user", content: "Hello" }],
        model: "openai/o4-mini",
        reasoning: { effort: "high" },
        provider: { require_parameters: true },
        future_openrouter_option: { enabled: true },
        stream: false,
      });
    });

    it("forces non-streaming mode and applies the default model", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "ok" } }],
        usage: null,
      });

      await getOpenRouterChatCompletion("sk-or-test", {
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        messages: [{ role: "user", content: "Hello" }],
        model: "x-ai/grok-4.1-mini",
        stream: false,
      });
    });
  });

  describe("streamOpenRouterChatCompletion", () => {
    it("passes arbitrary OpenRouter fields through while forcing streaming usage", async () => {
      mockCreate.mockResolvedValue(
        (async function* () {
          yield { choices: [{ delta: { content: "ok" } }] };
        })()
      );

      const stream = streamOpenRouterChatCompletion("sk-or-test", {
        messages: [{ role: "user", content: "Hello" }],
        model: "openai/o4-mini",
        reasoning: { effort: "high" },
        stream_options: { include_usage: false, custom: "value" },
      });

      for await (const _token of stream) {
        // Drain the stream so the client request is executed.
      }

      expect(mockCreate).toHaveBeenCalledWith({
        messages: [{ role: "user", content: "Hello" }],
        model: "openai/o4-mini",
        reasoning: { effort: "high" },
        stream: true,
        stream_options: { include_usage: true, custom: "value" },
      });
    });
  });
});
