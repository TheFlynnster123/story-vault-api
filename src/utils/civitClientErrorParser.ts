/**
 * Error parser for Civitai client validation errors
 */
export class CivitClientErrorParser {
  private static readonly REDACTED = "[REDACTED]";
  private static readonly SENSITIVE_KEYS = new Set([
    "authorization",
    "proxy-authorization",
    "x-api-key",
    "api-key",
    "apikey",
    "auth",
    "password",
    "secret",
    "token",
  ]);

  /**
   * Determines whether a key name likely contains sensitive credential material.
   */
  private static isSensitiveKey(key: string): boolean {
    const normalizedKey = key.toLowerCase().replace(/[_\s-]/g, "");
    return (
      this.SENSITIVE_KEYS.has(key.toLowerCase()) ||
      normalizedKey.includes("authorization") ||
      normalizedKey.includes("apikey") ||
      normalizedKey.endsWith("token") ||
      normalizedKey.endsWith("secret")
    );
  }

  /**
   * Recursively sanitizes a value for safe logging/response output.
   * Redacts sensitive fields and avoids infinite recursion via `seen`.
   */
  private static sanitize(value: any, seen = new WeakSet<object>()): any {
    if (
      value === null ||
      value === undefined ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }

    if (typeof value === "bigint") {
      return value.toString();
    }

    if (typeof value !== "object") {
      return String(value);
    }

    if (seen.has(value)) {
      return "[Circular]";
    }
    seen.add(value);

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item, seen));
    }

    const result: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      const item = value[key];
      result[key] = this.isSensitiveKey(key)
        ? this.REDACTED
        : this.sanitize(item, seen);
    }
    return result;
  }

  /**
   * Parses a Civitai validation error message and extracts the structured error data
   * @param error - The error from Civitai API
   * @returns Parsed and sanitized error payload
   */
  static parse(error: any): Record<string, any> {
    const serializedError = this.sanitize(error);
    const parsedPayload: Record<string, any> = {
      civitaiApiError: serializedError,
    };
    if (typeof error?.message === "string") {
      parsedPayload.message = error.message;
    }

    const errorMessage = error?.message;
    if (
      typeof errorMessage === "string" &&
      errorMessage.startsWith("Validation error:")
    ) {
      try {
        const jsonPart = errorMessage
          .substring("Validation error: ".length)
          .trim();
        parsedPayload.errors = JSON.parse(jsonPart);
      } catch (parseError) {
        parsedPayload.validationParseError = this.sanitize(parseError);
      }
    }

    return parsedPayload;
  }
}
