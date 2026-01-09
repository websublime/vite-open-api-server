/**
 * Vitest Configuration
 *
 * What: Configures Vitest test runner for the monorepo
 * How: Uses defineConfig to set up test environment, includes, and CI-friendly options
 * Why: Provides consistent test configuration across all packages and allows CI to pass
 *      during early development when no tests exist yet
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /**
     * Allow the test suite to pass when no test files are found.
     * This is essential during early development phases where test infrastructure
     * is set up before actual tests are written.
     */
    passWithNoTests: true,

    /**
     * Test file patterns to include.
     * Matches files ending in .test.ts, .spec.ts, .test.tsx, .spec.tsx, etc.
     */
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],

    /**
     * Directories and patterns to exclude from test discovery.
     */
    exclude: ['**/node_modules/**', '**/dist/**', '**/.git/**'],

    /**
     * Enable global test APIs (describe, it, expect) without explicit imports.
     * This provides a cleaner testing experience similar to Jest.
     */
    globals: true,

    /**
     * Use Node.js environment for tests.
     * Can be changed to 'jsdom' or 'happy-dom' for DOM-related tests.
     */
    environment: 'node',

    /**
     * Reporter configuration for test output.
     * Uses 'verbose' in development and 'default' in CI for cleaner logs.
     */
    reporters: process.env.CI ? ['default'] : ['verbose'],

    /**
     * Coverage configuration (disabled by default, can be enabled with --coverage flag).
     */
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.config.*'],
    },
  },
});
