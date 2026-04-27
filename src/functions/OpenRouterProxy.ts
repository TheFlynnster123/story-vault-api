import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getAuthenticatedUserId } from "../utils/getAuthenticatedUserId";
import { ResponseBuilder } from "../utils/responseBuilder";
import { getOpenRouterKeyRequest } from "../databaseRequests/getOpenRouterKeyRequest";
import { Config } from "../config";

const NON_STREAMING_TIMEOUT_MS = 30_000;
const STREAMING_TIMEOUT_MS = 120_000;

// Headers that must not be forwarded to or from the upstream
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",

  // Node.js fetch transparently decompresses the body, so these would mislead
  // the client into trying to decompress already-plain bytes.
  "content-encoding",
  "content-length",
]);

// Safe client-supplied headers to forward upstream
const SAFE_CLIENT_HEADERS = new Set([
  "content-type",
  "accept",
  "accept-language",
]);

/**
 * Validates and sanitises the wildcard route segment captured from the request.
 * Returns the cleaned route string, or null if the input is rejected.
 */
function sanitizeRoute(raw: string): string | null {
  // Strip leading slashes so the upstream URL is built cleanly
  const route = raw.replace(/^\/+/, "");

  // Reject path traversal in both decoded and percent-encoded forms
  if (/(?:^|\/)\.\.(?:\/|$)/.test(route) || /%2e%2e/i.test(route)) {
    return null;
  }

  // Reject null bytes and control characters
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(route)) {
    return null;
  }

  return route;
}

function getOpenRouterApiBaseUrl(): string | null {
  const configuredBaseUrl = Config.OPENROUTER_BASE_URL;
  if (!configuredBaseUrl) {
    return null;
  }

  try {
    const parsed = new URL(configuredBaseUrl);

    // Enforce fixed-host policy: must be HTTPS and must target openrouter.ai.
    // This prevents SSRF if the config is ever misconfigured.
    if (parsed.protocol !== "https:" || parsed.hostname !== "openrouter.ai") {
      return null;
    }

    const normalizedPath = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.origin}${normalizedPath}`;
  } catch {
    return null;
  }
}

export async function OpenRouterProxy(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();

  try {
    // --- Authentication ---
    // getAuthenticatedUserId throws on any auth failure; catch those specifically
    // so they return 401 rather than falling through to the generic 500 handler.
    let userId: string;
    try {
      userId = await getAuthenticatedUserId(request);
    } catch {
      return ResponseBuilder.unauthorized();
    }
    if (!userId) {
      return ResponseBuilder.unauthorized();
    }

    // --- Key resolution ---
    const encryptionKey = request.headers.get("EncryptionKey");
    const openRouterKey = await getOpenRouterKeyRequest(userId, encryptionKey);
    if (!openRouterKey) {
      return ResponseBuilder.unauthorized("No valid OpenRouter API key found.");
    }

    const openRouterApiBaseUrl = getOpenRouterApiBaseUrl();
    if (!openRouterApiBaseUrl) {
      context.error(
        "OpenRouterProxy: OPENROUTER_BASE_URL is missing or invalid."
      );
      return ResponseBuilder.error(
        "OpenRouter base URL is not configured.",
        500
      );
    }

    // --- Route validation ---
    const rawRoute: string = request.params["route"] ?? "";
    const sanitizedRoute = sanitizeRoute(rawRoute);
    if (sanitizedRoute === null) {
      return ResponseBuilder.badRequest("Invalid route path.");
    }

    // --- Build upstream URL from server config (never from client input) ---
    const upstreamUrl = new URL(
      sanitizedRoute
        ? `${openRouterApiBaseUrl}/${sanitizedRoute}`
        : openRouterApiBaseUrl
    );

    // Preserve original query string
    new URL(request.url).searchParams.forEach((value, key) => {
      upstreamUrl.searchParams.set(key, value);
    });

    // --- Build upstream request headers ---
    const upstreamHeaders: Record<string, string> = {
      Authorization: `Bearer ${openRouterKey.trim()}`,
    };

    // Forward safe client-supplied headers
    for (const header of SAFE_CLIENT_HEADERS) {
      const value = request.headers.get(header);
      if (value) {
        upstreamHeaders[header] = value;
      }
    }

    // --- Timeout (longer for streaming) ---
    const isStreamingRequest =
      request.headers.get("accept")?.includes("text/event-stream") ?? false;
    const timeoutMs = isStreamingRequest
      ? STREAMING_TIMEOUT_MS
      : NON_STREAMING_TIMEOUT_MS;

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

    context.log(
      `OpenRouterProxy: userId=${userId} method=${request.method} route=${sanitizedRoute || "/"} upstream=${upstreamUrl.toString()}`
    );

    let upstreamResponse: Response;
    try {
      upstreamResponse = await fetch(upstreamUrl.toString(), {
        method: request.method,
        headers: upstreamHeaders,
        // Only attach a body for methods that carry one
        body:
          request.method !== "GET" && request.method !== "HEAD"
            ? (request.body as BodyInit)
            : null,
        signal: abortController.signal,
        // Required for streaming request bodies in Node 18 fetch
        ...({ duplex: "half" } as object),
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const latencyMs = Date.now() - startTime;
    const generationId = upstreamResponse.headers.get("x-generation-id");

    context.log(
      `OpenRouterProxy: userId=${userId} method=${request.method} route=${sanitizedRoute || "/"} status=${upstreamResponse.status} latency=${latencyMs}ms generationId=${generationId ?? "none"}`
    );

    if (upstreamResponse.status >= 400) {
      context.warn(
        `OpenRouterProxy: upstream error userId=${userId} route=${sanitizedRoute || "/"} status=${upstreamResponse.status}`
      );
    }

    // --- Build response headers (strip hop-by-hop headers from upstream) ---
    const responseHeaders: Record<string, string> = {};
    upstreamResponse.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    // Add internal trace id for debugging
    responseHeaders["X-Trace-Id"] = context.invocationId;

    // Pipe the upstream response stream directly to avoid buffering.
    // This preserves SSE semantics as well as regular JSON responses.
    return {
      status: upstreamResponse.status,
      headers: responseHeaders,
      body: upstreamResponse.body as any,
    };
  } catch (error: unknown) {
    const latencyMs = Date.now() - startTime;

    if (error instanceof Error && error.name === "AbortError") {
      context.error(
        `OpenRouterProxy: upstream request timed out after ${latencyMs}ms`
      );
      return ResponseBuilder.error("Upstream request timed out.", 504);
    }

    context.error("OpenRouterProxy: unexpected error", error);
    return ResponseBuilder.error("An unexpected error occurred.");
  }
}

app.http("OpenRouterProxy", {
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  authLevel: "anonymous",
  route: "openrouter/{*route}",
  handler: OpenRouterProxy,
});
