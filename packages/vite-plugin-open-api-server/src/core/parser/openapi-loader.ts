/**
 * OpenAPI Loader Module
 *
 * This module provides functionality to load, parse, validate, and cache OpenAPI
 * specifications from the file system. It supports both YAML and JSON formats
 * and uses @scalar/openapi-parser for validation and $ref dereferencing.
 *
 * @module core/parser/openapi-loader
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import { dereference, validate } from '@scalar/openapi-parser';
import { parse as parseYaml } from 'yaml';

import { normalizeSecuritySchemes } from './security-normalizer';
import type { OpenApiDocument } from './types';

/**
 * Custom error class for file not found errors during OpenAPI spec loading.
 * Provides detailed context about the attempted file path and resolution.
 */
export class OpenApiFileNotFoundError extends Error {
  /** The absolute path that was attempted */
  public readonly absolutePath: string;
  /** The original path provided by the user */
  public readonly originalPath: string;
  /** The working directory at the time of resolution */
  public readonly workingDirectory: string;

  constructor(originalPath: string, absolutePath: string, workingDirectory: string) {
    super(
      `[OpenAPI Parser] OpenAPI spec not found at: ${absolutePath}\n` +
        `  Resolved from: ${originalPath}\n` +
        `  Current working directory: ${workingDirectory}`,
    );
    this.name = 'OpenApiFileNotFoundError';
    this.absolutePath = absolutePath;
    this.originalPath = originalPath;
    this.workingDirectory = workingDirectory;
  }
}

/**
 * Custom error class for YAML/JSON parse errors.
 * Includes line number and context when available.
 */
export class OpenApiParseError extends Error {
  /** The file path that failed to parse */
  public readonly filePath: string;
  /** The line number where the error occurred (if available) */
  public readonly lineNumber?: number;
  /** The original parse error */
  public readonly originalError: Error;

  constructor(filePath: string, originalError: Error, lineNumber?: number) {
    const lineInfo = lineNumber ? ` at line ${lineNumber}` : '';
    super(
      `[OpenAPI Parser] Failed to parse file: ${filePath}${lineInfo}\n` +
        `  ${originalError.message}`,
    );
    this.name = 'OpenApiParseError';
    this.filePath = filePath;
    this.lineNumber = lineNumber;
    this.originalError = originalError;
  }
}

/**
 * Custom error class for OpenAPI schema validation errors.
 * Contains detailed validation error messages with paths.
 */
export class OpenApiValidationError extends Error {
  /** The file path that failed validation */
  public readonly filePath: string;
  /** Array of validation error details */
  public readonly validationErrors: Array<{ path?: string; message: string }>;

  constructor(filePath: string, errors: Array<{ path?: string; message: string }>) {
    const errorList = errors
      .map((e) => `  - ${e.path ? `${e.path}: ` : ''}${e.message}`)
      .join('\n');
    super(
      `[OpenAPI Parser] Invalid OpenAPI specification: ${filePath}\n` + `Errors:\n${errorList}`,
    );
    this.name = 'OpenApiValidationError';
    this.filePath = filePath;
    this.validationErrors = errors;
  }
}

/**
 * Cache entry storing a parsed spec and its file modification time.
 */
interface CacheEntry {
  /** The parsed and dereferenced OpenAPI document */
  spec: OpenApiDocument;
  /** File modification time in milliseconds */
  mtime: number;
}

/**
 * In-memory cache for parsed OpenAPI specifications.
 * Keyed by absolute file path.
 */
const specCache = new Map<string, CacheEntry>();

/**
 * Clears the OpenAPI spec cache.
 * Useful for testing or when forcing a reload.
 */
export function clearCache(): void {
  specCache.clear();
}

/**
 * Gets the current cache size.
 * Useful for debugging and monitoring.
 *
 * @returns The number of cached specifications
 */
export function getCacheSize(): number {
  return specCache.size;
}

/**
 * Detects if a file is YAML format based on its extension.
 *
 * @param filePath - The file path to check
 * @returns True if the file has a YAML extension (.yaml or .yml)
 */
function isYamlFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.yaml' || ext === '.yml';
}

/**
 * Detects if a file is JSON format based on its extension.
 *
 * @param filePath - The file path to check
 * @returns True if the file has a JSON extension (.json)
 */
function isJsonFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.json';
}

/**
 * Checks if a cached spec is still valid based on file modification time.
 *
 * @param absolutePath - The absolute path to the spec file
 * @returns The cached spec if valid, null otherwise
 */
async function getCachedSpec(absolutePath: string): Promise<OpenApiDocument | null> {
  const cached = specCache.get(absolutePath);
  if (!cached) {
    return null;
  }

  try {
    const stats = await fs.stat(absolutePath);
    if (stats.mtimeMs === cached.mtime) {
      return cached.spec;
    }
  } catch {
    // File may have been deleted, invalidate cache
  }

  return null;
}

/**
 * Reads file contents from disk with proper error handling.
 *
 * @param absolutePath - The absolute path to read
 * @param originalPath - The original path provided by the user (for error messages)
 * @param workingDirectory - The working directory (for error messages)
 * @returns The file contents as a string
 * @throws {OpenApiFileNotFoundError} When the file cannot be found
 */
async function readSpecFile(
  absolutePath: string,
  originalPath: string,
  workingDirectory: string,
): Promise<string> {
  try {
    return await fs.readFile(absolutePath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new OpenApiFileNotFoundError(originalPath, absolutePath, workingDirectory);
    }
    throw error;
  }
}

/**
 * Parses file contents as YAML or JSON based on file extension.
 *
 * @param contents - The file contents to parse
 * @param absolutePath - The absolute path (used for format detection and error messages)
 * @returns The parsed object
 * @throws {OpenApiParseError} When parsing fails
 */
function parseSpecContents(contents: string, absolutePath: string): Record<string, unknown> {
  try {
    if (isYamlFile(absolutePath)) {
      return parseYaml(contents) as Record<string, unknown>;
    }

    if (isJsonFile(absolutePath)) {
      return JSON.parse(contents) as Record<string, unknown>;
    }

    // Unknown extension - try YAML first (it can parse JSON too), fall back to JSON
    return parseWithFallback(contents);
  } catch (error) {
    const parseError = error as Error & { linePos?: [{ line: number }] };
    const lineNumber = parseError.linePos?.[0]?.line;
    throw new OpenApiParseError(absolutePath, parseError, lineNumber);
  }
}

/**
 * Attempts to parse content as YAML, falling back to JSON on failure.
 *
 * @param contents - The content to parse
 * @returns The parsed object
 */
function parseWithFallback(contents: string): Record<string, unknown> {
  try {
    return parseYaml(contents) as Record<string, unknown>;
  } catch {
    return JSON.parse(contents) as Record<string, unknown>;
  }
}

/**
 * Validates an OpenAPI spec object using @scalar/openapi-parser.
 *
 * @param parsedObject - The parsed spec object to validate
 * @param absolutePath - The file path (for error messages)
 * @throws {OpenApiValidationError} When validation fails
 */
async function validateSpec(
  parsedObject: Record<string, unknown>,
  absolutePath: string,
): Promise<void> {
  const validationResult = await validate(parsedObject);

  if (!validationResult.valid) {
    const errors = (validationResult.errors || []).map((e) => ({
      path: typeof e === 'object' && e !== null && 'path' in e ? String(e.path) : undefined,
      message:
        typeof e === 'object' && e !== null && 'message' in e ? String(e.message) : String(e),
    }));
    throw new OpenApiValidationError(absolutePath, errors);
  }
}

/**
 * Dereferences all $ref pointers in the spec and returns the result.
 *
 * @param parsedObject - The parsed spec object to dereference
 * @returns The dereferenced OpenAPI document
 */
async function dereferenceSpec(parsedObject: Record<string, unknown>): Promise<OpenApiDocument> {
  const dereferenceResult = await dereference(parsedObject);
  return dereferenceResult.schema as OpenApiDocument;
}

/**
 * Caches a parsed spec with its file modification time.
 *
 * @param absolutePath - The absolute path to the spec file
 * @param spec - The parsed OpenAPI document to cache
 */
async function cacheSpec(absolutePath: string, spec: OpenApiDocument): Promise<void> {
  try {
    const stats = await fs.stat(absolutePath);
    specCache.set(absolutePath, {
      spec,
      mtime: stats.mtimeMs,
    });
  } catch {
    // If we can't stat the file for caching, that's fine
    // The spec is still valid
  }
}

/**
 * Loads, parses, validates, and dereferences an OpenAPI specification from the file system.
 *
 * This function:
 * 1. Resolves the provided path to an absolute path
 * 2. Checks the cache for a valid cached version (based on file mtime)
 * 3. Reads the file contents
 * 4. Detects format (YAML or JSON) and parses accordingly
 * 5. Validates the spec against the OpenAPI schema
 * 6. Dereferences all $ref references
 * 7. Normalizes security schemes (auto-generates missing definitions)
 * 8. Caches the result for future calls
 *
 * @param openApiPath - Path to the OpenAPI specification file (relative or absolute)
 * @returns A promise that resolves to the parsed and dereferenced OpenAPI document
 *
 * @throws {OpenApiFileNotFoundError} When the spec file cannot be found
 * @throws {OpenApiParseError} When the file cannot be parsed as YAML or JSON
 * @throws {OpenApiValidationError} When the spec fails OpenAPI schema validation
 *
 * @example
 * ```typescript
 * import { loadOpenApiSpec } from './core/parser';
 *
 * const spec = await loadOpenApiSpec('./api/openapi.yaml');
 * console.log(`Loaded: ${spec.info.title} v${spec.info.version}`);
 * console.log(`Endpoints: ${Object.keys(spec.paths).length}`);
 * ```
 */
export async function loadOpenApiSpec(openApiPath: string): Promise<OpenApiDocument> {
  const workingDirectory = process.cwd();
  const absolutePath = path.resolve(workingDirectory, openApiPath);

  // Check cache first
  const cachedSpec = await getCachedSpec(absolutePath);
  if (cachedSpec) {
    return cachedSpec;
  }

  // Read and parse file
  const contents = await readSpecFile(absolutePath, openApiPath, workingDirectory);
  const parsedObject = parseSpecContents(contents, absolutePath);

  // Validate and dereference
  await validateSpec(parsedObject, absolutePath);
  const dereferencedSpec = await dereferenceSpec(parsedObject);

  // Normalize security schemes (auto-generate missing definitions)
  const spec = normalizeSecuritySchemes(dereferencedSpec);

  // Cache the result
  await cacheSpec(absolutePath, spec);

  return spec;
}
