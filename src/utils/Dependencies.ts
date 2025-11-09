import { UserStorageClient } from "./UserStorageClient";

export class Dependencies {
  public UserStorageClient = (): UserStorageClient => new UserStorageClient();
}

export const d = new Dependencies();
