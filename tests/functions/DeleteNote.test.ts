import { HttpRequest, InvocationContext } from "@azure/functions";
import { DeleteNote } from "../../src/functions/DeleteNote";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";
import { UserStorageClientSingleton } from "../../src/utils/userStorageClientSingleton";

// Mock dependencies
jest.mock("../../src/utils/getAuthenticatedUserId");
jest.mock("../../src/utils/userStorageClientSingleton");

const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;
const mockUserStorageClientSingleton =
  UserStorageClientSingleton as jest.Mocked<typeof UserStorageClientSingleton>;

describe("DeleteNote", () => {
  let mockRequest: Partial<HttpRequest>;
  let mockContext: Partial<InvocationContext>;
  let mockStorageClient: any;

  beforeEach(() => {
    mockRequest = {
      url: "http://localhost:7071/api/DeleteNote",
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

    const response = await DeleteNote(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(401);
    expect(response.body).toBe("Unauthorized. No user ID found.");
  });

  it("should return 400 when chatId is missing", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      noteName: "test-note",
    });

    const response = await DeleteNote(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe(
      "Invalid request body. Missing chatId or noteName."
    );
  });

  it("should return 400 when noteName is missing", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      chatId: "chat123",
    });

    const response = await DeleteNote(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe(
      "Invalid request body. Missing chatId or noteName."
    );
  });

  it("should delete note successfully", async () => {
    const deleteData = {
      chatId: "chat123",
      noteName: "test-note",
    };

    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue(deleteData);
    mockStorageClient.deleteBlob.mockResolvedValue(true);

    const response = await DeleteNote(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(200);
    expect(response.body).toBe("Note deleted successfully.");
    expect(mockStorageClient.deleteBlob).toHaveBeenCalledWith(
      "user123",
      "chat123/test-note"
    );
    expect(mockContext.log).toHaveBeenCalledWith(
      "Successfully deleted note from blob: user123/chat123/test-note"
    );
  });

  it("should handle deletion of non-existent note", async () => {
    const deleteData = {
      chatId: "chat123",
      noteName: "non-existent-note",
    };

    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue(deleteData);
    mockStorageClient.deleteBlob.mockResolvedValue(false);

    const response = await DeleteNote(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(200);
    expect(response.body).toBe("Note deleted successfully.");
    expect(mockStorageClient.deleteBlob).toHaveBeenCalledWith(
      "user123",
      "chat123/non-existent-note"
    );
  });

  it("should return 500 when storage client throws an error", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      chatId: "chat123",
      noteName: "test-note",
    });
    mockStorageClient.deleteBlob.mockRejectedValue(new Error("Storage error"));

    const response = await DeleteNote(
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

  it("should handle special characters in note names", async () => {
    const deleteData = {
      chatId: "chat123",
      noteName: "test-note with spaces & symbols!",
    };

    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue(deleteData);
    mockStorageClient.deleteBlob.mockResolvedValue(true);

    const response = await DeleteNote(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(200);
    expect(mockStorageClient.deleteBlob).toHaveBeenCalledWith(
      "user123",
      "chat123/test-note with spaces & symbols!"
    );
  });
});
