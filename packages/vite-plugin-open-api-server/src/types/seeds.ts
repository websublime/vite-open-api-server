/**
 * Seed Type Definitions
 *
 * ## What
 * This module defines the types for seed data generators that inject
 * x-seed code into OpenAPI schemas for the Scalar Mock Server.
 *
 * ## How
 * Seed files export an object mapping schemaName to JavaScript code.
 * The code can be a static string or a function that generates code
 * dynamically based on the schema context.
 *
 * ## Why
 * The Scalar Mock Server expects x-seed extensions as JavaScript code
 * strings in the OpenAPI document's schema definitions. This approach
 * allows seeds to use Scalar's runtime context (seed, store, faker)
 * directly in the code to populate the in-memory store.
 *
 * @see https://scalar.com/products/mock-server/data-seeding
 *
 * @module
 */

import type { OpenAPIV3_1 } from 'openapi-types';

/**
 * Context provided to dynamic seed code generators.
 *
 * This context allows seed functions to generate schema-specific
 * JavaScript code based on the OpenAPI specification.
 *
 * @example
 * ```typescript
 * // Dynamic seed that generates code based on schema relationships
 * const Order: SeedCodeGeneratorFn = ({ schemas }) => {
 *   const hasPet = 'Pet' in schemas;
 *
 *   return `
 *     seed.count(20, (index) => ({
 *       id: faker.number.int({ min: 1, max: 10000 }),
 *       ${hasPet ? 'petId: store.list("Pet")[index % 15]?.id,' : 'petId: faker.number.int(),'}
 *       quantity: faker.number.int({ min: 1, max: 5 }),
 *       status: faker.helpers.arrayElement(['placed', 'approved', 'delivered']),
 *       complete: faker.datatype.boolean()
 *     }))
 *   `;
 * };
 * ```
 */
export interface SeedCodeContext {
  /**
   * The schema name this seed is for.
   *
   * @example 'Pet', 'Order', 'User', 'Category'
   */
  schemaName: string;

  /**
   * Full OpenAPI schema object for this schema.
   *
   * Contains type, properties, required fields, etc.
   * Use this to generate context-aware seed code.
   */
  schema: OpenAPIV3_1.SchemaObject;

  /**
   * Complete OpenAPI document for reference.
   *
   * Use this to access other parts of the spec like
   * paths, security schemes, or other components.
   */
  document: OpenAPIV3_1.Document;

  /**
   * Available schemas from components/schemas.
   *
   * Pre-extracted for convenience when generating code that
   * needs to reference relationships between schemas.
   */
  schemas: Record<string, OpenAPIV3_1.SchemaObject>;
}

/**
 * Function signature for dynamic seed code generation.
 *
 * Receives schema context and returns JavaScript code as a string.
 * The returned code will be injected as x-seed in the OpenAPI spec.
 *
 * The code has access to Scalar's runtime context:
 * - `seed` - Seed helper: seed(array), seed(factory), seed.count(n, factory)
 * - `store` - Direct store access for relationships
 * - `faker` - Faker.js instance for data generation
 * - `schema` - Schema key name
 *
 * @example
 * ```typescript
 * const Pet: SeedCodeGeneratorFn = ({ schema }) => {
 *   const hasStatus = schema.properties?.status;
 *
 *   return `
 *     seed.count(15, () => ({
 *       id: faker.number.int({ min: 1, max: 10000 }),
 *       name: faker.animal.dog(),
 *       ${hasStatus ? "status: faker.helpers.arrayElement(['available', 'pending', 'sold'])," : ''}
 *       photoUrls: [faker.image.url()],
 *     }))
 *   `;
 * };
 * ```
 */
export type SeedCodeGeneratorFn = (context: SeedCodeContext) => string | Promise<string>;

/**
 * Seed value - either static code or a dynamic code generator.
 *
 * - **String**: Static JavaScript code injected directly as x-seed
 * - **Function**: Called with context to generate JavaScript code
 *
 * @example
 * ```typescript
 * // Static seed (simple, no context needed)
 * const Pet: SeedValue = `
 *   seed.count(15, () => ({
 *     id: faker.number.int({ min: 1, max: 10000 }),
 *     name: faker.animal.dog(),
 *     status: faker.helpers.arrayElement(['available', 'pending', 'sold']),
 *     category: {
 *       id: faker.number.int({ min: 1, max: 5 }),
 *       name: faker.helpers.arrayElement(['Dogs', 'Cats', 'Birds'])
 *     },
 *     photoUrls: [faker.image.url()],
 *     tags: [{ id: faker.number.int({ min: 1, max: 100 }), name: faker.word.adjective() }]
 *   }))
 * `;
 *
 * // Dynamic seed (generates code based on schema)
 * const Order: SeedValue = ({ schemas }) => {
 *   const hasPet = 'Pet' in schemas;
 *   return `
 *     seed.count(20, (index) => ({
 *       id: faker.number.int(),
 *       petId: ${hasPet ? 'store.list("Pet")[index % 15]?.id' : 'faker.number.int()'},
 *       status: faker.helpers.arrayElement(['placed', 'approved', 'delivered'])
 *     }))
 *   `;
 * };
 * ```
 */
export type SeedValue = string | SeedCodeGeneratorFn;

/**
 * Seed file exports structure.
 *
 * Seed files export an object mapping schemaName to seed values.
 * Each value is either a JavaScript code string or a function that
 * generates code.
 *
 * @example
 * ```typescript
 * // pets.seed.mjs
 * export default {
 *   // Static: Simple code string for Pet schema
 *   Pet: `
 *     seed.count(15, () => ({
 *       id: faker.number.int({ min: 1, max: 10000 }),
 *       name: faker.animal.dog(),
 *       status: faker.helpers.arrayElement(['available', 'pending', 'sold']),
 *       category: {
 *         id: faker.number.int({ min: 1, max: 5 }),
 *         name: faker.helpers.arrayElement(['Dogs', 'Cats', 'Birds'])
 *       },
 *       photoUrls: [faker.image.url()],
 *       tags: [{ id: faker.number.int({ min: 1, max: 100 }), name: faker.word.adjective() }]
 *     }))
 *   `,
 *
 *   // Static: Category seed
 *   Category: `
 *     seed([
 *       { id: 1, name: 'Dogs' },
 *       { id: 2, name: 'Cats' },
 *       { id: 3, name: 'Birds' },
 *       { id: 4, name: 'Fish' },
 *       { id: 5, name: 'Reptiles' }
 *     ])
 *   `,
 *
 *   // Dynamic: Function that generates code based on available schemas
 *   Order: ({ schemas }) => {
 *     const hasPet = 'Pet' in schemas;
 *     return `
 *       seed.count(20, (index) => ({
 *         id: faker.number.int({ min: 1, max: 10000 }),
 *         petId: ${hasPet ? 'store.list("Pet")[index % 15]?.id' : 'faker.number.int()'},
 *         quantity: faker.number.int({ min: 1, max: 5 }),
 *         shipDate: faker.date.future().toISOString(),
 *         status: faker.helpers.arrayElement(['placed', 'approved', 'delivered']),
 *         complete: faker.datatype.boolean()
 *       }))
 *     `;
 *   },
 * };
 * ```
 */
export interface SeedFileExports {
  /**
   * Default export must be an object mapping schemaName to seed values.
   */
  default: SeedExports;
}

/**
 * Map of schemaName to seed values.
 *
 * This is the expected structure of the default export from seed files.
 */
export type SeedExports = Record<string, SeedValue>;

/**
 * Result of loading and resolving seed files.
 *
 * After loading, all seeds are resolved to their final code strings
 * for injection into the OpenAPI document.
 */
export type ResolvedSeeds = Map<string, string>;

/**
 * Seed loading result with metadata.
 */
export interface SeedLoadResult {
  /**
   * Map of schemaName to seed value (string or function).
   */
  seeds: Map<string, SeedValue>;

  /**
   * Files that were successfully loaded.
   */
  loadedFiles: string[];

  /**
   * Warnings encountered during loading.
   */
  warnings: string[];

  /**
   * Errors encountered during loading.
   */
  errors: string[];
}
