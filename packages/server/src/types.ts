/**
 * Vite Plugin Types
 *
 * What: Type definitions for the OpenAPI server Vite plugin
 * How: Defines configuration options, resolved types, and validation errors
 * Why: Provides type safety and documentation for plugin consumers
 *
 * @module types
 */

import type { Logger } from '@websublime/vite-plugin-open-api-core';

// =============================================================================
// Validation Error Codes (Appendix B)
// =============================================================================

/**
 * Error codes for configuration validation errors.
 *
 * Used across Tasks 1.2–1.4 for typed error handling.
 * Matches TECHNICAL-SPECIFICATION-V2.md Appendix B.
 */
export type ValidationErrorCode =
  | 'SPEC_ID_MISSING'
  | 'SPEC_ID_DUPLICATE'
  | 'PROXY_PATH_MISSING'
  | 'PROXY_PATH_TOO_BROAD'
  | 'PROXY_PATH_DUPLICATE'
  | 'PROXY_PATH_OVERLAP'
  | 'SPEC_NOT_FOUND'
  | 'SPECS_EMPTY';

/**
 * Typed validation error for configuration issues.
 *
 * Thrown by resolveOptions() and validation functions in spec-id.ts
 * and proxy-path.ts. Consumers can catch and inspect the `code` field
 * for programmatic error handling.
 *
 * @example
 * ```typescript
 * try {
 *   resolveOptions({ specs: [] });
 * } catch (error) {
 *   if (error instanceof ValidationError && error.code === 'SPECS_EMPTY') {
 *     // handle empty specs
 *   }
 * }
 * ```
 */
export class ValidationError extends Error {
  readonly code: ValidationErrorCode;

  constructor(code: ValidationErrorCode, message: string) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
  }
}

// =============================================================================
// Shared Type Aliases
// =============================================================================

/**
 * How a proxy path was determined.
 *
 * - `'explicit'` — set directly in SpecConfig.proxyPath
 * - `'auto'` — auto-derived from the OpenAPI document's servers[0].url
 *
 * Used by both DeriveProxyPathResult and ResolvedSpecConfig to ensure
 * the two sources of this value stay in sync.
 */
export type ProxyPathSource = 'auto' | 'explicit';

// =============================================================================
// User-Facing Configuration Types
// =============================================================================

/**
 * Configuration for a single OpenAPI spec instance
 *
 * @example
 * ```typescript
 * const petstore: SpecConfig = {
 *   spec: './openapi/petstore.yaml',
 *   id: 'petstore',
 *   proxyPath: '/api/v3',
 *   handlersDir: './mocks/petstore/handlers',
 *   seedsDir: './mocks/petstore/seeds',
 *   idFields: { Pet: 'petId' },
 * };
 * ```
 */
export interface SpecConfig {
  /**
   * Path to OpenAPI spec file (required)
   *
   * Supports: file paths, URLs, YAML, JSON
   *
   * @example './openapi/petstore.yaml'
   * @example 'https://petstore3.swagger.io/api/v3/openapi.json'
   */
  spec: string;

  /**
   * Unique identifier for this spec instance
   *
   * Used for routing, DevTools grouping, logging, default directory names.
   * If omitted, auto-derived from spec's info.title (slugified).
   *
   * @example 'petstore'
   */
  id?: string;

  /**
   * Base path for request proxy
   *
   * If omitted, auto-derived from spec's servers[0].url.
   * Must be unique across all specs.
   *
   * @example '/api/v3'
   */
  proxyPath?: string;

  /**
   * Directory containing handler files for this spec
   * @default './mocks/{specId}/handlers'
   */
  handlersDir?: string;

  /**
   * Directory containing seed files for this spec
   * @default './mocks/{specId}/seeds'
   */
  seedsDir?: string;

  /**
   * ID field configuration per schema for this spec
   * @default {} (uses 'id' for all schemas)
   */
  idFields?: Record<string, string>;
}

/**
 * Plugin configuration options
 *
 * @example
 * ```typescript
 * import { openApiServer } from '@websublime/vite-plugin-open-api-server';
 *
 * export default defineConfig({
 *   plugins: [
 *     openApiServer({
 *       specs: [
 *         { spec: './openapi/petstore.yaml' },
 *         { spec: './openapi/inventory.yaml', id: 'inventory' },
 *       ],
 *       port: 4000,
 *     }),
 *   ],
 * });
 * ```
 */
export interface OpenApiServerOptions {
  /**
   * Array of OpenAPI spec configurations (required)
   * Each entry runs as an isolated instance.
   */
  specs: SpecConfig[];

  /**
   * Server port — all spec instances share this port
   * @default 4000
   */
  port?: number;

  /**
   * Enable/disable plugin
   * @default true
   */
  enabled?: boolean;

  /**
   * Maximum timeline events per spec
   * @default 500
   */
  timelineLimit?: number;

  /**
   * Enable DevTools integration
   * @default true
   */
  devtools?: boolean;

  /**
   * Enable CORS
   * @default true
   */
  cors?: boolean;

  /**
   * CORS origin configuration
   * @default '*'
   */
  corsOrigin?: string | string[];

  /**
   * Custom logger instance
   */
  logger?: Logger;

  /**
   * Suppress startup banner
   * @default false
   */
  silent?: boolean;
}

// =============================================================================
// Internal Resolved Types
// =============================================================================

/**
 * Resolved spec config with all defaults applied
 *
 * Exported for advanced use cases (e.g., custom orchestrators or
 * test utilities that need to inspect resolved configuration).
 */
export interface ResolvedSpecConfig {
  spec: string;
  /** Guaranteed to be set after orchestrator resolution */
  id: string;
  /** Guaranteed to be set after orchestrator resolution */
  proxyPath: string;
  /**
   * How proxyPath was determined — used for banner display.
   *
   * Set during static option resolution. The orchestrator (Task 1.7)
   * will pass this to the multi-spec banner so it can show
   * "(auto-derived)" vs "(explicit)" next to each proxy path.
   */
  proxyPathSource: ProxyPathSource;
  handlersDir: string;
  seedsDir: string;
  idFields: Record<string, string>;
}

/**
 * Resolved options with defaults applied
 *
 * Exported for advanced use cases (e.g., custom orchestrators or
 * test utilities that need to inspect resolved configuration).
 */
export interface ResolvedOptions {
  specs: ResolvedSpecConfig[];
  port: number;
  enabled: boolean;
  timelineLimit: number;
  devtools: boolean;
  cors: boolean;
  corsOrigin: string | string[];
  silent: boolean;
  logger?: Logger;
}

// =============================================================================
// Option Resolution
// =============================================================================

/**
 * Resolve options with defaults
 *
 * Note: spec ID and proxyPath resolution requires processing the OpenAPI document
 * first, so they are resolved later in the orchestrator.
 * This function only resolves static defaults.
 *
 * @param options - User-provided options
 * @returns Resolved options with all defaults applied
 * @throws {ValidationError} SPECS_EMPTY if specs array is missing or empty
 * @throws {ValidationError} SPEC_NOT_FOUND if a spec entry has empty spec field
 */
function validateSpecs(specs: SpecConfig[]): void {
  if (!specs || !Array.isArray(specs) || specs.length === 0) {
    throw new ValidationError(
      'SPECS_EMPTY',
      'specs is required and must be a non-empty array of SpecConfig',
    );
  }

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    if (!spec.spec || typeof spec.spec !== 'string' || spec.spec.trim() === '') {
      const identifier = spec.id ? ` (id: "${spec.id}")` : '';
      throw new ValidationError(
        'SPEC_NOT_FOUND',
        `specs[${i}]${identifier}: spec field is required and must be a non-empty string (path or URL to OpenAPI spec)`,
      );
    }
  }
}

export function resolveOptions(options: OpenApiServerOptions): ResolvedOptions {
  validateSpecs(options.specs);

  return {
    specs: options.specs.map((s) => ({
      spec: s.spec,
      // Placeholder — populated by orchestrator after document processing (Task 1.7)
      id: s.id ?? '',
      // Placeholder — populated by orchestrator after document processing (Task 1.7)
      proxyPath: s.proxyPath ?? '',
      // Preliminary — overwritten by deriveProxyPath() during orchestration (Task 1.7)
      proxyPathSource: s.proxyPath?.trim() ? 'explicit' : 'auto',
      handlersDir: s.handlersDir ?? '',
      seedsDir: s.seedsDir ?? '',
      idFields: s.idFields ?? {},
    })),
    port: options.port ?? 4000,
    enabled: options.enabled ?? true,
    timelineLimit: options.timelineLimit ?? 500,
    devtools: options.devtools ?? true,
    cors: options.cors ?? true,
    corsOrigin: options.corsOrigin ?? '*',
    silent: options.silent ?? false,
    logger: options.logger,
  };
}
