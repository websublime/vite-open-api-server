/**
 * Public Type Definitions
 *
 * ## What
 * This module exports all public TypeScript types and interfaces for the
 * `@websublime/vite-plugin-open-api-server` package. These types are part
 * of the public API and are intended for use by plugin consumers.
 *
 * ## How
 * Types are organized into categories:
 * - **Plugin Configuration**: Options for configuring the plugin
 * - **Handler API**: Types for implementing custom request handlers (code-based)
 * - **Seed API**: Types for implementing seed data generators (code-based)
 * - **Security API**: Types for accessing authentication state
 *
 * ## Why
 * Centralized type exports provide a clean public API surface while keeping
 * internal implementation types private. This ensures consumers only depend
 * on stable, documented types.
 *
 * @example
 * ```typescript
 * import type {
 *   OpenApiServerPluginOptions,
 *   HandlerCodeContext,
 *   HandlerValue,
 *   SeedCodeContext,
 *   SeedValue,
 * } from '@websublime/vite-plugin-open-api-server';
 * ```
 *
 * @module @websublime/vite-plugin-open-api-server/types
 */

// =============================================================================
// Plugin Configuration Types
// =============================================================================

/**
 * Plugin configuration options.
 *
 * @see {@link OpenApiServerPluginOptions}
 */
/**
 * Internal plugin option types for plugin implementation.
 *
 * @internal
 */
export type {
  InputPluginOptions,
  OpenApiServerPluginOptions,
  ResolvedPluginOptions,
} from './plugin-options.js';

// =============================================================================
// Handler API Types (Public)
// =============================================================================

/**
 * Types for implementing custom request handlers.
 *
 * Handler files export an object mapping operationId to JavaScript code.
 * The code can be a static string or a function that generates code
 * dynamically based on the operation context.
 *
 * @see {@link HandlerCodeContext} - Context passed to dynamic code generators
 * @see {@link HandlerCodeGeneratorFn} - Function signature for dynamic handlers
 * @see {@link HandlerValue} - Either static code string or generator function
 * @see {@link HandlerExports} - Map of operationId to handler values
 * @see {@link HandlerFileExports} - Expected exports from handler files
 * @see {@link HandlerLoadResult} - Result of loading handler files
 * @see {@link ResolvedHandlers} - Resolved code strings for injection
 */
export type {
  HandlerCodeContext,
  HandlerCodeGeneratorFn,
  HandlerExports,
  HandlerFileExports,
  HandlerLoadResult,
  HandlerValue,
  ResolvedHandlers,
} from './handlers.js';

// =============================================================================
// Seed API Types (Public)
// =============================================================================

/**
 * Types for implementing seed data generators.
 *
 * Seed files export an object mapping schemaName to JavaScript code.
 * The code can be a static string or a function that generates code
 * dynamically based on the schema context.
 *
 * @see {@link SeedCodeContext} - Context passed to dynamic code generators
 * @see {@link SeedCodeGeneratorFn} - Function signature for dynamic seeds
 * @see {@link SeedValue} - Either static code string or generator function
 * @see {@link SeedExports} - Map of schemaName to seed values
 * @see {@link SeedFileExports} - Expected exports from seed files
 * @see {@link SeedLoadResult} - Result of loading seed files
 * @see {@link ResolvedSeeds} - Resolved code strings for injection
 */
export type {
  ResolvedSeeds,
  SeedCodeContext,
  SeedCodeGeneratorFn,
  SeedExports,
  SeedFileExports,
  SeedLoadResult,
  SeedValue,
} from './seeds.js';

// =============================================================================
// Security API Types (Public)
// =============================================================================

/**
 * Types for accessing authentication state in handlers.
 *
 * @see {@link NormalizedSecurityScheme}
 * @see {@link SecurityRequirement}
 * @see {@link SecurityContext}
 */
export type {
  ApiKeySecurityScheme,
  HttpSecurityScheme,
  NormalizedSecurityScheme,
  OAuth2Flow,
  OAuth2SecurityScheme,
  OpenIdConnectSecurityScheme,
  SecurityContext,
  SecurityRequirement,
} from './security.js';

// =============================================================================
// Registry Types (Public - Read-only access)
// =============================================================================

/**
 * Registry types for accessing parsed OpenAPI endpoint information.
 * Exposed as read-only through HandlerCodeContext and SeedCodeContext.
 *
 * @see {@link OpenApiEndpointRegistry}
 * @see {@link OpenApiEndpointEntry}
 * @see {@link OpenApiServerSchemaEntry}
 * @see {@link OpenApiSecuritySchemeEntry}
 */
export type {
  EndpointRegistryEntry,
  OpenApiEndpointEntry,
  OpenApiEndpointRegistry,
  OpenApiSecuritySchemeEntry,
  OpenApiServerSchemaEntry,
  RegistryStats,
} from './registry.js';

// =============================================================================
// Internal Types (NOT Exported)
// =============================================================================

// The following types are internal implementation details and are NOT exported:
//
// - ipc-messages.ts: IPC protocol types for parent-child process communication
//   - ReadyMessage, ErrorMessage, RequestMessage, ResponseMessage
//   - ShutdownMessage, LogMessage, ReloadMessage, ReloadedMessage
//   - OpenApiServerMessage (discriminated union)
//   - ParentToChildMessage, ChildToParentMessage (helper unions)
//
// These types are used internally by the plugin and mock server implementation
// and should not be relied upon by external consumers as they may change
// without notice.
