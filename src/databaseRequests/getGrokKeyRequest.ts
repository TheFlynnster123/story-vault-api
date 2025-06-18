import { UserStorageClient } from "../utils/UserStorageClient";

export const getGrokKeyRequest = async (
  userId: string
): Promise<string | undefined> => {
  const userStorageClient = new UserStorageClient();
  return await userStorageClient.getBlob(userId, "ApiKeys.json");
};
