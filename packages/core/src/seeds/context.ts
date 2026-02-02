/**
 * Seed Context
 *
 * What: Type definitions for seed execution context
 * How: Interfaces for seed helper, store access, and faker injection
 * Why: Provides type-safe seed development
 *
 * @remarks
 * ## Design Decision: SeedHelper as Callable Object
 *
 * The PRD (Section 3.6 FR-006) shows two patterns for seeding:
 * - `seed([...array])` - Seed with direct array data
 * - `seed.count(n, factory)` - Generate N items using a factory function
 *
 * This implementation uses a callable object pattern where SeedHelper is both:
 * 1. A function that accepts an array or factory
 * 2. An object with a `count` method for generating multiple items
 *
 * This provides a clean, expressive API that matches the PRD examples while
 * maintaining full type safety.
 */

import type { Faker } from '@faker-js/faker';
import type { OpenAPIV3_1 } from '@scalar/openapi-types';
import type { Logger } from '../handlers/context.js';
import type { Store } from '../store/index.js';

/**
 * Seed helper function type
 *
 * A callable object that provides two ways to generate seed data:
 * 1. Call directly with array: `seed([item1, item2, ...])`
 * 2. Call with factory: `seed(() => generateItem())`
 * 3. Use count method: `seed.count(10, (index) => generateItem(index))`
 */
export interface SeedHelper {
  /**
   * Seed with an array of items
   * @param data - Array of items to seed
   * @returns The same array (for chaining or inspection)
   */
  (data: unknown[]): unknown[];

  /**
   * Seed with a single factory function
   * @param factory - Function that returns a single item
   * @returns Array containing the single generated item
   */
  (factory: () => unknown): unknown[];

  /**
   * Generate N items using a factory function
   * @param n - Number of items to generate
   * @param factory - Function that receives index and returns an item
   * @returns Array of generated items
   */
  count: (n: number, factory: (index: number) => unknown) => unknown[];
}

/**
 * Context provided to seed functions
 *
 * Provides access to:
 * - `seed`: Helper for generating items
 * - `store`: Access to already seeded data (for cross-schema relationships)
 * - `faker`: Faker.js instance for generating realistic data
 * - `schema`: OpenAPI schema definition for the current type
 * - `logger`: Logger for debugging seed execution
 */
export interface SeedContext {
  /** Seed helper for generating items */
  seed: SeedHelper;

  /** Store for accessing already seeded data */
  store: Store;

  /** Faker.js instance for data generation */
  faker: Faker;

  /** OpenAPI schema definition for the seeded type */
  schema: OpenAPIV3_1.SchemaObject;

  /** Logger for debugging */
  logger: Logger;
}

/**
 * Single seed function signature
 *
 * Takes a SeedContext and returns an array of items to add to the store.
 */
export type SeedFn = (context: SeedContext) => unknown[];

/**
 * Async seed function signature
 *
 * Takes a SeedContext and returns a promise resolving to an array of items.
 */
export type AsyncSeedFn = (context: SeedContext) => Promise<unknown[]>;

/**
 * Seed function that can be sync or async
 */
export type AnySeedFn = (context: SeedContext) => unknown[] | Promise<unknown[]>;
