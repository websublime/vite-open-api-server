/**
 * Seed Loading
 *
 * What: Loads seed files from a directory using glob patterns
 * How: Uses Vite's ssrLoadModule to transform and load TypeScript files
 * Why: Enables users to define seed data for schemas in TypeScript
 *
 * @module seeds
 */

import path from 'node:path';
import type { AnySeedFn, Logger, SeedDefinition } from '@websublime/vite-plugin-open-api-core';
import fg from 'fast-glob';
import type { ViteDevServer } from 'vite';
import { directoryExists } from './utils.js';

/**
 * Result of loading seeds
 */
export interface LoadSeedsResult {
  /** Map of schema name to seed function */
  seeds: Map<string, AnySeedFn>;
  /** Number of seed files loaded */
  fileCount: number;
  /** List of loaded file paths (relative) */
  files: string[];
}

/**
 * Load seeds from a directory
 *
 * Searches for seed files matching the pattern `*.seeds.{ts,js,mjs}`
 * in the specified directory. Each file should export an object with
 * schema name keys and seed functions as values.
 *
 * Uses Vite's ssrLoadModule to transform TypeScript files on-the-fly.
 *
 * @example
 * ```typescript
 * // mocks/seeds/pets.seeds.ts
 * import { defineSeeds } from '@websublime/vite-plugin-open-api-core';
 *
 * export default defineSeeds({
 *   Pet: ({ seed, faker }) => {
 *     return seed.count(10, () => ({
 *       id: faker.number.int({ min: 1, max: 1000 }),
 *       name: faker.animal.dog(),
 *       status: faker.helpers.arrayElement(['available', 'pending', 'sold']),
 *     }));
 *   },
 * });
 * ```
 *
 * @param seedsDir - Directory to search for seed files
 * @param viteServer - Vite dev server instance for ssrLoadModule
 * @param cwd - Current working directory (defaults to process.cwd())
 * @param logger - Optional logger for warnings/errors
 * @returns Promise resolving to loaded seeds
 */
export async function loadSeeds(
  seedsDir: string,
  viteServer: ViteDevServer,
  cwd: string = process.cwd(),
  logger: Logger = console,
): Promise<LoadSeedsResult> {
  const seeds = new Map<string, AnySeedFn>();
  const absoluteDir = path.resolve(cwd, seedsDir);

  // Check if directory exists
  const dirExists = await directoryExists(absoluteDir);
  if (!dirExists) {
    return {
      seeds,
      fileCount: 0,
      files: [],
    };
  }

  // Find seed files (supports TypeScript via Vite's transform)
  const pattern = '**/*.seeds.{ts,js,mjs}';
  const files = await fg(pattern, {
    cwd: absoluteDir,
    absolute: false,
    onlyFiles: true,
    ignore: ['node_modules/**', 'dist/**'],
  });

  // Load each file using Vite's ssrLoadModule
  for (const file of files) {
    const absolutePath = path.join(absoluteDir, file);
    const fileSeeds = await loadSeedFile(absolutePath, viteServer, logger);

    // Merge seeds
    for (const [schemaName, seedFn] of Object.entries(fileSeeds)) {
      if (seeds.has(schemaName)) {
        logger.warn(
          `[vite-plugin-open-api-server] Duplicate seed for schema "${schemaName}" in ${file}. Using last definition.`,
        );
      }
      seeds.set(schemaName, seedFn);
    }
  }

  return {
    seeds,
    fileCount: files.length,
    files,
  };
}

/**
 * Load a single seed file using Vite's ssrLoadModule
 *
 * @param filePath - Absolute path to the seed file
 * @param viteServer - Vite dev server instance
 * @param logger - Logger for warnings/errors
 * @returns Promise resolving to seed definition object
 */
async function loadSeedFile(
  filePath: string,
  viteServer: ViteDevServer,
  logger: Logger,
): Promise<SeedDefinition> {
  try {
    // Invalidate module cache for hot reload
    const moduleNode = viteServer.moduleGraph.getModuleById(filePath);
    if (moduleNode) {
      viteServer.moduleGraph.invalidateModule(moduleNode);
    }

    // Use Vite's ssrLoadModule to transform and load the file
    // This handles TypeScript, ESM, and other transforms automatically
    const module = await viteServer.ssrLoadModule(filePath);

    // Support both default export and named export
    const seeds = module.default ?? module.seeds ?? module;

    // Validate seeds object
    if (!seeds || typeof seeds !== 'object') {
      logger.warn(
        `[vite-plugin-open-api-server] Invalid seed file ${filePath}: expected object export`,
      );
      return {};
    }

    // Filter to only seed functions
    const validSeeds: SeedDefinition = {};
    for (const [key, value] of Object.entries(seeds)) {
      if (typeof value === 'function') {
        validSeeds[key] = value as AnySeedFn;
      }
    }

    return validSeeds;
  } catch (error) {
    logger.error(
      `[vite-plugin-open-api-server] Failed to load seed file ${filePath}:`,
      error instanceof Error ? error.message : error,
    );
    return {};
  }
}

/**
 * Get list of seed files in a directory
 *
 * Useful for file watching setup.
 *
 * @param seedsDir - Directory to search
 * @param cwd - Current working directory
 * @returns Promise resolving to list of absolute file paths
 */
export async function getSeedFiles(
  seedsDir: string,
  cwd: string = process.cwd(),
): Promise<string[]> {
  const absoluteDir = path.resolve(cwd, seedsDir);

  const dirExists = await directoryExists(absoluteDir);
  if (!dirExists) {
    return [];
  }

  const pattern = '**/*.seeds.{ts,js,mjs}';
  const files = await fg(pattern, {
    cwd: absoluteDir,
    absolute: true,
    onlyFiles: true,
    ignore: ['node_modules/**', 'dist/**'],
  });

  return files;
}
