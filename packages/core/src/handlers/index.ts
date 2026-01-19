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
} from './context.js';
// TODO: Will be implemented in Task 2.1
export { executeHandler, type HandlerResponse } from './executor.js';
