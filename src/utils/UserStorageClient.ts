import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { Config } from "../config";

export class UserStorageClient {
  private containerClient: ContainerClient;

  constructor() {
    const storageConnectionString = Config.STORAGE_CONNECTION_STRING;
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      storageConnectionString
    );
    this.containerClient = blobServiceClient.getContainerClient("users");
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
}
