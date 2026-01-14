/**
 * Registry Type Definitions
 *
 * ## What
 * This module defines the internal data structures for storing parsed OpenAPI
 * endpoints, schemas, and security schemes. The registry serves as the central
 * source of truth for endpoint metadata used by handlers, seeds, and the mock server.
 *
 * ## How
 * Types mirror the OpenAPI 3.1 specification structure while providing a more
 * accessible interface for internal use. The registry is populated during spec
 * parsing and provides read-only access to endpoint information.
 *
 * ## Why
 * A well-structured registry enables efficient endpoint lookup, schema validation,
 * and security requirement checking. By normalizing OpenAPI structures into
 * dedicated types, we simplify handler and seed implementations.
 *
 * @module
 * @internal
 */

import type { OpenAPIV3_1 } from 'openapi-types';

/**
 * Parsed OpenAPI endpoint registry.
 *
 * Maps endpoint keys (e.g., 'GET /pets') to operation metadata.
 * This registry is built during OpenAPI spec parsing and provides
 * read-only access to all discovered endpoints, schemas, and security schemes.
 *
 * @example
 * ```typescript
 * const registry: OpenApiEndpointRegistry = {
 *   endpoints: new Map([
 *     ['GET /pets', { method: 'get', path: '/pets', operationId: 'listPets', ... }],
 *     ['GET /pets/{petId}', { method: 'get', path: '/pets/{petId}', operationId: 'getPetById', ... }],
 *   ]),
 *   schemas: new Map([
 *     ['Pet', { name: 'Pet', schema: { type: 'object', properties: { ... } } }],
 *   ]),
 *   securitySchemes: new Map([
 *     ['api_key', { name: 'api_key', type: 'apiKey', in: 'header' }],
 *   ]),
 * };
 * ```
 */
export interface OpenApiEndpointRegistry {
  /**
   * Map of endpoint keys to endpoint entries.
   *
   * Keys follow the format: `{METHOD} {path}` (e.g., 'GET /pets/{petId}').
   * Entries include handler/seed status for display and routing purposes.
   */
  endpoints: Map<string, EndpointRegistryEntry>;

  /**
   * Map of schema names to schema entries.
   *
   * Contains all schemas from `components.schemas` in the OpenAPI spec.
   */
  schemas: Map<string, OpenApiServerSchemaEntry>;

  /**
   * Map of security scheme names to security scheme entries.
   *
   * Contains all security schemes from `components.securitySchemes`.
   */
  securitySchemes: Map<string, OpenApiSecuritySchemeEntry>;
}

/**
 * Single endpoint entry in the registry.
 *
 * Contains all metadata needed to handle requests for this operation,
 * including path, method, parameters, request body, responses, and security.
 *
 * @example
 * ```typescript
 * const endpoint: OpenApiEndpointEntry = {
 *   method: 'get',
 *   path: '/pets/{petId}',
 *   operationId: 'getPetById',
 *   summary: 'Get a pet by ID',
 *   parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'integer' } }],
 *   responses: {
 *     '200': { description: 'Successful response', content: { ... } },
 *     '404': { description: 'Pet not found' },
 *   },
 *   tags: ['pets'],
 * };
 * ```
 */
export interface OpenApiEndpointEntry {
  /**
   * HTTP method for this endpoint (lowercase).
   *
   * @example 'get', 'post', 'put', 'patch', 'delete'
   */
  method: string;

  /**
   * URL path template with parameter placeholders.
   *
   * @example '/pets/{petId}', '/users/{userId}/orders'
   */
  path: string;

  /**
   * Unique operation identifier from the OpenAPI spec.
   *
   * Used to match handler and seed files to endpoints.
   *
   * @example 'getPetById', 'createPet', 'listPets'
   */
  operationId: string;

  /**
   * Short summary of the operation from the spec.
   */
  summary?: string;

  /**
   * Detailed description of the operation from the spec.
   */
  description?: string;

  /**
   * Path, query, header, and cookie parameters for this operation.
   *
   * Includes both operation-level and path-level parameters merged together.
   */
  parameters: OpenAPIV3_1.ParameterObject[];

  /**
   * Request body definition for this operation.
   *
   * Present for POST, PUT, PATCH operations that accept request bodies.
   */
  requestBody?: OpenAPIV3_1.RequestBodyObject;

  /**
   * Response definitions keyed by HTTP status code.
   *
   * Includes success responses (2xx), client errors (4xx), and server errors (5xx).
   */
  responses: Record<string, OpenAPIV3_1.ResponseObject>;

  /**
   * Security requirements for this operation.
   *
   * Overrides global security when present. Empty array means no auth required.
   */
  security?: OpenAPIV3_1.SecurityRequirementObject[];

  /**
   * Tags associated with this operation.
   *
   * Used for grouping and filtering endpoints.
   */
  tags?: string[];
}

/**
 * Schema entry for component schemas.
 *
 * Contains the schema name and the schema object as defined in
 * the OpenAPI spec's `components.schemas` section.
 *
 * @example
 * ```typescript
 * const schemaEntry: OpenApiServerSchemaEntry = {
 *   name: 'Pet',
 *   schema: {
 *     type: 'object',
 *     required: ['id', 'name'],
 *     properties: {
 *       id: { type: 'integer', format: 'int64' },
 *       name: { type: 'string' },
 *       status: { type: 'string', enum: ['available', 'pending', 'sold'] },
 *     },
 *   },
 * };
 * ```
 */
export interface OpenApiServerSchemaEntry {
  /**
   * Schema name as defined in components.schemas.
   *
   * @example 'Pet', 'User', 'Order'
   */
  name: string;

  /**
   * The schema object from the OpenAPI spec.
   *
   * Contains type definitions, properties, required fields, etc.
   */
  schema: OpenAPIV3_1.SchemaObject;
}

/**
 * Security scheme entry from components.securitySchemes.
 *
 * Represents a normalized view of OpenAPI security schemes,
 * supporting API key, HTTP, OAuth2, and OpenID Connect types.
 *
 * @example
 * ```typescript
 * // API Key example
 * const apiKeyScheme: OpenApiSecuritySchemeEntry = {
 *   name: 'api_key',
 *   type: 'apiKey',
 *   in: 'header',
 * };
 *
 * // Bearer token example
 * const bearerScheme: OpenApiSecuritySchemeEntry = {
 *   name: 'bearerAuth',
 *   type: 'http',
 *   scheme: 'bearer',
 *   bearerFormat: 'JWT',
 * };
 * ```
 */
export interface OpenApiSecuritySchemeEntry {
  /**
   * Security scheme name as defined in components.securitySchemes.
   *
   * @example 'api_key', 'bearerAuth', 'oauth2'
   */
  name: string;

  /**
   * Type of security scheme.
   *
   * - `apiKey`: API key passed in header, query, or cookie
   * - `http`: HTTP authentication (basic, bearer, etc.)
   * - `oauth2`: OAuth 2.0 flows
   * - `openIdConnect`: OpenID Connect discovery
   */
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';

  /**
   * HTTP authentication scheme name.
   *
   * Only applicable when `type` is 'http'.
   *
   * @example 'bearer', 'basic', 'digest'
   */
  scheme?: string;

  /**
   * Bearer token format hint.
   *
   * Only applicable when `type` is 'http' and `scheme` is 'bearer'.
   *
   * @example 'JWT'
   */
  bearerFormat?: string;

  /**
   * Location of the API key.
   *
   * Only applicable when `type` is 'apiKey'.
   */
  in?: 'query' | 'header' | 'cookie';

  /**
   * API key parameter name.
   *
   * Only applicable when `type` is 'apiKey'.
   *
   * @example 'X-API-Key', 'api_key'
   */
  apiKeyName?: string;

  /**
   * OAuth2 flows configuration.
   *
   * Only applicable when `type` is 'oauth2'.
   */
  flows?: OpenAPIV3_1.OAuth2SecurityScheme['flows'];

  /**
   * OpenID Connect discovery URL.
   *
   * Only applicable when `type` is 'openIdConnect'.
   */
  openIdConnectUrl?: string;
}

/**
 * Endpoint entry with handler/seed status.
 *
 * Extended version of OpenApiEndpointEntry that includes
 * information about whether custom handlers or seeds exist
 * for this endpoint.
 */
export interface EndpointRegistryEntry extends OpenApiEndpointEntry {
  /**
   * Whether a custom handler file exists for this endpoint.
   *
   * When true, the handler function will be used instead of
   * the default mock server response.
   */
  hasHandler: boolean;

  /**
   * Whether seed data exists for this endpoint.
   *
   * When true, seed data will be loaded and made available
   * to handlers via the context.
   */
  hasSeed: boolean;
}

/**
 * Registry statistics for summary information.
 *
 * Provides counts of total endpoints and how many have
 * custom handlers or seeds configured.
 */
export interface RegistryStats {
  /**
   * Total number of endpoints in the registry.
   */
  total: number;

  /**
   * Number of endpoints with custom handlers.
   */
  withHandlers: number;

  /**
   * Number of endpoints with seed data.
   */
  withSeeds: number;

  /**
   * Number of schemas in the registry.
   */
  schemaCount: number;

  /**
   * Number of security schemes in the registry.
   */
  securitySchemeCount: number;
}
