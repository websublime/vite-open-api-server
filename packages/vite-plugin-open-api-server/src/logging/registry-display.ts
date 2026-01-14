/**
 * Registry Display Module
 *
 * ## What
 * This module provides formatted console output for the endpoint registry.
 * It displays a table of all mocked endpoints with their handler status
 * and security schemes on mock server startup.
 *
 * ## How
 * Calculates column widths based on longest values, formats each endpoint
 * as a table row with proper alignment, and adds color coding for visual
 * clarity. Custom handlers are indicated with a green checkmark.
 * Security schemes are formatted with type-specific details.
 *
 * ## Why
 * Visual feedback about which endpoints have custom handlers vs default
 * mocks helps developers quickly understand the mock server configuration
 * without reading verbose logs or inspecting files.
 *
 * @module
 */

import type { Logger } from 'vite';

import type { OpenApiEndpointRegistry, OpenApiSecuritySchemeEntry } from '../types/registry.js';
import { BOLD, CYAN, DIM, GREEN, RESET, YELLOW } from './startup-banner.js';

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

// =============================================================================
// Registry Display Types
// =============================================================================

/**
 * Endpoint data prepared for display.
 */
interface DisplayEndpoint {
  /** HTTP method (uppercase) */
  method: string;
  /** URL path */
  path: string;
  /** Operation identifier */
  operationId: string;
  /** Whether this endpoint has a custom handler */
  hasHandler: boolean;
}

/**
 * Column widths for table formatting.
 */
interface ColumnWidths {
  method: number;
  path: number;
  operationId: number;
  handler: number;
}

// =============================================================================
// Registry Display Functions
// =============================================================================

/**
 * Calculate the width needed for each column based on content.
 *
 * @param endpoints - Array of endpoint data for display
 * @returns Object with width for each column
 */
function calculateColumnWidths(endpoints: DisplayEndpoint[]): ColumnWidths {
  // Minimum widths based on header text + padding
  const minMethodWidth = 8; // "METHOD" + 2
  const minPathWidth = 6; // "PATH" + 2
  const minOperationIdWidth = 14; // "OPERATION ID" + 2
  const handlerWidth = 9; // "HANDLER" + 2

  // Calculate max width for each column
  const methodWidth = Math.max(minMethodWidth, ...endpoints.map((e) => e.method.length + 2));

  const pathWidth = Math.max(minPathWidth, ...endpoints.map((e) => e.path.length + 2));

  const operationIdWidth = Math.max(
    minOperationIdWidth,
    ...endpoints.map((e) => e.operationId.length + 2),
  );

  return {
    method: methodWidth,
    path: pathWidth,
    operationId: operationIdWidth,
    handler: handlerWidth,
  };
}

/**
 * Format the table header row.
 *
 * @param widths - Column widths
 * @returns Formatted header string with color
 */
function formatHeader(widths: ColumnWidths): string {
  const method = 'METHOD'.padEnd(widths.method);
  const path = 'PATH'.padEnd(widths.path);
  const operationId = 'OPERATION ID'.padEnd(widths.operationId);
  const handler = 'HANDLER'.padEnd(widths.handler);

  return [
    color(method, CYAN),
    color(path, CYAN),
    color(operationId, CYAN),
    color(handler, CYAN),
  ].join('');
}

/**
 * Format the separator line below the header.
 *
 * @param widths - Column widths
 * @returns Formatted separator string
 */
function formatSeparator(widths: ColumnWidths): string {
  const totalWidth = widths.method + widths.path + widths.operationId + widths.handler;
  return color('─'.repeat(totalWidth), CYAN);
}

/**
 * Format a single endpoint row.
 *
 * @param endpoint - Endpoint data to format
 * @param widths - Column widths
 * @returns Formatted row string
 */
function formatEndpointRow(endpoint: DisplayEndpoint, widths: ColumnWidths): string {
  const method = endpoint.method.padEnd(widths.method);
  const path = endpoint.path.padEnd(widths.path);
  const operationId = endpoint.operationId.padEnd(widths.operationId);

  // Handler indicator: green checkmark for custom handlers, dash for default mocks
  const handlerIndicator = endpoint.hasHandler ? color('✓', GREEN) : '-';

  // Note: The checkmark with color codes takes more characters, so we need to
  // account for that when padding. The visible width is 1 character.
  const handlerPadding = endpoint.hasHandler
    ? ' '.repeat(widths.handler - 1) // -1 for the visible checkmark
    : '-'.padEnd(widths.handler).slice(1); // Already has the dash

  return [method, path, operationId, handlerIndicator + handlerPadding].join('');
}

/**
 * Format the summary line with statistics.
 *
 * @param total - Total number of endpoints
 * @param withHandlers - Number of endpoints with custom handlers
 * @returns Formatted summary string
 */
function formatSummary(total: number, withHandlers: number): string {
  const withDefault = total - withHandlers;
  const percentage = total > 0 ? ((withHandlers / total) * 100).toFixed(0) : '0';

  const summaryText =
    withHandlers > 0
      ? `${total} endpoints (${withHandlers} custom, ${withDefault} default) - ${percentage}% customized`
      : `${total} endpoints (all default mocks)`;

  return color(summaryText, DIM);
}

/**
 * Extract endpoint data from registry for display.
 *
 * Maps EndpointRegistryEntry instances to DisplayEndpoint format,
 * using the hasHandler property to determine handler status.
 *
 * @param registry - The endpoint registry
 * @returns Array of endpoints prepared for display
 */
function extractDisplayEndpoints(registry: OpenApiEndpointRegistry): DisplayEndpoint[] {
  const endpoints: DisplayEndpoint[] = [];

  for (const [_key, entry] of registry.endpoints) {
    endpoints.push({
      method: entry.method.toUpperCase(),
      path: entry.path,
      operationId: entry.operationId,
      hasHandler: entry.hasHandler,
    });
  }

  // Sort by path, then by method for consistent display
  endpoints.sort((a, b) => {
    const pathCompare = a.path.localeCompare(b.path);
    if (pathCompare !== 0) {
      return pathCompare;
    }
    return a.method.localeCompare(b.method);
  });

  return endpoints;
}

/**
 * Print formatted registry table to console.
 *
 * Displays all mocked endpoints in a formatted table with columns for
 * method, path, operation ID, and handler status. Custom handlers are
 * indicated with a green checkmark (✓), default mocks with a dash (-).
 *
 * @param registry - OpenAPI endpoint registry
 * @param logger - Vite logger instance
 *
 * @example
 * ```typescript
 * import { printRegistryTable } from './logging/registry-display';
 *
 * const { registry } = buildRegistry(spec, logger);
 * printRegistryTable(registry, logger);
 *
 * // Output:
 * // METHOD  PATH                    OPERATION ID           HANDLER
 * // ────────────────────────────────────────────────────────────────
 * // GET     /pets                   listPets               -
 * // POST    /pets                   createPet              ✓
 * // GET     /pets/{petId}           getPetById             ✓
 * //
 * // 3 endpoints (2 custom, 1 default) - 67% customized
 * ```
 */
export function printRegistryTable(registry: OpenApiEndpointRegistry, logger: Logger): void {
  // Print security schemes first (if any)
  if (registry.securitySchemes.size > 0) {
    printSecuritySchemes(registry, logger);
  }

  // Handle empty registry
  if (registry.endpoints.size === 0) {
    logger.warn('[registry] No endpoints to display');
    return;
  }

  // Extract and prepare endpoint data
  const endpoints = extractDisplayEndpoints(registry);

  // Calculate column widths based on content
  const widths = calculateColumnWidths(endpoints);

  // Build table components
  const header = formatHeader(widths);
  const separator = formatSeparator(widths);
  const rows = endpoints.map((endpoint) => formatEndpointRow(endpoint, widths));

  // Calculate statistics
  const total = endpoints.length;
  const withHandlers = endpoints.filter((e) => e.hasHandler).length;
  const summary = formatSummary(total, withHandlers);

  // Assemble and output table
  const table = ['', header, separator, ...rows, '', summary, ''].join('\n');

  logger.info(table);
}

// =============================================================================
// Security Schemes Display
// =============================================================================

/**
 * Format a security scheme entry for display.
 *
 * @param entry - Security scheme entry from registry
 * @returns Formatted description string
 */
function formatSecurityScheme(entry: OpenApiSecuritySchemeEntry): string {
  switch (entry.type) {
    case 'apiKey':
      return `apiKey in ${entry.in} (${entry.apiKeyName})`;

    case 'http':
      if (entry.scheme === 'bearer') {
        const format = entry.bearerFormat ? ` [${entry.bearerFormat}]` : '';
        return `HTTP Bearer${format}`;
      }
      return `HTTP ${entry.scheme}`;

    case 'oauth2': {
      const flows = entry.flows ? Object.keys(entry.flows) : [];
      return `OAuth2 (${flows.join(', ')})`;
    }

    case 'openIdConnect':
      return `OpenID Connect`;

    default:
      return entry.type;
  }
}

/**
 * Generate usage example for a security scheme.
 *
 * @param entry - Security scheme entry from registry
 * @returns Usage hint string
 */
function getSecuritySchemeUsage(entry: OpenApiSecuritySchemeEntry): string {
  switch (entry.type) {
    case 'apiKey':
      if (entry.in === 'header') {
        return `${entry.apiKeyName}: YOUR_API_KEY`;
      }
      if (entry.in === 'query') {
        return `?${entry.apiKeyName}=YOUR_API_KEY`;
      }
      return `Cookie: ${entry.apiKeyName}=YOUR_API_KEY`;

    case 'http':
      if (entry.scheme === 'bearer') {
        return 'Authorization: Bearer YOUR_TOKEN';
      }
      if (entry.scheme === 'basic') {
        return 'Authorization: Basic BASE64_CREDENTIALS';
      }
      return `Authorization: ${entry.scheme} CREDENTIALS`;

    case 'oauth2':
      return 'Authorization: Bearer YOUR_ACCESS_TOKEN';

    case 'openIdConnect':
      return 'Authorization: Bearer YOUR_OIDC_TOKEN';

    default:
      return '';
  }
}

/**
 * Print configured security schemes to console.
 *
 * Displays all security schemes defined in the OpenAPI spec with their
 * types, locations (for apiKey), and usage examples. This helps developers
 * understand what authentication is required to access secured endpoints.
 *
 * @param registry - OpenAPI endpoint registry
 * @param logger - Vite logger instance
 *
 * @example
 * ```typescript
 * printSecuritySchemes(registry, logger);
 *
 * // Output:
 * // Authentication:
 * //
 * // ✅ api_key
 * //    apiKey in header (api_key)
 * //    api_key: YOUR_API_KEY
 * //
 * // ✅ petstore_auth
 * //    OAuth2 (implicit)
 * //    Authorization: Bearer YOUR_ACCESS_TOKEN
 * ```
 */
export function printSecuritySchemes(registry: OpenApiEndpointRegistry, logger: Logger): void {
  if (registry.securitySchemes.size === 0) {
    return;
  }

  const lines: string[] = [''];

  // Header
  lines.push(supportsColor() ? `${BOLD}${YELLOW}Authentication:${RESET}` : 'Authentication:');
  lines.push('');

  // Format each security scheme
  for (const [name, entry] of registry.securitySchemes) {
    // Scheme name with checkmark
    lines.push(color(`✅ ${name}`, GREEN));

    // Scheme type and details
    const description = formatSecurityScheme(entry);
    lines.push(color(`   ${description}`, DIM));

    // Usage example
    const usage = getSecuritySchemeUsage(entry);
    if (usage) {
      lines.push(color(`   ${usage}`, DIM));
    }

    lines.push('');
  }

  logger.info(lines.join('\n'));
}
