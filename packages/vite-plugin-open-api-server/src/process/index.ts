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
 *
 * @module process
 */

export { type ShutdownOptions, shutdownMockServer, spawnMockServer } from './process-manager.js';
