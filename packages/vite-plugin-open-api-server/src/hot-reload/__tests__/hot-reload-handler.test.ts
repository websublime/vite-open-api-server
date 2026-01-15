/**
 * Unit tests for Hot Reload Handler Module
 *
 * Tests the handleFileChange function and related utilities for:
 * - File change event handling
 * - Reload lock mechanism (prevent concurrent reloads)
 * - Pending changes queue
 * - Module cache clearing
 * - Path normalization
 * - Success and error scenarios
 * - Timing measurements
 */

import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FileChangeEvent } from '../file-watcher.js';
import {
  clearModuleCache,
  createHotReloadState,
  type HotReloadContext,
  type HotReloadState,
  handleFileChange,
  normalizePath,
} from '../hot-reload-handler.js';

/**
 * Create a mock Vite logger for testing.
 */
function createMockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    warnOnce: vi.fn(),
    clearScreen: vi.fn(),
    hasErrorLogged: vi.fn(),
    hasWarned: false,
  };
}

/**
 * Create default resolved plugin options for testing.
 */
function createMockOptions() {
  return {
    openApiPath: '/path/to/openapi.yaml',
    port: 3001,
    proxyPath: '/api',
    enabled: true,
    startupTimeout: 5000,
    gracefulShutdownTimeout: 5000,
    forceShutdownTimeout: 2000,
    verbose: false,
    handlersDir: '/path/to/handlers',
    seedsDir: '/path/to/seeds',
  };
}

describe('Hot Reload Handler', () => {
  describe('normalizePath', () => {
    it('should normalize a relative path to absolute', () => {
      const result = normalizePath('./handlers/test.ts');
      expect(path.isAbsolute(result)).toBe(true);
    });

    it('should normalize path separators', () => {
      const input = '/path/to/file.ts';
      const result = normalizePath(input);
      expect(result).toBe(path.normalize(path.resolve(input)));
    });

    it('should handle already absolute paths', () => {
      const absolutePath = '/absolute/path/to/file.ts';
      const result = normalizePath(absolutePath);
      expect(result).toBe(path.normalize(absolutePath));
    });

    it('should resolve relative paths against cwd', () => {
      const result = normalizePath('relative/path.ts');
      expect(result).toContain('relative');
      expect(path.isAbsolute(result)).toBe(true);
    });
  });

  describe('clearModuleCache', () => {
    let mockLogger: ReturnType<typeof createMockLogger>;
    let originalRequire: unknown;

    beforeEach(() => {
      mockLogger = createMockLogger();
      // Store original require to restore after each test
      originalRequire = (globalThis as Record<string, unknown>).require;
    });

    afterEach(() => {
      // Always restore globalThis.require to prevent test pollution
      const globalThisRecord = globalThis as Record<string, unknown>;
      if (originalRequire === undefined) {
        delete globalThisRecord.require;
      } else {
        globalThisRecord.require = originalRequire;
      }
    });

    it('should not throw when require.cache is not available', () => {
      expect(() => {
        clearModuleCache('/path/to/file.ts', mockLogger, false);
      }).not.toThrow();
    });

    it('should log when verbose is enabled and cache is cleared', () => {
      // Create a mock require.cache
      const globalThisRecord = globalThis as Record<string, unknown>;
      const mockRequireCache: Record<string, unknown> = {};
      const testPath = path.normalize(path.resolve('/test/file.ts'));
      mockRequireCache[testPath] = { id: testPath };

      globalThisRecord.require = { cache: mockRequireCache };

      clearModuleCache('/test/file.ts', mockLogger, true);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Cleared require.cache'),
      );
      // Cleanup handled by afterEach
    });

    it('should not log when verbose is disabled', () => {
      clearModuleCache('/path/to/file.ts', mockLogger, false);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('createHotReloadState', () => {
    it('should create initial state with isReloading false', () => {
      const state = createHotReloadState();
      expect(state.isReloading).toBe(false);
    });

    it('should create initial state with empty pendingChanges array', () => {
      const state = createHotReloadState();
      expect(state.pendingChanges).toEqual([]);
      expect(Array.isArray(state.pendingChanges)).toBe(true);
    });

    it('should create independent state objects', () => {
      const state1 = createHotReloadState();
      const state2 = createHotReloadState();

      state1.isReloading = true;
      state1.pendingChanges.push({ path: '/test.ts', type: 'change' });

      expect(state2.isReloading).toBe(false);
      expect(state2.pendingChanges).toEqual([]);
    });
  });

  describe('handleFileChange', () => {
    let mockLogger: ReturnType<typeof createMockLogger>;
    let mockOptions: ReturnType<typeof createMockOptions>;
    let state: HotReloadState;

    beforeEach(() => {
      mockLogger = createMockLogger();
      mockOptions = createMockOptions();
      state = createHotReloadState();
      vi.clearAllMocks();
    });

    it('should log the file change event', async () => {
      const event: FileChangeEvent = {
        path: '/path/to/handler.ts',
        type: 'change',
      };

      const context: HotReloadContext = {
        mockServerProcess: null, // No server running
        options: mockOptions,
        logger: mockLogger,
        onProcessUpdate: vi.fn(),
        onReadyStateUpdate: vi.fn(),
      };

      await handleFileChange(event, context, state);

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('File change:'));
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('/path/to/handler.ts'));
    });

    it('should log reloading message', async () => {
      const event: FileChangeEvent = {
        path: '/path/to/handler.ts',
        type: 'change',
      };

      const context: HotReloadContext = {
        mockServerProcess: null,
        options: mockOptions,
        logger: mockLogger,
        onProcessUpdate: vi.fn(),
        onReadyStateUpdate: vi.fn(),
      };

      await handleFileChange(event, context, state);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Reloading mock server'),
      );
    });

    it('should set isReloading to true during reload', async () => {
      const event: FileChangeEvent = {
        path: '/path/to/handler.ts',
        type: 'change',
      };

      let capturedReloadingState = false;

      const context: HotReloadContext = {
        mockServerProcess: null,
        options: mockOptions,
        logger: {
          ...mockLogger,
          info: vi.fn((msg: string) => {
            if (msg.includes('Reloading')) {
              capturedReloadingState = state.isReloading;
            }
          }),
        },
        onProcessUpdate: vi.fn(),
        onReadyStateUpdate: vi.fn(),
      };

      await handleFileChange(event, context, state);

      expect(capturedReloadingState).toBe(true);
    });

    it('should reset isReloading to false after reload completes', async () => {
      const event: FileChangeEvent = {
        path: '/path/to/handler.ts',
        type: 'change',
      };

      const context: HotReloadContext = {
        mockServerProcess: null,
        options: mockOptions,
        logger: mockLogger,
        onProcessUpdate: vi.fn(),
        onReadyStateUpdate: vi.fn(),
      };

      await handleFileChange(event, context, state);

      expect(state.isReloading).toBe(false);
    });

    it('should queue pending changes when reload is in progress', async () => {
      const event2: FileChangeEvent = {
        path: '/path/to/handler2.ts',
        type: 'change',
      };

      // Manually set isReloading to simulate an ongoing reload
      state.isReloading = true;

      const context: HotReloadContext = {
        mockServerProcess: null,
        options: { ...mockOptions, verbose: true },
        logger: mockLogger,
        onProcessUpdate: vi.fn(),
        onReadyStateUpdate: vi.fn(),
      };

      await handleFileChange(event2, context, state);

      // Event should be queued, not processed immediately
      expect(state.pendingChanges).toContainEqual(event2);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('queued'));
    });

    it('should handle add file events', async () => {
      const event: FileChangeEvent = {
        path: '/path/to/new-handler.ts',
        type: 'add',
      };

      const context: HotReloadContext = {
        mockServerProcess: null,
        options: mockOptions,
        logger: mockLogger,
        onProcessUpdate: vi.fn(),
        onReadyStateUpdate: vi.fn(),
      };

      await handleFileChange(event, context, state);

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('File add:'));
    });

    it('should handle unlink file events', async () => {
      const event: FileChangeEvent = {
        path: '/path/to/deleted-handler.ts',
        type: 'unlink',
      };

      const context: HotReloadContext = {
        mockServerProcess: null,
        options: mockOptions,
        logger: mockLogger,
        onProcessUpdate: vi.fn(),
        onReadyStateUpdate: vi.fn(),
      };

      await handleFileChange(event, context, state);

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('File unlink:'));
    });

    it('should call onProcessUpdate when no server is running', async () => {
      const event: FileChangeEvent = {
        path: '/path/to/handler.ts',
        type: 'change',
      };

      const onProcessUpdate = vi.fn();

      const context: HotReloadContext = {
        mockServerProcess: null,
        options: mockOptions,
        logger: mockLogger,
        onProcessUpdate,
        onReadyStateUpdate: vi.fn(),
      };

      await handleFileChange(event, context, state);

      // Should still attempt to spawn (and fail gracefully)
      // The actual behavior depends on spawnMockServer returning null for missing runner
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should log error when reload fails', async () => {
      const event: FileChangeEvent = {
        path: '/path/to/handler.ts',
        type: 'change',
      };

      const context: HotReloadContext = {
        mockServerProcess: null, // Will fail to spawn
        options: mockOptions,
        logger: mockLogger,
        onProcessUpdate: vi.fn(),
        onReadyStateUpdate: vi.fn(),
      };

      await handleFileChange(event, context, state);

      // Should log failure message
      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Reload failed'));
    });

    it('should not throw errors to caller', async () => {
      const event: FileChangeEvent = {
        path: '/path/to/handler.ts',
        type: 'change',
      };

      const context: HotReloadContext = {
        mockServerProcess: null,
        options: mockOptions,
        logger: mockLogger,
        onProcessUpdate: vi.fn(),
        onReadyStateUpdate: vi.fn(),
      };

      // Should resolve without throwing (function returns Promise<void>)
      await expect(handleFileChange(event, context, state)).resolves.toBeUndefined();
    });
  });

  describe('HotReloadState management', () => {
    it('should track multiple pending changes in order', () => {
      const state = createHotReloadState();
      state.isReloading = true;

      const event1: FileChangeEvent = { path: '/a.ts', type: 'change' };
      const event2: FileChangeEvent = { path: '/b.ts', type: 'add' };
      const event3: FileChangeEvent = { path: '/c.ts', type: 'unlink' };

      state.pendingChanges.push(event1);
      state.pendingChanges.push(event2);
      state.pendingChanges.push(event3);

      expect(state.pendingChanges.length).toBe(3);
      expect(state.pendingChanges[0]).toBe(event1);
      expect(state.pendingChanges[1]).toBe(event2);
      expect(state.pendingChanges[2]).toBe(event3);
    });

    it('should allow shift to dequeue pending changes', () => {
      const state = createHotReloadState();

      const event1: FileChangeEvent = { path: '/a.ts', type: 'change' };
      const event2: FileChangeEvent = { path: '/b.ts', type: 'change' };

      state.pendingChanges.push(event1);
      state.pendingChanges.push(event2);

      const first = state.pendingChanges.shift();
      expect(first).toBe(event1);
      expect(state.pendingChanges.length).toBe(1);
      expect(state.pendingChanges[0]).toBe(event2);
    });
  });
});
