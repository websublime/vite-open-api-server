/**
 * Process Management Module
 *
 * ## What
 * This module provides process lifecycle management for the mock server
 * child process, including spawning, IPC communication, graceful shutdown,
 * and startup coordination.
 *
 * ## Exports
 * - `spawnMockServer`: Spawns the mock server as a child process
 * - `shutdownMockServer`: Gracefully shuts down the mock server
 * - `ShutdownOptions`: Configuration options for shutdown behavior
 * - `createIpcHandler`: Creates an IPC message handler function
 * - `attachIpcHandler`: Attaches IPC handler to a child process
 * - `IpcHandlerOptions`: Configuration options for IPC handler
 * - `IpcHandlerCallbacks`: Callback functions for IPC message handling
 * - `waitForReady`: Waits for mock server ready message with timeout
 * - `coordinateStartup`: Coordinates complete startup sequence
 * - `WaitForReadyOptions`: Configuration options for waitForReady
 * - `StartupResult`: Result of successful startup coordination
 * - `StartupTimeoutError`: Error thrown when startup times out
 * - `StartupError`: Error thrown when mock server reports startup error
 *
 * @module process
 */

export {
  attachIpcHandler,
  createIpcHandler,
  type IpcHandlerCallbacks,
  type IpcHandlerOptions,
} from './ipc-handler.js';
export { type ShutdownOptions, shutdownMockServer, spawnMockServer } from './process-manager.js';
export {
  coordinateStartup,
  StartupError,
  type StartupResult,
  StartupTimeoutError,
  type WaitForReadyOptions,
  waitForReady,
} from './startup-coordinator.js';
