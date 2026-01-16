/**
 * Seed Loader Module
 *
 * ## What
 * This module provides functionality to dynamically load seed data files
 * from a directory. Seeds define JavaScript code that will be injected as
 * `x-seed` extensions into OpenAPI schemas for the Scalar Mock Server.
 *
 * ## How
 * The loader scans a directory for files matching the `*.seed.{ts,js,mts,mjs}`
 * pattern, dynamically imports each file as an ESM module, validates the default
 * export is an object mapping schemaName → seed value, and aggregates all
 * seeds into a single Map.
 *
 * ## Why
 * Custom seeds enable realistic mock data that better represents production
 * scenarios. The code-based format (string or function returning string) allows
 * seeds to access Scalar's runtime context (seed, store, faker).
 *
 * @see https://scalar.com/products/mock-server/data-seeding
 *
 * @module
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fg from 'fast-glob';
import type { Logger } from 'vite';

import type { OpenApiEndpointRegistry } from '../types/registry.js';
import type { SeedExports, SeedLoadResult, SeedValue } from '../types/seeds.js';

/**
 * Load seed data files from a directory.
 *
 * Scans for `*.seed.{ts,js,mts,mjs}` files, validates exports,
 * and returns a map of schemaName → seed value.
 *
 * Seed files must export an object as default export, where each key
 * is a schemaName and each value is either:
 * - A string containing JavaScript code
 * - A function that receives SeedCodeContext and returns a code string
 *
 * The loader is resilient: if one seed file fails to load or validate,
 * it logs the error and continues with the remaining files.
 *
 * @param seedsDir - Directory containing seed files
 * @param registry - OpenAPI endpoint registry (for validation)
 * @param logger - Vite logger
 * @returns Promise resolving to SeedLoadResult
 *
 * @example
 * ```typescript
 * const result = await loadSeeds('./mock/seeds', registry, logger);
 *
 * // Access loaded seeds
 * for (const [schemaName, seedValue] of result.seeds) {
 *   console.log(`Seed for ${schemaName}:`, typeof seedValue);
 * }
 *
 * // Check for issues
 * if (result.errors.length > 0) {
 *   console.error('Seed loading errors:', result.errors);
 * }
 * ```
 */
export async function loadSeeds(
  seedsDir: string,
  registry: OpenApiEndpointRegistry,
  logger: Logger,
): Promise<SeedLoadResult> {
  const seeds = new Map<string, SeedValue>();
  const loadedFiles: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Resolve to absolute path
    const absoluteDir = path.resolve(seedsDir);

    // Scan for seed files
    const files = await fg.glob('**/*.seed.{ts,js,mts,mjs}', {
      cwd: absoluteDir,
      absolute: true,
    });

    if (files.length === 0) {
      const msg = `No seed files found in ${seedsDir}`;
      logger.warn(`[seed-loader] ${msg}`);
      warnings.push(msg);
      return { seeds, loadedFiles, warnings, errors };
    }

    logger.info(`[seed-loader] Found ${files.length} seed file(s)`);

    // Load each seed file
    for (const filePath of files) {
      try {
        await loadSeedFile(filePath, seeds, registry, logger, warnings);
        loadedFiles.push(filePath);
      } catch (error) {
        const err = error as Error;
        const errorMessage = `${filePath}: ${err.message}`;
        errors.push(errorMessage);
        logger.error(`[seed-loader] Failed to load ${filePath}: ${err.message}`);
      }
    }

    // Log summary
    logLoadSummary(seeds.size, loadedFiles.length, warnings.length, errors.length, logger);

    return { seeds, loadedFiles, warnings, errors };
  } catch (error) {
    const err = error as Error;
    const fatalError = `Fatal error scanning seeds directory: ${err.message}`;
    logger.error(`[seed-loader] ${fatalError}`);
    errors.push(fatalError);
    return { seeds, loadedFiles, warnings, errors };
  }
}

/**
 * Load a single seed file and merge its exports into the seeds map.
 */
async function loadSeedFile(
  filePath: string,
  seeds: Map<string, SeedValue>,
  registry: OpenApiEndpointRegistry,
  logger: Logger,
  warnings: string[],
): Promise<void> {
  // Dynamic import (ESM)
  const fileUrl = pathToFileURL(filePath).href;
  const module = await import(fileUrl);

  // Validate default export exists
  if (!module.default) {
    throw new Error('Seed file must have a default export');
  }

  // Validate default export is an object (not function, array, or primitive)
  const exports = module.default;
  if (!isValidExportsObject(exports)) {
    throw new Error(
      'Seed file default export must be an object mapping schemaName to seed values. ' +
        `Got: ${typeof exports}${Array.isArray(exports) ? ' (array)' : typeof exports === 'function' ? ' (function)' : ''}`,
    );
  }

  const seedExports = exports as SeedExports;
  const filename = path.basename(filePath);

  // Process each seed in the exports
  for (const [schemaName, seedValue] of Object.entries(seedExports)) {
    // Validate seed value type
    if (!isValidSeedValue(seedValue)) {
      const msg = `Invalid seed value for "${schemaName}" in ${filename}: expected string or function, got ${typeof seedValue}`;
      warnings.push(msg);
      logger.warn(`[seed-loader] ${msg}`);
      continue;
    }

    // Validate schemaName exists in registry
    const schemaExists = checkSchemaExists(schemaName, registry);
    if (!schemaExists) {
      const msg = `Seed "${schemaName}" in ${filename} does not match any schema in OpenAPI spec`;
      warnings.push(msg);
      logger.warn(`[seed-loader] ${msg}`);
      // Continue anyway - user might know what they're doing
    }

    // Check for duplicates
    if (seeds.has(schemaName)) {
      const msg = `Duplicate seed for "${schemaName}" in ${filename}, overwriting previous`;
      warnings.push(msg);
      logger.warn(`[seed-loader] ${msg}`);
    }

    // Add to seeds map
    seeds.set(schemaName, seedValue);
    logger.info(`[seed-loader] Loaded seed: ${schemaName} (${getSeedType(seedValue)})`);
  }
}

/**
 * Check if a value is a valid exports object (plain object, not array/function).
 */
function isValidExportsObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof value !== 'function' &&
    // Ensure it's a plain object, not a class instance
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Check if a value is a valid seed value (string or function).
 */
function isValidSeedValue(value: unknown): value is SeedValue {
  return typeof value === 'string' || typeof value === 'function';
}

/**
 * Check if a schemaName exists in the registry.
 *
 * Tries multiple candidates: exact match, capitalized, singular, plural forms.
 */
function checkSchemaExists(schemaName: string, registry: OpenApiEndpointRegistry): boolean {
  // Direct match first
  if (registry.schemas.has(schemaName)) {
    return true;
  }

  // Try variations
  const candidates = [
    capitalize(schemaName),
    singularize(schemaName),
    capitalize(singularize(schemaName)),
    pluralize(schemaName),
    capitalize(pluralize(schemaName)),
  ];

  for (const candidate of candidates) {
    if (registry.schemas.has(candidate)) {
      return true;
    }
  }

  return false;
}

/**
 * Get a human-readable type description for a seed value.
 */
function getSeedType(value: SeedValue): string {
  if (typeof value === 'string') {
    return `static, ${value.length} chars`;
  }
  return 'dynamic function';
}

/**
 * Log the loading summary.
 */
function logLoadSummary(
  seedCount: number,
  fileCount: number,
  warningCount: number,
  errorCount: number,
  logger: Logger,
): void {
  const parts = [`${seedCount} seed(s)`, `from ${fileCount} file(s)`];

  if (warningCount > 0) {
    parts.push(`${warningCount} warning(s)`);
  }

  if (errorCount > 0) {
    parts.push(`${errorCount} error(s)`);
  }

  logger.info(`[seed-loader] Summary: ${parts.join(', ')}`);
}

/**
 * Extract schema name from seed filename.
 *
 * Note: This function is no longer used for extraction since seeds
 * now export objects with explicit schemaName keys. Kept for potential
 * future use or backward compatibility.
 *
 * @param filename - Seed filename (e.g., 'pets.seed.ts')
 * @returns Base name without extension (e.g., 'pets')
 *
 * @example
 * ```typescript
 * extractSchemaName('pets.seed.ts');     // 'pets'
 * extractSchemaName('Order.seed.mjs');   // 'Order'
 * ```
 */
export function extractSchemaName(filename: string): string {
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
