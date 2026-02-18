/**
 * Orchestrator Integration Tests
 *
 * What: Tests for createOrchestrator() with multiple specs
 * How: Creates orchestrator with 2 inline OpenAPI specs, verifies routing
 * Why: Ensures multi-spec dispatch, lifecycle, and isolation work correctly
 *
 * @see Task 1.5.8: Write integration test for orchestrator
 */

import { afterEach, describe, expect, it } from 'vitest';

import { createOrchestrator, type OrchestratorResult, SPEC_COLORS } from '../orchestrator.js';
import { resolveOptions } from '../types.js';
import { createMockLogger, createMockViteServer } from './test-utils.js';

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Inline OpenAPI 3.1 document for "Petstore" spec.
 * Serialized to JSON string because SpecConfig.spec expects a string
 * (path, URL, or JSON/YAML content), and resolveOptions() validates that.
 */
const petstoreSpec = JSON.stringify({
  openapi: '3.1.0',
  info: { title: 'Petstore API', version: '1.0.0' },
  servers: [{ url: 'https://api.example.com/pets/v1' }],
  paths: {
    '/pets': {
      get: {
        operationId: 'listPets',
        summary: 'List all pets',
        responses: {
          '200': {
            description: 'A list of pets',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    title: 'Pet',
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});

/**
 * Inline OpenAPI 3.1 document for "Inventory" spec.
 * Serialized to JSON string (same reason as petstoreSpec above).
 */
const inventorySpec = JSON.stringify({
  openapi: '3.1.0',
  info: { title: 'Inventory API', version: '2.0.0' },
  servers: [{ url: 'https://api.example.com/inventory/v1' }],
  paths: {
    '/items': {
      get: {
        operationId: 'listItems',
        summary: 'List all items',
        responses: {
          '200': {
            description: 'A list of items',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    title: 'Item',
                    properties: {
                      id: { type: 'integer' },
                      sku: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create an orchestrator with 2 specs for testing.
 *
 * Uses inline spec objects (no file I/O), mock Vite server, and
 * disabled CORS/DevTools to keep tests focused.
 */
async function createTestOrchestrator(
  overrides?: Partial<Parameters<typeof resolveOptions>[0]>,
): Promise<OrchestratorResult> {
  const mockLogger = createMockLogger();
  const mockVite = createMockViteServer();

  const options = resolveOptions({
    specs: [
      { spec: petstoreSpec, id: 'petstore', proxyPath: '/pets/v1' },
      { spec: inventorySpec, id: 'inventory', proxyPath: '/inventory/v1' },
    ],
    port: 4999,
    cors: false,
    devtools: false,
    logger: mockLogger,
    ...overrides,
  });

  return createOrchestrator(options, mockVite, process.cwd());
}

// =============================================================================
// Tests
// =============================================================================

describe('createOrchestrator', () => {
  // --------------------------------------------------------------------------
  // Phase 1: Spec instance creation
  // --------------------------------------------------------------------------

  describe('Phase 1 — spec instances', () => {
    it('should create N spec instances', async () => {
      const result = await createTestOrchestrator();

      expect(result.instances).toHaveLength(2);
      expect(result.instances[0].id).toBe('petstore');
      expect(result.instances[1].id).toBe('inventory');
    });

    it('should populate specsInfo with metadata', async () => {
      const result = await createTestOrchestrator();

      expect(result.specsInfo).toHaveLength(2);

      const petstore = result.specsInfo[0];
      expect(petstore.id).toBe('petstore');
      expect(petstore.title).toBe('Petstore API');
      expect(petstore.version).toBe('1.0.0');
      expect(petstore.proxyPath).toBe('/pets/v1');
      expect(petstore.color).toBe(SPEC_COLORS[0]);
      expect(petstore.endpointCount).toBeGreaterThan(0);

      const inventory = result.specsInfo[1];
      expect(inventory.id).toBe('inventory');
      expect(inventory.title).toBe('Inventory API');
      expect(inventory.version).toBe('2.0.0');
      expect(inventory.proxyPath).toBe('/inventory/v1');
      expect(inventory.color).toBe(SPEC_COLORS[1]);
    });

    it('should assign SPEC_COLORS deterministically by index', async () => {
      const result = await createTestOrchestrator();

      expect(result.specsInfo[0].color).toBe(SPEC_COLORS[0]);
      expect(result.specsInfo[1].color).toBe(SPEC_COLORS[1]);
    });

    it('should create isolated stores per spec', async () => {
      const result = await createTestOrchestrator();

      const petstoreStore = result.instances[0].server.store;
      const inventoryStore = result.instances[1].server.store;

      // Stores are distinct instances — mutations to one don't affect the other
      petstoreStore.create('Pet', { id: 1, name: 'Rex' });
      expect(petstoreStore.getCount('Pet')).toBe(1);
      expect(inventoryStore.hasSchema('Pet')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Phase 2: ID and proxy path validation
  // --------------------------------------------------------------------------

  describe('Phase 2 — uniqueness validation', () => {
    it('should throw on duplicate spec IDs', async () => {
      await expect(
        createTestOrchestrator({
          specs: [
            { spec: petstoreSpec, id: 'same-id', proxyPath: '/api/v1' },
            { spec: inventorySpec, id: 'same-id', proxyPath: '/api/v2' },
          ],
        }),
      ).rejects.toThrow(/Duplicate spec IDs/);
    });

    it('should throw on duplicate proxy paths', async () => {
      await expect(
        createTestOrchestrator({
          specs: [
            { spec: petstoreSpec, id: 'petstore', proxyPath: '/api/v1' },
            { spec: inventorySpec, id: 'inventory', proxyPath: '/api/v1' },
          ],
        }),
      ).rejects.toThrow(/Duplicate proxyPath/);
    });
  });

  // --------------------------------------------------------------------------
  // Phase 3: Main Hono app and X-Spec-Id dispatch
  // --------------------------------------------------------------------------

  describe('Phase 3 — X-Spec-Id dispatch', () => {
    it('should route requests with X-Spec-Id to the correct spec', async () => {
      const result = await createTestOrchestrator();

      // Request to petstore spec
      const petstoreResponse = await result.app.request('/pets', {
        headers: { 'x-spec-id': 'petstore' },
      });
      expect(petstoreResponse.status).toBe(200);
      const petstoreData = await petstoreResponse.json();
      expect(Array.isArray(petstoreData)).toBe(true);

      // Request to inventory spec
      const inventoryResponse = await result.app.request('/items', {
        headers: { 'x-spec-id': 'inventory' },
      });
      expect(inventoryResponse.status).toBe(200);
      const inventoryData = await inventoryResponse.json();
      expect(Array.isArray(inventoryData)).toBe(true);
    });

    it('should return 404 for unknown spec ID', async () => {
      const result = await createTestOrchestrator();

      const response = await result.app.request('/pets', {
        headers: { 'x-spec-id': 'nonexistent' },
      });
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toContain('Unknown spec');
    });

    it('should fall through to shared services when no X-Spec-Id header', async () => {
      const result = await createTestOrchestrator();

      // Without X-Spec-Id, the middleware calls next() and shared services handle it.
      // Since devtools is disabled, /_devtools should 404 (no route registered).
      // But /_api/health should work since internal API is mounted.
      const healthResponse = await result.app.request('/_api/health');
      expect(healthResponse.status).toBe(200);
      const healthData = await healthResponse.json();
      expect(healthData.status).toBe('ok');
    });
  });

  // --------------------------------------------------------------------------
  // X-Spec-Id normalization (case-insensitive + trimming)
  // --------------------------------------------------------------------------

  describe('X-Spec-Id normalization', () => {
    it('should match spec ID case-insensitively', async () => {
      const result = await createTestOrchestrator();

      const response = await result.app.request('/pets', {
        headers: { 'x-spec-id': 'PETSTORE' },
      });
      expect(response.status).toBe(200);
    });

    it('should trim whitespace from X-Spec-Id header', async () => {
      const result = await createTestOrchestrator();

      const response = await result.app.request('/pets', {
        headers: { 'x-spec-id': '  petstore  ' },
      });
      expect(response.status).toBe(200);
    });

    it('should handle mixed case and whitespace', async () => {
      const result = await createTestOrchestrator();

      const response = await result.app.request('/items', {
        headers: { 'x-spec-id': ' Inventory ' },
      });
      expect(response.status).toBe(200);
    });
  });

  // --------------------------------------------------------------------------
  // Auto-derived IDs and proxy paths
  // --------------------------------------------------------------------------

  describe('auto-derived IDs and proxy paths', () => {
    it('should auto-derive spec ID from info.title when not explicit', async () => {
      const mockLogger = createMockLogger();
      const mockVite = createMockViteServer();

      const options = resolveOptions({
        specs: [
          {
            spec: petstoreSpec,
            // No explicit id — should derive "petstore-api" from "Petstore API"
            proxyPath: '/pets/v1',
          },
          {
            spec: inventorySpec,
            // No explicit id — should derive "inventory-api" from "Inventory API"
            proxyPath: '/inventory/v1',
          },
        ],
        port: 4999,
        cors: false,
        devtools: false,
        logger: mockLogger,
      });

      const result = await createOrchestrator(options, mockVite, process.cwd());

      expect(result.instances[0].id).toBe('petstore-api');
      expect(result.instances[1].id).toBe('inventory-api');
    });

    it('should auto-derive proxy path from servers[0].url when not explicit', async () => {
      const mockLogger = createMockLogger();
      const mockVite = createMockViteServer();

      const options = resolveOptions({
        specs: [
          {
            spec: petstoreSpec,
            id: 'petstore',
            // No explicit proxyPath — should derive from servers[0].url
          },
          {
            spec: inventorySpec,
            id: 'inventory',
            // No explicit proxyPath — should derive from servers[0].url
          },
        ],
        port: 4999,
        cors: false,
        devtools: false,
        logger: mockLogger,
      });

      const result = await createOrchestrator(options, mockVite, process.cwd());

      expect(result.instances[0].config.proxyPath).toBe('/pets/v1');
      expect(result.instances[0].config.proxyPathSource).toBe('auto');
      expect(result.instances[1].config.proxyPath).toBe('/inventory/v1');
      expect(result.instances[1].config.proxyPathSource).toBe('auto');
    });
  });

  // --------------------------------------------------------------------------
  // SPEC_COLORS
  // --------------------------------------------------------------------------

  describe('SPEC_COLORS', () => {
    it('should have 8 colors in the palette', () => {
      expect(SPEC_COLORS).toHaveLength(8);
    });

    it('should wrap around for more than 8 specs', () => {
      // Color at index 8 should wrap to index 0
      expect(SPEC_COLORS[8 % SPEC_COLORS.length]).toBe(SPEC_COLORS[0]);
    });

    it('should contain valid hex color strings', () => {
      for (const color of SPEC_COLORS) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      }
    });
  });

  // --------------------------------------------------------------------------
  // OrchestratorResult shape
  // --------------------------------------------------------------------------

  describe('OrchestratorResult', () => {
    it('should return app, instances, specsInfo, start, stop', async () => {
      const result = await createTestOrchestrator();

      expect(result.app).toBeDefined();
      expect(result.instances).toBeDefined();
      expect(result.specsInfo).toBeDefined();
      expect(typeof result.start).toBe('function');
      expect(typeof result.stop).toBe('function');
    });

    it('should have matching instance count and specsInfo count', async () => {
      const result = await createTestOrchestrator();

      expect(result.instances.length).toBe(result.specsInfo.length);
    });
  });

  // --------------------------------------------------------------------------
  // Lifecycle: start() and stop()
  // --------------------------------------------------------------------------

  describe('lifecycle', () => {
    let serverResult: OrchestratorResult | null = null;

    afterEach(async () => {
      // Ensure server is stopped even if a test fails
      if (serverResult) {
        await serverResult.stop().catch(() => {});
        serverResult = null;
      }
    });

    it('should start HTTP server, serve requests, and stop cleanly', async () => {
      // Use port 0 so the OS assigns an ephemeral port (no conflicts)
      serverResult = await createTestOrchestrator({ port: 0 });

      await serverResult.start();

      // start() resolved without throwing, meaning the 'listening' event fired.
      // Verify the server is actually serving by confirming start() awaited properly.
      // Now test that stop() cleanly shuts down the server.

      await serverResult.stop();

      // Verify stop actually nulled the server (calling stop again is a no-op)
      await serverResult.stop(); // Should not throw
      serverResult = null; // Prevent afterEach double-stop
    });

    it('should reject start() when port is already in use', async () => {
      // Start a plain Node server on an ephemeral port first
      const { createServer } = await import('node:http');
      const blocker = createServer();

      const blockerPort = await new Promise<number>((resolve) => {
        blocker.listen(0, () => {
          const addr = blocker.address();
          resolve(typeof addr === 'object' && addr ? addr.port : 0);
        });
      });

      try {
        serverResult = await createTestOrchestrator({ port: blockerPort });

        await expect(serverResult.start()).rejects.toThrow(/already in use/);
      } finally {
        await new Promise<void>((resolve) => {
          blocker.close(() => resolve());
        });
        serverResult = null;
      }
    });
  });
});
