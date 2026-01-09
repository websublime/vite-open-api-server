/**
 * Vite Plugin Implementation
 *
 * ## What
 * This module contains the main Vite plugin factory function that creates
 * a plugin instance for integrating OpenAPI mock servers into Vite's
 * development workflow.
 *
 * ## How
 * The plugin implements Vite's plugin interface with lifecycle hooks:
 * - `configureServer`: Sets up the mock server when Vite's dev server starts
 * - `buildStart`: Performs initialization tasks at build start
 * - `buildEnd`: Performs cleanup tasks at build end
 *
 * ## Why
 * Vite plugins follow a specific interface pattern. By implementing these
 * hooks, we can integrate seamlessly with Vite's development server and
 * build process, providing automatic mock server management.
 *
 * @module
 */

import type { Plugin, ViteDevServer } from 'vite';

import type { OpenApiServerPluginOptions } from './types';

/**
 * The unique name identifier for this Vite plugin.
 *
 * This name is used by Vite for plugin identification, logging, and
 * deduplication. It should be unique across all plugins in a project.
 *
 * @internal
 */
export const PLUGIN_NAME = 'vite-plugin-open-api-server';

/**
 * Creates a Vite plugin instance for OpenAPI mock server integration.
 *
 * This function is the main entry point for the plugin. It accepts optional
 * configuration options and returns a Vite plugin object that integrates
 * with Vite's development server lifecycle.
 *
 * @param options - Optional configuration for the plugin behavior
 * @returns A Vite plugin object implementing the required lifecycle hooks
 *
 * @example
 * ```typescript
 * import { openApiServerPlugin } from '@websublime/vite-plugin-open-api-server';
 * import { defineConfig } from 'vite';
 *
 * export default defineConfig({
 *   plugins: [
 *     openApiServerPlugin({
 *       openApiPath: './api/openapi.yaml',
 *       port: 3456,
 *     }),
 *   ],
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Using with all options
 * openApiServerPlugin({
 *   openApiPath: './src/apis/petstore/petstore.openapi.yaml',
 *   port: 3456,
 *   proxyPath: '/api',
 *   handlersDir: './src/apis/petstore/handlers',
 *   seedsDir: './src/apis/petstore/seeds',
 *   verbose: true,
 * });
 * ```
 */
export function openApiServerPlugin(options?: OpenApiServerPluginOptions): Plugin {
  // Store resolved options for use in lifecycle hooks
  const resolvedOptions: OpenApiServerPluginOptions = {
    port: 3456,
    proxyPath: '/api',
    verbose: false,
    ...options,
  };

  return {
    /**
     * Unique plugin name for identification.
     */
    name: PLUGIN_NAME,

    /**
     * Configures the Vite development server.
     *
     * This hook is called when the dev server is being configured.
     * It is used to set up the mock server integration, including:
     * - Starting the mock server process
     * - Setting up proxy middleware
     * - Registering file watchers for hot-reload
     *
     * @param server - The Vite development server instance
     *
     * @remarks
     * Implementation will be added in Phase 1 (P1-04: Implement Basic Vite Plugin Skeleton).
     * This stub ensures the plugin structure is valid and can be loaded by Vite.
     */
    configureServer(_server: ViteDevServer): void {
      if (resolvedOptions.verbose) {
        // biome-ignore lint/suspicious/noConsole: Intentional verbose logging for debugging
        console.log(`[${PLUGIN_NAME}] Configuring server with options:`, resolvedOptions);
      }
      // Implementation in Phase 1: P1-04
    },

    /**
     * Called at the start of the build process.
     *
     * This hook is invoked when Vite starts building the project.
     * It can be used for:
     * - Validating OpenAPI specifications
     * - Pre-processing handler files
     * - Setting up build-time assets
     *
     * @remarks
     * Implementation will be added in Phase 1 (P1-04: Implement Basic Vite Plugin Skeleton).
     * This stub ensures the plugin structure is valid and can be loaded by Vite.
     */
    buildStart(): void {
      if (resolvedOptions.verbose) {
        // biome-ignore lint/suspicious/noConsole: Intentional verbose logging for debugging
        console.log(`[${PLUGIN_NAME}] Build starting...`);
      }
      // Implementation in Phase 1: P1-04
    },

    /**
     * Called at the end of the build process.
     *
     * This hook is invoked when Vite finishes building the project.
     * It can be used for:
     * - Cleaning up temporary files
     * - Generating build reports
     * - Stopping any running processes
     *
     * @remarks
     * Implementation will be added in Phase 1 (P1-04: Implement Basic Vite Plugin Skeleton).
     * This stub ensures the plugin structure is valid and can be loaded by Vite.
     */
    buildEnd(): void {
      if (resolvedOptions.verbose) {
        // biome-ignore lint/suspicious/noConsole: Intentional verbose logging for debugging
        console.log(`[${PLUGIN_NAME}] Build ended.`);
      }
      // Implementation in Phase 1: P1-04
    },
  };
}
