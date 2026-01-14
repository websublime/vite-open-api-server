/**
 * Custom Handler for GET /pet/{petId} (getPetById operation)
 *
 * ## What
 * This handler intercepts GET requests to the `/pet/{petId}` endpoint, allowing custom
 * logic to be executed instead of (or before) the default mock server response.
 *
 * ## How
 * When the mock server receives a GET /pet/{petId} request, it checks for a matching handler.
 * If this handler exports a default async function, it will be invoked with a
 * `HandlerContext` containing request details, path parameters, and utility functions.
 *
 * ## Why
 * Custom handlers enable:
 * - Database lookups for specific pets by ID
 * - Custom 404 handling when pets are not found
 * - Response transformation or enrichment
 * - Access control validation per pet resource
 * - Error simulation for frontend testing
 *
 * ## Error Simulation
 * This handler supports error simulation via query parameters:
 * - `simulateError=404` - Returns not found error response
 * - `simulateError=401` - Returns unauthorized error response
 * - `delay=<ms>` - Delays response by specified milliseconds
 *
 * @module handlers/get-pet-by-id
 * @see {@link https://github.com/websublime/vite-open-api-server} Plugin documentation
 *
 * @example
 * ```typescript
 * // Test 404 not found error
 * fetch('/api/v3/pet/999?simulateError=404')
 *
 * // Test unauthorized access
 * fetch('/api/v3/pet/1?simulateError=401')
 *
 * // Test with delay
 * fetch('/api/v3/pet/1?delay=2000')
 * ```
 */

import type { HandlerContext, HandlerResponse } from '@websublime/vite-plugin-open-api-server';

/**
 * Maximum allowed delay in milliseconds.
 * Prevents hung requests from unreasonably long delays.
 */
const MAX_DELAY_MS = 10000;

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
  const stringValue = Array.isArray(value) ? value[0] : value;
  return parseInt(stringValue, 10);
}

/**
 * Handler for the getPetById operation with error simulation support.
 *
 * Supports query parameters for simulating error conditions:
 * - `simulateError=404` - Pet not found
 * - `simulateError=401` - Unauthorized access
 * - `delay=<ms>` - Response delay in milliseconds
 *
 * @param context - The handler context containing request information and utilities
 * @returns Error response for simulation, or null to use default mock behavior
 *
 * @example
 * ```typescript
 * // Simulate pet not found
 * GET /api/v3/pet/999?simulateError=404
 *
 * // Simulate unauthorized with 1 second delay
 * GET /api/v3/pet/1?simulateError=401&delay=1000
 * ```
 */
export default async function handler(context: HandlerContext): Promise<HandlerResponse | null> {
  const { query, params, logger, operationId } = context;

  // Simulate network delay
  const delayMs = parseQueryNumber(query.delay);
  if (!Number.isNaN(delayMs) && delayMs > 0) {
    const actualDelay = Math.min(delayMs, MAX_DELAY_MS);
    logger.info(`[${operationId}] Simulating ${actualDelay}ms delay`);
    await new Promise((resolve) => setTimeout(resolve, actualDelay));
  }

  // Simulate error response
  const errorCode = parseQueryNumber(query.simulateError);
  if (!Number.isNaN(errorCode)) {
    switch (errorCode) {
      case 404:
        logger.info(`[${operationId}] Simulating 404 not found for petId: ${params.petId}`);
        return {
          status: 404,
          body: {
            error: 'Not Found',
            message: `Pet with ID ${params.petId} not found`,
            code: 'PET_NOT_FOUND',
          },
        };

      case 401:
        logger.info(`[${operationId}] Simulating 401 unauthorized`);
        return {
          status: 401,
          body: {
            error: 'Unauthorized',
            message: 'Authentication required to access pet details',
            code: 'AUTH_REQUIRED',
          },
          headers: {
            'WWW-Authenticate': 'Bearer realm="petstore"',
          },
        };

      default:
        logger.warn(`[${operationId}] Unknown error code: ${errorCode}`);
        return {
          status: 400,
          body: {
            error: 'Bad Request',
            message: `Unknown error code: ${errorCode}. Supported codes for getPetById: 404, 401`,
            code: 'UNKNOWN_ERROR_CODE',
          },
        };
    }
  }

  // No simulation requested, use default mock response
  return null;
}
