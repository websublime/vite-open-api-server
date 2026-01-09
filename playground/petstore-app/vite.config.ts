/**
 * Vite Configuration for Petstore Playground Application
 *
 * ## What
 * This configuration file sets up Vite for the playground application, integrating
 * both the Vue plugin for Single File Component (SFC) support and the OpenAPI Server
 * plugin for mock API generation during development.
 *
 * ## How
 * The configuration imports and registers two plugins:
 * 1. `@vitejs/plugin-vue` - Enables Vue 3 SFC compilation and hot module replacement
 * 2. `@websublime/vite-plugin-open-api-server` - Spawns a mock server based on the
 *    Petstore OpenAPI specification, enabling frontend development without a backend
 *
 * ## Why
 * This setup enables rapid frontend development by:
 * - Providing instant hot-reload for Vue components
 * - Generating realistic mock API responses from the OpenAPI specification
 * - Supporting custom handlers and seed data for complex testing scenarios
 * - Allowing frontend and backend teams to work independently
 *
 * @module vite.config
 */

import vue from '@vitejs/plugin-vue';
import { openApiServerPlugin } from '@websublime/vite-plugin-open-api-server';
import { defineConfig } from 'vite';

/**
 * Vite configuration object defining plugins and their options.
 *
 * @remarks
 * The OpenAPI server plugin is configured to:
 * - Load the Petstore OpenAPI specification from `./src/apis/petstore/petstore.openapi.yaml`
 * - Run the mock server on port 3456
 * - Proxy API requests under the `/api/v3` path prefix
 * - Load custom handlers from `./src/apis/petstore/open-api-server/handlers`
 * - Load seed data from `./src/apis/petstore/open-api-server/seeds`
 * - Enable verbose logging for development debugging
 */
export default defineConfig({
  plugins: [
    vue(),
    openApiServerPlugin({
      openApiPath: './src/apis/petstore/petstore.openapi.yaml',
      port: 3456,
      proxyPath: '/api/v3',
      handlersDir: './src/apis/petstore/open-api-server/handlers',
      seedsDir: './src/apis/petstore/open-api-server/seeds',
      verbose: true,
    }),
  ],
});
