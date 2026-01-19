/**
 * Path Converter
 *
 * What: Converts OpenAPI path format to Hono path format
 * How: Replaces {param} with :param
 * Why: OpenAPI uses {petId} but Hono uses :petId
 */

// TODO: Will be implemented in Task 1.4: Hono Router

/**
 * Convert OpenAPI path to Hono path format
 *
 * @example
 * convertOpenApiPath('/pet/{petId}') // returns '/pet/:petId'
 *
 * @param openApiPath - Path in OpenAPI format
 * @returns Path in Hono format
 */
export function convertOpenApiPath(openApiPath: string): string {
  return openApiPath.replace(/\{([^}]+)\}/g, ':$1');
}
