/**
 * File Watcher Module
 *
 * ## What
 * Provides a file system watcher that monitors handler and seed files for changes,
 * enabling hot reload functionality during development.
 *
 * ## How
 * Uses chokidar for robust cross-platform file watching. Watches specified directories
 * for file add/change/unlink events, debounces rapid changes to prevent excessive
 * restarts, and emits events consumed by the hot reload logic.
 *
 * ## Why
 * Developers expect instant feedback when modifying mock handlers or seed data.
 * File watching enables the plugin to detect changes and trigger automatic reloads,
 * significantly improving the development experience.
 *
 * @module
 */

import { EventEmitter } from 'node:events';
import type { FSWatcher } from 'chokidar';
import chokidar from 'chokidar';

/**
 * Represents a file change event.
 */
export interface FileChangeEvent {
  /** Absolute path to the changed file */
  path: string;
  /** Type of change: file added, modified, or deleted */
  type: 'add' | 'change' | 'unlink';
}

/**
 * Configuration options for the file watcher.
 */
export interface FileWatcherOptions {
  /** Directories to watch for handler files */
  watchDirs: string[];
  /** Debounce delay in milliseconds (default: 100) */
  debounceMs?: number;
  /** Whether to log verbose output */
  verbose?: boolean;
}

/**
 * File watcher for monitoring handler and seed files.
 *
 * Extends EventEmitter to provide event-driven file change notifications.
 * Emits 'change' events with FileChangeEvent payload when files are
 * added, modified, or deleted.
 *
 * @example
 * ```typescript
 * const watcher = createFileWatcher();
 * watcher.on('change', (event) => {
 *   console.log(`File ${event.type}: ${event.path}`);
 * });
 * watcher.start({ watchDirs: ['./handlers', './seeds'] });
 * ```
 */
export class FileWatcher extends EventEmitter {
  /** Internal chokidar watcher instance */
  private watcher: FSWatcher | null = null;

  /** Debounce timeout handle */
  private debounceTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Pending events to batch, keyed by path to deduplicate */
  private pendingEvents: Map<string, FileChangeEvent> = new Map();

  /**
   * Starts watching the specified directories for file changes.
   *
   * @param options - Configuration options for the watcher
   */
  start(options: FileWatcherOptions): void {
    // Don't start if already running
    if (this.watcher) {
      return;
    }

    const { watchDirs, debounceMs = 100, verbose = false } = options;

    // Filter out empty or invalid directories
    const validDirs = watchDirs.filter((dir) => dir && typeof dir === 'string');

    if (validDirs.length === 0) {
      if (verbose) {
        // biome-ignore lint/suspicious/noConsole: Intentional verbose logging for debugging
        console.log('[FileWatcher] No valid directories to watch');
      }
      return;
    }

    if (verbose) {
      // biome-ignore lint/suspicious/noConsole: Intentional verbose logging for debugging
      console.log(`[FileWatcher] Starting watcher for: ${validDirs.join(', ')}`);
    }

    // Initialize chokidar watcher
    this.watcher = chokidar.watch(validDirs, {
      // Ignore node_modules, .git, and dist directories
      ignored: /(node_modules|\.git|dist)/,
      // Keep watching even when the process is running
      persistent: true,
      // Don't fire events for existing files on startup
      ignoreInitial: true,
    });

    // Create debounced emit function
    const debouncedEmit = (event: FileChangeEvent) => {
      // Store event by path, keeping the latest event for each path
      this.pendingEvents.set(event.path, event);

      // Clear existing timeout
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
      }

      // Set new timeout to emit deduplicated events
      this.debounceTimeout = setTimeout(() => {
        const events = Array.from(this.pendingEvents.values());
        this.pendingEvents.clear();
        this.debounceTimeout = null;

        // Emit each deduplicated event (one per unique path)
        for (const evt of events) {
          if (verbose) {
            // biome-ignore lint/suspicious/noConsole: Intentional verbose logging for debugging
            console.log(`[FileWatcher] File ${evt.type}: ${evt.path}`);
          }
          this.emit('change', evt);
        }
      }, debounceMs);
    };

    // Register event listeners
    this.watcher.on('add', (path: string) => {
      debouncedEmit({ path, type: 'add' });
    });

    this.watcher.on('change', (path: string) => {
      debouncedEmit({ path, type: 'change' });
    });

    this.watcher.on('unlink', (path: string) => {
      debouncedEmit({ path, type: 'unlink' });
    });

    // Handle watcher errors
    this.watcher.on('error', (error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error));
      if (verbose) {
        // biome-ignore lint/suspicious/noConsole: Intentional error logging for debugging
        console.error(`[FileWatcher] Error: ${err.message}`);
      }
      this.emit('error', err);
    });
  }

  /**
   * Stops the file watcher and releases all resources.
   *
   * This method should be called when the plugin is shutting down
   * to prevent memory leaks and release file handles.
   */
  async stop(): Promise<void> {
    // Clear any pending debounce timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }

    // Clear pending events
    this.pendingEvents.clear();

    // Close the chokidar watcher
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * Returns whether the watcher is currently running.
   */
  isWatching(): boolean {
    return this.watcher !== null;
  }
}

/**
 * Factory function to create a new FileWatcher instance.
 *
 * @returns A new FileWatcher instance
 *
 * @example
 * ```typescript
 * const watcher = createFileWatcher();
 * watcher.on('change', handleFileChange);
 * watcher.start({ watchDirs: ['./src/handlers'] });
 * ```
 */
export function createFileWatcher(): FileWatcher {
  return new FileWatcher();
}
