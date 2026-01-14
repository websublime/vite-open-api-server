/**
 * OpenAPI Parser Module
 *
 * This module provides functionality for loading, parsing, and validating
 * OpenAPI specifications from YAML or JSON files.
 *
 * @module core/parser
 */

// Error classes
export { OpenApiFileNotFoundError, OpenApiParseError, OpenApiValidationError } from './errors.js';
// Public API exports
export { clearCache, loadOpenApiSpec } from './openapi-loader.js';
// Security normalizer
export { normalizeSecuritySchemes } from './security-normalizer.js';

// Types
export type {
  OpenApiComponents,
  OpenApiDocument,
  OpenApiInfo,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiPathItem,
  OpenApiRequestBody,
  OpenApiResponse,
  OpenApiSchema,
  OpenApiSecurityScheme,
  OpenApiServer,
} from './types.js';
