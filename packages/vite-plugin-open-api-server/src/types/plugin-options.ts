/**
 * Plugin Options Type Definitions
 *
 * ## What
 * This module defines the configuration options interface for the OpenAPI Server
 * Vite plugin. These options control how the plugin loads OpenAPI specifications,
 * starts the mock server, and handles custom handlers and seed data.
 *
 * ## How
 * The `OpenApiServerPluginOptions` interface is passed to the plugin function
 * when configuring Vite. The only required property is `openApiPath`; all other
 * properties have sensible defaults documented in their JSDoc comments.
 *
 * ## Why
 * A well-defined configuration interface provides excellent IDE support,
 * enables compile-time validation of plugin options, and serves as living
 * documentation for consumers of the plugin.
 *
 * @module
 */

/**
 * Configuration options for the OpenAPI Server Vite plugin.
 *
 * These options control how the plugin loads OpenAPI specifications,
 * starts the mock server, and handles custom handlers and seed data.
 *
 * @example
 * ```typescript
 * import { openApiServerPlugin } from '@websublime/vite-plugin-open-api-server';
 * import { defineConfig } from 'vite';
 *
 * export default defineConfig({
 *   plugins: [
 *     openApiServerPlugin({
 *       openApiPath: './petstore.openapi.yaml',
 *       port: 3001,
 *       proxyPath: '/api',
 *     }),
 *   ],
 * });
 * ```
 */
export interface OpenApiServerPluginOptions {
  /**
   * Path to OpenAPI 3.1 spec file (YAML or JSON).
   *
   * The path is resolved relative to the Vite project root.
   * Supports both YAML (.yaml, .yml) and JSON (.json) formats.
   *
   * @example './src/apis/petstore/petstore.openapi.yaml'
   * @example './api/spec.json'
   */
  openApiPath: string;

  /**
   * Port for mock server child process.
   *
   * The mock server will listen on this port. Must not conflict with
   * the Vite dev server port.
   *
   * @default 3001
   *
   * @example 3001
   * @example 4000
   */
  port?: number;

  /**
   * Base path to proxy to mock server.
   *
   * All requests matching this path prefix will be forwarded to the
   * mock server. This allows the frontend to make API calls to the
   * same origin while the mock server handles them on a different port.
   *
   * @default '/api'
   *
   * @example '/api'
   * @example '/api/v1'
   */
  proxyPath?: string;

  /**
   * Directory for seed data files.
   *
   * Seed files are .mjs modules that export functions to provide
   * consistent test data for mock responses. Seeds are loaded before
   * handlers and can be used to populate the mock server with data.
   *
   * The path is resolved relative to the OpenAPI spec file location.
   *
   * @default './open-api-server/seeds' (relative to spec file)
   *
   * @example './src/apis/petstore/open-api-server/seeds'
   */
  seedsDir?: string;

  /**
   * Directory for custom handler files.
   *
   * Handler files are .mjs modules that export functions to override
   * default mock responses for specific endpoints. Each handler file
   * should match the pattern `{method}.{operationId}.mjs`.
   *
   * The path is resolved relative to the OpenAPI spec file location.
   *
   * @default './open-api-server/handlers' (relative to spec file)
   *
   * @example './src/apis/petstore/open-api-server/handlers'
   */
  handlersDir?: string;

  /**
   * Enable/disable plugin.
   *
   * When set to false, the plugin is completely disabled. Useful for
   * conditionally disabling the mock server in production builds.
   *
   * @default true
   *
   * @example
   * ```typescript
   * openApiServerPlugin({
   *   openApiPath: './petstore.yaml',
   *   enabled: process.env.NODE_ENV !== 'production',
   * })
   * ```
   */
  enabled?: boolean;

  /**
   * Timeout (ms) to wait for mock server startup.
   *
   * If the mock server doesn't send a ready signal within this time,
   * the plugin will throw an error. Increase for large specs that take
   * longer to parse.
   *
   * @default 5000
   *
   * @example 10000
   */
  startupTimeout?: number;

  /**
   * Enable verbose logging.
   *
   * When enabled, the plugin will log detailed information about
   * its operations, including server startup, IPC messages, request
   * handling, and file watching events.
   *
   * @default false
   */
  verbose?: boolean;
}

/**
 * Input options for the plugin function.
 *
 * This type allows all options to be optional at the input level,
 * with validation happening at runtime. This enables the plugin
 * to provide helpful error messages when required options are missing.
 *
 * @internal
 */
export type InputPluginOptions = Partial<OpenApiServerPluginOptions>;

/**
 * Resolved plugin options with defaults applied.
 *
 * This type represents the internal state after merging user options
 * with default values. Some properties may still be undefined if
 * they weren't provided and don't have defaults.
 *
 * @internal
 */
export interface ResolvedPluginOptions {
  /** Path to OpenAPI spec file (required, validated at plugin creation). */
  openApiPath: string;

  /** Port for mock server. Default: 3001 */
  port: number;

  /** Base path to proxy. Default: '/api' */
  proxyPath: string;

  /** Directory for seed files. */
  seedsDir?: string;

  /** Directory for handler files. */
  handlersDir?: string;

  /** Whether plugin is enabled. Default: true */
  enabled: boolean;

  /** Startup timeout in ms. Default: 5000 */
  startupTimeout: number;

  /** Verbose logging. Default: false */
  verbose: boolean;
}
