/**
 * IPC Message Type Definitions
 *
 * ## What
 * This module defines the IPC (Inter-Process Communication) message protocol
 * for communication between the parent Vite process and the child mock server
 * process.
 *
 * ## How
 * Messages are JSON-serializable objects with a `type` discriminator field.
 * The parent process sends commands (request, shutdown) and the child process
 * sends events (ready, error, response, log). Each message type has a unique
 * type literal for exhaustive switch statements and type narrowing.
 *
 * ## Why
 * A well-defined IPC protocol enables type-safe communication between processes.
 * By using discriminated unions, TypeScript can narrow message types in switch
 * statements, ensuring all message types are handled correctly.
 *
 * @module
 * @internal
 */

/**
 * Child → Parent: Mock server is ready and listening.
 *
 * Sent once the mock server has successfully started and is ready
 * to accept requests. The parent process should wait for this message
 * before proxying requests to the mock server.
 *
 * @example
 * ```typescript
 * const readyMessage: ReadyMessage = {
 *   type: 'ready',
 *   port: 3001,
 *   endpointCount: 42,
 * };
 * ```
 */
export interface ReadyMessage {
  /**
   * Discriminator for ready messages.
   */
  type: 'ready';

  /**
   * Port the mock server is listening on.
   *
   * May differ from the configured port if the original was unavailable.
   */
  port: number;

  /**
   * Number of endpoints discovered from the OpenAPI spec.
   */
  endpointCount: number;
}

/**
 * Child → Parent: Fatal error during startup or runtime.
 *
 * Sent when the mock server encounters an unrecoverable error.
 * The parent process should handle this by logging the error
 * and potentially attempting to restart the child process.
 *
 * @example
 * ```typescript
 * const errorMessage: ErrorMessage = {
 *   type: 'error',
 *   message: 'Failed to parse OpenAPI spec',
 *   stack: 'Error: Failed to parse OpenAPI spec\n    at parseSpec (/app/parser.js:42:10)',
 * };
 * ```
 */
export interface ErrorMessage {
  /**
   * Discriminator for error messages.
   */
  type: 'error';

  /**
   * Error message describing what went wrong.
   */
  message: string;

  /**
   * Optional stack trace for debugging.
   */
  stack?: string;

  /**
   * Optional error code for programmatic handling.
   */
  code?: string;
}

/**
 * Parent → Child: Forward HTTP request to mock server.
 *
 * Sent by the parent process to forward an incoming HTTP request
 * to the mock server child process. The child process should
 * respond with a corresponding ResponseMessage.
 *
 * @example
 * ```typescript
 * const requestMessage: RequestMessage = {
 *   type: 'request',
 *   id: 'req-12345',
 *   method: 'GET',
 *   path: '/pets/123',
 *   headers: { 'authorization': 'Bearer token123' },
 * };
 * ```
 */
export interface RequestMessage {
  /**
   * Discriminator for request messages.
   */
  type: 'request';

  /**
   * Correlation ID to match request with response.
   *
   * The child process must include this ID in the corresponding
   * ResponseMessage to allow the parent to route the response
   * to the correct pending request.
   */
  id: string;

  /**
   * HTTP method of the request (uppercase).
   *
   * @example 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'
   */
  method: string;

  /**
   * Request path without query string.
   *
   * @example '/pets/123', '/users/456/orders'
   */
  path: string;

  /**
   * Request headers.
   *
   * Header names are lowercase. Values can be strings or arrays
   * for headers with multiple values.
   */
  headers: Record<string, string | string[]>;

  /**
   * Query string parameters.
   */
  query?: Record<string, string | string[]>;

  /**
   * Request body (for POST, PUT, PATCH requests).
   *
   * Already parsed from JSON if Content-Type was application/json.
   */
  body?: unknown;
}

/**
 * Child → Parent: HTTP response from mock server.
 *
 * Sent by the child process in response to a RequestMessage.
 * Contains the full HTTP response including status, headers, and body.
 *
 * @example
 * ```typescript
 * const responseMessage: ResponseMessage = {
 *   type: 'response',
 *   id: 'req-12345',
 *   status: 200,
 *   headers: { 'content-type': 'application/json' },
 *   body: { id: 123, name: 'Fluffy', status: 'available' },
 * };
 * ```
 */
export interface ResponseMessage {
  /**
   * Discriminator for response messages.
   */
  type: 'response';

  /**
   * Correlation ID matching the original request.
   *
   * Must match the `id` field from the corresponding RequestMessage.
   */
  id: string;

  /**
   * HTTP status code.
   *
   * @example 200, 201, 400, 401, 404, 500
   */
  status: number;

  /**
   * Response headers.
   *
   * Header names are lowercase.
   */
  headers: Record<string, string>;

  /**
   * Response body.
   *
   * Will be JSON-serialized if it's an object.
   */
  body: unknown;
}

/**
 * Parent → Child: Graceful shutdown request.
 *
 * Sent by the parent process to request the child process to
 * shut down gracefully. The child should finish any pending
 * requests and then exit.
 *
 * @example
 * ```typescript
 * const shutdownMessage: ShutdownMessage = {
 *   type: 'shutdown',
 * };
 * ```
 */
export interface ShutdownMessage {
  /**
   * Discriminator for shutdown messages.
   */
  type: 'shutdown';

  /**
   * Optional timeout in milliseconds for graceful shutdown.
   *
   * If the child doesn't shut down within this time, the parent
   * may force-kill the process.
   */
  timeout?: number;
}

/**
 * Child → Parent: Log message for verbose mode.
 *
 * Sent by the child process to forward log messages to the parent
 * for display in Vite's console output. Only sent when verbose
 * mode is enabled.
 *
 * @example
 * ```typescript
 * const logMessage: LogMessage = {
 *   type: 'log',
 *   level: 'info',
 *   message: 'Handling GET /pets/123',
 *   timestamp: Date.now(),
 * };
 * ```
 */
export interface LogMessage {
  /**
   * Discriminator for log messages.
   */
  type: 'log';

  /**
   * Log level for proper formatting.
   */
  level: 'info' | 'warn' | 'error' | 'debug';

  /**
   * Log message content.
   */
  message: string;

  /**
   * Timestamp when the log was created (Unix milliseconds).
   */
  timestamp: number;

  /**
   * Optional structured data to include with the log.
   */
  data?: Record<string, unknown>;
}

/**
 * Parent → Child: Reload handlers or seeds.
 *
 * Sent when handler or seed files are modified and need to be
 * reloaded by the mock server without a full restart.
 *
 * @example
 * ```typescript
 * const reloadMessage: ReloadMessage = {
 *   type: 'reload',
 *   target: 'handlers',
 *   paths: ['./handlers/get.getPetById.mjs'],
 * };
 * ```
 */
export interface ReloadMessage {
  /**
   * Discriminator for reload messages.
   */
  type: 'reload';

  /**
   * What to reload.
   */
  target: 'handlers' | 'seeds' | 'spec';

  /**
   * Specific paths that changed (optional).
   *
   * If not provided, reload all items of the target type.
   */
  paths?: string[];
}

/**
 * Child → Parent: Reload completed acknowledgment.
 *
 * Sent after the child process has completed reloading handlers
 * or seeds in response to a ReloadMessage.
 *
 * @example
 * ```typescript
 * const reloadedMessage: ReloadedMessage = {
 *   type: 'reloaded',
 *   target: 'handlers',
 *   success: true,
 *   count: 5,
 * };
 * ```
 */
export interface ReloadedMessage {
  /**
   * Discriminator for reloaded messages.
   */
  type: 'reloaded';

  /**
   * What was reloaded.
   */
  target: 'handlers' | 'seeds' | 'spec';

  /**
   * Whether the reload was successful.
   */
  success: boolean;

  /**
   * Number of items reloaded.
   */
  count: number;

  /**
   * Error message if reload failed.
   */
  error?: string;
}

/**
 * Discriminated union of all IPC message types.
 *
 * Use the `type` field as a discriminator for exhaustive switch
 * statements and type narrowing.
 *
 * @example
 * ```typescript
 * function handleMessage(message: OpenApiServerMessage) {
 *   switch (message.type) {
 *     case 'ready':
 *       console.log(`Server ready on port ${message.port}`);
 *       break;
 *     case 'error':
 *       console.error(`Server error: ${message.message}`);
 *       break;
 *     case 'request':
 *       handleRequest(message);
 *       break;
 *     case 'response':
 *       handleResponse(message);
 *       break;
 *     case 'shutdown':
 *       process.exit(0);
 *       break;
 *     case 'log':
 *       console.log(`[${message.level}] ${message.message}`);
 *       break;
 *     case 'reload':
 *       reloadTarget(message.target);
 *       break;
 *     case 'reloaded':
 *       console.log(`Reloaded ${message.count} ${message.target}`);
 *       break;
 *   }
 * }
 * ```
 */
export type OpenApiServerMessage =
  | ReadyMessage
  | ErrorMessage
  | RequestMessage
  | ResponseMessage
  | ShutdownMessage
  | LogMessage
  | ReloadMessage
  | ReloadedMessage;

/**
 * Messages that can be sent from parent to child process.
 */
export type ParentToChildMessage = RequestMessage | ShutdownMessage | ReloadMessage;

/**
 * Messages that can be sent from child to parent process.
 */
export type ChildToParentMessage =
  | ReadyMessage
  | ErrorMessage
  | ResponseMessage
  | LogMessage
  | ReloadedMessage;

/**
 * Validates that a value is a valid IPC message structure.
 *
 * Checks that the value is:
 * - An object (not null)
 * - Has a 'type' property that is a string
 *
 * This utility is shared across IPC handling modules to avoid duplication.
 *
 * @param message - The value to validate
 * @returns True if the value is a valid IPC message structure
 *
 * @example
 * ```typescript
 * if (isValidIpcMessage(message)) {
 *   // TypeScript now knows message has a 'type' string property
 *   switch (message.type) {
 *     case 'ready': // ...
 *   }
 * }
 * ```
 */
export function isValidIpcMessage(message: unknown): message is { type: string } {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    typeof (message as Record<string, unknown>).type === 'string'
  );
}
