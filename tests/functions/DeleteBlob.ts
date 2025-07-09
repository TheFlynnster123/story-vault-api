import { HttpRequest, InvocationContext } from "@azure/functions";
import { DeleteBlob } from "../../src/functions/DeleteBlob";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";
import { UserStorageClientSingleton } from "../../src/utils/userStorageClientSingleton";

// Mock dependencies
jest.mock("../../src/utils/getAuthenticatedUserId");
jest.mock("../../src/utils/userStorageClientSingleton");

const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;
const mockUserStorageClientSingleton =
  UserStorageClientSingleton as jest.Mocked<typeof UserStorageClientSingleton>;

describe("DeleteBlob", () => {
  let mockRequest: Partial<HttpRequest>;
  let mockContext: Partial<InvocationContext>;
  let mockStorageClient: any;

  beforeEach(() => {
    mockRequest = {
      url: "http://localhost:7071/api/DeleteBlob",
      json: jest.fn(),
    };

    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
    };

    mockStorageClient = {
      deleteBlob: jest.fn(),
    };

    mockUserStorageClientSingleton.getInstance.mockReturnValue(
      mockStorageClient
    );
    jest.clearAllMocks();
  });

  it("should return 401 when user is not authenticated", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("");

    const response = await DeleteBlob(
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
    });

    const response = await DeleteBlob(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe(
      "Invalid request body. Missing chatId or blobName."
    );
  });

  it("should return 400 when blobName is missing", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      chatId: "chat123",
    });

    const response = await DeleteBlob(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe(
      "Invalid request body. Missing chatId or blobName."
    );
  });

  it("should delete blob successfully", async () => {
    const deleteData = {
      chatId: "chat123",
      blobName: "test-blob",
    };

    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue(deleteData);
    mockStorageClient.deleteBlob.mockResolvedValue(true);

    const response = await DeleteBlob(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(200);
    expect(response.body).toBe("Blob deleted successfully.");
    expect(mockStorageClient.deleteBlob).toHaveBeenCalledWith(
      "user123",
      "chat123/test-blob"
    );
    expect(mockContext.log).toHaveBeenCalledWith(
      "Successfully deleted blob from blob: user123/chat123/test-blob"
    );
  });

  it("should handle deletion of non-existent blob", async () => {
    const deleteData = {
      chatId: "chat123",
      blobName: "non-existent-blob",
    };

    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue(deleteData);
    mockStorageClient.deleteBlob.mockResolvedValue(false);

    const response = await DeleteBlob(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(200);
    expect(response.body).toBe("Blob deleted successfully.");
    expect(mockStorageClient.deleteBlob).toHaveBeenCalledWith(
      "user123",
      "chat123/non-existent-blob"
    );
  });

  it("should return 500 when storage client throws an error", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      chatId: "chat123",
      blobName: "test-blob",
    });
    mockStorageClient.deleteBlob.mockRejectedValue(new Error("Storage error"));

    const response = await DeleteBlob(
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

  it("should handle special characters in blob names", async () => {
    const deleteData = {
      chatId: "chat123",
      blobName: "test-blob with spaces & symbols!",
    };

    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue(deleteData);
    mockStorageClient.deleteBlob.mockResolvedValue(true);

    const response = await DeleteBlob(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(200);
    expect(mockStorageClient.deleteBlob).toHaveBeenCalledWith(
      "user123",
      "chat123/test-blob with spaces & symbols!"
    );
  });
});
