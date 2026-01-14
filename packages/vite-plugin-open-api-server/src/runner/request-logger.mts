/**
 * Request Logger Middleware
 *
 * ## What
 * This module provides a Hono middleware that logs all incoming requests
 * with timing information, operationId resolution, and emoji indicators.
 * Logs are sent to the parent process via IPC for display in Vite's console.
 *
 * ## How
 * 1. Captures request start time with performance.now()
 * 2. Awaits next() to process the request
 * 3. Resolves operationId by pattern matching the request path against registry
 * 4. Formats log message with emoji (✔ for success, ✖ for error)
 * 5. Sends log via IPC to parent process
 * 6. In verbose mode, includes additional request/response details
 *
 * ## Why
 * Request logging is essential for debugging API behavior during development.
 * By sending logs via IPC, we maintain separation between the mock server
 * process and Vite's logging system, allowing consistent log formatting.
 *
 * @module runner/request-logger
 */

import type { Context, MiddlewareHandler, Next } from 'hono';
import type { LogMessage } from '../types/ipc-messages.js';
import type { OpenApiEndpointRegistry } from '../types/registry.js';

/**
 * Configuration options for the request logger middleware.
 */
export interface RequestLoggerOptions {
  /**
   * The endpoint registry for operationId resolution.
   */
  registry: OpenApiEndpointRegistry;

  /**
   * Enable verbose logging with additional request/response details.
   */
  verbose?: boolean;
}

/**
 * Cached regex patterns for path matching.
 * Maps endpoint keys (e.g., "GET /pets/{petId}") to their compiled regex.
 */
const pathPatternCache = new Map<string, RegExp>();

/**
 * Converts an OpenAPI path template to a regex pattern.
 *
 * @param pathTemplate - OpenAPI path with parameters (e.g., "/pets/{petId}")
 * @returns Compiled regex that matches the path
 *
 * @example
 * pathToRegex("/pets/{petId}") → /^\/pets\/([^\/]+)$/
 * pathToRegex("/users/{userId}/orders/{orderId}") → /^\/users\/([^\/]+)\/orders\/([^\/]+)$/
 */
function pathToRegex(pathTemplate: string): RegExp {
  // First, replace {param} with a placeholder that won't be affected by escaping
  const PARAM_PLACEHOLDER = '\x00PARAM\x00';
  const withPlaceholders = pathTemplate.replace(/\{[^}]+\}/g, PARAM_PLACEHOLDER);

  // Escape special regex characters
  const escaped = withPlaceholders.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

  // Replace placeholders with capture groups that match any non-slash characters
  const pattern = escaped.replace(new RegExp(PARAM_PLACEHOLDER, 'g'), '([^/]+)');

  return new RegExp(`^${pattern}$`);
}

/**
 * Resolves the operationId for a given request by matching against the registry.
 *
 * Uses pattern matching to handle parameterized paths (e.g., /pets/{petId}).
 * Results are cached for performance.
 *
 * @param method - HTTP method (uppercase)
 * @param path - Request path (without query string)
 * @param registry - Endpoint registry to search
 * @returns The operationId or "unknown" if not found
 */
export function resolveOperationId(
  method: string,
  path: string,
  registry: OpenApiEndpointRegistry,
): string {
  const normalizedMethod = method.toUpperCase();

  // Try exact match first (most common case)
  const exactKey = `${normalizedMethod} ${path}`;
  const exactMatch = registry.endpoints.get(exactKey);

  if (exactMatch) {
    return exactMatch.operationId;
  }

  // Pattern match for parameterized paths
  for (const [key, endpoint] of registry.endpoints) {
    // Skip if method doesn't match
    if (!key.startsWith(`${normalizedMethod} `)) {
      continue;
    }

    const pathTemplate = key.slice(normalizedMethod.length + 1);

    // Get or create cached regex
    let regex = pathPatternCache.get(key);

    if (!regex) {
      regex = pathToRegex(pathTemplate);
      pathPatternCache.set(key, regex);
    }

    if (regex.test(path)) {
      return endpoint.operationId;
    }
  }

  return 'unknown';
}

/**
 * Determines the log level based on HTTP status code.
 *
 * @param status - HTTP status code
 * @returns Log level: 'info' for 2xx/3xx, 'warn' for 4xx, 'error' for 5xx
 */
function getLogLevel(status: number): 'info' | 'warn' | 'error' {
  if (status >= 500) {
    return 'error';
  }

  if (status >= 400) {
    return 'warn';
  }

  return 'info';
}

/**
 * Gets the emoji indicator based on HTTP status code.
 *
 * @param status - HTTP status code
 * @returns ✔ for success (2xx), ✖ for client/server errors (4xx/5xx)
 */
function getStatusEmoji(status: number): string {
  if (status >= 200 && status < 400) {
    return '✔';
  }

  return '✖';
}

/**
 * Truncates a string to a maximum length, adding ellipsis if truncated.
 *
 * @param str - String to truncate
 * @param maxLength - Maximum length (default: 200)
 * @returns Truncated string with ellipsis if needed
 */
function truncate(str: string, maxLength = 200): string {
  if (str.length <= maxLength) {
    return str;
  }

  return `${str.slice(0, maxLength)}...`;
}

/**
 * Formats headers object as a string for logging.
 *
 * @param headers - Headers object
 * @returns Formatted headers string
 */
function formatHeaders(headers: Headers): string {
  const headerEntries: string[] = [];

  headers.forEach((value, key) => {
    // Skip potentially sensitive headers in non-truncated form
    const displayValue = key.toLowerCase() === 'authorization' ? '[REDACTED]' : truncate(value, 50);
    headerEntries.push(`${key}: ${displayValue}`);
  });

  return headerEntries.join(', ');
}

/**
 * Sends a log message to the parent process via IPC.
 *
 * @param message - The log message to send
 */
function sendLogMessage(message: LogMessage): void {
  if (process.send) {
    process.send(message);
  }
}

/**
 * Formats verbose request details for logging.
 *
 * @param c - Hono context
 * @returns Formatted verbose details string
 */
async function formatVerboseRequestDetails(c: Context): Promise<string> {
  const details: string[] = [];

  // Query parameters
  const query = c.req.query();
  const queryKeys = Object.keys(query);

  if (queryKeys.length > 0) {
    const queryString = queryKeys.map((k) => `${k}=${query[k]}`).join('&');
    details.push(`  Query: ${truncate(queryString)}`);
  }

  // Request headers
  details.push(`  Request Headers: ${formatHeaders(c.req.raw.headers)}`);

  // Request body (for POST/PUT/PATCH)
  const method = c.req.method.toUpperCase();

  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      const body = await c.req.text();

      if (body) {
        details.push(`  Request Body: ${truncate(body)}`);
      }
    } catch {
      // Body already consumed or not available
    }
  }

  return details.join('\n');
}

/**
 * Formats verbose response details for logging.
 *
 * @param response - Response object
 * @returns Formatted verbose details string
 */
async function formatVerboseResponseDetails(response: Response): Promise<string> {
  const details: string[] = [];

  // Response headers
  details.push(`  Response Headers: ${formatHeaders(response.headers)}`);

  // Response body preview
  try {
    const clonedResponse = response.clone();
    const body = await clonedResponse.text();

    if (body) {
      details.push(`  Response Body: ${truncate(body)}`);
    }
  } catch {
    // Body not available
  }

  return details.join('\n');
}

/**
 * Creates a request logging middleware for the mock server.
 *
 * This middleware logs all incoming requests with:
 * - Emoji indicators (✔ for success, ✖ for error)
 * - HTTP method and path
 * - Resolved operationId from OpenAPI spec
 * - Response status code
 * - Request duration in milliseconds
 *
 * In verbose mode, additional details are logged:
 * - Query parameters
 * - Request headers
 * - Request body (truncated)
 * - Response headers
 * - Response body preview (truncated)
 *
 * @param options - Logger configuration options
 * @returns Hono middleware handler
 *
 * @example
 * ```typescript
 * const app = new Hono();
 *
 * app.use('*', createRequestLogger({
 *   registry,
 *   verbose: true,
 * }));
 * ```
 */
export function createRequestLogger(options: RequestLoggerOptions): MiddlewareHandler {
  const { registry, verbose = false } = options;

  return async (c: Context, next: Next): Promise<void> => {
    const start = performance.now();
    const method = c.req.method.toUpperCase();
    const path = c.req.path;

    // Capture verbose request details before next() consumes the body
    let verboseRequestDetails = '';

    if (verbose) {
      verboseRequestDetails = await formatVerboseRequestDetails(c);
    }

    // Process the request
    await next();

    // Calculate duration
    const duration = Math.round(performance.now() - start);
    const status = c.res.status;

    // Resolve operationId from registry
    const operationId = resolveOperationId(method, path, registry);

    // Get emoji and log level based on status
    const emoji = getStatusEmoji(status);
    const level = getLogLevel(status);

    // Format main log message
    let message = `${emoji} ${method} ${path} (${operationId}) ${status} ${duration}ms`;

    // Add verbose details if enabled
    if (verbose) {
      const verboseResponseDetails = await formatVerboseResponseDetails(c.res);
      message += `\n${verboseRequestDetails}\n${verboseResponseDetails}`;
    }

    // Send log message to parent process via IPC
    sendLogMessage({
      type: 'log',
      level,
      message,
      timestamp: Date.now(),
    });

    // Also log to console for standalone testing
    if (!process.send) {
      const prefix = level === 'error' ? '[mock-server] ERROR' : '[mock-server]';
      console.log(`${prefix} ${message}`);
    }
  };
}
