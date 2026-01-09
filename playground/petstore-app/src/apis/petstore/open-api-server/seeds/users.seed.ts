/**
 * Seed Data Generator for User Entities
 *
 * ## What
 * This seed file provides initial data for the User schema, populating the mock server
 * with sample user records when the application starts.
 *
 * ## How
 * When the mock server initializes, it scans the seeds directory and invokes each seed
 * file's default export function. The function receives a `SeedContext` with utilities
 * for generating fake data and accessing schema definitions.
 *
 * ## Why
 * Seed data enables:
 * - Realistic mock responses for user-related endpoints
 * - Authentication flow testing with predefined credentials
 * - Consistent test users across development sessions
 * - Demonstration of user management features
 *
 * @module seeds/users
 * @see {@link https://github.com/websublime/vite-open-api-server} Plugin documentation
 *
 * @example
 * ```typescript
 * // Example implementation (Phase 2)
 * export default async function seed(context: SeedContext) {
 *   const faker = context.faker;
 *
 *   return Array.from({ length: 5 }, (_, index) => ({
 *     id: index + 1,
 *     username: faker.internet.username(),
 *     firstName: faker.person.firstName(),
 *     lastName: faker.person.lastName(),
 *     email: faker.internet.email(),
 *     password: faker.internet.password(),
 *     phone: faker.phone.number(),
 *     userStatus: faker.helpers.arrayElement([0, 1, 2]),
 *   }));
 * }
 * ```
 */

import type { SeedContext } from '@websublime/vite-plugin-open-api-server';

/**
 * Placeholder seed generator for User entities.
 *
 * Currently returns an empty array indicating no seed data should be generated.
 * This seed will be implemented in Phase 2 (P2-02: Seed Loader).
 *
 * @param _context - The seed context containing faker instance and schema utilities
 * @returns An empty array (no seed data), or an array of User objects
 *
 * @remarks
 * Implementation planned for Phase 2:
 * - Generate 5-10 sample users
 * - Use faker for realistic names and emails
 * - Include test user with known credentials (user1/password)
 * - Vary userStatus values across users
 */
export default async function seed(_context: SeedContext): Promise<unknown[]> {
  // TODO: Implement seed data generation in Phase 2
  // Returning empty array means no initial seed data
  return [];
}
