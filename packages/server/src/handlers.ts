/**
 * Handler Loading
 *
 * What: Loads handler files from a directory using glob patterns
 * How: Uses Vite's ssrLoadModule to transform and load TypeScript files
 * Why: Enables users to define custom handlers for operationIds in TypeScript
 *
 * @module handlers
 */

import path from 'node:path';
import type { HandlerDefinition, HandlerFn, Logger } from '@websublime/vite-open-api-core';
import fg from 'fast-glob';
import type { ViteDevServer } from 'vite';
import { directoryExists } from './utils.js';

/**
 * Result of loading handlers
 */
export interface LoadHandlersResult {
  /** Map of operationId to handler function */
  handlers: Map<string, HandlerFn>;
  /** Number of handler files loaded */
  fileCount: number;
  /** List of loaded file paths (relative) */
  files: string[];
}

/**
 * Load handlers from a directory
 *
 * Searches for handler files matching the pattern `*.handlers.{ts,js,mjs}`
 * in the specified directory. Each file should export an object with
 * operationId keys and handler functions as values.
 *
 * Uses Vite's ssrLoadModule to transform TypeScript files on-the-fly.
 *
 * @example
 * ```typescript
 * // mocks/handlers/pets.handlers.ts
 * import { defineHandlers } from '@websublime/vite-open-api-core';
 *
 * export default defineHandlers({
 *   getPetById: async ({ req, store }) => {
 *     const pet = store.get('Pet', req.params.petId);
 *     return pet ?? { status: 404, data: { message: 'Pet not found' } };
 *   },
 * });
 * ```
 *
 * @param handlersDir - Directory to search for handler files
 * @param viteServer - Vite dev server instance for ssrLoadModule
 * @param cwd - Current working directory (defaults to process.cwd())
 * @param logger - Optional logger for warnings/errors
 * @returns Promise resolving to loaded handlers
 */
export async function loadHandlers(
  handlersDir: string,
  viteServer: ViteDevServer,
  cwd: string = process.cwd(),
  logger: Logger = console,
): Promise<LoadHandlersResult> {
  const handlers = new Map<string, HandlerFn>();
  const absoluteDir = path.resolve(cwd, handlersDir);

  // Check if directory exists
  const dirExists = await directoryExists(absoluteDir);
  if (!dirExists) {
    return {
      handlers,
      fileCount: 0,
      files: [],
    };
  }

  // Find handler files (supports TypeScript via Vite's transform)
  const pattern = '**/*.handlers.{ts,js,mjs}';
  const files = await fg(pattern, {
    cwd: absoluteDir,
    absolute: false,
    onlyFiles: true,
    ignore: ['node_modules/**', 'dist/**'],
  });

  // Load each file using Vite's ssrLoadModule
  for (const file of files) {
    const absolutePath = path.join(absoluteDir, file);
    const fileHandlers = await loadHandlerFile(absolutePath, viteServer, logger);

    // Merge handlers
    for (const [operationId, handler] of Object.entries(fileHandlers)) {
      if (handlers.has(operationId)) {
        logger.warn(
          `[vite-plugin-open-api-server] Duplicate handler for operationId "${operationId}" in ${file}. Using last definition.`,
        );
      }
      handlers.set(operationId, handler);
    }
  }

  return {
    handlers,
    fileCount: files.length,
    files,
  };
}

/**
 * Load a single handler file using Vite's ssrLoadModule
 *
 * @param filePath - Absolute path to the handler file
 * @param viteServer - Vite dev server instance
 * @param logger - Logger for warnings/errors
 * @returns Promise resolving to handler definition object
 */
async function loadHandlerFile(
  filePath: string,
  viteServer: ViteDevServer,
  logger: Logger,
): Promise<HandlerDefinition> {
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
    const handlers = module.default ?? module.handlers ?? module;

    // Validate handlers object
    if (!handlers || typeof handlers !== 'object') {
      logger.warn(
        `[vite-plugin-open-api-server] Invalid handler file ${filePath}: expected object export`,
      );
      return {};
    }

    // Filter to only handler functions
    const validHandlers: HandlerDefinition = {};
    for (const [key, value] of Object.entries(handlers)) {
      if (typeof value === 'function') {
        validHandlers[key] = value as HandlerFn;
      }
    }

    return validHandlers;
  } catch (error) {
    logger.error(
      `[vite-plugin-open-api-server] Failed to load handler file ${filePath}:`,
      error instanceof Error ? error.message : error,
    );
    return {};
  }
}

/**
 * Get list of handler files in a directory
 *
 * Useful for file watching setup.
 *
 * @param handlersDir - Directory to search
 * @param cwd - Current working directory
 * @returns Promise resolving to list of absolute file paths
 */
export async function getHandlerFiles(
  handlersDir: string,
  cwd: string = process.cwd(),
): Promise<string[]> {
  const absoluteDir = path.resolve(cwd, handlersDir);

  const dirExists = await directoryExists(absoluteDir);
  if (!dirExists) {
    return [];
  }

  const pattern = '**/*.handlers.{ts,js,mjs}';
  const files = await fg(pattern, {
    cwd: absoluteDir,
    absolute: true,
    onlyFiles: true,
    ignore: ['node_modules/**', 'dist/**'],
  });

  return files;
}
