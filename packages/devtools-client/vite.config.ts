/**
 * Vite Configuration for @websublime/vite-open-api-devtools
 *
 * What: Configures Vite for building the DevTools SPA as a library
 * How: Uses Vue plugin and library mode for bundling
 * Why: Allows the SPA to be embedded in the Vite dev server
 */

import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'ViteOpenApiDevtools',
      fileName: 'devtools',
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      // Externalize deps that shouldn't be bundled
      external: ['vue', 'vue-router', 'pinia'],
      output: {
        // Global variables for UMD build
        globals: {
          vue: 'Vue',
          'vue-router': 'VueRouter',
          pinia: 'Pinia',
        },
        // Preserve CSS in a separate file
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'style.css';
          }
          return assetInfo.name ?? 'assets/[name]-[hash][extname]';
        },
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
  },
  // Dev server configuration for standalone development
  server: {
    port: 5174,
    open: true,
  },
});
