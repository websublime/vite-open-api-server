/**
 * tsdown Configuration for @websublime/vite-plugin-open-api-server
 *
 * This configuration file defines the build settings for the Vite plugin package using tsdown,
 * a TypeScript bundler built on esbuild and rollup-plugin-dts.
 *
 * ## What
 * Configures tsdown to produce ESM-only output with TypeScript declarations and source maps,
 * externalizing peer dependencies to prevent bundling issues.
 *
 * ## How
 * - Uses `defineConfig` for type-safe configuration
 * - Two entry points:
 *   - `src/index.ts`: Main plugin entry matching package.json exports
 *   - `src/runner/openapi-server-runner.mts`: Standalone mock server executable
 * - ESM-only format matching `"type": "module"` in package.json
 * - Generates `.d.mts` declaration files for TypeScript consumers
 * - Produces source maps for debugging production builds
 * - Externalizes vite and @faker-js/faker (peer dependencies)
 *
 * ## Why
 * - **ESM-only**: Modern standard, matches package.json `type: "module"`
 * - **DTS generation**: Enables TypeScript support in consuming projects
 * - **Source maps**: Allows debugging original TypeScript in production
 * - **External deps**: Prevents version conflicts and bundle bloat
 * - **Clean builds**: Removes stale artifacts from previous builds
 * - **Runner entry**: Separate executable for child process mock server
 *
 * @see https://github.com/nicepkg/tsdown - tsdown documentation
 */
import { defineConfig } from 'tsdown';

export default defineConfig({
  /**
   * Entry points for the bundle.
   * - `src/index.ts`: Main plugin entry matching package.json exports
   * - `src/runner/openapi-server-runner.mts`: Standalone mock server runner
   *   compiled to `dist/runner/openapi-server-runner.mjs` for child process execution
   */
  entry: ['src/index.ts', 'src/runner/openapi-server-runner.mts', 'src/devtools/index.ts'],

  /**
   * Output format.
   * ESM-only to match package.json `type: "module"` and modern Node.js standards.
   */
  format: ['esm'],

  /**
   * Generate TypeScript declaration files (.d.mts).
   * Enables type checking and IntelliSense in consuming projects.
   */
  dts: true,

  /**
   * Clean output directory before each build.
   * Prevents stale artifacts from previous builds causing import errors.
   */
  clean: true,

  /**
   * Generate source maps (.mjs.map).
   * Enables debugging with original TypeScript source in production builds.
   */
  sourcemap: true,

  /**
   * Output directory for built artifacts.
   * Matches package.json `files: ["dist"]` and `exports` paths.
   */
  outDir: 'dist',

  /**
   * External dependencies that should not be bundled.
   * - `vite`: Peer dependency, consumers provide their own version
   * - `@faker-js/faker`: Optional peer dependency for seed data generation
   *
   * These are imported at runtime rather than bundled, preventing:
   * - Version conflicts with consumer's installed versions
   * - Unnecessary bundle size increase
   * - Duplicate code in final application
   */
  external: ['vite', '@faker-js/faker', 'vue'],
});
