/**
 * Fetch Interceptor for Request Timeline
 *
 * ## What
 * This module provides a fetch interceptor that monitors all requests made
 * to the OpenAPI mock server proxy path and logs them to the Vue DevTools
 * timeline.
 *
 * ## How
 * Wraps the global `window.fetch` function to intercept requests that match
 * the configured proxy path. For each matching request, it captures timing
 * information, request/response data, and logs it to the timeline.
 *
 * ## Why
 * Provides real-time visibility into API requests during development,
 * helping developers understand request patterns, debug timing issues,
 * and verify mock server behavior.
 *
 * @module
 */

import type { GlobalState } from './browser-client.js';
import { GLOBAL_STATE_KEY } from './devtools-plugin.js';
import { addTimelineRequestEvent, isTimelineReady } from './request-timeline.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for the fetch interceptor
 */
export interface FetchInterceptorConfig {
  /** The proxy path prefix to match (e.g., '/api') */
  proxyPath: string;
  /** Whether to log verbose debugging information */
  verbose?: boolean;
}

/**
 * State of the fetch interceptor
 */
interface InterceptorState {
  /** Whether the interceptor is currently active */
  isActive: boolean;
  /** The original fetch function before wrapping */
  originalFetch: typeof fetch | null;
  /** The configured proxy path */
  proxyPath: string;
  /** Verbose logging enabled */
  verbose: boolean;
}

// ============================================================================
// State
// ============================================================================

/** Current interceptor state */
const state: InterceptorState = {
  isActive: false,
  originalFetch: null,
  proxyPath: '/api',
  verbose: false,
};

/**
 * Gets the global state object if available.
 *
 * @returns The global state or null if not initialized
 */
function getGlobalStateIfAvailable(): GlobalState | null {
  if (typeof window === 'undefined') {
    return null;
  }
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic window property access
  return (window as any)[GLOBAL_STATE_KEY] ?? null;
}

/**
 * Logs a request to the GlobalState requestLog.
 *
 * @param entry - The request log entry (without id)
 */
function logToGlobalState(entry: {
  method: string;
  path: string;
  operationId: string | null;
  status: number;
  duration: number;
  timestamp: Date;
  usedHandler: boolean;
  usedSeed: boolean;
  error?: string;
}): void {
  const globalState = getGlobalStateIfAvailable();
  if (globalState) {
    globalState.logRequest(entry);
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Logs a message if verbose mode is enabled.
 *
 * @param message - The message to log
 * @param data - Optional data to log
 */
function log(message: string, data?: unknown): void {
  if (state.verbose) {
    // biome-ignore lint/suspicious/noConsole: Intentional debug logging
    console.log('[OpenAPI Fetch Interceptor]', message, data ?? '');
  }
}

/**
 * Extracts the path from a URL string or Request object.
 *
 * @param input - The fetch input (URL string, URL object, or Request)
 * @returns The pathname of the URL
 */
function getPathFromInput(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    try {
      // Handle absolute URLs
      if (input.startsWith('http://') || input.startsWith('https://')) {
        return new URL(input).pathname;
      }
      // Handle relative URLs - extract path before query string
      return input.split('?')[0];
    } catch {
      return input;
    }
  }

  if (input instanceof URL) {
    return input.pathname;
  }

  if (input instanceof Request) {
    try {
      return new URL(input.url).pathname;
    } catch {
      // Malformed Request URL, return empty string
      return '';
    }
  }

  return '';
}

/**
 * Extracts the full URL from a fetch input.
 *
 * @param input - The fetch input
 * @returns The full URL string
 */
function getUrlFromInput(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    // Handle relative URLs
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      return `${window.location.origin}${input.startsWith('/') ? '' : '/'}${input}`;
    }
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  if (input instanceof Request) {
    return input.url;
  }

  return '';
}

/**
 * Extracts the HTTP method from fetch arguments.
 *
 * @param input - The fetch input
 * @param init - The fetch init options
 * @returns The HTTP method (uppercase)
 */
function getMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) {
    return init.method.toUpperCase();
  }

  if (input instanceof Request) {
    return input.method.toUpperCase();
  }

  return 'GET';
}

/**
 * Extracts headers as a plain object.
 *
 * @param headers - Headers object or record
 * @returns Plain object with header key-value pairs
 */
function headersToRecord(headers: Headers | HeadersInit | undefined): Record<string, string> {
  const result: Record<string, string> = {};

  if (!headers) {
    return result;
  }

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      result[key] = value;
    }
    return result;
  }

  // Plain object
  return { ...headers } as Record<string, string>;
}

/**
 * Attempts to parse response body as JSON.
 *
 * @param response - The cloned response object
 * @returns The parsed JSON or undefined if not JSON
 */
async function tryParseResponseJson(response: Response): Promise<unknown | undefined> {
  const contentType = response.headers.get('content-type');

  if (!contentType?.includes('application/json')) {
    return undefined;
  }

  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/**
 * Extracts operation information from response headers.
 *
 * The mock server includes custom headers with operation metadata:
 * - x-operation-id: The OpenAPI operation ID
 * - x-handler-used: Whether a custom handler was used
 * - x-seed-used: Whether custom seed data was used
 *
 * @param headers - Response headers
 * @returns Operation metadata
 */
function extractOperationInfo(headers: Headers): {
  operationId: string | null;
  usedHandler: boolean;
  usedSeed: boolean;
} {
  return {
    operationId: headers.get('x-operation-id'),
    usedHandler: headers.get('x-handler-used') === 'true',
    usedSeed: headers.get('x-seed-used') === 'true',
  };
}

// ============================================================================
// Interceptor Implementation
// ============================================================================

/**
 * Creates the intercepted fetch function.
 *
 * @returns A fetch function that logs matching requests to the timeline
 */
function createInterceptedFetch(): typeof fetch {
  const originalFetch = state.originalFetch!;

  return async function interceptedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const path = getPathFromInput(input);

    // Check if this request matches our proxy path
    if (!path.startsWith(state.proxyPath)) {
      // Not a mock server request, pass through
      return originalFetch(input, init);
    }

    // This is a request to our mock server - intercept it
    const startTime = performance.now();
    const timestamp = Date.now();
    const method = getMethod(input, init);
    const url = getUrlFromInput(input);

    log(`Intercepting ${method} ${path}`);

    // Extract request body if present
    // NOTE: Only JSON string bodies are parsed. Other BodyInit types (FormData, Blob,
    // ArrayBuffer, ReadableStream, URLSearchParams, etc.) are intentionally left unparsed
    // and requestBody will remain undefined. Support for non-string bodies can be added
    // later if needed.
    let requestBody: unknown;
    if (init?.body) {
      try {
        if (typeof init.body === 'string') {
          requestBody = JSON.parse(init.body);
        }
        // Non-string body types are not parsed - requestBody stays undefined
      } catch {
        // Not valid JSON, leave as undefined
      }
    }

    // Extract request headers
    // Fallback to Request object's headers if init.headers is not provided
    const requestHeaders = headersToRecord(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );

    try {
      // Make the actual request
      const response = await originalFetch(input, init);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Clone response so we can read the body without consuming it
      const responseClone = response.clone();

      // Extract response data
      const responseHeaders = headersToRecord(response.headers);
      const responseBody = await tryParseResponseJson(responseClone);
      const operationInfo = extractOperationInfo(response.headers);

      // Log to timeline if ready
      if (isTimelineReady()) {
        addTimelineRequestEvent({
          method,
          path,
          url,
          status: response.status,
          duration,
          startTime: timestamp,
          endTime: timestamp + duration,
          operationId: operationInfo.operationId,
          usedHandler: operationInfo.usedHandler,
          usedSeed: operationInfo.usedSeed,
          requestHeaders: Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
          requestBody,
          responseHeaders: Object.keys(responseHeaders).length > 0 ? responseHeaders : undefined,
          responseBody,
        });

        log(`Logged ${method} ${path} - ${response.status} (${duration.toFixed(0)}ms)`);
      }

      // Also log to GlobalState.requestLog to keep them synchronized
      logToGlobalState({
        method,
        path,
        operationId: operationInfo.operationId,
        status: response.status,
        duration,
        timestamp: new Date(timestamp),
        usedHandler: operationInfo.usedHandler,
        usedSeed: operationInfo.usedSeed,
      });

      return response;
    } catch (error) {
      // Request failed (network error, etc.)
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Log error to timeline if ready
      if (isTimelineReady()) {
        addTimelineRequestEvent({
          method,
          path,
          url,
          status: 0,
          duration,
          startTime: timestamp,
          endTime: timestamp + duration,
          operationId: null,
          usedHandler: false,
          usedSeed: false,
          requestHeaders: Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
          requestBody,
          error: error instanceof Error ? error.message : String(error),
        });

        log(`Logged error for ${method} ${path}: ${error}`);
      }

      // Also log error to GlobalState.requestLog
      logToGlobalState({
        method,
        path,
        operationId: null,
        status: 0,
        duration,
        timestamp: new Date(timestamp),
        usedHandler: false,
        usedSeed: false,
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-throw the error
      throw error;
    }
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Installs the fetch interceptor.
 *
 * This wraps the global `window.fetch` function to intercept requests
 * that match the configured proxy path. All matching requests are logged
 * to the Vue DevTools timeline.
 *
 * @param config - Interceptor configuration
 *
 * @example
 * ```ts
 * // Install the interceptor
 * installFetchInterceptor({ proxyPath: '/api/v3', verbose: true });
 *
 * // Later, make requests as normal
 * const response = await fetch('/api/v3/pets');
 * // This request is automatically logged to the timeline
 * ```
 */
export function installFetchInterceptor(config: FetchInterceptorConfig): void {
  if (typeof window === 'undefined') {
    // SSR environment, skip
    return;
  }

  if (state.isActive) {
    log('Interceptor already installed, skipping');
    return;
  }

  // Validate proxyPath to prevent accidental global interception
  // An empty string would match all paths via path.startsWith('')
  if (!config.proxyPath || typeof config.proxyPath !== 'string') {
    // biome-ignore lint/suspicious/noConsole: Error logging required
    console.error(
      '[OpenAPI Fetch Interceptor] Invalid proxyPath: must be a non-empty string. Interceptor not installed.',
    );
    return;
  }

  // Trim and re-validate to catch whitespace-only strings
  // A whitespace-only string would trim to '' then become '/' which matches most requests
  const trimmedProxyPath = config.proxyPath.trim();
  if (!trimmedProxyPath) {
    // biome-ignore lint/suspicious/noConsole: Error logging required
    console.error(
      '[OpenAPI Fetch Interceptor] Invalid proxyPath: cannot be empty or whitespace-only. Interceptor not installed.',
    );
    return;
  }

  // Normalize proxyPath to ensure it starts with a leading slash
  let normalizedProxyPath = trimmedProxyPath;
  if (!normalizedProxyPath.startsWith('/')) {
    normalizedProxyPath = `/${normalizedProxyPath}`;
  }

  // Store the original fetch
  state.originalFetch = window.fetch;
  state.proxyPath = normalizedProxyPath;
  state.verbose = config.verbose ?? false;

  // Replace global fetch with our intercepted version
  window.fetch = createInterceptedFetch();
  state.isActive = true;

  log(`Installed fetch interceptor for proxyPath: ${state.proxyPath}`);
}

/**
 * Uninstalls the fetch interceptor.
 *
 * Restores the original `window.fetch` function. Any requests made after
 * this will no longer be logged to the timeline.
 *
 * @example
 * ```ts
 * // Remove the interceptor
 * uninstallFetchInterceptor();
 * ```
 */
export function uninstallFetchInterceptor(): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!state.isActive || !state.originalFetch) {
    log('Interceptor not installed, nothing to uninstall');
    return;
  }

  // Restore original fetch
  window.fetch = state.originalFetch;
  state.originalFetch = null;
  state.isActive = false;

  log('Uninstalled fetch interceptor');
}

/**
 * Checks if the fetch interceptor is currently installed.
 *
 * @returns true if the interceptor is active
 */
export function isFetchInterceptorActive(): boolean {
  return state.isActive;
}

/**
 * Gets the current proxy path being intercepted.
 *
 * @returns The proxy path or null if not installed
 */
export function getInterceptorProxyPath(): string | null {
  return state.isActive ? state.proxyPath : null;
}
