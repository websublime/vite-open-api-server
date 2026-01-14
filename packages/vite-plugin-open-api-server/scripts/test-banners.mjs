#!/usr/bin/env node
/**
 * Test Script for Banner Visual Verification
 *
 * This script tests the startup banner functions to verify:
 * - Loading banner displays correctly with cyan color
 * - Success banner displays correctly with green color and box
 * - Error banner displays correctly with red color and suggestions
 *
 * Run with: node scripts/test-banners.mjs
 */

import {
  formatMethodCounts,
  printErrorBanner,
  printLoadingBanner,
  printSuccessBanner,
} from '../dist/index.mjs';

// Create a mock logger that outputs to console
const mockLogger = {
  info: (msg) => console.log(msg),
  error: (msg) => console.error(msg),
  warn: (msg) => console.warn(msg),
  warnOnce: (msg) => console.warn(msg),
  clearScreen: () => {},
  hasWarned: false,
  hasErrorLogged: () => false,
};

console.log('='.repeat(70));
console.log('BANNER VISUAL VERIFICATION TEST');
console.log('='.repeat(70));

// Test 1: Loading Banner
console.log('\n--- TEST 1: Loading Banner ---\n');
printLoadingBanner('./src/apis/petstore/petstore.openapi.yaml', mockLogger);

// Wait a bit to simulate loading
await new Promise((resolve) => setTimeout(resolve, 500));

// Test 2: Success Banner (basic)
console.log('\n--- TEST 2: Success Banner (basic) ---\n');
const startTime = performance.now() - 1234; // Simulate 1.234s ago
printSuccessBanner(3001, 19, './src/apis/petstore/petstore.openapi.yaml', startTime, mockLogger);

// Test 3: Success Banner (with method counts)
console.log('\n--- TEST 3: Success Banner (with method counts) ---\n');
const startTime2 = performance.now() - 2567; // Simulate 2.567s ago
printSuccessBanner(3001, 19, './api/spec.yaml', startTime2, mockLogger, {
  GET: 10,
  POST: 5,
  PUT: 2,
  DELETE: 2,
});

// Test 4: Format method counts
console.log('\n--- TEST 4: Format Method Counts ---\n');
console.log('Full counts:', formatMethodCounts({ GET: 10, POST: 5, PUT: 2, PATCH: 1, DELETE: 2 }));
console.log('Partial counts:', formatMethodCounts({ GET: 5, POST: 3 }));
console.log('Empty counts:', formatMethodCounts({}));

// Test 5: Error Banner - File not found
console.log('\n--- TEST 5: Error Banner (ENOENT) ---\n');
printErrorBanner(
  new Error("ENOENT: no such file or directory, open './missing.yaml'"),
  './missing.yaml',
  mockLogger,
);

// Test 6: Error Banner - YAML parse error
console.log('\n--- TEST 6: Error Banner (YAML parse) ---\n');
printErrorBanner(
  new Error('YAML parse error: unexpected token at line 42'),
  './invalid.yaml',
  mockLogger,
);

// Test 7: Error Banner - Invalid OpenAPI
console.log('\n--- TEST 7: Error Banner (Invalid OpenAPI) ---\n');
printErrorBanner(
  new Error('Invalid OpenAPI specification: missing required field "openapi"'),
  './spec.yaml',
  mockLogger,
);

// Test 8: Error Banner - Timeout
console.log('\n--- TEST 8: Error Banner (Timeout) ---\n');
printErrorBanner(
  new Error('Timeout: Mock server did not respond within 5000ms'),
  './spec.yaml',
  mockLogger,
);

// Test 9: Error Banner - Port in use
console.log('\n--- TEST 9: Error Banner (EADDRINUSE) ---\n');
printErrorBanner(
  new Error('EADDRINUSE: address already in use :::3001'),
  './spec.yaml',
  mockLogger,
);

// Test 10: Error Banner - Generic error
console.log('\n--- TEST 10: Error Banner (Generic) ---\n');
printErrorBanner(new Error('Something unexpected happened'), './spec.yaml', mockLogger);

// Test 11: Long path truncation
console.log('\n--- TEST 11: Long Path Truncation ---\n');
printSuccessBanner(
  3001,
  42,
  './very/long/path/to/the/openapi/specification/file/that/exceeds/the/box/width/petstore.openapi.yaml',
  performance.now() - 3210,
  mockLogger,
);

console.log('\n' + '='.repeat(70));
console.log('VERIFICATION COMPLETE');
console.log('='.repeat(70));
console.log('\nPlease visually verify:');
console.log('  ✓ Loading banner shows cyan ⏳ icon');
console.log('  ✓ Success banner shows green ✓ with box border');
console.log('  ✓ Error banners show red ✗ with helpful suggestions');
console.log('  ✓ Box borders render correctly (┌─┐│└─┘)');
console.log('  ✓ Long paths are truncated with "..."');
console.log('  ✓ Method counts display correctly');
console.log('');
