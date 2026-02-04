/**
 * Vitest Setup File
 *
 * What: Global setup for Vitest tests
 * How: Polyfills for JSDOM environment
 * Why: Ensures browser APIs are available in tests
 */

// Polyfill structuredClone for JSDOM
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj));
}
