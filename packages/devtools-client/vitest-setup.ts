/**
 * Vitest Setup File
 *
 * What: Global setup for Vitest tests
 * How: Polyfills for JSDOM environment
 * Why: Ensures browser APIs are available in tests
 */

// Polyfill structuredClone for JSDOM
// Force override of native structuredClone because Node.js native implementation
// fails to clone Vue reactive refs in test environment
// Use JSON parse/stringify for simple test data cloning
// Note: This is lossy for Dates, Maps, Sets, RegExps, circular refs, undefined and functions
// but works fine for the simple test data objects used in this test suite
global.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj)) as T;
