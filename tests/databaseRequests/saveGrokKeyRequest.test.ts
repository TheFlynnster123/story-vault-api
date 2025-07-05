import { saveGrokKeyRequest } from "../../src/databaseRequests/saveGrokKeyRequest";
import { UserStorageClient } from "../../src/utils/UserStorageClient";

// Mock dependencies
jest.mock("../../src/utils/UserStorageClient");

const mockUserStorageClient = UserStorageClient as jest.MockedClass<
  typeof UserStorageClient
>;

describe("saveGrokKeyRequest", () => {
  let mockUserStorageClientInstance: jest.Mocked<UserStorageClient>;

  beforeEach(() => {
    mockUserStorageClientInstance = {
      uploadBlob: jest.fn(),
    } as any;

    mockUserStorageClient.mockImplementation(
      () => mockUserStorageClientInstance
    );

    jest.clearAllMocks();
  });

  describe("successful operations", () => {
    it("should save grok key successfully", async () => {
      const userId = "user123";
      const grokKey = "grok-api-key-456";
      mockUserStorageClientInstance.uploadBlob.mockResolvedValue(undefined);

      await saveGrokKeyRequest(userId, grokKey);

      expect(mockUserStorageClientInstance.uploadBlob).toHaveBeenCalledWith(
        userId,
        "GrokApiKey.txt",
        grokKey
      );
      expect(mockUserStorageClientInstance.uploadBlob).toHaveBeenCalledTimes(1);
    });

    it("should handle different user IDs", async () => {
      const testCases = [
        { userId: "user1", grokKey: "key1" },
        { userId: "user2", grokKey: "key2" },
        { userId: "user3", grokKey: "key3" },
      ];

      for (const { userId, grokKey } of testCases) {
        mockUserStorageClientInstance.uploadBlob.mockResolvedValue(undefined);

        await saveGrokKeyRequest(userId, grokKey);

        expect(mockUserStorageClientInstance.uploadBlob).toHaveBeenCalledWith(
          userId,
          "GrokApiKey.txt",
          grokKey
        );

        jest.clearAllMocks();
      }
    });

    it("should handle different grok key formats", async () => {
      const userId = "user123";
      const testKeys = [
        "simple-key",
        "complex-key-with-dashes",
        "key_with_underscores",
        "KeyWithMixedCase123",
        "very-long-key-with-many-characters-and-numbers-12345",
      ];

      for (const grokKey of testKeys) {
        mockUserStorageClientInstance.uploadBlob.mockResolvedValue(undefined);

        await saveGrokKeyRequest(userId, grokKey);

        expect(mockUserStorageClientInstance.uploadBlob).toHaveBeenCalledWith(
          userId,
          "GrokApiKey.txt",
          grokKey
        );

        jest.clearAllMocks();
      }
    });
  });

  describe("error handling", () => {
    it("should propagate UserStorageClient upload errors", async () => {
      const userId = "user123";
      const grokKey = "grok-key";
      const uploadError = new Error("Upload failed");

      mockUserStorageClientInstance.uploadBlob.mockRejectedValue(uploadError);

      await expect(saveGrokKeyRequest(userId, grokKey)).rejects.toThrow(
        "Upload failed"
      );

      expect(mockUserStorageClientInstance.uploadBlob).toHaveBeenCalledWith(
        userId,
        "GrokApiKey.txt",
        grokKey
      );
    });

    it("should handle network errors", async () => {
      const userId = "user123";
      const grokKey = "grok-key";
      const networkError = new Error("Network timeout");

      mockUserStorageClientInstance.uploadBlob.mockRejectedValue(networkError);

      await expect(saveGrokKeyRequest(userId, grokKey)).rejects.toThrow(
        "Network timeout"
      );
    });

    it("should handle storage quota errors", async () => {
      const userId = "user123";
      const grokKey = "grok-key";
      const quotaError = new Error("Storage quota exceeded");

      mockUserStorageClientInstance.uploadBlob.mockRejectedValue(quotaError);

      await expect(saveGrokKeyRequest(userId, grokKey)).rejects.toThrow(
        "Storage quota exceeded"
      );
    });
  });

  describe("edge cases", () => {
    it("should handle empty user ID", async () => {
      const userId = "";
      const grokKey = "grok-key";
      mockUserStorageClientInstance.uploadBlob.mockResolvedValue(undefined);

      await saveGrokKeyRequest(userId, grokKey);

      expect(mockUserStorageClientInstance.uploadBlob).toHaveBeenCalledWith(
        userId,
        "GrokApiKey.txt",
        grokKey
      );
    });

    it("should handle empty grok key", async () => {
      const userId = "user123";
      const grokKey = "";
      mockUserStorageClientInstance.uploadBlob.mockResolvedValue(undefined);

      await saveGrokKeyRequest(userId, grokKey);

      expect(mockUserStorageClientInstance.uploadBlob).toHaveBeenCalledWith(
        userId,
        "GrokApiKey.txt",
        grokKey
      );
    });

    it("should handle special characters in user ID", async () => {
      const userId = "user@domain.com";
      const grokKey = "grok-key";
      mockUserStorageClientInstance.uploadBlob.mockResolvedValue(undefined);

      await saveGrokKeyRequest(userId, grokKey);

      expect(mockUserStorageClientInstance.uploadBlob).toHaveBeenCalledWith(
        userId,
        "GrokApiKey.txt",
        grokKey
      );
    });

    it("should handle special characters in grok key", async () => {
      const userId = "user123";
      const grokKey = "grok-key!@#$%^&*()";
      mockUserStorageClientInstance.uploadBlob.mockResolvedValue(undefined);

      await saveGrokKeyRequest(userId, grokKey);

      expect(mockUserStorageClientInstance.uploadBlob).toHaveBeenCalledWith(
        userId,
        "GrokApiKey.txt",
        grokKey
      );
    });
  });

  describe("integration scenarios", () => {
    it("should maintain consistent file naming", async () => {
      const userId = "user123";
      const grokKey = "grok-key";
      mockUserStorageClientInstance.uploadBlob.mockResolvedValue(undefined);

      await saveGrokKeyRequest(userId, grokKey);

      // Verify the filename is always "GrokApiKey.txt"
      expect(mockUserStorageClientInstance.uploadBlob).toHaveBeenCalledWith(
        userId,
        "GrokApiKey.txt",
        grokKey
      );
    });

    it("should create new UserStorageClient instance for each call", async () => {
      const userId = "user123";
      const grokKey = "grok-key";
      mockUserStorageClientInstance.uploadBlob.mockResolvedValue(undefined);

      await saveGrokKeyRequest(userId, grokKey);
      await saveGrokKeyRequest(userId, grokKey);

      // Verify UserStorageClient constructor was called twice
      expect(mockUserStorageClient).toHaveBeenCalledTimes(2);
    });
  });
});
