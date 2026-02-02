/**
 * Define Handlers Helper
 *
 * What: Type-safe helper for defining handler functions
 * How: Identity function that preserves type information
 * Why: Enables TypeScript autocompletion and type checking
 */

import type { HandlerContext, HandlerReturn } from './context.js';

/**
 * Handler definition object type
 * Maps operation IDs to handler functions
 */
export interface HandlerDefinition {
  [operationId: string]: (context: HandlerContext) => HandlerReturn | Promise<HandlerReturn>;
}

/**
 * Define handlers with full type safety
 *
 * This is an identity function that returns the handlers object unchanged,
 * but provides TypeScript with the type information needed for:
 * - Autocompletion of context properties (req, res, store, faker, logger)
 * - Type checking of return values
 * - Proper typing when imported by the plugin
 *
 * @param handlers - Object mapping operationId to handler function
 * @returns The same handlers object with preserved types
 *
 * @example
 * ```typescript
 * // mocks/handlers/pets.handler.ts
 * import { defineHandlers } from '@websublime/vite-open-api-core';
 *
 * export default defineHandlers({
 *   // Returns raw data (200 OK)
 *   getPetById: ({ req, store }) => {
 *     const pet = store.get('Pet', req.params.petId);
 *     if (!pet) {
 *       return { type: 'status', status: 404, data: { message: 'Pet not found' } };
 *     }
 *     return { type: 'raw', data: pet };
 *   },
 *
 *   // Returns data with custom status
 *   createPet: async ({ req, store, faker }) => {
 *     const newPet = {
 *       id: faker.string.uuid(),
 *       ...req.body as object,
 *     };
 *     store.create('Pet', newPet);
 *     return { type: 'status', status: 201, data: newPet };
 *   },
 *
 *   // Returns data with custom status and headers
 *   updatePet: ({ req, store }) => {
 *     const pet = store.update('Pet', req.params.petId, req.body);
 *     return {
 *       type: 'full',
 *       status: 200,
 *       data: pet,
 *       headers: { 'X-Updated-At': new Date().toISOString() },
 *     };
 *   },
 * });
 * ```
 */
export function defineHandlers<T extends HandlerDefinition>(handlers: T): T {
  return handlers;
}
