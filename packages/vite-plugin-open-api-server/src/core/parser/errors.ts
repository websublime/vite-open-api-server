/**
 * OpenAPI Parser Error Classes
 *
 * This module re-exports error classes used by the OpenAPI parser
 * for better module organization and public API clarity.
 *
 * @module core/parser/errors
 */

export {
  OpenApiFileNotFoundError,
  OpenApiParseError,
  OpenApiValidationError,
} from './openapi-loader.js';
