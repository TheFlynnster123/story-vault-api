import { UserStorageClient } from "../utils/UserStorageClient";

export const saveGrokKeyRequest = async (userId: string, grokKey: string) => {
  const userStorageClient = new UserStorageClient();
  await userStorageClient.uploadBlob(userId, "GrokApiKey.txt", grokKey);
};
