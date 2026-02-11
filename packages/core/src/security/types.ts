/**
 * Security Types
 *
 * What: Type definitions for OpenAPI security scheme handling
 * How: Interfaces for resolved security schemes and credential extraction
 * Why: Provides type safety for the security middleware layer
 *
 * @module security/types
 */

/**
 * Supported OpenAPI security scheme types
 *
 * Maps to the `type` field in OpenAPI `securitySchemes`:
 * - `apiKey`: API key passed via header, query, or cookie
 * - `http`: HTTP authentication (Bearer, Basic)
 * - `oauth2`: OAuth 2.0 (treated as Bearer token)
 */
export type SecuritySchemeType = 'apiKey' | 'http' | 'oauth2';

/**
 * Location where a credential is expected in the request
 */
export type SecuritySchemeIn = 'header' | 'query' | 'cookie';

/**
 * Resolved security scheme from OpenAPI `components.securitySchemes`
 *
 * Contains all information needed to locate and validate a credential
 * in an incoming request.
 */
export interface ResolvedSecurityScheme {
  /** Scheme name as declared in securitySchemes */
  name: string;
  /** OpenAPI scheme type */
  type: SecuritySchemeType;
  /** Where to look for the credential */
  in: SecuritySchemeIn;
  /** Header name, query parameter name, or cookie name */
  paramName: string;
  /** For HTTP schemes: 'bearer' or 'basic' */
  scheme?: string;
}

/**
 * Credentials extracted from an incoming request for a single scheme
 */
export interface SecurityCredentials {
  /** The scheme that was matched */
  schemeName: string;
  /** The raw credential value extracted from the request */
  value: string;
}

/**
 * Security context passed to custom handlers
 *
 * Allows handlers to inspect which security scheme was used and
 * what credentials were provided (without real validation).
 */
export interface SecurityContext {
  /** Whether the endpoint requires authentication */
  authenticated: boolean;
  /** The scheme that was satisfied (first match from OR alternatives) */
  scheme?: string;
  /** The raw credential value */
  credentials?: string;
  /** Required scopes from the OpenAPI spec */
  scopes: string[];
}
