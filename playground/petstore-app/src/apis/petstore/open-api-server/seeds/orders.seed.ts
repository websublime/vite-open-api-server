/**
 * Seed Data Generator for Order Entities
 *
 * ## What
 * This seed file provides initial data for the Order schema, populating the mock server
 * with sample order records when the application starts.
 *
 * ## How
 * When the mock server initializes, it scans the seeds directory and invokes each seed
 * file's default export function. The function receives a `SeedContext` with utilities
 * for generating fake data and accessing schema definitions.
 *
 * ## Why
 * Seed data enables:
 * - Realistic mock responses for store/order-related endpoints
 * - Order workflow testing (placed → approved → delivered)
 * - Consistent order history across development sessions
 * - Demonstration of e-commerce functionality
 *
 * @module seeds/orders
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
 *     petId: faker.number.int({ min: 1, max: 20 }),
 *     quantity: faker.number.int({ min: 1, max: 5 }),
 *     shipDate: faker.date.future().toISOString(),
 *     status: faker.helpers.arrayElement(['placed', 'approved', 'delivered']),
 *     complete: faker.datatype.boolean(),
 *   }));
 * }
 * ```
 */

import type { SeedContext } from '@websublime/vite-plugin-open-api-server';

/**
 * Placeholder seed generator for Order entities.
 *
 * Currently returns an empty array indicating no seed data should be generated.
 * This seed will be implemented in Phase 2 (P2-02: Seed Loader).
 *
 * @param _context - The seed context containing faker instance and schema utilities
 * @returns An empty array (no seed data), or an array of Order objects
 *
 * @remarks
 * Implementation planned for Phase 2:
 * - Generate 10-15 sample orders
 * - Reference existing pet IDs from pets seed
 * - Include all order statuses (placed, approved, delivered)
 * - Mix of complete and incomplete orders
 * - Ship dates spanning past and future
 */
export default async function seed(_context: SeedContext): Promise<unknown[]> {
  // TODO: Implement seed data generation in Phase 2
  // Returning empty array means no initial seed data
  return [];
}
