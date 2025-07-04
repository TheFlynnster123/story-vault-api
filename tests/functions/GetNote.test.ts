import { HttpRequest, InvocationContext } from "@azure/functions";
import { GetNote } from "../../src/functions/GetNote";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";
import { UserStorageClientSingleton } from "../../src/utils/userStorageClientSingleton";

// Mock dependencies
jest.mock("../../src/utils/getAuthenticatedUserId");
jest.mock("../../src/utils/userStorageClientSingleton");

const mockGetAuthenticatedUserId =
  getAuthenticatedUserId as jest.MockedFunction<typeof getAuthenticatedUserId>;
const mockUserStorageClientSingleton =
  UserStorageClientSingleton as jest.Mocked<typeof UserStorageClientSingleton>;

describe("GetNote", () => {
  let mockRequest: Partial<HttpRequest>;
  let mockContext: Partial<InvocationContext>;
  let mockStorageClient: any;

  beforeEach(() => {
    mockRequest = {
      url: "http://localhost:7071/api/GetNote",
      json: jest.fn(),
    };

    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
    };

    mockStorageClient = {
      getBlob: jest.fn(),
    };

    mockUserStorageClientSingleton.getInstance.mockReturnValue(
      mockStorageClient
    );
    jest.clearAllMocks();
  });

  it("should return 401 when user is not authenticated", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("");

    const response = await GetNote(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(401);
    expect(response.body).toBe("Unauthorized. No user ID found.");
  });

  it("should return 400 when request body is missing chatId", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      noteName: "test-note",
    });

    const response = await GetNote(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe(
      "Invalid request body. Missing chatId or noteName."
    );
  });

  it("should return 400 when request body is missing noteName", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      chatId: "chat123",
    });

    const response = await GetNote(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe(
      "Invalid request body. Missing chatId or noteName."
    );
  });

  it("should return 404 when note is not found", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      chatId: "chat123",
      noteName: "test-note",
    });
    mockStorageClient.getBlob.mockResolvedValue(undefined);

    const response = await GetNote(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(404);
    expect(response.body).toBe("Note not found.");
    expect(mockStorageClient.getBlob).toHaveBeenCalledWith(
      "user123",
      "chat123/test-note"
    );
  });

  it("should return 200 with note content when note is found", async () => {
    const noteContent = "This is a test note";
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockResolvedValue({
      chatId: "chat123",
      noteName: "test-note",
    });
    mockStorageClient.getBlob.mockResolvedValue(noteContent);

    const response = await GetNote(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(200);
    expect(response.headers).toEqual({ "Content-Type": "application/json" });
    expect(response.body).toBe(JSON.stringify({ content: noteContent }));
    expect(mockStorageClient.getBlob).toHaveBeenCalledWith(
      "user123",
      "chat123/test-note"
    );
  });

  it("should return 400 when JSON is invalid", async () => {
    mockGetAuthenticatedUserId.mockResolvedValue("user123");
    (mockRequest.json as jest.Mock).mockRejectedValue(
      new SyntaxError("Unexpected token in JSON")
    );

    const response = await GetNote(
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
    });
    mockStorageClient.getBlob.mockRejectedValue(new Error("Storage error"));

    const response = await GetNote(
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
