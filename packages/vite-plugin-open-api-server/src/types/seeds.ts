/**
 * Seed Type Definitions
 *
 * ## What
 * This module defines the types for seed data generators. Seeds allow
 * users to provide consistent, realistic test data for mock responses
 * instead of relying on auto-generated mock data.
 *
 * ## How
 * Seed files export an async function that receives a `SeedContext`
 * with access to a faker instance, logger, registry, and schema name.
 * Seeds return an array of objects matching the target schema.
 *
 * ## Why
 * Custom seeds enable realistic mock data that better represents
 * production scenarios. With access to faker and schema information,
 * seeds can generate consistent, deterministic data that helps with
 * testing and development workflows.
 *
 * @module
 */

import type { Faker } from '@faker-js/faker';
import type { Logger } from 'vite';
import type { OpenApiEndpointRegistry } from './registry.js';

/**
 * Context object passed to seed generator functions.
 *
 * Provides access to a faker instance for generating realistic data,
 * the OpenAPI registry for schema information, and a logger for
 * debugging seed generation.
 *
 * @example
 * ```typescript
 * // Seed file: Pet.seed.mjs
 * export default async function seed(context: SeedContext) {
 *   const { faker, logger, schemaName } = context;
 *
 *   logger.info(`Generating seed data for ${schemaName}`);
 *
 *   return Array.from({ length: 10 }, (_, i) => ({
 *     id: i + 1,
 *     name: faker.animal.petName(),
 *     status: faker.helpers.arrayElement(['available', 'pending', 'sold']),
 *     category: {
 *       id: faker.number.int({ min: 1, max: 5 }),
 *       name: faker.helpers.arrayElement(['Dogs', 'Cats', 'Birds']),
 *     },
 *     tags: [
 *       { id: 1, name: faker.word.adjective() },
 *       { id: 2, name: faker.word.adjective() },
 *     ],
 *   }));
 * }
 * ```
 */
export interface SeedContext {
  /**
   * Faker.js instance for generating realistic fake data.
   *
   * Provides access to all faker modules (person, animal, commerce, etc.)
   * for generating consistent, realistic test data.
   *
   * Note: @faker-js/faker is a peer dependency and may not be installed.
   * Check for undefined before using.
   *
   * @see https://fakerjs.dev/
   *
   * @example
   * ```typescript
   * const name = context.faker.person.fullName();
   * const email = context.faker.internet.email();
   * const price = context.faker.commerce.price();
   * ```
   */
  faker: Faker;

  /**
   * Vite logger for logging seed generation progress.
   *
   * Use this logger instead of console.log to integrate with Vite's
   * logging system and respect the user's verbose setting.
   */
  logger: Logger;

  /**
   * OpenAPI registry with read-only access to schemas.
   *
   * Use the registry to access schema definitions for generating
   * data that matches the expected structure.
   */
  registry: Readonly<OpenApiEndpointRegistry>;

  /**
   * Schema name this seed is generating data for.
   *
   * Corresponds to a schema name from `components.schemas` in the
   * OpenAPI spec. Use this to generate schema-appropriate data.
   *
   * @example 'Pet', 'User', 'Order'
   */
  schemaName: string;

  /**
   * Operation ID this seed is associated with.
   *
   * Useful for generating operation-specific seed data or for
   * logging purposes.
   *
   * @example 'listPets', 'getPetById', 'createPet'
   */
  operationId?: string;

  /**
   * Number of seed items to generate (suggested).
   *
   * This is a hint from the plugin about how many items to generate.
   * Seed functions may generate more or fewer items as needed.
   *
   * @default 10
   */
  count?: number;

  /**
   * Environment variables accessible to seed functions.
   *
   * Allows seeds to behave differently based on environment settings.
   */
  env: Record<string, string | undefined>;
}

/**
 * Seed data returned by generator functions.
 *
 * An array of objects that match the schema being seeded.
 * The exact structure depends on the target schema.
 *
 * @example
 * ```typescript
 * // Pet seed data
 * const petSeeds: SeedData = [
 *   { id: 1, name: 'Fluffy', status: 'available' },
 *   { id: 2, name: 'Buddy', status: 'pending' },
 *   { id: 3, name: 'Max', status: 'sold' },
 * ];
 *
 * // User seed data
 * const userSeeds: SeedData = [
 *   { id: 1, username: 'john_doe', email: 'john@example.com' },
 *   { id: 2, username: 'jane_doe', email: 'jane@example.com' },
 * ];
 * ```
 */
export type SeedData = unknown[];

/**
 * Seed generator function signature.
 *
 * Async function that receives a seed context and returns an array
 * of seed objects matching the target schema.
 *
 * @example
 * ```typescript
 * // Basic seed generator
 * const petSeedGenerator: SeedCodeGenerator = async (context) => {
 *   const { faker, count = 10 } = context;
 *
 *   return Array.from({ length: count }, (_, i) => ({
 *     id: i + 1,
 *     name: faker.animal.petName(),
 *     status: faker.helpers.arrayElement(['available', 'pending', 'sold']),
 *   }));
 * };
 *
 * // Seed generator using schema information
 * const dynamicSeedGenerator: SeedCodeGenerator = async (context) => {
 *   const { faker, registry, schemaName } = context;
 *   const schema = registry.schemas.get(schemaName);
 *
 *   if (!schema) {
 *     return [];
 *   }
 *
 *   // Generate data based on schema properties
 *   return generateFromSchema(faker, schema.schema);
 * };
 * ```
 */
export type SeedCodeGenerator = (context: SeedContext) => Promise<SeedData>;

/**
 * Expected exports from seed files.
 *
 * Seed files must default export an async function matching the
 * `SeedCodeGenerator` signature. Named exports are ignored.
 *
 * @example
 * ```typescript
 * // Pet.seed.mjs
 * export default async function seed(context) {
 *   const { faker } = context;
 *
 *   return Array.from({ length: 10 }, (_, i) => ({
 *     id: i + 1,
 *     name: faker.animal.petName(),
 *     status: faker.helpers.arrayElement(['available', 'pending', 'sold']),
 *   }));
 * }
 *
 * // Or with TypeScript types
 * import type { SeedCodeGenerator } from '@websublime/vite-plugin-open-api-server';
 *
 * const seed: SeedCodeGenerator = async (context) => {
 *   const { faker } = context;
 *
 *   return Array.from({ length: 10 }, (_, i) => ({
 *     id: i + 1,
 *     name: faker.animal.petName(),
 *     status: faker.helpers.arrayElement(['available', 'pending', 'sold']),
 *   }));
 * };
 *
 * export default seed;
 * ```
 */
export interface SeedFileExports {
  /**
   * Default export must be a seed generator function.
   */
  default: SeedCodeGenerator;
}
