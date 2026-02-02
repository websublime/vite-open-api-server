/**
 * Handler Context
 *
 * What: Type definitions for handler execution context
 * How: Interfaces for request, response, and utilities
 * Why: Provides type-safe handler development
 *
 * @remarks
 * ## Design Decision: Discriminated Union for HandlerReturn
 *
 * The PRD (Section 3.5 FR-005) shows handlers returning simpler shapes:
 * - Direct data (e.g., `return pet;`)
 * - `{ status: number; data: any }`
 * - `{ status: number; data: any; headers: Record<string, string> }`
 *
 * This implementation uses a discriminated union with explicit `type` field instead:
 * - `{ type: 'raw', data: unknown }`
 * - `{ type: 'status', status: number, data: unknown }`
 * - `{ type: 'full', status: number, data: unknown, headers: Record<string, string> }`
 *
 * **Rationale:**
 * 1. **Type Safety**: Discriminated unions enable TypeScript to narrow types correctly
 * 2. **Unambiguous Parsing**: No need to guess intent from object shape
 * 3. **Exhaustiveness Checking**: Compiler ensures all cases are handled
 * 4. **Future Extensibility**: New return types can be added without breaking changes
 *
 * The trade-off is slightly more verbose syntax, but the benefits for maintainability
 * and type safety outweigh the additional characters.
 */

import type { Faker } from '@faker-js/faker';

import type { Store } from '../store/index.js';

/**
 * Logger interface for handler context
 * Allows injection of custom or test loggers
 *
 * @remarks
 * The `debug` and `info` methods are optional to support minimal loggers
 * that only implement core logging (log, warn, error). Code using Logger
 * should use optional chaining when calling these methods (e.g., `logger.debug?.(...)`).
 */
export interface Logger {
  log(...args: unknown[]): void;
  info?(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  debug?(...args: unknown[]): void;
}

/**
 * Request object available in handler context
 */
export interface HandlerRequest {
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  body: unknown;
  headers: Record<string, string>;
}

/**
 * Response object available in handler context
 */
export interface HandlerResponseMeta {
  status: number;
  headers: Record<string, string>;
}

/**
 * Full context provided to handlers
 */
export interface HandlerContext {
  req: HandlerRequest;
  res: HandlerResponseMeta;
  store: Store;
  faker: Faker;
  logger: Logger;
}

/**
 * Raw data return from handler (status 200)
 */
export interface HandlerReturnRaw {
  type: 'raw';
  data: unknown;
}

/**
 * Response with custom status
 */
export interface HandlerReturnWithStatus {
  type: 'status';
  status: number;
  data: unknown;
}

/**
 * Response with custom status and headers
 */
export interface HandlerReturnWithHeaders {
  type: 'full';
  status: number;
  data: unknown;
  headers: Record<string, string>;
}

/**
 * Possible return types from handlers (discriminated union)
 * Use the 'type' field to narrow the return type:
 * - 'raw': Direct data (status 200)
 * - 'status': Data with custom status code
 * - 'full': Data with custom status and headers
 */
export type HandlerReturn = HandlerReturnRaw | HandlerReturnWithStatus | HandlerReturnWithHeaders;

/**
 * Handler function signature
 */
export type HandlerFn = (context: HandlerContext) => HandlerReturn | Promise<HandlerReturn>;
