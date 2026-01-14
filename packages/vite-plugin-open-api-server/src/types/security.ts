/**
 * Security Type Definitions
 *
 * ## What
 * This module defines normalized security types that are extracted from
 * OpenAPI security schemes and provided to handlers. These types represent
 * the current authentication state for a request.
 *
 * ## How
 * Security schemes from the OpenAPI spec are normalized into a discriminated
 * union type (`NormalizedSecurityScheme`) that handlers can use to check
 * authentication. The `SecurityContext` provides the complete authentication
 * state including requirements, matched scheme, credentials, and scopes.
 *
 * ## Why
 * By normalizing OpenAPI security schemes into TypeScript-friendly types,
 * handlers can easily check authentication state with full type safety.
 * Discriminated unions enable exhaustive switch statements for handling
 * different authentication types.
 *
 * @module
 */

/**
 * API Key security scheme.
 *
 * Represents authentication via API key passed in a header, query parameter,
 * or cookie.
 *
 * @example
 * ```typescript
 * const apiKeyScheme: ApiKeySecurityScheme = {
 *   type: 'apiKey',
 *   name: 'X-API-Key',
 *   in: 'header',
 * };
 * ```
 */
export interface ApiKeySecurityScheme {
  /**
   * Discriminator for API key authentication.
   */
  type: 'apiKey';

  /**
   * Name of the header, query parameter, or cookie.
   *
   * @example 'X-API-Key', 'api_key', 'apiKey'
   */
  name: string;

  /**
   * Location of the API key.
   */
  in: 'query' | 'header' | 'cookie';
}

/**
 * HTTP security scheme.
 *
 * Represents HTTP authentication schemes like Bearer tokens or Basic auth.
 *
 * @example
 * ```typescript
 * const bearerScheme: HttpSecurityScheme = {
 *   type: 'http',
 *   scheme: 'bearer',
 *   bearerFormat: 'JWT',
 * };
 *
 * const basicScheme: HttpSecurityScheme = {
 *   type: 'http',
 *   scheme: 'basic',
 * };
 * ```
 */
export interface HttpSecurityScheme {
  /**
   * Discriminator for HTTP authentication.
   */
  type: 'http';

  /**
   * HTTP authentication scheme name.
   *
   * @example 'bearer', 'basic', 'digest', 'hoba', 'mutual', 'negotiate', 'oauth', 'scram-sha-1', 'scram-sha-256', 'vapid'
   */
  scheme: 'bearer' | 'basic' | string;

  /**
   * Bearer token format hint.
   *
   * Only applicable when scheme is 'bearer'. Provides a hint about the
   * token format for documentation purposes.
   *
   * @example 'JWT'
   */
  bearerFormat?: string;
}

/**
 * OAuth2 security scheme.
 *
 * Represents OAuth 2.0 authentication with various flow types
 * (implicit, password, clientCredentials, authorizationCode).
 *
 * @example
 * ```typescript
 * const oauth2Scheme: OAuth2SecurityScheme = {
 *   type: 'oauth2',
 *   flows: {
 *     authorizationCode: {
 *       authorizationUrl: 'https://example.com/oauth/authorize',
 *       tokenUrl: 'https://example.com/oauth/token',
 *       scopes: {
 *         'read:pets': 'Read pet data',
 *         'write:pets': 'Modify pet data',
 *       },
 *     },
 *   },
 * };
 * ```
 */
export interface OAuth2SecurityScheme {
  /**
   * Discriminator for OAuth2 authentication.
   */
  type: 'oauth2';

  /**
   * OAuth2 flow configurations.
   *
   * Each flow type has its own configuration including URLs and scopes.
   */
  flows: Record<string, OAuth2Flow>;
}

/**
 * OAuth2 flow configuration.
 *
 * Contains URLs and scopes for a specific OAuth2 flow type.
 */
export interface OAuth2Flow {
  /**
   * Authorization URL for OAuth2 implicit or authorizationCode flows.
   */
  authorizationUrl?: string;

  /**
   * Token URL for OAuth2 password, clientCredentials, or authorizationCode flows.
   */
  tokenUrl?: string;

  /**
   * Refresh URL for obtaining refresh tokens.
   */
  refreshUrl?: string;

  /**
   * Available scopes for this OAuth2 flow.
   *
   * Keys are scope names, values are scope descriptions.
   */
  scopes: Record<string, string>;
}

/**
 * OpenID Connect security scheme.
 *
 * Represents OpenID Connect discovery-based authentication.
 *
 * @example
 * ```typescript
 * const oidcScheme: OpenIdConnectSecurityScheme = {
 *   type: 'openIdConnect',
 *   openIdConnectUrl: 'https://example.com/.well-known/openid-configuration',
 * };
 * ```
 */
export interface OpenIdConnectSecurityScheme {
  /**
   * Discriminator for OpenID Connect authentication.
   */
  type: 'openIdConnect';

  /**
   * OpenID Connect discovery document URL.
   *
   * Points to the `.well-known/openid-configuration` endpoint.
   */
  openIdConnectUrl: string;
}

/**
 * Union of all normalized security scheme types.
 *
 * Use the `type` field as a discriminator for exhaustive type narrowing.
 *
 * @example
 * ```typescript
 * function handleSecurity(scheme: NormalizedSecurityScheme) {
 *   switch (scheme.type) {
 *     case 'apiKey':
 *       console.log(`API Key in ${scheme.in}: ${scheme.name}`);
 *       break;
 *     case 'http':
 *       console.log(`HTTP ${scheme.scheme} auth`);
 *       break;
 *     case 'oauth2':
 *       console.log('OAuth2 flows:', Object.keys(scheme.flows));
 *       break;
 *     case 'openIdConnect':
 *       console.log(`OIDC discovery: ${scheme.openIdConnectUrl}`);
 *       break;
 *   }
 * }
 * ```
 */
export type NormalizedSecurityScheme =
  | ApiKeySecurityScheme
  | HttpSecurityScheme
  | OAuth2SecurityScheme
  | OpenIdConnectSecurityScheme;

/**
 * Security requirement from the OpenAPI operation.
 *
 * Represents a single security requirement extracted from the operation's
 * `security` array. Each requirement specifies a security scheme and
 * any required scopes (for OAuth2).
 *
 * @example
 * ```typescript
 * // Requires api_key authentication (no scopes)
 * const apiKeyReq: SecurityRequirement = {
 *   schemeName: 'api_key',
 *   scopes: [],
 * };
 *
 * // Requires OAuth2 with specific scopes
 * const oauth2Req: SecurityRequirement = {
 *   schemeName: 'petstore_auth',
 *   scopes: ['read:pets', 'write:pets'],
 * };
 * ```
 */
export interface SecurityRequirement {
  /**
   * Name of the security scheme (as defined in components.securitySchemes).
   *
   * @example 'api_key', 'bearerAuth', 'petstore_auth'
   */
  schemeName: string;

  /**
   * Required scopes for OAuth2/OpenID Connect.
   *
   * Empty array for schemes that don't use scopes (apiKey, http).
   */
  scopes: string[];
}

/**
 * Security context provided to handlers.
 *
 * Contains the complete authentication state for the current request,
 * including security requirements from the spec, the matched security
 * scheme, extracted credentials, and validated scopes.
 *
 * @example
 * ```typescript
 * // Handler checking authentication
 * export default async function handler(context: HandlerContext) {
 *   const { security } = context;
 *
 *   // Check if authentication is required
 *   if (security.requirements.length > 0 && !security.credentials) {
 *     return { status: 401, body: { error: 'Authentication required' } };
 *   }
 *
 *   // Check for specific scope
 *   if (!security.scopes.includes('write:pets')) {
 *     return { status: 403, body: { error: 'Insufficient permissions' } };
 *   }
 *
 *   // Proceed with authenticated request
 *   return { status: 200, body: { user: 'authenticated' } };
 * }
 * ```
 */
export interface SecurityContext {
  /**
   * Security requirements for this operation (from spec).
   *
   * Empty array means no authentication is required.
   * Multiple requirements indicate OR relationship (any one can be satisfied).
   */
  requirements: SecurityRequirement[];

  /**
   * Matched security scheme for this request.
   *
   * Null if no authentication is required or no scheme was matched.
   */
  scheme: NormalizedSecurityScheme | null;

  /**
   * Extracted credentials from the request.
   *
   * The format depends on the security scheme type:
   * - apiKey: The API key value
   * - http/bearer: The bearer token (without 'Bearer ' prefix)
   * - http/basic: The decoded credentials (username:password)
   * - oauth2: The access token
   *
   * Null if no credentials were provided.
   */
  credentials: string | null;

  /**
   * Validated scopes from the request.
   *
   * For OAuth2/OpenID Connect, contains the scopes that were validated
   * from the token. Empty array for other scheme types or if no
   * scopes were provided.
   */
  scopes: string[];
}
