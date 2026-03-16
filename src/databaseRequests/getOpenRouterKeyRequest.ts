import { UserStorageClient } from "../utils/UserStorageClient";
import { EncryptionManager } from "../utils/encryptionManager";

export const getOpenRouterKeyRequest = async (
  userId: string,
  encryptionKey?: string | undefined | null
): Promise<string | undefined> => {
  const userStorageClient = new UserStorageClient();
  let key = await userStorageClient.getBlob(userId, "OpenRouterApiKey.txt");

  if (encryptionKey && key) {
    const encryptionManager = new EncryptionManager(encryptionKey);
    key = await encryptionManager.decryptString(encryptionKey, key);
  }

  return key;
};
