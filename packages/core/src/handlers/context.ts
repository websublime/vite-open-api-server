/**
 * Handler Context
 *
 * What: Type definitions for handler execution context
 * How: Interfaces for request, response, and utilities
 * Why: Provides type-safe handler development
 */

// TODO: Will be implemented in Task 2.1: Handler System

import type { Faker } from '@faker-js/faker';

import type { Store } from '../store/index.js';

/**
 * Logger interface for handler context
 * Allows injection of custom or test loggers
 */
export interface Logger {
  log(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  debug(...args: unknown[]): void;
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
  type: 'response';
  status: number;
  data: unknown;
}

/**
 * Response with custom status and headers
 */
export interface HandlerReturnWithHeaders {
  type: 'response';
  status: number;
  data: unknown;
  headers: Record<string, string>;
}

/**
 * Possible return types from handlers (discriminated union)
 * Use the 'type' field to narrow the return type
 */
export type HandlerReturn = HandlerReturnRaw | HandlerReturnWithStatus | HandlerReturnWithHeaders;

/**
 * Handler function signature
 */
export type HandlerFn = (context: HandlerContext) => HandlerReturn | Promise<HandlerReturn>;
