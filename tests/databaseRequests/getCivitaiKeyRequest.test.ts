import { getCivitaiKeyRequest } from "../../src/databaseRequests/getCivitaiKeyRequest";
import { UserStorageClient } from "../../src/utils/UserStorageClient";
import { EncryptionManager } from "../../src/utils/encryptionManager";

jest.mock("../../src/utils/UserStorageClient");
jest.mock("../../src/utils/encryptionManager");

describe("getCivitaiKeyRequest", () => {
  let mockUserStorageClient: jest.Mocked<UserStorageClient>;
  let mockEncryptionManager: jest.Mocked<EncryptionManager>;

  beforeEach(() => {
    mockUserStorageClient =
      new UserStorageClient() as jest.Mocked<UserStorageClient>;
    (
      UserStorageClient as jest.MockedClass<typeof UserStorageClient>
    ).mockImplementation(() => mockUserStorageClient);

    mockEncryptionManager = {
      encryptionKey: "test-key",
      encryptString: jest.fn(),
      decryptString: jest.fn(),
    } as jest.Mocked<EncryptionManager>;

    (
      EncryptionManager as jest.MockedClass<typeof EncryptionManager>
    ).mockImplementation(() => mockEncryptionManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return civitai key without decryption when no encryption key provided", async () => {
    const userId = "test-user-id";
    const expectedKey = "test-civitai-key";

    mockUserStorageClient.getBlob.mockResolvedValue(expectedKey);

    const result = await getCivitaiKeyRequest(userId);

    expect(result).toBe(expectedKey);
    expect(mockUserStorageClient.getBlob).toHaveBeenCalledWith(
      userId,
      "CivitaiApiKey.txt"
    );
    expect(mockEncryptionManager.decryptString).not.toHaveBeenCalled();
  });

  it("should return decrypted civitai key when encryption key provided", async () => {
    const userId = "test-user-id";
    const encryptionKey = "test-encryption-key";
    const encryptedKey = "encrypted-civitai-key";
    const decryptedKey = "decrypted-civitai-key";

    mockUserStorageClient.getBlob.mockResolvedValue(encryptedKey);
    mockEncryptionManager.decryptString.mockResolvedValue(decryptedKey);

    const result = await getCivitaiKeyRequest(userId, encryptionKey);

    expect(result).toBe(decryptedKey);
    expect(mockUserStorageClient.getBlob).toHaveBeenCalledWith(
      userId,
      "CivitaiApiKey.txt"
    );
    expect(EncryptionManager).toHaveBeenCalledWith(encryptionKey);
    expect(mockEncryptionManager.decryptString).toHaveBeenCalledWith(
      encryptionKey,
      encryptedKey
    );
  });

  it("should return undefined when no key found", async () => {
    const userId = "test-user-id";

    mockUserStorageClient.getBlob.mockResolvedValue(undefined);

    const result = await getCivitaiKeyRequest(userId);

    expect(result).toBeUndefined();
    expect(mockEncryptionManager.decryptString).not.toHaveBeenCalled();
  });

  it("should return key without decryption when encryption key is null", async () => {
    const userId = "test-user-id";
    const expectedKey = "test-civitai-key";

    mockUserStorageClient.getBlob.mockResolvedValue(expectedKey);

    const result = await getCivitaiKeyRequest(userId, null);

    expect(result).toBe(expectedKey);
    expect(mockEncryptionManager.decryptString).not.toHaveBeenCalled();
  });

  it("should return key without decryption when encryption key is undefined", async () => {
    const userId = "test-user-id";
    const expectedKey = "test-civitai-key";

    mockUserStorageClient.getBlob.mockResolvedValue(expectedKey);

    const result = await getCivitaiKeyRequest(userId, undefined);

    expect(result).toBe(expectedKey);
    expect(mockEncryptionManager.decryptString).not.toHaveBeenCalled();
  });
});
