/**
 * @module @websublime/vite-plugin-open-api-server
 *
 * Vite plugin for OpenAPI-based mock server with Scalar integration.
 *
 * ## What
 * This module exports the main Vite plugin and related types for integrating
 * an OpenAPI mock server into Vite's development workflow. It provides a
 * seamless development experience by automatically generating mock responses
 * from OpenAPI specifications.
 *
 * ## How
 * The plugin spawns a child process running @scalar/mock-server, enhanced with
 * custom handlers and seeds loaded from user-defined .mjs files. It integrates
 * with Vite's development server lifecycle to start/stop the mock server
 * automatically and provides hot-reload support for handlers and seed data.
 *
 * ## Why
 * Enables frontend developers to work independently of backend services during
 * local development, with realistic mock data and customizable response logic.
 * This eliminates the need to wait for backend APIs to be ready and allows
 * for rapid prototyping and testing of edge cases.
 *
 * @example
 * ```typescript
 * import { openApiServerPlugin } from '@websublime/vite-plugin-open-api-server';
 * import { defineConfig } from 'vite';
 *
 * export default defineConfig({
 *   plugins: [
 *     openApiServerPlugin({
 *       openApiPath: './src/apis/petstore/petstore.openapi.yaml',
 *       port: 3456,
 *       handlersDir: './src/apis/petstore/open-api-server/handlers',
 *       seedsDir: './src/apis/petstore/open-api-server/seeds',
 *     }),
 *   ],
 * });
 * ```
 *
 * @packageDocumentation
 */

export type { MethodCounts } from './logging/index.js';

// Logging utilities for console banners
export {
  // Color constants for custom formatting
  BOLD,
  CYAN,
  DIM,
  formatMethodCounts,
  GREEN,
  printErrorBanner,
  printLoadingBanner,
  printSuccessBanner,
  RED,
  RESET,
  YELLOW,
} from './logging/index.js';
export { openApiServerPlugin, openApiServerPlugin as default } from './plugin.js';

export type {
  HandlerCodeGenerator,
  HandlerContext,
  HandlerFileExports,
  HandlerResponse,
  NormalizedSecurityScheme,
  OpenApiEndpointRegistry,
  OpenApiServerPluginOptions,
  SecurityContext,
  SecurityRequirement,
  SeedCodeGenerator,
  SeedContext,
  SeedData,
  SeedFileExports,
} from './types/index.js';
