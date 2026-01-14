/**
 * Custom Handler for DELETE /pet/{petId} (deletePet operation)
 *
 * ## What
 * This handler intercepts DELETE requests to the `/pet/{petId}` endpoint, allowing custom
 * logic to be executed instead of (or before) the default mock server response.
 *
 * ## How
 * When the mock server receives a DELETE /pet/{petId} request, it checks for a matching handler.
 * If this handler exports a default async function, it will be invoked with a
 * `HandlerContext` containing request details, path parameters, security context, and utility functions.
 *
 * ## Why
 * Custom handlers enable:
 * - Database deletions for specific pets by ID
 * - Soft delete implementations (marking as inactive instead of removing)
 * - Cascade deletion of related resources (images, orders)
 * - Authorization checks before allowing deletion
 *
 * ## Security
 * This handler demonstrates how to access the SecurityContext to check authentication.
 * The deletePet operation requires petstore_auth OAuth2 authentication according to the spec.
 *
 * @module handlers/delete-pet
 * @see {@link https://github.com/websublime/vite-open-api-server} Plugin documentation
 *
 * @example
 * ```bash
 * # Without authentication (returns 401)
 * curl -X DELETE http://localhost:3456/pet/1
 *
 * # With Bearer token (returns 200)
 * curl -X DELETE -H "Authorization: Bearer my-token" http://localhost:3456/pet/1
 *
 * # With API key (also works if spec allows)
 * curl -X DELETE -H "api_key: my-key" http://localhost:3456/pet/1
 * ```
 */

import type { HandlerContext, HandlerResponse } from '@websublime/vite-plugin-open-api-server';

/**
 * Handler for the deletePet operation demonstrating SecurityContext access.
 *
 * This handler shows how to:
 * 1. Check if security is required for the endpoint
 * 2. Access the matched security scheme (apiKey, http, oauth2, etc.)
 * 3. Read the extracted credentials (token, API key, etc.)
 * 4. Implement custom authorization logic based on security context
 *
 * @param context - The handler context containing request information, security, and utilities
 * @returns Custom response or null to use default mock behavior
 *
 * @example
 * ```typescript
 * // Access security information in a handler
 * const { security, logger, params } = context;
 *
 * // Check if security requirements exist
 * if (security.requirements.length > 0) {
 *   logger.info(`This endpoint requires authentication`);
 * }
 *
 * // Access the matched scheme details
 * if (security.scheme?.type === 'oauth2') {
 *   logger.info('OAuth2 authentication used');
 * }
 * ```
 */
export default async function handler(context: HandlerContext): Promise<HandlerResponse | null> {
  const { security, logger, params, operationId } = context;
  const petId = params.petId;

  // Log security context information for debugging
  logger.info(`[${operationId}] Processing delete request for pet ${petId}`);

  // Check if this endpoint has security requirements
  if (security.requirements.length > 0) {
    logger.info(
      `[${operationId}] Security requirements: ${security.requirements.length} scheme(s)`,
    );

    // Log each requirement
    for (const req of security.requirements) {
      const scopeInfo = req.scopes.length > 0 ? ` with scopes: ${req.scopes.join(', ')}` : '';
      logger.info(`[${operationId}]   - ${req.schemeName}${scopeInfo}`);
    }
  }

  // Check if credentials were provided
  if (security.credentials) {
    logger.info(
      `[${operationId}] Credentials provided (length: ${security.credentials.length} chars)`,
    );

    // Access the matched security scheme
    if (security.scheme) {
      switch (security.scheme.type) {
        case 'apiKey':
          logger.info(
            `[${operationId}] API Key authentication via ${security.scheme.in}: ${security.scheme.name}`,
          );
          break;

        case 'http':
          logger.info(`[${operationId}] HTTP ${security.scheme.scheme} authentication`);
          break;

        case 'oauth2':
          logger.info(`[${operationId}] OAuth2 authentication`);
          if (security.scopes.length > 0) {
            logger.info(`[${operationId}] Scopes: ${security.scopes.join(', ')}`);
          }
          break;

        case 'openIdConnect':
          logger.info(`[${operationId}] OpenID Connect authentication`);
          break;
      }
    }
  } else {
    // Note: Scalar mock server already handles 401 for missing credentials
    // This block would only be reached if security is optional
    logger.info(`[${operationId}] No credentials provided`);
  }

  // Example: Custom authorization check (commented out as demonstration)
  // In a real scenario, you might check specific scopes or roles:
  //
  // if (security.requirements.length > 0) {
  //   const hasWriteScope = security.scopes.includes('write:pets');
  //   if (!hasWriteScope) {
  //     return {
  //       status: 403,
  //       body: {
  //         error: 'Forbidden',
  //         message: 'Insufficient permissions: write:pets scope required',
  //         code: 'INSUFFICIENT_SCOPE',
  //       },
  //     };
  //   }
  // }

  // Return null to use the default mock response
  // The mock server will return a success response since auth is validated
  return null;
}
