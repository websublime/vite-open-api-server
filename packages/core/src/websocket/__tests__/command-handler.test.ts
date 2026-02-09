/**
 * WebSocket Command Handler Tests
 *
 * Tests for all 9 client command types processed by the command handler.
 */

import { describe, expect, it, vi } from 'vitest';

import { buildRegistry } from '../../router/index.js';
import { createSimulationManager } from '../../simulation/index.js';
import { createStore } from '../../store/index.js';
import { type CommandHandlerDeps, createCommandHandler } from '../command-handler.js';
import { createWebSocketHub, type WebSocketClient } from '../hub.js';
import type { ServerEvent } from '../protocol.js';

/**
 * Create a mock WebSocket client
 */
function createMockClient(): WebSocketClient & { messages: string[] } {
  const messages: string[] = [];
  return {
    readyState: 1, // OPEN
    send: vi.fn((message: string) => {
      messages.push(message);
    }),
    messages,
  };
}

/**
 * Minimal OpenAPI document for testing
 */
const minimalDocument = {
  openapi: '3.1.0' as const,
  info: { title: 'Test', version: '1.0.0' },
  paths: {
    '/pets': {
      get: {
        operationId: 'listPets',
        summary: 'List all pets',
        tags: ['pets'],
        responses: { '200': { description: 'OK' } },
      },
    },
  },
};

/**
 * Create test dependencies with sensible defaults
 */
function createTestDeps(overrides: Partial<CommandHandlerDeps> = {}): CommandHandlerDeps {
  const store = createStore();
  const registry = buildRegistry(minimalDocument);
  const simulationManager = createSimulationManager();
  const wsHub = createWebSocketHub();
  const timeline: CommandHandlerDeps['timeline'] = [];
  const seeds = new Map<string, unknown[]>();

  const silentLogger = {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  return {
    store,
    registry,
    simulationManager,
    wsHub,
    timeline,
    timelineLimit: 100,
    getSeeds: () => seeds,
    logger: silentLogger,
    ...overrides,
  };
}

/**
 * Parse the last message sent to a client
 */
function getLastMessage(client: { messages: string[] }): ServerEvent {
  return JSON.parse(client.messages[client.messages.length - 1]);
}

describe('createCommandHandler', () => {
  describe('get:registry', () => {
    it('should send registry data to the requesting client', () => {
      const deps = createTestDeps();
      const handler = createCommandHandler(deps);
      const client = createMockClient();
      deps.wsHub.addClient(client);

      // Clear the 'connected' message
      client.messages.length = 0;

      handler(client, { type: 'get:registry' });

      // Should send both registry and simulation:active
      expect(client.messages.length).toBe(2);

      const registryMsg = JSON.parse(client.messages[0]);
      expect(registryMsg.type).toBe('registry');
      expect(registryMsg.data).toHaveProperty('endpoints');
      expect(registryMsg.data).toHaveProperty('stats');

      const simulationMsg = JSON.parse(client.messages[1]);
      expect(simulationMsg.type).toBe('simulation:active');
      expect(simulationMsg.data).toEqual([]);
    });
  });

  describe('get:timeline', () => {
    it('should send timeline entries to the requesting client', () => {
      const timeline = [
        { id: '1', timestamp: '2026-01-01T00:00:00Z', type: 'request' as const, data: {} },
        { id: '2', timestamp: '2026-01-01T00:00:01Z', type: 'response' as const, data: {} },
      ];
      const deps = createTestDeps({ timeline });
      const handler = createCommandHandler(deps);
      const client = createMockClient();
      deps.wsHub.addClient(client);
      client.messages.length = 0;

      handler(client, { type: 'get:timeline' });

      const message = getLastMessage(client);
      expect(message.type).toBe('timeline');
      expect((message.data as { count: number }).count).toBe(2);
      expect((message.data as { total: number }).total).toBe(2);
    });

    it('should respect limit parameter', () => {
      const timeline = Array.from({ length: 10 }, (_, i) => ({
        id: String(i),
        timestamp: new Date().toISOString(),
        type: 'request' as const,
        data: {},
      }));
      const deps = createTestDeps({ timeline });
      const handler = createCommandHandler(deps);
      const client = createMockClient();
      deps.wsHub.addClient(client);
      client.messages.length = 0;

      handler(client, { type: 'get:timeline', data: { limit: 3 } });

      const message = getLastMessage(client);
      expect((message.data as { count: number }).count).toBe(3);
      expect((message.data as { total: number }).total).toBe(10);
    });
  });

  describe('get:store', () => {
    it('should send store items for a schema', () => {
      const deps = createTestDeps();
      deps.store.create('Pet', { id: 1, name: 'Buddy' });
      deps.store.create('Pet', { id: 2, name: 'Max' });
      const handler = createCommandHandler(deps);
      const client = createMockClient();
      deps.wsHub.addClient(client);
      client.messages.length = 0;

      handler(client, { type: 'get:store', data: { schema: 'Pet' } });

      const message = getLastMessage(client);
      expect(message.type).toBe('store');
      expect((message.data as { schema: string }).schema).toBe('Pet');
      expect((message.data as { count: number }).count).toBe(2);
      expect((message.data as { items: unknown[] }).items).toHaveLength(2);
    });
  });

  describe('set:store', () => {
    it('should clear and repopulate schema data', () => {
      const deps = createTestDeps();
      deps.store.create('Pet', { id: 1, name: 'Old' });
      const handler = createCommandHandler(deps);
      const client = createMockClient();
      deps.wsHub.addClient(client);
      client.messages.length = 0;

      handler(client, {
        type: 'set:store',
        data: {
          schema: 'Pet',
          items: [
            { id: 10, name: 'New1' },
            { id: 11, name: 'New2' },
          ],
        },
      });

      // Verify store was updated
      expect(deps.store.list('Pet')).toHaveLength(2);
      expect(deps.store.get('Pet', 1)).toBeNull();
      expect(deps.store.get('Pet', 10)).toEqual({ id: 10, name: 'New1' });

      // Verify response sent
      const message = getLastMessage(client);
      expect(message.type).toBe('store:set');
      expect((message.data as { success: boolean }).success).toBe(true);
      expect((message.data as { count: number }).count).toBe(2);
    });

    it('should broadcast store:updated to other clients', () => {
      const deps = createTestDeps();
      const handler = createCommandHandler(deps);

      const sender = createMockClient();
      const observer = createMockClient();
      deps.wsHub.addClient(sender);
      deps.wsHub.addClient(observer);
      sender.messages.length = 0;
      observer.messages.length = 0;

      handler(sender, {
        type: 'set:store',
        data: { schema: 'Pet', items: [{ id: 1, name: 'Buddy' }] },
      });

      // Observer should receive broadcast store:updated
      const observerMsg = JSON.parse(observer.messages[0]);
      expect(observerMsg.type).toBe('store:updated');
      expect(observerMsg.data.schema).toBe('Pet');
      expect(observerMsg.data.action).toBe('bulk');
      expect(observerMsg.data.count).toBe(1);
    });
  });

  describe('clear:store', () => {
    it('should clear schema data and broadcast', () => {
      const deps = createTestDeps();
      deps.store.create('Pet', { id: 1, name: 'Buddy' });
      const handler = createCommandHandler(deps);
      const client = createMockClient();
      deps.wsHub.addClient(client);
      client.messages.length = 0;

      handler(client, { type: 'clear:store', data: { schema: 'Pet' } });

      expect(deps.store.list('Pet')).toHaveLength(0);

      const message = getLastMessage(client);
      expect(message.type).toBe('store:cleared');
      expect((message.data as { schema: string }).schema).toBe('Pet');
      expect((message.data as { success: boolean }).success).toBe(true);
    });
  });

  describe('set:simulation', () => {
    it('should set a simulation and broadcast', () => {
      const deps = createTestDeps();
      const handler = createCommandHandler(deps);
      const client = createMockClient();
      deps.wsHub.addClient(client);
      client.messages.length = 0;

      handler(client, {
        type: 'set:simulation',
        data: { path: '/pets', status: 500 },
      });

      expect(deps.simulationManager.get('/pets')).toBeDefined();
      expect(deps.simulationManager.get('/pets')?.status).toBe(500);

      const message = getLastMessage(client);
      expect(message.type).toBe('simulation:set');
      expect((message.data as { path: string }).path).toBe('/pets');
    });
  });

  describe('clear:simulation', () => {
    it('should remove a simulation and broadcast', () => {
      const deps = createTestDeps();
      deps.simulationManager.set({ path: '/pets', operationId: 'listPets', status: 500 });
      const handler = createCommandHandler(deps);
      const client = createMockClient();
      deps.wsHub.addClient(client);
      client.messages.length = 0;

      handler(client, { type: 'clear:simulation', data: { path: '/pets' } });

      expect(deps.simulationManager.get('/pets')).toBeUndefined();

      const message = getLastMessage(client);
      expect(message.type).toBe('simulation:cleared');
      expect((message.data as { success: boolean }).success).toBe(true);
    });

    it('should report success false when simulation not found', () => {
      const deps = createTestDeps();
      const handler = createCommandHandler(deps);
      const client = createMockClient();
      deps.wsHub.addClient(client);
      client.messages.length = 0;

      handler(client, { type: 'clear:simulation', data: { path: '/nonexistent' } });

      const message = getLastMessage(client);
      expect((message.data as { success: boolean }).success).toBe(false);
    });
  });

  describe('clear:timeline', () => {
    it('should clear timeline and broadcast', () => {
      const timeline = [
        { id: '1', timestamp: '2026-01-01T00:00:00Z', type: 'request' as const, data: {} },
      ];
      const deps = createTestDeps({ timeline });
      const handler = createCommandHandler(deps);
      const client = createMockClient();
      deps.wsHub.addClient(client);
      client.messages.length = 0;

      handler(client, { type: 'clear:timeline' });

      expect(timeline).toHaveLength(0);

      const message = getLastMessage(client);
      expect(message.type).toBe('timeline:cleared');
      expect((message.data as { count: number }).count).toBe(1);
    });
  });

  describe('reseed', () => {
    it('should clear store and re-insert seed data', () => {
      const seeds = new Map<string, unknown[]>();
      seeds.set('Pet', [
        { id: 1, name: 'Buddy' },
        { id: 2, name: 'Max' },
      ]);
      const deps = createTestDeps({ getSeeds: () => seeds });

      // Add some extra data that should be cleared on reseed
      deps.store.create('Pet', { id: 99, name: 'ExtraItem' });

      const handler = createCommandHandler(deps);
      const client = createMockClient();
      deps.wsHub.addClient(client);
      client.messages.length = 0;

      handler(client, { type: 'reseed' });

      // Should have only the seed data, not the extra item
      expect(deps.store.list('Pet')).toHaveLength(2);
      expect(deps.store.get('Pet', 99)).toBeNull();
      expect(deps.store.get('Pet', 1)).toEqual({ id: 1, name: 'Buddy' });

      const message = getLastMessage(client);
      expect(message.type).toBe('reseeded');
      expect((message.data as { success: boolean }).success).toBe(true);
      expect((message.data as { schemas: string[] }).schemas).toContain('Pet');
    });

    it('should use latest seeds from getter', () => {
      let currentSeeds = new Map<string, unknown[]>();
      currentSeeds.set('Pet', [{ id: 1, name: 'V1' }]);

      const deps = createTestDeps({ getSeeds: () => currentSeeds });
      const handler = createCommandHandler(deps);
      const client = createMockClient();
      deps.wsHub.addClient(client);

      // Update seeds after handler creation
      currentSeeds = new Map<string, unknown[]>();
      currentSeeds.set('Pet', [{ id: 2, name: 'V2' }]);

      client.messages.length = 0;
      handler(client, { type: 'reseed' });

      // Should have V2 data, not V1
      expect(deps.store.get('Pet', 2)).toEqual({ id: 2, name: 'V2' });
      expect(deps.store.get('Pet', 1)).toBeNull();
    });
  });

  describe('unknown command', () => {
    it('should warn on unhandled command type', () => {
      const deps = createTestDeps();
      const handler = createCommandHandler(deps);
      const client = createMockClient();
      deps.wsHub.addClient(client);
      client.messages.length = 0;

      handler(client, { type: 'unknown:command' } as unknown as Parameters<typeof handler>[1]);

      expect(deps.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unhandled command type'),
      );
      expect(client.messages).toHaveLength(0);
    });
  });

  describe('validation errors', () => {
    it('should send error when get:store schema is missing', () => {
      const deps = createTestDeps();
      const handler = createCommandHandler(deps);
      const client = createMockClient();
      deps.wsHub.addClient(client);
      client.messages.length = 0;

      handler(client, { type: 'get:store', data: { schema: '' } } as unknown as Parameters<
        typeof handler
      >[1]);

      const message = getLastMessage(client);
      expect(message.type).toBe('error');
      expect((message.data as { command: string }).command).toBe('get:store');
    });

    it('should send error when set:store items is not an array', () => {
      const deps = createTestDeps();
      const handler = createCommandHandler(deps);
      const client = createMockClient();
      deps.wsHub.addClient(client);
      client.messages.length = 0;

      handler(client, {
        type: 'set:store',
        data: { schema: 'Pet', items: 'not-an-array' },
      } as unknown as Parameters<typeof handler>[1]);

      const message = getLastMessage(client);
      expect(message.type).toBe('error');
      expect((message.data as { command: string }).command).toBe('set:store');
    });

    it('should send error when set:simulation has invalid status code', () => {
      const deps = createTestDeps();
      const handler = createCommandHandler(deps);
      const client = createMockClient();
      deps.wsHub.addClient(client);
      client.messages.length = 0;

      handler(client, {
        type: 'set:simulation',
        data: { path: '/pets', status: 99 },
      });

      const message = getLastMessage(client);
      expect(message.type).toBe('error');
      expect((message.data as { command: string }).command).toBe('set:simulation');
      expect((message.data as { message: string }).message).toContain('status');
    });

    it('should send error when set:simulation has negative delay', () => {
      const deps = createTestDeps();
      const handler = createCommandHandler(deps);
      const client = createMockClient();
      deps.wsHub.addClient(client);
      client.messages.length = 0;

      handler(client, {
        type: 'set:simulation',
        data: { path: '/pets', status: 500, delay: -1 },
      });

      const message = getLastMessage(client);
      expect(message.type).toBe('error');
      expect((message.data as { command: string }).command).toBe('set:simulation');
      expect((message.data as { message: string }).message).toContain('delay');
    });

    it('should send error when clear:simulation path is missing', () => {
      const deps = createTestDeps();
      const handler = createCommandHandler(deps);
      const client = createMockClient();
      deps.wsHub.addClient(client);
      client.messages.length = 0;

      handler(client, {
        type: 'clear:simulation',
        data: { path: '' },
      } as unknown as Parameters<typeof handler>[1]);

      const message = getLastMessage(client);
      expect(message.type).toBe('error');
      expect((message.data as { command: string }).command).toBe('clear:simulation');
    });
  });
});
