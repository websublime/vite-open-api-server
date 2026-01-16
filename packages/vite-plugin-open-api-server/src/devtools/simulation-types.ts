/**
 * Simulation Panel Types
 *
 * ## What
 * Type definitions for the simulation panel UI in Vue DevTools.
 * Defines the structure for simulation parameters, presets, and URL generation.
 *
 * ## How
 * Provides TypeScript interfaces used across the simulation panel components
 * and the URL generator module.
 *
 * ## Why
 * Centralizes type definitions for simulation features to ensure consistency
 * across the DevTools integration and enable future Phase 6 tasks (P6-03 to P6-06).
 *
 * @module
 */

// ============================================================================
// Simulation Parameter Types
// ============================================================================

/**
 * Available error simulation types
 */
export type SimulationErrorType =
  | 'none'
  | 'timeout'
  | 'network-error'
  | 'server-error'
  | 'rate-limit'
  | 'service-unavailable';

/**
 * Available edge case simulation types
 */
export type SimulationEdgeCase =
  | 'normal'
  | 'empty-response'
  | 'empty-array'
  | 'null-values'
  | 'malformed-json'
  | 'large-response';

/**
 * Network condition presets
 */
export type NetworkConditionPreset =
  | 'none'
  | '3g-slow'
  | '3g-fast'
  | '4g'
  | 'slow-connection'
  | 'offline';

/**
 * Connection simulation types
 */
export type SimulationConnectionType = 'normal' | 'drop' | 'reset' | 'partial';

// ============================================================================
// Simulation State
// ============================================================================

/**
 * Current simulation parameters for an endpoint
 */
export interface SimulationParams {
  /** Selected endpoint operation ID */
  operationId: string | null;

  /** Selected HTTP status code to simulate */
  statusCode: number | null;

  /** Response delay in milliseconds */
  delay: number;

  /** Error type to simulate */
  errorType: SimulationErrorType;

  /** Edge case to simulate */
  edgeCase: SimulationEdgeCase;

  /** Network condition preset */
  networkPreset: NetworkConditionPreset;

  /** Connection simulation type */
  connectionType: SimulationConnectionType;

  /** Timeout duration in milliseconds (for timeout simulation) */
  timeoutMs: number;
}

/**
 * Default simulation parameters
 */
export const DEFAULT_SIMULATION_PARAMS: SimulationParams = {
  operationId: null,
  statusCode: null,
  delay: 0,
  errorType: 'none',
  edgeCase: 'normal',
  networkPreset: 'none',
  connectionType: 'normal',
  timeoutMs: 30000,
};

// ============================================================================
// Endpoint Information for Simulation
// ============================================================================

/**
 * Endpoint data required for simulation panel
 */
export interface SimulationEndpoint {
  /** Operation ID from OpenAPI spec */
  operationId: string;

  /** HTTP method */
  method: string;

  /** Request path */
  path: string;

  /** Available status codes from OpenAPI responses */
  availableStatusCodes: number[];

  /** Endpoint tags for grouping */
  tags: string[];

  /** Whether endpoint has custom handler */
  hasHandler: boolean;

  /** Summary from OpenAPI spec */
  summary?: string;
}

// ============================================================================
// Simulation Presets
// ============================================================================

/**
 * A saved simulation preset configuration
 */
export interface SimulationPreset {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Description of what this preset simulates */
  description: string;

  /** Whether this is a built-in preset */
  isBuiltIn: boolean;

  /** The simulation parameters */
  params: Omit<SimulationParams, 'operationId'>;

  /** Icon for display (Material Design Icons name) */
  icon?: string;
}

/**
 * Built-in simulation presets
 */
export const BUILT_IN_PRESETS: SimulationPreset[] = [
  {
    id: 'slow-network',
    name: 'Slow Network (3G)',
    description: 'Simulates a slow 3G mobile connection with 2s delay',
    isBuiltIn: true,
    icon: 'signal-cellular-1',
    params: {
      statusCode: null,
      delay: 2000,
      errorType: 'none',
      edgeCase: 'normal',
      networkPreset: '3g-slow',
      connectionType: 'normal',
      timeoutMs: 30000,
    },
  },
  {
    id: 'server-error',
    name: 'Server Error (500)',
    description: 'Simulates an internal server error',
    isBuiltIn: true,
    icon: 'error',
    params: {
      statusCode: 500,
      delay: 0,
      errorType: 'server-error',
      edgeCase: 'normal',
      networkPreset: 'none',
      connectionType: 'normal',
      timeoutMs: 30000,
    },
  },
  {
    id: 'not-found',
    name: 'Not Found (404)',
    description: 'Simulates a resource not found error',
    isBuiltIn: true,
    icon: 'search-off',
    params: {
      statusCode: 404,
      delay: 0,
      errorType: 'none',
      edgeCase: 'normal',
      networkPreset: 'none',
      connectionType: 'normal',
      timeoutMs: 30000,
    },
  },
  {
    id: 'rate-limited',
    name: 'Rate Limited (429)',
    description: 'Simulates rate limiting / too many requests',
    isBuiltIn: true,
    icon: 'block',
    params: {
      statusCode: 429,
      delay: 0,
      errorType: 'rate-limit',
      edgeCase: 'normal',
      networkPreset: 'none',
      connectionType: 'normal',
      timeoutMs: 30000,
    },
  },
  {
    id: 'timeout',
    name: 'Request Timeout',
    description: 'Simulates a request that never completes',
    isBuiltIn: true,
    icon: 'timer-off',
    params: {
      statusCode: null,
      delay: 0,
      errorType: 'timeout',
      edgeCase: 'normal',
      networkPreset: 'none',
      connectionType: 'normal',
      timeoutMs: 5000,
    },
  },
  {
    id: 'empty-response',
    name: 'Empty Response',
    description: 'Returns an empty response body',
    isBuiltIn: true,
    icon: 'inbox',
    params: {
      statusCode: 200,
      delay: 0,
      errorType: 'none',
      edgeCase: 'empty-response',
      networkPreset: 'none',
      connectionType: 'normal',
      timeoutMs: 30000,
    },
  },
  {
    id: 'connection-drop',
    name: 'Connection Drop',
    description: 'Simulates connection dropping mid-response',
    isBuiltIn: true,
    icon: 'cloud-off',
    params: {
      statusCode: null,
      delay: 500,
      errorType: 'network-error',
      edgeCase: 'normal',
      networkPreset: 'none',
      connectionType: 'drop',
      timeoutMs: 30000,
    },
  },
  {
    id: 'unauthorized',
    name: 'Unauthorized (401)',
    description: 'Simulates an authentication error',
    isBuiltIn: true,
    icon: 'lock',
    params: {
      statusCode: 401,
      delay: 0,
      errorType: 'none',
      edgeCase: 'normal',
      networkPreset: 'none',
      connectionType: 'normal',
      timeoutMs: 30000,
    },
  },
];

// ============================================================================
// URL Generation
// ============================================================================

/**
 * Generated simulation URL with metadata
 */
export interface SimulationUrl {
  /** The full URL with simulation parameters */
  url: string;

  /** The base URL without simulation parameters */
  baseUrl: string;

  /** Query parameters added for simulation */
  queryParams: Record<string, string>;

  /** Human-readable description of what this URL simulates */
  description: string;
}

/**
 * Options for generating simulation URLs
 */
export interface UrlGeneratorOptions {
  /** Base URL for the API (e.g., 'http://localhost:5173') */
  baseUrl: string;

  /** Proxy path (e.g., '/api/v3') */
  proxyPath: string;

  /** Endpoint path (e.g., '/pet/{petId}') */
  endpointPath: string;

  /** Simulation parameters to apply */
  params: Partial<SimulationParams>;
}

// ============================================================================
// Simulation Panel State
// ============================================================================

/**
 * Complete state of the simulation panel
 */
export interface SimulationPanelState {
  /** Available endpoints for selection */
  endpoints: SimulationEndpoint[];

  /** Currently selected endpoint */
  selectedEndpoint: SimulationEndpoint | null;

  /** Current simulation parameters */
  params: SimulationParams;

  /** Available presets (built-in + custom) */
  presets: SimulationPreset[];

  /** Generated URL based on current params */
  generatedUrl: SimulationUrl | null;

  /** Whether the URL was recently copied */
  urlCopied: boolean;

  /** Loading state */
  isLoading: boolean;

  /** Error message if any */
  error: string | null;
}

/**
 * Default simulation panel state
 */
export const DEFAULT_PANEL_STATE: SimulationPanelState = {
  endpoints: [],
  selectedEndpoint: null,
  params: { ...DEFAULT_SIMULATION_PARAMS },
  presets: [...BUILT_IN_PRESETS],
  generatedUrl: null,
  urlCopied: false,
  isLoading: true,
  error: null,
};

// ============================================================================
// Helper Type Guards
// ============================================================================

/**
 * Check if a status code is a success code (2xx)
 */
export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Check if a status code is a client error (4xx)
 */
export function isClientError(status: number): boolean {
  return status >= 400 && status < 500;
}

/**
 * Check if a status code is a server error (5xx)
 */
export function isServerError(status: number): boolean {
  return status >= 500 && status < 600;
}

/**
 * Get a human-readable description for a status code
 */
export function getStatusDescription(status: number): string {
  const descriptions: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  };

  return descriptions[status] ?? `Status ${status}`;
}

/**
 * Get a human-readable description for an error type
 */
export function getErrorTypeDescription(errorType: SimulationErrorType): string {
  const descriptions: Record<SimulationErrorType, string> = {
    none: 'No error simulation',
    timeout: 'Request timeout (never responds)',
    'network-error': 'Network error (connection failed)',
    'server-error': 'Server error (500 Internal Server Error)',
    'rate-limit': 'Rate limited (429 Too Many Requests)',
    'service-unavailable': 'Service unavailable (503)',
  };

  return descriptions[errorType];
}

/**
 * Get a human-readable description for an edge case
 */
export function getEdgeCaseDescription(edgeCase: SimulationEdgeCase): string {
  const descriptions: Record<SimulationEdgeCase, string> = {
    normal: 'Normal response',
    'empty-response': 'Empty response body',
    'empty-array': 'Empty array response',
    'null-values': 'Response with null values',
    'malformed-json': 'Malformed JSON response',
    'large-response': 'Large response (performance test)',
  };

  return descriptions[edgeCase];
}

/**
 * Get delay value for a network preset
 */
export function getNetworkPresetDelay(preset: NetworkConditionPreset): number {
  const delays: Record<NetworkConditionPreset, number> = {
    none: 0,
    '3g-slow': 2000,
    '3g-fast': 750,
    '4g': 100,
    'slow-connection': 5000,
    offline: -1, // Special case: no response
  };

  return delays[preset];
}
