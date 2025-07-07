import { HttpRequest, InvocationContext } from "@azure/functions";
import { HasValidCivitaiKey } from "../../src/functions/HasValidCivitaiKey";
import { getCivitaiKeyRequest } from "../../src/databaseRequests/getCivitaiKeyRequest";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";

jest.mock("../../src/databaseRequests/getCivitaiKeyRequest");
jest.mock("../../src/utils/getAuthenticatedUserId");

describe("HasValidCivitaiKey", () => {
  let mockRequest: Partial<HttpRequest>;
  let mockContext: Partial<InvocationContext>;

  beforeEach(() => {
    mockRequest = {
      url: "https://example.com/api/HasValidCivitaiKey",
      method: "GET",
      headers: {
        get: jest.fn().mockReturnValue("Bearer valid-token"),
      } as any,
    };
    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
    };

    (getAuthenticatedUserId as jest.Mock).mockResolvedValue("test-user-id");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 200 when civitai key exists", async () => {
    (getCivitaiKeyRequest as jest.Mock).mockResolvedValue("test-civitai-key");

    const response = await HasValidCivitaiKey(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(200);
    expect(getCivitaiKeyRequest).toHaveBeenCalledWith("test-user-id");
  });

  it("should return 404 when civitai key does not exist", async () => {
    (getCivitaiKeyRequest as jest.Mock).mockResolvedValue(undefined);

    const response = await HasValidCivitaiKey(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(404);
    expect(response.body).toBe("Civitai key not found");
    expect(getCivitaiKeyRequest).toHaveBeenCalledWith("test-user-id");
  });

  it("should return 404 when civitai key is null", async () => {
    (getCivitaiKeyRequest as jest.Mock).mockResolvedValue(null);

    const response = await HasValidCivitaiKey(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(404);
    expect(response.body).toBe("Civitai key not found");
  });

  it("should return 500 when authentication fails", async () => {
    (getAuthenticatedUserId as jest.Mock).mockRejectedValue(
      new Error("Invalid token")
    );

    const response = await HasValidCivitaiKey(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(500);
    expect(getCivitaiKeyRequest).not.toHaveBeenCalled();
  });

  it("should return 500 when getCivitaiKeyRequest throws error", async () => {
    (getCivitaiKeyRequest as jest.Mock).mockRejectedValue(
      new Error("Database error")
    );

    const response = await HasValidCivitaiKey(
      mockRequest as HttpRequest,
      mockContext as InvocationContext
    );

    expect(response.status).toBe(500);
  });
});
