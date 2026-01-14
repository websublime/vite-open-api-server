/**
 * Handler Loader Module
 *
 * ## What
 * This module provides functionality to dynamically load custom handler files
 * from a directory. Handlers allow developers to override default mock server
 * responses with custom logic for specific endpoints.
 *
 * ## How
 * The loader scans a directory for files matching the `*.handler.{ts,js,mts,mjs}`
 * pattern, dynamically imports each file as an ESM module, validates the default
 * export matches the `HandlerCodeGenerator` signature, and builds a map of
 * operationId → handler function.
 *
 * ## Why
 * Custom handlers enable realistic mock responses that go beyond static OpenAPI
 * examples. By loading handlers dynamically, we support hot reload and allow
 * developers to add new handlers without modifying plugin configuration.
 *
 * @module
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { glob } from 'fast-glob';
import type { Logger } from 'vite';

import type { HandlerCodeGenerator } from '../types/handlers.js';
import type { OpenApiEndpointRegistry } from '../types/registry.js';

/**
 * Result of loading handlers from a directory.
 *
 * Contains the handler map and any errors encountered during loading.
 */
export interface LoadHandlersResult {
  /**
   * Map of operationId to handler function.
   */
  handlers: Map<string, HandlerCodeGenerator>;

  /**
   * Errors encountered during loading (file path → error message).
   */
  errors: string[];
}

/**
 * Load custom handler files from a directory.
 *
 * Scans for `*.handler.{ts,js,mts,mjs}` files, validates exports,
 * and returns a map of operationId → handler function.
 *
 * The loader is resilient: if one handler file fails to load or validate,
 * it logs the error and continues with the remaining files.
 *
 * @param handlersDir - Directory containing handler files
 * @param registry - OpenAPI endpoint registry (for validation)
 * @param logger - Vite logger
 * @returns Promise resolving to handler map
 *
 * @example
 * ```typescript
 * const handlers = await loadHandlers('./mock/handlers', registry, logger);
 *
 * // Check if a handler exists for an operation
 * if (handlers.has('getPetById')) {
 *   const handler = handlers.get('getPetById');
 *   const response = await handler(context);
 * }
 * ```
 */
export async function loadHandlers(
  handlersDir: string,
  registry: OpenApiEndpointRegistry,
  logger: Logger,
): Promise<Map<string, HandlerCodeGenerator>> {
  const handlers = new Map<string, HandlerCodeGenerator>();
  const errors: string[] = [];

  try {
    // Check if directory exists
    const absoluteDir = path.resolve(handlersDir);

    // Scan for handler files
    const files = await glob('**/*.handler.{ts,js,mts,mjs}', {
      cwd: absoluteDir,
      absolute: true,
    });

    if (files.length === 0) {
      logger.warn(`[handler-loader] No handler files found in ${handlersDir}`);
      return handlers;
    }

    logger.info(`[handler-loader] Found ${files.length} handler file(s)`);

    // Load each handler file
    for (const filePath of files) {
      try {
        // Dynamic import (ESM)
        const fileUrl = pathToFileURL(filePath).href;
        const module = await import(fileUrl);

        // Validate default export
        if (!module.default || typeof module.default !== 'function') {
          throw new Error(`Handler file must export a default async function`);
        }

        // Extract operationId from filename
        const filename = path.basename(filePath);
        const operationId = extractOperationId(filename);

        // Add to map (warn on duplicates)
        if (handlers.has(operationId)) {
          logger.warn(`[handler-loader] Duplicate handler for "${operationId}", overwriting`);
        }

        handlers.set(operationId, module.default as HandlerCodeGenerator);
        logger.info(`[handler-loader] Loaded handler: ${operationId}`);
      } catch (error) {
        const err = error as Error;
        const errorMessage = `${filePath}: ${err.message}`;
        errors.push(errorMessage);
        logger.error(`[handler-loader] Failed to load ${filePath}: ${err.message}`);
      }
    }

    // Cross-reference with registry
    for (const operationId of handlers.keys()) {
      const hasEndpoint = Array.from(registry.endpoints.values()).some(
        (endpoint) => endpoint.operationId === operationId,
      );

      if (!hasEndpoint) {
        logger.warn(
          `[handler-loader] Handler "${operationId}" does not match any endpoint in OpenAPI spec`,
        );
      }
    }

    // Log summary
    const successCount = handlers.size;
    const errorCount = errors.length;
    logger.info(`[handler-loader] Loaded ${successCount} handler(s), ${errorCount} error(s)`);

    return handlers;
  } catch (error) {
    const err = error as Error;
    logger.error(`[handler-loader] Fatal error: ${err.message}`);
    return handlers;
  }
}

/**
 * Extract operationId from handler filename.
 *
 * Converts kebab-case filename to camelCase operationId.
 *
 * @param filename - Handler filename (e.g., 'add-pet.handler.ts')
 * @returns OperationId in camelCase (e.g., 'addPet')
 *
 * @example
 * ```typescript
 * extractOperationId('add-pet.handler.ts');     // 'addPet'
 * extractOperationId('get-pet-by-id.handler.mjs'); // 'getPetById'
 * extractOperationId('listPets.handler.js');    // 'listPets'
 * ```
 */
export function extractOperationId(filename: string): string {
  // Remove extension(s): .handler.ts, .handler.js, .handler.mts, .handler.mjs
  const withoutExtension = filename.replace(/\.handler\.(ts|js|mts|mjs)$/, '');

  // Convert kebab-case to camelCase
  return kebabToCamelCase(withoutExtension);
}

/**
 * Convert kebab-case to camelCase.
 *
 * @param str - String in kebab-case (e.g., 'add-pet')
 * @returns String in camelCase (e.g., 'addPet')
 *
 * @example
 * ```typescript
 * kebabToCamelCase('add-pet');      // 'addPet'
 * kebabToCamelCase('get-pet-by-id'); // 'getPetById'
 * kebabToCamelCase('listPets');      // 'listPets' (no change)
 * ```
 */
export function kebabToCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
