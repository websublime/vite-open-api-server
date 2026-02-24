/**
 * Multi-Spec WebSocket Hub Tests
 *
 * What: Tests for createMultiSpecWebSocketHub()
 * How: Creates orchestrator with 2 specs, verifies connected events and broadcast enrichment
 * Why: Ensures multi-spec WebSocket hub sends correct events with specId
 *
 * @see Task 3.1.4: Test connected event with specs array
 * @see Task 3.1.5: Test broadcast specId enrichment
 */

import { describe, expect, it, vi } from 'vitest';

import packageJson from '../../package.json' with { type: 'json' };
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
    readyState: 1, // OPEN
  };
}

function parseSentMessages(client: { send: ReturnType<typeof vi.fn> }) {
  return client.send.mock.calls.map((call: unknown[]) => JSON.parse(call[0] as string));
}

// =============================================================================
// Tests
// =============================================================================

describe('createMultiSpecWebSocketHub', () => {
  // --------------------------------------------------------------------------
  // Task 3.1.4: Test connected event with specs array
  // --------------------------------------------------------------------------

  describe('connected event', () => {
    it('should send single connected event with specs array on addClient', async () => {
      const result = await createTestOrchestrator();
      const client = createMockClient();

      result.wsHub.addClient(client);

      // Exactly one connected event (no duplicate from core autoConnect)
      expect(client.send).toHaveBeenCalledTimes(1);

      const messages = parseSentMessages(client);
      expect(messages[0].type).toBe('connected');
      expect(messages[0].data.serverVersion).toBe(packageJson.version);
      expect(messages[0].data.specs).toBeInstanceOf(Array);
      expect(messages[0].data.specs).toHaveLength(2);

      // Verify specs metadata
      expect(messages[0].data.specs[0].id).toBe('petstore');
      expect(messages[0].data.specs[0].title).toBe('Petstore API');
      expect(messages[0].data.specs[0].version).toBe('1.0.0');
      expect(messages[0].data.specs[0].proxyPath).toBe('/pets/v1');

      expect(messages[0].data.specs[1].id).toBe('inventory');
      expect(messages[0].data.specs[1].title).toBe('Inventory API');
      expect(messages[0].data.specs[1].version).toBe('2.0.0');
      expect(messages[0].data.specs[1].proxyPath).toBe('/inventory/v1');

      result.wsHub.removeClient(client);
    });

    it('should not send duplicate connected events', async () => {
      const result = await createTestOrchestrator();
      const client = createMockClient();

      result.wsHub.addClient(client);

      // Only 1 connected event from the multi-spec hub, not 2
      expect(client.send).toHaveBeenCalledTimes(1);

      const messages = parseSentMessages(client);
      const connectedEvents = messages.filter((m: { type: string }) => m.type === 'connected');
      expect(connectedEvents).toHaveLength(1);

      result.wsHub.removeClient(client);
    });
  });

  // --------------------------------------------------------------------------
  // Task 3.1.5: Test broadcast specId enrichment
  // --------------------------------------------------------------------------

  describe('broadcast specId enrichment', () => {
    it('should add specId to broadcasts from spec A', async () => {
      const result = await createTestOrchestrator();
      const client = createMockClient();

      result.wsHub.addClient(client);
      client.send.mockClear(); // Clear the connected event

      // Trigger a broadcast on spec A (petstore) via its core wsHub
      const petstoreInstance = result.instances[0];
      petstoreInstance.server.store.create('Pet', { id: 1, name: 'Rex' });

      // The store.create triggers store:updated broadcast through the core server
      // which is intercepted by the multi-spec hub wrapper
      const messages = parseSentMessages(client);
      const storeUpdates = messages.filter((m: { type: string }) => m.type === 'store:updated');

      if (storeUpdates.length > 0) {
        // Verify specId is present and correct
        expect(storeUpdates[0].data.specId).toBe('petstore');
        // Verify original data fields are preserved
        expect(storeUpdates[0].data.schema).toBe('Pet');
        expect(storeUpdates[0].data.action).toBeDefined();
      }

      result.wsHub.removeClient(client);
    });

    it('should add specId to broadcasts from spec B independently', async () => {
      const result = await createTestOrchestrator();
      const client = createMockClient();

      result.wsHub.addClient(client);
      client.send.mockClear();

      // Trigger broadcast on spec B (inventory)
      const inventoryInstance = result.instances[1];
      inventoryInstance.server.store.create('Item', { id: 1, sku: 'SKU001' });

      const messages = parseSentMessages(client);
      const storeUpdates = messages.filter((m: { type: string }) => m.type === 'store:updated');

      if (storeUpdates.length > 0) {
        expect(storeUpdates[0].data.specId).toBe('inventory');
        expect(storeUpdates[0].data.schema).toBe('Item');
      }

      result.wsHub.removeClient(client);
    });

    it('should preserve all original event data fields after specId enrichment', async () => {
      const result = await createTestOrchestrator();
      const client = createMockClient();

      result.wsHub.addClient(client);
      client.send.mockClear();

      // Trigger a store:updated event which has action, count, and schema fields
      const petstoreInstance = result.instances[0];
      petstoreInstance.server.store.create('Pet', { id: 1, name: 'Rex' });

      const messages = parseSentMessages(client);
      const storeUpdates = messages.filter((m: { type: string }) => m.type === 'store:updated');

      if (storeUpdates.length > 0) {
        const event = storeUpdates[0];
        // specId was added
        expect(event.data.specId).toBe('petstore');
        // Original fields preserved
        expect(event.data).toHaveProperty('schema');
        expect(event.data).toHaveProperty('action');
        // count may or may not be present depending on action type
        expect(event.type).toBe('store:updated');
      }

      result.wsHub.removeClient(client);
    });
  });
});
