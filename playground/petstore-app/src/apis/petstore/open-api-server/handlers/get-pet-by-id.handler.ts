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
 *
 * @module handlers/get-pet-by-id
 * @see {@link https://github.com/websublime/vite-open-api-server} Plugin documentation
 *
 * @example
 * ```typescript
 * // Example implementation (Phase 2)
 * export default async function handler(context: HandlerContext) {
 *   const petId = context.params.petId;
 *   const pet = await database.pets.findById(petId);
 *
 *   if (!pet) {
 *     return {
 *       status: 404,
 *       body: { message: 'Pet not found' },
 *     };
 *   }
 *
 *   return {
 *     status: 200,
 *     body: pet,
 *   };
 * }
 * ```
 */

import type { HandlerContext } from '@websublime/vite-plugin-open-api-server';

/**
 * Placeholder handler for the getPetById operation.
 *
 * Currently returns `null` to indicate that the default mock server behavior
 * should be used. This handler will be implemented in Phase 2 (P2-01: Handler Loader).
 *
 * @param _context - The handler context containing request information and utilities
 * @returns `null` to use default mock behavior, or a custom response object
 *
 * @remarks
 * Implementation planned for Phase 2:
 * - Extract petId from path parameters
 * - Query mock database for pet
 * - Return 404 if pet not found
 * - Return pet data with 200 status
 */
export default async function handler(_context: HandlerContext): Promise<null> {
  // TODO: Implement custom handler logic in Phase 2
  // Returning null delegates to the default mock server response
  return null;
}
