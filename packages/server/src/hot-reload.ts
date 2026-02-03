/**
 * Hot Reload
 *
 * What: File watcher for hot reloading handlers and seeds
 * How: Uses chokidar to watch for file changes
 * Why: Enables rapid development iteration without server restart
 *
 * @module hot-reload
 *
 * TODO: Full implementation in Task 3.3
 * This module provides placeholder/basic functionality for Task 3.1
 */

import path from 'node:path';
import type { Logger } from '@websublime/vite-open-api-core';
import type { FSWatcher } from 'chokidar';

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
