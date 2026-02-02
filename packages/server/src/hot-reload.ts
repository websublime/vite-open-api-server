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
  let isWatching = true;

  // Handler file patterns
  const handlerPattern = '**/*.handlers.{ts,js,mjs}';
  const seedPattern = '**/*.seeds.{ts,js,mjs}';

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
      onHandlerChange(absolutePath);
    });

    handlerWatcher.on('change', (file) => {
      const absolutePath = path.join(absoluteHandlersDir, file);
      onHandlerChange(absolutePath);
    });

    handlerWatcher.on('unlink', (file) => {
      const absolutePath = path.join(absoluteHandlersDir, file);
      onHandlerChange(absolutePath);
    });

    handlerWatcher.on('error', (error) => {
      logger.error('[vite-plugin-open-api-server] Handler watcher error:', error);
    });

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
      onSeedChange(absolutePath);
    });

    seedWatcher.on('change', (file) => {
      const absolutePath = path.join(absoluteSeedsDir, file);
      onSeedChange(absolutePath);
    });

    seedWatcher.on('unlink', (file) => {
      const absolutePath = path.join(absoluteSeedsDir, file);
      onSeedChange(absolutePath);
    });

    seedWatcher.on('error', (error) => {
      logger.error('[vite-plugin-open-api-server] Seed watcher error:', error);
    });

    watchers.push(seedWatcher);
  }

  return {
    async close(): Promise<void> {
      isWatching = false;
      await Promise.all(watchers.map((w) => w.close()));
    },
    get isWatching(): boolean {
      return isWatching;
    },
  };
}

/**
 * Debounce a function
 *
 * Useful for preventing multiple rapid reloads when
 * multiple files change at once (e.g., during save all).
 *
 * @param fn - Function to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}
