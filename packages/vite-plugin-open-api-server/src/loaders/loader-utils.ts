/**
 * Loader Utilities Module
 *
 * ## What
 * This module provides shared utility functions for handler and seed loaders.
 * It contains validation helpers, type checking functions, and logging utilities.
 *
 * ## How
 * The utilities are generic and work with both handler and seed values.
 * They are imported by handler-loader.ts and seed-loader.ts to reduce duplication.
 *
 * ## Why
 * Extracting shared logic into a single module improves maintainability,
 * ensures consistent behavior, and reduces code duplication between loaders.
 *
 * @module
 */

import type { Logger } from 'vite';

/**
 * Check if a value is a valid exports object (plain object, not array/function).
 *
 * Validates that the value is:
 * - An object (typeof === 'object')
 * - Not null
 * - Not an array
 * - A plain object (prototype is Object.prototype)
 *
 * @param value - Value to check
 * @returns True if valid exports object
 *
 * @example
 * ```typescript
 * isValidExportsObject({ getPetById: 'code' }); // true
 * isValidExportsObject([1, 2, 3]); // false
 * isValidExportsObject(() => {}); // false
 * isValidExportsObject(null); // false
 * ```
 */
export function isValidExportsObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    // Ensure it's a plain object, not a class instance
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Check if a value is a valid loader value (string or function).
 *
 * Both handlers and seeds accept either:
 * - A string containing JavaScript code
 * - A function that generates JavaScript code
 *
 * @param value - Value to check
 * @returns True if valid (string or function)
 *
 * @example
 * ```typescript
 * isValidValue('return store.list("Pet");'); // true
 * isValidValue((ctx) => 'return store.get("Pet");'); // true
 * isValidValue(123); // false
 * isValidValue(null); // false
 * ```
 */
export function isValidValue(value: unknown): value is string | ((...args: unknown[]) => unknown) {
  return typeof value === 'string' || typeof value === 'function';
}

/**
 * Get a human-readable type description for a loader value.
 *
 * @param value - String or function value
 * @returns Description like "static, 42 chars" or "dynamic function"
 *
 * @example
 * ```typescript
 * getValueType('return store.list("Pet");'); // "static, 25 chars"
 * getValueType((ctx) => 'code'); // "dynamic function"
 * ```
 */
export function getValueType(value: string | ((...args: unknown[]) => unknown)): string {
  if (typeof value === 'string') {
    return `static, ${value.length} chars`;
  }
  return 'dynamic function';
}

/**
 * Log the loading summary for handlers or seeds.
 *
 * @param itemType - Type of items ("handler" or "seed")
 * @param itemCount - Number of items loaded
 * @param fileCount - Number of files processed
 * @param warningCount - Number of warnings
 * @param errorCount - Number of errors
 * @param logger - Vite logger instance
 *
 * @example
 * ```typescript
 * logLoadSummary('handler', 5, 2, 1, 0, logger);
 * // Logs: "[handler-loader] Summary: 5 handler(s), from 2 file(s), 1 warning(s)"
 * ```
 */
export function logLoadSummary(
  itemType: 'handler' | 'seed',
  itemCount: number,
  fileCount: number,
  warningCount: number,
  errorCount: number,
  logger: Logger,
): void {
  const itemLabel = itemType === 'handler' ? 'handler(s)' : 'seed(s)';
  const loaderName = `${itemType}-loader`;
  const parts = [`${itemCount} ${itemLabel}`, `from ${fileCount} file(s)`];

  if (warningCount > 0) {
    parts.push(`${warningCount} warning(s)`);
  }

  if (errorCount > 0) {
    parts.push(`${errorCount} error(s)`);
  }

  logger.info(`[${loaderName}] Summary: ${parts.join(', ')}`);
}

/**
 * Get a descriptive type string for a value, handling null and arrays properly.
 *
 * @param value - The value to describe
 * @returns Human-readable type description
 *
 * @example
 * ```typescript
 * describeValueType(null);        // 'null'
 * describeValueType([1, 2]);      // 'object (array)'
 * describeValueType(() => {});    // 'function'
 * describeValueType('hello');     // 'string'
 * describeValueType(123);         // 'number'
 * ```
 */
export function describeValueType(value: unknown): string {
  // Handle null explicitly (typeof null === 'object' but we want a clearer message)
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'object (array)';
  }
  if (typeof value === 'function') {
    return 'function';
  }
  return typeof value;
}

/**
 * Format an error description for invalid export type.
 *
 * @param expectedType - What was expected (e.g., "object mapping operationId to handler values")
 * @param actualValue - The actual value received
 * @returns Formatted error message
 *
 * @example
 * ```typescript
 * formatInvalidExportError('object mapping operationId to handler values', [1, 2]);
 * // "default export must be an object mapping operationId to handler values. Got: object (array)"
 *
 * formatInvalidExportError('object mapping schemaName to seed values', null);
 * // "default export must be an object mapping schemaName to seed values. Got: null"
 * ```
 */
export function formatInvalidExportError(expectedType: string, actualValue: unknown): string {
  return `default export must be an ${expectedType}. Got: ${describeValueType(actualValue)}`;
}

/**
 * Format an error description for invalid value type within an export.
 *
 * Used when a specific key in the exports object has an invalid value type.
 *
 * @param keyName - The key name (operationId or schemaName)
 * @param filename - The source filename
 * @param actualValue - The actual value received
 * @returns Formatted error message
 *
 * @example
 * ```typescript
 * formatInvalidValueError('getPetById', 'pets.handler.mjs', 123);
 * // 'Invalid value for "getPetById" in pets.handler.mjs: expected string or function, got number'
 *
 * formatInvalidValueError('Pet', 'pets.seed.mjs', null);
 * // 'Invalid value for "Pet" in pets.seed.mjs: expected string or function, got null'
 * ```
 */
export function formatInvalidValueError(
  keyName: string,
  filename: string,
  actualValue: unknown,
): string {
  return `Invalid value for "${keyName}" in ${filename}: expected string or function, got ${describeValueType(actualValue)}`;
}
