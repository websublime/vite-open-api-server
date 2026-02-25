/**
 * Multi-Spec Command Handler Tests
 *
 * What: Tests for createMultiSpecCommandHandler()
 * How: Creates orchestrator with 2 specs, sends commands via wsHub, verifies responses
 * Why: Ensures multi-spec command routing, specId validation, and isolation
 *
 * @see Task 3.2.8: Test missing specId error
 * @see Task 3.2.9: Test unknown specId error
 * @see Task 3.2.10: Test get:registry for all specs
 * @see Task 3.2.11: Test reseed isolation
 */

import { describe, expect, it, vi } from 'vitest';

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

function createMockClient() {
  return {
    send: vi.fn(),
    readyState: 1,
  };
}

function parseSentMessages(client: { send: ReturnType<typeof vi.fn> }) {
  return client.send.mock.calls.map((call: unknown[]) => JSON.parse(call[0] as string));
}

function sendCommand(
  hub: OrchestratorResult['wsHub'],
  client: ReturnType<typeof createMockClient>,
  command: unknown,
) {
  hub.handleMessage(client, JSON.stringify(command));
}

// =============================================================================
// Tests
// =============================================================================

describe('createMultiSpecCommandHandler', () => {
  // --------------------------------------------------------------------------
  // Task 3.2.8: Test missing specId error
  // --------------------------------------------------------------------------

  describe('missing specId error', () => {
    it('should return error when spec-scoped command sent without specId', async () => {
      const result = await createTestOrchestrator();
      const client = createMockClient();
      result.wsHub.addClient(client);
      client.send.mockClear();

      sendCommand(result.wsHub, client, { type: 'get:store', data: { schema: 'Pet' } });

      const messages = parseSentMessages(client);
      const errors = messages.filter((m: { type: string }) => m.type === 'error');
      expect(errors).toHaveLength(1);
      expect(errors[0].data.command).toBe('get:store');
      expect(errors[0].data.message).toContain('specId is required');

      result.wsHub.removeClient(client);
    });

    it('should return error for reseed without specId', async () => {
      const result = await createTestOrchestrator();
      const client = createMockClient();
      result.wsHub.addClient(client);
      client.send.mockClear();

      sendCommand(result.wsHub, client, { type: 'reseed' });

      const messages = parseSentMessages(client);
      const errors = messages.filter((m: { type: string }) => m.type === 'error');
      expect(errors).toHaveLength(1);
      expect(errors[0].data.command).toBe('reseed');
      expect(errors[0].data.message).toContain('specId is required');

      result.wsHub.removeClient(client);
    });
  });

  // --------------------------------------------------------------------------
  // Task 3.2.9: Test unknown specId error
  // --------------------------------------------------------------------------

  describe('unknown specId error', () => {
    it('should return error for spec-scoped command with unknown specId', async () => {
      const result = await createTestOrchestrator();
      const client = createMockClient();
      result.wsHub.addClient(client);
      client.send.mockClear();

      sendCommand(result.wsHub, client, {
        type: 'get:store',
        data: { specId: 'nonexistent', schema: 'Pet' },
      });

      const messages = parseSentMessages(client);
      const errors = messages.filter((m: { type: string }) => m.type === 'error');
      expect(errors).toHaveLength(1);
      expect(errors[0].data.command).toBe('get:store');
      expect(errors[0].data.message).toContain('Unknown spec: nonexistent');

      result.wsHub.removeClient(client);
    });

    it('should return error for get:registry with unknown specId', async () => {
      const result = await createTestOrchestrator();
      const client = createMockClient();
      result.wsHub.addClient(client);
      client.send.mockClear();

      sendCommand(result.wsHub, client, { type: 'get:registry', data: { specId: 'nonexistent' } });

      const messages = parseSentMessages(client);
      const errors = messages.filter((m: { type: string }) => m.type === 'error');
      expect(errors).toHaveLength(1);
      expect(errors[0].data.message).toContain('Unknown spec: nonexistent');

      result.wsHub.removeClient(client);
    });
  });

  // --------------------------------------------------------------------------
  // Task 3.2.10: Test get:registry for all specs
  // --------------------------------------------------------------------------

  describe('get:registry without specId', () => {
    it('should return registries from all specs when no specId specified', async () => {
      const result = await createTestOrchestrator();
      const client = createMockClient();
      result.wsHub.addClient(client);
      client.send.mockClear();

      sendCommand(result.wsHub, client, { type: 'get:registry' });

      const messages = parseSentMessages(client);
      const registryResponses = messages.filter((m: { type: string }) => m.type === 'registry');

      // Should get one registry response per spec
      expect(registryResponses).toHaveLength(2);

      // Each should have specId from the broadcast interception
      const specIds = registryResponses.map((m: { data: { specId: string } }) => m.data.specId);
      expect(specIds).toContain('petstore');
      expect(specIds).toContain('inventory');

      result.wsHub.removeClient(client);
    });
  });

  // --------------------------------------------------------------------------
  // Task 3.2.11: Test reseed isolation
  // --------------------------------------------------------------------------

  describe('reseed isolation', () => {
    it('should reseed spec A without affecting spec B store', async () => {
      const result = await createTestOrchestrator();
      const client = createMockClient();
      result.wsHub.addClient(client);

      // Add data to both specs
      const petstore = result.instances[0];
      const inventory = result.instances[1];
      petstore.server.store.create('Pet', { id: 1, name: 'Rex' });
      inventory.server.store.create('Item', { id: 1, sku: 'SKU001' });

      const inventoryCountBefore = inventory.server.store.getCount('Item');
      expect(inventoryCountBefore).toBe(1);

      client.send.mockClear();

      // Reseed spec A (petstore) only
      sendCommand(result.wsHub, client, { type: 'reseed', data: { specId: 'petstore' } });

      // Verify spec B (inventory) store is unchanged
      const inventoryCountAfter = inventory.server.store.getCount('Item');
      expect(inventoryCountAfter).toBe(inventoryCountBefore);

      // Verify the reseed response was sent
      const messages = parseSentMessages(client);
      const reseeded = messages.filter((m: { type: string }) => m.type === 'reseeded');
      expect(reseeded.length).toBeGreaterThanOrEqual(1);

      // The reseeded event should have specId
      if (reseeded.length > 0) {
        expect(reseeded[0].data.specId).toBe('petstore');
      }

      result.wsHub.removeClient(client);
    });
  });

  // --------------------------------------------------------------------------
  // get:specs command
  // --------------------------------------------------------------------------

  describe('get:specs command', () => {
    it('should return connected event with specs metadata', async () => {
      const result = await createTestOrchestrator();
      const client = createMockClient();
      result.wsHub.addClient(client);
      client.send.mockClear();

      sendCommand(result.wsHub, client, { type: 'get:specs' });

      const messages = parseSentMessages(client);
      const connected = messages.filter((m: { type: string }) => m.type === 'connected');
      expect(connected).toHaveLength(1);
      expect(connected[0].data.specs).toHaveLength(2);
      expect(connected[0].data.specs[0].id).toBe('petstore');
      expect(connected[0].data.specs[1].id).toBe('inventory');

      result.wsHub.removeClient(client);
    });
  });
});
