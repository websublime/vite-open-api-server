/**
 * Vite Plugin Types
 *
 * What: Type definitions for the OpenAPI server Vite plugin
 * How: Defines configuration options and internal types
 * Why: Provides type safety and documentation for plugin consumers
 *
 * @module types
 */

import type { Logger } from '@websublime/vite-open-api-core';

/**
 * Plugin configuration options
 *
 * @example
 * ```typescript
 * import { openApiServer } from '@websublime/vite-plugin-open-api-server';
 *
 * export default defineConfig({
 *   plugins: [
 *     openApiServer({
 *       spec: './openapi/petstore.yaml',
 *       port: 4000,
 *       proxyPath: '/api',
 *       handlersDir: './mocks/handlers',
 *       seedsDir: './mocks/seeds',
 *     }),
 *   ],
 * });
 * ```
 */
export interface OpenApiServerOptions {
  /**
   * Path to OpenAPI spec file (required)
   *
   * Supports:
   * - Local file paths (relative or absolute)
   * - URLs (http:// or https://)
   * - YAML or JSON format
   *
   * @example './openapi/petstore.yaml'
   * @example 'https://petstore3.swagger.io/api/v3/openapi.json'
   */
  spec: string;

  /**
   * Server port for the mock server
   *
   * The mock server runs on this port, and Vite proxies
   * requests from `proxyPath` to this server.
   *
   * @default 4000
   */
  port?: number;

  /**
   * Base path for request proxy
   *
   * All requests to this path in your Vite dev server
   * will be proxied to the mock server.
   *
   * @example '/api/v3'
   * @default '/api'
   */
  proxyPath?: string;

  /**
   * Directory containing handler files
   *
   * Handler files should export an object with operationId keys
   * and handler functions as values. Use `defineHandlers()` for
   * type-safe handler definitions.
   *
   * @example './mocks/handlers'
   * @default './mocks/handlers'
   */
  handlersDir?: string;

  /**
   * Directory containing seed files
   *
   * Seed files should export an object with schema name keys
   * and seed functions as values. Use `defineSeeds()` for
   * type-safe seed definitions.
   *
   * @example './mocks/seeds'
   * @default './mocks/seeds'
   */
  seedsDir?: string;

  /**
   * Enable/disable the plugin
   *
   * When false, the plugin does nothing and Vite runs normally.
   * Useful for conditional enabling based on environment.
   *
   * @default true
   */
  enabled?: boolean;

  /**
   * ID field configuration per schema
   *
   * Maps schema names to the field used as the primary identifier.
   * Used by the store for CRUD operations.
   *
   * @example { User: 'username', Order: 'orderId' }
   * @default {} (uses 'id' for all schemas)
   */
  idFields?: Record<string, string>;

  /**
   * Maximum timeline events to keep
   *
   * The timeline stores request/response history for DevTools.
   * Older events are removed when this limit is exceeded.
   *
   * @default 500
   */
  timelineLimit?: number;

  /**
   * Enable DevTools integration
   *
   * When true, mounts the DevTools SPA at `/_devtools`
   * and enables Vue DevTools custom tab.
   *
   * @default true
   */
  devtools?: boolean;

  /**
   * Enable CORS on the mock server
   *
   * @default true
   */
  cors?: boolean;

  /**
   * CORS origin configuration
   *
   * @default '*'
   */
  corsOrigin?: string | string[];

  /**
   * Custom logger instance
   *
   * Defaults to a Vite-integrated logger that respects
   * Vite's logging level settings.
   */
  logger?: Logger;

  /**
   * Suppress startup banner
   *
   * When true, the plugin won't print the startup banner
   * showing server details and loaded handlers/seeds.
   *
   * @default false
   */
  silent?: boolean;
}

/**
 * Resolved plugin options with defaults applied
 *
 * @internal
 */
export interface ResolvedOptions {
  spec: string;
  port: number;
  proxyPath: string;
  handlersDir: string;
  seedsDir: string;
  enabled: boolean;
  idFields: Record<string, string>;
  timelineLimit: number;
  devtools: boolean;
  cors: boolean;
  corsOrigin: string | string[];
  silent: boolean;
  logger?: Logger;
}

/**
 * Resolve options with defaults
 *
 * @param options - User-provided options
 * @returns Resolved options with all defaults applied
 */
export function resolveOptions(options: OpenApiServerOptions): ResolvedOptions {
  return {
    spec: options.spec,
    port: options.port ?? 4000,
    proxyPath: options.proxyPath ?? '/api',
    handlersDir: options.handlersDir ?? './mocks/handlers',
    seedsDir: options.seedsDir ?? './mocks/seeds',
    enabled: options.enabled ?? true,
    idFields: options.idFields ?? {},
    timelineLimit: options.timelineLimit ?? 500,
    devtools: options.devtools ?? true,
    cors: options.cors ?? true,
    corsOrigin: options.corsOrigin ?? '*',
    silent: options.silent ?? false,
    logger: options.logger,
  };
}
