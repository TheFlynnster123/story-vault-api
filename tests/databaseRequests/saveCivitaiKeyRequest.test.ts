import { saveCivitaiKeyRequest } from "../../src/databaseRequests/saveCivitaiKeyRequest";
import { UserStorageClient } from "../../src/utils/UserStorageClient";

jest.mock("../../src/utils/UserStorageClient");

describe("saveCivitaiKeyRequest", () => {
  let mockUserStorageClient: jest.Mocked<UserStorageClient>;

  beforeEach(() => {
    mockUserStorageClient =
      new UserStorageClient() as jest.Mocked<UserStorageClient>;
    (
      UserStorageClient as jest.MockedClass<typeof UserStorageClient>
    ).mockImplementation(() => mockUserStorageClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should save civitai key to blob storage", async () => {
    const userId = "test-user-id";
    const civitaiKey = "test-civitai-key";

    mockUserStorageClient.uploadBlob.mockResolvedValue();

    await saveCivitaiKeyRequest(userId, civitaiKey);

    expect(mockUserStorageClient.uploadBlob).toHaveBeenCalledWith(
      userId,
      "CivitaiApiKey.txt",
      civitaiKey
    );
  });

  it("should throw error if upload fails", async () => {
    const userId = "test-user-id";
    const civitaiKey = "test-civitai-key";
    const error = new Error("Upload failed");

    mockUserStorageClient.uploadBlob.mockRejectedValue(error);

    await expect(saveCivitaiKeyRequest(userId, civitaiKey)).rejects.toThrow(
      "Upload failed"
    );
  });
});
