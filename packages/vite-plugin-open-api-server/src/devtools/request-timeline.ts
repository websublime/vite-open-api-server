/**
 * Request Timeline for Vue DevTools
 *
 * ## What
 * This module provides a timeline layer for Vue DevTools that logs all API
 * requests made through the OpenAPI mock server in real-time.
 *
 * ## How
 * Uses the `@vue/devtools-api` to register a timeline layer that displays:
 * - Request method, path, and status code
 * - Response duration and timing
 * - Whether a custom handler was used
 * - Detailed request/response information on expand
 *
 * ## Why
 * Provides visibility into API request flow during development, helping
 * developers debug timing issues, understand request patterns, and verify
 * mock server behavior.
 *
 * @module
 */

// ============================================================================
// Types for DevTools API
// Using local interfaces to avoid import issues with @vue/devtools-api types
// ============================================================================

/**
 * Timeline event structure compatible with @vue/devtools-api
 * Note: data is required in the official types
 */
// biome-ignore lint/suspicious/noExplicitAny: Must match @vue/devtools-api types exactly
interface TimelineEvent<TData = any, TMeta = any> {
  time: number;
  title: string;
  subtitle?: string;
  data: TData;
  groupId?: string;
  meta?: TMeta;
}

/**
 * Options for adding a timeline layer
 */
interface TimelineLayerOptions {
  id: string;
  label: string;
  color: number;
}

/**
 * DevTools plugin API interface for timeline operations
 * This is a minimal interface matching the methods we use from @vue/devtools-api
 */
interface DevToolsPluginApiForTimeline {
  addTimelineLayer(options: TimelineLayerOptions): void;
  // biome-ignore lint/suspicious/noExplicitAny: Must match @vue/devtools-api types exactly
  addTimelineEvent(options: { layerId: string; event: TimelineEvent<any, any> }): void;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Timeline layer ID for request tracking
 */
export const TIMELINE_LAYER_ID = 'openapi-requests';

/**
 * Timeline layer display label
 */
export const TIMELINE_LAYER_LABEL = 'API Requests';

/**
 * Timeline layer color (blue - matches the brand)
 * Format: 0xRRGGBB
 */
export const TIMELINE_LAYER_COLOR = 0x3b82f6;

// ============================================================================
// Types
// ============================================================================

/**
 * Timeline event data structure for request logging
 */
export interface TimelineRequestEvent {
  /** HTTP method (GET, POST, PUT, PATCH, DELETE) */
  method: string;
  /** Request path */
  path: string;
  /** Full request URL */
  url: string;
  /** HTTP status code */
  status: number;
  /** Response time in milliseconds */
  duration: number;
  /** Timestamp when request started */
  startTime: number;
  /** Timestamp when response received */
  endTime: number;
  /** Operation ID from OpenAPI spec (if matched) */
  operationId: string | null;
  /** Whether a custom handler was used */
  usedHandler: boolean;
  /** Whether custom seed data was used */
  usedSeed: boolean;
  /** Request headers */
  requestHeaders?: Record<string, string>;
  /** Request body (if any) */
  requestBody?: unknown;
  /** Response headers */
  responseHeaders?: Record<string, string>;
  /** Response body (if JSON) */
  responseBody?: unknown;
  /** Error message if request failed */
  error?: string;
}

/**
 * Reference to the DevTools API for timeline operations
 */
export interface TimelineApiRef {
  // biome-ignore lint/suspicious/noExplicitAny: Must match @vue/devtools-api types exactly
  addTimelineEvent(options: { layerId: string; event: TimelineEvent<any, any> }): void;
}

/**
 * Type alias for the DevTools API parameter in registerTimelineLayer
 */
type DevToolsApiParam = DevToolsPluginApiForTimeline;

// ============================================================================
// Timeline State
// ============================================================================

/** Reference to the DevTools API for adding timeline events */
let timelineApi: TimelineApiRef | null = null;

/** Counter for generating unique event IDs */
let eventCounter = 0;

// ============================================================================
// Timeline Setup
// ============================================================================

/**
 * Registers the request timeline layer with Vue DevTools.
 *
 * This should be called during DevTools plugin setup to add the timeline
 * layer before any events are logged.
 *
 * @param api - The DevTools plugin API instance
 *
 * @example
 * ```ts
 * setupDevToolsPlugin({ ... }, (api) => {
 *   // Register the timeline layer
 *   registerTimelineLayer(api);
 *
 *   // Now you can add events
 *   addTimelineRequestEvent({ ... });
 * });
 * ```
 */
export function registerTimelineLayer(api: DevToolsApiParam): void {
  // Store API reference for later use
  timelineApi = api;

  // Register the timeline layer
  api.addTimelineLayer({
    id: TIMELINE_LAYER_ID,
    label: TIMELINE_LAYER_LABEL,
    color: TIMELINE_LAYER_COLOR,
  });
}

// ============================================================================
// Timeline Events
// ============================================================================

/**
 * Gets a color based on HTTP status code.
 *
 * @param status - HTTP status code
 * @returns Hex color value
 */
function getStatusColor(status: number): number {
  if (status >= 500) {
    return 0xef4444; // Red for server errors
  }
  if (status >= 400) {
    return 0xf97316; // Orange for client errors
  }
  if (status >= 300) {
    return 0xeab308; // Yellow for redirects
  }
  if (status >= 200) {
    return 0x22c55e; // Green for success
  }
  return 0x6b7280; // Gray for informational
}

/**
 * Gets a color based on HTTP method.
 *
 * @param method - HTTP method
 * @returns Hex color value
 */
function getMethodColor(method: string): number {
  const colors: Record<string, number> = {
    GET: 0x22c55e, // Green
    POST: 0x3b82f6, // Blue
    PUT: 0xf97316, // Orange
    PATCH: 0xa855f7, // Purple
    DELETE: 0xef4444, // Red
  };
  return colors[method.toUpperCase()] ?? 0x6b7280;
}

/**
 * Formats a duration in milliseconds to a human-readable string.
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "45ms", "1.2s")
 */
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Gets a human-readable status text for an HTTP status code.
 *
 * @param status - HTTP status code
 * @returns Status text (e.g., "200 OK", "404 Not Found")
 */
function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    // 2xx Success
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    204: 'No Content',
    // 3xx Redirection
    301: 'Moved',
    302: 'Found',
    304: 'Not Modified',
    // 4xx Client Errors
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    422: 'Unprocessable',
    429: 'Too Many Requests',
    // 5xx Server Errors
    500: 'Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };

  const text = statusTexts[status];
  if (text) {
    return `${status} ${text}`;
  }

  // Fallback based on status range
  if (status >= 500) return `${status} Error`;
  if (status >= 400) return `${status} Error`;
  if (status >= 300) return `${status} Redirect`;
  if (status >= 200) return `${status} OK`;
  if (status === 0) return 'Network Error';
  return `${status}`;
}

/**
 * Adds a request event to the timeline.
 *
 * This should be called when a request to the mock server completes,
 * with all the relevant timing and response information.
 *
 * @param event - The request event data
 *
 * @example
 * ```ts
 * addTimelineRequestEvent({
 *   method: 'GET',
 *   path: '/api/pets',
 *   url: 'http://localhost:5173/api/pets',
 *   status: 200,
 *   duration: 45,
 *   startTime: Date.now() - 45,
 *   endTime: Date.now(),
 *   operationId: 'getPets',
 *   usedHandler: false,
 *   usedSeed: true,
 * });
 * ```
 */
export function addTimelineRequestEvent(event: TimelineRequestEvent): void {
  if (!timelineApi) {
    // DevTools not available, silently skip
    return;
  }

  const eventId = `req-${++eventCounter}`;
  const statusColor = getStatusColor(event.status);
  const methodColor = getMethodColor(event.method);

  // Build the title: "GET /api/pets"
  const title = `${event.method} ${event.path}`;

  // Build the subtitle: "200 OK • 45ms • handler"
  const statusText = getStatusText(event.status);
  const handlerBadge = event.usedHandler ? ' • handler' : '';
  const seedBadge = event.usedSeed && !event.usedHandler ? ' • seed' : '';
  const errorBadge = event.error ? ' • error' : '';
  const subtitle = `${statusText} • ${formatDuration(event.duration)}${handlerBadge}${seedBadge}${errorBadge}`;

  // Build detailed data for the expanded view
  const data: Record<string, unknown> = {
    // Request info
    method: event.method,
    path: event.path,
    url: event.url,
    operationId: event.operationId ?? 'unknown',

    // Response info
    status: event.status,
    duration: `${event.duration}ms`,

    // Handler info
    usedHandler: event.usedHandler,
    usedSeed: event.usedSeed,

    // Timing
    startTime: new Date(event.startTime).toISOString(),
    endTime: new Date(event.endTime).toISOString(),
  };

  // Add optional fields if present
  if (event.requestHeaders && Object.keys(event.requestHeaders).length > 0) {
    data.requestHeaders = event.requestHeaders;
  }

  if (event.requestBody !== undefined) {
    data.requestBody = event.requestBody;
  }

  if (event.responseHeaders && Object.keys(event.responseHeaders).length > 0) {
    data.responseHeaders = event.responseHeaders;
  }

  if (event.responseBody !== undefined) {
    data.responseBody = event.responseBody;
  }

  if (event.error) {
    data.error = event.error;
  }

  // Add the timeline event
  timelineApi.addTimelineEvent({
    layerId: TIMELINE_LAYER_ID,
    event: {
      time: event.startTime,
      title,
      subtitle,
      data,
      groupId: event.operationId ?? undefined,
      meta: {
        statusColor,
        methodColor,
        eventId,
      },
    },
  });
}

/**
 * Checks if the timeline layer is registered and ready for events.
 *
 * @returns true if the timeline is ready to receive events
 */
export function isTimelineReady(): boolean {
  return timelineApi !== null;
}

/**
 * Resets the timeline API reference.
 * Useful for testing or when the DevTools connection is lost.
 */
export function resetTimeline(): void {
  timelineApi = null;
  eventCounter = 0;
}
