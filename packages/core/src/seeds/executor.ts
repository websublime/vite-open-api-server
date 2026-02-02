/**
 * Seed Executor
 *
 * What: Executes seed functions to populate the store
 * How: Creates SeedHelper, provides context, handles sync/async seeds
 * Why: Enables pre-populated data stores for realistic mock scenarios
 *
 * @remarks
 * Seeds are executed in the order they appear in the seed definition object.
 * Multiple seed files are processed in the order they are provided to executeSeeds.
 *
 * The SeedHelper is a callable object that provides two ways to generate data:
 * 1. Direct array: `seed([item1, item2, ...])`
 * 2. Factory function: `seed(() => generateItem())`
 * 3. Count-based: `seed.count(n, (index) => generateItem(index))`
 */

import { faker } from '@faker-js/faker';
import type { OpenAPIV3_1 } from '@scalar/openapi-types';

import type { Logger } from '../handlers/context.js';
import type { Store } from '../store/index.js';
import type { AnySeedFn, SeedContext, SeedHelper } from './context.js';

/**
 * Error thrown during seed execution
 * Distinguishable from other errors for proper error handling.
 */
export class SeedExecutorError extends Error {
  /** Schema name where the error occurred */
  readonly schemaName: string;

  /** Original error that caused this executor error */
  override readonly cause?: Error;

  constructor(schemaName: string, message: string, cause?: Error) {
    super(`[Seed:${schemaName}] ${message}`);
    this.name = 'SeedExecutorError';
    this.schemaName = schemaName;
    this.cause = cause;

    // Capture V8 stack trace excluding constructor frame
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, SeedExecutorError);
    }
  }
}

/**
 * Options for seed execution
 */
export interface ExecuteSeedsOptions {
  /** Logger for debugging and warnings */
  logger?: Logger;

  /** Whether to validate that schema names exist in the OpenAPI document */
  validateSchemas?: boolean;

  /** Whether to clear existing data before seeding */
  clearBeforeSeeding?: boolean;
}

/**
 * Result of seed execution
 */
export interface ExecuteSeedsResult {
  /** Number of schemas seeded */
  schemaCount: number;

  /** Total number of items created across all schemas */
  totalItems: number;

  /** Breakdown of items created per schema */
  itemsPerSchema: Record<string, number>;

  /** Schemas that were skipped (e.g., not found in document) */
  skippedSchemas: string[];

  /** Errors encountered during seeding (non-fatal) */
  warnings: string[];
}

/**
 * Create a SeedHelper instance
 *
 * The SeedHelper is a callable object that can be invoked with either:
 * - An array of items to seed directly
 * - A factory function that returns a single item
 *
 * It also has a `count` method for generating multiple items.
 *
 * @returns SeedHelper callable object
 */
export function createSeedHelper(): SeedHelper {
  /**
   * Main callable - handles both array and factory invocations
   */
  const helper = (dataOrFactory: unknown[] | (() => unknown)): unknown[] => {
    if (Array.isArray(dataOrFactory)) {
      // Direct array - return as-is
      return dataOrFactory;
    }

    if (typeof dataOrFactory === 'function') {
      // Factory function - call once and wrap in array
      return [dataOrFactory()];
    }

    // Invalid input - return empty array
    return [];
  };

  /**
   * Generate N items using a factory function
   */
  helper.count = (n: number, factory: (index: number) => unknown): unknown[] => {
    if (n <= 0 || !Number.isInteger(n)) {
      return [];
    }
    return Array.from({ length: n }, (_, index) => factory(index));
  };

  return helper as SeedHelper;
}

/**
 * Create a SeedContext for a specific schema
 *
 * @param schemaName - Name of the schema being seeded
 * @param store - Store instance for data access
 * @param document - OpenAPI document for schema lookup
 * @param logger - Logger for debugging
 * @returns SeedContext for the seed function
 */
export function createSeedContext(
  schemaName: string,
  store: Store,
  document: OpenAPIV3_1.Document,
  logger: Logger,
): SeedContext {
  const schemas = document.components?.schemas ?? {};
  const schema = (schemas[schemaName] as OpenAPIV3_1.SchemaObject | undefined) ?? {
    type: 'object',
  };

  return {
    seed: createSeedHelper(),
    store,
    faker,
    schema,
    logger,
  };
}

/**
 * Add a warning to the result and optionally log it
 */
function addWarning(
  result: ExecuteSeedsResult,
  warning: string,
  logger: Logger,
  schemaName?: string,
): void {
  result.warnings.push(warning);
  if (schemaName) {
    result.skippedSchemas.push(schemaName);
  }
  logger.warn?.(`[Seed Executor] ${warning}`);
}

/**
 * Validate that a schema exists in the document
 * @returns true if schema should be skipped, false otherwise
 */
function shouldSkipSchema(
  schemaName: string,
  validateSchemas: boolean,
  documentSchemas: Record<string, unknown>,
  result: ExecuteSeedsResult,
  logger: Logger,
): boolean {
  if (validateSchemas && !(schemaName in documentSchemas)) {
    addWarning(
      result,
      `Schema '${schemaName}' not found in OpenAPI document. Skipping.`,
      logger,
      schemaName,
    );
    return true;
  }
  return false;
}

/**
 * Add items to the store, tracking count and any errors
 */
function addItemsToStore(
  schemaName: string,
  items: unknown[],
  store: Store,
  result: ExecuteSeedsResult,
  logger: Logger,
): number {
  let itemCount = 0;
  for (const item of items) {
    try {
      store.create(schemaName, item);
      itemCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addWarning(result, `Failed to create item in '${schemaName}': ${errorMessage}`, logger);
    }
  }
  return itemCount;
}

/**
 * Process a single schema's seed function
 */
async function processSchemaSeed(
  schemaName: string,
  seedFn: AnySeedFn,
  store: Store,
  document: OpenAPIV3_1.Document,
  result: ExecuteSeedsResult,
  logger: Logger,
): Promise<void> {
  const context = createSeedContext(schemaName, store, document, logger);
  const items = await Promise.resolve(seedFn(context));

  if (!Array.isArray(items)) {
    addWarning(
      result,
      `Seed function for '${schemaName}' did not return an array. Skipping.`,
      logger,
      schemaName,
    );
    return;
  }

  const itemCount = addItemsToStore(schemaName, items, store, result, logger);

  result.schemaCount++;
  result.totalItems += itemCount;
  result.itemsPerSchema[schemaName] = itemCount;

  logger.debug?.(`[Seed Executor] Seeded ${itemCount} items for schema '${schemaName}'`);
}

/**
 * Execute seeds to populate the store
 *
 * Iterates through all provided seed functions, creates appropriate contexts,
 * and populates the store with the generated data.
 *
 * @param seeds - Map of schema names to seed functions
 * @param store - Store to populate with seed data
 * @param document - OpenAPI document for schema lookup and validation
 * @param options - Execution options
 * @returns Result with counts and any warnings
 *
 * @example
 * ```typescript
 * const seeds = new Map<string, AnySeedFn>();
 * seeds.set('Pet', ({ seed, faker }) => seed.count(10, (i) => ({
 *   id: i + 1,
 *   name: faker.animal.dog(),
 * })));
 *
 * const result = await executeSeeds(seeds, store, document, {
 *   logger: console,
 *   validateSchemas: true,
 *   clearBeforeSeeding: true,
 * });
 *
 * console.log(`Seeded ${result.totalItems} items across ${result.schemaCount} schemas`);
 * ```
 */
export async function executeSeeds(
  seeds: Map<string, AnySeedFn>,
  store: Store,
  document: OpenAPIV3_1.Document,
  options: ExecuteSeedsOptions = {},
): Promise<ExecuteSeedsResult> {
  const { logger = console, validateSchemas = false, clearBeforeSeeding = false } = options;

  const result: ExecuteSeedsResult = {
    schemaCount: 0,
    totalItems: 0,
    itemsPerSchema: {},
    skippedSchemas: [],
    warnings: [],
  };

  const documentSchemas = document.components?.schemas ?? {};

  if (clearBeforeSeeding) {
    store.clearAll();
    logger.debug?.('[Seed Executor] Cleared store before seeding');
  }

  for (const [schemaName, seedFn] of seeds) {
    if (shouldSkipSchema(schemaName, validateSchemas, documentSchemas, result, logger)) {
      continue;
    }

    try {
      await processSchemaSeed(schemaName, seedFn, store, document, result, logger);
    } catch (error) {
      const cause = error instanceof Error ? error : new Error(String(error));
      throw new SeedExecutorError(
        schemaName,
        `Seed function execution failed: ${cause.message}`,
        cause,
      );
    }
  }

  logger.info?.(
    `[Seed Executor] Completed: ${result.totalItems} items across ${result.schemaCount} schemas`,
  );

  return result;
}

/**
 * Execute seeds from a SeedDefinition object
 *
 * Convenience wrapper that converts a SeedDefinition object to a Map
 * and calls executeSeeds.
 *
 * @param seedDefinition - Object mapping schema names to seed functions
 * @param store - Store to populate with seed data
 * @param document - OpenAPI document for schema lookup
 * @param options - Execution options
 * @returns Result with counts and any warnings
 */
export async function executeSeedDefinition(
  seedDefinition: Record<string, AnySeedFn>,
  store: Store,
  document: OpenAPIV3_1.Document,
  options: ExecuteSeedsOptions = {},
): Promise<ExecuteSeedsResult> {
  const seeds = new Map<string, AnySeedFn>(Object.entries(seedDefinition));
  return executeSeeds(seeds, store, document, options);
}
