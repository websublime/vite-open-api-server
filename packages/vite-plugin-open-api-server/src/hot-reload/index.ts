/**
 * Hot Reload Module
 *
 * Re-exports all hot reload utilities for file watching and automatic reloading.
 *
 * @module
 */

export type { FileChangeEvent, FileWatcherOptions } from './file-watcher.js';
export { createFileWatcher, FileWatcher } from './file-watcher.js';

export type { HotReloadContext, HotReloadResult, HotReloadState } from './hot-reload-handler.js';
export {
  clearModuleCache,
  createHotReloadState,
  handleFileChange,
  normalizePath,
} from './hot-reload-handler.js';
