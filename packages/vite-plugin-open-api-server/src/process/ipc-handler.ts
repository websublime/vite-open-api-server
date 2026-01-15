/**
 * IPC Message Handler Module
 *
 * ## What
 * This module implements structured IPC message handling between the parent
 * (Vite plugin) and child (mock server) processes. It provides type-safe
 * message dispatch using discriminated union types.
 *
 * ## How
 * Messages are validated for structure, then dispatched to appropriate handlers
 * based on the `type` discriminator field. Each message type has a dedicated
 * handler function that processes the message and updates plugin state.
 *
 * ## Why
 * A well-defined IPC handler ensures:
 * - Type safety with exhaustive switch statements
 * - Message validation to prevent crashes from malformed messages
 * - Centralized message handling logic
 * - Clear separation of concerns for each message type
 *
 * @module process/ipc-handler
 */

import type { ChildProcess } from 'node:child_process';
import type { Logger } from 'vite';
import { GREEN, RED, RESET, YELLOW } from '../logging/index.js';
import type {
  ErrorMessage,
  LogMessage,
  OpenApiServerMessage,
  ReadyMessage,
  ReloadedMessage,
  ResponseMessage,
  ShutdownMessage,
} from '../types/ipc-messages.js';

/**
 * Callback function types for IPC message handlers.
 */
export interface IpcHandlerCallbacks {
  /**
   * Called when the mock server is ready to receive requests.
   * @param message - The ready message with port and endpoint count
   */
  onReady?: (message: ReadyMessage) => void;

  /**
   * Called when the mock server encounters an error.
   * @param message - The error message with details and stack trace
   */
  onError?: (message: ErrorMessage) => void;

  /**
   * Called when the mock server initiates shutdown.
   */
  onShutdown?: () => void;
}

/**
 * Options for configuring the IPC handler.
 */
export interface IpcHandlerOptions {
  /**
   * Vite logger for output.
   */
  logger: Logger;

  /**
   * Plugin name for log prefixing.
   */
  pluginName: string;

  /**
   * Whether verbose logging is enabled.
   */
  verbose: boolean;

  /**
   * Optional callbacks for message handling.
   */
  callbacks?: IpcHandlerCallbacks;
}

/**
 * Internal context passed to individual message handlers.
 * @internal
 */
interface HandlerContext {
  logger: Logger;
  prefix: string;
  verbose: boolean;
  callbacks?: IpcHandlerCallbacks;
}

/**
 * Log prefix for IPC handler messages.
 * @internal
 */
const LOG_PREFIX = '[ipc]';

/**
 * Applies color to a log message based on its level.
 * @internal
 */
function colorizeLogMessage(message: string, level: LogMessage['level']): string {
  const colorMap: Record<LogMessage['level'], string> = {
    info: GREEN,
    warn: YELLOW,
    error: RED,
    debug: '',
  };
  const color = colorMap[level] || '';
  return color ? `${color}${message}${RESET}` : message;
}

/**
 * Validates that a value is a valid IPC message.
 * @internal
 */
function isValidIpcMessage(message: unknown): message is { type: string } {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    typeof (message as Record<string, unknown>).type === 'string'
  );
}

/**
 * Handles 'ready' messages from the child process.
 * @internal
 */
function handleReadyMessage(message: ReadyMessage, ctx: HandlerContext): void {
  if (ctx.verbose) {
    ctx.logger.info(
      `${ctx.prefix} ${LOG_PREFIX} Mock server ready on port ${message.port} with ${message.endpointCount} endpoints`,
    );
  }
  ctx.callbacks?.onReady?.(message);
}

/**
 * Handles 'error' messages from the child process.
 * @internal
 */
function handleErrorMessage(message: ErrorMessage, ctx: HandlerContext): void {
  ctx.logger.error(`${ctx.prefix} ${LOG_PREFIX} Mock server error: ${message.message}`);
  if (message.stack) {
    ctx.logger.error(message.stack);
  }
  ctx.callbacks?.onError?.(message);
}

/**
 * Handles 'log' messages from the child process.
 * @internal
 */
function handleLogMessage(message: LogMessage, ctx: HandlerContext): void {
  // Filter debug logs unless verbose mode is enabled
  if (!ctx.verbose && message.level === 'debug') {
    return;
  }

  const colorizedMessage = colorizeLogMessage(message.message, message.level);

  if (message.level === 'error') {
    ctx.logger.error(`${ctx.prefix} ${colorizedMessage}`);
  } else if (message.level === 'warn') {
    ctx.logger.warn(`${ctx.prefix} ${colorizedMessage}`);
  } else {
    ctx.logger.info(`${ctx.prefix} ${colorizedMessage}`);
  }
}

/**
 * Handles 'shutdown' messages from the child process.
 * @internal
 */
function handleShutdownMessage(_message: ShutdownMessage, ctx: HandlerContext): void {
  ctx.logger.info(`${ctx.prefix} ${LOG_PREFIX} Mock server initiated shutdown`);
  ctx.callbacks?.onShutdown?.();
}

/**
 * Handles 'reloaded' messages from the child process.
 * @internal
 */
function handleReloadedMessage(message: ReloadedMessage, ctx: HandlerContext): void {
  if (message.success) {
    ctx.logger.info(`${ctx.prefix} ${LOG_PREFIX} Reloaded ${message.count} ${message.target}(s)`);
  } else {
    ctx.logger.error(
      `${ctx.prefix} ${LOG_PREFIX} Failed to reload ${message.target}: ${message.error}`,
    );
  }
}

/**
 * Handles 'response' messages from the child process.
 * @internal
 */
function handleResponseMessage(message: ResponseMessage, ctx: HandlerContext): void {
  // Response messages are handled by the request coordinator (Phase 5)
  // For now, just log in verbose mode
  if (ctx.verbose) {
    ctx.logger.info(
      `${ctx.prefix} ${LOG_PREFIX} Received response for request ${message.id}: ${message.status}`,
    );
  }
}

/**
 * Handles unexpected parent-to-child messages received by parent.
 * @internal
 */
function handleUnexpectedMessage(type: string, ctx: HandlerContext): void {
  ctx.logger.warn(
    `${ctx.prefix} ${LOG_PREFIX} Received unexpected message type from child: ${type}`,
  );
}

/**
 * Handles unknown message types.
 * @internal
 */
function handleUnknownMessage(type: string, ctx: HandlerContext): void {
  ctx.logger.warn(`${ctx.prefix} ${LOG_PREFIX} Unknown IPC message type: ${type}`);
}

/**
 * Dispatches an IPC message to the appropriate handler.
 * @internal
 */
function dispatchMessage(ipcMessage: OpenApiServerMessage, ctx: HandlerContext): void {
  switch (ipcMessage.type) {
    case 'ready':
      handleReadyMessage(ipcMessage, ctx);
      break;
    case 'error':
      handleErrorMessage(ipcMessage, ctx);
      break;
    case 'log':
      handleLogMessage(ipcMessage, ctx);
      break;
    case 'shutdown':
      handleShutdownMessage(ipcMessage, ctx);
      break;
    case 'reloaded':
      handleReloadedMessage(ipcMessage, ctx);
      break;
    case 'response':
      handleResponseMessage(ipcMessage, ctx);
      break;
    case 'request':
    case 'reload':
      handleUnexpectedMessage(ipcMessage.type, ctx);
      break;
    default:
      handleUnknownMessage((ipcMessage as { type: string }).type, ctx);
      break;
  }
}

/**
 * Creates an IPC message handler function for a child process.
 *
 * The returned handler validates incoming messages and dispatches them
 * to the appropriate handler based on the message type. Unknown message
 * types are logged as warnings.
 *
 * @param options - Configuration options for the handler
 * @returns A message handler function to attach to child process
 *
 * @example
 * ```typescript
 * const handler = createIpcHandler({
 *   logger,
 *   pluginName: 'vite-plugin-open-api-server',
 *   verbose: true,
 *   callbacks: {
 *     onReady: (msg) => console.log(`Ready on port ${msg.port}`),
 *     onError: (msg) => console.error(msg.message),
 *   },
 * });
 *
 * childProcess.on('message', handler);
 * ```
 */
export function createIpcHandler(options: IpcHandlerOptions): (message: unknown) => void {
  const { logger, pluginName, verbose, callbacks } = options;
  const prefix = `[${pluginName}]`;

  const ctx: HandlerContext = {
    logger,
    prefix,
    verbose,
    callbacks,
  };

  return (message: unknown): void => {
    // Validate message structure
    if (!isValidIpcMessage(message)) {
      logger.warn(`${prefix} ${LOG_PREFIX} Received invalid IPC message`);
      if (verbose) {
        logger.warn(`${prefix} ${LOG_PREFIX} Message: ${JSON.stringify(message)}`);
      }
      return;
    }

    try {
      dispatchMessage(message as OpenApiServerMessage, ctx);
    } catch (error) {
      const err = error as Error;
      logger.error(`${prefix} ${LOG_PREFIX} Error handling IPC message: ${err.message}`);
      if (verbose && err.stack) {
        logger.error(err.stack);
      }
    }
  };
}

/**
 * Attaches an IPC message handler to a child process.
 *
 * This is a convenience function that creates an IPC handler and
 * attaches it to the child process's 'message' event.
 *
 * @param child - The child process to attach the handler to
 * @param options - Configuration options for the handler
 * @returns A cleanup function to remove the handler
 *
 * @example
 * ```typescript
 * const cleanup = attachIpcHandler(childProcess, {
 *   logger,
 *   pluginName: 'vite-plugin-open-api-server',
 *   verbose: true,
 *   callbacks: {
 *     onReady: (msg) => {
 *       mockServerPort = msg.port;
 *       isReady = true;
 *     },
 *   },
 * });
 *
 * // Later, to remove the handler:
 * cleanup();
 * ```
 */
export function attachIpcHandler(child: ChildProcess, options: IpcHandlerOptions): () => void {
  const handler = createIpcHandler(options);

  child.on('message', handler);

  // Return cleanup function
  return () => {
    child.off('message', handler);
  };
}
