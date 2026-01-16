/**
 * Seed Loader Module
 *
 * ## What
 * This module provides functionality to dynamically load seed data generator files
 * from a directory. Seeds allow developers to provide consistent, realistic test
 * data for mock responses instead of relying on auto-generated mock data.
 *
 * ## How
 * The loader scans a directory for files matching the `*.seed.{ts,js,mts,mjs}`
 * pattern, dynamically imports each file as an ESM module, validates the default
 * export matches the `SeedCodeGenerator` signature, and builds a map of
 * schemaName → seed function.
 *
 * ## Why
 * Custom seeds enable realistic mock data that better represents production
 * scenarios. By loading seeds dynamically, we support hot reload and allow
 * developers to add new seed files without modifying plugin configuration.
 *
 * @module
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { glob } from 'fast-glob';
import type { Logger } from 'vite';

import type { OpenApiEndpointRegistry } from '../types/registry.js';
// TODO: Full rewrite in subtask vite-open-api-server-thy.3
// Currently using SeedValue but the loader logic needs to be rewritten
// to support object exports instead of function exports
import type { SeedValue } from '../types/seeds.js';

/**
 * Result of loading seeds from a directory.
 *
 * Contains the seed map and any errors encountered during loading.
 */
export interface LoadSeedsResult {
  /**
   * Map of schema name to seed value (string or function).
   */
  seeds: Map<string, SeedValue>;

  /**
   * Errors encountered during loading (file path → error message).
   */
  errors: string[];
}

/**
 * Load seed data generator files from a directory.
 *
 * Scans for `*.seed.{ts,js,mts,mjs}` files, validates exports,
 * and returns a map of schemaName → seed function.
 *
 * The loader is resilient: if one seed file fails to load or validate,
 * it logs the error and continues with the remaining files.
 *
 * @param seedsDir - Directory containing seed files
 * @param registry - OpenAPI endpoint registry (for schema validation)
 * @param logger - Vite logger
 * @returns Promise resolving to seed map
 *
 * @example
 * ```typescript
 * const seeds = await loadSeeds('./mock/seeds', registry, logger);
 *
 * // Check if a seed exists for a schema
 * if (seeds.has('Pet')) {
 *   const seedFn = seeds.get('Pet');
 *   const data = await seedFn(context);
 * }
 * ```
 */
export async function loadSeeds(
  seedsDir: string,
  registry: OpenApiEndpointRegistry,
  logger: Logger,
): Promise<Map<string, SeedValue>> {
  // TODO: Rewrite to load object exports { schemaName: string | fn } instead of default function
  const seeds = new Map<string, SeedValue>();
  const errors: string[] = [];

  try {
    // Resolve to absolute path
    const absoluteDir = path.resolve(seedsDir);

    // Scan for seed files
    const files = await glob('**/*.seed.{ts,js,mts,mjs}', {
      cwd: absoluteDir,
      absolute: true,
    });

    if (files.length === 0) {
      logger.warn(`[seed-loader] No seed files found in ${seedsDir}`);
      return seeds;
    }

    logger.info(`[seed-loader] Found ${files.length} seed file(s)`);

    // Load each seed file
    for (const filePath of files) {
      try {
        // Dynamic import (ESM)
        const fileUrl = pathToFileURL(filePath).href;
        const module = await import(fileUrl);

        // TODO: Rewrite validation - should check for object export, not function
        // Validate default export (temporary - accepts both old and new format)
        if (!module.default) {
          throw new Error(`Seed file must have a default export`);
        }

        // Extract schema name from filename
        const filename = path.basename(filePath);
        const baseSchemaName = extractSchemaName(filename);

        // Try to match with registry schemas (handle singular/plural)
        const schemaName = findMatchingSchema(baseSchemaName, registry);

        if (!schemaName) {
          logger.warn(
            `[seed-loader] Seed "${baseSchemaName}" does not match any schema in OpenAPI spec`,
          );
        }

        const finalSchemaName = schemaName || capitalize(baseSchemaName);

        // Add to map (warn on duplicates)
        if (seeds.has(finalSchemaName)) {
          logger.warn(`[seed-loader] Duplicate seed for "${finalSchemaName}", overwriting`);
        }

        // TODO: Handle object exports properly - for now cast to SeedValue
        seeds.set(finalSchemaName, module.default as SeedValue);
        logger.info(`[seed-loader] Loaded seed: ${finalSchemaName}`);
      } catch (error) {
        const err = error as Error;
        const errorMessage = `${filePath}: ${err.message}`;
        errors.push(errorMessage);
        logger.error(`[seed-loader] Failed to load ${filePath}: ${err.message}`);
      }
    }

    // Cross-reference with registry is done during loading (warnings logged above)

    // Log summary
    const successCount = seeds.size;
    const errorCount = errors.length;
    logger.info(`[seed-loader] Loaded ${successCount} seed(s), ${errorCount} error(s)`);

    return seeds;
  } catch (error) {
    const err = error as Error;
    logger.error(`[seed-loader] Fatal error: ${err.message}`);
    return seeds;
  }
}

/**
 * Extract schema name from seed filename.
 *
 * Removes the `.seed.{ext}` suffix and returns the base name.
 *
 * @param filename - Seed filename (e.g., 'pets.seed.ts')
 * @returns Base schema name (e.g., 'pets')
 *
 * @example
 * ```typescript
 * extractSchemaName('pets.seed.ts');     // 'pets'
 * extractSchemaName('Pet.seed.mjs');     // 'Pet'
 * extractSchemaName('order-items.seed.js'); // 'order-items'
 * ```
 */
export function extractSchemaName(filename: string): string {
  // Remove extension(s): .seed.ts, .seed.js, .seed.mts, .seed.mjs
  return filename.replace(/\.seed\.(ts|js|mts|mjs)$/, '');
}

/**
 * Find matching schema name in registry.
 *
 * Tries multiple candidates: exact match, capitalized, singular, plural forms.
 *
 * @param baseName - Base name extracted from filename (e.g., 'pets')
 * @param registry - OpenAPI endpoint registry with schemas
 * @returns Matching schema name or null if no match found
 *
 * @example
 * ```typescript
 * // If registry has 'Pet' schema:
 * findMatchingSchema('pets', registry);   // 'Pet'
 * findMatchingSchema('pet', registry);    // 'Pet'
 * findMatchingSchema('Pet', registry);    // 'Pet'
 * findMatchingSchema('Pets', registry);   // null (if only 'Pet' exists)
 * ```
 */
export function findMatchingSchema(
  baseName: string,
  registry: OpenApiEndpointRegistry,
): string | null {
  // Generate candidates in order of priority
  const candidates = [
    baseName, // exact match first
    capitalize(baseName), // Pets
    capitalize(singularize(baseName)), // Pet (from pets)
    singularize(baseName), // pet (from pets)
    pluralize(capitalize(baseName)), // Pets (from pet)
    capitalize(pluralize(baseName)), // Pets (alternative)
  ];

  // Remove duplicates while preserving order
  const uniqueCandidates = [...new Set(candidates)];

  for (const candidate of uniqueCandidates) {
    if (registry.schemas.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Capitalize first letter of a string.
 *
 * @param str - String to capitalize (e.g., 'pets')
 * @returns Capitalized string (e.g., 'Pets')
 *
 * @example
 * ```typescript
 * capitalize('pets');   // 'Pets'
 * capitalize('Pet');    // 'Pet'
 * capitalize('');       // ''
 * ```
 */
export function capitalize(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Simple singularization: remove trailing 's'.
 *
 * This is a basic implementation. For more accurate singularization,
 * consider using a library like 'pluralize'.
 *
 * @param str - String to singularize (e.g., 'pets')
 * @returns Singularized string (e.g., 'pet')
 *
 * @example
 * ```typescript
 * singularize('pets');     // 'pet'
 * singularize('orders');   // 'order'
 * singularize('pet');      // 'pet' (no change)
 * singularize('status');   // 'statu' (limitation of simple approach)
 * ```
 */
export function singularize(str: string): string {
  if (str.length === 0) return str;

  // Handle common irregular plurals
  const irregulars: Record<string, string> = {
    statuses: 'status',
    addresses: 'address',
    categories: 'category',
    companies: 'company',
  };

  const lower = str.toLowerCase();
  if (irregulars[lower]) {
    // Preserve original case of first letter
    const result = irregulars[lower];
    return str.charAt(0) === str.charAt(0).toUpperCase() ? capitalize(result) : result;
  }

  // Handle -ies → -y (e.g., categories → category)
  if (str.endsWith('ies')) {
    return `${str.slice(0, -3)}y`;
  }

  // Handle -es endings for words ending in -s, -x, -z, -ch, -sh
  if (str.endsWith('es')) {
    const stem = str.slice(0, -2);
    if (
      stem.endsWith('s') ||
      stem.endsWith('x') ||
      stem.endsWith('z') ||
      stem.endsWith('ch') ||
      stem.endsWith('sh')
    ) {
      return stem;
    }
  }

  // Default: remove trailing 's'
  if (str.endsWith('s') && !str.endsWith('ss')) {
    return str.slice(0, -1);
  }

  return str;
}

/**
 * Simple pluralization: add trailing 's'.
 *
 * This is a basic implementation. For more accurate pluralization,
 * consider using a library like 'pluralize'.
 *
 * @param str - String to pluralize (e.g., 'pet')
 * @returns Pluralized string (e.g., 'pets')
 *
 * @example
 * ```typescript
 * pluralize('pet');      // 'pets'
 * pluralize('order');    // 'orders'
 * pluralize('pets');     // 'petss' (limitation - already plural)
 * ```
 */
export function pluralize(str: string): string {
  if (str.length === 0) return str;

  // Already ends in 's', assume already plural
  if (str.endsWith('s')) {
    return str;
  }

  // Handle -y → -ies (e.g., category → categories)
  if (str.endsWith('y') && str.length > 1) {
    const beforeY = str.charAt(str.length - 2);
    // Only change if preceded by consonant
    if (!'aeiou'.includes(beforeY.toLowerCase())) {
      return `${str.slice(0, -1)}ies`;
    }
  }

  // Handle words ending in -s, -x, -z, -ch, -sh → add -es
  if (
    str.endsWith('s') ||
    str.endsWith('x') ||
    str.endsWith('z') ||
    str.endsWith('ch') ||
    str.endsWith('sh')
  ) {
    return `${str}es`;
  }

  // Default: add 's'
  return `${str}s`;
}
