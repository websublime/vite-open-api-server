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
  buildRegistry,
  type RegistryBuilderOptions,
  updateRegistryHandlers,
  updateRegistrySeeds,
} from './registry-builder.js';
export {
  buildRoutes,
  type RouteBuilderOptions,
  type RouteBuilderResult,
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
