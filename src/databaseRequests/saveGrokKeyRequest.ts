import { BlobServiceClient } from "@azure/storage-blob";
import { Config } from "../config";

export const saveGrokKeyRequest = async (userId: string, grokKey: string) => {
  const blobClient = BlobServiceClient.fromConnectionString(
    Config.STORAGE_CONNECTION_STRING
  );
  const containerClient = blobClient.getContainerClient("users");
  await containerClient.createIfNotExists();

  const userFolder = userId.replace("|", "-");
  const blobPath = `${userFolder}/ApiKeys.json`;

  const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

  await blockBlobClient.upload(grokKey, Buffer.byteLength(grokKey));
};
