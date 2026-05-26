import { getCivitaiKeyRequest } from "../databaseRequests/getCivitaiKeyRequest";

export class CivitaiClient {
  static async hasValidKey(
    userId: string,
    encryptionKey?: string
  ): Promise<boolean> {
    const civitaiKey = await getCivitaiKeyRequest(userId, encryptionKey);
    return !!civitaiKey;
  }
}
