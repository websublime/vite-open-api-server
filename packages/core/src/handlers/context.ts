/**
 * Handler Context
 *
 * What: Type definitions for handler execution context
 * How: Interfaces for request, response, and utilities
 * Why: Provides type-safe handler development
 */

// TODO: Will be implemented in Task 2.1: Handler System

import type { Store } from '../store/index.js';

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
  faker: unknown; // Faker instance
  logger: Console;
}

/**
 * Possible return types from handlers
 */
export type HandlerReturn =
  | unknown // Direct data (status 200)
  | { status: number; data: unknown } // With custom status
  | { status: number; data: unknown; headers: Record<string, string> }; // With headers

/**
 * Handler function signature
 */
export type HandlerFn = (context: HandlerContext) => HandlerReturn | Promise<HandlerReturn>;
