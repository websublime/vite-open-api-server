/**
 * Vite Configuration for Playground App
 *
 * What: Configures Vite dev server with OpenAPI mock server plugin
 * How: Uses openApiServer plugin with petstore.yaml spec
 * Why: Demonstrates all features of vite-plugin-open-api-server
 */

import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import { openApiServer } from '@websublime/vite-plugin-open-api-server';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    vue(),
    openApiServer({
      spec: './openapi/petstore.yaml',
      port: 4000,
      proxyPath: '/api/v3',
      handlersDir: './mocks/handlers',
      seedsDir: './mocks/seeds',
      idFields: {
        Pet: 'id',
        Order: 'id',
        User: 'id',
        Category: 'id',
        Tag: 'id',
      },
      timelineLimit: 500,
      devtools: true,
      cors: true,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
