import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { Config } from "../config";

export class UserStorageClient {
  private containerClient: ContainerClient;

  constructor() {
    const storageConnectionString = Config.STORAGE_CONNECTION_STRING;
    if (!storageConnectionString) {
      throw new Error(
        "STORAGE_CONNECTION_STRING environment variable is not set"
      );
    }
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      storageConnectionString
    );
    this.containerClient = blobServiceClient.getContainerClient("users");
    this.containerClient.createIfNotExists();
  }

  async uploadBlob(
    userId: string,
    blobName: string,
    contents: string
  ): Promise<void> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(
      `${userId}/${blobName}`
    );

    await blockBlobClient.upload(contents, contents.length);
  }

  async getBlob(userId: string, blobName: string): Promise<string | undefined> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(
      `${userId}/${blobName}`
    );
    try {
      const downloadBlockBlobResponse =
        await blockBlobClient.downloadToBuffer();
      return downloadBlockBlobResponse.toString();
    } catch (error: any) {
      if (error.name === "RestError" && error.code === "BlobNotFound") {
        return undefined;
      }
      throw error;
    }
  }

  async listBlobsByPrefix(userId: string, prefix: string): Promise<string[]> {
    const fullPrefix = `${userId}/${prefix}`;
    const blobNames: string[] = [];
    for await (const blob of this.containerClient.listBlobsFlat({
      prefix: fullPrefix,
    })) {
      // Remove the userId/ prefix from the blob name to match the expected blobName format for getBlob
      blobNames.push(blob.name.substring(userId.length + 1));
    }
    return blobNames;
  }

  async deleteBlob(userId: string, blobName: string): Promise<boolean> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(
      `${userId}/${blobName}`
    );
    try {
      await blockBlobClient.deleteIfExists();
      return true;
    } catch (error: any) {
      throw error;
    }
  }

  async listChatIds(userId: string): Promise<string[]> {
    const chatIds: string[] = [];
    const prefix = `${userId}/`; // We want to list "directories" directly under the userId

    for await (const item of this.containerClient.listBlobsByHierarchy("/", {
      prefix,
    })) {
      if (item.kind === "prefix") {
        // item.name will be like "userId/chatId/", we need to extract "chatId"
        const fullPath = item.name;
        // Remove the userId/ prefix and the trailing /
        const chatId = fullPath.substring(prefix.length, fullPath.length - 1);
        if (chatId) {
          // Ensure it's not an empty string if something unexpected happens
          chatIds.push(chatId);
        }
      }
    }
    return [...new Set(chatIds)]; // Ensure uniqueness, though hierarchy listing should give unique prefixes
  }
}
