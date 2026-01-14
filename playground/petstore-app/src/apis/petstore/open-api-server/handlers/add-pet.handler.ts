/**
 * Custom Handler for POST /pet (addPet operation)
 *
 * ## What
 * This handler intercepts POST requests to the `/pet` endpoint, allowing custom logic
 * to be executed instead of (or before) the default mock server response.
 *
 * ## How
 * When the mock server receives a POST /pet request, it checks for a matching handler.
 * If this handler exports a default async function, it will be invoked with a
 * `HandlerContext` containing request details, operation metadata, and utility functions.
 *
 * ## Why
 * Custom handlers enable:
 * - Database integration for persistent pet storage
 * - Request validation beyond OpenAPI schema validation
 * - Custom response generation based on business logic
 * - Integration with external services (e.g., notification systems)
 * - Error simulation for frontend testing
 *
 * ## Error Simulation
 * This handler supports error simulation via query parameters:
 * - `simulateError=400` - Returns validation error response
 * - `simulateError=500` - Returns server error response
 * - `delay=<ms>` - Delays response by specified milliseconds
 *
 * @module handlers/add-pet
 * @see {@link https://github.com/websublime/vite-open-api-server} Plugin documentation
 *
 * @example
 * ```typescript
 * // Test validation error handling
 * fetch('/api/v3/pet?simulateError=400', { method: 'POST', body: JSON.stringify(pet) })
 *
 * // Test server error with delay
 * fetch('/api/v3/pet?simulateError=500&delay=2000', { method: 'POST', body: JSON.stringify(pet) })
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
 * Handler for the addPet operation with error simulation support.
 *
 * Supports query parameters for simulating error conditions:
 * - `simulateError=400` - Validation error (missing required fields)
 * - `simulateError=500` - Internal server error
 * - `delay=<ms>` - Response delay in milliseconds
 *
 * @param context - The handler context containing request information and utilities
 * @returns Error response for simulation, or null to use default mock behavior
 *
 * @example
 * ```typescript
 * // Simulate validation error
 * POST /api/v3/pet?simulateError=400
 *
 * // Simulate server error with 2 second delay
 * POST /api/v3/pet?simulateError=500&delay=2000
 * ```
 */
export default async function handler(context: HandlerContext): Promise<HandlerResponse | null> {
  const { query, logger, operationId } = context;

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
      case 400:
        logger.info(`[${operationId}] Simulating 400 validation error`);
        return {
          status: 400,
          body: {
            error: 'Bad Request',
            message: 'Invalid pet data: name is required and must be a non-empty string',
            code: 'VALIDATION_ERROR',
            details: [
              { field: 'name', message: 'Name is required' },
              { field: 'photoUrls', message: 'At least one photo URL is required' },
            ],
          },
        };

      case 500:
        logger.info(`[${operationId}] Simulating 500 server error`);
        return {
          status: 500,
          body: {
            error: 'Internal Server Error',
            message: 'Failed to save pet: database connection error',
            code: 'DATABASE_ERROR',
          },
        };

      default:
        logger.warn(`[${operationId}] Unknown error code: ${errorCode}`);
        return {
          status: 400,
          body: {
            error: 'Bad Request',
            message: `Unknown error code: ${errorCode}. Supported codes for addPet: 400, 500`,
            code: 'UNKNOWN_ERROR_CODE',
          },
        };
    }
  }

  // No simulation requested, use default mock response
  return null;
}
