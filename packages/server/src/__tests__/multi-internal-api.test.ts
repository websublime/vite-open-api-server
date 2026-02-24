/**
 * Multi-Spec Internal API Tests
 *
 * What: Tests for mountMultiSpecInternalApi()
 * How: Creates orchestrator with 2 specs, makes HTTP requests via Hono app.request()
 * Why: Ensures aggregated and per-spec API routes return correct data
 *
 * @see Task 3.3.6: Write aggregated endpoint tests
 * @see Task 3.3.7: Write per-spec endpoint tests
 */

import { describe, expect, it } from 'vitest';

import { createOrchestrator, type OrchestratorResult } from '../orchestrator.js';
import { resolveOptions } from '../types.js';
import { createMockLogger, createMockViteServer } from './test-utils.js';

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

async function createTestOrchestrator(): Promise<OrchestratorResult> {
  const logger = createMockLogger();
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
  });

  return createOrchestrator(options, mockVite, process.cwd());
}

async function getJson(result: OrchestratorResult, path: string) {
  const res = await result.app.request(path);
  return { status: res.status, body: await res.json() };
}

// =============================================================================
// Tests
// =============================================================================

describe('mountMultiSpecInternalApi', () => {
  // --------------------------------------------------------------------------
  // Task 3.3.6: Aggregated endpoint tests
  // --------------------------------------------------------------------------

  describe('GET /_api/specs', () => {
    it('should list all specs with metadata', async () => {
      const result = await createTestOrchestrator();
      const { status, body } = await getJson(result, '/_api/specs');

      expect(status).toBe(200);
      expect(body.count).toBe(2);
      expect(body.specs).toHaveLength(2);

      // Verify first spec
      expect(body.specs[0].id).toBe('petstore');
      expect(body.specs[0].title).toBe('Petstore API');
      expect(body.specs[0].version).toBe('1.0.0');
      expect(body.specs[0].proxyPath).toBe('/pets/v1');
      expect(typeof body.specs[0].endpoints).toBe('number');
      expect(typeof body.specs[0].schemas).toBe('number');

      // Verify second spec
      expect(body.specs[1].id).toBe('inventory');
      expect(body.specs[1].title).toBe('Inventory API');
      expect(body.specs[1].version).toBe('2.0.0');
      expect(body.specs[1].proxyPath).toBe('/inventory/v1');
    });
  });

  describe('GET /_api/registry', () => {
    it('should return aggregated registry from all specs', async () => {
      const result = await createTestOrchestrator();
      const { status, body } = await getJson(result, '/_api/registry');

      expect(status).toBe(200);
      expect(body.totalSpecs).toBe(2);
      expect(body.specs).toHaveLength(2);
      expect(typeof body.totalEndpoints).toBe('number');

      // Each spec should have its own registry entry
      const specIds = body.specs.map((s: { specId: string }) => s.specId);
      expect(specIds).toContain('petstore');
      expect(specIds).toContain('inventory');
    });
  });

  describe('GET /_api/health', () => {
    it('should return aggregated health with version', async () => {
      const result = await createTestOrchestrator();
      const { status, body } = await getJson(result, '/_api/health');

      expect(status).toBe(200);
      expect(body.status).toBe('ok');
      expect(body.totalSpecs).toBe(2);
      expect(typeof body.version).toBe('string');
      expect(typeof body.timestamp).toBe('string');
      expect(typeof body.totalEndpoints).toBe('number');
      expect(body.specs).toHaveLength(2);
    });
  });

  // --------------------------------------------------------------------------
  // Task 3.3.7: Per-spec endpoint tests
  // --------------------------------------------------------------------------

  describe('GET /_api/specs/:specId/registry', () => {
    it('should return registry for a known spec', async () => {
      const result = await createTestOrchestrator();
      const { status, body } = await getJson(result, '/_api/specs/petstore/registry');

      expect(status).toBe(200);
      expect(body.specId).toBe('petstore');
      expect(Array.isArray(body.endpoints)).toBe(true);
      expect(body.stats).toBeDefined();
    });

    it('should return 404 for unknown spec', async () => {
      const result = await createTestOrchestrator();
      const { status, body } = await getJson(result, '/_api/specs/nonexistent/registry');

      expect(status).toBe(404);
      expect(body.error).toContain('Unknown spec');
    });
  });

  describe('GET /_api/specs/:specId/store', () => {
    it('should return schemas for a known spec', async () => {
      const result = await createTestOrchestrator();
      const { status, body } = await getJson(result, '/_api/specs/petstore/store');

      expect(status).toBe(200);
      expect(Array.isArray(body.schemas)).toBe(true);
    });

    it('should return 404 for unknown spec', async () => {
      const result = await createTestOrchestrator();
      const { status, body } = await getJson(result, '/_api/specs/nonexistent/store');

      expect(status).toBe(404);
      expect(body.error).toContain('Unknown spec');
    });
  });

  describe('GET /_api/specs/:specId/store/:schema', () => {
    it('should return store data for a known schema', async () => {
      const result = await createTestOrchestrator();

      // Add some data to the store
      result.instances[0].server.store.create('Pet', { id: 1, name: 'Rex' });

      const { status, body } = await getJson(result, '/_api/specs/petstore/store/Pet');

      expect(status).toBe(200);
      expect(body.schema).toBe('Pet');
      expect(body.count).toBe(1);
      expect(body.items).toHaveLength(1);
      expect(body.items[0].name).toBe('Rex');
    });

    it('should return 404 for unknown spec', async () => {
      const result = await createTestOrchestrator();
      const { status, body } = await getJson(result, '/_api/specs/nonexistent/store/Pet');

      expect(status).toBe(404);
      expect(body.error).toContain('Unknown spec');
    });
  });

  describe('GET /_api/specs/:specId/document', () => {
    it('should return the OpenAPI document for a known spec', async () => {
      const result = await createTestOrchestrator();
      const { status, body } = await getJson(result, '/_api/specs/petstore/document');

      expect(status).toBe(200);
      expect(body.openapi).toBe('3.1.0');
      expect(body.info.title).toBe('Petstore API');
    });

    it('should return correct document for each spec', async () => {
      const result = await createTestOrchestrator();

      const petstore = await getJson(result, '/_api/specs/petstore/document');
      const inventory = await getJson(result, '/_api/specs/inventory/document');

      expect(petstore.body.info.title).toBe('Petstore API');
      expect(inventory.body.info.title).toBe('Inventory API');
    });

    it('should return 404 for unknown spec', async () => {
      const result = await createTestOrchestrator();
      const { status, body } = await getJson(result, '/_api/specs/nonexistent/document');

      expect(status).toBe(404);
      expect(body.error).toContain('Unknown spec');
    });
  });

  describe('GET /_api/specs/:specId/simulations', () => {
    it('should return simulations for a known spec', async () => {
      const result = await createTestOrchestrator();
      const { status, body } = await getJson(result, '/_api/specs/petstore/simulations');

      expect(status).toBe(200);
      expect(Array.isArray(body.simulations)).toBe(true);
      expect(typeof body.count).toBe('number');
    });

    it('should return 404 for unknown spec', async () => {
      const result = await createTestOrchestrator();
      const { status, body } = await getJson(result, '/_api/specs/nonexistent/simulations');

      expect(status).toBe(404);
      expect(body.error).toContain('Unknown spec');
    });
  });

  describe('GET /_api/specs/:specId/timeline', () => {
    it('should return timeline for a known spec', async () => {
      const result = await createTestOrchestrator();
      const { status, body } = await getJson(result, '/_api/specs/petstore/timeline');

      expect(status).toBe(200);
      expect(body.specId).toBe('petstore');
      expect(Array.isArray(body.entries)).toBe(true);
      expect(typeof body.count).toBe('number');
      expect(typeof body.total).toBe('number');
    });

    it('should return 404 for unknown spec', async () => {
      const result = await createTestOrchestrator();
      const { status, body } = await getJson(result, '/_api/specs/nonexistent/timeline');

      expect(status).toBe(404);
      expect(body.error).toContain('Unknown spec');
    });
  });

  // --------------------------------------------------------------------------
  // Cross-spec isolation
  // --------------------------------------------------------------------------

  describe('cross-spec isolation', () => {
    it('should return different store data for different specs', async () => {
      const result = await createTestOrchestrator();

      // Add data to each spec's store
      result.instances[0].server.store.create('Pet', { id: 1, name: 'Rex' });
      result.instances[1].server.store.create('Item', { id: 1, sku: 'SKU001' });

      const petstore = await getJson(result, '/_api/specs/petstore/store/Pet');
      const inventory = await getJson(result, '/_api/specs/inventory/store/Item');

      expect(petstore.body.items[0].name).toBe('Rex');
      expect(inventory.body.items[0].sku).toBe('SKU001');
    });
  });
});
