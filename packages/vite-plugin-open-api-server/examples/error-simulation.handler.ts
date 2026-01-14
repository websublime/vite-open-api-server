/**
 * Error Simulation Handler Example
 *
 * ## What
 * This example demonstrates how to implement error simulation in custom handlers.
 * It shows how to check for query parameters and return appropriate error responses
 * or introduce artificial delays to simulate network conditions.
 *
 * ## How
 * The handler checks for two query parameters:
 * - `simulateError=<code>` - Returns an HTTP error response with the specified code
 * - `delay=<ms>` - Delays the response by the specified milliseconds
 *
 * ## Why
 * Error simulation enables frontend developers to:
 * - Test error handling UI without breaking real APIs
 * - Verify loading states work correctly with slow responses
 * - Ensure graceful degradation under various failure conditions
 * - Develop offline-first features with simulated network failures
 *
 * @module examples/error-simulation
 * @see {@link https://github.com/websublime/vite-open-api-server} Plugin documentation
 *
 * @example
 * ```typescript
 * // Test 404 error handling
 * fetch('/api/pet/999?simulateError=404')
 *
 * // Test loading state with 3 second delay
 * fetch('/api/pets?delay=3000')
 *
 * // Test slow failure (2 second delay then 500 error)
 * fetch('/api/pet/1?simulateError=500&delay=2000')
 * ```
 */

import type { HandlerContext, HandlerResponse } from '@websublime/vite-plugin-open-api-server';

/**
 * Maximum allowed delay in milliseconds.
 * Prevents hung requests from unreasonably long delays.
 */
const MAX_DELAY_MS = 10000;

/**
 * Standard error response bodies for each supported error code.
 * Following common REST API error response patterns.
 */
const ERROR_RESPONSES: Record<number, HandlerResponse> = {
  400: {
    status: 400,
    body: {
      error: 'Bad Request',
      message: 'Invalid request parameters',
      code: 'INVALID_REQUEST',
    },
  },
  401: {
    status: 401,
    body: {
      error: 'Unauthorized',
      message: 'Authentication required',
      code: 'AUTH_REQUIRED',
    },
  },
  403: {
    status: 403,
    body: {
      error: 'Forbidden',
      message: 'Access denied',
      code: 'ACCESS_DENIED',
    },
  },
  404: {
    status: 404,
    body: {
      error: 'Not Found',
      message: 'Resource does not exist',
      code: 'NOT_FOUND',
    },
  },
  500: {
    status: 500,
    body: {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    },
  },
  503: {
    status: 503,
    body: {
      error: 'Service Unavailable',
      message: 'Service temporarily unavailable',
      code: 'SERVICE_UNAVAILABLE',
    },
  },
};

/**
 * Parses a query parameter value to a number.
 * Handles both string and string[] types safely.
 *
 * @param value - Query parameter value (string or string[])
 * @returns Parsed number or NaN if invalid
 */
function parseQueryNumber(value: string | string[] | undefined): number {
  if (value === undefined) {
    return Number.NaN;
  }

  // Handle array case (take first value)
  const stringValue = Array.isArray(value) ? value[0] : value;

  return parseInt(stringValue, 10);
}

/**
 * Simulates a network delay.
 * Clamps the delay to MAX_DELAY_MS to prevent hung requests.
 *
 * @param ms - Delay in milliseconds
 * @returns Promise that resolves after the delay
 */
async function simulateDelay(ms: number): Promise<void> {
  const clampedDelay = Math.min(Math.max(0, ms), MAX_DELAY_MS);
  await new Promise((resolve) => setTimeout(resolve, clampedDelay));
}

/**
 * Example handler demonstrating error simulation.
 *
 * Checks for `simulateError` and `delay` query parameters to simulate
 * error conditions and network latency. Returns `null` to fall back
 * to default mock behavior when no simulation is requested.
 *
 * @param context - The handler context containing request information
 * @returns Error response, or null to use default mock behavior
 *
 * @example
 * ```typescript
 * // Copy this handler to your handlers directory and customize as needed
 * // File: handlers/get.getPetById.ts
 *
 * import type { HandlerContext, HandlerResponse } from '@websublime/vite-plugin-open-api-server';
 *
 * export default async function handler(
 *   context: HandlerContext
 * ): Promise<HandlerResponse | null> {
 *   // Add error simulation support
 *   if (context.query.delay) {
 *     const delayMs = parseInt(context.query.delay as string, 10);
 *     if (!isNaN(delayMs) && delayMs > 0) {
 *       await new Promise((resolve) => setTimeout(resolve, delayMs));
 *     }
 *   }
 *
 *   if (context.query.simulateError) {
 *     const code = parseInt(context.query.simulateError as string, 10);
 *     // Return appropriate error response based on code
 *     // ...
 *   }
 *
 *   // Your normal handler logic here
 *   return null;
 * }
 * ```
 */
export default async function handler(context: HandlerContext): Promise<HandlerResponse | null> {
  const { query, logger, operationId } = context;

  // Simulate network delay
  const delayMs = parseQueryNumber(query.delay);
  if (!Number.isNaN(delayMs) && delayMs > 0) {
    const actualDelay = Math.min(delayMs, MAX_DELAY_MS);
    logger.info(`[${operationId}] Simulating ${actualDelay}ms delay`);
    await simulateDelay(actualDelay);
  }

  // Simulate error response
  const errorCode = parseQueryNumber(query.simulateError);
  if (!Number.isNaN(errorCode) && errorCode in ERROR_RESPONSES) {
    logger.info(`[${operationId}] Simulating ${errorCode} error`);
    return ERROR_RESPONSES[errorCode];
  }

  // If error code is provided but not recognized, return 400
  if (!Number.isNaN(errorCode)) {
    logger.warn(`[${operationId}] Unknown error code: ${errorCode}, returning 400`);
    return {
      status: 400,
      body: {
        error: 'Bad Request',
        message: `Unknown error code: ${errorCode}. Supported codes: 400, 401, 403, 404, 500, 503`,
        code: 'UNKNOWN_ERROR_CODE',
      },
    };
  }

  // No simulation requested, use default mock response
  return null;
}
