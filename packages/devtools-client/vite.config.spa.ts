/**
 * Vite Configuration for SPA Build
 *
 * What: Configures Vite for building the DevTools as a standalone SPA
 * How: Full app build with all dependencies bundled, base path set to /_devtools/
 * Why: The SPA is served by the Hono server at /_devtools/ and embedded in Vue DevTools via iframe
 *
 * This config is separate from vite.config.ts (library build) because the SPA build:
 * - Bundles Vue, Pinia, and Vue Router (not externalized)
 * - Uses /_devtools/ as the base path for asset URLs
 * - Outputs to dist/spa/ (shipped inside the server package)
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  base: '/_devtools/',
  build: {
    outDir: 'dist/spa',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
});
