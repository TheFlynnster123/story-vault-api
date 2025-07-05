import { getGrokKeyRequest } from "../../src/databaseRequests/getGrokKeyRequest";
import { UserStorageClient } from "../../src/utils/UserStorageClient";
import { EncryptionManager } from "../../src/utils/encryptionManager";

// Mock dependencies
jest.mock("../../src/utils/UserStorageClient");
jest.mock("../../src/utils/encryptionManager");

const mockUserStorageClient = UserStorageClient as jest.MockedClass<
  typeof UserStorageClient
>;
const mockEncryptionManager = EncryptionManager as jest.MockedClass<
  typeof EncryptionManager
>;

describe("getGrokKeyRequest", () => {
  let mockUserStorageClientInstance: jest.Mocked<UserStorageClient>;
  let mockEncryptionManagerInstance: jest.Mocked<EncryptionManager>;

  beforeEach(() => {
    mockUserStorageClientInstance = {
      getBlob: jest.fn(),
    } as any;

    mockEncryptionManagerInstance = {
      decryptString: jest.fn(),
    } as any;

    mockUserStorageClient.mockImplementation(
      () => mockUserStorageClientInstance
    );
    mockEncryptionManager.mockImplementation(
      () => mockEncryptionManagerInstance
    );

    jest.clearAllMocks();
  });

  describe("without encryption", () => {
    it("should return the grok key when found and no encryption key provided", async () => {
      const userId = "user123";
      const expectedKey = "grok-api-key-123";
      mockUserStorageClientInstance.getBlob.mockResolvedValue(expectedKey);

      const result = await getGrokKeyRequest(userId);

      expect(result).toBe(expectedKey);
      expect(mockUserStorageClientInstance.getBlob).toHaveBeenCalledWith(
        userId,
        "GrokApiKey.txt"
      );
      expect(
        mockEncryptionManagerInstance.decryptString
      ).not.toHaveBeenCalled();
    });

    it("should return undefined when no key is found", async () => {
      const userId = "user123";
      mockUserStorageClientInstance.getBlob.mockResolvedValue(undefined);

      const result = await getGrokKeyRequest(userId);

      expect(result).toBeUndefined();
      expect(mockUserStorageClientInstance.getBlob).toHaveBeenCalledWith(
        userId,
        "GrokApiKey.txt"
      );
    });

    it("should return null when key is null", async () => {
      const userId = "user123";
      mockUserStorageClientInstance.getBlob.mockResolvedValue(null as any);

      const result = await getGrokKeyRequest(userId);

      expect(result).toBeNull();
      expect(mockUserStorageClientInstance.getBlob).toHaveBeenCalledWith(
        userId,
        "GrokApiKey.txt"
      );
    });

    it("should return empty string when key is empty string", async () => {
      const userId = "user123";
      mockUserStorageClientInstance.getBlob.mockResolvedValue("");

      const result = await getGrokKeyRequest(userId);

      expect(result).toBe("");
      expect(mockUserStorageClientInstance.getBlob).toHaveBeenCalledWith(
        userId,
        "GrokApiKey.txt"
      );
    });
  });

  describe("with encryption", () => {
    it("should decrypt and return the grok key when encryption key is provided", async () => {
      const userId = "user123";
      const encryptionKey = "encryption-key-456";
      const encryptedKey = "encrypted-grok-key";
      const decryptedKey = "decrypted-grok-key";

      mockUserStorageClientInstance.getBlob.mockResolvedValue(encryptedKey);
      mockEncryptionManagerInstance.decryptString.mockResolvedValue(
        decryptedKey
      );

      const result = await getGrokKeyRequest(userId, encryptionKey);

      expect(result).toBe(decryptedKey);
      expect(mockUserStorageClientInstance.getBlob).toHaveBeenCalledWith(
        userId,
        "GrokApiKey.txt"
      );
      expect(mockEncryptionManager).toHaveBeenCalledWith(encryptionKey);
      expect(mockEncryptionManagerInstance.decryptString).toHaveBeenCalledWith(
        encryptionKey,
        encryptedKey
      );
    });

    it("should return undefined when no key is found even with encryption key", async () => {
      const userId = "user123";
      const encryptionKey = "encryption-key-456";
      mockUserStorageClientInstance.getBlob.mockResolvedValue(undefined);

      const result = await getGrokKeyRequest(userId, encryptionKey);

      expect(result).toBeUndefined();
      expect(mockUserStorageClientInstance.getBlob).toHaveBeenCalledWith(
        userId,
        "GrokApiKey.txt"
      );
      expect(
        mockEncryptionManagerInstance.decryptString
      ).not.toHaveBeenCalled();
    });

    it("should handle null encryption key", async () => {
      const userId = "user123";
      const expectedKey = "grok-api-key-123";
      mockUserStorageClientInstance.getBlob.mockResolvedValue(expectedKey);

      const result = await getGrokKeyRequest(userId, null);

      expect(result).toBe(expectedKey);
      expect(mockUserStorageClientInstance.getBlob).toHaveBeenCalledWith(
        userId,
        "GrokApiKey.txt"
      );
      expect(
        mockEncryptionManagerInstance.decryptString
      ).not.toHaveBeenCalled();
    });

    it("should handle undefined encryption key", async () => {
      const userId = "user123";
      const expectedKey = "grok-api-key-123";
      mockUserStorageClientInstance.getBlob.mockResolvedValue(expectedKey);

      const result = await getGrokKeyRequest(userId, undefined);

      expect(result).toBe(expectedKey);
      expect(mockUserStorageClientInstance.getBlob).toHaveBeenCalledWith(
        userId,
        "GrokApiKey.txt"
      );
      expect(
        mockEncryptionManagerInstance.decryptString
      ).not.toHaveBeenCalled();
    });

    it("should propagate decryption errors", async () => {
      const userId = "user123";
      const encryptionKey = "encryption-key-456";
      const encryptedKey = "encrypted-grok-key";

      mockUserStorageClientInstance.getBlob.mockResolvedValue(encryptedKey);
      mockEncryptionManagerInstance.decryptString.mockRejectedValue(
        new Error("Decryption failed")
      );

      await expect(getGrokKeyRequest(userId, encryptionKey)).rejects.toThrow(
        "Decryption failed"
      );

      expect(mockUserStorageClientInstance.getBlob).toHaveBeenCalledWith(
        userId,
        "GrokApiKey.txt"
      );
      expect(mockEncryptionManagerInstance.decryptString).toHaveBeenCalledWith(
        encryptionKey,
        encryptedKey
      );
    });
  });

  describe("error handling", () => {
    it("should propagate UserStorageClient errors", async () => {
      const userId = "user123";
      mockUserStorageClientInstance.getBlob.mockRejectedValue(
        new Error("Storage error")
      );

      await expect(getGrokKeyRequest(userId)).rejects.toThrow("Storage error");

      expect(mockUserStorageClientInstance.getBlob).toHaveBeenCalledWith(
        userId,
        "GrokApiKey.txt"
      );
    });

    it("should handle different user IDs", async () => {
      const userIds = ["user1", "user2", "user3"];
      const expectedKey = "grok-key";

      for (const userId of userIds) {
        mockUserStorageClientInstance.getBlob.mockResolvedValue(expectedKey);

        const result = await getGrokKeyRequest(userId);

        expect(result).toBe(expectedKey);
        expect(mockUserStorageClientInstance.getBlob).toHaveBeenCalledWith(
          userId,
          "GrokApiKey.txt"
        );

        jest.clearAllMocks();
      }
    });
  });

  describe("edge cases", () => {
    it("should handle empty user ID", async () => {
      const userId = "";
      const expectedKey = "grok-key";
      mockUserStorageClientInstance.getBlob.mockResolvedValue(expectedKey);

      const result = await getGrokKeyRequest(userId);

      expect(result).toBe(expectedKey);
      expect(mockUserStorageClientInstance.getBlob).toHaveBeenCalledWith(
        userId,
        "GrokApiKey.txt"
      );
    });

    it("should handle empty encryption key string", async () => {
      const userId = "user123";
      const expectedKey = "grok-api-key-123";
      mockUserStorageClientInstance.getBlob.mockResolvedValue(expectedKey);

      const result = await getGrokKeyRequest(userId, "");

      expect(result).toBe(expectedKey);
      expect(mockUserStorageClientInstance.getBlob).toHaveBeenCalledWith(
        userId,
        "GrokApiKey.txt"
      );
      expect(
        mockEncryptionManagerInstance.decryptString
      ).not.toHaveBeenCalled();
    });
  });
});
