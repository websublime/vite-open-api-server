/**
 * OpenAPI Document Processor
 *
 * What: Processes OpenAPI documents through bundle → upgrade → dereference pipeline
 * How: Uses @scalar packages for each transformation step
 * Why: Ensures all documents are normalized to OpenAPI 3.1 with no external references
 */

// TODO: Will be implemented in Task 1.2: OpenAPI Processor

/**
 * Options for processing OpenAPI documents
 */
export interface ProcessorOptions {
  /** Base directory for relative file resolution */
  basePath?: string;
}

/**
 * Error thrown during OpenAPI document processing
 */
export class ProcessorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProcessorError';

    // Capture V8 stack trace excluding constructor frame
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, ProcessorError);
    }
  }
}

// Flag to ensure we only warn once about stub implementation
let _processWarned = false;

/**
 * Process an OpenAPI document through the full pipeline:
 * 1. Bundle - resolve external $ref references
 * 2. Upgrade - convert to OpenAPI 3.1
 * 3. Dereference - inline all $ref pointers
 *
 * @param input - OpenAPI document as file path, URL, or object
 * @param options - Processing options
 * @returns Fully dereferenced OpenAPI 3.1 document
 * @throws ProcessorError if processing fails
 *
 * @remarks
 * This is a stub implementation that returns the input as-is or an empty object.
 * Full implementation coming in Task 1.2.
 */
export async function processOpenApiDocument(
  input: string | Record<string, unknown>,
  _options?: ProcessorOptions,
): Promise<Record<string, unknown>> {
  // Log warning once about stub implementation
  if (!_processWarned) {
    // biome-ignore lint/suspicious/noConsole: Intentional warning for stub implementation
    console.warn(
      '[vite-open-api-core] processOpenApiDocument is not yet implemented (Task 1.2). Returning input as-is.',
    );
    _processWarned = true;
  }

  // Return input as-is if it's an object, otherwise return empty placeholder
  if (typeof input === 'object' && input !== null) {
    return input;
  }

  // For string inputs (file path/URL), return minimal OpenAPI stub
  return {
    openapi: '3.1.0',
    info: { title: 'Stub', version: '0.0.0' },
    paths: {},
    _stub: true,
    _source: input,
  };
}
