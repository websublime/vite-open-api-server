/**
 * Format Utilities
 *
 * What: Shared formatting functions for display purposes
 * How: Provides consistent formatting across components
 * Why: Centralizes common formatting logic to avoid duplication (DRY)
 *
 * @module utils/format
 */

/**
 * Get display label for HTTP method
 *
 * Converts an HTTP method to its uppercase display format.
 *
 * @param method - The HTTP method string (e.g., 'get', 'post')
 * @returns The uppercase method label (e.g., 'GET', 'POST')
 *
 * @example
 * getMethodLabel('get') // Returns 'GET'
 * getMethodLabel('post') // Returns 'POST'
 */
export function getMethodLabel(method: string): string {
  return method.toUpperCase();
}
