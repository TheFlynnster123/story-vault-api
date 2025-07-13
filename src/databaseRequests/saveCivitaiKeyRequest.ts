import { UserStorageClient } from "../utils/UserStorageClient";

export const saveCivitaiKeyRequest = async (
  userId: string,
  civitaiKey: string
) => {
  const userStorageClient = new UserStorageClient();
  await userStorageClient.uploadBlob(userId, "CivitaiApiKey.txt", civitaiKey);
};
