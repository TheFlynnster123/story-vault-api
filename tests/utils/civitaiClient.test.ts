import { CivitaiClient } from "../../src/utils/civitaiClient";
import { getCivitaiKeyRequest } from "../../src/databaseRequests/getCivitaiKeyRequest";

jest.mock("../../src/databaseRequests/getCivitaiKeyRequest");

describe("CivitaiClient", () => {
  const mockGetCivitaiKeyRequest = getCivitaiKeyRequest as jest.MockedFunction<
    typeof getCivitaiKeyRequest
  >;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("exampleApiCall", () => {
    it("should return success message when civitai key exists", async () => {
      const userId = "test-user-id";
      const encryptionKey = "test-encryption-key";
      const civitaiKey = "test-civitai-key";

      mockGetCivitaiKeyRequest.mockResolvedValue(civitaiKey);

      const result = await CivitaiClient.exampleApiCall(userId, encryptionKey);

      expect(result).toBe(
        `Successfully retrieved Civitai key for user ${userId}`
      );
      expect(mockGetCivitaiKeyRequest).toHaveBeenCalledWith(
        userId,
        encryptionKey
      );
    });

    it("should return null when civitai key does not exist", async () => {
      const userId = "test-user-id";
      const encryptionKey = "test-encryption-key";

      mockGetCivitaiKeyRequest.mockResolvedValue(undefined);

      const result = await CivitaiClient.exampleApiCall(userId, encryptionKey);

      expect(result).toBeNull();
      expect(mockGetCivitaiKeyRequest).toHaveBeenCalledWith(
        userId,
        encryptionKey
      );
    });

    it("should work without encryption key", async () => {
      const userId = "test-user-id";
      const civitaiKey = "test-civitai-key";

      mockGetCivitaiKeyRequest.mockResolvedValue(civitaiKey);

      const result = await CivitaiClient.exampleApiCall(userId);

      expect(result).toBe(
        `Successfully retrieved Civitai key for user ${userId}`
      );
      expect(mockGetCivitaiKeyRequest).toHaveBeenCalledWith(userId, undefined);
    });

    it("should return null when civitai key is null", async () => {
      const userId = "test-user-id";

      mockGetCivitaiKeyRequest.mockResolvedValue(undefined);

      const result = await CivitaiClient.exampleApiCall(userId);

      expect(result).toBeNull();
    });
  });

  describe("hasValidKey", () => {
    it("should return true when civitai key exists", async () => {
      const userId = "test-user-id";
      const encryptionKey = "test-encryption-key";
      const civitaiKey = "test-civitai-key";

      mockGetCivitaiKeyRequest.mockResolvedValue(civitaiKey);

      const result = await CivitaiClient.hasValidKey(userId, encryptionKey);

      expect(result).toBe(true);
      expect(mockGetCivitaiKeyRequest).toHaveBeenCalledWith(
        userId,
        encryptionKey
      );
    });

    it("should return false when civitai key does not exist", async () => {
      const userId = "test-user-id";
      const encryptionKey = "test-encryption-key";

      mockGetCivitaiKeyRequest.mockResolvedValue(undefined);

      const result = await CivitaiClient.hasValidKey(userId, encryptionKey);

      expect(result).toBe(false);
      expect(mockGetCivitaiKeyRequest).toHaveBeenCalledWith(
        userId,
        encryptionKey
      );
    });

    it("should return false when civitai key is null", async () => {
      const userId = "test-user-id";

      mockGetCivitaiKeyRequest.mockResolvedValue(undefined);

      const result = await CivitaiClient.hasValidKey(userId);

      expect(result).toBe(false);
    });

    it("should return false when civitai key is empty string", async () => {
      const userId = "test-user-id";

      mockGetCivitaiKeyRequest.mockResolvedValue("");

      const result = await CivitaiClient.hasValidKey(userId);

      expect(result).toBe(false);
    });

    it("should work without encryption key", async () => {
      const userId = "test-user-id";
      const civitaiKey = "test-civitai-key";

      mockGetCivitaiKeyRequest.mockResolvedValue(civitaiKey);

      const result = await CivitaiClient.hasValidKey(userId);

      expect(result).toBe(true);
      expect(mockGetCivitaiKeyRequest).toHaveBeenCalledWith(userId, undefined);
    });
  });
});
