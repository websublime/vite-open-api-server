/**
 * Handler Executor
 *
 * What: Executes handler functions with error handling
 * How: Wraps handler calls, normalizes responses
 * Why: Provides consistent response format from handlers
 */

import type { HandlerContext, HandlerFn, HandlerReturn } from './context.js';

/**
 * Error thrown during handler execution
 * Distinguishable from other errors for proper error handling
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
export function normalizeResponse(result: HandlerReturn): HandlerResponse {
  switch (result.type) {
    case 'raw':
      return {
        status: 200,
        data: result.data,
      };

    case 'status':
      return {
        status: result.status,
        data: result.data,
      };

    case 'full':
      return {
        status: result.status,
        data: result.data,
        headers: result.headers,
      };

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
    return normalizeResponse(result);
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
