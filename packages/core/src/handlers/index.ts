/**
 * Handlers Module
 *
 * What: Custom handler execution with context injection
 * How: Provides req, res, store, faker, logger to handlers
 * Why: Enables custom business logic for endpoints
 *
 * @module handlers
 */

export type {
  HandlerContext,
  HandlerFn,
  HandlerRequest,
  HandlerResponseMeta,
  HandlerReturn,
  HandlerReturnRaw,
  HandlerReturnWithHeaders,
  HandlerReturnWithStatus,
  Logger,
} from './context.js';
export { defineHandlers, type HandlerDefinition } from './define-handlers.js';
export {
  ExecutorError,
  executeHandler,
  type HandlerResponse,
  normalizeResponse,
} from './executor.js';
