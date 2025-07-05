import { UserStorageClient } from "./UserStorageClient";

class UserStorageClientSingleton {
  private static instance: UserStorageClient | null = null;

  static getInstance(): UserStorageClient {
    if (!UserStorageClientSingleton.instance) {
      UserStorageClientSingleton.instance = new UserStorageClient();
    }
    return UserStorageClientSingleton.instance;
  }

  // For testing purposes - allows resetting the singleton
  static resetInstance(): void {
    UserStorageClientSingleton.instance = null;
  }
}

export { UserStorageClientSingleton };
