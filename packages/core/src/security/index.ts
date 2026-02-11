/**
 * Security Module
 *
 * What: OpenAPI security scheme handling for development mock server
 * How: Resolves schemes from spec, validates credential presence in requests
 * Why: Allows frontend developers to test auth flows without a real auth server
 *
 * @module security
 */

export { resolveSecuritySchemes } from './resolver.js';
export type {
  ResolvedSecurityScheme,
  SecurityContext,
  SecuritySchemeIn,
  SecuritySchemeType,
} from './types.js';
export type {
  SecurityRequest,
  SecurityValidationResult,
  ValidateSecurityOptions,
} from './validator.js';
export { validateSecurity } from './validator.js';
