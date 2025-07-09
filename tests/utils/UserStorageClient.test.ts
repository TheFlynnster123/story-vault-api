import { UserStorageClient } from "../../src/utils/UserStorageClient";
import {
  BlobServiceClient,
  ContainerClient,
  BlockBlobClient,
} from "@azure/storage-blob";
import { Config } from "../../src/config";

// Mock Azure Storage SDK
jest.mock("@azure/storage-blob");
jest.mock("../../src/config");

const mockBlobServiceClient = BlobServiceClient as jest.MockedClass<
  typeof BlobServiceClient
>;
const mockContainerClient = {
  createIfNotExists: jest.fn(),
  getBlockBlobClient: jest.fn(),
  listBlobsFlat: jest.fn(),
  listBlobsByHierarchy: jest.fn(),
} as unknown as jest.Mocked<ContainerClient>;

const mockBlockBlobClient = {
  upload: jest.fn(),
  downloadToBuffer: jest.fn(),
  deleteIfExists: jest.fn(),
} as unknown as jest.Mocked<BlockBlobClient>;

const mockConfig = Config as jest.Mocked<typeof Config>;

describe("UserStorageClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Config
    mockConfig.STORAGE_CONNECTION_STRING =
      "DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;EndpointSuffix=core.windows.net";

    // Mock BlobServiceClient
    mockBlobServiceClient.fromConnectionString = jest.fn().mockReturnValue({
      getContainerClient: jest.fn().mockReturnValue(mockContainerClient),
    });

    mockContainerClient.getBlockBlobClient.mockReturnValue(mockBlockBlobClient);
  });

  describe("constructor", () => {
    it("should create container client and ensure container exists", () => {
      new UserStorageClient();

      expect(mockBlobServiceClient.fromConnectionString).toHaveBeenCalledWith(
        "DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test;EndpointSuffix=core.windows.net"
      );
      expect(mockContainerClient.createIfNotExists).toHaveBeenCalled();
    });

    it("should throw error when connection string is not set", () => {
      mockConfig.STORAGE_CONNECTION_STRING = undefined;

      expect(() => new UserStorageClient()).toThrow(
        "STORAGE_CONNECTION_STRING environment variable is not set"
      );
    });
  });

  describe("uploadBlob", () => {
    it("should upload blob successfully", async () => {
      const client = new UserStorageClient();
      const userId = "user123";
      const blobName = "chat123/blob.txt";
      const contents = "Test content";

      mockBlockBlobClient.upload.mockResolvedValue({} as any);

      await client.uploadBlob(userId, blobName, contents);

      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(
        "user123/chat123/blob.txt"
      );
      expect(mockBlockBlobClient.upload).toHaveBeenCalledWith(
        contents,
        contents.length
      );
    });

    it("should handle empty content", async () => {
      const client = new UserStorageClient();
      const userId = "user123";
      const blobName = "chat123/empty.txt";
      const contents = "";

      mockBlockBlobClient.upload.mockResolvedValue({} as any);

      await client.uploadBlob(userId, blobName, contents);

      expect(mockBlockBlobClient.upload).toHaveBeenCalledWith("", 0);
    });
  });

  describe("getBlob", () => {
    it("should retrieve blob successfully", async () => {
      const client = new UserStorageClient();
      const userId = "user123";
      const blobName = "chat123/blob.txt";
      const expectedContent = "Test content";

      mockBlockBlobClient.downloadToBuffer.mockResolvedValue(
        Buffer.from(expectedContent)
      );

      const result = await client.getBlob(userId, blobName);

      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(
        "user123/chat123/blob.txt"
      );
      expect(result).toBe(expectedContent);
    });

    it("should return undefined when blob not found", async () => {
      const client = new UserStorageClient();
      const userId = "user123";
      const blobName = "chat123/nonexistent.txt";

      const error = new Error("Blob not found");
      (error as any).name = "RestError";
      (error as any).code = "BlobNotFound";
      mockBlockBlobClient.downloadToBuffer.mockRejectedValue(error);

      const result = await client.getBlob(userId, blobName);

      expect(result).toBeUndefined();
    });

    it("should throw error for other storage errors", async () => {
      const client = new UserStorageClient();
      const userId = "user123";
      const blobName = "chat123/blob.txt";

      const error = new Error("Storage error");
      mockBlockBlobClient.downloadToBuffer.mockRejectedValue(error);

      await expect(client.getBlob(userId, blobName)).rejects.toThrow(
        "Storage error"
      );
    });
  });

  describe("deleteBlob", () => {
    it("should delete blob successfully", async () => {
      const client = new UserStorageClient();
      const userId = "user123";
      const blobName = "chat123/blob.txt";

      mockBlockBlobClient.deleteIfExists.mockResolvedValue({} as any);

      const result = await client.deleteBlob(userId, blobName);

      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith(
        "user123/chat123/blob.txt"
      );
      expect(mockBlockBlobClient.deleteIfExists).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("should handle deletion errors", async () => {
      const client = new UserStorageClient();
      const userId = "user123";
      const blobName = "chat123/blob.txt";

      const error = new Error("Delete error");
      mockBlockBlobClient.deleteIfExists.mockRejectedValue(error);

      await expect(client.deleteBlob(userId, blobName)).rejects.toThrow(
        "Delete error"
      );
    });
  });

  describe("listBlobsByPrefix", () => {
    it("should list blobs with prefix successfully", async () => {
      const client = new UserStorageClient();
      const userId = "user123";
      const prefix = "chat123/";

      const mockBlobs = [
        { name: "user123/chat123/blob1.txt" },
        { name: "user123/chat123/blob2.txt" },
        { name: "user123/chat123/subfolder/blob3.txt" },
      ];

      mockContainerClient.listBlobsFlat.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const blob of mockBlobs) {
            yield blob;
          }
        },
      } as any);

      const result = await client.listBlobsByPrefix(userId, prefix);

      expect(mockContainerClient.listBlobsFlat).toHaveBeenCalledWith({
        prefix: "user123/chat123/",
      });
      expect(result).toEqual([
        "chat123/blob1.txt",
        "chat123/blob2.txt",
        "chat123/subfolder/blob3.txt",
      ]);
    });

    it("should return empty array when no blobs found", async () => {
      const client = new UserStorageClient();
      const userId = "user123";
      const prefix = "chat123/";

      mockContainerClient.listBlobsFlat.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          // Empty iterator
        },
      } as any);

      const result = await client.listBlobsByPrefix(userId, prefix);

      expect(result).toEqual([]);
    });
  });

  describe("listChatIds", () => {
    it("should list chat IDs successfully", async () => {
      const client = new UserStorageClient();
      const userId = "user123";

      const mockHierarchy = [
        { kind: "prefix", name: "user123/chat1/" },
        { kind: "prefix", name: "user123/chat2/" },
        { kind: "prefix", name: "user123/chat3/" },
      ];

      mockContainerClient.listBlobsByHierarchy.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const item of mockHierarchy) {
            yield item;
          }
        },
      } as any);

      const result = await client.listChatIds(userId);

      expect(mockContainerClient.listBlobsByHierarchy).toHaveBeenCalledWith(
        "/",
        {
          prefix: "user123/",
        }
      );
      expect(result).toEqual(["chat1", "chat2", "chat3"]);
    });

    it("should handle empty hierarchy", async () => {
      const client = new UserStorageClient();
      const userId = "user123";

      mockContainerClient.listBlobsByHierarchy.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          // Empty iterator
        },
      } as any);

      const result = await client.listChatIds(userId);

      expect(result).toEqual([]);
    });

    it("should filter out non-prefix items", async () => {
      const client = new UserStorageClient();
      const userId = "user123";

      const mockHierarchy = [
        { kind: "prefix", name: "user123/chat1/" },
        { kind: "blob", name: "user123/somefile.txt" },
        { kind: "prefix", name: "user123/chat2/" },
      ];

      mockContainerClient.listBlobsByHierarchy.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const item of mockHierarchy) {
            yield item;
          }
        },
      } as any);

      const result = await client.listChatIds(userId);

      expect(result).toEqual(["chat1", "chat2"]);
    });

    it("should ensure unique chat IDs", async () => {
      const client = new UserStorageClient();
      const userId = "user123";

      const mockHierarchy = [
        { kind: "prefix", name: "user123/chat1/" },
        { kind: "prefix", name: "user123/chat1/" }, // Duplicate
        { kind: "prefix", name: "user123/chat2/" },
      ];

      mockContainerClient.listBlobsByHierarchy.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const item of mockHierarchy) {
            yield item;
          }
        },
      } as any);

      const result = await client.listChatIds(userId);

      expect(result).toEqual(["chat1", "chat2"]);
    });
  });
});
