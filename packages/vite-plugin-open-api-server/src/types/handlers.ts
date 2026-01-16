/**
 * Handler Type Definitions
 *
 * ## What
 * This module defines the types for custom request handlers that inject
 * x-handler code into OpenAPI operations for the Scalar Mock Server.
 *
 * ## How
 * Handler files export an object mapping operationId to JavaScript code.
 * The code can be a static string or a function that generates code
 * dynamically based on the operation context.
 *
 * ## Why
 * The Scalar Mock Server expects x-handler extensions as JavaScript code
 * strings in the OpenAPI document. This approach allows handlers to access
 * Scalar's runtime context (store, faker, req, res) directly in the code.
 *
 * @see https://scalar.com/products/mock-server/custom-request-handler
 *
 * @module
 */

import type { OpenAPIV3_1 } from 'openapi-types';

/**
 * Context provided to dynamic handler code generators.
 *
 * This context allows handler functions to generate operation-specific
 * JavaScript code based on the OpenAPI specification.
 *
 * @example
 * ```typescript
 * // Dynamic handler that generates code based on operation parameters
 * const findPetsByStatus: HandlerCodeGeneratorFn = ({ operation }) => {
 *   const hasStatusParam = operation.parameters?.some(p => p.name === 'status');
 *
 *   if (hasStatusParam) {
 *     return `
 *       const status = req.query.status || 'available';
 *       return store.list('Pet').filter(p => p.status === status);
 *     `;
 *   }
 *
 *   return `return store.list('Pet');`;
 * };
 * ```
 */
export interface HandlerCodeContext {
  /**
   * The operation ID this handler is for.
   *
   * @example 'findPetsByStatus', 'getPetById', 'createPet'
   */
  operationId: string;

  /**
   * Full OpenAPI operation object.
   *
   * Contains parameters, requestBody, responses, security, etc.
   * Use this to generate context-aware handler code.
   */
  operation: OpenAPIV3_1.OperationObject;

  /**
   * HTTP method for this operation (lowercase).
   *
   * @example 'get', 'post', 'put', 'patch', 'delete'
   */
  method: string;

  /**
   * OpenAPI path for this operation.
   *
   * @example '/pet/findByStatus', '/pet/{petId}'
   */
  path: string;

  /**
   * Complete OpenAPI document for reference.
   *
   * Use this to access shared components, security schemes,
   * or other operations.
   */
  document: OpenAPIV3_1.Document;

  /**
   * Available schemas from components/schemas.
   *
   * Pre-extracted for convenience when generating code that
   * needs to reference schema structures.
   */
  schemas: Record<string, OpenAPIV3_1.SchemaObject>;
}

/**
 * Function signature for dynamic handler code generation.
 *
 * Receives operation context and returns JavaScript code as a string.
 * The returned code will be injected as x-handler in the OpenAPI spec.
 *
 * The code has access to Scalar's runtime context:
 * - `store` - In-memory data store
 * - `faker` - Faker.js instance
 * - `req` - Request object (body, params, query, headers)
 * - `res` - Example responses by status code
 *
 * @example
 * ```typescript
 * const getPetById: HandlerCodeGeneratorFn = ({ operation }) => {
 *   const has404 = '404' in (operation.responses || {});
 *
 *   return `
 *     const pet = store.get('Pet', req.params.petId);
 *     ${has404 ? 'if (!pet) return res[404];' : ''}
 *     return pet;
 *   `;
 * };
 * ```
 */
export type HandlerCodeGeneratorFn = (context: HandlerCodeContext) => string | Promise<string>;

/**
 * Handler value - either static code or a dynamic code generator.
 *
 * - **String**: Static JavaScript code injected directly as x-handler
 * - **Function**: Called with context to generate JavaScript code
 *
 * @example
 * ```typescript
 * // Static handler (simple, no context needed)
 * const getInventory: HandlerValue = `
 *   const pets = store.list('Pet');
 *   return pets.reduce((acc, pet) => {
 *     acc[pet.status] = (acc[pet.status] || 0) + 1;
 *     return acc;
 *   }, {});
 * `;
 *
 * // Dynamic handler (generates code based on operation)
 * const findPetsByStatus: HandlerValue = ({ operation }) => {
 *   // Generate different code based on operation config
 *   return `return store.list('Pet').filter(p => p.status === req.query.status);`;
 * };
 * ```
 */
export type HandlerValue = string | HandlerCodeGeneratorFn;

/**
 * Handler file exports structure.
 *
 * Handler files export an object mapping operationId to handler values.
 * Each value is either a JavaScript code string or a function that
 * generates code.
 *
 * @example
 * ```typescript
 * // pets.handler.mjs
 * export default {
 *   // Static: Simple code string
 *   getInventory: `
 *     const pets = store.list('Pet');
 *     return pets.reduce((acc, pet) => {
 *       acc[pet.status] = (acc[pet.status] || 0) + 1;
 *       return acc;
 *     }, {});
 *   `,
 *
 *   // Dynamic: Function that generates code
 *   findPetsByStatus: ({ operation }) => {
 *     const hasStatus = operation.parameters?.some(p => p.name === 'status');
 *     return hasStatus
 *       ? `return store.list('Pet').filter(p => p.status === req.query.status);`
 *       : `return store.list('Pet');`;
 *   },
 *
 *   // Static: CRUD operations
 *   getPetById: `return store.get('Pet', req.params.petId);`,
 *   addPet: `return store.create('Pet', { id: faker.string.uuid(), ...req.body });`,
 *   updatePet: `return store.update('Pet', req.params.petId, req.body);`,
 *   deletePet: `store.delete('Pet', req.params.petId); return null;`,
 * };
 * ```
 */
export interface HandlerFileExports {
  /**
   * Default export must be an object mapping operationId to handler values.
   */
  default: HandlerExports;
}

/**
 * Map of operationId to handler values.
 *
 * This is the expected structure of the default export from handler files.
 */
export type HandlerExports = Record<string, HandlerValue>;

/**
 * Result of loading and resolving handler files.
 *
 * After loading, all handlers are resolved to their final code strings
 * for injection into the OpenAPI document.
 */
export type ResolvedHandlers = Map<string, string>;

/**
 * Handler loading result with metadata.
 */
export interface HandlerLoadResult {
  /**
   * Map of operationId to handler value (string or function).
   */
  handlers: Map<string, HandlerValue>;

  /**
   * Files that were successfully loaded.
   */
  loadedFiles: string[];

  /**
   * Warnings encountered during loading.
   */
  warnings: string[];

  /**
   * Errors encountered during loading.
   */
  errors: string[];
}
