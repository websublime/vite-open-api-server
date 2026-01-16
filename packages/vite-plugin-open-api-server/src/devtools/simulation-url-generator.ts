/**
 * Simulation URL Generator
 *
 * ## What
 * Generates URLs with simulation query parameters for testing different
 * response scenarios from the OpenAPI mock server.
 *
 * ## How
 * Takes simulation parameters and converts them into URL query strings.
 * Supports status codes, delays, error types, edge cases, and network conditions.
 *
 * ## Why
 * Enables developers to easily generate test URLs that trigger specific
 * mock server behaviors for testing error handling, loading states, and edge cases.
 *
 * @module
 */

import type {
  SimulationEdgeCase,
  SimulationErrorType,
  SimulationParams,
  SimulationUrl,
  UrlGeneratorOptions,
} from './simulation-types.js';

// ============================================================================
// Query Parameter Names
// ============================================================================

/**
 * Query parameter names for simulation
 * These are the actual parameter names the mock server expects
 */
export const SIMULATION_QUERY_PARAMS = {
  /** HTTP status code to return */
  STATUS: 'simulateStatus',

  /** Response delay in milliseconds */
  DELAY: 'simulateDelay',

  /** Timeout simulation (never responds) */
  TIMEOUT: 'simulateTimeout',

  /** Connection behavior (drop, reset, partial) */
  CONNECTION: 'simulateConnection',

  /** Error type simulation */
  ERROR: 'simulateError',

  /** Edge case simulation */
  EDGE_CASE: 'simulateEdgeCase',

  // Legacy parameters from Phase 3 (for backwards compatibility)
  /** Legacy delay parameter */
  LEGACY_DELAY: 'delay',

  /** Legacy error parameter */
  LEGACY_ERROR: 'simulateError',
} as const;

// ============================================================================
// URL Generation Functions
// ============================================================================

/**
 * Generates a simulation URL with the specified parameters.
 *
 * @param options - URL generation options
 * @returns Generated simulation URL with metadata
 *
 * @example
 * ```ts
 * const result = generateSimulationUrl({
 *   baseUrl: 'http://localhost:5173',
 *   proxyPath: '/api/v3',
 *   endpointPath: '/pet/1',
 *   params: {
 *     statusCode: 404,
 *     delay: 1000,
 *   },
 * });
 *
 * console.log(result.url);
 * // http://localhost:5173/api/v3/pet/1?simulateStatus=404&simulateDelay=1000
 * ```
 */
export function generateSimulationUrl(options: UrlGeneratorOptions): SimulationUrl {
  const { baseUrl, proxyPath, endpointPath, params } = options;

  // Build the base URL path
  const normalizedProxyPath = proxyPath.startsWith('/') ? proxyPath : `/${proxyPath}`;
  const normalizedEndpointPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;

  // Avoid double slashes
  const fullPath =
    normalizedProxyPath.endsWith('/') && normalizedEndpointPath.startsWith('/')
      ? `${normalizedProxyPath}${normalizedEndpointPath.slice(1)}`
      : `${normalizedProxyPath}${normalizedEndpointPath}`;

  const baseUrlWithPath = `${baseUrl.replace(/\/$/, '')}${fullPath}`;

  // Build query parameters
  const queryParams = buildQueryParams(params);

  // Build the full URL
  const queryString = buildQueryString(queryParams);
  const url = queryString ? `${baseUrlWithPath}?${queryString}` : baseUrlWithPath;

  // Generate description
  const description = generateDescription(params);

  return {
    url,
    baseUrl: baseUrlWithPath,
    queryParams,
    description,
  };
}

/**
 * Builds query parameters from simulation params.
 *
 * @param params - Simulation parameters
 * @returns Record of query parameter names to values
 */
export function buildQueryParams(params: Partial<SimulationParams>): Record<string, string> {
  const queryParams: Record<string, string> = {};

  // Status code simulation
  if (params.statusCode != null && params.statusCode > 0) {
    queryParams[SIMULATION_QUERY_PARAMS.STATUS] = String(params.statusCode);
  }

  // Delay simulation
  if (params.delay != null && params.delay > 0) {
    queryParams[SIMULATION_QUERY_PARAMS.DELAY] = String(params.delay);
  }

  // Timeout simulation
  if (params.errorType === 'timeout') {
    queryParams[SIMULATION_QUERY_PARAMS.TIMEOUT] = 'true';
    if (params.timeoutMs != null && params.timeoutMs > 0) {
      queryParams[SIMULATION_QUERY_PARAMS.DELAY] = String(params.timeoutMs);
    }
  }

  // Connection simulation
  if (params.connectionType != null && params.connectionType !== 'normal') {
    queryParams[SIMULATION_QUERY_PARAMS.CONNECTION] = params.connectionType;
  }

  // Error type simulation (for non-timeout errors)
  if (params.errorType != null && params.errorType !== 'none' && params.errorType !== 'timeout') {
    queryParams[SIMULATION_QUERY_PARAMS.ERROR] = params.errorType;
  }

  // Edge case simulation
  if (params.edgeCase != null && params.edgeCase !== 'normal') {
    queryParams[SIMULATION_QUERY_PARAMS.EDGE_CASE] = params.edgeCase;
  }

  return queryParams;
}

/**
 * Builds a query string from query parameters.
 *
 * @param params - Query parameters
 * @returns URL-encoded query string (without leading '?')
 */
export function buildQueryString(params: Record<string, string>): string {
  const entries = Object.entries(params);

  if (entries.length === 0) {
    return '';
  }

  return entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

/**
 * Parses simulation parameters from a URL.
 *
 * @param url - URL to parse
 * @returns Parsed simulation parameters
 */
export function parseSimulationParams(url: string): Partial<SimulationParams> {
  const params: Partial<SimulationParams> = {};

  try {
    const urlObj = new URL(url);
    const searchParams = urlObj.searchParams;

    // Parse status code
    const status = searchParams.get(SIMULATION_QUERY_PARAMS.STATUS);
    if (status) {
      const statusNum = Number.parseInt(status, 10);
      if (!Number.isNaN(statusNum)) {
        params.statusCode = statusNum;
      }
    }

    // Parse delay (check both new and legacy params)
    const delay =
      searchParams.get(SIMULATION_QUERY_PARAMS.DELAY) ||
      searchParams.get(SIMULATION_QUERY_PARAMS.LEGACY_DELAY);
    if (delay) {
      const delayNum = Number.parseInt(delay, 10);
      if (!Number.isNaN(delayNum)) {
        params.delay = delayNum;
      }
    }

    // Parse timeout
    const timeout = searchParams.get(SIMULATION_QUERY_PARAMS.TIMEOUT);
    if (timeout === 'true') {
      params.errorType = 'timeout';
    }

    // Parse connection type
    const connection = searchParams.get(SIMULATION_QUERY_PARAMS.CONNECTION);
    if (connection) {
      params.connectionType = connection as SimulationParams['connectionType'];
    }

    // Parse error type
    const error = searchParams.get(SIMULATION_QUERY_PARAMS.ERROR);
    if (error && !params.errorType) {
      params.errorType = error as SimulationErrorType;
    }

    // Parse edge case
    const edgeCase = searchParams.get(SIMULATION_QUERY_PARAMS.EDGE_CASE);
    if (edgeCase) {
      params.edgeCase = edgeCase as SimulationEdgeCase;
    }
  } catch {
    // Invalid URL, return empty params
  }

  return params;
}

/**
 * Generates a human-readable description of what the simulation URL will do.
 *
 * @param params - Simulation parameters
 * @returns Description string
 */
export function generateDescription(params: Partial<SimulationParams>): string {
  const parts: string[] = [];

  // Status code
  if (params.statusCode != null && params.statusCode > 0) {
    parts.push(`Returns HTTP ${params.statusCode}`);
  }

  // Delay
  addDelayDescription(parts, params.delay);

  // Timeout
  if (params.errorType === 'timeout') {
    parts.push('Simulates timeout (never responds)');
  }

  // Connection issues
  addConnectionDescription(parts, params.connectionType);

  // Error types
  addErrorDescription(parts, params.errorType, params.statusCode);

  // Edge cases
  addEdgeCaseDescription(parts, params.edgeCase);

  if (parts.length === 0) {
    return 'Normal response (no simulation)';
  }

  return parts.join(', ');
}

/**
 * Adds delay description to parts array.
 */
function addDelayDescription(parts: string[], delay: number | undefined): void {
  if (delay != null && delay > 0) {
    const seconds = delay / 1000;
    const delayText = seconds >= 1 ? `${seconds}s` : `${delay}ms`;
    parts.push(`with ${delayText} delay`);
  }
}

/**
 * Adds connection type description to parts array.
 */
function addConnectionDescription(parts: string[], connectionType: string | undefined): void {
  const descriptions: Record<string, string> = {
    drop: 'Drops connection mid-response',
    reset: 'Resets connection',
    partial: 'Sends partial response',
  };
  const desc = connectionType ? descriptions[connectionType] : undefined;
  if (desc) {
    parts.push(desc);
  }
}

/**
 * Adds error type description to parts array.
 */
function addErrorDescription(
  parts: string[],
  errorType: string | undefined,
  statusCode: number | null | undefined,
): void {
  if (errorType === 'network-error') {
    parts.push('Simulates network error');
  } else if (errorType === 'server-error' && statusCode !== 500) {
    parts.push('Simulates server error');
  } else if (errorType === 'rate-limit' && statusCode !== 429) {
    parts.push('Simulates rate limiting');
  } else if (errorType === 'service-unavailable' && statusCode !== 503) {
    parts.push('Simulates service unavailable');
  }
}

/**
 * Adds edge case description to parts array.
 */
function addEdgeCaseDescription(parts: string[], edgeCase: string | undefined): void {
  const descriptions: Record<string, string> = {
    'empty-response': 'Returns empty body',
    'empty-array': 'Returns empty array',
    'null-values': 'Returns null values',
    'malformed-json': 'Returns malformed JSON',
    'large-response': 'Returns large response',
  };
  const desc = edgeCase ? descriptions[edgeCase] : undefined;
  if (desc) {
    parts.push(desc);
  }
}

// ============================================================================
// Preset URL Generation
// ============================================================================

/**
 * Common simulation URLs for quick access
 */
export interface QuickSimulationUrls {
  /** Normal request (no simulation) */
  normal: SimulationUrl;

  /** 404 Not Found */
  notFound: SimulationUrl;

  /** 500 Server Error */
  serverError: SimulationUrl;

  /** Slow response (2s delay) */
  slow: SimulationUrl;

  /** Timeout */
  timeout: SimulationUrl;

  /** Empty response */
  empty: SimulationUrl;
}

/**
 * Generates a set of common simulation URLs for an endpoint.
 *
 * @param baseUrl - Base URL for the API
 * @param proxyPath - Proxy path
 * @param endpointPath - Endpoint path
 * @returns Object with common simulation URLs
 */
export function generateQuickUrls(
  baseUrl: string,
  proxyPath: string,
  endpointPath: string,
): QuickSimulationUrls {
  const baseOptions = { baseUrl, proxyPath, endpointPath };

  return {
    normal: generateSimulationUrl({
      ...baseOptions,
      params: {},
    }),

    notFound: generateSimulationUrl({
      ...baseOptions,
      params: { statusCode: 404 },
    }),

    serverError: generateSimulationUrl({
      ...baseOptions,
      params: { statusCode: 500, errorType: 'server-error' },
    }),

    slow: generateSimulationUrl({
      ...baseOptions,
      params: { delay: 2000 },
    }),

    timeout: generateSimulationUrl({
      ...baseOptions,
      params: { errorType: 'timeout' },
    }),

    empty: generateSimulationUrl({
      ...baseOptions,
      params: { edgeCase: 'empty-response' },
    }),
  };
}

/**
 * Generates example URLs showing available status codes for an endpoint.
 *
 * @param baseUrl - Base URL for the API
 * @param proxyPath - Proxy path
 * @param endpointPath - Endpoint path
 * @param availableStatusCodes - Status codes available from OpenAPI spec
 * @returns Array of simulation URLs for each status code
 */
export function generateStatusCodeUrls(
  baseUrl: string,
  proxyPath: string,
  endpointPath: string,
  availableStatusCodes: number[],
): SimulationUrl[] {
  return availableStatusCodes.map((statusCode) =>
    generateSimulationUrl({
      baseUrl,
      proxyPath,
      endpointPath,
      params: { statusCode },
    }),
  );
}

// ============================================================================
// Clipboard Support
// ============================================================================

// Browser global types for clipboard support
// These are declared inline to avoid requiring DOM lib in tsconfig
declare const navigator:
  | {
      clipboard?: {
        writeText(text: string): Promise<void>;
      };
    }
  | undefined;

declare const document:
  | {
      createElement(tagName: string): {
        value: string;
        style: {
          position: string;
          left: string;
          top: string;
        };
        focus(): void;
        select(): void;
      };
      body: {
        appendChild(element: unknown): void;
        removeChild(element: unknown): void;
      };
      execCommand(command: string): boolean;
    }
  | undefined;

/**
 * Copies text to the clipboard.
 *
 * @param text - Text to copy
 * @returns Promise that resolves to true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try the modern Clipboard API first
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback for older browsers or non-secure contexts
  return copyToClipboardFallback(text);
}

/**
 * Fallback clipboard copy using textarea element.
 * Used when Clipboard API is not available.
 *
 * @param text - Text to copy
 * @returns true if successful, false otherwise
 */
function copyToClipboardFallback(text: string): boolean {
  if (!document) {
    return false;
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}
