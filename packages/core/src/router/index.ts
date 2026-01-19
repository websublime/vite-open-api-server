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
export {
  buildRoutes,
  RouteBuilderNotImplementedError,
  type RouteBuilderOptions,
} from './route-builder.js';
export type {
  EndpointEntry,
  EndpointKey,
  EndpointRegistry,
  HttpMethod,
  RegistryStats,
  SecurityRequirement,
} from './types.js';
export { createEndpointKey, parseEndpointKey } from './types.js';
