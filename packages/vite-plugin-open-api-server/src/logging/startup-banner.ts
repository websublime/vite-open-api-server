/**
 * Startup Banner Module
 *
 * ## What
 * This module provides colorful console banners for the mock server lifecycle.
 * It displays loading, success, and error states with visual formatting.
 *
 * ## How
 * Uses ANSI escape codes for colors and Unicode box-drawing characters
 * for visual structure. Integrates with Vite's logger API for consistent
 * output that respects Vite's log level configuration.
 *
 * ## Why
 * Visual feedback helps developers quickly understand plugin state without
 * reading verbose logs. Clear banners show startup progress, success with
 * endpoint counts, and errors with helpful suggestions.
 *
 * @module
 */

import type { Logger } from 'vite';

// =============================================================================
// ANSI Color Constants
// =============================================================================

/**
 * ANSI escape code for green text (success states).
 */
export const GREEN = '\x1b[32m';

/**
 * ANSI escape code for red text (error states).
 */
export const RED = '\x1b[31m';

/**
 * ANSI escape code for cyan text (info/loading states).
 */
export const CYAN = '\x1b[36m';

/**
 * ANSI escape code for yellow text (warning states).
 */
export const YELLOW = '\x1b[33m';

/**
 * ANSI escape code to reset all text formatting.
 */
export const RESET = '\x1b[0m';

/**
 * ANSI escape code for dim/faded text.
 */
export const DIM = '\x1b[2m';

/**
 * ANSI escape code for bold text.
 */
export const BOLD = '\x1b[1m';

// =============================================================================
// Unicode Box-Drawing Characters
// =============================================================================

/**
 * Top-left corner of a box (┌).
 */
const BOX_TOP_LEFT = '┌';

/**
 * Top-right corner of a box (┐).
 */
const BOX_TOP_RIGHT = '┐';

/**
 * Bottom-left corner of a box (└).
 */
const BOX_BOTTOM_LEFT = '└';

/**
 * Bottom-right corner of a box (┘).
 */
const BOX_BOTTOM_RIGHT = '┘';

/**
 * Horizontal line segment (─).
 */
const BOX_HORIZONTAL = '─';

/**
 * Vertical line segment (│).
 */
const BOX_VERTICAL = '│';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if the terminal supports ANSI colors.
 *
 * Colors are supported when stdout is a TTY (interactive terminal).
 * In CI/CD environments or when output is piped, colors are disabled.
 *
 * @returns true if colors are supported, false otherwise
 */
function supportsColor(): boolean {
  return process.stdout.isTTY === true;
}

/**
 * Apply color formatting if terminal supports it.
 *
 * @param text - The text to colorize
 * @param colorCode - The ANSI color code to apply
 * @returns Colorized text or plain text if colors not supported
 */
function color(text: string, colorCode: string): string {
  return supportsColor() ? `${colorCode}${text}${RESET}` : text;
}

/**
 * Pad or truncate a string to fit within a specified width.
 *
 * @param text - The text to format
 * @param width - The target width
 * @returns Formatted string with exact width
 */
function padToWidth(text: string, width: number): string {
  if (text.length > width) {
    return `${text.slice(0, width - 3)}...`;
  }
  return text + ' '.repeat(width - text.length);
}

/**
 * Create a horizontal line of specified width.
 *
 * @param width - The number of horizontal characters
 * @returns A string of horizontal box-drawing characters
 */
function horizontalLine(width: number): string {
  return BOX_HORIZONTAL.repeat(width);
}

// =============================================================================
// Statistics Formatting
// =============================================================================

/**
 * HTTP method counts for endpoint statistics.
 */
export interface MethodCounts {
  GET: number;
  POST: number;
  PUT: number;
  PATCH: number;
  DELETE: number;
  OPTIONS: number;
  HEAD: number;
}

/**
 * Format endpoint statistics by HTTP method.
 *
 * @param counts - Object with HTTP method counts
 * @returns Formatted string like "GET: 10, POST: 5, PUT: 2, DELETE: 2"
 */
export function formatMethodCounts(counts: Partial<MethodCounts>): string {
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
  const parts: string[] = [];

  for (const method of methods) {
    const count = counts[method];
    if (count !== undefined && count > 0) {
      parts.push(`${method}: ${count}`);
    }
  }

  return parts.length > 0 ? parts.join(', ') : 'No endpoints';
}

// =============================================================================
// Banner Functions
// =============================================================================

/**
 * Print loading banner during OpenAPI spec parsing.
 *
 * Shows a cyan loading indicator with the spec file path.
 * Called from plugin buildStart() hook before parsing begins.
 *
 * @param specPath - Path to the OpenAPI specification file
 * @param logger - Vite logger instance for output
 *
 * @example
 * ```typescript
 * printLoadingBanner('./api/openapi.yaml', config.logger);
 * // Output:
 * // ⏳ Loading OpenAPI spec...
 * //    ./api/openapi.yaml
 * ```
 */
export function printLoadingBanner(specPath: string, logger: Logger): void {
  const lines = [
    '',
    color(`⏳ Loading OpenAPI spec...`, CYAN),
    color(`   ${DIM}${specPath}${supportsColor() ? RESET : ''}`, CYAN),
    '',
  ];

  logger.info(lines.join('\n'));
}

/**
 * Print success banner when mock server is ready.
 *
 * Shows a green success box with server URL, endpoint count, spec path,
 * and startup time. Optionally includes method breakdown statistics.
 *
 * @param port - The port the mock server is running on
 * @param endpointCount - Total number of API endpoints loaded
 * @param specPath - Path to the OpenAPI specification file
 * @param startTime - Timestamp from performance.now() when loading started
 * @param logger - Vite logger instance for output
 * @param methodCounts - Optional breakdown of endpoints by HTTP method
 *
 * @example
 * ```typescript
 * printSuccessBanner(3001, 19, './api/openapi.yaml', startTime, config.logger);
 * // Output:
 * // ┌──────────────────────────────────────────────────┐
 * // │ ✓ Mock Server Ready!                             │
 * // │                                                  │
 * // │   URL:       http://localhost:3001               │
 * // │   Endpoints: 19 operations                       │
 * // │   Spec:      ./api/openapi.yaml                  │
 * // │   Ready in:  1.23s                               │
 * // └──────────────────────────────────────────────────┘
 * ```
 */
export function printSuccessBanner(
  port: number,
  endpointCount: number,
  specPath: string,
  startTime: number,
  logger: Logger,
  methodCounts?: Partial<MethodCounts>,
): void {
  const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  const url = `http://localhost:${port}`;
  const boxWidth = 50;
  const contentWidth = boxWidth - 2; // Account for │ on each side

  const lines: string[] = [''];

  // Top border
  lines.push(color(`${BOX_TOP_LEFT}${horizontalLine(boxWidth)}${BOX_TOP_RIGHT}`, GREEN));

  // Title line
  const title = `${BOLD}✓ Mock Server Ready!${RESET}`;
  const titlePlain = '✓ Mock Server Ready!';
  const titlePadding = contentWidth - titlePlain.length - 1;
  lines.push(
    color(BOX_VERTICAL, GREEN) +
      ' ' +
      (supportsColor() ? `${GREEN}${title}` : titlePlain) +
      ' '.repeat(titlePadding) +
      color(BOX_VERTICAL, GREEN),
  );

  // Empty line
  lines.push(color(BOX_VERTICAL, GREEN) + ' '.repeat(contentWidth) + color(BOX_VERTICAL, GREEN));

  // URL line
  const urlLabel = '   URL:       ';
  const urlContent = padToWidth(url, contentWidth - urlLabel.length);
  lines.push(color(BOX_VERTICAL, GREEN) + urlLabel + urlContent + color(BOX_VERTICAL, GREEN));

  // Endpoints line
  const endpointsLabel = '   Endpoints: ';
  const endpointsText = `${endpointCount} operation${endpointCount !== 1 ? 's' : ''}`;
  const endpointsContent = padToWidth(endpointsText, contentWidth - endpointsLabel.length);
  lines.push(
    color(BOX_VERTICAL, GREEN) + endpointsLabel + endpointsContent + color(BOX_VERTICAL, GREEN),
  );

  // Method breakdown (if provided)
  if (methodCounts) {
    const methodsLabel = '   Methods:   ';
    const methodsText = formatMethodCounts(methodCounts);
    const methodsContent = padToWidth(methodsText, contentWidth - methodsLabel.length);
    lines.push(
      color(BOX_VERTICAL, GREEN) + methodsLabel + methodsContent + color(BOX_VERTICAL, GREEN),
    );
  }

  // Spec path line
  const specLabel = '   Spec:      ';
  const specContent = padToWidth(specPath, contentWidth - specLabel.length);
  lines.push(color(BOX_VERTICAL, GREEN) + specLabel + specContent + color(BOX_VERTICAL, GREEN));

  // Ready time line
  const timeLabel = '   Ready in:  ';
  const timeText = `${duration}s`;
  const timeContent = padToWidth(timeText, contentWidth - timeLabel.length);
  lines.push(color(BOX_VERTICAL, GREEN) + timeLabel + timeContent + color(BOX_VERTICAL, GREEN));

  // Bottom border
  lines.push(color(`${BOX_BOTTOM_LEFT}${horizontalLine(boxWidth)}${BOX_BOTTOM_RIGHT}`, GREEN));

  lines.push('');

  logger.info(lines.join('\n'));
}

/**
 * Print error banner when mock server fails to start.
 *
 * Shows a red error box with the error message and helpful suggestions
 * based on the error type. Suggestions are pattern-matched from common
 * error messages.
 *
 * @param error - The error that occurred
 * @param specPath - Path to the OpenAPI specification file
 * @param logger - Vite logger instance for output
 *
 * @example
 * ```typescript
 * printErrorBanner(new Error('ENOENT: no such file'), './missing.yaml', config.logger);
 * // Output:
 * // ┌────────────────────────────────────────────────────────────┐
 * // │ ✗ Failed to start mock server                              │
 * // │                                                            │
 * // │   Spec:  ./missing.yaml                                    │
 * // │   Error: ENOENT: no such file                              │
 * // │                                                            │
 * // │   File not found. Check the path to your OpenAPI spec.     │
 * // └────────────────────────────────────────────────────────────┘
 * ```
 */
export function printErrorBanner(error: Error, specPath: string, logger: Logger): void {
  // Determine helpful suggestion based on error type
  let suggestion = 'Check the error message above for details.';

  const errorMessage = error.message.toLowerCase();
  if (errorMessage.includes('enoent') || errorMessage.includes('no such file')) {
    suggestion = 'File not found. Check the path to your OpenAPI spec.';
  } else if (
    errorMessage.includes('yaml') ||
    errorMessage.includes('parse') ||
    errorMessage.includes('json')
  ) {
    suggestion = 'Parse error. Validate your spec with a YAML/JSON linter.';
  } else if (errorMessage.includes('invalid') && errorMessage.includes('openapi')) {
    suggestion = 'Invalid OpenAPI spec. Ensure it follows OpenAPI 3.0/3.1 format.';
  } else if (errorMessage.includes('timeout')) {
    suggestion = 'Server startup timed out. Check for blocking operations.';
  } else if (errorMessage.includes('eaddrinuse') || errorMessage.includes('address already')) {
    suggestion = 'Port already in use. Try a different port in plugin options.';
  }

  const boxWidth = 60;
  const contentWidth = boxWidth - 2;

  const lines: string[] = [''];

  // Top border
  lines.push(color(`${BOX_TOP_LEFT}${horizontalLine(boxWidth)}${BOX_TOP_RIGHT}`, RED));

  // Title line
  const title = `${BOLD}✗ Failed to start mock server${RESET}`;
  const titlePlain = '✗ Failed to start mock server';
  const titlePadding = Math.max(0, contentWidth - titlePlain.length - 1);
  lines.push(
    color(BOX_VERTICAL, RED) +
      ' ' +
      (supportsColor() ? `${RED}${title}` : titlePlain) +
      ' '.repeat(titlePadding) +
      color(BOX_VERTICAL, RED),
  );

  // Empty line
  lines.push(color(BOX_VERTICAL, RED) + ' '.repeat(contentWidth) + color(BOX_VERTICAL, RED));

  // Spec path line
  const specLabel = '   Spec:  ';
  const specContent = padToWidth(specPath, contentWidth - specLabel.length);
  lines.push(color(BOX_VERTICAL, RED) + specLabel + specContent + color(BOX_VERTICAL, RED));

  // Error message line (may need truncation)
  const errorLabel = '   Error: ';
  const errorText = error.message;
  const errorContent = padToWidth(errorText, contentWidth - errorLabel.length);
  lines.push(color(BOX_VERTICAL, RED) + errorLabel + errorContent + color(BOX_VERTICAL, RED));

  // Empty line
  lines.push(color(BOX_VERTICAL, RED) + ' '.repeat(contentWidth) + color(BOX_VERTICAL, RED));

  // Suggestion line (dim text) - use padToWidth to handle long suggestions
  const suggestionPrefix = '   ';
  const suggestionMaxWidth = contentWidth - suggestionPrefix.length;
  const suggestionTruncated = padToWidth(suggestion, suggestionMaxWidth);
  const suggestionText = supportsColor()
    ? `${DIM}${suggestionTruncated}${RESET}`
    : suggestionTruncated;
  lines.push(
    color(BOX_VERTICAL, RED) + suggestionPrefix + suggestionText + color(BOX_VERTICAL, RED),
  );

  // Bottom border
  lines.push(color(`${BOX_BOTTOM_LEFT}${horizontalLine(boxWidth)}${BOX_BOTTOM_RIGHT}`, RED));

  lines.push('');

  logger.error(lines.join('\n'));
}
