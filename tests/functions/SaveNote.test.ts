import { HttpRequest, InvocationContext } from "@azure/functions";
import { SaveNote } from "../../src/functions/SaveNote";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";
import { UserStorageClientSingleton } from "../../src/utils/userStorageClientSingleton";

// Mock dependencies
jest.mock("../../src/utils/getAuthenticatedUserId");
jest.mock("../../src/utils/userStorageClientSingleton");

const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;
const mockUserStorageClientSingleton =
  UserStorageClientSingleton as jest.Mocked<typeof UserStorageClientSingleton>;

describe("SaveNote", () => {
  let mockRequest: Partial<HttpRequest>;
  let mockContext: Partial<InvocationContext>;
  let mockStorageClient: any;

  beforeEach(() => {
    mockRequest = {
      url: "http://localhost:7071/api/SaveNote",
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

    const response = await SaveNote(
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
      content: "test content",
    });

    const response = await SaveNote(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe(
      "Invalid request body. Missing chatId, noteName, or content."
    );
  });

  it("should return 400 when noteName is missing", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      chatId: "chat123",
      content: "test content",
    });

    const response = await SaveNote(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe(
      "Invalid request body. Missing chatId, noteName, or content."
    );
  });

  it("should return 400 when content is missing", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      chatId: "chat123",
      noteName: "test-note",
    });

    const response = await SaveNote(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe(
      "Invalid request body. Missing chatId, noteName, or content."
    );
  });

  it("should save note successfully", async () => {
    const noteData = {
      chatId: "chat123",
      noteName: "test-note",
      content: "This is test content",
    };

    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue(noteData);
    mockStorageClient.uploadBlob.mockResolvedValue(undefined);

    const response = await SaveNote(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(200);
    expect(response.body).toBe("Note saved successfully.");
    expect(mockStorageClient.uploadBlob).toHaveBeenCalledWith(
      "user123",
      "chat123/test-note",
      "This is test content"
    );
    expect(mockContext.log).toHaveBeenCalledWith(
      "Successfully saved note to blob: user123/chat123/test-note"
    );
  });

  it("should handle empty content", async () => {
    const noteData = {
      chatId: "chat123",
      noteName: "test-note",
      content: "",
    };

    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue(noteData);
    mockStorageClient.uploadBlob.mockResolvedValue(undefined);

    const response = await SaveNote(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(200);
    expect(response.body).toBe("Note saved successfully.");
    expect(mockStorageClient.uploadBlob).toHaveBeenCalledWith(
      "user123",
      "chat123/test-note",
      ""
    );
  });

  it("should return 400 when JSON is invalid", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockRejectedValue(
      new SyntaxError("Unexpected token in JSON")
    );

    const response = await SaveNote(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe("Invalid JSON format in request body.");
  });

  it("should return 500 when storage client throws an error", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      chatId: "chat123",
      noteName: "test-note",
      content: "test content",
    });
    mockStorageClient.uploadBlob.mockRejectedValue(new Error("Storage error"));

    const response = await SaveNote(
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
