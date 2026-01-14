/**
 * Document Enhancer Module
 *
 * ## What
 * This module provides functionality to enhance OpenAPI documents with custom
 * extensions for handlers and seeds. It clones the parsed spec, injects
 * `x-handler` extensions into operations that have custom handlers, and injects
 * `x-seed` extensions into schemas that have seed data.
 *
 * ## How
 * The enhancer deep clones the OpenAPI spec to preserve the original (needed for
 * hot reload), then iterates through handler and seed maps to inject extensions
 * into matching operations and schemas. Each injection is logged for visibility.
 *
 * ## Why
 * Enhancement happens after loading handlers/seeds and before starting the mock
 * server. The enhanced document is passed to Scalar mock server, which uses the
 * extensions to call custom handlers and pre-populate data. By cloning first,
 * we ensure the original spec remains unmodified for subsequent enhancements.
 *
 * @module
 */

import type { OpenAPIV3_1 } from 'openapi-types';
import type { Logger } from 'vite';

import type { HandlerCodeGenerator } from '../types/handlers.js';
import type { SeedCodeGenerator } from '../types/seeds.js';

/**
 * HTTP methods supported by OpenAPI operations.
 */
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'] as const;

/**
 * Result of finding an operation by operationId.
 */
export interface OperationInfo {
  /**
   * Path where the operation is defined (e.g., '/pets/{petId}').
   */
  path: string;

  /**
   * HTTP method (lowercase, e.g., 'get', 'post').
   */
  method: string;

  /**
   * The operation object from the OpenAPI spec.
   */
  operation: OpenAPIV3_1.OperationObject;
}

/**
 * Result of the document enhancement process.
 */
export interface EnhanceDocumentResult {
  /**
   * The enhanced OpenAPI document (clone of original with extensions injected).
   */
  document: OpenAPIV3_1.Document;

  /**
   * Number of handlers successfully injected.
   */
  handlerCount: number;

  /**
   * Number of seeds successfully injected.
   */
  seedCount: number;

  /**
   * Number of existing extensions that were overridden.
   */
  overrideCount: number;
}

/**
 * Internal result from injection operations.
 */
interface InjectionResult {
  count: number;
  overrides: number;
}

/**
 * Enhance OpenAPI document with x-handler and x-seed extensions.
 *
 * This function clones the original spec, then injects `x-handler` into
 * operations matching handler operationIds and `x-seed` into schemas
 * matching seed schema names.
 *
 * @param spec - Parsed OpenAPI specification
 * @param handlers - Map of operationId to handler function
 * @param seeds - Map of schema name to seed function
 * @param logger - Vite logger
 * @returns Enhanced OpenAPI document result
 *
 * @example
 * ```typescript
 * const handlers = new Map([
 *   ['getPetById', async (ctx) => ({ status: 200, body: { id: 1, name: 'Fluffy' } })],
 * ]);
 *
 * const seeds = new Map([
 *   ['Pet', async (ctx) => [{ id: 1, name: 'Fluffy' }]],
 * ]);
 *
 * const result = enhanceDocument(spec, handlers, seeds, logger);
 * // result.document has x-handler in GET /pets/{petId} operation
 * // result.document has x-seed in Pet schema
 * ```
 */
export function enhanceDocument(
  spec: OpenAPIV3_1.Document,
  handlers: Map<string, HandlerCodeGenerator>,
  seeds: Map<string, SeedCodeGenerator>,
  logger: Logger,
): EnhanceDocumentResult {
  // Deep clone spec to preserve original
  const enhanced = cloneDocument(spec);

  // Inject handlers and seeds
  const handlerResult = injectHandlers(enhanced, handlers, logger);
  const seedResult = injectSeeds(enhanced, seeds, logger);

  const handlerCount = handlerResult.count;
  const seedCount = seedResult.count;
  const overrideCount = handlerResult.overrides + seedResult.overrides;

  // Log summary
  logEnhancementSummary(handlerCount, seedCount, overrideCount, logger);

  return {
    document: enhanced,
    handlerCount,
    seedCount,
    overrideCount,
  };
}

/**
 * Inject x-handler extensions into operations.
 */
function injectHandlers(
  spec: OpenAPIV3_1.Document,
  handlers: Map<string, HandlerCodeGenerator>,
  logger: Logger,
): InjectionResult {
  let count = 0;
  let overrides = 0;

  for (const [operationId, handlerFn] of handlers) {
    const operationInfo = findOperationById(spec, operationId);

    if (!operationInfo) {
      logger.info(`[enhancer] Skipped handler "${operationId}" - operation not found`, {
        timestamp: true,
      });
      continue;
    }

    const { path, method, operation } = operationInfo;

    if (hasExtension(operation, 'x-handler')) {
      logger.warn(`[enhancer] Overriding existing x-handler for ${operationId}`, {
        timestamp: true,
      });
      overrides++;
    }

    setExtension(operation, 'x-handler', handlerFn);
    count++;

    logger.info(
      `[enhancer] Injected x-handler into ${method.toUpperCase()} ${path} (${operationId})`,
      {
        timestamp: true,
      },
    );
  }

  return { count, overrides };
}

/**
 * Inject x-seed extensions into schemas.
 */
function injectSeeds(
  spec: OpenAPIV3_1.Document,
  seeds: Map<string, SeedCodeGenerator>,
  logger: Logger,
): InjectionResult {
  let count = 0;
  let overrides = 0;

  if (!spec.components?.schemas) {
    return { count, overrides };
  }

  for (const [schemaName, seedFn] of seeds) {
    const schema = spec.components.schemas[schemaName];

    if (!schema) {
      logger.info(`[enhancer] Skipped seed "${schemaName}" - schema not found`, {
        timestamp: true,
      });
      continue;
    }

    if (isReferenceObject(schema)) {
      logger.warn(`[enhancer] Skipped seed "${schemaName}" - schema is a $ref`, {
        timestamp: true,
      });
      continue;
    }

    if (hasExtension(schema, 'x-seed')) {
      logger.warn(`[enhancer] Overriding existing x-seed for ${schemaName}`, {
        timestamp: true,
      });
      overrides++;
    }

    setExtension(schema, 'x-seed', seedFn);
    count++;

    logger.info(`[enhancer] Injected x-seed into schema ${schemaName}`, { timestamp: true });
  }

  return { count, overrides };
}

/**
 * Log the enhancement summary.
 */
function logEnhancementSummary(
  handlerCount: number,
  seedCount: number,
  overrideCount: number,
  logger: Logger,
): void {
  const summary = [
    `${handlerCount} handler(s)`,
    `${seedCount} seed(s)`,
    overrideCount > 0 ? `${overrideCount} override(s)` : null,
  ]
    .filter(Boolean)
    .join(', ');

  logger.info(`[enhancer] Enhanced document: ${summary}`, { timestamp: true });
}

/**
 * Deep clone an OpenAPI document.
 *
 * Uses structuredClone for deep copying. Since the original spec should not
 * contain functions (only parsed JSON/YAML), this is safe. Functions are
 * injected after cloning.
 *
 * @param spec - OpenAPI document to clone
 * @returns Deep clone of the document
 *
 * @example
 * ```typescript
 * const original = { openapi: '3.1.0', info: { title: 'Test', version: '1.0.0' } };
 * const cloned = cloneDocument(original);
 *
 * // Modifying cloned doesn't affect original
 * cloned.info.title = 'Modified';
 * console.log(original.info.title); // 'Test'
 * ```
 */
export function cloneDocument(spec: OpenAPIV3_1.Document): OpenAPIV3_1.Document {
  // structuredClone is available in Node 17+ and handles deep cloning
  // For specs that might have already been enhanced (rare), we need to
  // handle non-cloneable values like functions
  try {
    return structuredClone(spec);
  } catch {
    // Fallback: JSON parse/stringify (loses functions, but that's expected
    // since we're cloning to get a clean slate before enhancement)
    return JSON.parse(JSON.stringify(spec)) as OpenAPIV3_1.Document;
  }
}

/**
 * Find an operation by its operationId in the OpenAPI spec.
 *
 * Iterates through all paths and methods to find the operation with the
 * matching operationId. Returns null if not found.
 *
 * @param spec - OpenAPI document to search
 * @param operationId - The operationId to find
 * @returns Operation info or null if not found
 *
 * @example
 * ```typescript
 * const info = findOperationById(spec, 'getPetById');
 *
 * if (info) {
 *   console.log(`Found at ${info.method.toUpperCase()} ${info.path}`);
 * }
 * ```
 */
export function findOperationById(
  spec: OpenAPIV3_1.Document,
  operationId: string,
): OperationInfo | null {
  if (!spec.paths) {
    return null;
  }

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem || isReferenceObject(pathItem)) {
      continue;
    }

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];

      if (operation && !isReferenceObject(operation) && operation.operationId === operationId) {
        return { path, method, operation };
      }
    }
  }

  return null;
}

/**
 * Check if an object has a specific extension property.
 *
 * @param obj - Object to check
 * @param extensionName - Extension name (e.g., 'x-handler')
 * @returns True if extension exists
 */
export function hasExtension(obj: object, extensionName: string): boolean {
  return extensionName in obj;
}

/**
 * Set an extension property on an object.
 *
 * Uses type assertion to set the extension since OpenAPI types don't include
 * custom extensions by default.
 *
 * @param obj - Object to modify
 * @param extensionName - Extension name (e.g., 'x-handler')
 * @param value - Extension value
 */
export function setExtension(obj: object, extensionName: string, value: unknown): void {
  (obj as Record<string, unknown>)[extensionName] = value;
}

/**
 * Get an extension property from an object.
 *
 * @param obj - Object to read from
 * @param extensionName - Extension name (e.g., 'x-handler')
 * @returns Extension value or undefined if not present
 */
export function getExtension<T = unknown>(obj: object, extensionName: string): T | undefined {
  return (obj as Record<string, unknown>)[extensionName] as T | undefined;
}

/**
 * Type guard to check if an object is a $ref reference.
 *
 * @param obj - Object to check
 * @returns True if object has $ref property
 */
function isReferenceObject(
  obj: OpenAPIV3_1.ReferenceObject | object,
): obj is OpenAPIV3_1.ReferenceObject {
  return '$ref' in obj;
}
