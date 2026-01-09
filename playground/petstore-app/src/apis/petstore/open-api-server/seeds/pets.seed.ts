/**
 * Seed Data Generator for Pet Entities
 *
 * ## What
 * This seed file provides initial data for the Pet schema, populating the mock server
 * with sample pet records when the application starts.
 *
 * ## How
 * When the mock server initializes, it scans the seeds directory and invokes each seed
 * file's default export function. The function receives a `SeedContext` with utilities
 * for generating fake data and accessing schema definitions.
 *
 * ## Why
 * Seed data enables:
 * - Realistic mock responses without manual data entry
 * - Consistent test data across development sessions
 * - Demonstration of API capabilities with meaningful examples
 * - Frontend development with populated data stores
 *
 * @module seeds/pets
 * @see {@link https://github.com/websublime/vite-open-api-server} Plugin documentation
 *
 * @example
 * ```typescript
 * // Example implementation (Phase 2)
 * export default async function seed(context: SeedContext) {
 *   const faker = context.faker;
 *
 *   return Array.from({ length: 10 }, (_, index) => ({
 *     id: index + 1,
 *     name: faker.animal.petName(),
 *     category: {
 *       id: faker.number.int({ min: 1, max: 5 }),
 *       name: faker.helpers.arrayElement(['Dogs', 'Cats', 'Birds', 'Fish']),
 *     },
 *     photoUrls: [faker.image.url()],
 *     tags: [{ id: 1, name: faker.word.adjective() }],
 *     status: faker.helpers.arrayElement(['available', 'pending', 'sold']),
 *   }));
 * }
 * ```
 */

import type { SeedContext } from '@websublime/vite-plugin-open-api-server';

/**
 * Placeholder seed generator for Pet entities.
 *
 * Currently returns an empty array indicating no seed data should be generated.
 * This seed will be implemented in Phase 2 (P2-02: Seed Loader).
 *
 * @param _context - The seed context containing faker instance and schema utilities
 * @returns An empty array (no seed data), or an array of Pet objects
 *
 * @remarks
 * Implementation planned for Phase 2:
 * - Generate 10-20 sample pets
 * - Use faker for realistic names and images
 * - Include all pet statuses (available, pending, sold)
 * - Associate with categories and tags
 */
export default async function seed(_context: SeedContext): Promise<unknown[]> {
  // TODO: Implement seed data generation in Phase 2
  // Returning empty array means no initial seed data
  return [];
}
