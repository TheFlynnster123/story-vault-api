import { HttpRequest, InvocationContext } from "@azure/functions";
import { SaveBlob } from "../../src/functions/SaveBlob";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";
import { UserStorageClientSingleton } from "../../src/utils/userStorageClientSingleton";

// Mock dependencies
jest.mock("../../src/utils/getAuthenticatedUserId");
jest.mock("../../src/utils/userStorageClientSingleton");

const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;
const mockUserStorageClientSingleton =
  UserStorageClientSingleton as jest.Mocked<typeof UserStorageClientSingleton>;

describe("SaveBlob", () => {
  let mockRequest: Partial<HttpRequest>;
  let mockContext: Partial<InvocationContext>;
  let mockStorageClient: any;

  beforeEach(() => {
    mockRequest = {
      url: "http://localhost:7071/api/SaveBlob",
      json: jest.fn(),
    };

    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
    };

    mockStorageClient = {
      uploadBlob: jest.fn(),
    };

    mockUserStorageClientSingleton.getInstance.mockReturnValue(
      mockStorageClient
    );
    jest.clearAllMocks();
  });

  it("should return 401 when user is not authenticated", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("");

    const response = await SaveBlob(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(401);
    expect(response.body).toBe("Unauthorized. No user ID found.");
  });

  it("should return 400 when chatId is missing", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      blobName: "test-blob",
      content: "test content",
    });

    const response = await SaveBlob(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe(
      "Invalid request body. Missing chatId, blobName, or content."
    );
  });

  it("should return 400 when blobName is missing", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      chatId: "chat123",
      content: "test content",
    });

    const response = await SaveBlob(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe(
      "Invalid request body. Missing chatId, blobName, or content."
    );
  });

  it("should return 400 when content is missing", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      chatId: "chat123",
      blobName: "test-blob",
    });

    const response = await SaveBlob(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe(
      "Invalid request body. Missing chatId, blobName, or content."
    );
  });

  it("should save blob successfully", async () => {
    const blobData = {
      chatId: "chat123",
      blobName: "test-blob",
      content: "This is test content",
    };

    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue(blobData);
    mockStorageClient.uploadBlob.mockResolvedValue(undefined);

    const response = await SaveBlob(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(200);
    expect(response.body).toBe("Blob saved successfully.");
    expect(mockStorageClient.uploadBlob).toHaveBeenCalledWith(
      "user123",
      "chat123/test-blob",
      "This is test content"
    );
    expect(mockContext.log).toHaveBeenCalledWith(
      "Successfully saved blob to blob: user123/chat123/test-blob"
    );
  });

  it("should handle empty content", async () => {
    const blobData = {
      chatId: "chat123",
      blobName: "test-blob",
      content: "",
    };

    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue(blobData);
    mockStorageClient.uploadBlob.mockResolvedValue(undefined);

    const response = await SaveBlob(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(200);
    expect(response.body).toBe("Blob saved successfully.");
    expect(mockStorageClient.uploadBlob).toHaveBeenCalledWith(
      "user123",
      "chat123/test-blob",
      ""
    );
  });

  it("should return 500 when storage client throws an error", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      chatId: "chat123",
      blobName: "test-blob",
      content: "test content",
    });
    mockStorageClient.uploadBlob.mockRejectedValue(new Error("Storage error"));

    const response = await SaveBlob(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(500);
    expect(response.body).toBe("An unexpected error occurred.");
    expect(mockContext.error).toHaveBeenCalledWith(
      "Error in function:",
      expect.any(Error)
    );
  });
});
