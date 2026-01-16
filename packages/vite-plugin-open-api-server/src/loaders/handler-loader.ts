/**
 * Handler Loader Module
 *
 * ## What
 * This module provides functionality to dynamically load custom handler files
 * from a directory. Handlers define JavaScript code that will be injected as
 * `x-handler` extensions into OpenAPI operations for the Scalar Mock Server.
 *
 * ## How
 * The loader scans a directory for files matching the `*.handler.{ts,js,mts,mjs}`
 * pattern, dynamically imports each file as an ESM module, validates the default
 * export is an object mapping operationId → handler value, and aggregates all
 * handlers into a single Map.
 *
 * ## Why
 * Custom handlers enable realistic mock responses that go beyond static OpenAPI
 * examples. The code-based format (string or function returning string) allows
 * handlers to access Scalar's runtime context (store, faker, req, res).
 *
 * @see https://scalar.com/products/mock-server/custom-request-handler
 *
 * @module
 */

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { glob } from 'fast-glob';
import type { Logger } from 'vite';

import type { HandlerExports, HandlerLoadResult, HandlerValue } from '../types/handlers.js';
import type { OpenApiEndpointRegistry } from '../types/registry.js';

/**
 * Load custom handler files from a directory.
 *
 * Scans for `*.handler.{ts,js,mts,mjs}` files, validates exports,
 * and returns a map of operationId → handler value.
 *
 * Handler files must export an object as default export, where each key
 * is an operationId and each value is either:
 * - A string containing JavaScript code
 * - A function that receives HandlerCodeContext and returns a code string
 *
 * The loader is resilient: if one handler file fails to load or validate,
 * it logs the error and continues with the remaining files.
 *
 * @param handlersDir - Directory containing handler files
 * @param registry - OpenAPI endpoint registry (for validation)
 * @param logger - Vite logger
 * @returns Promise resolving to HandlerLoadResult
 *
 * @example
 * ```typescript
 * const result = await loadHandlers('./mock/handlers', registry, logger);
 *
 * // Access loaded handlers
 * for (const [operationId, handlerValue] of result.handlers) {
 *   console.log(`Handler for ${operationId}:`, typeof handlerValue);
 * }
 *
 * // Check for issues
 * if (result.errors.length > 0) {
 *   console.error('Handler loading errors:', result.errors);
 * }
 * ```
 */
export async function loadHandlers(
  handlersDir: string,
  registry: OpenApiEndpointRegistry,
  logger: Logger,
): Promise<HandlerLoadResult> {
  const handlers = new Map<string, HandlerValue>();
  const loadedFiles: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Resolve to absolute path
    const absoluteDir = path.resolve(handlersDir);

    // Scan for handler files
    const files = await glob('**/*.handler.{ts,js,mts,mjs}', {
      cwd: absoluteDir,
      absolute: true,
    });

    if (files.length === 0) {
      const msg = `No handler files found in ${handlersDir}`;
      logger.warn(`[handler-loader] ${msg}`);
      warnings.push(msg);
      return { handlers, loadedFiles, warnings, errors };
    }

    logger.info(`[handler-loader] Found ${files.length} handler file(s)`);

    // Load each handler file
    for (const filePath of files) {
      try {
        await loadHandlerFile(filePath, handlers, registry, logger, warnings);
        loadedFiles.push(filePath);
      } catch (error) {
        const err = error as Error;
        const errorMessage = `${filePath}: ${err.message}`;
        errors.push(errorMessage);
        logger.error(`[handler-loader] Failed to load ${filePath}: ${err.message}`);
      }
    }

    // Log summary
    logLoadSummary(handlers.size, loadedFiles.length, warnings.length, errors.length, logger);

    return { handlers, loadedFiles, warnings, errors };
  } catch (error) {
    const err = error as Error;
    const fatalError = `Fatal error scanning handlers directory: ${err.message}`;
    logger.error(`[handler-loader] ${fatalError}`);
    errors.push(fatalError);
    return { handlers, loadedFiles, warnings, errors };
  }
}

/**
 * Load a single handler file and merge its exports into the handlers map.
 */
async function loadHandlerFile(
  filePath: string,
  handlers: Map<string, HandlerValue>,
  registry: OpenApiEndpointRegistry,
  logger: Logger,
  warnings: string[],
): Promise<void> {
  // Dynamic import (ESM)
  const fileUrl = pathToFileURL(filePath).href;
  const module = await import(fileUrl);

  // Validate default export exists
  if (!module.default) {
    throw new Error('Handler file must have a default export');
  }

  // Validate default export is an object (not function, array, or primitive)
  const exports = module.default;
  if (!isValidExportsObject(exports)) {
    throw new Error(
      'Handler file default export must be an object mapping operationId to handler values. ' +
        `Got: ${typeof exports}${Array.isArray(exports) ? ' (array)' : ''}`,
    );
  }

  const handlerExports = exports as HandlerExports;
  const filename = path.basename(filePath);

  // Process each handler in the exports
  for (const [operationId, handlerValue] of Object.entries(handlerExports)) {
    // Validate handler value type
    if (!isValidHandlerValue(handlerValue)) {
      const msg = `Invalid handler value for "${operationId}" in ${filename}: expected string or function, got ${typeof handlerValue}`;
      warnings.push(msg);
      logger.warn(`[handler-loader] ${msg}`);
      continue;
    }

    // Validate operationId exists in registry
    const operationExists = checkOperationExists(operationId, registry);
    if (!operationExists) {
      const msg = `Handler "${operationId}" in ${filename} does not match any operation in OpenAPI spec`;
      warnings.push(msg);
      logger.warn(`[handler-loader] ${msg}`);
      // Continue anyway - user might know what they're doing
    }

    // Check for duplicates
    if (handlers.has(operationId)) {
      const msg = `Duplicate handler for "${operationId}" in ${filename}, overwriting previous`;
      warnings.push(msg);
      logger.warn(`[handler-loader] ${msg}`);
    }

    // Add to handlers map
    handlers.set(operationId, handlerValue);
    logger.info(
      `[handler-loader] Loaded handler: ${operationId} (${getHandlerType(handlerValue)})`,
    );
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
    // Ensure it's a plain object, not a class instance
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Check if a value is a valid handler value (string or function).
 */
function isValidHandlerValue(value: unknown): value is HandlerValue {
  return typeof value === 'string' || typeof value === 'function';
}

/**
 * Check if an operationId exists in the registry.
 */
function checkOperationExists(operationId: string, registry: OpenApiEndpointRegistry): boolean {
  for (const endpoint of registry.endpoints.values()) {
    if (endpoint.operationId === operationId) {
      return true;
    }
  }
  return false;
}

/**
 * Get a human-readable type description for a handler value.
 */
function getHandlerType(value: HandlerValue): string {
  if (typeof value === 'string') {
    return `static, ${value.length} chars`;
  }
  return 'dynamic function';
}

/**
 * Log the loading summary.
 */
function logLoadSummary(
  handlerCount: number,
  fileCount: number,
  warningCount: number,
  errorCount: number,
  logger: Logger,
): void {
  const parts = [`${handlerCount} handler(s)`, `from ${fileCount} file(s)`];

  if (warningCount > 0) {
    parts.push(`${warningCount} warning(s)`);
  }

  if (errorCount > 0) {
    parts.push(`${errorCount} error(s)`);
  }

  logger.info(`[handler-loader] Summary: ${parts.join(', ')}`);
}

/**
 * Extract operationId from handler filename.
 *
 * Note: This function is no longer used for extraction since handlers
 * now export objects with explicit operationId keys. Kept for potential
 * future use or backward compatibility.
 *
 * @param filename - Handler filename (e.g., 'pets.handler.ts')
 * @returns Base name without extension (e.g., 'pets')
 *
 * @example
 * ```typescript
 * extractBaseName('pets.handler.ts');     // 'pets'
 * extractBaseName('store-orders.handler.mjs'); // 'store-orders'
 * ```
 */
export function extractBaseName(filename: string): string {
  return filename.replace(/\.handler\.(ts|js|mts|mjs)$/, '');
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
