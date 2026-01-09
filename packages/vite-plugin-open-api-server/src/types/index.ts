/**
 * Type Definitions
 *
 * ## What
 * This module contains all TypeScript type definitions and interfaces used
 * throughout the vite-plugin-open-api-server package. These types define
 * the contracts for plugin configuration, handler contexts, seed contexts,
 * and the endpoint registry.
 *
 * ## How
 * Types are organized by their purpose:
 * - Plugin configuration options for user-facing API
 * - Handler context for custom request handlers
 * - Seed context for data seeding functions
 * - Endpoint registry for internal endpoint tracking
 *
 * ## Why
 * Centralized type definitions ensure consistency across the codebase,
 * provide excellent IDE support for consumers, and enable compile-time
 * type checking to catch errors early in development.
 *
 * @module
 */

/**
 * Configuration options for the OpenAPI Server Vite plugin.
 *
 * These options control how the plugin loads OpenAPI specifications,
 * starts the mock server, and handles custom handlers and seed data.
 *
 * @example
 * ```typescript
 * const options: OpenApiServerPluginOptions = {
 *   openApiPath: './api/openapi.yaml',
 *   port: 3456,
 *   proxyPath: '/api',
 *   handlersDir: './src/handlers',
 *   seedsDir: './src/seeds',
 *   verbose: true,
 * };
 * ```
 */
export interface OpenApiServerPluginOptions {
  /**
   * Path to the OpenAPI specification file.
   *
   * Supports both YAML (.yaml, .yml) and JSON (.json) formats.
   * The path is resolved relative to the Vite project root.
   *
   * @example './src/apis/petstore/petstore.openapi.yaml'
   * @example './api/spec.json'
   */
  openApiPath?: string;

  /**
   * Port number for the mock server.
   *
   * The mock server will listen on this port. If the port is already
   * in use, the plugin will attempt to find an available port.
   *
   * @default 3456
   */
  port?: number;

  /**
   * URL path prefix for proxying requests to the mock server.
   *
   * All requests matching this path will be forwarded to the mock server.
   * This allows the frontend to make API calls to the same origin while
   * the mock server handles them on a different port.
   *
   * @default '/api'
   * @example '/api/v1'
   */
  proxyPath?: string;

  /**
   * Directory containing custom handler files.
   *
   * Handler files are .mjs modules that export functions to override
   * default mock responses for specific endpoints. Each handler file
   * should match the pattern `{method}.{operationId}.mjs`.
   *
   * @example './src/apis/petstore/handlers'
   */
  handlersDir?: string;

  /**
   * Directory containing seed data files.
   *
   * Seed files are .mjs modules that export functions to provide
   * consistent test data for mock responses. Seeds are loaded before
   * handlers and can be used to populate the mock server with data.
   *
   * @example './src/apis/petstore/seeds'
   */
  seedsDir?: string;

  /**
   * Enable verbose logging for debugging.
   *
   * When enabled, the plugin will log detailed information about
   * its operations, including server startup, request handling,
   * and file watching events.
   *
   * @default false
   */
  verbose?: boolean;
}

/**
 * Context object passed to custom request handlers.
 *
 * Handlers receive this context to access request information,
 * OpenAPI operation details, and utility functions for generating
 * responses.
 *
 * @example
 * ```typescript
 * // Handler file: get.getPetById.mjs
 * export default function handler(context: HandlerContext) {
 *   const { params, query, body, operation } = context;
 *   const petId = params.petId;
 *
 *   return {
 *     id: petId,
 *     name: 'Fluffy',
 *     status: 'available',
 *   };
 * }
 * ```
 */
export interface HandlerContext {
  /**
   * URL path parameters extracted from the request.
   *
   * Keys correspond to path parameter names defined in the OpenAPI spec.
   *
   * @example { petId: '123', categoryId: '456' }
   */
  params: Record<string, string>;

  /**
   * Query string parameters from the request URL.
   *
   * Values can be strings or arrays of strings for repeated parameters.
   *
   * @example { status: 'available', tags: ['dog', 'pet'] }
   */
  query: Record<string, string | string[]>;

  /**
   * Parsed request body, if present.
   *
   * The body is automatically parsed based on the Content-Type header.
   * For JSON requests, this will be the parsed JSON object.
   */
  body: unknown;

  /**
   * HTTP headers from the request.
   *
   * Header names are normalized to lowercase.
   *
   * @example { 'content-type': 'application/json', 'authorization': 'Bearer token' }
   */
  headers: Record<string, string>;

  /**
   * The HTTP method of the request.
   *
   * @example 'GET', 'POST', 'PUT', 'DELETE'
   */
  method: string;

  /**
   * The full request path including query string.
   *
   * @example '/api/pets/123?include=owner'
   */
  path: string;

  /**
   * OpenAPI operation details for this endpoint.
   *
   * Contains the operation ID, summary, description, and other
   * metadata from the OpenAPI specification.
   */
  operation: {
    /**
     * The unique operation ID from the OpenAPI spec.
     *
     * @example 'getPetById', 'createPet'
     */
    operationId: string;

    /**
     * Short summary of the operation.
     */
    summary?: string;

    /**
     * Detailed description of the operation.
     */
    description?: string;

    /**
     * Tags associated with this operation.
     */
    tags?: string[];
  };

  /**
   * Seed data loaded for this endpoint.
   *
   * If a seed file exists for this operation, its exported data
   * will be available here for use in generating responses.
   */
  seeds: Record<string, unknown>;
}

/**
 * Context object passed to seed data functions.
 *
 * Seed functions receive this context to access faker utilities
 * and other helpers for generating consistent test data.
 *
 * @example
 * ```typescript
 * // Seed file: pets.seed.mjs
 * export default function seed(context: SeedContext) {
 *   const { faker } = context;
 *
 *   return {
 *     pets: Array.from({ length: 10 }, (_, i) => ({
 *       id: i + 1,
 *       name: faker.animal.petName(),
 *       status: faker.helpers.arrayElement(['available', 'pending', 'sold']),
 *     })),
 *   };
 * }
 * ```
 */
export interface SeedContext {
  /**
   * Faker.js instance for generating fake data.
   *
   * Only available if @faker-js/faker is installed as a peer dependency.
   * If not installed, this will be undefined.
   *
   * @see https://fakerjs.dev/
   */
  faker?: unknown;

  /**
   * The operation ID this seed is associated with.
   *
   * @example 'getPetById', 'listPets'
   */
  operationId: string;

  /**
   * Environment variables accessible to seed functions.
   *
   * Allows seeds to behave differently based on environment.
   */
  env: Record<string, string | undefined>;
}

/**
 * Registry of all endpoints discovered from the OpenAPI specification.
 *
 * This registry is used internally to track available endpoints,
 * their handlers, and associated metadata. It can also be exposed
 * to consumers for debugging and testing purposes.
 *
 * @example
 * ```typescript
 * const registry: OpenApiEndpointRegistry = {
 *   endpoints: [
 *     {
 *       method: 'GET',
 *       path: '/pets/{petId}',
 *       operationId: 'getPetById',
 *       hasHandler: true,
 *       hasSeed: false,
 *     },
 *   ],
 *   stats: {
 *     total: 15,
 *     withHandlers: 3,
 *     withSeeds: 5,
 *   },
 * };
 * ```
 */
export interface OpenApiEndpointRegistry {
  /**
   * List of all registered endpoints.
   *
   * Each endpoint contains its HTTP method, path template,
   * operation ID, and flags indicating handler/seed presence.
   */
  endpoints: EndpointEntry[];

  /**
   * Summary statistics about the registry.
   */
  stats: {
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
  };
}

/**
 * Individual endpoint entry in the registry.
 *
 * Represents a single API endpoint with its metadata and
 * customization status.
 */
export interface EndpointEntry {
  /**
   * HTTP method for this endpoint.
   *
   * @example 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'
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
   * @example 'getPetById', 'createUser'
   */
  operationId: string;

  /**
   * Whether a custom handler exists for this endpoint.
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

  /**
   * Tags associated with this endpoint from the OpenAPI spec.
   *
   * Useful for filtering and grouping endpoints.
   */
  tags?: string[];

  /**
   * Short summary from the OpenAPI spec.
   */
  summary?: string;
}
