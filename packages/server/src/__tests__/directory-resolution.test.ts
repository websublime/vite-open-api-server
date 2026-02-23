/**
 * Default Directory Resolution Tests (with Load Verification)
 *
 * What: Verifies that loadHandlers/loadSeeds are called with the final
 *       auto-derived directory paths, not preliminary fallbacks
 * How: Mocks loadHandlers and loadSeeds, then asserts call arguments
 * Why: Ensures processSpec derives the spec ID before loading handlers/seeds,
 *       so the loaded content matches the directories reported in config
 *
 * @see Task 2.3.2: Test default directory paths
 * @see Task 2.3.3: Test explicit directory override
 */

import { describe, expect, it, vi } from 'vitest';
import { createOrchestrator } from '../orchestrator.js';
import { resolveOptions } from '../types.js';
import { createMockLogger, createMockViteServer } from './test-utils.js';

// Mock handler and seed loaders to track call arguments
vi.mock('../handlers.js', () => ({
  loadHandlers: vi.fn().mockResolvedValue({
    handlers: new Map(),
    fileCount: 0,
    files: [],
  }),
  getHandlerFiles: vi.fn(),
}));

vi.mock('../seeds.js', () => ({
  loadSeeds: vi.fn().mockResolvedValue({
    seeds: new Map(),
    fileCount: 0,
    files: [],
  }),
  getSeedFiles: vi.fn(),
}));

// Import mocked modules after vi.mock (Vitest hoists vi.mock above imports)
const { loadHandlers } = await import('../handlers.js');
const { loadSeeds } = await import('../seeds.js');
const mockedLoadHandlers = vi.mocked(loadHandlers);
const mockedLoadSeeds = vi.mocked(loadSeeds);

// =============================================================================
// Test Fixtures
// =============================================================================

const petstoreSpec = JSON.stringify({
  openapi: '3.1.0',
  info: { title: 'Petstore API', version: '1.0.0' },
  servers: [{ url: 'https://api.example.com/pets/v1' }],
  paths: {
    '/pets': {
      get: {
        operationId: 'listPets',
        responses: { '200': { description: 'ok' } },
      },
    },
  },
});

const inventorySpec = JSON.stringify({
  openapi: '3.1.0',
  info: { title: 'Inventory API', version: '2.0.0' },
  servers: [{ url: 'https://api.example.com/inventory/v1' }],
  paths: {
    '/items': {
      get: {
        operationId: 'listItems',
        responses: { '200': { description: 'ok' } },
      },
    },
  },
});

// =============================================================================
// Tests
// =============================================================================

describe('directory resolution: loadHandlers/loadSeeds call paths', () => {
  it('should load handlers from auto-derived directory when id is omitted', async () => {
    mockedLoadHandlers.mockClear();
    mockedLoadSeeds.mockClear();

    const options = resolveOptions({
      specs: [
        {
          spec: petstoreSpec,
          // No explicit id → auto-derives "petstore-api" from "Petstore API"
          proxyPath: '/pets/v1',
        },
      ],
      port: 4999,
      cors: false,
      devtools: false,
      logger: createMockLogger(),
    });

    await createOrchestrator(options, createMockViteServer(), process.cwd());

    // loadHandlers should be called with the auto-derived path, not spec-0
    expect(mockedLoadHandlers).toHaveBeenCalledWith(
      './mocks/petstore-api/handlers',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('should load seeds from auto-derived directory when id is omitted', async () => {
    mockedLoadHandlers.mockClear();
    mockedLoadSeeds.mockClear();

    const options = resolveOptions({
      specs: [
        {
          spec: petstoreSpec,
          proxyPath: '/pets/v1',
        },
      ],
      port: 4999,
      cors: false,
      devtools: false,
      logger: createMockLogger(),
    });

    await createOrchestrator(options, createMockViteServer(), process.cwd());

    expect(mockedLoadSeeds).toHaveBeenCalledWith(
      './mocks/petstore-api/seeds',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('should load from explicit directories when provided', async () => {
    mockedLoadHandlers.mockClear();
    mockedLoadSeeds.mockClear();

    const options = resolveOptions({
      specs: [
        {
          spec: petstoreSpec,
          id: 'petstore',
          proxyPath: '/pets/v1',
          handlersDir: './custom/my-handlers',
          seedsDir: './custom/my-seeds',
        },
      ],
      port: 4999,
      cors: false,
      devtools: false,
      logger: createMockLogger(),
    });

    await createOrchestrator(options, createMockViteServer(), process.cwd());

    expect(mockedLoadHandlers).toHaveBeenCalledWith(
      './custom/my-handlers',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    expect(mockedLoadSeeds).toHaveBeenCalledWith(
      './custom/my-seeds',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('should load from correct directories for multiple specs with omitted ids', async () => {
    mockedLoadHandlers.mockClear();
    mockedLoadSeeds.mockClear();

    const options = resolveOptions({
      specs: [
        { spec: petstoreSpec, proxyPath: '/pets/v1' },
        { spec: inventorySpec, proxyPath: '/inventory/v1' },
      ],
      port: 4999,
      cors: false,
      devtools: false,
      logger: createMockLogger(),
    });

    await createOrchestrator(options, createMockViteServer(), process.cwd());

    // Spec 0: "Petstore API" → "petstore-api"
    expect(mockedLoadHandlers).toHaveBeenCalledWith(
      './mocks/petstore-api/handlers',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    expect(mockedLoadSeeds).toHaveBeenCalledWith(
      './mocks/petstore-api/seeds',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );

    // Spec 1: "Inventory API" → "inventory-api"
    expect(mockedLoadHandlers).toHaveBeenCalledWith(
      './mocks/inventory-api/handlers',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    expect(mockedLoadSeeds).toHaveBeenCalledWith(
      './mocks/inventory-api/seeds',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('should load from slugified explicit id directory', async () => {
    mockedLoadHandlers.mockClear();
    mockedLoadSeeds.mockClear();

    const options = resolveOptions({
      specs: [
        {
          spec: petstoreSpec,
          id: 'My Petstore API',
          proxyPath: '/pets/v1',
        },
      ],
      port: 4999,
      cors: false,
      devtools: false,
      logger: createMockLogger(),
    });

    await createOrchestrator(options, createMockViteServer(), process.cwd());

    expect(mockedLoadHandlers).toHaveBeenCalledWith(
      './mocks/my-petstore-api/handlers',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    expect(mockedLoadSeeds).toHaveBeenCalledWith(
      './mocks/my-petstore-api/seeds',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });
});
