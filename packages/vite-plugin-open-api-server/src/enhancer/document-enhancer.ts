/**
 * Document Enhancer Module
 *
 * ## What
 * This module provides functionality to enhance OpenAPI documents with custom
 * extensions for handlers and seeds. It clones the parsed spec, resolves handler
 * and seed values (calling generator functions if needed), and injects the
 * resulting code strings as `x-handler` and `x-seed` extensions.
 *
 * ## How
 * The enhancer deep clones the OpenAPI spec to preserve the original (needed for
 * hot reload), then iterates through handler and seed maps. For each entry:
 * - If the value is a string, it's used directly as the code
 * - If the value is a function, it's called with the appropriate context to
 *   generate the code string
 * The resolved code strings are then injected into the matching operations/schemas.
 *
 * ## Why
 * Enhancement happens after loading handlers/seeds and before starting the mock
 * server. The Scalar Mock Server expects `x-handler` and `x-seed` extensions to
 * contain JavaScript code strings (not functions). By resolving functions to
 * strings here, we ensure the enhanced document is ready for Scalar consumption.
 *
 * @see https://scalar.com/products/mock-server/custom-request-handler
 * @see https://scalar.com/products/mock-server/data-seeding
 *
 * @module
 */

import type { OpenAPIV3_1 } from 'openapi-types';
import type { Logger } from 'vite';

import type { HandlerCodeContext, HandlerValue } from '../types/handlers.js';
import type { SeedCodeContext, SeedValue } from '../types/seeds.js';

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
 * This function clones the original spec, resolves handler and seed values
 * (calling generator functions if needed), then injects the resulting code
 * strings into operations and schemas.
 *
 * @param spec - Parsed OpenAPI specification
 * @param handlers - Map of operationId to handler value (string or generator function)
 * @param seeds - Map of schema name to seed value (string or generator function)
 * @param logger - Vite logger
 * @returns Promise resolving to enhanced OpenAPI document result
 *
 * @example
 * ```typescript
 * const handlers = new Map([
 *   ['getPetById', 'return store.get("Pet", req.params.petId);'],
 *   ['addPet', ({ operation }) => {
 *     const has400 = operation?.responses?.['400'];
 *     return `
 *       if (!req.body.name) return res['${has400 ? '400' : '422'}'];
 *       return store.create('Pet', req.body);
 *     `;
 *   }],
 * ]);
 *
 * const seeds = new Map([
 *   ['Pet', `seed.count(15, () => ({ id: faker.number.int(), name: faker.animal.dog() }))`],
 * ]);
 *
 * const result = await enhanceDocument(spec, handlers, seeds, logger);
 * // result.document has x-handler code strings in operations
 * // result.document has x-seed code strings in schemas
 * ```
 */
export async function enhanceDocument(
  spec: OpenAPIV3_1.Document,
  handlers: Map<string, HandlerValue>,
  seeds: Map<string, SeedValue>,
  logger: Logger,
): Promise<EnhanceDocumentResult> {
  // Deep clone spec to preserve original
  const enhanced = cloneDocument(spec);

  // Pre-compute schemas map once for all resolution calls
  const cachedSchemas = extractSchemas(enhanced);

  // Inject handlers and seeds (with resolution)
  const handlerResult = await injectHandlers(enhanced, handlers, cachedSchemas, logger);
  const seedResult = await injectSeeds(enhanced, seeds, cachedSchemas, logger);

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
 * Extract all schemas from the OpenAPI document.
 *
 * This function is called once per enhancement to build a cached schemas map
 * that is reused by all handler and seed resolution calls.
 *
 * @param spec - OpenAPI document
 * @returns Record of schema name to schema object (excluding $ref schemas)
 */
function extractSchemas(spec: OpenAPIV3_1.Document): Record<string, OpenAPIV3_1.SchemaObject> {
  const schemas: Record<string, OpenAPIV3_1.SchemaObject> = {};

  if (spec.components?.schemas) {
    for (const [name, schemaOrRef] of Object.entries(spec.components.schemas)) {
      if (!isReferenceObject(schemaOrRef)) {
        schemas[name] = schemaOrRef;
      }
    }
  }

  return schemas;
}

/**
 * Resolve a handler value to a code string.
 *
 * If the value is already a string, returns it directly.
 * If the value is a function, calls it with the handler context.
 *
 * @param operationId - The operationId for this handler
 * @param value - Handler value (string or generator function)
 * @param spec - OpenAPI document for context
 * @param operationInfo - Operation info for context
 * @param schemas - Pre-computed schemas map
 * @returns Promise resolving to the code string
 */
async function resolveHandlerValue(
  operationId: string,
  value: HandlerValue,
  spec: OpenAPIV3_1.Document,
  operationInfo: OperationInfo,
  schemas: Record<string, OpenAPIV3_1.SchemaObject>,
): Promise<string> {
  if (typeof value === 'string') {
    return value;
  }

  // Build context for the generator function
  const context: HandlerCodeContext = {
    operationId,
    path: operationInfo.path,
    method: operationInfo.method,
    operation: operationInfo.operation,
    document: spec,
    schemas,
  };

  // Call the generator function (may be sync or async)
  const result = value(context);

  // Handle both sync and async returns
  return Promise.resolve(result);
}

/**
 * Resolve a seed value to a code string.
 *
 * If the value is already a string, returns it directly.
 * If the value is a function, calls it with the seed context.
 *
 * @param schemaName - The schema name for this seed
 * @param value - Seed value (string or generator function)
 * @param spec - OpenAPI document for context
 * @param schema - Schema object for context
 * @param schemas - Pre-computed schemas map
 * @returns Promise resolving to the code string
 */
async function resolveSeedValue(
  schemaName: string,
  value: SeedValue,
  spec: OpenAPIV3_1.Document,
  schema: OpenAPIV3_1.SchemaObject,
  schemas: Record<string, OpenAPIV3_1.SchemaObject>,
): Promise<string> {
  if (typeof value === 'string') {
    return value;
  }

  // Build context for the generator function
  const context: SeedCodeContext = {
    schemaName,
    schema,
    document: spec,
    schemas,
  };

  // Call the generator function (may be sync or async)
  const result = value(context);

  // Handle both sync and async returns
  return Promise.resolve(result);
}

/**
 * Inject x-handler extensions into operations.
 */
async function injectHandlers(
  spec: OpenAPIV3_1.Document,
  handlers: Map<string, HandlerValue>,
  schemas: Record<string, OpenAPIV3_1.SchemaObject>,
  logger: Logger,
): Promise<InjectionResult> {
  let count = 0;
  let overrides = 0;

  for (const [operationId, handlerValue] of handlers) {
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

    try {
      // Resolve the handler value to a code string
      const code = await resolveHandlerValue(
        operationId,
        handlerValue,
        spec,
        operationInfo,
        schemas,
      );

      // Inject the resolved code string
      setExtension(operation, 'x-handler', code);
      count++;

      const codePreview = code.length > 50 ? `${code.slice(0, 50)}...` : code;
      logger.info(
        `[enhancer] Injected x-handler into ${method.toUpperCase()} ${path} (${operationId}): ${codePreview.replace(/\n/g, ' ').trim()}`,
        {
          timestamp: true,
        },
      );
    } catch (error) {
      const err = error as Error;
      logger.error(`[enhancer] Failed to resolve handler "${operationId}": ${err.message}`, {
        timestamp: true,
      });
    }
  }

  return { count, overrides };
}

/**
 * Inject x-seed extensions into schemas.
 */
async function injectSeeds(
  spec: OpenAPIV3_1.Document,
  seeds: Map<string, SeedValue>,
  cachedSchemas: Record<string, OpenAPIV3_1.SchemaObject>,
  logger: Logger,
): Promise<InjectionResult> {
  let count = 0;
  let overrides = 0;

  if (!spec.components?.schemas) {
    return { count, overrides };
  }

  for (const [schemaName, seedValue] of seeds) {
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

    try {
      // Resolve the seed value to a code string
      const code = await resolveSeedValue(schemaName, seedValue, spec, schema, cachedSchemas);

      // Inject the resolved code string
      setExtension(schema, 'x-seed', code);
      count++;

      const codePreview = code.length > 50 ? `${code.slice(0, 50)}...` : code;
      logger.info(
        `[enhancer] Injected x-seed into schema ${schemaName}: ${codePreview.replace(/\n/g, ' ').trim()}`,
        { timestamp: true },
      );
    } catch (error) {
      const err = error as Error;
      logger.error(`[enhancer] Failed to resolve seed "${schemaName}": ${err.message}`, {
        timestamp: true,
      });
    }
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
 * resolved to strings before injection.
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
