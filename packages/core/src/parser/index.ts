/**
 * Parser Module
 *
 * What: OpenAPI document processing pipeline
 * How: Bundle external references, upgrade to OAS 3.1, dereference all $refs
 * Why: Provides a consistent, fully resolved OpenAPI document for routing
 *
 * @module parser
 */

// TODO: Will be implemented in Task 1.2
export { ProcessorError, type ProcessorOptions, processOpenApiDocument } from './processor.js';
