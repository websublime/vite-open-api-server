/**
 * WebSocket Hub Tests
 *
 * Tests for the WebSocket hub implementation including:
 * - Client connection management
 * - Broadcasting events
 * - Command handling
 * - Error scenarios
 */

import { describe, expect, it, vi } from 'vitest';

import { createWebSocketHub, type WebSocketClient } from '../hub.js';
import type { ClientCommand, ServerEvent } from '../protocol.js';

/**
 * Create a mock WebSocket client
 */
function createMockClient(overrides: Partial<WebSocketClient> = {}): WebSocketClient & {
  messages: string[];
} {
  const messages: string[] = [];
  return {
    readyState: 1, // OPEN
    send: vi.fn((message: string) => {
      messages.push(message);
    }),
    messages,
    ...overrides,
  };
}

describe('createWebSocketHub', () => {
  describe('initialization', () => {
    it('should create a hub with default options', () => {
      const hub = createWebSocketHub();

      expect(hub).toBeDefined();
      expect(hub.getClientCount()).toBe(0);
    });

    it('should accept custom server version', () => {
      const hub = createWebSocketHub({ serverVersion: '1.5.0' });
      const client = createMockClient();

      hub.addClient(client);

      expect(client.messages).toHaveLength(1);
      const event = JSON.parse(client.messages[0]) as ServerEvent;
      expect(event.type).toBe('connected');
      expect(event.data).toEqual({ serverVersion: '1.5.0' });
    });

    it('should use default version 2.0.0 when not specified', () => {
      const hub = createWebSocketHub();
      const client = createMockClient();

      hub.addClient(client);

      const event = JSON.parse(client.messages[0]) as ServerEvent;
      expect(event.data).toEqual({ serverVersion: '2.0.0' });
    });
  });

  describe('addClient', () => {
    it('should add a client to the hub', () => {
      const hub = createWebSocketHub();
      const client = createMockClient();

      hub.addClient(client);

      expect(hub.getClientCount()).toBe(1);
      expect(hub.hasClient(client)).toBe(true);
    });

    it('should send connected event on client add', () => {
      const hub = createWebSocketHub();
      const client = createMockClient();

      hub.addClient(client);

      expect(client.send).toHaveBeenCalledTimes(1);
      const message = (client.send as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
      const event = JSON.parse(message) as ServerEvent;
      expect(event.type).toBe('connected');
    });

    it('should handle multiple clients', () => {
      const hub = createWebSocketHub();
      const client1 = createMockClient();
      const client2 = createMockClient();
      const client3 = createMockClient();

      hub.addClient(client1);
      hub.addClient(client2);
      hub.addClient(client3);

      expect(hub.getClientCount()).toBe(3);
      expect(hub.hasClient(client1)).toBe(true);
      expect(hub.hasClient(client2)).toBe(true);
      expect(hub.hasClient(client3)).toBe(true);
    });

    it('should not duplicate clients when added twice', () => {
      const hub = createWebSocketHub();
      const client = createMockClient();

      hub.addClient(client);
      hub.addClient(client);

      expect(hub.getClientCount()).toBe(1);
    });
  });

  describe('autoConnect option', () => {
    it('should send connected event by default (autoConnect not specified)', () => {
      const hub = createWebSocketHub();
      const client = createMockClient();

      hub.addClient(client);

      expect(client.messages).toHaveLength(1);
      const event = JSON.parse(client.messages[0]) as ServerEvent;
      expect(event.type).toBe('connected');
      expect(event.data).toEqual({ serverVersion: '2.0.0' });
    });

    it('should send connected event when autoConnect is explicitly true', () => {
      const hub = createWebSocketHub({ autoConnect: true });
      const client = createMockClient();

      hub.addClient(client);

      expect(client.messages).toHaveLength(1);
      const event = JSON.parse(client.messages[0]) as ServerEvent;
      expect(event.type).toBe('connected');
    });

    it('should not send connected event when autoConnect is false', () => {
      const hub = createWebSocketHub({ autoConnect: false });
      const client = createMockClient();

      hub.addClient(client);

      expect(client.messages).toHaveLength(0);
      expect(hub.hasClient(client)).toBe(true);
      expect(hub.getClientCount()).toBe(1);
    });

    it('should still allow manual event sending when autoConnect is false', () => {
      const hub = createWebSocketHub({ autoConnect: false });
      const client = createMockClient();

      hub.addClient(client);
      expect(client.messages).toHaveLength(0);

      // Orchestrator sends its own connected event with spec metadata
      const customEvent: ServerEvent = {
        type: 'connected',
        data: { serverVersion: '2.0.0' },
      };
      hub.sendTo(client, customEvent);

      expect(client.messages).toHaveLength(1);
      const event = JSON.parse(client.messages[0]) as ServerEvent;
      expect(event.type).toBe('connected');
    });

    it('should still receive broadcasts when autoConnect is false', () => {
      const hub = createWebSocketHub({ autoConnect: false });
      const client = createMockClient();

      hub.addClient(client);
      expect(client.messages).toHaveLength(0);

      const event: ServerEvent = {
        type: 'handlers:updated',
        data: { count: 5 },
      };
      hub.broadcast(event);

      expect(client.messages).toHaveLength(1);
      const parsed = JSON.parse(client.messages[0]) as ServerEvent;
      expect(parsed.type).toBe('handlers:updated');
    });
  });

  describe('removeClient', () => {
    it('should remove a client from the hub', () => {
      const hub = createWebSocketHub();
      const client = createMockClient();

      hub.addClient(client);
      expect(hub.getClientCount()).toBe(1);

      hub.removeClient(client);
      expect(hub.getClientCount()).toBe(0);
      expect(hub.hasClient(client)).toBe(false);
    });

    it('should handle removing non-existent client gracefully', () => {
      const hub = createWebSocketHub();
      const client = createMockClient();

      // Should not throw
      expect(() => hub.removeClient(client)).not.toThrow();
      expect(hub.getClientCount()).toBe(0);
    });

    it('should only remove the specified client', () => {
      const hub = createWebSocketHub();
      const client1 = createMockClient();
      const client2 = createMockClient();

      hub.addClient(client1);
      hub.addClient(client2);

      hub.removeClient(client1);

      expect(hub.getClientCount()).toBe(1);
      expect(hub.hasClient(client1)).toBe(false);
      expect(hub.hasClient(client2)).toBe(true);
    });
  });

  describe('broadcast', () => {
    it('should broadcast event to all clients', () => {
      const hub = createWebSocketHub();
      const client1 = createMockClient();
      const client2 = createMockClient();
      const client3 = createMockClient();

      hub.addClient(client1);
      hub.addClient(client2);
      hub.addClient(client3);

      // Clear the connected event messages
      client1.messages.length = 0;
      client2.messages.length = 0;
      client3.messages.length = 0;

      const event: ServerEvent = {
        type: 'request',
        data: {
          id: '123',
          method: 'GET',
          path: '/pets',
          operationId: 'listPets',
          timestamp: Date.now(),
          headers: {},
          query: {},
        },
      };

      hub.broadcast(event);

      expect(client1.messages).toHaveLength(1);
      expect(client2.messages).toHaveLength(1);
      expect(client3.messages).toHaveLength(1);

      const parsed1 = JSON.parse(client1.messages[0]) as ServerEvent;
      expect(parsed1.type).toBe('request');
      expect(parsed1.data).toEqual(event.data);
    });

    it('should handle broadcast to empty hub', () => {
      const hub = createWebSocketHub();
      const event: ServerEvent = {
        type: 'connected',
        data: { serverVersion: '2.0.0' },
      };

      // Should not throw
      expect(() => hub.broadcast(event)).not.toThrow();
    });

    it('should remove stale clients during broadcast', () => {
      const hub = createWebSocketHub();
      const activeClient = createMockClient();
      const staleClient = createMockClient({ readyState: 3 }); // CLOSED

      hub.addClient(activeClient);
      hub.addClient(staleClient);

      expect(hub.getClientCount()).toBe(2);

      // Clear initial messages
      activeClient.messages.length = 0;

      const event: ServerEvent = {
        type: 'handlers:updated',
        data: { count: 5 },
      };

      hub.broadcast(event);

      // Stale client should be removed
      expect(hub.getClientCount()).toBe(1);
      expect(hub.hasClient(activeClient)).toBe(true);
      expect(hub.hasClient(staleClient)).toBe(false);

      // Active client should receive the message
      expect(activeClient.messages).toHaveLength(1);
    });

    it('should handle clients without readyState property', () => {
      const hub = createWebSocketHub();
      // Client without readyState (should be treated as open)
      const client = {
        send: vi.fn(),
      };

      hub.addClient(client as WebSocketClient);

      const event: ServerEvent = {
        type: 'seeds:updated',
        data: { count: 3 },
      };

      hub.broadcast(event);

      expect(client.send).toHaveBeenCalledTimes(2); // connected + broadcast
    });
  });

  describe('sendTo', () => {
    it('should send event to specific client', () => {
      const hub = createWebSocketHub();
      const client = createMockClient();

      hub.addClient(client);
      client.messages.length = 0; // Clear connected event

      const event: ServerEvent = {
        type: 'store:updated',
        data: { schema: 'Pet', action: 'create', count: 1 },
      };

      const result = hub.sendTo(client, event);

      expect(result).toBe(true);
      expect(client.messages).toHaveLength(1);
      const parsed = JSON.parse(client.messages[0]) as ServerEvent;
      expect(parsed.type).toBe('store:updated');
    });

    it('should return false for unknown client', () => {
      const hub = createWebSocketHub();
      const client = createMockClient();

      const event: ServerEvent = {
        type: 'connected',
        data: { serverVersion: '2.0.0' },
      };

      const result = hub.sendTo(client, event);

      expect(result).toBe(false);
      expect(client.send).not.toHaveBeenCalled();
    });

    it('should return false for closed client', () => {
      const hub = createWebSocketHub();
      const client = createMockClient({ readyState: 3 }); // CLOSED

      hub.addClient(client);
      client.messages.length = 0;

      const event: ServerEvent = {
        type: 'connected',
        data: { serverVersion: '2.0.0' },
      };

      const result = hub.sendTo(client, event);

      expect(result).toBe(false);
    });
  });

  describe('handleMessage', () => {
    it('should parse and handle valid command', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);

      const command: ClientCommand = { type: 'get:registry' };
      hub.handleMessage(client, JSON.stringify(command));

      expect(commandHandler).toHaveBeenCalledTimes(1);
      expect(commandHandler).toHaveBeenCalledWith(client, command);
    });

    it('should handle command as object', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);

      const command: ClientCommand = { type: 'get:timeline', data: { limit: 50 } };
      hub.handleMessage(client, command);

      expect(commandHandler).toHaveBeenCalledWith(client, command);
    });

    it('should ignore invalid JSON', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);
      hub.handleMessage(client, 'invalid json {{{');

      expect(commandHandler).not.toHaveBeenCalled();
    });

    it('should ignore commands without type', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);
      hub.handleMessage(client, JSON.stringify({ data: 'no type' }));

      expect(commandHandler).not.toHaveBeenCalled();
    });

    it('should ignore unknown command types', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);
      hub.handleMessage(client, JSON.stringify({ type: 'unknown:command' }));

      expect(commandHandler).not.toHaveBeenCalled();
    });

    it('should handle all valid command types', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);

      const validCommands: ClientCommand[] = [
        { type: 'get:registry' },
        { type: 'get:timeline', data: { limit: 100 } },
        { type: 'get:store', data: { schema: 'Pet' } },
        { type: 'set:store', data: { schema: 'Pet', items: [] } },
        { type: 'clear:store', data: { schema: 'Pet' } },
        { type: 'set:simulation', data: { path: '/pets', status: 500 } },
        { type: 'clear:simulation', data: { path: '/pets' } },
        { type: 'clear:timeline' },
        { type: 'reseed' },
      ];

      for (const command of validCommands) {
        hub.handleMessage(client, JSON.stringify(command));
      }

      expect(commandHandler).toHaveBeenCalledTimes(validCommands.length);
    });

    it('should handle when no command handler is set', () => {
      const hub = createWebSocketHub();
      const client = createMockClient();

      hub.addClient(client);

      // Should not throw
      expect(() => {
        hub.handleMessage(client, JSON.stringify({ type: 'get:registry' }));
      }).not.toThrow();
    });

    it('should send error event when command handler throws', () => {
      const commandHandler = vi.fn(() => {
        throw new Error('Handler failed');
      });
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);
      client.messages.length = 0; // Clear connected event

      hub.handleMessage(client, JSON.stringify({ type: 'get:registry' }));

      // Should have sent error event
      expect(client.messages).toHaveLength(1);
      const errorEvent = JSON.parse(client.messages[0]);
      expect(errorEvent.type).toBe('error');
      expect(errorEvent.data.command).toBe('get:registry');
      expect(errorEvent.data.message).toBe('Handler failed');
    });
  });

  describe('setCommandHandler', () => {
    it('should update command handler', () => {
      const hub = createWebSocketHub();
      const client = createMockClient();
      const newHandler = vi.fn();

      hub.addClient(client);
      hub.setCommandHandler(newHandler);

      hub.handleMessage(client, JSON.stringify({ type: 'get:registry' }));

      expect(newHandler).toHaveBeenCalled();
    });

    it('should replace existing command handler', () => {
      const originalHandler = vi.fn();
      const newHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: originalHandler });
      const client = createMockClient();

      hub.addClient(client);

      hub.handleMessage(client, JSON.stringify({ type: 'get:registry' }));
      expect(originalHandler).toHaveBeenCalledTimes(1);

      hub.setCommandHandler(newHandler);

      hub.handleMessage(client, JSON.stringify({ type: 'get:timeline' }));
      expect(originalHandler).toHaveBeenCalledTimes(1); // Not called again
      expect(newHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('getClientCount', () => {
    it('should return correct count', () => {
      const hub = createWebSocketHub();

      expect(hub.getClientCount()).toBe(0);

      hub.addClient(createMockClient());
      expect(hub.getClientCount()).toBe(1);

      hub.addClient(createMockClient());
      expect(hub.getClientCount()).toBe(2);
    });
  });

  describe('hasClient', () => {
    it('should return true for connected client', () => {
      const hub = createWebSocketHub();
      const client = createMockClient();

      hub.addClient(client);

      expect(hub.hasClient(client)).toBe(true);
    });

    it('should return false for unknown client', () => {
      const hub = createWebSocketHub();
      const client = createMockClient();

      expect(hub.hasClient(client)).toBe(false);
    });

    it('should return false after client removed', () => {
      const hub = createWebSocketHub();
      const client = createMockClient();

      hub.addClient(client);
      hub.removeClient(client);

      expect(hub.hasClient(client)).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all clients', () => {
      const hub = createWebSocketHub();
      const client1 = createMockClient();
      const client2 = createMockClient();
      const client3 = createMockClient();

      hub.addClient(client1);
      hub.addClient(client2);
      hub.addClient(client3);

      expect(hub.getClientCount()).toBe(3);

      hub.clear();

      expect(hub.getClientCount()).toBe(0);
      expect(hub.hasClient(client1)).toBe(false);
      expect(hub.hasClient(client2)).toBe(false);
      expect(hub.hasClient(client3)).toBe(false);
    });

    it('should handle clearing empty hub', () => {
      const hub = createWebSocketHub();

      expect(() => hub.clear()).not.toThrow();
      expect(hub.getClientCount()).toBe(0);
    });
  });

  describe('logging', () => {
    it('should call debug logger when provided', () => {
      const logger = {
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const hub = createWebSocketHub({ logger });
      const client = createMockClient();

      hub.addClient(client);

      expect(logger.debug).toHaveBeenCalled();
    });

    it('should call error logger on send failure', () => {
      const logger = {
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const hub = createWebSocketHub({ logger });
      const client = createMockClient({
        send: vi.fn(() => {
          throw new Error('Send failed');
        }),
      });

      hub.addClient(client);

      expect(logger.error).toHaveBeenCalled();
    });

    it('should work without logger', () => {
      const hub = createWebSocketHub();
      const client = createMockClient();

      // Should not throw
      expect(() => hub.addClient(client)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle client that throws on send during broadcast', () => {
      const hub = createWebSocketHub();
      const goodClient = createMockClient();
      const badClient = createMockClient({
        send: vi.fn(() => {
          throw new Error('Connection lost');
        }),
      });

      hub.addClient(goodClient);
      hub.addClient(badClient);

      goodClient.messages.length = 0;

      const event: ServerEvent = {
        type: 'handlers:updated',
        data: { count: 1 },
      };

      // Should not throw
      expect(() => hub.broadcast(event)).not.toThrow();

      // Good client should still receive message
      expect(goodClient.messages).toHaveLength(1);

      // Bad client should be removed
      expect(hub.getClientCount()).toBe(1);
      expect(hub.hasClient(goodClient)).toBe(true);
      expect(hub.hasClient(badClient)).toBe(false);
    });

    it('should handle null message in handleMessage', () => {
      const hub = createWebSocketHub();
      const client = createMockClient();

      hub.addClient(client);

      // Should not throw
      expect(() => hub.handleMessage(client, null as unknown as string)).not.toThrow();
    });

    it('should handle undefined message in handleMessage', () => {
      const hub = createWebSocketHub();
      const client = createMockClient();

      hub.addClient(client);

      // Should not throw
      expect(() => hub.handleMessage(client, undefined as unknown as string)).not.toThrow();
    });

    it('should handle empty string message', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);
      hub.handleMessage(client, '');

      // Empty string is not valid JSON or command
      expect(commandHandler).not.toHaveBeenCalled();
    });
  });

  describe('payload validation', () => {
    it('should reject get:store without schema', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);
      hub.handleMessage(client, JSON.stringify({ type: 'get:store' }));

      expect(commandHandler).not.toHaveBeenCalled();
    });

    it('should reject get:store with empty schema', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);
      hub.handleMessage(client, JSON.stringify({ type: 'get:store', data: { schema: '' } }));

      expect(commandHandler).not.toHaveBeenCalled();
    });

    it('should reject set:store without items array', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);
      hub.handleMessage(client, JSON.stringify({ type: 'set:store', data: { schema: 'Pet' } }));

      expect(commandHandler).not.toHaveBeenCalled();
    });

    it('should reject set:store with non-array items', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);
      hub.handleMessage(
        client,
        JSON.stringify({ type: 'set:store', data: { schema: 'Pet', items: 'not-array' } }),
      );

      expect(commandHandler).not.toHaveBeenCalled();
    });

    it('should accept set:store with valid payload', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);
      hub.handleMessage(
        client,
        JSON.stringify({ type: 'set:store', data: { schema: 'Pet', items: [{ id: 1 }] } }),
      );

      expect(commandHandler).toHaveBeenCalledTimes(1);
    });

    it('should reject clear:store without schema', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);
      hub.handleMessage(client, JSON.stringify({ type: 'clear:store' }));

      expect(commandHandler).not.toHaveBeenCalled();
    });

    it('should reject set:simulation without path', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);
      hub.handleMessage(client, JSON.stringify({ type: 'set:simulation', data: { status: 500 } }));

      expect(commandHandler).not.toHaveBeenCalled();
    });

    it('should reject set:simulation without status', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);
      hub.handleMessage(
        client,
        JSON.stringify({ type: 'set:simulation', data: { path: '/pets' } }),
      );

      expect(commandHandler).not.toHaveBeenCalled();
    });

    it('should reject set:simulation with non-number status', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);
      hub.handleMessage(
        client,
        JSON.stringify({ type: 'set:simulation', data: { path: '/pets', status: '500' } }),
      );

      expect(commandHandler).not.toHaveBeenCalled();
    });

    it('should accept set:simulation with valid payload', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);
      hub.handleMessage(
        client,
        JSON.stringify({ type: 'set:simulation', data: { path: '/pets', status: 500 } }),
      );

      expect(commandHandler).toHaveBeenCalledTimes(1);
    });

    it('should reject clear:simulation without path', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);
      hub.handleMessage(client, JSON.stringify({ type: 'clear:simulation', data: {} }));

      expect(commandHandler).not.toHaveBeenCalled();
    });

    it('should accept get:timeline without data', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);
      hub.handleMessage(client, JSON.stringify({ type: 'get:timeline' }));

      expect(commandHandler).toHaveBeenCalledTimes(1);
    });

    it('should accept get:timeline with valid limit', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);
      hub.handleMessage(client, JSON.stringify({ type: 'get:timeline', data: { limit: 50 } }));

      expect(commandHandler).toHaveBeenCalledTimes(1);
    });

    it('should reject get:timeline with non-number limit', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);
      hub.handleMessage(client, JSON.stringify({ type: 'get:timeline', data: { limit: '50' } }));

      expect(commandHandler).not.toHaveBeenCalled();
    });

    it('should reject get:timeline with non-object data', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);
      hub.handleMessage(client, JSON.stringify({ type: 'get:timeline', data: 'invalid' }));

      expect(commandHandler).not.toHaveBeenCalled();
    });

    it('should accept commands without data requirements', () => {
      const commandHandler = vi.fn();
      const hub = createWebSocketHub({ onCommand: commandHandler });
      const client = createMockClient();

      hub.addClient(client);

      // These commands don't require data
      hub.handleMessage(client, JSON.stringify({ type: 'get:registry' }));
      hub.handleMessage(client, JSON.stringify({ type: 'clear:timeline' }));
      hub.handleMessage(client, JSON.stringify({ type: 'reseed' }));

      expect(commandHandler).toHaveBeenCalledTimes(3);
    });
  });

  describe('default logger', () => {
    it('should use console as default logger when none provided', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
      const hub = createWebSocketHub();
      const client = createMockClient();

      hub.addClient(client);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should use custom logger when provided', () => {
      const customLogger = {
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      const hub = createWebSocketHub({ logger: customLogger });
      const client = createMockClient();

      hub.addClient(client);

      expect(customLogger.debug).toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle logger with only some methods defined', () => {
      const partialLogger = {
        warn: vi.fn(),
        // debug and error not defined
      };

      const hub = createWebSocketHub({ logger: partialLogger });
      const client = createMockClient();

      // Should not throw even though debug is not defined
      expect(() => hub.addClient(client)).not.toThrow();
    });
  });
});
