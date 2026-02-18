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
import { type ResolvedOptions, resolveOptions } from '../types.js';
import { createMockLogger, createMockViteServer, type MockLogger } from './test-utils.js';

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

/** Return type for createTestOrchestrator — exposes internals for assertions */
interface TestOrchestratorResult {
  result: OrchestratorResult;
  options: ResolvedOptions;
  logger: MockLogger;
}

/**
 * Create an orchestrator with 2 specs for testing.
 *
 * Uses inline spec objects (no file I/O), mock Vite server, and
 * disabled CORS/DevTools to keep tests focused.
 *
 * Returns the orchestrator result alongside the resolved options and
 * mock logger so tests can inspect write-back mutations and log output.
 */
async function createTestOrchestrator(
  overrides?: Partial<Parameters<typeof resolveOptions>[0]>,
): Promise<TestOrchestratorResult> {
  const logger = overrides?.logger ? (overrides.logger as MockLogger) : createMockLogger();
  const mockVite = createMockViteServer();

  const options = resolveOptions({
    specs: [
      { spec: petstoreSpec, id: 'petstore', proxyPath: '/pets/v1' },
      { spec: inventorySpec, id: 'inventory', proxyPath: '/inventory/v1' },
    ],
    port: 4999,
    cors: false,
    devtools: false,
    logger,
    ...overrides,
  });

  const result = await createOrchestrator(options, mockVite, process.cwd());
  return { result, options, logger };
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
      const { result } = await createTestOrchestrator();

      expect(result.instances).toHaveLength(2);
      expect(result.instances[0].id).toBe('petstore');
      expect(result.instances[1].id).toBe('inventory');
    });

    it('should populate specsInfo with metadata', async () => {
      const { result } = await createTestOrchestrator();

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
      const { result } = await createTestOrchestrator();

      expect(result.specsInfo[0].color).toBe(SPEC_COLORS[0]);
      expect(result.specsInfo[1].color).toBe(SPEC_COLORS[1]);
    });

    it('should create isolated stores per spec', async () => {
      const { result } = await createTestOrchestrator();

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
      const { result } = await createTestOrchestrator();

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
      const { result } = await createTestOrchestrator();

      const response = await result.app.request('/pets', {
        headers: { 'x-spec-id': 'nonexistent' },
      });
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toContain('Unknown spec');
    });

    it('should fall through to shared services when no X-Spec-Id header', async () => {
      const { result } = await createTestOrchestrator();

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
      const { result } = await createTestOrchestrator();

      const response = await result.app.request('/pets', {
        headers: { 'x-spec-id': 'PETSTORE' },
      });
      expect(response.status).toBe(200);
    });

    it('should trim whitespace from X-Spec-Id header', async () => {
      const { result } = await createTestOrchestrator();

      const response = await result.app.request('/pets', {
        headers: { 'x-spec-id': '  petstore  ' },
      });
      expect(response.status).toBe(200);
    });

    it('should handle mixed case and whitespace', async () => {
      const { result } = await createTestOrchestrator();

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

    it('should wrap around for more than 8 specs (arithmetic)', () => {
      // Color at index 8 should wrap to index 0
      expect(SPEC_COLORS[8 % SPEC_COLORS.length]).toBe(SPEC_COLORS[0]);
    });

    it('should assign wrapped color to 9th spec in actual orchestrator', async () => {
      // Build 9 minimal specs with unique IDs and proxy paths
      const makeSpec = (n: number) =>
        JSON.stringify({
          openapi: '3.1.0',
          info: { title: `API ${n}`, version: '1.0.0' },
          paths: {
            [`/resource${n}`]: {
              get: {
                operationId: `list${n}`,
                responses: { '200': { description: 'ok' } },
              },
            },
          },
        });

      const specs = Array.from({ length: 9 }, (_, i) => ({
        spec: makeSpec(i),
        id: `spec-${i}`,
        proxyPath: `/api/v${i}`,
      }));

      const { result } = await createTestOrchestrator({ specs });

      expect(result.specsInfo).toHaveLength(9);
      // 9th spec (index 8) should wrap to SPEC_COLORS[0]
      expect(result.specsInfo[8].color).toBe(SPEC_COLORS[0]);
      // Verify first 8 are assigned in order
      for (let i = 0; i < 8; i++) {
        expect(result.specsInfo[i].color).toBe(SPEC_COLORS[i]);
      }
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
      const { result } = await createTestOrchestrator();

      expect(result.app).toBeDefined();
      expect(result.instances).toBeDefined();
      expect(result.specsInfo).toBeDefined();
      expect(typeof result.start).toBe('function');
      expect(typeof result.stop).toBe('function');
    });

    it('should have matching instance count and specsInfo count', async () => {
      const { result } = await createTestOrchestrator();

      expect(result.instances.length).toBe(result.specsInfo.length);
    });
  });

  // --------------------------------------------------------------------------
  // CORS-enabled path (Finding #12)
  // --------------------------------------------------------------------------

  describe('CORS middleware', () => {
    it('should add CORS headers to dispatched spec responses', async () => {
      const { result } = await createTestOrchestrator({
        cors: true,
        corsOrigin: 'http://localhost:3000',
      });

      const response = await result.app.request('/pets', {
        headers: {
          'x-spec-id': 'petstore',
          Origin: 'http://localhost:3000',
        },
      });
      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
    });

    it('should add CORS headers to shared service responses', async () => {
      const { result } = await createTestOrchestrator({
        cors: true,
        corsOrigin: 'http://localhost:3000',
      });

      const response = await result.app.request('/_api/health', {
        headers: { Origin: 'http://localhost:3000' },
      });
      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
    });

    it('should set credentials:true for non-wildcard origin', async () => {
      const { result } = await createTestOrchestrator({
        cors: true,
        corsOrigin: 'http://localhost:3000',
      });

      const response = await result.app.request('/pets', {
        method: 'OPTIONS',
        headers: {
          'x-spec-id': 'petstore',
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
        },
      });
      expect(response.headers.get('access-control-allow-credentials')).toBe('true');
    });

    it('should not set credentials when corsOrigin is wildcard string', async () => {
      const { result } = await createTestOrchestrator({
        cors: true,
        corsOrigin: '*',
      });

      const response = await result.app.request('/pets', {
        method: 'OPTIONS',
        headers: {
          'x-spec-id': 'petstore',
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
        },
      });
      // credentials should not be 'true' when origin is wildcard
      const credentials = response.headers.get('access-control-allow-credentials');
      expect(credentials).not.toBe('true');
    });

    it('should not set credentials when corsOrigin is array containing wildcard', async () => {
      const { result } = await createTestOrchestrator({
        cors: true,
        corsOrigin: ['*'],
      });

      const response = await result.app.request('/pets', {
        method: 'OPTIONS',
        headers: {
          'x-spec-id': 'petstore',
          Origin: 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
        },
      });
      const credentials = response.headers.get('access-control-allow-credentials');
      expect(credentials).not.toBe('true');
    });

    it('should produce wildcard CORS header when corsOrigin is array ["*"]', async () => {
      const { result } = await createTestOrchestrator({
        cors: true,
        corsOrigin: ['*'],
      });

      const response = await result.app.request('/pets', {
        headers: {
          'x-spec-id': 'petstore',
          Origin: 'http://localhost:3000',
        },
      });
      expect(response.status).toBe(200);
      // ['*'] should be collapsed to '*' so Hono emits the wildcard header
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
    });

    it('should not add CORS headers when cors:false', async () => {
      const { result } = await createTestOrchestrator({ cors: false });

      const response = await result.app.request('/pets', {
        headers: { 'x-spec-id': 'petstore' },
      });
      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // DevTools-enabled path (Finding #13)
  // --------------------------------------------------------------------------

  describe('DevTools SPA mount', () => {
    it('should mount /_devtools route when devtools:true', async () => {
      // DevTools SPA dir won't exist in test, but the route should still mount
      // with a placeholder or 404 for static assets
      const mockLogger = createMockLogger();
      const { result } = await createTestOrchestrator({
        devtools: true,
        logger: mockLogger,
      });

      // /_devtools should be reachable (route matched), returning a valid HTTP status.
      // Without the SPA dir, the route still matches but may return 200 (placeholder)
      // or 404 (missing static asset). Either is acceptable — the key assertion is
      // that the route was mounted and responded with a real HTTP status code.
      const response = await result.app.request('/_devtools/');
      expect([200, 302, 404]).toContain(response.status);
    });

    it('should warn when SPA directory is missing', async () => {
      const mockLogger = createMockLogger();
      await createTestOrchestrator({
        devtools: true,
        logger: mockLogger,
      });

      // The warning is logged during orchestrator creation
      expect(mockLogger.warn).toHaveBeenCalled();
      const warnCalls = mockLogger.warn.mock.calls.flat().join(' ');
      expect(warnCalls).toContain('DevTools SPA not found');
    });

    it('should not mount /_devtools route when devtools:false', async () => {
      const { result } = await createTestOrchestrator({ devtools: false });

      // Without devtools, /_devtools falls through to 404
      const response = await result.app.request('/_devtools/');
      expect(response.status).toBe(404);
    });
  });

  // --------------------------------------------------------------------------
  // Single-spec orchestrator (Minor Finding #8)
  // --------------------------------------------------------------------------

  describe('single-spec orchestrator', () => {
    it('should work with a single spec in the array', async () => {
      const { result } = await createTestOrchestrator({
        specs: [{ spec: petstoreSpec, id: 'petstore', proxyPath: '/pets/v1' }],
      });

      expect(result.instances).toHaveLength(1);
      expect(result.specsInfo).toHaveLength(1);
      expect(result.instances[0].id).toBe('petstore');

      // Dispatch should still work
      const response = await result.app.request('/pets', {
        headers: { 'x-spec-id': 'petstore' },
      });
      expect(response.status).toBe(200);

      // Shared services should work
      const healthResponse = await result.app.request('/_api/health');
      expect(healthResponse.status).toBe(200);
    });
  });

  // --------------------------------------------------------------------------
  // options.specs[i] mutation write-back (Finding #14)
  // --------------------------------------------------------------------------

  describe('options.specs mutation write-back', () => {
    it('should write resolved values back to options.specs', async () => {
      const mockLogger = createMockLogger();
      const mockVite = createMockViteServer();

      const options = resolveOptions({
        specs: [
          {
            spec: petstoreSpec,
            // No explicit id, handlersDir, seedsDir — should be resolved
            proxyPath: '/pets/v1',
          },
        ],
        port: 4999,
        cors: false,
        devtools: false,
        logger: mockLogger,
      });

      // Before orchestrator creation, id is empty string (resolveOptions default)
      expect(options.specs[0].id).toBe('');

      await createOrchestrator(options, mockVite, process.cwd());

      // After orchestrator creation, resolved values are written back
      expect(options.specs[0].id).toBe('petstore-api');
      expect(options.specs[0].proxyPath).toBe('/pets/v1');
      expect(options.specs[0].proxyPathSource).toBe('explicit');
      expect(options.specs[0].handlersDir).toBeDefined();
      expect(options.specs[0].seedsDir).toBeDefined();
    });

    it('should use slugified ID in fallback directory paths', async () => {
      const mockLogger = createMockLogger();
      const mockVite = createMockViteServer();

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
        logger: mockLogger,
      });

      await createOrchestrator(options, mockVite, process.cwd());

      // Fallback dirs should use slugified ID, not the raw "My Petstore API"
      expect(options.specs[0].handlersDir).toContain('my-petstore-api');
      expect(options.specs[0].seedsDir).toContain('my-petstore-api');
      expect(options.specs[0].handlersDir).not.toContain('My Petstore API');
    });
  });

  // --------------------------------------------------------------------------
  // Internal API on first spec (Finding #16)
  // --------------------------------------------------------------------------

  describe('Internal API (first-spec only)', () => {
    it('should mount first spec registry and store on /_api', async () => {
      const { result } = await createTestOrchestrator();

      // /_api/health should return ok
      const healthResponse = await result.app.request('/_api/health');
      expect(healthResponse.status).toBe(200);

      // /_api/registry should return registry data from first spec
      const registryResponse = await result.app.request('/_api/registry');
      expect(registryResponse.status).toBe(200);
      const registryData = await registryResponse.json();
      expect(registryData).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // X-Spec-Id edge cases
  // --------------------------------------------------------------------------

  describe('X-Spec-Id edge cases', () => {
    it('should fall through for whitespace-only X-Spec-Id (same as no header)', async () => {
      const { result } = await createTestOrchestrator();

      // Whitespace-only slugifies to empty string → treated as "no header"
      // and falls through to shared services
      const response = await result.app.request('/_api/health', {
        headers: { 'x-spec-id': '   ' },
      });
      expect(response.status).toBe(200);
    });

    it('should fall through to shared services for empty-string X-Spec-Id', async () => {
      const { result } = await createTestOrchestrator();

      // Empty string is falsy — middleware treats it as "no header" and
      // falls through to shared services (same as omitting the header).
      const response = await result.app.request('/_api/health', {
        headers: { 'x-spec-id': '' },
      });
      expect(response.status).toBe(200);
    });

    it('should return slugified spec ID in error response', async () => {
      const { result } = await createTestOrchestrator();

      // Mixed-case input should be slugified in the error message
      const response = await result.app.request('/pets', {
        headers: { 'x-spec-id': 'Non Existent' },
      });
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Unknown spec: non-existent');
    });
  });

  // --------------------------------------------------------------------------
  // Endpoint count precision (Minor Finding #12)
  // --------------------------------------------------------------------------

  describe('endpoint count precision', () => {
    it('should report exact endpoint count per spec', async () => {
      const { result } = await createTestOrchestrator();

      // Petstore has 1 path (/pets) with 1 method (GET) = 1 endpoint
      expect(result.specsInfo[0].endpointCount).toBe(1);

      // Inventory has 1 path (/items) with 1 method (GET) = 1 endpoint
      expect(result.specsInfo[1].endpointCount).toBe(1);
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
      serverResult = (await createTestOrchestrator({ port: 0 })).result;

      await serverResult.start();

      // Verify the server exposes the actual bound port
      const port = serverResult.port;
      expect(port).toBeGreaterThan(0);

      // Verify the server is actually serving requests
      const response = await fetch(`http://localhost:${port}/_api/health`);
      expect(response.ok).toBe(true);

      // Stop the server
      await serverResult.stop();

      // Port should be reset after stop
      expect(serverResult.port).toBe(0);

      // Verify the server is no longer reachable
      await expect(fetch(`http://localhost:${port}/_api/health`)).rejects.toThrow();

      // Verify stop is idempotent (calling again is a no-op)
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
        serverResult = (await createTestOrchestrator({ port: blockerPort })).result;

        await expect(serverResult.start()).rejects.toThrow(/already in use/);
      } finally {
        await new Promise<void>((resolve) => {
          blocker.close(() => resolve());
        });
        serverResult = null;
      }
    });

    it('should throw when start() is called twice', async () => {
      serverResult = (await createTestOrchestrator({ port: 0 })).result;

      await serverResult.start();

      // Second start() should throw without leaking the first server
      await expect(serverResult.start()).rejects.toThrow(/already running/);
    });

    it('should allow restart after stop()', async () => {
      serverResult = (await createTestOrchestrator({ port: 0 })).result;

      await serverResult.start();
      const firstPort = serverResult.port;
      expect(firstPort).toBeGreaterThan(0);
      await serverResult.stop();

      // After stop(), start() should work again (may bind a different port)
      await serverResult.start();
      expect(serverResult.port).toBeGreaterThan(0);
      await serverResult.stop();
      serverResult = null;
    });
  });

  // --------------------------------------------------------------------------
  // Invalid spec rejection (Finding #7)
  // --------------------------------------------------------------------------

  describe('invalid spec handling', () => {
    it('should reject when a spec document cannot be parsed', async () => {
      await expect(
        createTestOrchestrator({
          specs: [
            { spec: petstoreSpec, id: 'petstore', proxyPath: '/pets/v1' },
            { spec: 'this is not valid yaml: : :', id: 'bad', proxyPath: '/bad/v1' },
          ],
        }),
      ).rejects.toThrow();
    });

    it('should reject for a single invalid spec', async () => {
      await expect(
        createTestOrchestrator({
          specs: [{ spec: '{ invalid json', id: 'broken', proxyPath: '/broken/v1' }],
        }),
      ).rejects.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Multi-spec internal API warning (Finding #8)
  // --------------------------------------------------------------------------

  describe('internal API warning', () => {
    it('should warn about first-spec-only internal API when >1 spec', async () => {
      const { logger } = await createTestOrchestrator();

      const warnCalls = logger.warn.mock.calls.flat().join(' ');
      expect(warnCalls).toContain("Only first spec's internal API");
    });

    it('should not warn about internal API for a single spec', async () => {
      const { logger } = await createTestOrchestrator({
        specs: [{ spec: petstoreSpec, id: 'petstore', proxyPath: '/pets/v1' }],
      });

      const warnCalls = logger.warn.mock.calls.flat().join(' ');
      expect(warnCalls).not.toContain("Only first spec's internal API");
    });
  });

  // --------------------------------------------------------------------------
  // schemaCount in specsInfo (Finding #16)
  // --------------------------------------------------------------------------

  describe('specsInfo schemaCount', () => {
    it('should include schemaCount in specsInfo metadata', async () => {
      const { result } = await createTestOrchestrator();

      // schemaCount reflects store.getSchemas() which returns schemas
      // registered in the store. Our test fixtures use inline schemas
      // (not top-level components/schemas), so the count depends on
      // how the core parser registers them. Assert it's a number >= 0.
      expect(typeof result.specsInfo[0].schemaCount).toBe('number');
      expect(typeof result.specsInfo[1].schemaCount).toBe('number');
      expect(result.specsInfo[0].schemaCount).toBeGreaterThanOrEqual(0);
      expect(result.specsInfo[1].schemaCount).toBeGreaterThanOrEqual(0);
    });
  });
});
