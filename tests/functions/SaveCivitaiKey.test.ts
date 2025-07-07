import { HttpRequest, InvocationContext } from "@azure/functions";
import { SaveCivitaiKey } from "../../src/functions/SaveCivitaiKey";
import { saveCivitaiKeyRequest } from "../../src/databaseRequests/saveCivitaiKeyRequest";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";

jest.mock("../../src/databaseRequests/saveCivitaiKeyRequest");
jest.mock("../../src/utils/getAuthenticatedUserId");

describe("SaveCivitaiKey", () => {
  let mockRequest: Partial<HttpRequest>;
  let mockContext: Partial<InvocationContext>;

  beforeEach(() => {
    mockRequest = {
      url: "https://example.com/api/SaveCivitaiKey",
      method: "POST",
      headers: {
        get: jest.fn().mockReturnValue("Bearer valid-token"),
      } as any,
      json: jest.fn(),
    };
    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
    };

    (getAuthenticatedUserId as jest.Mock).mockResolvedValue("test-user-id");
    (saveCivitaiKeyRequest as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should save civitai key successfully", async () => {
    const requestBody = { civitaiKey: "test-civitai-key" };
    (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

    const response = await SaveCivitaiKey(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(201);
    expect(response.body).toBe("Civitai key saved successfully");
    expect(saveCivitaiKeyRequest).toHaveBeenCalledWith(
      "test-user-id",
      "test-civitai-key"
    );
  });

  it("should return 400 when civitaiKey is missing", async () => {
    const requestBody = {};
    (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);

    const response = await SaveCivitaiKey(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(400);
    expect(response.body).toBe("Missing civitaiKey in request body");
    expect(saveCivitaiKeyRequest).not.toHaveBeenCalled();
  });

  it("should return 500 when authentication fails", async () => {
    (getAuthenticatedUserId as jest.Mock).mockRejectedValue(
      new Error("Invalid token")
    );

    const response = await SaveCivitaiKey(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(500);
    expect(saveCivitaiKeyRequest).not.toHaveBeenCalled();
  });

  it("should return 500 when saveCivitaiKeyRequest throws error", async () => {
    const requestBody = { civitaiKey: "test-civitai-key" };
    (mockRequest.json as jest.Mock).mockResolvedValue(requestBody);
    (saveCivitaiKeyRequest as jest.Mock).mockRejectedValue(
      new Error("Database error")
    );

    const response = await SaveCivitaiKey(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(500);
  });
});
