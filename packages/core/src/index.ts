/**
 * @voas/core - Core Server Package
 *
 * What: Core server logic for vite-open-api-server
 * How: Provides OpenAPI processing, routing, store, and data generation
 * Why: Reusable server components independent of Vite
 *
 * @module @voas/core
 */

// =============================================================================
// Server Factory
// =============================================================================

export type { OpenApiServer, OpenApiServerConfig } from './server.js';
export { createOpenApiServer } from './server.js';

// =============================================================================
// Parser Module - OpenAPI Document Processing
// =============================================================================

export type { ProcessorOptions } from './parser/index.js';
export { ProcessorError, processOpenApiDocument } from './parser/index.js';

// =============================================================================
// Store Module - In-Memory Data Store
// =============================================================================

export type { Store, StoreOptions } from './store/index.js';
export { createStore, StoreError } from './store/index.js';

// =============================================================================
// Router Module - Hono Route Generation
// =============================================================================

export type {
  EndpointEntry,
  EndpointRegistry,
  HttpMethod,
  RegistryStats,
  RouteBuilderOptions,
  SecurityRequirement,
} from './router/index.js';
export { buildRoutes, convertOpenApiPath } from './router/index.js';

// =============================================================================
// Generator Module - Fake Data Generation
// =============================================================================

export {
  FIELD_NAME_MAPPING,
  generateFromFieldName,
  generateFromSchema,
  TYPE_FORMAT_MAPPING,
} from './generator/index.js';

// =============================================================================
// Handlers Module - Custom Handler Execution
// =============================================================================

export type {
  HandlerContext,
  HandlerFn,
  HandlerResponse,
  HandlerReturn,
} from './handlers/index.js';
export { executeHandler } from './handlers/index.js';

// =============================================================================
// WebSocket Module - Real-time Communication
// =============================================================================

export type {
  ClientCommand,
  RequestLogEntry,
  ResponseLogEntry,
  ServerEvent,
  SimulationConfig,
  WebSocketHub,
} from './websocket/index.js';
export { createWebSocketHub } from './websocket/index.js';

// =============================================================================
// Simulation Module - Error and Delay Simulation
// =============================================================================

export type { Simulation, SimulationManager } from './simulation/index.js';
export { createSimulationManager } from './simulation/index.js';
