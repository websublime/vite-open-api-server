/**
 * Registry Builder Module
 *
 * ## What
 * This module provides functionality to build an endpoint registry from an
 * enhanced OpenAPI document. The registry provides fast lookup of endpoint
 * metadata without parsing the OpenAPI spec repeatedly.
 *
 * ## How
 * The builder iterates through the OpenAPI paths and operations, creating
 * normalized endpoint entries. It also copies schemas and security schemes
 * from the components section for validation and authentication handling.
 *
 * ## Why
 * A well-structured registry enables efficient endpoint lookup, handler
 * matching, and schema validation. By building the registry once at startup,
 * we avoid repeated parsing during request handling.
 *
 * @module
 */

import type { OpenAPIV3_1 } from 'openapi-types';
import type { Logger } from 'vite';

import type {
  EndpointRegistryEntry,
  OpenApiEndpointRegistry,
  OpenApiSecuritySchemeEntry,
  OpenApiServerSchemaEntry,
} from '../types/registry.js';

/**
 * HTTP methods supported by OpenAPI operations.
 */
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'] as const;

/**
 * Result of building the registry with statistics.
 */
export interface BuildRegistryResult {
  /**
   * The built endpoint registry.
   */
  registry: OpenApiEndpointRegistry;

  /**
   * Statistics about the registry contents.
   */
  stats: RegistryBuildStats;
}

/**
 * Statistics collected during registry building.
 */
export interface RegistryBuildStats {
  /**
   * Total number of endpoints in the registry.
   */
  endpointCount: number;

  /**
   * Number of endpoints with custom handlers (x-handler).
   */
  handlerCount: number;

  /**
   * Total number of schemas in the registry.
   */
  schemaCount: number;

  /**
   * Number of schemas with seed data (x-seed).
   */
  seedCount: number;

  /**
   * Number of security schemes in the registry.
   */
  securitySchemeCount: number;
}

/**
 * Build endpoint registry from enhanced OpenAPI document.
 *
 * Creates a registry with fast lookup for endpoints, schemas, and security
 * schemes. Tracks which endpoints have custom handlers and which schemas
 * have seed data for statistics and debugging.
 *
 * @param spec - Enhanced OpenAPI spec (with x-handler/x-seed extensions)
 * @param logger - Vite logger
 * @returns Registry with endpoints, schemas, and security schemes
 *
 * @example
 * ```typescript
 * const result = buildRegistry(enhancedSpec, logger);
 *
 * // Access endpoints
 * const endpoint = result.registry.endpoints.get('GET /pets');
 *
 * // Check statistics
 * console.log(`${result.stats.handlerCount} endpoints have custom handlers`);
 * ```
 */
export function buildRegistry(spec: OpenAPIV3_1.Document, logger: Logger): BuildRegistryResult {
  const registry: OpenApiEndpointRegistry = {
    endpoints: new Map(),
    schemas: new Map(),
    securitySchemes: new Map(),
  };

  // Extract endpoints from paths
  const handlerCount = extractEndpoints(spec, registry);

  // Copy schemas
  const seedCount = extractSchemas(spec, registry);

  // Copy security schemes
  extractSecuritySchemes(spec, registry);

  const stats: RegistryBuildStats = {
    endpointCount: registry.endpoints.size,
    handlerCount,
    schemaCount: registry.schemas.size,
    seedCount,
    securitySchemeCount: registry.securitySchemes.size,
  };

  // Log statistics
  logRegistryStats(stats, logger);

  return { registry, stats };
}

/**
 * Extract endpoints from OpenAPI paths and populate registry.
 * Returns the count of endpoints with handlers.
 */
function extractEndpoints(spec: OpenAPIV3_1.Document, registry: OpenApiEndpointRegistry): number {
  let handlerCount = 0;

  if (!spec.paths) {
    return handlerCount;
  }

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem || isReferenceObject(pathItem)) {
      continue;
    }

    const pathParameters = (pathItem.parameters || []) as OpenAPIV3_1.ParameterObject[];

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];

      if (!operation || isReferenceObject(operation)) {
        continue;
      }

      // Check for x-handler and x-seed extensions
      const hasHandler = hasExtension(operation, 'x-handler');
      const hasSeed = hasExtension(operation, 'x-seed');

      const entry = createEndpointEntry(
        path,
        method,
        operation,
        pathParameters,
        hasHandler,
        hasSeed,
      );
      const key = generateEndpointKey(method, path);
      registry.endpoints.set(key, entry);

      if (hasHandler) {
        handlerCount++;
      }
    }
  }

  return handlerCount;
}

/**
 * Extract schemas from OpenAPI components and populate registry.
 * Returns the count of schemas with seeds.
 */
function extractSchemas(spec: OpenAPIV3_1.Document, registry: OpenApiEndpointRegistry): number {
  let seedCount = 0;

  if (!spec.components?.schemas) {
    return seedCount;
  }

  for (const [name, schema] of Object.entries(spec.components.schemas)) {
    if (!schema || isReferenceObject(schema)) {
      continue;
    }

    const schemaEntry: OpenApiServerSchemaEntry = {
      name,
      schema,
    };

    registry.schemas.set(name, schemaEntry);

    if (hasExtension(schema, 'x-seed')) {
      seedCount++;
    }
  }

  return seedCount;
}

/**
 * Extract security schemes from OpenAPI components and populate registry.
 */
function extractSecuritySchemes(
  spec: OpenAPIV3_1.Document,
  registry: OpenApiEndpointRegistry,
): void {
  if (!spec.components?.securitySchemes) {
    return;
  }

  for (const [name, scheme] of Object.entries(spec.components.securitySchemes)) {
    if (!scheme || isReferenceObject(scheme)) {
      continue;
    }

    const schemeEntry = createSecuritySchemeEntry(name, scheme);
    registry.securitySchemes.set(name, schemeEntry);
  }
}

/**
 * Create an endpoint entry from an OpenAPI operation.
 *
 * @param path - URL path template
 * @param method - HTTP method
 * @param operation - OpenAPI operation object
 * @param pathParameters - Parameters defined at path level
 * @param hasHandler - Whether the operation has a custom handler (x-handler)
 * @param hasSeed - Whether the operation has seed data (x-seed)
 * @returns Endpoint registry entry with handler/seed status
 */
function createEndpointEntry(
  path: string,
  method: string,
  operation: OpenAPIV3_1.OperationObject,
  pathParameters: OpenAPIV3_1.ParameterObject[],
  hasHandler: boolean,
  hasSeed: boolean,
): EndpointRegistryEntry {
  // Merge path-level parameters with operation parameters
  // Operation parameters override path parameters with the same name
  const operationParameters = (operation.parameters || []) as OpenAPIV3_1.ParameterObject[];
  const mergedParameters = mergeParameters(pathParameters, operationParameters);

  // Generate default operationId if not provided
  const operationId = operation.operationId || generateDefaultOperationId(method, path);

  // Normalize responses (handle $ref objects by including them as-is for now)
  const responses = normalizeResponses(operation.responses);

  return {
    method: method.toLowerCase(),
    path,
    operationId,
    summary: operation.summary,
    description: operation.description,
    parameters: mergedParameters,
    requestBody: normalizeRequestBody(operation.requestBody),
    responses,
    security: operation.security,
    tags: operation.tags,
    hasHandler,
    hasSeed,
  };
}

/**
 * Merge path-level parameters with operation-level parameters.
 *
 * Operation parameters take precedence over path parameters with the same
 * name and location.
 */
function mergeParameters(
  pathParams: OpenAPIV3_1.ParameterObject[],
  operationParams: OpenAPIV3_1.ParameterObject[],
): OpenAPIV3_1.ParameterObject[] {
  // Create a map of operation parameters for quick lookup
  const operationParamMap = new Map<string, OpenAPIV3_1.ParameterObject>();
  for (const param of operationParams) {
    const key = `${param.in}:${param.name}`;
    operationParamMap.set(key, param);
  }

  // Start with operation parameters
  const merged: OpenAPIV3_1.ParameterObject[] = [...operationParams];

  // Add path parameters that are not overridden
  for (const param of pathParams) {
    const key = `${param.in}:${param.name}`;
    if (!operationParamMap.has(key)) {
      merged.push(param);
    }
  }

  return merged;
}

/**
 * Generate a default operationId from method and path.
 *
 * @example
 * generateDefaultOperationId('get', '/pets/{petId}') → 'get_pets_petId'
 */
function generateDefaultOperationId(method: string, path: string): string {
  // Remove leading slash and replace non-alphanumeric characters
  const normalizedPath = path
    .replace(/^\//, '')
    .replace(/\{([^}]+)\}/g, '$1') // Remove braces from path params
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/_$/, '');

  return `${method.toLowerCase()}_${normalizedPath}`;
}

/**
 * Normalize request body, handling reference objects.
 */
function normalizeRequestBody(
  requestBody: OpenAPIV3_1.OperationObject['requestBody'],
): OpenAPIV3_1.RequestBodyObject | undefined {
  if (!requestBody) {
    return undefined;
  }

  // If it's a reference, return undefined for now (could be resolved later)
  if (isReferenceObject(requestBody)) {
    return undefined;
  }

  return requestBody;
}

/**
 * Normalize responses object, handling reference objects.
 */
function normalizeResponses(
  responses: OpenAPIV3_1.ResponsesObject | undefined,
): Record<string, OpenAPIV3_1.ResponseObject> {
  const normalized: Record<string, OpenAPIV3_1.ResponseObject> = {};

  if (!responses) {
    return normalized;
  }

  for (const [statusCode, response] of Object.entries(responses)) {
    if (!response) {
      continue;
    }

    // Skip reference objects for now
    if (isReferenceObject(response)) {
      continue;
    }

    normalized[statusCode] = response;
  }

  return normalized;
}

/**
 * Create a security scheme entry from OpenAPI security scheme.
 */
function createSecuritySchemeEntry(
  name: string,
  scheme: OpenAPIV3_1.SecuritySchemeObject,
): OpenApiSecuritySchemeEntry {
  const entry: OpenApiSecuritySchemeEntry = {
    name,
    type: scheme.type,
  };

  // Add type-specific properties
  switch (scheme.type) {
    case 'apiKey':
      entry.in = scheme.in as 'query' | 'header' | 'cookie';
      entry.apiKeyName = scheme.name;
      break;

    case 'http':
      entry.scheme = scheme.scheme;
      if (scheme.bearerFormat) {
        entry.bearerFormat = scheme.bearerFormat;
      }
      break;

    case 'oauth2':
      entry.flows = scheme.flows;
      break;

    case 'openIdConnect':
      entry.openIdConnectUrl = scheme.openIdConnectUrl;
      break;
  }

  return entry;
}

/**
 * Generate endpoint key from method and path.
 *
 * @example
 * generateEndpointKey('get', '/pets') → 'GET /pets'
 */
export function generateEndpointKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

/**
 * Log registry statistics.
 */
function logRegistryStats(stats: RegistryBuildStats, logger: Logger): void {
  const parts = [
    `${stats.endpointCount} endpoint(s)`,
    stats.handlerCount > 0 ? `(${stats.handlerCount} with handlers)` : null,
    `${stats.schemaCount} schema(s)`,
    stats.seedCount > 0 ? `(${stats.seedCount} with seeds)` : null,
    `${stats.securitySchemeCount} security scheme(s)`,
  ].filter(Boolean);

  logger.info(`[registry] Built registry: ${parts.join(', ')}`, { timestamp: true });
}

/**
 * Check if an object has a specific extension property.
 */
function hasExtension(obj: object, extensionName: string): boolean {
  return extensionName in obj;
}

/**
 * Type guard to check if an object is a $ref reference.
 */
function isReferenceObject(obj: object): obj is OpenAPIV3_1.ReferenceObject {
  return '$ref' in obj;
}
