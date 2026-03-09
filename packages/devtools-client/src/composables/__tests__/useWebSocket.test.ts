/**
 * Unit tests for useWebSocket composable
 *
 * What: Tests WebSocket connection management functionality
 * How: Uses Vitest with mocked WebSocket API
 * Why: Ensures connection, reconnection, event handling, and command sending work correctly
 *
 * @vitest-environment jsdom
 */

import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSpecsStore } from '../../stores/specs';
import { type ClientCommand, type ServerEvent, useWebSocket } from '../useWebSocket';

/**
 * Mock WebSocket class
 */
class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  static instances: MockWebSocket[] = [];

  /**
   * When set to true, new MockWebSocket instances will NOT auto-connect.
   * Useful for testing connection failure scenarios.
   */
  static shouldFailNextConnection = false;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);

    // Check if this connection should fail
    const shouldFail = MockWebSocket.shouldFailNextConnection;
    MockWebSocket.shouldFailNextConnection = false; // Reset for next connection

    if (shouldFail) {
      // Simulate immediate connection failure
      setTimeout(() => {
        if (this.readyState === MockWebSocket.CONNECTING) {
          this.readyState = MockWebSocket.CLOSED;
          this.onclose?.(new CloseEvent('close'));
        }
      }, 0);
    } else {
      // Simulate async connection success
      setTimeout(() => {
        if (this.readyState === MockWebSocket.CONNECTING) {
          this.readyState = MockWebSocket.OPEN;
          this.onopen?.(new Event('open'));
        }
      }, 0);
    }
  }

  send(data: string): void {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  // Test helpers
  simulateMessage(data: unknown): void {
    const event = new MessageEvent('message', {
      data: JSON.stringify(data),
    });
    this.onmessage?.(event);
  }

  simulateError(): void {
    this.onerror?.(new Event('error'));
  }

  simulateDisconnect(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  static clearInstances(): void {
    MockWebSocket.instances = [];
    MockWebSocket.shouldFailNextConnection = false;
  }
}

// Store original WebSocket
const originalWebSocket = global.WebSocket;

/**
 * Helper: create mock SpecInfo objects for testing
 */
function createMockSpecs(count = 2) {
  return Array.from({ length: count }, (_, i) => ({
    id: `spec-${i + 1}`,
    title: `Spec ${i + 1}`,
    version: `1.${i}.0`,
    proxyPath: `/api/spec${i + 1}`,
    color: `#${String(i + 1).padStart(6, '0')}`,
    endpointCount: 10 + i,
    schemaCount: 5 + i,
  }));
}

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.clearInstances();

    // Set up Pinia so that useSpecsStore() works inside handleMessage
    setActivePinia(createPinia());

    // Replace global WebSocket with MockWebSocket class
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    // Reset singleton state
    const { resetState } = useWebSocket();
    resetState();

    vi.useRealTimers();
    vi.clearAllMocks();
    global.WebSocket = originalWebSocket;
    MockWebSocket.clearInstances();
  });

  describe('initialization', () => {
    it('should initialize with disconnected state', () => {
      const { connectionState, connected, serverVersion } = useWebSocket({ autoConnect: false });

      expect(connectionState.value).toBe('disconnected');
      expect(connected.value).toBe(false);
      expect(serverVersion.value).toBeNull();
    });

    it('should use default options', () => {
      const { connect } = useWebSocket({ autoConnect: false });

      connect();

      expect(MockWebSocket.instances).toHaveLength(1);
      // jsdom provides localhost:3000, so we match that
      expect(MockWebSocket.instances[0].url).toContain('/_ws');
      expect(MockWebSocket.instances[0].url).toMatch(/^wss?:\/\//);
    });

    it('should accept custom path option', () => {
      const { connect } = useWebSocket({ path: '/custom-ws', autoConnect: false });

      connect();

      expect(MockWebSocket.instances[0].url).toContain('/custom-ws');
    });
  });

  describe('connect', () => {
    it('should set state to connecting when connect is called', () => {
      const { connect, connectionState } = useWebSocket({ autoConnect: false });

      connect();

      expect(connectionState.value).toBe('connecting');
    });

    it('should set state to connected when WebSocket opens', async () => {
      const { connect, connectionState, connected } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      expect(connectionState.value).toBe('connected');
      expect(connected.value).toBe(true);
    });

    it('should not create multiple connections if already connected', async () => {
      const { connect } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      connect();
      connect();

      expect(MockWebSocket.instances).toHaveLength(1);
    });

    it('should not create connection if already connecting', () => {
      const { connect } = useWebSocket({ autoConnect: false });

      connect();
      connect();
      connect();

      // Only one WebSocket should be created
      expect(MockWebSocket.instances).toHaveLength(1);
    });
  });

  describe('disconnect', () => {
    it('should set state to disconnected when disconnect is called', async () => {
      const { connect, disconnect, connectionState } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();
      expect(connectionState.value).toBe('connected');

      disconnect();
      expect(connectionState.value).toBe('disconnected');
    });

    it('should close the WebSocket connection', async () => {
      const { connect, disconnect } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      const ws = MockWebSocket.instances[0];
      disconnect();

      expect(ws.readyState).toBe(MockWebSocket.CLOSED);
    });

    it('should reset reconnect attempts', async () => {
      const { connect, disconnect, reconnectAttempts } = useWebSocket({
        autoConnect: false,
        reconnectDelay: 1000,
      });

      connect();
      await vi.runAllTimersAsync();

      // Simulate disconnect to trigger reconnect
      MockWebSocket.instances[0].simulateDisconnect();
      await vi.advanceTimersByTimeAsync(500);

      // Manually disconnect before reconnect completes
      disconnect();

      expect(reconnectAttempts.value).toBe(0);
    });
  });

  describe('auto-reconnect', () => {
    it('should attempt to reconnect after disconnection', async () => {
      const { connect, connectionState, isReconnecting } = useWebSocket({
        autoConnect: false,
        reconnectDelay: 2000,
      });

      connect();
      await vi.runAllTimersAsync();

      // Simulate unexpected disconnect
      MockWebSocket.instances[0].simulateDisconnect();

      expect(connectionState.value).toBe('reconnecting');
      expect(isReconnecting.value).toBe(true);
    });

    it('should reconnect after specified delay', async () => {
      const { connect } = useWebSocket({
        autoConnect: false,
        reconnectDelay: 2000,
      });

      connect();
      await vi.runAllTimersAsync();

      // Simulate disconnect
      MockWebSocket.instances[0].simulateDisconnect();

      expect(MockWebSocket.instances).toHaveLength(1);

      // Wait for reconnect delay
      await vi.advanceTimersByTimeAsync(2000);

      expect(MockWebSocket.instances).toHaveLength(2);
    });

    it('should increment reconnect attempts', async () => {
      const { connect, reconnectAttempts } = useWebSocket({
        autoConnect: false,
        reconnectDelay: 1000,
      });

      connect();
      await vi.runAllTimersAsync();
      expect(reconnectAttempts.value).toBe(0);

      // First disconnect
      MockWebSocket.instances[0].simulateDisconnect();
      expect(reconnectAttempts.value).toBe(1);

      // Wait for reconnect - after successful reconnect, attempts reset to 0
      await vi.advanceTimersByTimeAsync(1000);
      await vi.runAllTimersAsync();

      // After successful reconnect, attempts should be reset
      expect(reconnectAttempts.value).toBe(0);

      // Second disconnect starts count again from 1
      MockWebSocket.instances[1].simulateDisconnect();
      expect(reconnectAttempts.value).toBe(1);
    });

    it('should respect maxReconnectAttempts option', async () => {
      // This test verifies that maxReconnectAttempts limits reconnection attempts
      // Note: The counter resets after each successful connection
      const { connect, reconnectAttempts, connectionState } = useWebSocket({
        autoConnect: false,
        reconnectDelay: 100,
        maxReconnectAttempts: 3,
      });

      connect();
      await vi.runAllTimersAsync();
      expect(connectionState.value).toBe('connected');
      expect(reconnectAttempts.value).toBe(0);

      // Disconnect - should trigger reconnect attempt
      MockWebSocket.instances[0].simulateDisconnect();
      expect(reconnectAttempts.value).toBe(1);
      expect(connectionState.value).toBe('reconnecting');

      // Wait for reconnect to complete
      await vi.advanceTimersByTimeAsync(100);
      await vi.runAllTimersAsync();

      // After successful reconnect, attempts should reset
      expect(connectionState.value).toBe('connected');
      expect(reconnectAttempts.value).toBe(0);
    });

    it('should stop reconnecting after maxReconnectAttempts consecutive failures', async () => {
      const maxAttempts = 3;
      const { connect, reconnectAttempts, connectionState } = useWebSocket({
        autoConnect: false,
        reconnectDelay: 100,
        maxReconnectAttempts: maxAttempts,
      });

      // Initial connection (successful)
      connect();
      await vi.runAllTimersAsync();
      expect(connectionState.value).toBe('connected');
      expect(reconnectAttempts.value).toBe(0);

      // First disconnect from initial successful connection - triggers attempt 1
      // Set flag BEFORE disconnecting so next reconnect will fail
      MockWebSocket.shouldFailNextConnection = true;
      MockWebSocket.instances[0].simulateDisconnect();
      expect(reconnectAttempts.value).toBe(1);
      expect(connectionState.value).toBe('reconnecting');

      // Advance reconnect timer (100ms) - this creates new WebSocket
      // The MockWebSocket constructor consumes shouldFailNextConnection
      // Then after 0ms it will call onclose (simulating failure)
      // But we need to set the flag for the NEXT attempt before the failure triggers another reconnect
      await vi.advanceTimersByTimeAsync(100);
      // New instance created, flag consumed. Set for next attempt BEFORE running pending timers.
      MockWebSocket.shouldFailNextConnection = true;
      // Run pending 0ms timers to trigger the failure
      await vi.runOnlyPendingTimersAsync();
      expect(reconnectAttempts.value).toBe(2);
      expect(connectionState.value).toBe('reconnecting');

      // Attempt 2 -> 3
      await vi.advanceTimersByTimeAsync(100);
      MockWebSocket.shouldFailNextConnection = true;
      await vi.runOnlyPendingTimersAsync();
      expect(reconnectAttempts.value).toBe(3);
      expect(connectionState.value).toBe('reconnecting');

      // Attempt 3 is the last allowed. Next failure should stop reconnecting.
      await vi.advanceTimersByTimeAsync(100);
      // Don't set shouldFailNextConnection - let it succeed, then manually disconnect
      await vi.runOnlyPendingTimersAsync();
      // Connection should have opened successfully (attempts reset to 0)
      // Now simulate this connection also failing
      const lastInstance = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      lastInstance.simulateDisconnect();

      // Should have stopped - no more reconnecting
      expect(reconnectAttempts.value).toBe(3);
      expect(connectionState.value).toBe('disconnected');

      const instanceCountAfterMaxAttempts = MockWebSocket.instances.length;

      // Wait more time - no new connections should be created
      await vi.advanceTimersByTimeAsync(500);
      expect(MockWebSocket.instances.length).toBe(instanceCountAfterMaxAttempts);
      expect(connectionState.value).toBe('disconnected');
    });

    it('should reset reconnect attempts after successful connection', async () => {
      const { connect, reconnectAttempts } = useWebSocket({
        autoConnect: false,
        reconnectDelay: 100,
      });

      connect();
      await vi.runAllTimersAsync();

      // Disconnect and reconnect
      MockWebSocket.instances[0].simulateDisconnect();
      expect(reconnectAttempts.value).toBe(1);

      await vi.advanceTimersByTimeAsync(100);
      await vi.runAllTimersAsync();

      // After successful reconnect, attempts should be reset
      expect(reconnectAttempts.value).toBe(0);
    });
  });

  describe('message handling', () => {
    it('should extract server version from connected event', async () => {
      const { connect, serverVersion } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      const connectedEvent: ServerEvent = {
        type: 'connected',
        data: { serverVersion: '2.0.0' },
      };

      MockWebSocket.instances[0].simulateMessage(connectedEvent);

      expect(serverVersion.value).toBe('2.0.0');
    });

    it('should dispatch events to registered handlers', async () => {
      const { connect, on } = useWebSocket({ autoConnect: false });
      const handler = vi.fn();

      connect();
      await vi.runAllTimersAsync();

      on('request', handler);

      const requestEvent: ServerEvent = {
        type: 'request',
        data: { id: '123', method: 'GET', path: '/api/test' },
      };

      MockWebSocket.instances[0].simulateMessage(requestEvent);

      expect(handler).toHaveBeenCalledWith(requestEvent.data);
    });

    it('should dispatch to wildcard handlers', async () => {
      const { connect, on } = useWebSocket({ autoConnect: false });
      const wildcardHandler = vi.fn();

      connect();
      await vi.runAllTimersAsync();

      on('*', wildcardHandler);

      const event: ServerEvent = {
        type: 'store:updated',
        data: { schema: 'Pet', action: 'create' },
      };

      MockWebSocket.instances[0].simulateMessage(event);

      expect(wildcardHandler).toHaveBeenCalledWith({
        type: 'store:updated',
        data: event.data,
      });
    });

    it('should handle malformed JSON messages gracefully', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { connect } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      const ws = MockWebSocket.instances[0];
      const event = new MessageEvent('message', {
        data: 'not valid json',
      });
      ws.onmessage?.(event);

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should catch errors in event handlers', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { connect, on } = useWebSocket({ autoConnect: false });

      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });

      connect();
      await vi.runAllTimersAsync();

      on('request', errorHandler);

      const event: ServerEvent = {
        type: 'request',
        data: { id: '123' },
      };

      // Should not throw
      expect(() => {
        MockWebSocket.instances[0].simulateMessage(event);
      }).not.toThrow();

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('event subscription', () => {
    it('should subscribe to events with on()', async () => {
      const { connect, on } = useWebSocket({ autoConnect: false });
      const handler = vi.fn();

      connect();
      await vi.runAllTimersAsync();

      on('response', handler);

      const event: ServerEvent = {
        type: 'response',
        data: { id: '123', status: 200 },
      };

      MockWebSocket.instances[0].simulateMessage(event);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function from on()', async () => {
      const { connect, on } = useWebSocket({ autoConnect: false });
      const handler = vi.fn();

      connect();
      await vi.runAllTimersAsync();

      const unsubscribe = on('response', handler);

      const event: ServerEvent = {
        type: 'response',
        data: { id: '123', status: 200 },
      };

      MockWebSocket.instances[0].simulateMessage(event);
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      MockWebSocket.instances[0].simulateMessage(event);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe with off()', async () => {
      const { connect, on, off } = useWebSocket({ autoConnect: false });
      const handler = vi.fn();

      connect();
      await vi.runAllTimersAsync();

      on('response', handler);

      const event: ServerEvent = {
        type: 'response',
        data: { id: '123', status: 200 },
      };

      MockWebSocket.instances[0].simulateMessage(event);
      expect(handler).toHaveBeenCalledTimes(1);

      off('response', handler);

      MockWebSocket.instances[0].simulateMessage(event);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support multiple handlers for same event', async () => {
      const { connect, on } = useWebSocket({ autoConnect: false });
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      connect();
      await vi.runAllTimersAsync();

      on('request', handler1);
      on('request', handler2);

      const event: ServerEvent = {
        type: 'request',
        data: { id: '123' },
      };

      MockWebSocket.instances[0].simulateMessage(event);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe once() handler after first invocation (one-shot)', async () => {
      const { connect, once } = useWebSocket({ autoConnect: false });
      let callCount = 0;

      connect();
      await vi.runAllTimersAsync();

      once('request', () => {
        callCount++;
      });

      const event: ServerEvent = {
        type: 'request',
        data: { id: '123' },
      };

      MockWebSocket.instances[0].simulateMessage(event);
      MockWebSocket.instances[0].simulateMessage(event);
      MockWebSocket.instances[0].simulateMessage(event);

      // once() is a true one-shot - should only be called once
      expect(callCount).toBe(1);
    });

    it('should allow cancelling once() subscription before event fires', async () => {
      const { connect, once } = useWebSocket({ autoConnect: false });
      let callCount = 0;

      connect();
      await vi.runAllTimersAsync();

      const unsubscribe = once('request', () => {
        callCount++;
      });

      // Cancel before any event
      unsubscribe();

      const event: ServerEvent = {
        type: 'request',
        data: { id: '123' },
      };

      MockWebSocket.instances[0].simulateMessage(event);

      expect(callCount).toBe(0);
    });

    it('should unsubscribe onUntil() handler when it returns true', async () => {
      const { connect, onUntil } = useWebSocket({ autoConnect: false });
      let callCount = 0;

      connect();
      await vi.runAllTimersAsync();

      onUntil('request', () => {
        callCount++;
        return true; // Unsubscribe after first call
      });

      const event: ServerEvent = {
        type: 'request',
        data: { id: '123' },
      };

      MockWebSocket.instances[0].simulateMessage(event);
      MockWebSocket.instances[0].simulateMessage(event);

      expect(callCount).toBe(1);
    });

    it('should keep onUntil() handler subscribed when it returns false/void', async () => {
      const { connect, onUntil } = useWebSocket({ autoConnect: false });
      let callCount = 0;

      connect();
      await vi.runAllTimersAsync();

      onUntil('request', () => {
        callCount++;
        // Returning undefined keeps subscription
        return undefined;
      });

      const event: ServerEvent = {
        type: 'request',
        data: { id: '123' },
      };

      MockWebSocket.instances[0].simulateMessage(event);
      MockWebSocket.instances[0].simulateMessage(event);
      MockWebSocket.instances[0].simulateMessage(event);

      expect(callCount).toBe(3);
    });

    it('should unsubscribe onUntil() when condition is met', async () => {
      const { connect, onUntil } = useWebSocket({ autoConnect: false });
      const receivedIds: string[] = [];

      connect();
      await vi.runAllTimersAsync();

      // Keep listening until we get id '3'
      onUntil<{ id: string }>('request', (data) => {
        receivedIds.push(data.id);
        return data.id === '3'; // Unsubscribe when we see id '3'
      });

      MockWebSocket.instances[0].simulateMessage({ type: 'request', data: { id: '1' } });
      MockWebSocket.instances[0].simulateMessage({ type: 'request', data: { id: '2' } });
      MockWebSocket.instances[0].simulateMessage({ type: 'request', data: { id: '3' } });
      MockWebSocket.instances[0].simulateMessage({ type: 'request', data: { id: '4' } });

      // Should have received 1, 2, 3 but not 4
      expect(receivedIds).toEqual(['1', '2', '3']);
    });
  });

  describe('send', () => {
    it('should send command to WebSocket', async () => {
      const { connect, send } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      const command: ClientCommand = { type: 'get:registry' };
      const result = send(command);

      expect(result).toBe(true);
      expect(MockWebSocket.instances[0].sentMessages).toHaveLength(1);
      expect(JSON.parse(MockWebSocket.instances[0].sentMessages[0])).toEqual(command);
    });

    it('should return false when not connected', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { send } = useWebSocket({ autoConnect: false });

      const command: ClientCommand = { type: 'get:registry' };
      const result = send(command);

      expect(result).toBe(false);
      warnSpy.mockRestore();
    });

    it('should send command with data', async () => {
      const { connect, send } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      const command: ClientCommand = {
        type: 'get:store',
        data: { schema: 'Pet' },
      };

      send(command);

      expect(JSON.parse(MockWebSocket.instances[0].sentMessages[0])).toEqual(command);
    });

    it('should handle send errors gracefully', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { connect, send } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      // Make send throw
      const ws = MockWebSocket.instances[0];
      ws.send = () => {
        throw new Error('Send failed');
      };

      const command: ClientCommand = { type: 'get:registry' };
      const result = send(command);

      expect(result).toBe(false);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('resetState', () => {
    it('should disconnect and reset all state', async () => {
      const { connect, serverVersion, resetState, connectionState } = useWebSocket({
        autoConnect: false,
      });

      connect();
      await vi.runAllTimersAsync();

      const connectedEvent: ServerEvent = {
        type: 'connected',
        data: { serverVersion: '2.0.0' },
      };
      MockWebSocket.instances[0].simulateMessage(connectedEvent);

      expect(serverVersion.value).toBe('2.0.0');
      expect(connectionState.value).toBe('connected');

      resetState();

      expect(connectionState.value).toBe('disconnected');
      expect(serverVersion.value).toBeNull();
    });

    it('should clear all event handlers', async () => {
      const { connect, on, resetState } = useWebSocket({ autoConnect: false });
      const handler = vi.fn();

      connect();
      await vi.runAllTimersAsync();

      on('request', handler);

      resetState();

      // Reconnect to test handlers are cleared
      const { connect: reconnect } = useWebSocket({ autoConnect: false });
      reconnect();
      await vi.runAllTimersAsync();

      const event: ServerEvent = {
        type: 'request',
        data: { id: '123' },
      };

      // Get the latest WebSocket instance (after reconnect)
      const latestWs = MockWebSocket.instances[MockWebSocket.instances.length - 1];
      latestWs.simulateMessage(event);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('singleton state', () => {
    it('should share state between multiple useWebSocket calls', async () => {
      const ws1 = useWebSocket({ autoConnect: false });
      const ws2 = useWebSocket({ autoConnect: false });

      ws1.connect();
      await vi.runAllTimersAsync();

      expect(ws1.connectionState.value).toBe('connected');
      expect(ws2.connectionState.value).toBe('connected');
    });

    it('should share server version between instances', async () => {
      const ws1 = useWebSocket({ autoConnect: false });
      const ws2 = useWebSocket({ autoConnect: false });

      ws1.connect();
      await vi.runAllTimersAsync();

      const connectedEvent: ServerEvent = {
        type: 'connected',
        data: { serverVersion: '2.0.0' },
      };
      MockWebSocket.instances[0].simulateMessage(connectedEvent);

      expect(ws1.serverVersion.value).toBe('2.0.0');
      expect(ws2.serverVersion.value).toBe('2.0.0');
    });
  });

  describe('error handling', () => {
    it('should log WebSocket errors', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { connect } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      MockWebSocket.instances[0].simulateError();

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  // ===========================================================================
  // Multi-spec features
  // ===========================================================================

  describe('multi-spec: connected event populates specs store', () => {
    it('should call setSpecs when connected event contains specs', async () => {
      const { connect } = useWebSocket({ autoConnect: false });
      const specsStore = useSpecsStore();

      connect();
      await vi.runAllTimersAsync();

      const specs = createMockSpecs(2);
      MockWebSocket.instances[0].simulateMessage({
        type: 'connected',
        data: { serverVersion: '2.0.0', specs },
      });

      expect(specsStore.specs).toEqual(specs);
      expect(specsStore.specIds).toEqual(['spec-1', 'spec-2']);
    });

    it('should not call setSpecs when connected event has no specs', async () => {
      const { connect } = useWebSocket({ autoConnect: false });
      const specsStore = useSpecsStore();

      connect();
      await vi.runAllTimersAsync();

      // Single-spec server: no specs field
      MockWebSocket.instances[0].simulateMessage({
        type: 'connected',
        data: { serverVersion: '1.0.0' },
      });

      expect(specsStore.specs).toEqual([]);
    });

    it('should handle empty specs array gracefully', async () => {
      const { connect } = useWebSocket({ autoConnect: false });
      const specsStore = useSpecsStore();

      connect();
      await vi.runAllTimersAsync();

      MockWebSocket.instances[0].simulateMessage({
        type: 'connected',
        data: { serverVersion: '2.0.0', specs: [] },
      });

      expect(specsStore.specs).toEqual([]);
    });

    it('should update specs store on reconnect with new specs', async () => {
      const { connect } = useWebSocket({ autoConnect: false });
      const specsStore = useSpecsStore();

      connect();
      await vi.runAllTimersAsync();

      // Initial connect with 2 specs
      const specs1 = createMockSpecs(2);
      MockWebSocket.instances[0].simulateMessage({
        type: 'connected',
        data: { serverVersion: '2.0.0', specs: specs1 },
      });
      expect(specsStore.specs).toHaveLength(2);

      // Simulate reconnect with 3 specs (e.g., spec added)
      const specs2 = createMockSpecs(3);
      MockWebSocket.instances[0].simulateMessage({
        type: 'connected',
        data: { serverVersion: '2.0.0', specs: specs2 },
      });
      expect(specsStore.specs).toHaveLength(3);
    });
  });

  describe('multi-spec: initial data requested on connect', () => {
    it('should send get:registry and get:timeline for each spec on connect', async () => {
      const { connect } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      const specs = createMockSpecs(2);
      MockWebSocket.instances[0].simulateMessage({
        type: 'connected',
        data: { serverVersion: '2.0.0', specs },
      });

      const sentMessages = MockWebSocket.instances[0].sentMessages.map((m) => JSON.parse(m));

      // Should have sent 4 messages: get:registry + get:timeline for each of 2 specs
      expect(sentMessages).toHaveLength(4);
      expect(sentMessages).toContainEqual({ type: 'get:registry', data: { specId: 'spec-1' } });
      expect(sentMessages).toContainEqual({ type: 'get:timeline', data: { specId: 'spec-1' } });
      expect(sentMessages).toContainEqual({ type: 'get:registry', data: { specId: 'spec-2' } });
      expect(sentMessages).toContainEqual({ type: 'get:timeline', data: { specId: 'spec-2' } });
    });

    it('should not send initial data requests when no specs', async () => {
      const { connect } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      // Single-spec mode: no specs field
      MockWebSocket.instances[0].simulateMessage({
        type: 'connected',
        data: { serverVersion: '1.0.0' },
      });

      expect(MockWebSocket.instances[0].sentMessages).toHaveLength(0);
    });

    it('should not send initial data requests when specs array is empty', async () => {
      const { connect } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      MockWebSocket.instances[0].simulateMessage({
        type: 'connected',
        data: { serverVersion: '2.0.0', specs: [] },
      });

      // Empty specs array: setSpecs still called but no requests sent
      expect(MockWebSocket.instances[0].sentMessages).toHaveLength(0);
    });
  });

  describe('multi-spec: command wrappers', () => {
    it('getSpecs should send get:specs command', async () => {
      const { connect, getSpecs } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      const result = getSpecs();

      expect(result).toBe(true);
      expect(JSON.parse(MockWebSocket.instances[0].sentMessages[0])).toEqual({
        type: 'get:specs',
      });
    });

    it('getRegistry should send with optional specId', async () => {
      const { connect, getRegistry } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      // Without specId
      getRegistry();
      expect(JSON.parse(MockWebSocket.instances[0].sentMessages[0])).toEqual({
        type: 'get:registry',
      });

      // With specId
      getRegistry('spec-1');
      expect(JSON.parse(MockWebSocket.instances[0].sentMessages[1])).toEqual({
        type: 'get:registry',
        data: { specId: 'spec-1' },
      });
    });

    it('getTimeline should send with optional specId and limit', async () => {
      const { connect, getTimeline } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      // Without params
      getTimeline();
      expect(JSON.parse(MockWebSocket.instances[0].sentMessages[0])).toEqual({
        type: 'get:timeline',
      });

      // With specId only
      getTimeline('spec-1');
      expect(JSON.parse(MockWebSocket.instances[0].sentMessages[1])).toEqual({
        type: 'get:timeline',
        data: { specId: 'spec-1' },
      });

      // With specId and limit
      getTimeline('spec-1', 50);
      expect(JSON.parse(MockWebSocket.instances[0].sentMessages[2])).toEqual({
        type: 'get:timeline',
        data: { specId: 'spec-1', limit: 50 },
      });
    });

    it('clearTimeline should send with optional specId', async () => {
      const { connect, clearTimeline } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      clearTimeline();
      expect(JSON.parse(MockWebSocket.instances[0].sentMessages[0])).toEqual({
        type: 'clear:timeline',
      });

      clearTimeline('spec-1');
      expect(JSON.parse(MockWebSocket.instances[0].sentMessages[1])).toEqual({
        type: 'clear:timeline',
        data: { specId: 'spec-1' },
      });
    });

    it('getStore should send with required specId and schema', async () => {
      const { connect, getStore } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      getStore('spec-1', 'Pet');
      expect(JSON.parse(MockWebSocket.instances[0].sentMessages[0])).toEqual({
        type: 'get:store',
        data: { specId: 'spec-1', schema: 'Pet' },
      });
    });

    it('setStore should send with specId, schema, and items', async () => {
      const { connect, setStore } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      const items = [{ id: 1, name: 'Fluffy' }];
      setStore('spec-1', 'Pet', items);
      expect(JSON.parse(MockWebSocket.instances[0].sentMessages[0])).toEqual({
        type: 'set:store',
        data: { specId: 'spec-1', schema: 'Pet', items },
      });
    });

    it('clearStore should send with specId and schema', async () => {
      const { connect, clearStore } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      clearStore('spec-1', 'Pet');
      expect(JSON.parse(MockWebSocket.instances[0].sentMessages[0])).toEqual({
        type: 'clear:store',
        data: { specId: 'spec-1', schema: 'Pet' },
      });
    });

    it('setSimulation should send with specId and config spread', async () => {
      const { connect, setSimulation } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      setSimulation('spec-1', {
        path: '/api/pets',
        method: 'GET',
        status: 500,
        delay: 1000,
      });
      expect(JSON.parse(MockWebSocket.instances[0].sentMessages[0])).toEqual({
        type: 'set:simulation',
        data: { specId: 'spec-1', path: '/api/pets', method: 'GET', status: 500, delay: 1000 },
      });
    });

    it('clearSimulation should send with specId and path', async () => {
      const { connect, clearSimulation } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      clearSimulation('spec-1', '/api/pets');
      expect(JSON.parse(MockWebSocket.instances[0].sentMessages[0])).toEqual({
        type: 'clear:simulation',
        data: { specId: 'spec-1', path: '/api/pets' },
      });
    });

    it('reseed should send with specId', async () => {
      const { connect, reseed } = useWebSocket({ autoConnect: false });

      connect();
      await vi.runAllTimersAsync();

      reseed('spec-1');
      expect(JSON.parse(MockWebSocket.instances[0].sentMessages[0])).toEqual({
        type: 'reseed',
        data: { specId: 'spec-1' },
      });
    });

    it('command wrappers should return false when not connected', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { getSpecs, getRegistry, getTimeline, getStore, reseed } = useWebSocket({
        autoConnect: false,
      });

      expect(getSpecs()).toBe(false);
      expect(getRegistry('spec-1')).toBe(false);
      expect(getTimeline('spec-1')).toBe(false);
      expect(getStore('spec-1', 'Pet')).toBe(false);
      expect(reseed('spec-1')).toBe(false);

      warnSpy.mockRestore();
    });
  });

  describe('multi-spec: specId in event data', () => {
    it('should pass specId through to event handlers', async () => {
      const { connect, on } = useWebSocket({ autoConnect: false });
      const handler = vi.fn();

      connect();
      await vi.runAllTimersAsync();

      on('registry', handler);

      MockWebSocket.instances[0].simulateMessage({
        type: 'registry',
        data: { specId: 'spec-1', registry: { endpoints: [] } },
      });

      expect(handler).toHaveBeenCalledWith({
        specId: 'spec-1',
        registry: { endpoints: [] },
      });
    });

    it('should pass specId in store:updated events', async () => {
      const { connect, on } = useWebSocket({ autoConnect: false });
      const handler = vi.fn();

      connect();
      await vi.runAllTimersAsync();

      on('store:updated', handler);

      MockWebSocket.instances[0].simulateMessage({
        type: 'store:updated',
        data: { specId: 'spec-2', schema: 'Pet', action: 'create', count: 5 },
      });

      expect(handler).toHaveBeenCalledWith({
        specId: 'spec-2',
        schema: 'Pet',
        action: 'create',
        count: 5,
      });
    });

    it('should pass specId in timeline events', async () => {
      const { connect, on } = useWebSocket({ autoConnect: false });
      const handler = vi.fn();

      connect();
      await vi.runAllTimersAsync();

      on('timeline', handler);

      MockWebSocket.instances[0].simulateMessage({
        type: 'timeline',
        data: { specId: 'spec-1', entries: [{ id: 'req-1' }], count: 1, total: 10 },
      });

      expect(handler).toHaveBeenCalledWith({
        specId: 'spec-1',
        entries: [{ id: 'req-1' }],
        count: 1,
        total: 10,
      });
    });

    it('should pass specId in error events', async () => {
      const { connect, on } = useWebSocket({ autoConnect: false });
      const handler = vi.fn();

      connect();
      await vi.runAllTimersAsync();

      on('error', handler);

      MockWebSocket.instances[0].simulateMessage({
        type: 'error',
        data: { specId: 'spec-1', command: 'get:store', message: 'Schema not found' },
      });

      expect(handler).toHaveBeenCalledWith({
        specId: 'spec-1',
        command: 'get:store',
        message: 'Schema not found',
      });
    });
  });
});
