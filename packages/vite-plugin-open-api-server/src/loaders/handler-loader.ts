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

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fg from 'fast-glob';
import type { Logger } from 'vite';

import type { HandlerExports, HandlerLoadResult, HandlerValue } from '../types/handlers.js';
import type { OpenApiEndpointRegistry } from '../types/registry.js';
import {
  formatInvalidExportError,
  formatInvalidValueError,
  getValueType,
  isValidExportsObject,
  isValidValue,
  logLoadSummary,
} from './loader-utils.js';

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

    // Check if directory exists and is actually a directory before scanning
    if (!fs.existsSync(absoluteDir)) {
      const msg = `No handler files found in ${handlersDir}`;
      logger.warn(`[handler-loader] ${msg}`);
      warnings.push(msg);
      return { handlers, loadedFiles, warnings, errors };
    }

    // Verify it's a directory, not a file
    try {
      const stat = fs.statSync(absoluteDir);
      if (!stat.isDirectory()) {
        const msg = `Path ${handlersDir} exists but is not a directory`;
        logger.warn(`[handler-loader] ${msg}`);
        warnings.push(msg);
        return { handlers, loadedFiles, warnings, errors };
      }
    } catch {
      const msg = `Cannot access ${handlersDir}`;
      logger.warn(`[handler-loader] ${msg}`);
      warnings.push(msg);
      return { handlers, loadedFiles, warnings, errors };
    }

    // Scan for handler files
    const files = await fg.glob('**/*.handler.{ts,js,mts,mjs}', {
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

    // Pre-build a Set of operationIds for O(1) lookups
    const operationIdSet = new Set<string>();
    for (const endpoint of registry.endpoints.values()) {
      if (endpoint.operationId) {
        operationIdSet.add(endpoint.operationId);
      }
    }

    // Load each handler file
    for (const filePath of files) {
      try {
        await loadHandlerFile(filePath, handlers, operationIdSet, logger, warnings);
        loadedFiles.push(filePath);
      } catch (error) {
        const err = error as Error;
        const errorMessage = `${filePath}: ${err.message}`;
        errors.push(errorMessage);
        logger.error(`[handler-loader] Failed to load ${filePath}: ${err.message}`);
      }
    }

    // Log summary
    logLoadSummary(
      'handler',
      handlers.size,
      loadedFiles.length,
      warnings.length,
      errors.length,
      logger,
    );

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
  operationIdSet: Set<string>,
  logger: Logger,
  warnings: string[],
): Promise<void> {
  // Dynamic import (ESM)
  const fileUrl = pathToFileURL(filePath).href;
  const module = await import(fileUrl);

  // Validate default export exists (use 'in' operator to detect property presence, not truthy check)
  if (!('default' in module)) {
    throw new Error('Handler file must have a default export');
  }

  // Validate default export is an object (not function, array, or primitive)
  const exports = module.default as unknown;
  if (!isValidExportsObject(exports)) {
    throw new Error(
      `Handler file ${formatInvalidExportError('object mapping operationId to handler values', exports)}`,
    );
  }

  const handlerExports = exports as HandlerExports;
  const filename = path.basename(filePath);

  // Process each handler in the exports
  for (const [operationId, handlerValue] of Object.entries(handlerExports)) {
    // Validate handler value type
    if (!isValidValue(handlerValue)) {
      const msg = formatInvalidValueError(operationId, filename, handlerValue);
      warnings.push(msg);
      logger.warn(`[handler-loader] ${msg}`);
      continue;
    }

    // Validate operationId exists in registry (O(1) lookup)
    if (!operationIdSet.has(operationId)) {
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
    logger.info(`[handler-loader] Loaded handler: ${operationId} (${getValueType(handlerValue)})`);
  }
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
