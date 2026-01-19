/**
 * OpenAPI Document Processor
 *
 * What: Processes OpenAPI documents through bundle -> upgrade -> dereference pipeline
 * How: Uses @scalar packages for each transformation step
 * Why: Ensures all documents are normalized to OpenAPI 3.1 with no external references
 *
 * Pipeline:
 * 1. Bundle - Resolve external $ref references (files, URLs)
 * 2. Upgrade - Convert OAS 2.0/3.0 to 3.1 for consistency
 * 3. Dereference - Inline all $ref pointers for easy traversal
 *
 * @module parser/processor
 */

import { bundle } from '@scalar/json-magic/bundle';
import { fetchUrls, parseJson, parseYaml, readFiles } from '@scalar/json-magic/bundle/plugins/node';
import { dereference } from '@scalar/openapi-parser';
import type { OpenAPIV3_1 } from '@scalar/openapi-types';
import { upgrade } from '@scalar/openapi-upgrader';

/**
 * Options for processing OpenAPI documents
 */
export interface ProcessorOptions {
  /** Base directory for relative file resolution */
  basePath?: string;
}

/**
 * Error thrown during OpenAPI document processing
 *
 * @remarks
 * This error is thrown when any step in the processing pipeline fails:
 * - Bundle: Failed to resolve external references
 * - Upgrade: Failed to convert to OpenAPI 3.1
 * - Dereference: Failed to inline $ref pointers
 */
export class ProcessorError extends Error {
  /** The processing step that failed */
  readonly step: 'bundle' | 'upgrade' | 'dereference' | 'validation';

  constructor(
    message: string,
    step: 'bundle' | 'upgrade' | 'dereference' | 'validation' = 'validation',
  ) {
    super(message);
    this.name = 'ProcessorError';
    this.step = step;

    // Capture V8 stack trace excluding constructor frame
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, ProcessorError);
    }
  }
}

/**
 * Creates a minimal valid OpenAPI 3.1 document
 *
 * @returns Empty OpenAPI 3.1 document with required fields
 */
function createEmptyDocument(): OpenAPIV3_1.Document {
  return {
    openapi: '3.1.0',
    info: { title: 'OpenAPI Server', version: '1.0.0' },
    paths: {},
  };
}

/**
 * Checks if the input is empty or undefined
 *
 * @param input - The input to check
 * @returns True if input is empty/undefined
 */
function isEmptyInput(input: string | Record<string, unknown> | undefined | null): boolean {
  if (!input) {
    return true;
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    return trimmed === '' || trimmed === '{}' || trimmed === '[]';
  }

  if (typeof input === 'object') {
    return Object.keys(input).length === 0;
  }

  return false;
}

/**
 * Process an OpenAPI document through the full pipeline:
 * 1. Bundle - resolve external $ref references
 * 2. Upgrade - convert to OpenAPI 3.1
 * 3. Dereference - inline all $ref pointers
 *
 * @param input - OpenAPI document as file path, URL, YAML string, JSON string, or object
 * @param _options - Processing options (reserved for future use)
 * @returns Fully dereferenced OpenAPI 3.1 document
 * @throws ProcessorError if processing fails at any step
 *
 * @example
 * ```typescript
 * // From file path
 * const doc = await processOpenApiDocument('./openapi/petstore.yaml');
 *
 * // From URL
 * const doc = await processOpenApiDocument('https://api.example.com/openapi.json');
 *
 * // From object
 * const doc = await processOpenApiDocument({
 *   openapi: '3.0.0',
 *   info: { title: 'My API', version: '1.0.0' },
 *   paths: {}
 * });
 * ```
 */
export async function processOpenApiDocument(
  input: string | Record<string, unknown>,
  _options?: ProcessorOptions,
): Promise<OpenAPIV3_1.Document> {
  // Handle empty/undefined input by returning minimal valid document
  if (isEmptyInput(input)) {
    return createEmptyDocument();
  }

  // Step 1: Bundle - Resolve external $ref references
  let bundled: Record<string, unknown>;
  try {
    const bundleResult = await bundle(input, {
      plugins: [parseJson(), parseYaml(), readFiles(), fetchUrls()],
      treeShake: false,
    });
    bundled = bundleResult as Record<string, unknown>;
  } catch (error) {
    throw new ProcessorError(
      `Failed to bundle OpenAPI document: ${error instanceof Error ? error.message : String(error)}`,
      'bundle',
    );
  }

  // Validate bundle result
  if (!bundled || typeof bundled !== 'object') {
    throw new ProcessorError('Bundled document is invalid: expected an object', 'bundle');
  }

  // Step 2: Upgrade - Convert to OpenAPI 3.1
  let upgraded: OpenAPIV3_1.Document;
  try {
    // The upgrade function accepts the document and target version
    upgraded = upgrade(bundled, '3.1') as OpenAPIV3_1.Document;
  } catch (error) {
    throw new ProcessorError(
      `Failed to upgrade to OpenAPI 3.1: ${error instanceof Error ? error.message : String(error)}`,
      'upgrade',
    );
  }

  // Validate upgrade result
  if (!upgraded || typeof upgraded !== 'object') {
    throw new ProcessorError(
      'Upgraded document is invalid: upgrade returned null or undefined',
      'upgrade',
    );
  }

  // Step 3: Dereference - Inline all $ref pointers
  let dereferenced: OpenAPIV3_1.Document;
  try {
    const result = await dereference(upgraded);

    // Check for dereference errors
    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map((e) => e.message).join(', ');
      throw new ProcessorError(
        `Failed to dereference OpenAPI document: ${errorMessages}`,
        'dereference',
      );
    }

    // Get the dereferenced schema
    dereferenced = result.schema as OpenAPIV3_1.Document;
  } catch (error) {
    // Re-throw ProcessorError as-is
    if (error instanceof ProcessorError) {
      throw error;
    }

    throw new ProcessorError(
      `Failed to dereference OpenAPI document: ${error instanceof Error ? error.message : String(error)}`,
      'dereference',
    );
  }

  // Validate dereference result
  if (!dereferenced || typeof dereferenced !== 'object') {
    throw new ProcessorError('Dereferenced schema is invalid: expected an object', 'dereference');
  }

  // Validate that we have a valid OpenAPI document
  if (!dereferenced.openapi || !dereferenced.info) {
    throw new ProcessorError(
      'Processed document is missing required OpenAPI fields (openapi, info)',
      'validation',
    );
  }

  return dereferenced;
}
