/**
 * Define Seeds Helper
 *
 * What: Type-safe helper for defining seed functions
 * How: Identity function that preserves type information
 * Why: Enables TypeScript autocompletion and type checking
 */

import type { AnySeedFn, SeedContext } from './context.js';

/**
 * Seed definition object type
 * Maps schema names to seed functions
 */
export interface SeedDefinition {
  [schemaName: string]: (context: SeedContext) => unknown[] | Promise<unknown[]>;
}

/**
 * Define seeds with full type safety
 *
 * This is an identity function that returns the seeds object unchanged,
 * but provides TypeScript with the type information needed for:
 * - Autocompletion of context properties (seed, store, faker, schema, logger)
 * - Type checking of return values
 * - Proper typing when imported by the plugin
 *
 * @param seeds - Object mapping schema names to seed functions
 * @returns The same seeds object with preserved types
 *
 * @example
 * ```typescript
 * // mocks/seeds/pets.seed.ts
 * import { defineSeeds } from '@websublime/vite-open-api-core';
 *
 * export default defineSeeds({
 *   // Using seed.count to generate N items
 *   Pet: ({ seed, faker }) => seed.count(15, (index) => ({
 *     id: index + 1,
 *     name: faker.animal.dog(),
 *     category: {
 *       id: faker.number.int({ min: 1, max: 5 }),
 *       name: faker.helpers.arrayElement(['Dogs', 'Cats', 'Birds']),
 *     },
 *     photoUrls: [faker.image.url()],
 *     tags: [{ id: index, name: faker.word.adjective() }],
 *     status: faker.helpers.arrayElement(['available', 'pending', 'sold']),
 *   })),
 *
 *   // Using seed with direct array
 *   Category: ({ seed }) => seed([
 *     { id: 1, name: 'Dogs' },
 *     { id: 2, name: 'Cats' },
 *     { id: 3, name: 'Birds' },
 *     { id: 4, name: 'Fish' },
 *     { id: 5, name: 'Reptiles' },
 *   ]),
 *
 *   // Seed with dependency on another schema
 *   Order: ({ seed, store, faker }) => seed.count(10, () => {
 *     const pets = store.list('Pet');
 *     const randomPet = faker.helpers.arrayElement(pets) as { id: number };
 *     return {
 *       id: faker.number.int({ min: 1, max: 10000 }),
 *       petId: randomPet?.id,
 *       quantity: faker.number.int({ min: 1, max: 5 }),
 *       shipDate: faker.date.future().toISOString(),
 *       status: faker.helpers.arrayElement(['placed', 'approved', 'delivered']),
 *       complete: faker.datatype.boolean(),
 *     };
 *   }),
 * });
 * ```
 */
export function defineSeeds<T extends SeedDefinition>(seeds: T): T {
  return seeds;
}

/**
 * Type for a map of schema names to seed functions
 * Used internally by the executor
 */
export type SeedFnMap = Map<string, AnySeedFn>;
