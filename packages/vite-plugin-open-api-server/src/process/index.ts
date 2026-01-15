/**
 * Process Management Module
 *
 * ## What
 * This module provides process lifecycle management for the mock server
 * child process, including spawning, IPC communication, and graceful shutdown.
 *
 * ## Exports
 * - `spawnMockServer`: Spawns the mock server as a child process
 * - `shutdownMockServer`: Gracefully shuts down the mock server
 * - `ShutdownOptions`: Configuration options for shutdown behavior
 * - `createIpcHandler`: Creates an IPC message handler function
 * - `attachIpcHandler`: Attaches IPC handler to a child process
 * - `IpcHandlerOptions`: Configuration options for IPC handler
 * - `IpcHandlerCallbacks`: Callback functions for IPC message handling
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
