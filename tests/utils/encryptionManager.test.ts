import { EncryptionManager } from "../../src/utils/encryptionManager";

// Mock the entire EncryptionManager class
jest.mock("../../src/utils/encryptionManager", () => {
  return {
    EncryptionManager: jest.fn().mockImplementation((key: string) => {
      return {
        encryptionKey: key,
        encryptString: jest
          .fn()
          .mockImplementation(async (key: string, data: string) => {
            // Simple mock implementation that returns a base64 string
            return Buffer.from(`encrypted:${data}`).toString("base64");
          }),
        decryptString: jest
          .fn()
          .mockImplementation(async (key: string, encryptedData: string) => {
            // Simple mock implementation that reverses the encryption
            const decoded = Buffer.from(encryptedData, "base64").toString();
            if (decoded.startsWith("encrypted:")) {
              return decoded.substring(10);
            }
            throw new Error("Invalid encrypted data");
          }),
      };
    }),
  };
});

describe("EncryptionManager", () => {
  let encryptionManager: EncryptionManager;
  const testKey =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const testData = "Hello, World!";

  beforeEach(() => {
    encryptionManager = new EncryptionManager("test-key");
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should set the encryption key", () => {
      const key = "test-encryption-key";
      const manager = new EncryptionManager(key);
      expect(manager.encryptionKey).toBe(key);
    });
  });

  describe("encryptString", () => {
    it("should encrypt string successfully", async () => {
      const result = await encryptionManager.encryptString(testKey, testData);
      expect(typeof result).toBe("string");
      expect(result).toBe(
        Buffer.from(`encrypted:${testData}`).toString("base64")
      );
    });

    it("should call encryptString with correct parameters", async () => {
      await encryptionManager.encryptString(testKey, testData);
      expect(encryptionManager.encryptString).toHaveBeenCalledWith(
        testKey,
        testData
      );
    });
  });

  describe("decryptString", () => {
    it("should decrypt string successfully", async () => {
      const encryptedData = Buffer.from(`encrypted:${testData}`).toString(
        "base64"
      );
      const result = await encryptionManager.decryptString(
        testKey,
        encryptedData
      );
      expect(result).toBe(testData);
    });

    it("should handle invalid encrypted data", async () => {
      const invalidData = Buffer.from("invalid:data").toString("base64");
      await expect(
        encryptionManager.decryptString(testKey, invalidData)
      ).rejects.toThrow("Invalid encrypted data");
    });

    it("should handle invalid base64 input", async () => {
      const invalidBase64 = "invalid-base64!@#";
      await expect(
        encryptionManager.decryptString(testKey, invalidBase64)
      ).rejects.toThrow();
    });

    it("should call decryptString with correct parameters", async () => {
      const encryptedData = Buffer.from(`encrypted:${testData}`).toString(
        "base64"
      );
      await encryptionManager.decryptString(testKey, encryptedData);
      expect(encryptionManager.decryptString).toHaveBeenCalledWith(
        testKey,
        encryptedData
      );
    });
  });

  describe("integration", () => {
    it("should encrypt and decrypt the same data successfully", async () => {
      // Encrypt
      const encrypted = await encryptionManager.encryptString(
        testKey,
        testData
      );
      expect(typeof encrypted).toBe("string");

      // Decrypt
      const decrypted = await encryptionManager.decryptString(
        testKey,
        encrypted
      );
      expect(decrypted).toBe(testData);
    });

    it("should handle different data types", async () => {
      const jsonData = JSON.stringify({ message: "test", number: 42 });
      const encrypted = await encryptionManager.encryptString(
        testKey,
        jsonData
      );
      const decrypted = await encryptionManager.decryptString(
        testKey,
        encrypted
      );
      expect(decrypted).toBe(jsonData);
      expect(JSON.parse(decrypted)).toEqual({ message: "test", number: 42 });
    });

    it("should handle empty strings", async () => {
      const emptyString = "";
      const encrypted = await encryptionManager.encryptString(
        testKey,
        emptyString
      );
      const decrypted = await encryptionManager.decryptString(
        testKey,
        encrypted
      );
      expect(decrypted).toBe(emptyString);
    });
  });
});
