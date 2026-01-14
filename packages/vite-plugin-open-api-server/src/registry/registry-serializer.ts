/**
 * Registry Serializer Module
 *
 * ## What
 * This module provides functionality to serialize the OpenAPI endpoint registry
 * into a JSON-compatible format for the inspection endpoint.
 *
 * ## How
 * The serializer converts Maps to arrays/objects and excludes non-serializable
 * values like function references. It produces a clean JSON structure suitable
 * for the /_openapiserver/registry endpoint.
 *
 * ## Why
 * The registry contains Maps and function references which are not directly
 * JSON-serializable. This module transforms the registry into a format that
 * can be returned as a JSON response for debugging and inspection purposes.
 *
 * @module
 */

import type { OpenAPIV3_1 } from 'openapi-types';

import type {
  OpenApiEndpointEntry,
  OpenApiEndpointRegistry,
  OpenApiSecuritySchemeEntry,
} from '../types/registry.js';

/**
 * Serialized endpoint entry for JSON output.
 */
export interface SerializedEndpoint {
  /**
   * Endpoint key (e.g., "GET /pets").
   */
  key: string;

  /**
   * HTTP method (uppercase).
   */
  method: string;

  /**
   * URL path template.
   */
  path: string;

  /**
   * Operation ID from OpenAPI spec.
   */
  operationId: string;

  /**
   * Short summary of the operation.
   */
  summary?: string;

  /**
   * Whether this endpoint has a custom handler.
   */
  hasHandler: boolean;

  /**
   * Tags associated with this endpoint.
   */
  tags?: string[];
}

/**
 * Serialized schema entry for JSON output.
 */
export interface SerializedSchema {
  /**
   * Schema name.
   */
  name: string;

  /**
   * Whether this schema has seed data.
   */
  hasSeed: boolean;

  /**
   * Schema type (if available).
   */
  type?: string;

  /**
   * Required properties (if object type).
   */
  required?: string[];

  /**
   * Property names (if object type).
   */
  properties?: string[];
}

/**
 * Serialized security scheme entry for JSON output.
 */
export interface SerializedSecurityScheme {
  /**
   * Security scheme name.
   */
  name: string;

  /**
   * Security scheme type.
   */
  type: string;

  /**
   * HTTP scheme (for type: http).
   */
  scheme?: string;

  /**
   * Bearer format (for bearer auth).
   */
  bearerFormat?: string;

  /**
   * Location (for apiKey).
   */
  in?: string;

  /**
   * API key name (for apiKey).
   */
  apiKeyName?: string;
}

/**
 * Registry statistics for JSON output.
 */
export interface RegistryStatistics {
  /**
   * Total number of endpoints.
   */
  totalEndpoints: number;

  /**
   * Number of endpoints with custom handlers.
   */
  endpointsWithHandlers: number;

  /**
   * Percentage of endpoints with handlers.
   */
  handlerPercentage: number;

  /**
   * Total number of schemas.
   */
  totalSchemas: number;

  /**
   * Number of schemas with seed data.
   */
  schemasWithSeeds: number;

  /**
   * Percentage of schemas with seeds.
   */
  seedPercentage: number;

  /**
   * Total number of security schemes.
   */
  totalSecuritySchemes: number;
}

/**
 * Metadata for the registry response.
 */
export interface RegistryMeta {
  /**
   * Plugin version.
   */
  version: string;

  /**
   * OpenAPI spec version.
   */
  openApiVersion: string;

  /**
   * OpenAPI spec title.
   */
  specTitle: string;

  /**
   * OpenAPI spec version (info.version).
   */
  specVersion: string;

  /**
   * Server port.
   */
  port: number;

  /**
   * Response generation timestamp.
   */
  timestamp: string;
}

/**
 * Complete serialized registry response.
 */
export interface SerializedRegistry {
  /**
   * Response metadata.
   */
  meta: RegistryMeta;

  /**
   * Serialized endpoints array.
   */
  endpoints: SerializedEndpoint[];

  /**
   * Serialized schemas array.
   */
  schemas: SerializedSchema[];

  /**
   * Serialized security schemes array.
   */
  securitySchemes: SerializedSecurityScheme[];

  /**
   * Registry statistics.
   */
  statistics: RegistryStatistics;
}

/**
 * Options for serializing the registry.
 */
export interface SerializeRegistryOptions {
  /**
   * OpenAPI specification for metadata.
   */
  spec: OpenAPIV3_1.Document;

  /**
   * Server port number.
   */
  port: number;

  /**
   * Plugin version string.
   */
  version?: string;
}

/**
 * Serialize the endpoint registry to a JSON-compatible format.
 *
 * Converts Maps to arrays and excludes non-serializable values like
 * function references. Produces a clean JSON structure for the
 * inspection endpoint.
 *
 * @param registry - The endpoint registry to serialize
 * @param options - Serialization options
 * @returns Serialized registry ready for JSON response
 *
 * @example
 * ```typescript
 * const serialized = serializeRegistry(registry, {
 *   spec,
 *   port: 3001,
 *   version: '1.0.0',
 * });
 *
 * return c.json(serialized, 200);
 * ```
 */
export function serializeRegistry(
  registry: OpenApiEndpointRegistry,
  options: SerializeRegistryOptions,
): SerializedRegistry {
  const { spec, port, version = '1.0.0' } = options;

  // Serialize endpoints
  const endpoints = serializeEndpoints(registry);

  // Serialize schemas
  const schemas = serializeSchemas(registry);

  // Serialize security schemes
  const securitySchemes = serializeSecuritySchemes(registry);

  // Compute statistics
  const statistics = computeStatistics(registry, endpoints, schemas);

  // Build meta
  const meta: RegistryMeta = {
    version,
    openApiVersion: spec.openapi,
    specTitle: spec.info.title,
    specVersion: spec.info.version,
    port,
    timestamp: new Date().toISOString(),
  };

  return {
    meta,
    endpoints,
    schemas,
    securitySchemes,
    statistics,
  };
}

/**
 * Serialize endpoints Map to array.
 */
function serializeEndpoints(registry: OpenApiEndpointRegistry): SerializedEndpoint[] {
  const endpoints: SerializedEndpoint[] = [];

  for (const [key, entry] of registry.endpoints) {
    endpoints.push(serializeEndpoint(key, entry));
  }

  // Sort by path then method for consistent output
  endpoints.sort((a, b) => {
    const pathCompare = a.path.localeCompare(b.path);
    if (pathCompare !== 0) return pathCompare;
    return a.method.localeCompare(b.method);
  });

  return endpoints;
}

/**
 * Serialize a single endpoint entry.
 */
function serializeEndpoint(key: string, entry: OpenApiEndpointEntry): SerializedEndpoint {
  // Check for x-handler in the entry (may have been added by enhancer)
  const hasHandler = 'x-handler' in (entry as unknown as Record<string, unknown>);

  return {
    key,
    method: entry.method.toUpperCase(),
    path: entry.path,
    operationId: entry.operationId,
    summary: entry.summary,
    hasHandler,
    tags: entry.tags,
  };
}

/**
 * Serialize schemas Map to array.
 */
function serializeSchemas(registry: OpenApiEndpointRegistry): SerializedSchema[] {
  const schemas: SerializedSchema[] = [];

  for (const [name, entry] of registry.schemas) {
    const schema = entry.schema;
    const hasSeed = 'x-seed' in (schema as Record<string, unknown>);

    const serialized: SerializedSchema = {
      name,
      hasSeed,
    };

    // Add type information if available
    if (schema.type && typeof schema.type === 'string') {
      serialized.type = schema.type;
    }

    // Add required fields if present
    if (Array.isArray(schema.required)) {
      serialized.required = schema.required;
    }

    // Add property names if object type
    if (schema.properties && typeof schema.properties === 'object') {
      serialized.properties = Object.keys(schema.properties);
    }

    schemas.push(serialized);
  }

  // Sort alphabetically by name
  schemas.sort((a, b) => a.name.localeCompare(b.name));

  return schemas;
}

/**
 * Serialize security schemes Map to array.
 */
function serializeSecuritySchemes(registry: OpenApiEndpointRegistry): SerializedSecurityScheme[] {
  const schemes: SerializedSecurityScheme[] = [];

  for (const [, entry] of registry.securitySchemes) {
    schemes.push(serializeSecurityScheme(entry));
  }

  // Sort alphabetically by name
  schemes.sort((a, b) => a.name.localeCompare(b.name));

  return schemes;
}

/**
 * Serialize a single security scheme entry.
 */
function serializeSecurityScheme(entry: OpenApiSecuritySchemeEntry): SerializedSecurityScheme {
  const serialized: SerializedSecurityScheme = {
    name: entry.name,
    type: entry.type,
  };

  if (entry.scheme) {
    serialized.scheme = entry.scheme;
  }

  if (entry.bearerFormat) {
    serialized.bearerFormat = entry.bearerFormat;
  }

  if (entry.in) {
    serialized.in = entry.in;
  }

  if (entry.apiKeyName) {
    serialized.apiKeyName = entry.apiKeyName;
  }

  return serialized;
}

/**
 * Compute registry statistics.
 */
function computeStatistics(
  registry: OpenApiEndpointRegistry,
  endpoints: SerializedEndpoint[],
  schemas: SerializedSchema[],
): RegistryStatistics {
  const totalEndpoints = registry.endpoints.size;
  const endpointsWithHandlers = endpoints.filter((e) => e.hasHandler).length;
  const handlerPercentage =
    totalEndpoints > 0 ? Math.round((endpointsWithHandlers / totalEndpoints) * 100) : 0;

  const totalSchemas = registry.schemas.size;
  const schemasWithSeeds = schemas.filter((s) => s.hasSeed).length;
  const seedPercentage = totalSchemas > 0 ? Math.round((schemasWithSeeds / totalSchemas) * 100) : 0;

  return {
    totalEndpoints,
    endpointsWithHandlers,
    handlerPercentage,
    totalSchemas,
    schemasWithSeeds,
    seedPercentage,
    totalSecuritySchemes: registry.securitySchemes.size,
  };
}
