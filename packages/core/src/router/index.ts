/**
 * Router Module
 *
 * What: Hono route generation from OpenAPI documents
 * How: Builds routes dynamically from path definitions
 * Why: Automatically creates HTTP handlers for all OpenAPI operations
 *
 * @module router
 */

export { convertOpenApiPath } from './path-converter.js';
// TODO: Will be implemented in Task 1.4
export { buildRoutes, type RouteBuilderOptions } from './route-builder.js';
export type {
  EndpointEntry,
  EndpointRegistry,
  HttpMethod,
  RegistryStats,
  SecurityRequirement,
} from './types.js';
