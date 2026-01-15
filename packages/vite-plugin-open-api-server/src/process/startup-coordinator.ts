/**
 * Startup Coordinator Module
 *
 * ## What
 * This module implements startup coordination that waits for the mock server's
 * 'ready' IPC message with a configurable timeout. Uses Promise-based async/await
 * pattern to block plugin initialization until server is ready or timeout expires.
 *
 * ## How
 * Creates a Promise that:
 * 1. Listens for 'ready' IPC message from child process
 * 2. Sets a timeout timer that rejects if no ready message received
 * 3. Also listens for 'error' IPC message to reject early on failures
 * 4. Cleans up listeners and timers when Promise settles
 *
 * ## Why
 * Blocking startup ensures the mock server is fully operational before
 * Vite continues, preventing race conditions where requests arrive
 * before the mock server is ready to handle them.
 *
 * @module process/startup-coordinator
 */

import type { ChildProcess } from 'node:child_process';
import type { ErrorMessage, OpenApiServerMessage, ReadyMessage } from '../types/ipc-messages.js';

/**
 * Options for the waitForReady function.
 */
export interface WaitForReadyOptions {
  /**
   * Timeout in milliseconds to wait for ready message.
   * @default 5000
   */
  timeout?: number;
}

/**
 * Error thrown when startup times out.
 */
export class StartupTimeoutError extends Error {
  /**
   * The timeout value that was exceeded.
   */
  readonly timeout: number;

  constructor(timeout: number) {
    super(`Mock server startup timeout after ${timeout}ms`);
    this.name = 'StartupTimeoutError';
    this.timeout = timeout;
  }
}

/**
 * Error thrown when mock server reports an error during startup.
 */
export class StartupError extends Error {
  /**
   * Optional stack trace from the child process.
   */
  readonly childStack?: string;

  /**
   * Optional error code from the child process.
   */
  readonly code?: string;

  constructor(message: string, stack?: string, code?: string) {
    super(message);
    this.name = 'StartupError';
    this.childStack = stack;
    this.code = code;
  }
}

/**
 * Validates that a value is a valid IPC message with a type field.
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
 * Waits for the mock server child process to send a 'ready' IPC message.
 *
 * This function blocks until one of the following occurs:
 * 1. A 'ready' message is received - resolves with the message
 * 2. An 'error' message is received - rejects with StartupError
 * 3. The timeout expires - rejects with StartupTimeoutError
 * 4. The child process exits - rejects with Error
 *
 * @param child - The child process to wait for
 * @param options - Configuration options including timeout
 * @returns Promise that resolves with the ReadyMessage when server is ready
 * @throws {StartupTimeoutError} When timeout is exceeded
 * @throws {StartupError} When child process reports an error
 * @throws {Error} When child process exits unexpectedly
 *
 * @example
 * ```typescript
 * try {
 *   const readyMessage = await waitForReady(childProcess, { timeout: 10000 });
 *   console.log(`Server ready on port ${readyMessage.port}`);
 *   console.log(`Loaded ${readyMessage.endpointCount} endpoints`);
 * } catch (error) {
 *   if (error instanceof StartupTimeoutError) {
 *     console.error('Server took too long to start');
 *   } else if (error instanceof StartupError) {
 *     console.error('Server failed to start:', error.message);
 *   }
 * }
 * ```
 */
export function waitForReady(
  child: ChildProcess,
  options: WaitForReadyOptions = {},
): Promise<ReadyMessage> {
  const { timeout = 5000 } = options;

  return new Promise<ReadyMessage>((resolve, reject) => {
    let settled = false;
    let timeoutTimer: NodeJS.Timeout | undefined;

    /**
     * Cleanup function to remove all listeners and clear timers.
     */
    const cleanup = (): void => {
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
        timeoutTimer = undefined;
      }
      child.off('message', messageHandler);
      child.off('exit', exitHandler);
      child.off('error', processErrorHandler);
    };

    /**
     * Settles the promise and performs cleanup.
     */
    const settle = (action: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      action();
    };

    /**
     * Handles IPC messages from the child process.
     */
    const messageHandler = (message: unknown): void => {
      if (!isValidIpcMessage(message)) {
        return;
      }

      const ipcMessage = message as OpenApiServerMessage;

      if (ipcMessage.type === 'ready') {
        settle(() => resolve(ipcMessage as ReadyMessage));
      } else if (ipcMessage.type === 'error') {
        const errorMsg = ipcMessage as ErrorMessage;
        settle(() => reject(new StartupError(errorMsg.message, errorMsg.stack, errorMsg.code)));
      }
      // Ignore other message types during startup
    };

    /**
     * Handles unexpected child process exit.
     */
    const exitHandler = (code: number | null, signal: string | null): void => {
      const exitReason = signal ? `killed by signal ${signal}` : `exited with code ${code}`;
      settle(() => reject(new Error(`Mock server ${exitReason} before sending ready message`)));
    };

    /**
     * Handles child process spawn errors.
     */
    const processErrorHandler = (error: Error): void => {
      settle(() => reject(new StartupError(`Mock server process error: ${error.message}`)));
    };

    // Set up timeout
    timeoutTimer = setTimeout(() => {
      settle(() => reject(new StartupTimeoutError(timeout)));
    }, timeout);

    // Set up listeners
    child.on('message', messageHandler);
    child.on('exit', exitHandler);
    child.on('error', processErrorHandler);
  });
}

/**
 * Result of a successful startup coordination.
 */
export interface StartupResult {
  /**
   * The ready message received from the child process.
   */
  readyMessage: ReadyMessage;

  /**
   * Time taken to start in milliseconds.
   */
  startupTime: number;
}

/**
 * Coordinates the complete startup sequence for the mock server.
 *
 * This function:
 * 1. Records the start time
 * 2. Waits for the ready message with timeout
 * 3. Returns the ready message and startup time
 *
 * @param child - The child process to coordinate startup for
 * @param options - Configuration options including timeout
 * @param startTime - Optional start time (defaults to now)
 * @returns Promise that resolves with startup result
 * @throws {StartupTimeoutError} When timeout is exceeded
 * @throws {StartupError} When child process reports an error
 *
 * @example
 * ```typescript
 * const startTime = performance.now();
 * const childProcess = await spawnMockServer(options, logger);
 *
 * try {
 *   const { readyMessage, startupTime } = await coordinateStartup(
 *     childProcess,
 *     { timeout: options.startupTimeout },
 *     startTime,
 *   );
 *
 *   printSuccessBanner(
 *     readyMessage.port,
 *     readyMessage.endpointCount,
 *     options.openApiPath,
 *     startTime,
 *     logger,
 *   );
 * } catch (error) {
 *   printErrorBanner(error, options.openApiPath, logger);
 *   throw error;
 * }
 * ```
 */
export async function coordinateStartup(
  child: ChildProcess,
  options: WaitForReadyOptions = {},
  startTime: number = performance.now(),
): Promise<StartupResult> {
  const readyMessage = await waitForReady(child, options);
  const startupTime = performance.now() - startTime;

  return {
    readyMessage,
    startupTime,
  };
}
