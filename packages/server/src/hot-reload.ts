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

// Segment-boundary patterns: match "node_modules" or "dist" as a directory
// segment, not as a substring (avoids false positives like "distribution/").
const nodeModulesRe = /(^|[\\/])node_modules([\\/]|$)/;
const distRe = /(^|[\\/])dist([\\/]|$)/;

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

  // File extension filters — chokidar v4+/v5 removed glob support,
  // so we watch the directory and filter via the `ignored` callback.
  const handlerRe = /\.handlers\.(ts|js|mjs)$/;
  const seedRe = /\.seeds\.(ts|js|mjs)$/;

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

  /**
   * Build an `ignored` function for chokidar that accepts only files
   * matching the given pattern and skips node_modules/dist directories.
   */
  const buildIgnored = (pattern: RegExp) => {
    return (filePath: string, stats?: { isFile(): boolean }): boolean => {
      // Always ignore node_modules and dist directories
      if (nodeModulesRe.test(filePath) || distRe.test(filePath)) {
        return true;
      }
      // Allow confirmed directories to be traversed so chokidar
      // descends into sub-folders even though they won't match the
      // file-extension pattern.
      if (stats && !stats.isFile()) {
        return false;
      }
      // Ignore files (or paths with no stats yet) that don't match the
      // expected pattern — prevents non-matching files from slipping
      // through when chokidar omits the stats argument.
      return !pattern.test(filePath);
    };
  };

  try {
    // Watch handlers directory
    if (handlersDir && onHandlerChange) {
      const absoluteHandlersDir = path.resolve(cwd, handlersDir);
      const handlerWatcher = watch(absoluteHandlersDir, {
        ignoreInitial: true,
        ignored: buildIgnored(handlerRe),
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50,
        },
      });

      handlerWatcher.on('add', (file) => {
        safeInvoke(onHandlerChange, file, 'Handler add');
      });

      handlerWatcher.on('change', (file) => {
        safeInvoke(onHandlerChange, file, 'Handler change');
      });

      handlerWatcher.on('unlink', (file) => {
        safeInvoke(onHandlerChange, file, 'Handler unlink');
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
      const seedWatcher = watch(absoluteSeedsDir, {
        ignoreInitial: true,
        ignored: buildIgnored(seedRe),
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50,
        },
      });

      seedWatcher.on('add', (file) => {
        safeInvoke(onSeedChange, file, 'Seed add');
      });

      seedWatcher.on('change', (file) => {
        safeInvoke(onSeedChange, file, 'Seed change');
      });

      seedWatcher.on('unlink', (file) => {
        safeInvoke(onSeedChange, file, 'Seed unlink');
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
  } catch (error) {
    // Clean up any already-created FSWatchers before re-throwing
    await Promise.allSettled(watchers.map((w) => w.close()));
    throw error;
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
 * Debounced function with cancel support
 */
export interface DebouncedFunction<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): void;
  /** Cancel any pending debounce timer and queued execution */
  cancel(): void;
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
 * @returns Debounced function with cancel() method
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let isRunning = false;
  let pendingArgs: Parameters<T> | null = null;
  let cancelled = false;

  const execute = async (...args: Parameters<T>): Promise<void> => {
    if (cancelled || isRunning) {
      if (isRunning && !cancelled) {
        // Queue the latest args for execution after current run completes
        pendingArgs = args;
      }
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
      if (pendingArgs !== null && !cancelled) {
        const nextArgs = pendingArgs;
        pendingArgs = null;
        // Use setTimeout to avoid deep recursion
        setTimeout(() => execute(...nextArgs), 0);
      }
    }
  };

  const debouncedFn = (...args: Parameters<T>): void => {
    if (cancelled) return;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      execute(...args);
    }, delay);
  };

  debouncedFn.cancel = (): void => {
    cancelled = true;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    pendingArgs = null;
  };

  return debouncedFn;
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
  const allDebouncedFns: DebouncedFunction<(...args: unknown[]) => unknown>[] = [];

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
      allDebouncedFns.push(debouncedHandlerReload, debouncedSeedReload);

      const innerWatcher = await createFileWatcher({
        handlersDir: instance.config.handlersDir,
        seedsDir: instance.config.seedsDir,
        cwd,
        logger: options.logger,
        onHandlerChange: debouncedHandlerReload,
        onSeedChange: debouncedSeedReload,
      });

      // Wrap each FileWatcher so close() also cancels its debounced timers,
      // preventing post-teardown execution of reload functions.
      watchers.push({
        async close(): Promise<void> {
          debouncedHandlerReload.cancel();
          debouncedSeedReload.cancel();
          await innerWatcher.close();
        },
        get isWatching(): boolean {
          return innerWatcher.isWatching;
        },
        get ready(): Promise<void> {
          return innerWatcher.ready;
        },
      });
    }
  } catch (error) {
    // Cancel all debounced timers before closing watchers
    for (const fn of allDebouncedFns) fn.cancel();
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

    // updateHandlers() broadcasts 'handlers:updated' internally — no explicit broadcast needed.
    // In Epic 3 (Task 3.1), the broadcast wrapper will add specId automatically.
    instance.server.updateHandlers(handlersResult.handlers);

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
    // Load seeds first (before clearing) to minimize the window where store is empty.
    // NOTE: We bypass instance.server.updateSeeds() because it expects static data
    // (Map<string, unknown[]>), while loadSeeds() returns seed functions (Map<string, AnySeedFn>)
    // that must be materialized via executeSeeds(). The explicit broadcast below is necessary
    // because we're not going through updateSeeds()'s built-in broadcast.
    // TODO: Epic 3 (Task 3.1) will wire the broadcast wrapper to add specId automatically.
    // TODO: Epic 3 (Task 3.2) should also update registry hasSeed flags after seed reload,
    //       which are currently skipped because updateSeeds() is bypassed.
    const logger = options.logger ?? console;
    const seedsResult = await loadSeeds(instance.config.seedsDir, vite, cwd, logger);

    let broadcastCount = seedsResult.seeds.size;
    instance.server.store.clearAll();

    if (seedsResult.seeds.size > 0) {
      try {
        await executeSeeds(seedsResult.seeds, instance.server.store, instance.server.document);
      } catch (execError) {
        // Store was already cleared — warn that it's now empty due to seed execution failure
        broadcastCount = 0;
        printError(
          `Seeds loaded but executeSeeds failed for spec "${instance.id}"; store is now empty`,
          execError,
          options,
        );
      }
    }

    // Single broadcast for both success and failure paths
    instance.server.wsHub.broadcast({
      type: 'seeds:updated',
      data: { count: broadcastCount },
    });

    if (broadcastCount > 0) {
      printReloadNotification('seeds', broadcastCount, options);
    }
  } catch (error) {
    printError(`Failed to reload seeds for spec "${instance.id}"`, error, options);
  }
}
