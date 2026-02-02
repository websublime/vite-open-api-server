/**
 * Handler Executor
 *
 * What: Executes handler functions with error handling
 * How: Wraps handler calls, normalizes responses, validates status codes
 * Why: Provides consistent response format from handlers
 *
 * @remarks
 * The ExecutorError class is exported for consumers who want to distinguish
 * handler execution errors from other error types in their error handling logic.
 */

import type { HandlerContext, HandlerFn, HandlerReturn, Logger } from './context.js';

/**
 * Valid HTTP status code range
 */
const MIN_HTTP_STATUS = 100;
const MAX_HTTP_STATUS = 599;

/**
 * Validate if a status code is a valid HTTP status code
 *
 * @param status - Status code to validate
 * @returns true if valid (100-599), false otherwise
 */
function isValidHttpStatus(status: number): boolean {
  return Number.isInteger(status) && status >= MIN_HTTP_STATUS && status <= MAX_HTTP_STATUS;
}

/**
 * Error thrown during handler execution
 * Distinguishable from other errors for proper error handling.
 *
 * This class is exported for consumers who need to:
 * - Catch and handle handler execution errors specifically
 * - Create custom error handling middleware
 * - Distinguish between handler errors and other application errors
 *
 * @example
 * ```typescript
 * try {
 *   await executeHandler(handler, context);
 * } catch (error) {
 *   if (error instanceof ExecutorError) {
 *     // Handle handler-specific errors
 *     console.error('Handler failed:', error.cause);
 *   }
 * }
 * ```
 */
export class ExecutorError extends Error {
  /** Original error that caused this executor error */
  override readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'ExecutorError';
    this.cause = cause;

    // Capture V8 stack trace excluding constructor frame
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, ExecutorError);
    }
  }
}

/**
 * Normalized response from handler execution
 */
export interface HandlerResponse {
  status: number;
  data: unknown;
  headers?: Record<string, string>;
}

/**
 * Options for normalizing responses
 */
export interface NormalizeOptions {
  /** Optional logger for warnings about invalid status codes */
  logger?: Logger;
}

/**
 * Normalize handler return value to standard response format
 *
 * Handles the discriminated union based on the 'type' field:
 * - 'raw': Direct data (status 200)
 * - 'status': Data with custom status code
 * - 'full': Data with custom status and headers
 *
 * @param result - Handler return value
 * @returns Normalized response
 */
export function normalizeResponse(
  result: HandlerReturn,
  options: NormalizeOptions = {},
): HandlerResponse {
  const { logger } = options;

  switch (result.type) {
    case 'raw':
      return {
        status: 200,
        data: result.data,
      };

    case 'status': {
      // Validate status code range
      if (!isValidHttpStatus(result.status)) {
        logger?.warn(
          `[Handler Executor] Invalid HTTP status code: ${result.status}. ` +
            `Valid range is ${MIN_HTTP_STATUS}-${MAX_HTTP_STATUS}. Defaulting to 500.`,
        );
        return {
          status: 500,
          data: result.data,
        };
      }
      return {
        status: result.status,
        data: result.data,
      };
    }

    case 'full': {
      // Validate status code range
      if (!isValidHttpStatus(result.status)) {
        logger?.warn(
          `[Handler Executor] Invalid HTTP status code: ${result.status}. ` +
            `Valid range is ${MIN_HTTP_STATUS}-${MAX_HTTP_STATUS}. Defaulting to 500.`,
        );
        return {
          status: 500,
          data: result.data,
          headers: result.headers,
        };
      }
      return {
        status: result.status,
        data: result.data,
        headers: result.headers,
      };
    }

    default: {
      // TypeScript exhaustiveness check - this should never happen
      // but provides type safety and a runtime fallback
      const exhaustiveCheck: never = result;
      return {
        status: 200,
        data: exhaustiveCheck,
      };
    }
  }
}

/**
 * Execute a handler function with error handling
 *
 * Wraps the handler execution in try/catch and normalizes the response.
 * On error, returns a 500 status with error details.
 *
 * @param handler - Handler function to execute
 * @param context - Handler context with req, res, store, faker, logger
 * @returns Normalized response with status, data, and optional headers
 *
 * @example
 * ```typescript
 * const response = await executeHandler(
 *   (ctx) => ({ type: 'raw', data: { id: 1, name: 'Test' } }),
 *   context
 * );
 * // response = { status: 200, data: { id: 1, name: 'Test' } }
 * ```
 *
 * @example
 * ```typescript
 * const response = await executeHandler(
 *   (ctx) => ({ type: 'status', status: 404, data: { message: 'Not found' } }),
 *   context
 * );
 * // response = { status: 404, data: { message: 'Not found' } }
 * ```
 */
export async function executeHandler(
  handler: HandlerFn,
  context: HandlerContext,
): Promise<HandlerResponse> {
  try {
    const result = await handler(context);
    return normalizeResponse(result, { logger: context.logger });
  } catch (error) {
    // Log the error for debugging
    context.logger.error('[Handler Executor] Handler execution failed:', error);

    // Return a 500 response with error details
    return {
      status: 500,
      data: {
        error: 'Handler execution failed',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
