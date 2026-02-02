/**
 * @websublime/vite-open-api-core - Core Server Package
 *
 * What: Core server logic for vite-open-api-server
 * How: Provides OpenAPI processing, routing, store, and data generation
 * Why: Reusable server components independent of Vite
 *
 * @module @websublime/vite-open-api-core
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
  EndpointKey,
  EndpointRegistry,
  HttpMethod,
  RegistryBuilderOptions,
  RegistryStats,
  RouteBuilderOptions,
  RouteBuilderResult,
  SecurityRequirement,
} from './router/index.js';
export {
  buildRegistry,
  buildRoutes,
  convertOpenApiPath,
  createEndpointKey,
  parseEndpointKey,
  updateRegistryHandlers,
  updateRegistrySeeds,
} from './router/index.js';

// =============================================================================
// Generator Module - Fake Data Generation
// =============================================================================

// Public API - main generator functions
// Mapping constants for advanced customization
// Internal/deprecated exports for backward compatibility
export {
  _generateFromFieldName,
  _generateFromSchema,
  DATE_FORMAT_POST_PROCESSING,
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
  HandlerDefinition,
  HandlerFn,
  HandlerRequest,
  HandlerResponse,
  HandlerResponseMeta,
  HandlerReturn,
  HandlerReturnRaw,
  HandlerReturnWithHeaders,
  HandlerReturnWithStatus,
  Logger,
  NormalizeOptions,
} from './handlers/index.js';
export {
  defineHandlers,
  ExecutorError,
  executeHandler,
  normalizeResponse,
} from './handlers/index.js';

// =============================================================================
// WebSocket Module - Real-time Communication
// =============================================================================

export type {
  ClientCommand,
  RequestLogEntry,
  ResponseLogEntry,
  ServerEvent,
  SimulationBase,
  SimulationConfig,
  SimulationState,
  WebSocketHub,
} from './websocket/index.js';
export { createWebSocketHub } from './websocket/index.js';

// =============================================================================
// Simulation Module - Error and Delay Simulation
// =============================================================================

export type { Simulation, SimulationManager } from './simulation/index.js';
export { createSimulationManager } from './simulation/index.js';

// =============================================================================
// Internal API Module - DevTools and Management Routes
// =============================================================================

export type { InternalApiDeps, TimelineEntry } from './internal-api.js';
export { mountInternalApi } from './internal-api.js';

// =============================================================================
// Seeds Module - Seed Loading and Execution
// =============================================================================

export type {
  AnySeedFn,
  AsyncSeedFn,
  ExecuteSeedsOptions,
  ExecuteSeedsResult,
  SeedContext,
  SeedDefinition,
  SeedFn,
  SeedFnMap,
  SeedHelper,
} from './seeds/index.js';
export {
  createSeedContext,
  createSeedHelper,
  defineSeeds,
  executeSeedDefinition,
  executeSeeds,
  SeedExecutorError,
} from './seeds/index.js';
