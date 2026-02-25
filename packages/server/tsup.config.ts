/**
 * tsup Configuration for @websublime/vite-plugin-open-api-server
 *
 * What: Configures tsup bundler for the Vite plugin package
 * How: Bundles TypeScript source to ESM with type declarations
 * Why: Provides optimized, tree-shakeable output for consumers
 */

import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  target: 'node20',
  outDir: 'dist',
  external: [
    // Peer dependencies - consumers provide
    'vite',
    'hono',
    '@hono/node-server',
    '@hono/node-ws',
    // Dependencies - bundled or consumer-installed
    '@websublime/vite-plugin-open-api-core',
    'chokidar',
    'picocolors',
    'fast-glob',
  ],
});
