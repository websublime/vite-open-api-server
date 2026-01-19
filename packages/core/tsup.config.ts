/**
 * tsup Configuration for @voas/core
 *
 * What: Configures tsup bundler for the core package
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
    // Peer dependencies that consumers should provide
  ],
});
