/**
 * Handler Type Definitions
 *
 * ## What
 * This module defines the types for custom request handlers. Handlers allow
 * users to override default mock server responses with custom logic for
 * specific endpoints.
 *
 * ## How
 * Handler files export an async function that receives a `HandlerContext`
 * with full access to request data, the OpenAPI registry, logger, and
 * security context. Handlers return a `HandlerResponse` or null to use
 * the default mock behavior.
 *
 * ## Why
 * Custom handlers enable realistic mock responses that go beyond static
 * OpenAPI examples. With access to the registry and security context,
 * handlers can implement complex business logic, validate requests,
 * and return dynamic responses based on request parameters.
 *
 * @module
 */

import type { Logger } from 'vite';
import type { OpenApiEndpointRegistry } from './registry.js';
import type { SecurityContext } from './security.js';

/**
 * Context object passed to custom handler functions.
 *
 * Provides access to request data, the OpenAPI registry, logger, and
 * security state. The generic `TBody` parameter allows typed request
 * bodies when the handler knows the expected schema.
 *
 * @template TBody - Type of request body (defaults to unknown)
 *
 * @example
 * ```typescript
 * // Handler file: post.createPet.mjs
 * export default async function handler(context: HandlerContext<{ name: string; status: string }>) {
 *   const { body, params, logger, security } = context;
 *
 *   if (!security.credentials) {
 *     return { status: 401, body: { error: 'Unauthorized' } };
 *   }
 *
 *   logger.info(`Creating pet: ${body.name}`);
 *
 *   return {
 *     status: 201,
 *     body: { id: Date.now(), name: body.name, status: body.status },
 *     headers: { 'X-Created-At': new Date().toISOString() },
 *   };
 * }
 * ```
 */
export interface HandlerContext<TBody = unknown> {
  /**
   * HTTP method of the request (uppercase).
   *
   * @example 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'
   */
  method: string;

  /**
   * Request path without query string.
   *
   * @example '/pets/123', '/users/456/orders'
   */
  path: string;

  /**
   * Path parameters extracted from the URL.
   *
   * Keys correspond to path parameter names defined in the OpenAPI spec.
   *
   * @example { petId: '123', categoryId: '456' }
   */
  params: Record<string, string>;

  /**
   * Query string parameters from the request URL.
   *
   * Values can be strings or arrays of strings for repeated parameters.
   *
   * @example { status: 'available', tags: ['dog', 'pet'] }
   */
  query: Record<string, string | string[]>;

  /**
   * Parsed request body.
   *
   * The body is automatically parsed based on the Content-Type header.
   * For JSON requests, this will be the parsed JSON object.
   * For form data, this will be the parsed form fields.
   *
   * Use the `TBody` generic parameter for typed access to the body.
   */
  body: TBody;

  /**
   * Request headers with lowercase keys.
   *
   * Header values can be strings, arrays of strings (for multiple values),
   * or undefined if the header is not present.
   *
   * @example { 'content-type': 'application/json', 'authorization': 'Bearer token123' }
   */
  headers: Record<string, string | string[] | undefined>;

  /**
   * Vite logger for consistent logging.
   *
   * Use this logger instead of console.log to integrate with Vite's
   * logging system and respect the user's verbose setting.
   */
  logger: Logger;

  /**
   * OpenAPI registry with read-only access to schemas, endpoints, and security.
   *
   * Use the registry to access schema definitions for validation,
   * endpoint metadata for dynamic responses, or security scheme information.
   */
  registry: Readonly<OpenApiEndpointRegistry>;

  /**
   * Security context with current authentication state.
   *
   * Contains security requirements from the spec, the matched security
   * scheme, extracted credentials, and validated scopes.
   */
  security: SecurityContext;

  /**
   * Operation ID for this endpoint.
   *
   * Matches the operationId from the OpenAPI spec. Useful for
   * logging or conditional logic based on the operation.
   *
   * @example 'getPetById', 'createPet', 'listPets'
   */
  operationId: string;

  /**
   * Seed data loaded for this endpoint.
   *
   * If a seed file exists for this operation, its exported data
   * will be available here for use in generating responses.
   * Undefined if no seed file exists.
   */
  seeds?: Record<string, unknown>;
}

/**
 * Response returned by custom handler functions.
 *
 * Handlers return this response object to override the default mock behavior.
 * Return null to fall back to the default mock server response.
 *
 * @example
 * ```typescript
 * // Success response
 * const successResponse: HandlerResponse = {
 *   status: 200,
 *   body: { id: 1, name: 'Fluffy', status: 'available' },
 * };
 *
 * // Error response with custom headers
 * const errorResponse: HandlerResponse = {
 *   status: 400,
 *   body: { error: 'Invalid pet ID', code: 'INVALID_ID' },
 *   headers: { 'X-Error-Code': 'INVALID_ID' },
 * };
 * ```
 */
export interface HandlerResponse {
  /**
   * HTTP status code for the response.
   *
   * @example 200, 201, 400, 401, 404, 500
   */
  status: number;

  /**
   * Response body.
   *
   * Objects will be JSON-serialized. Strings are sent as-is.
   * Use null for empty responses (e.g., 204 No Content).
   */
  body: unknown;

  /**
   * Optional response headers.
   *
   * Headers are merged with default headers. Use this to add
   * custom headers like cache-control, correlation IDs, etc.
   */
  headers?: Record<string, string>;
}

/**
 * Custom handler function signature.
 *
 * Async function that receives a handler context and returns a response
 * or null. Return null to use the default mock server response.
 *
 * @template TBody - Type of request body (defaults to unknown)
 *
 * @example
 * ```typescript
 * // Handler that returns custom response
 * const getPetHandler: HandlerCodeGenerator<never> = async (context) => {
 *   const { params, registry } = context;
 *   const pet = await findPet(params.petId);
 *
 *   if (!pet) {
 *     return { status: 404, body: { error: 'Pet not found' } };
 *   }
 *
 *   return { status: 200, body: pet };
 * };
 *
 * // Handler that falls back to default mock
 * const listPetsHandler: HandlerCodeGenerator = async (context) => {
 *   if (context.query.useDefault === 'true') {
 *     return null; // Use mock server's default response
 *   }
 *   return { status: 200, body: [] };
 * };
 * ```
 */
export type HandlerCodeGenerator<TBody = unknown> = (
  context: HandlerContext<TBody>
) => Promise<HandlerResponse | null>;

/**
 * Expected exports from handler files.
 *
 * Handler files must default export an async function matching the
 * `HandlerCodeGenerator` signature. Named exports are ignored.
 *
 * @example
 * ```typescript
 * // get.getPetById.mjs
 * export default async function handler(context) {
 *   return { status: 200, body: { id: 1, name: 'Fluffy' } };
 * }
 *
 * // Or with TypeScript types
 * import type { HandlerCodeGenerator } from '@websublime/vite-plugin-open-api-server';
 *
 * const handler: HandlerCodeGenerator = async (context) => {
 *   return { status: 200, body: { id: 1, name: 'Fluffy' } };
 * };
 *
 * export default handler;
 * ```
 */
export interface HandlerFileExports {
  /**
   * Default export must be a handler function.
   */
  default: HandlerCodeGenerator;
}
