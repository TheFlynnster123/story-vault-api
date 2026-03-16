import { UserStorageClient } from "../utils/UserStorageClient";

export const saveOpenRouterKeyRequest = async (userId: string, openRouterKey: string) => {
  const userStorageClient = new UserStorageClient();
  await userStorageClient.uploadBlob(userId, "OpenRouterApiKey.txt", openRouterKey);
};
