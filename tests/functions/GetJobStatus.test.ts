import { HttpRequest, InvocationContext } from "@azure/functions";
import { GetJobStatus } from "../../src/functions/GetJobStatus";
import { CivitaiClient } from "../../src/utils/civitaiClient";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";

// Mock dependencies
jest.mock("../../src/utils/civitaiClient");
jest.mock("../../src/utils/getAuthenticatedUserId");

const mockCivitaiClient = CivitaiClient as jest.Mocked<typeof CivitaiClient>;
const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;

describe("GetJobStatus", () => {
  let mockRequest: Partial<HttpRequest>;
  let mockContext: Partial<InvocationContext>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
    };

    mockRequest = {
      url: "https://example.com/api/GetJobStatus",
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

  it("should get job status successfully", async () => {
    const requestBody = {
      jobId: "test-job-id-123",
    };

    const mockJobStatus = {
      jobId: "test-job-id-123",
      cost: 0.05,
      scheduled: true,
      result: {
        available: true,
        blobKey: "test-blob-key",
        seed: 12345,
        blobUrl: "https://example.com/image.jpg",
      },
    };

    (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
    mockCivitaiClient.getJobStatus.mockResolvedValue(mockJobStatus);

    const response = await GetJobStatus(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body as string)).toEqual(mockJobStatus);
    expect(mockCivitaiClient.getJobStatus).toHaveBeenCalledWith(
      "test-user-id",
      "test-job-id-123",
      "test-encryption-key"
    );
  });

  it("should return error when job status retrieval fails", async () => {
    const requestBody = {
      jobId: "test-job-id-123",
    };

    (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
    mockCivitaiClient.getJobStatus.mockResolvedValue(null);

    const response = await GetJobStatus(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe(
      "Failed to get job status. Please ensure you have a valid Civitai API key and the job ID is correct."
    );
  });

  it("should return error for missing jobId", async () => {
    const requestBody = {};

    (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

    const response = await GetJobStatus(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe("Missing jobId in request body");
  });

  it("should return error for invalid jobId type", async () => {
    const requestBody = {
      jobId: 123,
    };

    (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

    const response = await GetJobStatus(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe("jobId must be a string");
  });

  it("should handle authentication failure", async () => {
    mockGetAuthenticatedUserId.mockRejectedValue(new Error("Invalid token"));

    const response = await GetJobStatus(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(500);
  });

  it("should work without encryption key", async () => {
    const requestBody = {
      jobId: "test-job-id-123",
    };

    const mockJobStatus = {
      jobId: "test-job-id-123",
      cost: 0.05,
      scheduled: true,
    };

    // Create a new mock request without encryption key
    const mockRequestNoEncryption: Partial<HttpRequest> = {
      url: "https://example.com/api/GetJobStatus",
      method: "POST",
      headers: {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === "authorization") return "Bearer valid-token";
          return null;
        }),
      } as any,
      json: jest.fn(),
    };

    (mockRequestNoEncryption.json as jest.Mock).mockResolvedValue(requestBody);
    mockCivitaiClient.getJobStatus.mockResolvedValue(mockJobStatus);

    const response = await GetJobStatus(
      mockRequestNoEncryption as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(200);
    expect(JSON.parse(response.body as string)).toEqual(mockJobStatus);
    expect(mockCivitaiClient.getJobStatus).toHaveBeenCalledWith(
      "test-user-id",
      "test-job-id-123",
      undefined
    );
  });
});
