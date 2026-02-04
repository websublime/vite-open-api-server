/**
 * useWebSocket Composable
 *
 * What: Provides reactive WebSocket connection management for the DevTools SPA
 * How: Manages WebSocket lifecycle with auto-reconnect and event subscription
 * Why: Enables real-time communication between DevTools and the mock server
 *
 * @module composables/useWebSocket
 */

import type { ComputedRef } from 'vue';
import { computed, getCurrentInstance, onMounted, ref } from 'vue';

/**
 * Server event types that can be received from the server
 * These match the ServerEvent types defined in @websublime/vite-plugin-open-api-core
 */
export type ServerEventType =
  | 'connected'
  | 'request'
  | 'response'
  | 'timeline:cleared'
  | 'store:updated'
  | 'handler:reloaded'
  | 'handlers:updated'
  | 'seed:reloaded'
  | 'seeds:updated'
  | 'simulation:active'
  | 'simulation:added'
  | 'simulation:removed'
  | 'simulations:cleared'
  | 'registry'
  | 'timeline'
  | 'store'
  | 'store:set'
  | 'store:cleared'
  | 'simulation:set'
  | 'simulation:cleared'
  | 'reseeded'
  | 'error';

/**
 * Server event structure
 */
export interface ServerEvent<T = unknown> {
  type: ServerEventType;
  data: T;
}

/**
 * Connected event data
 */
export interface ConnectedEventData {
  serverVersion: string;
}

/**
 * Client command types that can be sent to the server
 */
export type ClientCommandType =
  | 'get:registry'
  | 'get:timeline'
  | 'get:store'
  | 'set:store'
  | 'clear:store'
  | 'set:simulation'
  | 'clear:simulation'
  | 'clear:timeline'
  | 'reseed';

/**
 * Client command structure
 */
export interface ClientCommand<T = unknown> {
  type: ClientCommandType;
  data?: T;
}

/**
 * WebSocket connection state
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (data: T) => void;

/**
 * Configuration options for useWebSocket
 */
export interface UseWebSocketOptions {
  /**
   * WebSocket URL path (default: '/_ws')
   */
  path?: string;

  /**
   * Reconnection delay in milliseconds (default: 2000)
   */
  reconnectDelay?: number;

  /**
   * Maximum reconnection attempts (default: Infinity)
   */
  maxReconnectAttempts?: number;

  /**
   * Whether to auto-connect on mount (default: true)
   */
  autoConnect?: boolean;
}

/**
 * Return type for useWebSocket composable
 *
 * Provides explicit typing for the composable return value as required by CLAUDE.md
 */
export interface UseWebSocketReturn {
  /** Current connection state */
  connectionState: ComputedRef<ConnectionState>;
  /** Whether the WebSocket is connected */
  connected: ComputedRef<boolean>;
  /** Whether the WebSocket is attempting to reconnect */
  isReconnecting: ComputedRef<boolean>;
  /** Server version received on connection */
  serverVersion: ComputedRef<string | null>;
  /** Number of reconnection attempts made */
  reconnectAttempts: ComputedRef<number>;
  /** Connect to the WebSocket server */
  connect: () => void;
  /** Disconnect from the WebSocket server */
  disconnect: () => void;
  /** Send a command to the server */
  send: <T = unknown>(command: ClientCommand<T>) => boolean;
  /** Subscribe to a server event */
  on: <T = unknown>(event: ServerEventType | '*', handler: EventHandler<T>) => () => void;
  /** Unsubscribe from a server event */
  off: <T = unknown>(event: ServerEventType | '*', handler: EventHandler<T>) => void;
  /**
   * Subscribe to an event and automatically unsubscribe after the first invocation.
   * This is a standard one-shot subscription.
   */
  once: <T = unknown>(event: ServerEventType | '*', handler: EventHandler<T>) => () => void;
  /**
   * Subscribe to an event and unsubscribe when the handler returns true.
   * Useful for conditional one-time events where you need to wait for specific data.
   */
  onUntil: <T = unknown>(
    event: ServerEventType | '*',
    handler: (data: T) => boolean | undefined,
  ) => () => void;
  /** Reset the composable state (useful for testing) */
  resetState: () => void;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<UseWebSocketOptions> = {
  path: '/_ws',
  reconnectDelay: 2000,
  maxReconnectAttempts: Number.POSITIVE_INFINITY,
  autoConnect: true,
};

/**
 * Singleton state for WebSocket - shared across all component instances
 */
const connectionState = ref<ConnectionState>('disconnected');
const serverVersion = ref<string | null>(null);
const reconnectAttempts = ref(0);

/**
 * Store the WebSocket instance and configuration
 */
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentOptions: Required<UseWebSocketOptions> = { ...DEFAULT_OPTIONS };

/**
 * Flag to track if options have been initialized
 * Options are only set on the first call to useWebSocket or when disconnected
 */
let optionsInitialized = false;

/**
 * Event handlers map - stores handlers for each event type
 */
const eventHandlers = new Map<string, Set<EventHandler>>();

/**
 * Check if we're running in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof WebSocket !== 'undefined';
}

/**
 * Check if we're inside a Vue component context
 */
function hasComponentContext(): boolean {
  return getCurrentInstance() !== null;
}

/**
 * Build the WebSocket URL based on current location
 */
function buildWebSocketUrl(path: string): string {
  if (!isBrowser()) {
    return `ws://localhost${path}`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${path}`;
}

/**
 * Clear the reconnect timer if active
 */
function clearReconnectTimer(): void {
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

/**
 * Dispatch an event to all registered handlers
 */
function dispatchEvent(type: string, data: unknown): void {
  const handlers = eventHandlers.get(type);
  if (handlers) {
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (error) {
        console.error(`[DevTools WebSocket] Error in event handler for '${type}':`, error);
      }
    }
  }

  // Also dispatch to wildcard handlers
  const wildcardHandlers = eventHandlers.get('*');
  if (wildcardHandlers) {
    for (const handler of wildcardHandlers) {
      try {
        handler({ type, data });
      } catch (error) {
        console.error('[DevTools WebSocket] Error in wildcard event handler:', error);
      }
    }
  }
}

/**
 * Handle WebSocket open event
 */
function handleOpen(): void {
  connectionState.value = 'connected';
  reconnectAttempts.value = 0;
  clearReconnectTimer();

  if (import.meta.env.DEV) {
    console.log('[DevTools WebSocket] Connected');
  }
}

/**
 * Handle WebSocket message event
 */
function handleMessage(event: MessageEvent): void {
  try {
    const message = JSON.parse(event.data) as ServerEvent;

    // Handle connected event specially to extract server version
    if (message.type === 'connected') {
      const connectedData = message.data as ConnectedEventData;
      serverVersion.value = connectedData.serverVersion;

      if (import.meta.env.DEV) {
        console.log(`[DevTools WebSocket] Server version: ${connectedData.serverVersion}`);
      }
    }

    // Dispatch to registered handlers
    dispatchEvent(message.type, message.data);
  } catch (error) {
    console.error('[DevTools WebSocket] Failed to parse message:', error);
  }
}

/**
 * Handle WebSocket close event
 */
function handleClose(): void {
  const wasConnected = connectionState.value === 'connected';
  connectionState.value = 'disconnected';
  ws = null;

  if (wasConnected && import.meta.env.DEV) {
    console.log('[DevTools WebSocket] Disconnected');
  }

  // Attempt to reconnect if within limits
  if (reconnectAttempts.value < currentOptions.maxReconnectAttempts) {
    connectionState.value = 'reconnecting';
    reconnectAttempts.value++;

    if (import.meta.env.DEV) {
      console.log(
        `[DevTools WebSocket] Reconnecting in ${currentOptions.reconnectDelay}ms (attempt ${reconnectAttempts.value})`,
      );
    }

    reconnectTimer = setTimeout(() => {
      connect();
    }, currentOptions.reconnectDelay);
  } else if (import.meta.env.DEV) {
    console.warn('[DevTools WebSocket] Max reconnection attempts reached');
  }
}

/**
 * Handle WebSocket error event
 */
function handleError(event: Event): void {
  console.error('[DevTools WebSocket] Error:', event);
}

/**
 * Connect to the WebSocket server
 */
function connect(): void {
  if (!isBrowser()) {
    if (import.meta.env.DEV) {
      console.warn('[DevTools WebSocket] Cannot connect outside browser environment');
    }
    return;
  }

  // Don't connect if already connected or connecting
  // Check connectionState first to prevent race condition when connect() is called rapidly
  if (
    connectionState.value === 'connecting' ||
    connectionState.value === 'connected' ||
    (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN))
  ) {
    return;
  }

  // Clean up existing connection without resetting reconnect state
  cleanupConnection();

  connectionState.value = 'connecting';
  const url = buildWebSocketUrl(currentOptions.path);

  try {
    ws = new WebSocket(url);
    ws.onopen = handleOpen;
    ws.onmessage = handleMessage;
    ws.onclose = handleClose;
    ws.onerror = handleError;
  } catch (error) {
    console.error('[DevTools WebSocket] Failed to create WebSocket:', error);
    connectionState.value = 'disconnected';
  }
}

/**
 * Clean up WebSocket connection without resetting reconnect state.
 * Used internally when reconnecting.
 */
function cleanupConnection(): void {
  if (ws) {
    // Remove event handlers to prevent close handler from triggering reconnect
    ws.onopen = null;
    ws.onmessage = null;
    ws.onclose = null;
    ws.onerror = null;

    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }

    ws = null;
  }
}

/**
 * Disconnect from the WebSocket server
 */
function disconnect(): void {
  clearReconnectTimer();
  cleanupConnection();

  connectionState.value = 'disconnected';
  reconnectAttempts.value = 0;
}

/**
 * Send a command to the server
 *
 * @param command - The command to send
 * @returns true if the command was sent, false otherwise
 */
function send<T = unknown>(command: ClientCommand<T>): boolean {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    if (import.meta.env.DEV) {
      console.warn('[DevTools WebSocket] Cannot send command - not connected');
    }
    return false;
  }

  try {
    ws.send(JSON.stringify(command));
    return true;
  } catch (error) {
    console.error('[DevTools WebSocket] Failed to send command:', error);
    return false;
  }
}

/**
 * Subscribe to a server event
 *
 * @param event - The event type to subscribe to (or '*' for all events)
 * @param handler - The handler function to call when the event is received
 * @returns An unsubscribe function
 */
function on<T = unknown>(event: ServerEventType | '*', handler: EventHandler<T>): () => void {
  if (!eventHandlers.has(event)) {
    eventHandlers.set(event, new Set());
  }

  const handlers = eventHandlers.get(event);
  if (handlers) {
    handlers.add(handler as EventHandler);
  }

  // Return unsubscribe function
  return () => {
    const currentHandlers = eventHandlers.get(event);
    if (currentHandlers) {
      currentHandlers.delete(handler as EventHandler);
      if (currentHandlers.size === 0) {
        eventHandlers.delete(event);
      }
    }
  };
}

/**
 * Unsubscribe from a server event
 *
 * @param event - The event type to unsubscribe from
 * @param handler - The handler function to remove
 */
function off<T = unknown>(event: ServerEventType | '*', handler: EventHandler<T>): void {
  const handlers = eventHandlers.get(event);
  if (handlers) {
    handlers.delete(handler as EventHandler);
    if (handlers.size === 0) {
      eventHandlers.delete(event);
    }
  }
}

/**
 * Subscribe to an event and automatically unsubscribe after the first invocation.
 * This is a standard one-shot subscription - the handler is called exactly once.
 *
 * @param event - The event type to subscribe to
 * @param handler - The handler function to call once
 * @returns An unsubscribe function (can be used to cancel before the event fires)
 *
 * @example
 * ```typescript
 * // Wait for the first 'connected' event
 * once('connected', (data) => {
 *   console.log('Connected with version:', data.serverVersion);
 * });
 * ```
 */
function once<T = unknown>(event: ServerEventType | '*', handler: EventHandler<T>): () => void {
  const wrappedHandler: EventHandler<T> = (data) => {
    off(event, wrappedHandler);
    handler(data);
  };

  return on(event, wrappedHandler);
}

/**
 * Subscribe to an event and unsubscribe when the handler returns true.
 * Useful for conditional one-time events where you need to wait for specific data.
 *
 * @param event - The event type to subscribe to
 * @param handler - The handler function that returns true to unsubscribe
 * @returns An unsubscribe function
 *
 * @example
 * ```typescript
 * // Wait until we receive a response with status 200
 * onUntil('response', (data) => {
 *   if (data.status === 200) {
 *     console.log('Success response received');
 *     return true; // Unsubscribe
 *   }
 *   return false; // Keep listening
 * });
 * ```
 */
function onUntil<T = unknown>(
  event: ServerEventType | '*',
  handler: (data: T) => boolean | undefined,
): () => void {
  const wrappedHandler: EventHandler<T> = (data) => {
    const result = handler(data);
    if (result === true) {
      off(event, wrappedHandler);
    }
  };

  return on(event, wrappedHandler);
}

/**
 * Reset the composable state (useful for testing)
 */
function resetState(): void {
  disconnect();
  serverVersion.value = null;
  eventHandlers.clear();
  currentOptions = { ...DEFAULT_OPTIONS };
  optionsInitialized = false;
}

/**
 * useWebSocket composable
 *
 * Provides WebSocket connection management functionality including:
 * - Reactive connection state
 * - Auto-reconnect with configurable delay
 * - Event subscription system
 * - Command sending
 *
 * @param options - Configuration options
 * @returns WebSocket management utilities
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  // Only merge options when not connected and not initialized, or when disconnected
  // This prevents race conditions when multiple components pass different options
  if (!optionsInitialized || connectionState.value === 'disconnected') {
    currentOptions = { ...DEFAULT_OPTIONS, ...options };
    optionsInitialized = true;
  }

  /**
   * Computed property indicating if the WebSocket is connected
   */
  const connected = computed(() => connectionState.value === 'connected');

  /**
   * Computed property indicating if the WebSocket is attempting to reconnect
   */
  const isReconnecting = computed(() => connectionState.value === 'reconnecting');

  // Note: We don't disconnect on component unmount because this is singleton state
  // and other components may still be using the connection.
  // The connection will be cleaned up when the page unloads.

  // Only register lifecycle hooks when inside a Vue component context
  if (hasComponentContext()) {
    onMounted(() => {
      if (currentOptions.autoConnect) {
        connect();
      }
    });
  }

  return {
    /**
     * Current connection state
     */
    connectionState: computed(() => connectionState.value),

    /**
     * Whether the WebSocket is connected
     */
    connected,

    /**
     * Whether the WebSocket is attempting to reconnect
     */
    isReconnecting,

    /**
     * Server version received on connection
     */
    serverVersion: computed(() => serverVersion.value),

    /**
     * Number of reconnection attempts made
     */
    reconnectAttempts: computed(() => reconnectAttempts.value),

    /**
     * Connect to the WebSocket server
     */
    connect,

    /**
     * Disconnect from the WebSocket server
     */
    disconnect,

    /**
     * Send a command to the server
     */
    send,

    /**
     * Subscribe to a server event
     */
    on,

    /**
     * Unsubscribe from a server event
     */
    off,

    /**
     * Subscribe to an event once (one-shot, auto-unsubscribes after first call)
     */
    once,

    /**
     * Subscribe to an event until handler returns true
     */
    onUntil,

    /**
     * Reset the composable state (useful for testing)
     */
    resetState,
  };
}
