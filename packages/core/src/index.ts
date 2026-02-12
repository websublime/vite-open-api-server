/**
 * @websublime/vite-plugin-open-api-core - Core Server Package
 *
 * What: Core server logic for vite-open-api-server
 * How: Provides OpenAPI processing, routing, store, and data generation
 * Why: Reusable server components independent of Vite
 *
 * @module @websublime/vite-plugin-open-api-core
 */

// =============================================================================
// Server Factory
// =============================================================================

export { createOpenApiServer } from './server.js';
export type { OpenApiServer, OpenApiServerConfig } from './server.js';

// =============================================================================
// DevTools Server - Static File Serving
// =============================================================================

export { mountDevToolsRoutes } from './devtools-server.js';
export type { MountDevToolsOptions } from './devtools-server.js';

// =============================================================================
// Parser Module - OpenAPI Document Processing
// =============================================================================

export { processOpenApiDocument, ProcessorError } from './parser/index.js';
export type { ProcessorOptions } from './parser/index.js';

// =============================================================================
// Store Module - In-Memory Data Store
// =============================================================================

export { createStore, StoreError } from './store/index.js';
export type { Store, StoreOptions } from './store/index.js';

// =============================================================================
// Router Module - Hono Route Generation
// =============================================================================

export {
    buildRegistry,
    buildRoutes,
    convertOpenApiPath,
    createEndpointKey,
    parseEndpointKey,
    updateRegistryHandlers,
    updateRegistrySeeds
} from './router/index.js';
export type {
    EndpointEntry,
    EndpointKey,
    EndpointRegistry,
    HttpMethod,
    RegistryBuilderOptions,
    RegistryStats,
    RouteBuilderOptions,
    RouteBuilderResult,
    SecurityRequirement
} from './router/index.js';

// =============================================================================
// Generator Module - Fake Data Generation
// =============================================================================

// Public API - main generator functions
// Mapping constants for advanced customization
export {
    DATE_FORMAT_POST_PROCESSING,
    FIELD_NAME_MAPPING,
    generateFromFieldName,
    generateFromSchema,
    TYPE_FORMAT_MAPPING
} from './generator/index.js';

// =============================================================================
// Handlers Module - Custom Handler Execution
// =============================================================================

export {
    defineHandlers, executeHandler, ExecutorError, normalizeResponse
} from './handlers/index.js';
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
    NormalizeOptions
} from './handlers/index.js';

// =============================================================================
// WebSocket Module - Real-time Communication
// =============================================================================

export {
    CLIENT_COMMAND_TYPES,
    createCommandHandler,
    createWebSocketHub
} from './websocket/index.js';
export type {
    ClientCommand,
    ClientCommandData,
    ClientCommandType,
    CommandHandler,
    CommandHandlerDeps,
    RequestLogEntry,
    ResponseLogEntry,
    ServerEvent,
    ServerEventData,
    SimulationBase,
    SimulationConfig,
    SimulationState,
    SpecInfo,
    WebSocketClient,
    WebSocketHub,
    WebSocketHubLogger,
    WebSocketHubOptions
} from './websocket/index.js';

// =============================================================================
// Security Module - OpenAPI Security Scheme Handling
// =============================================================================

export { resolveSecuritySchemes, validateSecurity } from './security/index.js';
export type {
    ResolvedSecurityScheme,
    SecurityContext,
    SecurityRequest,
    SecuritySchemeIn,
    SecuritySchemeType,
    SecurityValidationResult,
    ValidateSecurityOptions
} from './security/index.js';

// =============================================================================
// Simulation Module - Error and Delay Simulation
// =============================================================================

export { createSimulationManager } from './simulation/index.js';
export type { Simulation, SimulationManager } from './simulation/index.js';

// =============================================================================
// Internal API Module - DevTools and Management Routes
// =============================================================================

export { mountInternalApi } from './internal-api.js';
export type { InternalApiDeps, TimelineEntry } from './internal-api.js';

// =============================================================================
// Seeds Module - Seed Loading and Execution
// =============================================================================

export {
    createSeedContext,
    createSeedHelper,
    defineSeeds,
    executeSeedDefinition,
    executeSeeds,
    SeedExecutorError
} from './seeds/index.js';
export type {
    AnySeedFn,
    AsyncSeedFn,
    ExecuteSeedsOptions,
    ExecuteSeedsResult,
    SeedContext,
    SeedDefinition,
    SeedFn,
    SeedFnMap,
    SeedHelper
} from './seeds/index.js';

