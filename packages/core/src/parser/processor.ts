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
 * @remarks
 * **Security Considerations**: This processor is designed for development use only.
 * It allows loading files and URLs from user input without sandboxing:
 * - File paths can access any file readable by the process
 * - URLs can fetch from any accessible endpoint
 *
 * Do NOT use this processor with untrusted input in production environments.
 * For production use cases, implement URL allowlisting and path sandboxing.
 *
 * @module parser/processor
 */

import { bundle } from '@scalar/json-magic/bundle';
import { fetchUrls, parseJson, parseYaml, readFiles } from '@scalar/json-magic/bundle/plugins/node';
import { dereference } from '@scalar/openapi-parser';
import type { OpenAPIV3_1 } from '@scalar/openapi-types';
import { upgrade } from '@scalar/openapi-upgrader';

/** Processing step identifier for error tracking */
export type ProcessorStep = 'bundle' | 'upgrade' | 'dereference' | 'validation';

/**
 * Options for processing OpenAPI documents
 *
 * @remarks
 * The `basePath` option is reserved for future use. Currently, file paths
 * are resolved relative to the current working directory.
 */
export interface ProcessorOptions {
  /**
   * Base directory for relative file resolution.
   * @reserved This option is not yet implemented and is reserved for future use.
   */
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
 * - Validation: Processed document is missing required fields
 */
export class ProcessorError extends Error {
  /** The processing step that failed */
  readonly step: ProcessorStep;

  constructor(message: string, step: ProcessorStep = 'validation') {
    super(message);
    this.name = 'ProcessorError';
    this.step = step;

    // Capture V8 stack trace excluding constructor frame
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, ProcessorError);
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts error message from unknown error type
 *
 * @param error - The caught error value
 * @returns Human-readable error message
 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Type guard to check if a value is a valid object (non-null, non-array)
 *
 * @param value - The value to check
 * @returns True if value is a valid object
 */
function isValidObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
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

// ============================================================================
// Pipeline Step Functions
// ============================================================================

/**
 * Step 1: Bundle external $ref references
 *
 * @param input - OpenAPI document as file path, URL, or object
 * @returns Bundled document with external refs resolved
 * @throws ProcessorError if bundling fails
 */
async function bundleDocument(
  input: string | Record<string, unknown>,
): Promise<Record<string, unknown>> {
  let bundled: unknown;

  try {
    bundled = await bundle(input, {
      plugins: [parseJson(), parseYaml(), readFiles(), fetchUrls()],
      treeShake: false,
    });
  } catch (error) {
    throw new ProcessorError(
      `Failed to bundle OpenAPI document: ${getErrorMessage(error)}`,
      'bundle',
    );
  }

  if (!isValidObject(bundled)) {
    throw new ProcessorError('Bundled document is invalid: expected an object', 'bundle');
  }

  return bundled;
}

/**
 * Step 2: Upgrade document to OpenAPI 3.1
 *
 * @param bundled - Bundled OpenAPI document
 * @returns Upgraded OpenAPI 3.1 document
 * @throws ProcessorError if upgrade fails
 */
function upgradeDocument(bundled: Record<string, unknown>): OpenAPIV3_1.Document {
  let upgraded: unknown;

  try {
    upgraded = upgrade(bundled, '3.1');
  } catch (error) {
    throw new ProcessorError(
      `Failed to upgrade to OpenAPI 3.1: ${getErrorMessage(error)}`,
      'upgrade',
    );
  }

  if (!isValidObject(upgraded)) {
    throw new ProcessorError(
      'Upgraded document is invalid: upgrade returned null or undefined',
      'upgrade',
    );
  }

  return upgraded as OpenAPIV3_1.Document;
}

/**
 * Step 3: Dereference all $ref pointers
 *
 * @param upgraded - Upgraded OpenAPI 3.1 document
 * @returns Dereferenced document with all refs inlined
 * @throws ProcessorError if dereferencing fails
 */
async function dereferenceDocument(upgraded: OpenAPIV3_1.Document): Promise<OpenAPIV3_1.Document> {
  let dereferenced: unknown;

  try {
    const result = await dereference(upgraded);

    // Check for dereference errors
    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map((e) => e?.message ?? 'Unknown error').join(', ');
      throw new ProcessorError(
        `Failed to dereference OpenAPI document: ${errorMessages}`,
        'dereference',
      );
    }

    dereferenced = result.schema;
  } catch (error) {
    // Re-throw ProcessorError as-is
    if (error instanceof ProcessorError) {
      throw error;
    }

    throw new ProcessorError(
      `Failed to dereference OpenAPI document: ${getErrorMessage(error)}`,
      'dereference',
    );
  }

  if (!isValidObject(dereferenced)) {
    throw new ProcessorError('Dereferenced schema is invalid: expected an object', 'dereference');
  }

  return dereferenced as OpenAPIV3_1.Document;
}

/**
 * Validates the final processed document
 *
 * @param document - The processed OpenAPI document
 * @throws ProcessorError if validation fails
 */
function validateDocument(document: OpenAPIV3_1.Document): void {
  if (!document.openapi || !document.info) {
    throw new ProcessorError(
      'Processed document is missing required OpenAPI fields (openapi, info)',
      'validation',
    );
  }
}

// ============================================================================
// Main Processor Function
// ============================================================================

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
 * @remarks
 * When input is empty, undefined, or an empty object, a minimal valid OpenAPI 3.1
 * document is returned instead of throwing an error. This allows graceful handling
 * of missing or placeholder specifications.
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

  // Execute pipeline: bundle -> upgrade -> dereference -> validate
  const bundled = await bundleDocument(input);
  const upgraded = upgradeDocument(bundled);
  const dereferenced = await dereferenceDocument(upgraded);

  validateDocument(dereferenced);

  return dereferenced;
}
