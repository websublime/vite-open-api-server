/**
 * Handler Executor
 *
 * What: Executes handler functions with error handling
 * How: Wraps handler calls, normalizes responses
 * Why: Provides consistent response format from handlers
 */

// TODO: Will be implemented in Task 2.1: Handler System

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
 * Execute a handler function with error handling
 *
 * @param handler - Handler function to execute
 * @param context - Handler context
 * @returns Normalized response
 * @throws ExecutorError if handler execution fails
 */
export async function executeHandler(
  _handler: HandlerFn,
  _context: HandlerContext,
): Promise<HandlerResponse> {
  // TODO: Implement in Task 2.1
  throw new ExecutorError('Not implemented yet - see Task 2.1');
}

/**
 * Normalize handler return value to standard response format
 *
 * @param result - Handler return value
 * @returns Normalized response
 * @throws ExecutorError if normalization fails due to invalid return type
 */
export function normalizeResponse(result: HandlerReturn): HandlerResponse {
  // TODO: Implement in Task 2.1
  // Will use result.type discriminant to narrow the type
  if (!result || typeof result !== 'object' || !('type' in result)) {
    throw new ExecutorError('Invalid handler return: missing type discriminant');
  }

  throw new ExecutorError('Not implemented yet - see Task 2.1');
}
