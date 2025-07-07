import { HttpRequest, InvocationContext } from "@azure/functions";
import { GenerateImage } from "../../src/functions/GenerateImage";
import { CivitaiClient } from "../../src/utils/civitaiClient";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";

// Mock dependencies
jest.mock("../../src/utils/civitaiClient");
jest.mock("../../src/utils/getAuthenticatedUserId");

const mockCivitaiClient = CivitaiClient as jest.Mocked<typeof CivitaiClient>;
const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;

describe("GenerateImage", () => {
  let mockRequest: Partial<HttpRequest>;
  let mockContext: Partial<InvocationContext>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
    };

    mockRequest = {
      url: "https://example.com/api/GenerateImage",
      method: "POST",
      headers: {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === "x-encryption-key") return "test-encryption-key";
          if (key === "authorization") return "Bearer valid-token";
          return null;
        }),
      } as any,
      json: jest.fn(),
    };

    // Mock successful authentication
    mockGetAuthenticatedUserId.mockResolvedValue("test-user-id");
  });

  it("should generate image successfully", async () => {
    const requestBody = {
      model: "urn:air:sdxl:checkpoint:civitai:257749@290640",
      params: {
        prompt: "test prompt",
        negativePrompt: "test negative prompt",
        scheduler: "EULER_A",
        steps: 15,
        cfgScale: 7,
        width: 1024,
        height: 1024,
        clipSkip: 2,
      },
      additionalNetworks: {
        "urn:air:sdxl:lora:civitai:479176@532904": {
          strength: 0.8,
        },
      },
    };

    const mockCivitaiResponse = {
      token: "test-token-123",
      jobs: [
        {
          jobId: "job-123",
          cost: 0.05,
        },
      ],
    };

    (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
    mockCivitaiClient.generateImage.mockResolvedValue(mockCivitaiResponse);

    const response = await GenerateImage(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body as string)).toEqual(mockCivitaiResponse);
    expect(mockCivitaiClient.generateImage).toHaveBeenCalledWith(
      "test-user-id",
      requestBody,
      "test-encryption-key"
    );
  });

  it("should return error when generation fails", async () => {
    const requestBody = {
      model: "urn:air:sdxl:checkpoint:civitai:257749@290640",
      params: {
        prompt: "test prompt",
        negativePrompt: "test negative prompt",
        scheduler: "EULER_A",
        steps: 15,
        cfgScale: 7,
        width: 1024,
        height: 1024,
        clipSkip: 2,
      },
      additionalNetworks: {},
    };

    (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
    mockCivitaiClient.generateImage.mockResolvedValue(null);

    const response = await GenerateImage(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe(
      "Failed to generate image. Please ensure you have a valid Civitai API key."
    );
  });

  it("should return error for missing model", async () => {
    const requestBody = {
      params: {
        prompt: "test prompt",
        negativePrompt: "test negative prompt",
        scheduler: "EULER_A",
        steps: 15,
        cfgScale: 7,
        width: 1024,
        height: 1024,
        clipSkip: 2,
      },
      additionalNetworks: {},
    };

    (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

    const response = await GenerateImage(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe("Missing model in request body");
  });

  it("should return error for missing prompt", async () => {
    const requestBody = {
      model: "urn:air:sdxl:checkpoint:civitai:257749@290640",
      params: {
        negativePrompt: "test negative prompt",
        scheduler: "EULER_A",
        steps: 15,
        cfgScale: 7,
        width: 1024,
        height: 1024,
        clipSkip: 2,
      },
      additionalNetworks: {},
    };

    (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

    const response = await GenerateImage(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe("Missing prompt in params");
  });

  it("should handle authentication failure", async () => {
    mockGetAuthenticatedUserId.mockRejectedValue(new Error("Invalid token"));

    const response = await GenerateImage(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(500);
  });
});
