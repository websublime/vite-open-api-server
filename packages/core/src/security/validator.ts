/**
 * Security Validator
 *
 * What: Validates presence of credentials in incoming requests
 * How: Extracts credentials from headers, query params, or cookies based on resolved schemes
 * Why: Simulates OpenAPI security without real validation — accepts any non-empty value
 *
 * @remarks
 * This is a development-only mock. It checks that credentials are **present**
 * (non-empty) but does NOT verify their validity. Any non-empty token, key,
 * or Basic string is accepted.
 *
 * @module security/validator
 */

import type { Logger } from '../handlers/context.js';
import type { SecurityRequirement } from '../router/types.js';
import type { ResolvedSecurityScheme, SecurityContext } from './types.js';

/**
 * Shared context for public endpoints — avoids allocating a new object per request
 */
const PUBLIC_ENDPOINT_CONTEXT: SecurityContext = Object.freeze({
  authenticated: false,
  scopes: [],
});

/**
 * Result of validating security for a single request
 */
export interface SecurityValidationResult {
  /** Whether the request passed security validation */
  ok: boolean;
  /** Security context to pass to handlers (always present) */
  context: SecurityContext;
  /** Error message when validation fails */
  error?: string;
}

/**
 * Request data needed for security validation
 *
 * Mirrors what's available from Hono's Context without coupling to it.
 * Headers should be pre-normalized to lowercase keys for efficient lookup.
 */
export interface SecurityRequest {
  headers: Record<string, string>;
  query: Record<string, string | string[]>;
}

/**
 * Options for security validation
 */
export interface ValidateSecurityOptions {
  /** Logger for warning about unknown scheme references */
  logger?: Logger;
}

/**
 * Validate security requirements for a request
 *
 * Implements **OR logic** across all requirements: the first matching scheme
 * wins and the request is considered authenticated.
 *
 * **Important — simplified semantics:** The OpenAPI spec defines OR between
 * top-level security requirement objects and AND between schemes within a
 * single object. However, `extractSecurityRequirements` in the registry
 * builder flattens compound requirement objects (e.g.,
 * `{ bearerAuth: [], apiKey: [] }`) into separate `SecurityRequirement`
 * entries. This means **AND semantics are not preserved** — a compound
 * requirement that should require *both* schemes is treated as *either*.
 *
 * This is a known simplification for the mock validator. Supporting grouped
 * AND-within-OR semantics is potential future work and would require a nested
 * data structure (e.g., `SecurityRequirement[][]`).
 *
 * An empty `requirements` array means the endpoint is public (no auth needed).
 *
 * @param requirements - Security requirements from the endpoint registry (flattened)
 * @param schemes - Resolved security schemes from the document
 * @param request - Incoming request data
 * @param options - Optional validation options (logger, etc.)
 * @returns Validation result with security context
 */
export function validateSecurity(
  requirements: SecurityRequirement[],
  schemes: Map<string, ResolvedSecurityScheme>,
  request: SecurityRequest,
  options?: ValidateSecurityOptions,
): SecurityValidationResult {
  // No security requirements = public endpoint
  if (requirements.length === 0) {
    return {
      ok: true,
      context: PUBLIC_ENDPOINT_CONTEXT,
    };
  }

  // Try each requirement (OR logic: first match wins)
  for (const requirement of requirements) {
    const scheme = schemes.get(requirement.name);
    if (!scheme) {
      // Unknown scheme referenced — warn and skip (don't block)
      options?.logger?.warn(
        `[security] Unknown security scheme "${requirement.name}" referenced in operation. ` +
          'Check that the scheme name matches a key in components.securitySchemes.',
      );
      continue;
    }

    const credential = extractCredential(scheme, request);
    if (credential) {
      return {
        ok: true,
        context: {
          authenticated: true,
          scheme: requirement.name,
          credentials: credential,
          scopes: requirement.scopes,
        },
      };
    }
  }

  // None of the requirements were satisfied
  const schemeNames = requirements.map((r) => r.name).join(', ');
  return {
    ok: false,
    context: { authenticated: false, scopes: [] },
    error: `Missing credentials. Required security scheme(s): ${schemeNames}`,
  };
}

/**
 * Extract a credential value from the request based on scheme definition
 *
 * @returns The credential string if found and non-empty, or undefined
 */
function extractCredential(
  scheme: ResolvedSecurityScheme,
  request: SecurityRequest,
): string | undefined {
  switch (scheme.in) {
    case 'header':
      return extractFromHeader(scheme, request.headers);
    case 'query':
      return extractFromQuery(scheme.paramName, request.query);
    case 'cookie':
      return extractFromCookie(scheme.paramName, request.headers);
    default:
      return undefined;
  }
}

/**
 * Extract credential from a request header
 *
 * For HTTP Bearer/Basic schemes, validates the Authorization header prefix.
 * For API Key headers, just checks for a non-empty value.
 */
function extractFromHeader(
  scheme: ResolvedSecurityScheme,
  headers: Record<string, string>,
): string | undefined {
  // Headers are case-insensitive; normalize lookup to lowercase
  const headerValue = findHeader(headers, scheme.paramName);
  if (!headerValue || headerValue.trim() === '') {
    return undefined;
  }

  // For HTTP/OAuth2 schemes, validate the Authorization prefix
  if (scheme.type === 'http' || scheme.type === 'oauth2') {
    return extractAuthorizationValue(headerValue, scheme.scheme);
  }

  // For API Key in header, any non-empty value is valid
  return headerValue.trim();
}

/**
 * Extract the token/value from an Authorization header
 *
 * Validates the scheme prefix (Bearer, Basic) and returns the token part.
 */
function extractAuthorizationValue(headerValue: string, scheme?: string): string | undefined {
  if (!scheme) {
    // No specific scheme required — accept any non-empty value
    return headerValue.trim() || undefined;
  }

  const parts = headerValue.trim().split(/\s+/);
  if (parts.length < 2) {
    return undefined;
  }

  const prefix = parts[0].toLowerCase();
  const token = parts.slice(1).join(' ');

  if (prefix !== scheme.toLowerCase()) {
    return undefined;
  }

  return token.trim() || undefined;
}

/**
 * Extract credential from a query parameter
 */
function extractFromQuery(
  paramName: string,
  query: Record<string, string | string[]>,
): string | undefined {
  const value = query[paramName];
  if (value === undefined) {
    return undefined;
  }

  // Handle multi-value params — use first value
  const str = Array.isArray(value) ? value[0] : value;
  return str?.trim() || undefined;
}

/**
 * Extract credential from a cookie
 *
 * Parses the Cookie header to find the named cookie.
 */
function extractFromCookie(
  cookieName: string,
  headers: Record<string, string>,
): string | undefined {
  const cookieHeader = findHeader(headers, 'cookie');
  if (!cookieHeader) {
    return undefined;
  }

  // Parse cookie header: "name1=value1; name2=value2"
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.trim().split('=');
    if (name?.trim() === cookieName) {
      const value = valueParts.join('=').trim();
      return value || undefined;
    }
  }

  return undefined;
}

/**
 * Case-insensitive header lookup
 *
 * Tries direct lowercase key lookup first (fast path for pre-normalized headers),
 * then falls back to a linear scan with case-insensitive comparison.
 */
function findHeader(headers: Record<string, string>, name: string): string | undefined {
  const lower = name.toLowerCase();

  // Fast path: direct lookup (works when headers are pre-normalized to lowercase)
  if (lower in headers) {
    return headers[lower];
  }

  // Slow path: case-insensitive scan for non-normalized headers
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) {
      return value;
    }
  }
  return undefined;
}
