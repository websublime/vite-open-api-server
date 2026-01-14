/**
 * Security Scheme Normalizer Module
 *
 * This module provides functionality to analyze OpenAPI specifications and
 * auto-generate missing security scheme definitions. It ensures that the mock
 * server can handle authenticated endpoints even when the OpenAPI spec has
 * incomplete security definitions.
 *
 * @module core/parser/security-normalizer
 */

import type {
  OpenApiDocument,
  OpenApiOAuthFlows,
  OpenApiOperation,
  OpenApiSecurityScheme,
} from './types';

/**
 * HTTP methods supported in OpenAPI path items.
 */
const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const;

/**
 * Adds scheme names from a security requirement array to the provided set.
 *
 * @param securityRequirements - Array of security requirement objects
 * @param schemeNames - Set to add scheme names to
 */
function collectSchemeNamesFromRequirements(
  securityRequirements: Array<Record<string, string[]>> | undefined,
  schemeNames: Set<string>,
): void {
  if (!securityRequirements) return;

  for (const requirement of securityRequirements) {
    for (const schemeName of Object.keys(requirement)) {
      schemeNames.add(schemeName);
    }
  }
}

/**
 * Extracts security scheme names from a single operation.
 *
 * @param operation - The operation to extract from
 * @param schemeNames - Set to add scheme names to
 */
function collectSchemeNamesFromOperation(
  operation: OpenApiOperation | undefined,
  schemeNames: Set<string>,
): void {
  if (!operation?.security) return;
  collectSchemeNamesFromRequirements(operation.security, schemeNames);
}

/**
 * Extracts all security requirement scheme names from all operations in the spec.
 *
 * Iterates through all paths and operations, collecting security scheme names
 * from `operation.security` arrays. Each security requirement is an object like
 * `{ api_key: [] }` where the key is the scheme name.
 *
 * @param spec - The parsed OpenAPI document
 * @returns A Set of all referenced security scheme names across the entire spec
 */
export function extractSecurityRequirements(spec: OpenApiDocument): Set<string> {
  const schemeNames = new Set<string>();

  // Check global security requirements
  collectSchemeNamesFromRequirements(spec.security, schemeNames);

  // Check operation-level security requirements
  if (spec.paths) {
    for (const pathItem of Object.values(spec.paths)) {
      if (!pathItem) continue;

      for (const method of HTTP_METHODS) {
        collectSchemeNamesFromOperation(
          pathItem[method] as OpenApiOperation | undefined,
          schemeNames,
        );
      }
    }
  }

  return schemeNames;
}

/**
 * Detects which security schemes are referenced but not defined.
 *
 * Compares the set of referenced scheme names against the defined schemes
 * in `spec.components.securitySchemes`.
 *
 * @param referencedSchemes - Set of scheme names referenced in operations
 * @param spec - The parsed OpenAPI document
 * @returns Array of missing scheme names
 */
export function detectMissingSchemes(
  referencedSchemes: Set<string>,
  spec: OpenApiDocument,
): string[] {
  const definedSchemes = spec.components?.securitySchemes
    ? new Set(Object.keys(spec.components.securitySchemes))
    : new Set<string>();

  const missingSchemes: string[] = [];

  for (const schemeName of referencedSchemes) {
    if (!definedSchemes.has(schemeName)) {
      missingSchemes.push(schemeName);
      // biome-ignore lint/suspicious/noConsole: Intentional logging for developer feedback
      console.warn(
        `[Security Normalizer] Warning: Security scheme '${schemeName}' referenced but not defined, generating default`,
      );
    }
  }

  return missingSchemes;
}

/**
 * Generates an OAuth2 security scheme with authorization code flow.
 *
 * @param schemeName - The name of the security scheme
 * @returns OAuth2 SecurityScheme object
 */
function generateOAuth2Scheme(schemeName: string): OpenApiSecurityScheme {
  const flows: OpenApiOAuthFlows = {
    authorizationCode: {
      authorizationUrl: 'https://example.com/oauth/authorize',
      tokenUrl: 'https://example.com/oauth/token',
      scopes: {
        'read:api': 'Read access to the API',
        'write:api': 'Write access to the API',
      },
    },
  };

  // biome-ignore lint/suspicious/noConsole: Intentional logging for developer feedback
  console.info(
    `[Security Normalizer] Generated '${schemeName}' scheme: oauth2 (authorization code flow)`,
  );

  return {
    type: 'oauth2',
    description: `Auto-generated OAuth2 scheme for '${schemeName}'. Please define properly in your OpenAPI spec.`,
    flows,
  };
}

/**
 * Generates an HTTP Bearer token security scheme.
 *
 * @param schemeName - The name of the security scheme
 * @returns HTTP Bearer SecurityScheme object
 */
function generateBearerScheme(schemeName: string): OpenApiSecurityScheme {
  // biome-ignore lint/suspicious/noConsole: Intentional logging for developer feedback
  console.info(`[Security Normalizer] Generated '${schemeName}' scheme: http (bearer)`);

  return {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: `Auto-generated Bearer token scheme for '${schemeName}'. Please define properly in your OpenAPI spec.`,
  };
}

/**
 * Generates an HTTP Basic authentication security scheme.
 *
 * @param schemeName - The name of the security scheme
 * @returns HTTP Basic SecurityScheme object
 */
function generateBasicScheme(schemeName: string): OpenApiSecurityScheme {
  // biome-ignore lint/suspicious/noConsole: Intentional logging for developer feedback
  console.info(`[Security Normalizer] Generated '${schemeName}' scheme: http (basic)`);

  return {
    type: 'http',
    scheme: 'basic',
    description: `Auto-generated HTTP Basic scheme for '${schemeName}'. Please define properly in your OpenAPI spec.`,
  };
}

/**
 * Generates an API Key security scheme.
 *
 * @param schemeName - The name of the security scheme
 * @returns API Key SecurityScheme object
 */
function generateApiKeyScheme(schemeName: string): OpenApiSecurityScheme {
  // biome-ignore lint/suspicious/noConsole: Intentional logging for developer feedback
  console.info(
    `[Security Normalizer] Generated '${schemeName}' scheme: apiKey (header: X-API-Key)`,
  );

  return {
    type: 'apiKey',
    in: 'header',
    name: 'X-API-Key',
    description: `Auto-generated API key scheme for '${schemeName}'. Please define properly in your OpenAPI spec.`,
  };
}

/**
 * Generates a default security scheme definition based on the scheme name.
 *
 * Uses naming pattern heuristics to determine the appropriate scheme type:
 * - Names containing "oauth" → oauth2 type
 * - Names containing "bearer" or "token" → http bearer type
 * - Names containing "basic" → http basic type
 * - Default fallback → apiKey in header
 *
 * @param schemeName - The name of the security scheme to generate
 * @returns A valid OpenAPI SecurityScheme object
 */
export function generateDefaultSecurityScheme(schemeName: string): OpenApiSecurityScheme {
  const lowerName = schemeName.toLowerCase();

  // OAuth2 pattern
  if (lowerName.includes('oauth')) {
    return generateOAuth2Scheme(schemeName);
  }

  // Bearer token pattern
  if (lowerName.includes('bearer') || lowerName.includes('token')) {
    return generateBearerScheme(schemeName);
  }

  // Basic auth pattern
  if (lowerName.includes('basic')) {
    return generateBasicScheme(schemeName);
  }

  // API Key pattern (default fallback)
  return generateApiKeyScheme(schemeName);
}

/**
 * Normalizes security schemes in an OpenAPI specification.
 *
 * This function analyzes the parsed OpenAPI specification, identifies missing
 * or incomplete security scheme definitions, and auto-generates default
 * configurations for common authentication patterns. It ensures that the mock
 * server can handle authenticated endpoints even when the OpenAPI spec has
 * incomplete security definitions.
 *
 * The function:
 * 1. Extracts all security requirements from all operations
 * 2. Identifies schemes referenced but not defined
 * 3. Generates default configurations based on naming patterns
 * 4. Adds generated schemes to spec.components.securitySchemes
 * 5. Preserves existing scheme definitions (no overrides)
 *
 * @param spec - The parsed OpenAPI document to normalize
 * @returns The same spec with normalized security schemes
 *
 * @example
 * ```typescript
 * import { normalizeSecuritySchemes } from './security-normalizer';
 *
 * const spec = await loadOpenApiSpec('./api/openapi.yaml');
 * const normalizedSpec = normalizeSecuritySchemes(spec);
 * ```
 */
export function normalizeSecuritySchemes(spec: OpenApiDocument): OpenApiDocument {
  // Extract all referenced security scheme names
  const referencedSchemes = extractSecurityRequirements(spec);

  // If no security requirements, return unchanged
  if (referencedSchemes.size === 0) {
    return spec;
  }

  // Detect missing schemes
  const missingSchemes = detectMissingSchemes(referencedSchemes, spec);

  // If no missing schemes, return unchanged
  if (missingSchemes.length === 0) {
    return spec;
  }

  // Ensure components and securitySchemes exist
  if (!spec.components) {
    spec.components = {};
  }

  if (!spec.components.securitySchemes) {
    spec.components.securitySchemes = {};
  }

  // Generate and add missing schemes
  for (const schemeName of missingSchemes) {
    const generatedScheme = generateDefaultSecurityScheme(schemeName);
    spec.components.securitySchemes[schemeName] = generatedScheme;
  }

  return spec;
}
