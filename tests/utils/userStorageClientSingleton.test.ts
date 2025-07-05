import { UserStorageClientSingleton } from "../../src/utils/userStorageClientSingleton";
import { UserStorageClient } from "../../src/utils/UserStorageClient";

// Mock the UserStorageClient
jest.mock("../../src/utils/UserStorageClient");

describe("UserStorageClientSingleton", () => {
  beforeEach(() => {
    // Reset the singleton instance before each test
    UserStorageClientSingleton.resetInstance();
    jest.clearAllMocks();
  });

  it("should return the same instance on multiple calls", () => {
    const instance1 = UserStorageClientSingleton.getInstance();
    const instance2 = UserStorageClientSingleton.getInstance();

    expect(instance1).toBe(instance2);
    expect(UserStorageClient).toHaveBeenCalledTimes(1);
  });

  it("should create a new instance after reset", () => {
    const instance1 = UserStorageClientSingleton.getInstance();
    UserStorageClientSingleton.resetInstance();
    const instance2 = UserStorageClientSingleton.getInstance();

    expect(instance1).not.toBe(instance2);
    expect(UserStorageClient).toHaveBeenCalledTimes(2);
  });

  it("should return an instance of UserStorageClient", () => {
    const instance = UserStorageClientSingleton.getInstance();

    expect(instance).toBeInstanceOf(UserStorageClient);
  });
});
