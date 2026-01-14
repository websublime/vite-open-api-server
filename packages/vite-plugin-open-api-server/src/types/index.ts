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
 * - **Handler API**: Types for implementing custom request handlers
 * - **Seed API**: Types for implementing seed data generators
 * - **Security API**: Types for accessing authentication state in handlers
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
 *   HandlerContext,
 *   HandlerResponse,
 *   SeedContext,
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
 * @see {@link HandlerContext}
 * @see {@link HandlerResponse}
 * @see {@link HandlerCodeGenerator}
 * @see {@link HandlerFileExports}
 */
export type {
  HandlerCodeGenerator,
  HandlerContext,
  HandlerFileExports,
  HandlerResponse,
} from './handlers.js';

// =============================================================================
// Seed API Types (Public)
// =============================================================================

/**
 * Types for implementing seed data generators.
 *
 * @see {@link SeedContext}
 * @see {@link SeedData}
 * @see {@link SeedCodeGenerator}
 * @see {@link SeedFileExports}
 */
export type { SeedCodeGenerator, SeedContext, SeedData, SeedFileExports } from './seeds.js';

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
 * Exposed as read-only through HandlerContext and SeedContext.
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
