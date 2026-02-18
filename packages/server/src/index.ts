/**
 * @websublime/vite-plugin-open-api-server
 *
 * What: Vite plugin for OpenAPI mock server with DevTools integration
 * How: Integrates with Vite dev server to provide mock API endpoints
 * Why: Enables rapid frontend development without backend dependencies
 *
 * @module @websublime/vite-plugin-open-api-server
 */

// =============================================================================
// Main Plugin Export
// =============================================================================

export { openApiServer } from './plugin.js';

// =============================================================================
// Type Exports
// =============================================================================

export { ValidationError } from './types.js';
export type {
    OpenApiServerOptions,
    ProxyPathSource,
    ResolvedOptions,
    ResolvedSpecConfig,
    SpecConfig,
    ValidationErrorCode
} from './types.js';

// =============================================================================
// Spec ID Derivation (for advanced use cases)
// =============================================================================

export { deriveSpecId, slugify, validateUniqueIds } from './spec-id.js';

// =============================================================================
// Proxy Path Derivation (for advanced use cases)
// =============================================================================

export { deriveProxyPath, normalizeProxyPath, validateUniqueProxyPaths } from './proxy-path.js';
export type { DeriveProxyPathResult } from './proxy-path.js';

// =============================================================================
// Orchestrator (multi-spec)
// =============================================================================

export { createOrchestrator, SPEC_COLORS } from './orchestrator.js';
export type { OrchestratorResult, SpecInstance } from './orchestrator.js';

// =============================================================================
// Handler Loading (for advanced use cases)
// =============================================================================

export { getHandlerFiles, loadHandlers } from './handlers.js';
export type { LoadHandlersResult } from './handlers.js';

// =============================================================================
// Seed Loading (for advanced use cases)
// =============================================================================

export { getSeedFiles, loadSeeds } from './seeds.js';
export type { LoadSeedsResult } from './seeds.js';

// =============================================================================
// Hot Reload (for advanced use cases)
// =============================================================================

export { createFileWatcher, debounce } from './hot-reload.js';
export type { FileWatcher, FileWatcherOptions } from './hot-reload.js';

// =============================================================================
// DevTools Integration
// =============================================================================

export { getDevToolsUrl, registerDevTools } from './devtools.js';
export type { RegisterDevToolsOptions } from './devtools.js';

// =============================================================================
// Re-exports from Core Package (convenience)
// =============================================================================

// Type re-exports for handler/seed authoring
export type {
    HandlerContext,
    HandlerDefinition,
    HandlerFn,
    HandlerReturn,
    SecurityContext,
    SeedContext,
    SeedDefinition,
    SeedFn,
    SeedHelper
} from '@websublime/vite-plugin-open-api-core';
// Handler and seed definition utilities
export { defineHandlers, defineSeeds } from '@websublime/vite-plugin-open-api-core';
