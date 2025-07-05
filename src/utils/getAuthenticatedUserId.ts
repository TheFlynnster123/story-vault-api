import { HttpRequest } from "@azure/functions";
import * as jwt from "jsonwebtoken";
const jwksRsa = require("jwks-rsa");
import { Config } from "../config";

export const getAuthenticatedUserId = async (
  request: HttpRequest
): Promise<string> => {
  const authHeader = request.headers.get("authorization") || "";

  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or malformed Authorization header");
  }

  const token = authHeader.split(" ")[1];

  const decoded = jwt.decode(token, { complete: true }) as jwt.Jwt | null;

  if (!decoded || typeof decoded === "string" || !decoded.header?.kid) {
    throw new Error("Invalid token structure: missing header or kid");
  }

  const client = jwksRsa({
    jwksUri: `https://${Config.AUTH0_DOMAIN}/.well-known/jwks.json`,
  });

  const key = await client.getSigningKey(decoded.header.kid);
  const signingKey = key.getPublicKey();

  const verified = jwt.verify(token, signingKey, {
    algorithms: ["RS256"],
    issuer: `https://${Config.AUTH0_DOMAIN}/`,
  });

  const userId = verified.sub;

  if (!userId || typeof userId !== "string") {
    throw new Error("Missing user ID token");
  }

  if (userId.startsWith("auth0|")) {
    return userId.substring(6); // Remove "auth0|" prefix
  }

  return userId;
};
