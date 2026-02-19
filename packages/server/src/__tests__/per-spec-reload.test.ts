/**
 * Per-Spec Reload Isolation Tests
 *
 * What: Tests that handler/seed reload for one spec does not affect another
 * How: Creates mock SpecInstances with tracked method calls, invokes reload functions
 * Why: Ensures per-spec isolation — the core requirement of Epic 2 (Task 2.1)
 *
 * @see Task 2.1.4: Test handler reload isolation
 * @see Task 2.1.5: Test seed reload isolation
 */

import type { HandlerFn, OpenApiServer, Store } from '@websublime/vite-plugin-open-api-core';
import { executeSeeds } from '@websublime/vite-plugin-open-api-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { printError, printReloadNotification } from '../banner.js';
import { loadHandlers } from '../handlers.js';
import { createPerSpecFileWatchers, reloadSpecHandlers, reloadSpecSeeds } from '../hot-reload.js';
import type { SpecInstance } from '../orchestrator.js';
import { loadSeeds } from '../seeds.js';
import type { ResolvedOptions } from '../types.js';
import {
  createMockLogger,
  createMockViteServer,
  createMockWebSocketHub,
  makeDocument,
} from './test-utils.js';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock the handler and seed loaders so no real FS or Vite SSR is needed
vi.mock('../handlers.js', () => ({
  loadHandlers: vi.fn(),
  getHandlerFiles: vi.fn(),
}));

vi.mock('../seeds.js', () => ({
  loadSeeds: vi.fn(),
  getSeedFiles: vi.fn(),
}));

// Mock executeSeeds from core (called by reloadSpecSeeds)
vi.mock('@websublime/vite-plugin-open-api-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@websublime/vite-plugin-open-api-core')>();
  return {
    ...actual,
    executeSeeds: vi.fn(),
  };
});

// Mock banner to prevent console output
vi.mock('../banner.js', () => ({
  printReloadNotification: vi.fn(),
  printError: vi.fn(),
}));

// Vitest hoists vi.mock() above imports, so the static imports above
// resolve to the mocked versions. vi.mocked() provides type-safe access.
const mockedLoadHandlers = vi.mocked(loadHandlers);
const mockedLoadSeeds = vi.mocked(loadSeeds);
const mockedExecuteSeeds = vi.mocked(executeSeeds);
const mockedPrintError = vi.mocked(printError);
const mockedPrintReloadNotification = vi.mocked(printReloadNotification);

// =============================================================================
// Test Fixtures
// =============================================================================

/** Mock Store interface for type-safe mocking */
interface MockStore extends Store {
  create: ReturnType<typeof vi.fn>;
  getAll: ReturnType<typeof vi.fn>;
  getById: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  clearAll: ReturnType<typeof vi.fn>;
  clearSchema: ReturnType<typeof vi.fn>;
  hasSchema: ReturnType<typeof vi.fn>;
  getSchemas: ReturnType<typeof vi.fn>;
  getCount: ReturnType<typeof vi.fn>;
  setIdField: ReturnType<typeof vi.fn>;
  getIdField: ReturnType<typeof vi.fn>;
}

/** Create a mock Store with tracked method calls */
function createMockStore(): MockStore {
  return {
    create: vi.fn(),
    getAll: vi.fn().mockReturnValue([]),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    clearAll: vi.fn(),
    clearSchema: vi.fn(),
    hasSchema: vi.fn().mockReturnValue(false),
    getSchemas: vi.fn().mockReturnValue([]),
    getCount: vi.fn().mockReturnValue(0),
    setIdField: vi.fn(),
    getIdField: vi.fn().mockReturnValue('id'),
  } as unknown as MockStore;
}

/** Create a mock OpenApiServer with tracking */
function createMockOpenApiServer(specId: string): OpenApiServer {
  const store = createMockStore();
  const wsHub = createMockWebSocketHub();

  return {
    app: {} as OpenApiServer['app'],
    store,
    registry: {} as OpenApiServer['registry'],
    document: makeDocument({ title: `${specId} API` }),
    wsHub,
    simulationManager: {} as OpenApiServer['simulationManager'],
    start: vi.fn(),
    stop: vi.fn(),
    updateHandlers: vi.fn(),
    updateSeeds: vi.fn(),
    getTimeline: vi.fn().mockReturnValue([]),
    clearTimeline: vi.fn().mockReturnValue(0),
    truncateTimeline: vi.fn().mockReturnValue(0),
    port: 0,
  } as unknown as OpenApiServer;
}

/** Create a SpecInstance for testing */
function createTestSpecInstance(id: string): SpecInstance {
  return {
    id,
    info: {
      id,
      title: `${id} API`,
      version: '1.0.0',
      proxyPath: `/${id}/v1`,
      color: '#4ade80',
      endpointCount: 1,
      schemaCount: 0,
    },
    server: createMockOpenApiServer(id),
    config: {
      spec: 'inline',
      id,
      proxyPath: `/${id}/v1`,
      proxyPathSource: 'explicit' as const,
      handlersDir: `./mocks/${id}/handlers`,
      seedsDir: `./mocks/${id}/seeds`,
      idFields: {},
    },
  };
}

/** Create resolved options for testing */
function createTestOptions(): ResolvedOptions {
  return {
    specs: [],
    port: 4999,
    enabled: true,
    timelineLimit: 100,
    devtools: false,
    cors: false,
    corsOrigin: '*',
    silent: false,
    logger: createMockLogger(),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('Per-Spec Reload Isolation', () => {
  let specA: SpecInstance;
  let specB: SpecInstance;
  let options: ResolvedOptions;
  let mockVite: ReturnType<typeof createMockViteServer>;
  const cwd = '/test/project';

  beforeEach(() => {
    vi.clearAllMocks();
    specA = createTestSpecInstance('spec-a');
    specB = createTestSpecInstance('spec-b');
    options = createTestOptions();
    mockVite = createMockViteServer();
  });

  // --------------------------------------------------------------------------
  // 2.1.4: Handler reload isolation
  // --------------------------------------------------------------------------

  describe('reloadSpecHandlers isolation', () => {
    it('should only update handlers on the targeted spec', async () => {
      const newHandlers = new Map<string, HandlerFn>([
        ['GET /pets', vi.fn() as unknown as HandlerFn],
      ]);

      mockedLoadHandlers.mockResolvedValue({
        handlers: newHandlers,
        fileCount: 1,
        files: ['pets.handlers.ts'],
      });

      await reloadSpecHandlers(specA, mockVite, cwd, options);

      // Spec A should have updateHandlers called
      expect(specA.server.updateHandlers).toHaveBeenCalledTimes(1);
      expect(specA.server.updateHandlers).toHaveBeenCalledWith(newHandlers);

      // Spec B should NOT have updateHandlers called
      expect(specB.server.updateHandlers).not.toHaveBeenCalled();
    });

    it('should print reload notification on success', async () => {
      const newHandlers = new Map<string, HandlerFn>([
        ['GET /pets', vi.fn() as unknown as HandlerFn],
      ]);

      mockedLoadHandlers.mockResolvedValue({
        handlers: newHandlers,
        fileCount: 1,
        files: ['pets.handlers.ts'],
      });

      await reloadSpecHandlers(specA, mockVite, cwd, options);

      expect(mockedPrintReloadNotification).toHaveBeenCalledWith('handlers', 1, options);
    });

    it('should load handlers from the correct spec directory', async () => {
      mockedLoadHandlers.mockResolvedValue({
        handlers: new Map(),
        fileCount: 0,
        files: [],
      });

      await reloadSpecHandlers(specA, mockVite, cwd, options);

      // Should load from spec A's handlersDir
      expect(mockedLoadHandlers).toHaveBeenCalledWith(
        './mocks/spec-a/handlers',
        mockVite,
        cwd,
        expect.anything(),
      );
    });

    it('should not affect spec B when reloading spec A handlers', async () => {
      // Set up spec A to return 3 handlers
      const specAHandlers = new Map<string, HandlerFn>([
        ['GET /a1', vi.fn() as unknown as HandlerFn],
        ['GET /a2', vi.fn() as unknown as HandlerFn],
        ['POST /a3', vi.fn() as unknown as HandlerFn],
      ]);

      mockedLoadHandlers.mockResolvedValue({
        handlers: specAHandlers,
        fileCount: 1,
        files: ['a.handlers.ts'],
      });

      await reloadSpecHandlers(specA, mockVite, cwd, options);

      // Verify spec B is completely untouched
      expect(specB.server.updateHandlers).not.toHaveBeenCalled();
      expect(specB.server.wsHub.broadcast).not.toHaveBeenCalled();
      expect(specB.server.store.clearAll).not.toHaveBeenCalled();
    });

    it('should handle errors without affecting other specs', async () => {
      mockedLoadHandlers.mockRejectedValue(new Error('Handler load failed'));

      await reloadSpecHandlers(specA, mockVite, cwd, options);

      // Error should be reported with spec ID
      expect(mockedPrintError).toHaveBeenCalledWith(
        expect.stringContaining('spec-a'),
        expect.any(Error),
        options,
      );

      // No reload notification on error
      expect(mockedPrintReloadNotification).not.toHaveBeenCalled();

      // Even with an error, spec B should be untouched
      expect(specB.server.updateHandlers).not.toHaveBeenCalled();
      expect(specB.server.wsHub.broadcast).not.toHaveBeenCalled();
    });

    it('should reload two specs independently', async () => {
      const specAHandlers = new Map<string, HandlerFn>([
        ['GET /pets', vi.fn() as unknown as HandlerFn],
      ]);
      const specBHandlers = new Map<string, HandlerFn>([
        ['GET /items', vi.fn() as unknown as HandlerFn],
        ['POST /items', vi.fn() as unknown as HandlerFn],
      ]);

      // Reload spec A
      mockedLoadHandlers.mockResolvedValueOnce({
        handlers: specAHandlers,
        fileCount: 1,
        files: ['pets.handlers.ts'],
      });
      await reloadSpecHandlers(specA, mockVite, cwd, options);

      // Reload spec B
      mockedLoadHandlers.mockResolvedValueOnce({
        handlers: specBHandlers,
        fileCount: 1,
        files: ['items.handlers.ts'],
      });
      await reloadSpecHandlers(specB, mockVite, cwd, options);

      // Each spec updated independently with its own handlers
      expect(specA.server.updateHandlers).toHaveBeenCalledWith(specAHandlers);
      expect(specB.server.updateHandlers).toHaveBeenCalledWith(specBHandlers);
    });
  });

  // --------------------------------------------------------------------------
  // 2.1.5: Seed reload isolation
  // --------------------------------------------------------------------------

  describe('reloadSpecSeeds isolation', () => {
    it('should only clear and repopulate the targeted spec store', async () => {
      const newSeeds = new Map<string, unknown[]>([['Pet', [{ id: 1, name: 'Rex' }]]]);

      mockedLoadSeeds.mockResolvedValue({
        seeds: newSeeds,
        fileCount: 1,
        files: ['pets.seeds.ts'],
      });

      await reloadSpecSeeds(specA, mockVite, cwd, options);

      // Spec A store should be cleared
      expect(specA.server.store.clearAll).toHaveBeenCalledTimes(1);

      // executeSeeds should be called with the new seeds, spec A's store and document
      expect(mockedExecuteSeeds).toHaveBeenCalledTimes(1);
      expect(mockedExecuteSeeds).toHaveBeenCalledWith(
        newSeeds,
        specA.server.store,
        specA.server.document,
      );

      // Spec B store should NOT be cleared
      expect(specB.server.store.clearAll).not.toHaveBeenCalled();
    });

    it('should only broadcast to the targeted spec wsHub', async () => {
      mockedLoadSeeds.mockResolvedValue({
        seeds: new Map(),
        fileCount: 0,
        files: [],
      });

      await reloadSpecSeeds(specA, mockVite, cwd, options);

      // Spec A wsHub should have broadcast called
      expect(specA.server.wsHub.broadcast).toHaveBeenCalledTimes(1);
      expect(specA.server.wsHub.broadcast).toHaveBeenCalledWith({
        type: 'seeds:updated',
        data: { count: 0 },
      });

      // Spec B wsHub should NOT have broadcast called
      expect(specB.server.wsHub.broadcast).not.toHaveBeenCalled();
    });

    it('should print reload notification on success with seeds', async () => {
      const newSeeds = new Map<string, unknown[]>([['Pet', [{ id: 1, name: 'Rex' }]]]);

      mockedLoadSeeds.mockResolvedValue({
        seeds: newSeeds,
        fileCount: 1,
        files: ['pets.seeds.ts'],
      });

      await reloadSpecSeeds(specA, mockVite, cwd, options);

      expect(mockedPrintReloadNotification).toHaveBeenCalledWith('seeds', 1, options);
    });

    it('should not print reload notification when no seeds are loaded', async () => {
      mockedLoadSeeds.mockResolvedValue({
        seeds: new Map(),
        fileCount: 0,
        files: [],
      });

      await reloadSpecSeeds(specA, mockVite, cwd, options);

      expect(mockedPrintReloadNotification).not.toHaveBeenCalled();
    });

    it('should load seeds from the correct spec directory', async () => {
      mockedLoadSeeds.mockResolvedValue({
        seeds: new Map(),
        fileCount: 0,
        files: [],
      });

      await reloadSpecSeeds(specA, mockVite, cwd, options);

      // Should load from spec A's seedsDir
      expect(mockedLoadSeeds).toHaveBeenCalledWith(
        './mocks/spec-a/seeds',
        mockVite,
        cwd,
        expect.anything(),
      );
    });

    it('should not affect spec B store when reloading spec A seeds', async () => {
      const specASeeds = new Map<string, unknown[]>([
        ['Pet', [{ id: 1, name: 'Rex' }]],
        ['Owner', [{ id: 1, name: 'Alice' }]],
      ]);

      mockedLoadSeeds.mockResolvedValue({
        seeds: specASeeds,
        fileCount: 1,
        files: ['pets.seeds.ts'],
      });

      await reloadSpecSeeds(specA, mockVite, cwd, options);

      // Verify spec B is completely untouched
      expect(specB.server.store.clearAll).not.toHaveBeenCalled();
      expect(specB.server.wsHub.broadcast).not.toHaveBeenCalled();
      expect(specB.server.updateHandlers).not.toHaveBeenCalled();
    });

    it('should clear store even when no seeds are loaded', async () => {
      mockedLoadSeeds.mockResolvedValue({
        seeds: new Map(),
        fileCount: 0,
        files: [],
      });

      await reloadSpecSeeds(specA, mockVite, cwd, options);

      // Store should still be cleared (empty seeds = clear all data)
      expect(specA.server.store.clearAll).toHaveBeenCalledTimes(1);
    });

    it('should handle errors without affecting other specs', async () => {
      mockedLoadSeeds.mockRejectedValue(new Error('Seed load failed'));

      await reloadSpecSeeds(specA, mockVite, cwd, options);

      // Error should be reported with spec ID
      expect(mockedPrintError).toHaveBeenCalledWith(
        expect.stringContaining('spec-a'),
        expect.any(Error),
        options,
      );

      // No reload notification on error
      expect(mockedPrintReloadNotification).not.toHaveBeenCalled();

      // Even with an error, spec B should be untouched
      expect(specB.server.store.clearAll).not.toHaveBeenCalled();
      expect(specB.server.wsHub.broadcast).not.toHaveBeenCalled();
    });

    it('should reload two specs independently', async () => {
      const specASeeds = new Map<string, unknown[]>([['Pet', [{ id: 1, name: 'Rex' }]]]);
      const specBSeeds = new Map<string, unknown[]>([
        ['Item', [{ id: 1, sku: 'A001' }]],
        ['Category', [{ id: 1, name: 'Tools' }]],
      ]);

      // Reload spec A
      mockedLoadSeeds.mockResolvedValueOnce({
        seeds: specASeeds,
        fileCount: 1,
        files: ['pets.seeds.ts'],
      });
      await reloadSpecSeeds(specA, mockVite, cwd, options);

      // Reload spec B
      mockedLoadSeeds.mockResolvedValueOnce({
        seeds: specBSeeds,
        fileCount: 1,
        files: ['items.seeds.ts'],
      });
      await reloadSpecSeeds(specB, mockVite, cwd, options);

      // Each spec cleared independently
      expect(specA.server.store.clearAll).toHaveBeenCalledTimes(1);
      expect(specB.server.store.clearAll).toHaveBeenCalledTimes(1);

      // Each spec broadcast independently
      expect(specA.server.wsHub.broadcast).toHaveBeenCalledWith({
        type: 'seeds:updated',
        data: { count: 1 },
      });
      expect(specB.server.wsHub.broadcast).toHaveBeenCalledWith({
        type: 'seeds:updated',
        data: { count: 2 },
      });
    });
  });

  // --------------------------------------------------------------------------
  // Cross-concern isolation
  // --------------------------------------------------------------------------

  describe('cross-concern isolation', () => {
    it('should not touch store when reloading handlers', async () => {
      mockedLoadHandlers.mockResolvedValue({
        handlers: new Map(),
        fileCount: 0,
        files: [],
      });

      await reloadSpecHandlers(specA, mockVite, cwd, options);

      // Handler reload should not clear or modify the store
      expect(specA.server.store.clearAll).not.toHaveBeenCalled();
    });

    it('should not touch handlers when reloading seeds', async () => {
      mockedLoadSeeds.mockResolvedValue({
        seeds: new Map(),
        fileCount: 0,
        files: [],
      });

      await reloadSpecSeeds(specA, mockVite, cwd, options);

      // Seed reload should not update handlers
      expect(specA.server.updateHandlers).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // executeSeeds failure handling
  // --------------------------------------------------------------------------

  describe('reloadSpecSeeds executeSeeds failure', () => {
    it('should warn about empty store when executeSeeds throws', async () => {
      const newSeeds = new Map<string, unknown[]>([['Pet', [{ id: 1, name: 'Rex' }]]]);

      mockedLoadSeeds.mockResolvedValue({
        seeds: newSeeds,
        fileCount: 1,
        files: ['pets.seeds.ts'],
      });
      mockedExecuteSeeds.mockRejectedValue(new Error('Seed execution failed'));

      await reloadSpecSeeds(specA, mockVite, cwd, options);

      // Store should have been cleared (before executeSeeds was attempted)
      expect(specA.server.store.clearAll).toHaveBeenCalledTimes(1);

      // executeSeeds should have been called (and then failed)
      expect(mockedExecuteSeeds).toHaveBeenCalledTimes(1);

      // printError should be called with a message about the store being empty
      expect(mockedPrintError).toHaveBeenCalledWith(
        expect.stringContaining('store is now empty'),
        expect.any(Error),
        options,
      );

      // Should broadcast with count 0 to reflect the cleared state
      expect(specA.server.wsHub.broadcast).toHaveBeenCalledWith({
        type: 'seeds:updated',
        data: { count: 0 },
      });

      // No reload notification on executeSeeds failure
      expect(mockedPrintReloadNotification).not.toHaveBeenCalled();
    });

    it('should not affect spec B when executeSeeds fails for spec A', async () => {
      mockedLoadSeeds.mockResolvedValue({
        seeds: new Map<string, unknown[]>([['Pet', [{ id: 1 }]]]),
        fileCount: 1,
        files: ['pets.seeds.ts'],
      });
      mockedExecuteSeeds.mockRejectedValue(new Error('Seed execution failed'));

      await reloadSpecSeeds(specA, mockVite, cwd, options);

      // Spec B should be completely untouched
      expect(specB.server.store.clearAll).not.toHaveBeenCalled();
      expect(specB.server.wsHub.broadcast).not.toHaveBeenCalled();
    });
  });
});

// =============================================================================
// createPerSpecFileWatchers Tests
//
// These tests mock chokidar at the module level so the real createFileWatcher
// runs but its underlying FSWatcher is controlled. This avoids the same-module
// mock limitation (vi.mock cannot intercept internal function calls).
// =============================================================================

// Track mock FSWatcher instances created by chokidar.watch().
// IMPORTANT: All three variables below must be reset in beforeEach
// for proper test isolation — the vi.mock factory closes over them.
let mockFSWatchers: Array<{
  on: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}> = [];
let watchCallCount = 0;
let watchShouldFailAtIndex = -1;

vi.mock('chokidar', () => ({
  watch: vi.fn((..._args: unknown[]) => {
    const currentIndex = watchCallCount++;

    if (currentIndex === watchShouldFailAtIndex) {
      throw new Error('Chokidar init failed');
    }

    const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
    const mockWatcher = {
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        const existing = listeners.get(event) ?? [];
        existing.push(cb);
        listeners.set(event, existing);

        // Immediately emit 'ready' so the watcher resolves
        if (event === 'ready') {
          queueMicrotask(() => cb());
        }
        return mockWatcher;
      }),
      close: vi.fn().mockResolvedValue(undefined),
      _listeners: listeners,
    };
    mockFSWatchers.push(mockWatcher);
    return mockWatcher;
  }),
}));

describe('createPerSpecFileWatchers', () => {
  let options: ResolvedOptions;
  let mockVite: ReturnType<typeof createMockViteServer>;
  const cwd = '/test/project';

  beforeEach(() => {
    vi.clearAllMocks();
    mockFSWatchers = [];
    watchCallCount = 0;
    watchShouldFailAtIndex = -1;
    mockVite = createMockViteServer();
    options = {
      specs: [],
      port: 4999,
      enabled: true,
      timelineLimit: 100,
      devtools: false,
      cors: false,
      corsOrigin: '*',
      silent: false,
      logger: createMockLogger(),
    };
  });

  it('should return one FileWatcher per spec instance', async () => {
    const instances = [createTestSpecInstance('spec-a'), createTestSpecInstance('spec-b')];

    const watchers = await createPerSpecFileWatchers(instances, mockVite, cwd, options);

    expect(watchers).toHaveLength(2);
    // Each spec has handlers + seeds dirs → 2 chokidar watchers per FileWatcher
    // So 2 specs × 2 dirs = 4 FSWatcher instances
    expect(mockFSWatchers).toHaveLength(4);
  });

  it('should create watchers with correct spec directories', async () => {
    const { watch } = await import('chokidar');
    const mockedWatch = vi.mocked(watch);

    const instances = [createTestSpecInstance('spec-a')];

    await createPerSpecFileWatchers(instances, mockVite, cwd, options);

    // createFileWatcher creates one watcher per dir (handlers + seeds)
    // chokidar v5: watch() receives the absolute directory path (not a glob)
    expect(mockedWatch).toHaveBeenCalledTimes(2);
    expect(mockedWatch).toHaveBeenCalledWith(
      expect.stringContaining('mocks/spec-a/handlers'),
      expect.objectContaining({
        ignoreInitial: true,
        ignored: expect.any(Function),
      }),
    );
    expect(mockedWatch).toHaveBeenCalledWith(
      expect.stringContaining('mocks/spec-a/seeds'),
      expect.objectContaining({
        ignoreInitial: true,
        ignored: expect.any(Function),
      }),
    );
  });

  it('should return empty array for zero instances', async () => {
    const watchers = await createPerSpecFileWatchers([], mockVite, cwd, options);

    expect(watchers).toEqual([]);
    expect(mockFSWatchers).toHaveLength(0);
  });

  it('should clean up already-created watchers on partial failure', async () => {
    const instances = [
      createTestSpecInstance('spec-a'),
      createTestSpecInstance('spec-b'),
      createTestSpecInstance('spec-c'),
    ];

    // With parallel creation (Promise.allSettled), all specs start concurrently.
    // spec-a creates 2 FSWatchers (indices 0,1), spec-b creates 2 (indices 2,3)
    // spec-c's first FSWatcher (index 4) fails
    watchShouldFailAtIndex = 4;

    await expect(createPerSpecFileWatchers(instances, mockVite, cwd, options)).rejects.toThrow(
      'Chokidar init failed',
    );

    // The 4 FSWatchers from spec-a and spec-b should have been closed during cleanup
    // (cleanup calls FileWatcher.close() which closes the underlying FSWatchers)
    expect(mockFSWatchers).toHaveLength(4);
    for (const watcher of mockFSWatchers) {
      expect(watcher.close).toHaveBeenCalledTimes(1);
    }
  });

  it('should re-throw the original error after cleanup', async () => {
    const instances = [createTestSpecInstance('spec-a')];

    // First FSWatcher (index 0) fails immediately
    watchShouldFailAtIndex = 0;

    await expect(createPerSpecFileWatchers(instances, mockVite, cwd, options)).rejects.toThrow(
      'Chokidar init failed',
    );
  });
});
