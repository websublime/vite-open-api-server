/**
 * Security Scheme Resolver
 *
 * What: Resolves OpenAPI securitySchemes into actionable credential lookups
 * How: Reads components.securitySchemes and maps each to a location + param name
 * Why: Bridges the gap between OpenAPI spec definitions and runtime credential checks
 *
 * @module security/resolver
 */

import type { OpenAPIV3_1 } from '@scalar/openapi-types';

import type { ResolvedSecurityScheme, SecuritySchemeType } from './types.js';

/**
 * Resolve all security schemes from an OpenAPI document
 *
 * Reads `components.securitySchemes` and produces a map of scheme name
 * to resolved scheme with enough information to extract credentials
 * from incoming requests.
 *
 * @param document - OpenAPI 3.1 document (should be dereferenced)
 * @returns Map of scheme name to resolved scheme
 *
 * @example
 * ```typescript
 * const schemes = resolveSecuritySchemes(document);
 * // schemes.get('api_key') => { name: 'api_key', type: 'apiKey', in: 'header', paramName: 'X-API-Key' }
 * // schemes.get('bearerAuth') => { name: 'bearerAuth', type: 'http', in: 'header', paramName: 'authorization', scheme: 'bearer' }
 * ```
 */
export function resolveSecuritySchemes(
  document: OpenAPIV3_1.Document,
): Map<string, ResolvedSecurityScheme> {
  const resolved = new Map<string, ResolvedSecurityScheme>();

  const securitySchemes = document.components?.securitySchemes;
  if (!securitySchemes) {
    return resolved;
  }

  for (const [name, schemeOrRef] of Object.entries(securitySchemes)) {
    // Document should be dereferenced, but guard against $ref just in case
    if ('$ref' in schemeOrRef) {
      continue;
    }

    const scheme = schemeOrRef as OpenAPIV3_1.SecuritySchemeObject;
    const resolvedScheme = resolveScheme(name, scheme);
    if (resolvedScheme) {
      resolved.set(name, resolvedScheme);
    }
  }

  return resolved;
}

/**
 * Resolve a single security scheme object into a ResolvedSecurityScheme
 */
function resolveScheme(
  name: string,
  scheme: OpenAPIV3_1.SecuritySchemeObject,
): ResolvedSecurityScheme | undefined {
  switch (scheme.type) {
    case 'apiKey':
      return resolveApiKeyScheme(name, scheme);
    case 'http':
      return resolveHttpScheme(name, scheme);
    case 'oauth2':
      return resolveOAuth2Scheme(name);
    default:
      // openIdConnect and other unsupported types are silently skipped
      return undefined;
  }
}

/**
 * Resolve an API Key security scheme
 *
 * API keys can be in header, query, or cookie.
 */
function resolveApiKeyScheme(
  name: string,
  scheme: OpenAPIV3_1.SecuritySchemeObject,
): ResolvedSecurityScheme | undefined {
  const apiKeyScheme = scheme as OpenAPIV3_1.ApiKeySecurityScheme;
  const location = apiKeyScheme.in;

  if (!location || !apiKeyScheme.name) {
    return undefined;
  }

  return {
    name,
    type: 'apiKey' as SecuritySchemeType,
    in: location as 'header' | 'query' | 'cookie',
    paramName: apiKeyScheme.name,
  };
}

/**
 * Resolve an HTTP authentication scheme (Bearer, Basic)
 *
 * Both use the Authorization header.
 */
function resolveHttpScheme(
  name: string,
  scheme: OpenAPIV3_1.SecuritySchemeObject,
): ResolvedSecurityScheme {
  const httpScheme = scheme as OpenAPIV3_1.HttpSecurityScheme;

  return {
    name,
    type: 'http' as SecuritySchemeType,
    in: 'header',
    paramName: 'authorization',
    scheme: httpScheme.scheme?.toLowerCase(),
  };
}

/**
 * Resolve an OAuth2 scheme
 *
 * Treated as Bearer token authentication (Authorization: Bearer <token>).
 */
function resolveOAuth2Scheme(name: string): ResolvedSecurityScheme {
  return {
    name,
    type: 'oauth2' as SecuritySchemeType,
    in: 'header',
    paramName: 'authorization',
    scheme: 'bearer',
  };
}
