/**
 * Hot Reload Handler Module
 *
 * ## What
 * Provides the core hot reload functionality that handles file change events
 * and orchestrates the mock server restart sequence.
 *
 * ## How
 * When a file change is detected:
 * 1. Log the file change event
 * 2. Acquire reload lock (prevent concurrent reloads)
 * 3. Gracefully shutdown the current mock server
 * 4. Clear module cache for changed files
 * 5. Respawn the mock server with fresh state
 * 6. Wait for the new server to be ready
 * 7. Log success/failure with timing information
 *
 * ## Why
 * Developers expect instant feedback when modifying mock handlers or seed data.
 * Hot reload provides this by automatically restarting the mock server when
 * relevant files change, significantly improving the development experience.
 *
 * @module hot-reload/hot-reload-handler
 */

import type { ChildProcess } from 'node:child_process';
import path from 'node:path';
import type { Logger } from 'vite';
import {
  type ShutdownOptions,
  shutdownMockServer,
  spawnMockServer,
  waitForReady,
} from '../process/index.js';
import type { ResolvedPluginOptions } from '../types/plugin-options.js';
import type { FileChangeEvent } from './file-watcher.js';

/**
 * Log prefix for hot reload messages.
 * @internal
 */
const LOG_PREFIX = '[hot-reload]';

/**
 * Context required for hot reload operations.
 * This is passed from the plugin to the hot reload handler.
 */
export interface HotReloadContext {
  /** Current mock server process (null if not running) */
  mockServerProcess: ChildProcess | null;
  /** Resolved plugin options */
  options: ResolvedPluginOptions;
  /** Vite logger for output */
  logger: Logger;
  /** Callback to update the mock server process reference */
  onProcessUpdate: (process: ChildProcess | null) => void;
  /** Callback to update the ready state */
  onReadyStateUpdate: (isReady: boolean, port: number | null) => void;
}

/**
 * Result of a hot reload operation.
 */
export interface HotReloadResult {
  /** Whether the reload was successful */
  success: boolean;
  /** Duration of the reload in milliseconds */
  durationMs: number;
  /** Error message if reload failed */
  error?: string;
}

/**
 * State for managing hot reload operations.
 * Used to prevent concurrent reloads and track pending changes.
 */
export interface HotReloadState {
  /** Whether a reload is currently in progress */
  isReloading: boolean;
  /** Pending file changes that occurred during a reload */
  pendingChanges: FileChangeEvent[];
}

/**
 * Creates the initial hot reload state.
 *
 * @returns Fresh hot reload state object
 */
export function createHotReloadState(): HotReloadState {
  return {
    isReloading: false,
    pendingChanges: [],
  };
}

/**
 * Normalizes a file path for cross-platform compatibility.
 *
 * Ensures consistent path format for cache operations
 * by normalizing separators and resolving relative paths.
 *
 * @param filePath - The file path to normalize
 * @returns Normalized absolute path
 * @internal
 */
export function normalizePath(filePath: string): string {
  return path.normalize(path.resolve(filePath));
}

/**
 * Clears the Node.js module cache for a specific file.
 *
 * For CommonJS modules, deletes the entry from require.cache.
 * For ESM, cache busting is handled by the dynamic import with
 * a query parameter in the mock server runner.
 *
 * @param filePath - Absolute path to the file to clear from cache
 * @param logger - Logger for verbose output
 * @param verbose - Whether to log cache clearing operations
 * @internal
 */
export function clearModuleCache(filePath: string, logger: Logger, verbose: boolean): void {
  const normalizedPath = normalizePath(filePath);

  // Clear from CommonJS require.cache if present
  // biome-ignore lint/suspicious/noExplicitAny: require.cache uses any for compatibility
  const requireCache = (globalThis as any).require?.cache;
  if (requireCache?.[normalizedPath]) {
    delete requireCache[normalizedPath];
    if (verbose) {
      logger.info(`${LOG_PREFIX} Cleared require.cache: ${normalizedPath}`);
    }
  }

  // Note: ESM cache clearing is handled in the mock server runner
  // by using dynamic import with cache-busting query parameters:
  // import(`${handlerPath}?t=${Date.now()}`)
}

/**
 * Executes the hot reload sequence for the mock server.
 *
 * This is the core function that orchestrates the entire reload process:
 * 1. Shutdown the current mock server (if running)
 * 2. Clear module cache for changed files
 * 3. Spawn a new mock server process
 * 4. Wait for the new server to be ready
 *
 * @param context - Hot reload context with process and options
 * @param changedFiles - Array of file paths that changed
 * @returns Promise resolving to the reload result
 * @internal
 */
async function executeReload(
  context: HotReloadContext,
  changedFiles: string[],
): Promise<HotReloadResult> {
  const { mockServerProcess, options, logger, onProcessUpdate, onReadyStateUpdate } = context;
  const startTime = performance.now();

  try {
    // Step 1: Shutdown current mock server (if running)
    if (mockServerProcess) {
      logger.info(`${LOG_PREFIX} ⏹ Shutting down current server...`);

      const shutdownOptions: ShutdownOptions = {
        gracefulTimeout: options.gracefulShutdownTimeout,
        forceTimeout: options.forceShutdownTimeout,
      };

      await shutdownMockServer(mockServerProcess, logger, shutdownOptions);
      onProcessUpdate(null);
      onReadyStateUpdate(false, null);
    }

    // Step 2: Clear module cache for changed files
    for (const filePath of changedFiles) {
      clearModuleCache(filePath, logger, options.verbose);
    }

    // Step 3: Spawn new mock server
    logger.info(`${LOG_PREFIX} ⟳ Starting new server...`);
    const newProcess = spawnMockServer(options, logger);

    if (!newProcess) {
      throw new Error('Failed to spawn new mock server process');
    }

    onProcessUpdate(newProcess);

    // Step 4: Wait for new server to be ready
    const readyMessage = await waitForReady(newProcess, {
      timeout: options.startupTimeout,
    });

    onReadyStateUpdate(true, readyMessage.port);

    const durationMs = performance.now() - startTime;

    return {
      success: true,
      durationMs,
    };
  } catch (error) {
    const err = error as Error;
    const durationMs = performance.now() - startTime;

    return {
      success: false,
      durationMs,
      error: err.message,
    };
  }
}

/**
 * Handles a file change event and triggers hot reload.
 *
 * This is the main entry point called by the file watcher when files change.
 * It manages the reload lock to prevent concurrent reloads and queues
 * changes that occur during an ongoing reload.
 *
 * @param event - The file change event from the watcher
 * @param context - Hot reload context with process and options
 * @param state - Hot reload state for managing concurrent reloads
 * @returns Promise that resolves when the reload is complete
 *
 * @example
 * ```typescript
 * const state = createHotReloadState();
 *
 * fileWatcher.on('change', async (event) => {
 *   await handleFileChange(event, {
 *     mockServerProcess,
 *     options: resolvedOptions,
 *     logger,
 *     onProcessUpdate: (p) => { mockServerProcess = p; },
 *     onReadyStateUpdate: (ready, port) => { isReady = ready; },
 *   }, state);
 * });
 * ```
 */
export async function handleFileChange(
  event: FileChangeEvent,
  context: HotReloadContext,
  state: HotReloadState,
): Promise<void> {
  const { logger, options } = context;

  // Log the file change
  logger.info(`${LOG_PREFIX} File ${event.type}: ${event.path}`);

  // If a reload is already in progress, queue this change
  if (state.isReloading) {
    state.pendingChanges.push(event);
    if (options.verbose) {
      logger.info(`${LOG_PREFIX} Reload in progress, queued change for: ${event.path}`);
    }
    return;
  }

  // Acquire reload lock
  state.isReloading = true;
  const changedFiles: string[] = [event.path];

  try {
    logger.info(`${LOG_PREFIX} ⟳ Reloading mock server...`);

    const result = await executeReload(context, changedFiles);

    if (result.success) {
      const duration = (result.durationMs / 1000).toFixed(2);
      logger.info(`${LOG_PREFIX} ✓ Reloaded in ${duration}s`);
    } else {
      logger.error(`${LOG_PREFIX} ✗ Reload failed: ${result.error}`);
    }
  } finally {
    // Release reload lock
    state.isReloading = false;

    // Process any pending changes that occurred during reload
    if (state.pendingChanges.length > 0) {
      const pendingEvent = state.pendingChanges.shift();
      if (pendingEvent) {
        // Recursively handle the next pending change
        // Using setImmediate to prevent stack overflow on rapid changes
        setImmediate(() => {
          handleFileChange(pendingEvent, context, state).catch((err) => {
            logger.error(`${LOG_PREFIX} Error processing pending change: ${err.message}`);
          });
        });
      }
    }
  }
}
