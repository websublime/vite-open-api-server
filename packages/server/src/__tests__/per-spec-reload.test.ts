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

import type { OpenAPIV3_1 } from '@scalar/openapi-types';
import type { HandlerFn, OpenApiServer, Store } from '@websublime/vite-plugin-open-api-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reloadSpecHandlers, reloadSpecSeeds } from '../hot-reload.js';
import type { SpecInstance } from '../orchestrator.js';
import type { ResolvedOptions } from '../types.js';
import { createMockLogger, createMockViteServer, createMockWebSocketHub } from './test-utils.js';

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

// Import the mocked modules to configure return values
const { loadHandlers } = await import('../handlers.js');
const { loadSeeds } = await import('../seeds.js');

const mockedLoadHandlers = vi.mocked(loadHandlers);
const mockedLoadSeeds = vi.mocked(loadSeeds);

// =============================================================================
// Test Fixtures
// =============================================================================

/** Minimal OpenAPI document for testing */
function makeTestDocument(title: string): OpenAPIV3_1.Document {
  return {
    openapi: '3.1.0',
    info: { title, version: '1.0.0' },
    paths: {},
  };
}

/** Create a mock Store with tracked method calls */
function createMockStore(): Store {
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
  } as unknown as Store;
}

/** Create a mock OpenApiServer with tracking */
function createMockOpenApiServer(specId: string): OpenApiServer {
  const store = createMockStore();
  const wsHub = createMockWebSocketHub();

  return {
    app: {} as OpenApiServer['app'],
    store,
    registry: {} as OpenApiServer['registry'],
    document: makeTestDocument(`${specId} API`),
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
  const mockVite = createMockViteServer();
  const cwd = '/test/project';

  beforeEach(() => {
    vi.clearAllMocks();
    specA = createTestSpecInstance('spec-a');
    specB = createTestSpecInstance('spec-b');
    options = createTestOptions();
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

    it('should only broadcast to the targeted spec wsHub', async () => {
      mockedLoadHandlers.mockResolvedValue({
        handlers: new Map(),
        fileCount: 0,
        files: [],
      });

      await reloadSpecHandlers(specA, mockVite, cwd, options);

      // Spec A wsHub should have broadcast called
      expect(specA.server.wsHub.broadcast).toHaveBeenCalledTimes(1);
      expect(specA.server.wsHub.broadcast).toHaveBeenCalledWith({
        type: 'handlers:updated',
        data: { count: 0 },
      });

      // Spec B wsHub should NOT have broadcast called
      expect(specB.server.wsHub.broadcast).not.toHaveBeenCalled();
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

      // Each spec broadcast independently
      expect(specA.server.wsHub.broadcast).toHaveBeenCalledWith({
        type: 'handlers:updated',
        data: { count: 1 },
      });
      expect(specB.server.wsHub.broadcast).toHaveBeenCalledWith({
        type: 'handlers:updated',
        data: { count: 2 },
      });
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
});
