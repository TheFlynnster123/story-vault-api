import { HttpRequest } from "@azure/functions";
import { getAuthenticatedUserId } from "../../src/utils/getAuthenticatedUserId";
import * as jwt from "jsonwebtoken";
import { Config } from "../../src/config";

// Mock dependencies
jest.mock("jsonwebtoken");
jest.mock("jwks-rsa");
jest.mock("../../src/config");

const mockJwt = jwt as jest.Mocked<typeof jwt>;
const mockConfig = Config as jest.Mocked<typeof Config>;

// Mock jwks-rsa
const mockJwksRsa = require("jwks-rsa");
const mockClient = {
  getSigningKey: jest.fn(),
};

describe("getAuthenticatedUserId", () => {
  let mockRequest: Partial<HttpRequest>;

  beforeEach(() => {
    mockRequest = {
      headers: {
        get: jest.fn(),
      } as any,
    };

    // Setup default mocks
    mockConfig.AUTH0_DOMAIN = "test-domain.auth0.com";
    mockJwksRsa.mockReturnValue(mockClient);

    jest.clearAllMocks();
  });

  describe("successful authentication", () => {
    const validToken = "valid.jwt.token";
    const mockDecodedToken = {
      header: { kid: "test-kid" },
      payload: { sub: "auth0|user123" },
    };
    const mockVerifiedToken = { sub: "auth0|user123" };

    beforeEach(() => {
      (mockRequest.headers!.get as jest.Mock).mockReturnValue(
        `Bearer ${validToken}`
      );
      mockJwt.decode.mockReturnValue(mockDecodedToken as any);
      mockClient.getSigningKey.mockResolvedValue({
        getPublicKey: () => "mock-public-key",
      });
      mockJwt.verify.mockReturnValue(mockVerifiedToken as any);
    });

    it("should extract user ID from auth0 prefixed token", async () => {
      const result = await getAuthenticatedUserId(mockRequest as HttpRequest);

      expect(result).toBe("user123");
      expect(mockJwt.decode).toHaveBeenCalledWith(validToken, {
        complete: true,
      });
      expect(mockClient.getSigningKey).toHaveBeenCalledWith("test-kid");
      expect(mockJwt.verify).toHaveBeenCalledWith(
        validToken,
        "mock-public-key",
        {
          algorithms: ["RS256"],
          issuer: "https://test-domain.auth0.com/",
        }
      );
    });

    it("should return user ID without auth0 prefix when not present", async () => {
      const mockVerifiedTokenWithoutPrefix = { sub: "direct-user-id" };
      mockJwt.verify.mockReturnValue(mockVerifiedTokenWithoutPrefix as any);

      const result = await getAuthenticatedUserId(mockRequest as HttpRequest);

      expect(result).toBe("direct-user-id");
    });

    it("should handle different kid values", async () => {
      const mockDecodedWithDifferentKid = {
        header: { kid: "different-kid" },
        payload: { sub: "auth0|user456" },
      };
      const mockVerifiedTokenWithDifferentUser = { sub: "auth0|user456" };

      mockJwt.decode.mockReturnValue(mockDecodedWithDifferentKid as any);
      mockJwt.verify.mockReturnValue(mockVerifiedTokenWithDifferentUser as any);

      const result = await getAuthenticatedUserId(mockRequest as HttpRequest);

      expect(result).toBe("user456");
      expect(mockClient.getSigningKey).toHaveBeenCalledWith("different-kid");
    });
  });

  describe("authentication errors", () => {
    it("should throw error when authorization header is missing", async () => {
      (mockRequest.headers!.get as jest.Mock).mockReturnValue("");

      await expect(
        getAuthenticatedUserId(mockRequest as HttpRequest)
      ).rejects.toThrow("Missing or malformed Authorization header");
    });

    it("should throw error when authorization header doesn't start with Bearer", async () => {
      (mockRequest.headers!.get as jest.Mock).mockReturnValue("Basic token123");

      await expect(
        getAuthenticatedUserId(mockRequest as HttpRequest)
      ).rejects.toThrow("Missing or malformed Authorization header");
    });

    it("should throw error when token cannot be decoded", async () => {
      (mockRequest.headers!.get as jest.Mock).mockReturnValue(
        "Bearer invalid-token"
      );
      mockJwt.decode.mockReturnValue(null);

      await expect(
        getAuthenticatedUserId(mockRequest as HttpRequest)
      ).rejects.toThrow("Invalid token structure: missing header or kid");
    });

    it("should throw error when decoded token is a string", async () => {
      (mockRequest.headers!.get as jest.Mock).mockReturnValue(
        "Bearer invalid-token"
      );
      mockJwt.decode.mockReturnValue("string-token" as any);

      await expect(
        getAuthenticatedUserId(mockRequest as HttpRequest)
      ).rejects.toThrow("Invalid token structure: missing header or kid");
    });

    it("should throw error when token has no kid in header", async () => {
      (mockRequest.headers!.get as jest.Mock).mockReturnValue(
        "Bearer invalid-token"
      );
      mockJwt.decode.mockReturnValue({
        header: {},
        payload: { sub: "user123" },
      } as any);

      await expect(
        getAuthenticatedUserId(mockRequest as HttpRequest)
      ).rejects.toThrow("Invalid token structure: missing header or kid");
    });

    it("should throw error when jwks client fails to get signing key", async () => {
      (mockRequest.headers!.get as jest.Mock).mockReturnValue(
        "Bearer valid-token"
      );
      mockJwt.decode.mockReturnValue({
        header: { kid: "test-kid" },
        payload: { sub: "user123" },
      } as any);
      mockClient.getSigningKey.mockRejectedValue(new Error("JWKS error"));

      await expect(
        getAuthenticatedUserId(mockRequest as HttpRequest)
      ).rejects.toThrow("JWKS error");
    });

    it("should throw error when jwt verification fails", async () => {
      (mockRequest.headers!.get as jest.Mock).mockReturnValue(
        "Bearer invalid-token"
      );
      mockJwt.decode.mockReturnValue({
        header: { kid: "test-kid" },
        payload: { sub: "user123" },
      } as any);
      mockClient.getSigningKey.mockResolvedValue({
        getPublicKey: () => "mock-public-key",
      });
      mockJwt.verify.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      await expect(
        getAuthenticatedUserId(mockRequest as HttpRequest)
      ).rejects.toThrow("Invalid signature");
    });

    it("should throw error when verified token has no sub claim", async () => {
      (mockRequest.headers!.get as jest.Mock).mockReturnValue(
        "Bearer valid-token"
      );
      mockJwt.decode.mockReturnValue({
        header: { kid: "test-kid" },
        payload: {},
      } as any);
      mockClient.getSigningKey.mockResolvedValue({
        getPublicKey: () => "mock-public-key",
      });
      mockJwt.verify.mockReturnValue({} as any);

      await expect(
        getAuthenticatedUserId(mockRequest as HttpRequest)
      ).rejects.toThrow("Missing user ID token");
    });

    it("should throw error when sub claim is not a string", async () => {
      (mockRequest.headers!.get as jest.Mock).mockReturnValue(
        "Bearer valid-token"
      );
      mockJwt.decode.mockReturnValue({
        header: { kid: "test-kid" },
        payload: { sub: 123 },
      } as any);
      mockClient.getSigningKey.mockResolvedValue({
        getPublicKey: () => "mock-public-key",
      });
      mockJwt.verify.mockReturnValue({ sub: 123 } as any);

      await expect(
        getAuthenticatedUserId(mockRequest as HttpRequest)
      ).rejects.toThrow("Missing user ID token");
    });
  });

  describe("edge cases", () => {
    it("should handle standard Bearer token format", async () => {
      const validToken = "valid.jwt.token";
      (mockRequest.headers!.get as jest.Mock).mockReturnValue(
        `Bearer ${validToken}`
      );
      mockJwt.decode.mockReturnValue({
        header: { kid: "test-kid" },
        payload: { sub: "auth0|user123" },
      } as any);
      mockClient.getSigningKey.mockResolvedValue({
        getPublicKey: () => "mock-public-key",
      });
      mockJwt.verify.mockReturnValue({ sub: "auth0|user123" } as any);

      const result = await getAuthenticatedUserId(mockRequest as HttpRequest);

      expect(result).toBe("user123");
      expect(mockJwt.decode).toHaveBeenCalledWith(validToken, {
        complete: true,
      });
    });

    it("should handle auth0 prefix with multiple pipes", async () => {
      (mockRequest.headers!.get as jest.Mock).mockReturnValue(
        "Bearer valid-token"
      );
      mockJwt.decode.mockReturnValue({
        header: { kid: "test-kid" },
        payload: { sub: "auth0|complex|user|id" },
      } as any);
      mockClient.getSigningKey.mockResolvedValue({
        getPublicKey: () => "mock-public-key",
      });
      mockJwt.verify.mockReturnValue({ sub: "auth0|complex|user|id" } as any);

      const result = await getAuthenticatedUserId(mockRequest as HttpRequest);

      expect(result).toBe("complex|user|id");
    });
  });
});
