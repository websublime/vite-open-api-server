/**
 * Hot Reload
 *
 * What: File watcher for hot reloading handlers and seeds with per-spec isolation
 * How: Uses chokidar to watch for file changes, one watcher per spec instance
 * Why: Enables rapid development iteration without server restart; per-spec
 *       isolation ensures handler/seed changes in one spec don't affect others
 *
 * @module hot-reload
 */

import path from 'node:path';
import { executeSeeds, type Logger } from '@websublime/vite-plugin-open-api-core';
import type { FSWatcher } from 'chokidar';
import type { ViteDevServer } from 'vite';
import { printError, printReloadNotification } from './banner.js';
import { loadHandlers } from './handlers.js';
import type { SpecInstance } from './orchestrator.js';
import { loadSeeds } from './seeds.js';
import type { ResolvedOptions } from './types.js';

/**
 * File watcher configuration
 */
export interface FileWatcherOptions {
  /** Directory containing handler files */
  handlersDir?: string;
  /** Directory containing seed files */
  seedsDir?: string;
  /** Callback when a handler file changes */
  onHandlerChange?: (filePath: string) => Promise<void> | void;
  /** Callback when a seed file changes */
  onSeedChange?: (filePath: string) => Promise<void> | void;
  /** Current working directory */
  cwd?: string;
  /** Logger for error messages */
  logger?: Logger;
}

/**
 * File watcher instance
 */
export interface FileWatcher {
  /** Close the watcher and release resources */
  close(): Promise<void>;
  /** Check if watcher is active */
  readonly isWatching: boolean;
  /** Promise that resolves when all watchers are ready */
  readonly ready: Promise<void>;
}

/**
 * Create a file watcher for handlers and seeds
 *
 * Watches for changes to handler and seed files and invokes
 * callbacks when changes are detected. Supports add, change,
 * and unlink events.
 *
 * @example
 * ```typescript
 * const watcher = await createFileWatcher({
 *   handlersDir: './mocks/handlers',
 *   seedsDir: './mocks/seeds',
 *   onHandlerChange: async (file) => {
 *     console.log('Handler changed:', file);
 *     const handlers = await loadHandlers('./mocks/handlers');
 *     server.updateHandlers(handlers.handlers);
 *   },
 *   onSeedChange: async (file) => {
 *     console.log('Seed changed:', file);
 *     const seeds = await loadSeeds('./mocks/seeds');
 *     // Re-execute seeds...
 *   },
 * });
 *
 * // Later, clean up
 * await watcher.close();
 * ```
 *
 * @param options - Watcher configuration
 * @returns Promise resolving to file watcher instance
 */
export async function createFileWatcher(options: FileWatcherOptions): Promise<FileWatcher> {
  const {
    handlersDir,
    seedsDir,
    onHandlerChange,
    onSeedChange,
    cwd = process.cwd(),
    logger = console,
  } = options;

  // Dynamic import chokidar to avoid bundling issues
  const { watch } = await import('chokidar');

  const watchers: FSWatcher[] = [];
  const readyPromises: Promise<void>[] = [];
  let isWatching = true;

  // Handler file patterns
  const handlerPattern = '**/*.handlers.{ts,js,mjs}';
  const seedPattern = '**/*.seeds.{ts,js,mjs}';

  /**
   * Wrapper to safely invoke async callbacks and log errors
   * Prevents unhandled promise rejections from file watcher events
   */
  const safeInvoke = (
    callback: (filePath: string) => Promise<void> | void,
    filePath: string,
    context: string,
  ): void => {
    Promise.resolve()
      .then(() => callback(filePath))
      .catch((error) => {
        logger.error(
          `[vite-plugin-open-api-server] ${context} callback error for ${filePath}:`,
          error,
        );
      });
  };

  // Watch handlers directory
  if (handlersDir && onHandlerChange) {
    const absoluteHandlersDir = path.resolve(cwd, handlersDir);
    const handlerWatcher = watch(handlerPattern, {
      cwd: absoluteHandlersDir,
      ignoreInitial: true,
      ignored: ['**/node_modules/**', '**/dist/**'],
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    handlerWatcher.on('add', (file) => {
      const absolutePath = path.join(absoluteHandlersDir, file);
      safeInvoke(onHandlerChange, absolutePath, 'Handler add');
    });

    handlerWatcher.on('change', (file) => {
      const absolutePath = path.join(absoluteHandlersDir, file);
      safeInvoke(onHandlerChange, absolutePath, 'Handler change');
    });

    handlerWatcher.on('unlink', (file) => {
      const absolutePath = path.join(absoluteHandlersDir, file);
      safeInvoke(onHandlerChange, absolutePath, 'Handler unlink');
    });

    handlerWatcher.on('error', (error) => {
      logger.error('[vite-plugin-open-api-server] Handler watcher error:', error);
    });

    // Track ready promise for this watcher
    readyPromises.push(
      new Promise<void>((resolve) => {
        handlerWatcher.on('ready', () => resolve());
      }),
    );

    watchers.push(handlerWatcher);
  }

  // Watch seeds directory
  if (seedsDir && onSeedChange) {
    const absoluteSeedsDir = path.resolve(cwd, seedsDir);
    const seedWatcher = watch(seedPattern, {
      cwd: absoluteSeedsDir,
      ignoreInitial: true,
      ignored: ['**/node_modules/**', '**/dist/**'],
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    seedWatcher.on('add', (file) => {
      const absolutePath = path.join(absoluteSeedsDir, file);
      safeInvoke(onSeedChange, absolutePath, 'Seed add');
    });

    seedWatcher.on('change', (file) => {
      const absolutePath = path.join(absoluteSeedsDir, file);
      safeInvoke(onSeedChange, absolutePath, 'Seed change');
    });

    seedWatcher.on('unlink', (file) => {
      const absolutePath = path.join(absoluteSeedsDir, file);
      safeInvoke(onSeedChange, absolutePath, 'Seed unlink');
    });

    seedWatcher.on('error', (error) => {
      logger.error('[vite-plugin-open-api-server] Seed watcher error:', error);
    });

    // Track ready promise for this watcher
    readyPromises.push(
      new Promise<void>((resolve) => {
        seedWatcher.on('ready', () => resolve());
      }),
    );

    watchers.push(seedWatcher);
  }

  // Create combined ready promise
  const readyPromise = Promise.all(readyPromises).then(() => {});

  return {
    async close(): Promise<void> {
      isWatching = false;
      await Promise.all(watchers.map((w) => w.close()));
    },
    get isWatching(): boolean {
      return isWatching;
    },
    get ready(): Promise<void> {
      return readyPromise;
    },
  };
}

/**
 * Debounce a function with async execution guard
 *
 * Useful for preventing multiple rapid reloads when
 * multiple files change at once (e.g., during save all).
 *
 * This implementation prevents overlapping async executions:
 * - If the function is already running, the call is queued
 * - When the running function completes, it executes with the latest args
 * - Multiple calls during execution are coalesced into one
 *
 * @param fn - Function to debounce (can be sync or async)
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let isRunning = false;
  let pendingArgs: Parameters<T> | null = null;

  const execute = async (...args: Parameters<T>): Promise<void> => {
    if (isRunning) {
      // Queue the latest args for execution after current run completes
      pendingArgs = args;
      return;
    }

    isRunning = true;
    try {
      // Wrap in try-catch to handle sync throws, then await for async rejections
      // This prevents both sync errors and async rejections from propagating
      try {
        await fn(...args);
      } catch {
        // Silently catch errors - the caller is responsible for error handling
        // This prevents unhandled rejections from breaking the debounce chain
      }
    } finally {
      isRunning = false;

      // If there were calls during execution, run with the latest args
      if (pendingArgs !== null) {
        const nextArgs = pendingArgs;
        pendingArgs = null;
        // Use setTimeout to avoid deep recursion
        setTimeout(() => execute(...nextArgs), 0);
      }
    }
  };

  return (...args: Parameters<T>): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      execute(...args);
    }, delay);
  };
}

// =============================================================================
// Per-Spec Hot Reload
// =============================================================================

/**
 * Create file watchers for all spec instances
 *
 * Each spec gets independent watchers for its handlers and seeds directories.
 * Changes to one spec's files only trigger reload for that spec instance.
 *
 * @param instances - All spec instances to watch
 * @param vite - Vite dev server (for ssrLoadModule / module invalidation)
 * @param cwd - Project root directory
 * @param options - Resolved plugin options
 * @returns Promise resolving to array of file watchers (one per spec)
 */
export async function createPerSpecFileWatchers(
  instances: SpecInstance[],
  vite: ViteDevServer,
  cwd: string,
  options: ResolvedOptions,
): Promise<FileWatcher[]> {
  const watchers: FileWatcher[] = [];

  try {
    for (const instance of instances) {
      const debouncedHandlerReload = debounce(
        () => reloadSpecHandlers(instance, vite, cwd, options),
        100,
      );
      const debouncedSeedReload = debounce(
        () => reloadSpecSeeds(instance, vite, cwd, options),
        100,
      );

      const watcher = await createFileWatcher({
        handlersDir: instance.config.handlersDir,
        seedsDir: instance.config.seedsDir,
        cwd,
        onHandlerChange: debouncedHandlerReload,
        onSeedChange: debouncedSeedReload,
      });

      watchers.push(watcher);
    }
  } catch (error) {
    // Clean up already-created watchers before re-throwing
    await Promise.allSettled(watchers.map((w) => w.close()));
    throw error;
  }

  return watchers;
}

/**
 * Reload handlers for a specific spec instance
 *
 * Loads fresh handlers from disk via Vite's ssrLoadModule, updates
 * the spec's server, broadcasts a WebSocket event, and logs the result.
 *
 * @param instance - The spec instance to reload handlers for
 * @param vite - Vite dev server
 * @param cwd - Project root directory
 * @param options - Resolved plugin options
 */
export async function reloadSpecHandlers(
  instance: SpecInstance,
  vite: ViteDevServer,
  cwd: string,
  options: ResolvedOptions,
): Promise<void> {
  try {
    const logger = options.logger ?? console;
    const handlersResult = await loadHandlers(instance.config.handlersDir, vite, cwd, logger);
    instance.server.updateHandlers(handlersResult.handlers);

    instance.server.wsHub.broadcast({
      type: 'handlers:updated',
      data: { count: handlersResult.handlers.size },
    });

    printReloadNotification('handlers', handlersResult.handlers.size, options);
  } catch (error) {
    printError(`Failed to reload handlers for spec "${instance.id}"`, error, options);
  }
}

/**
 * Reload seeds for a specific spec instance
 *
 * Loads fresh seeds from disk, clears the spec's store, and re-executes
 * seeds. Broadcasts a WebSocket event and logs the result.
 *
 * Note: This operation is not fully atomic — there's a brief window between
 * clearing the store and repopulating it where requests may see empty data.
 * For development tooling, this tradeoff is acceptable.
 *
 * @param instance - The spec instance to reload seeds for
 * @param vite - Vite dev server
 * @param cwd - Project root directory
 * @param options - Resolved plugin options
 */
export async function reloadSpecSeeds(
  instance: SpecInstance,
  vite: ViteDevServer,
  cwd: string,
  options: ResolvedOptions,
): Promise<void> {
  try {
    // Load seeds first (before clearing) to minimize the window where store is empty
    const logger = options.logger ?? console;
    const seedsResult = await loadSeeds(instance.config.seedsDir, vite, cwd, logger);

    instance.server.store.clearAll();
    if (seedsResult.seeds.size > 0) {
      try {
        await executeSeeds(seedsResult.seeds, instance.server.store, instance.server.document);
      } catch (execError) {
        // Store was already cleared — warn that it's now empty due to seed execution failure
        printError(
          `Seeds loaded but executeSeeds failed for spec "${instance.id}"; store is now empty`,
          execError,
          options,
        );
        // Still broadcast so DevTools reflects the cleared state
        instance.server.wsHub.broadcast({
          type: 'seeds:updated',
          data: { count: 0 },
        });
        return;
      }
    }

    instance.server.wsHub.broadcast({
      type: 'seeds:updated',
      data: { count: seedsResult.seeds.size },
    });

    printReloadNotification('seeds', seedsResult.seeds.size, options);
  } catch (error) {
    printError(`Failed to reload seeds for spec "${instance.id}"`, error, options);
  }
}
