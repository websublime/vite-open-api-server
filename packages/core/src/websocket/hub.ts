/**
 * WebSocket Hub
 *
 * What: Manages WebSocket connections and message broadcasting
 * How: Maintains set of connected clients, broadcasts to all
 * Why: Enables real-time communication with DevTools
 *
 * @module websocket/hub
 */

import { CLIENT_COMMAND_TYPES, type ClientCommand, type ServerEvent } from './protocol.js';

/**
 * Minimal WebSocket client interface
 *
 * This interface defines the minimum contract a WebSocket client must satisfy
 * to work with the hub. It's designed to be compatible with:
 * - Hono's WSContext
 * - Node.js WebSocket
 * - Browser WebSocket
 * - Any other WebSocket implementation
 */
export interface WebSocketClient {
  /**
   * Send a message to the client
   * @param message - String message to send (JSON serialized)
   */
  send(message: string): void;

  /**
   * Read-only state of the WebSocket connection
   * 1 = OPEN (ready to send)
   * Other values indicate closed/closing/connecting
   */
  readonly readyState?: number;
}

/**
 * Command handler callback type
 *
 * Invoked when a client sends a command to the server.
 * The handler should process the command and optionally send
 * a response back to the client using client.send().
 *
 * @param client - The WebSocket client that sent the command
 * @param command - The parsed command from the client
 */
export type CommandHandler = (client: WebSocketClient, command: ClientCommand) => void;

/**
 * Options for creating a WebSocket hub
 */
export interface WebSocketHubOptions {
  /**
   * Server version string to send on connection
   * @default '2.0.0'
   */
  serverVersion?: string;

  /**
   * Optional command handler for processing client commands
   * Can also be set later via setCommandHandler()
   */
  onCommand?: CommandHandler;

  /**
   * Optional logger for debugging
   * @default console
   */
  logger?: {
    debug?: (message: string, ...args: unknown[]) => void;
    warn?: (message: string, ...args: unknown[]) => void;
    error?: (message: string, ...args: unknown[]) => void;
  };
}

/**
 * WebSocket hub interface
 *
 * The hub manages all connected WebSocket clients and provides
 * methods for broadcasting events and handling incoming commands.
 */
export interface WebSocketHub {
  /**
   * Add a new client connection
   *
   * When a client is added, it immediately receives a 'connected' event
   * with the server version.
   *
   * @param client - WebSocket client to add
   */
  addClient(client: WebSocketClient): void;

  /**
   * Remove a client connection
   *
   * Should be called when a client disconnects to clean up resources.
   *
   * @param client - WebSocket client to remove
   */
  removeClient(client: WebSocketClient): void;

  /**
   * Broadcast an event to all connected clients
   *
   * The event is JSON serialized and sent to each client.
   * Clients with closed connections are automatically removed.
   *
   * @param event - Server event to broadcast
   */
  broadcast(event: ServerEvent): void;

  /**
   * Handle an incoming message from a client
   *
   * Parses the message as a ClientCommand and invokes the command handler.
   * Invalid messages are logged but don't throw errors.
   *
   * @param client - The client that sent the message
   * @param message - Raw message string or object from the client
   */
  handleMessage(client: WebSocketClient, message: string | unknown): void;

  /**
   * Set or update the command handler
   *
   * The command handler is invoked for each valid ClientCommand received.
   * This allows the handler to be set after hub creation, enabling
   * dependency injection of stores, registries, etc.
   *
   * @param handler - Command handler callback
   */
  setCommandHandler(handler: CommandHandler): void;

  /**
   * Get the current number of connected clients
   *
   * @returns Number of active client connections
   */
  getClientCount(): number;

  /**
   * Send an event to a specific client
   *
   * @param client - Target client
   * @param event - Server event to send
   * @returns true if sent successfully, false if client is not connected
   */
  sendTo(client: WebSocketClient, event: ServerEvent): boolean;

  /**
   * Check if a client is connected
   *
   * @param client - Client to check
   * @returns true if client is in the connected set
   */
  hasClient(client: WebSocketClient): boolean;

  /**
   * Disconnect all clients and clear the client set
   *
   * Note: This does not actually close the WebSocket connections,
   * it just removes them from the hub's tracking.
   */
  clear(): void;
}

/**
 * WebSocket ready state constants
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/readyState
 */
const WS_READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

/**
 * Create a new WebSocket hub
 *
 * The hub manages WebSocket client connections and provides methods
 * for broadcasting events and handling commands.
 *
 * @example
 * ```typescript
 * import { createWebSocketHub } from '@websublime/vite-open-api-core';
 *
 * const hub = createWebSocketHub({
 *   serverVersion: '2.0.0',
 *   onCommand: (client, command) => {
 *     switch (command.type) {
 *       case 'get:registry':
 *         client.send(JSON.stringify({
 *           type: 'registry',
 *           data: registry
 *         }));
 *         break;
 *     }
 *   }
 * });
 *
 * // Add client when WebSocket connects
 * hub.addClient(wsContext);
 *
 * // Broadcast events
 * hub.broadcast({ type: 'request', data: requestEntry });
 *
 * // Handle incoming messages
 * hub.handleMessage(wsContext, messageData);
 *
 * // Remove client on disconnect
 * hub.removeClient(wsContext);
 * ```
 *
 * @param options - Hub configuration options
 * @returns WebSocket hub instance
 */
export function createWebSocketHub(options: WebSocketHubOptions = {}): WebSocketHub {
  const { serverVersion = '2.0.0', onCommand, logger } = options;

  /**
   * Set of connected clients
   * Using a Set ensures O(1) add/remove/check operations
   */
  const clients = new Set<WebSocketClient>();

  /**
   * Current command handler
   * Can be updated via setCommandHandler()
   */
  let commandHandler: CommandHandler | undefined = onCommand;

  /**
   * Safe logging helpers that check if logger methods exist
   */
  const log = {
    debug: (message: string, ...args: unknown[]) => {
      logger?.debug?.(`[WebSocketHub] ${message}`, ...args);
    },
    warn: (message: string, ...args: unknown[]) => {
      logger?.warn?.(`[WebSocketHub] ${message}`, ...args);
    },
    error: (message: string, ...args: unknown[]) => {
      logger?.error?.(`[WebSocketHub] ${message}`, ...args);
    },
  };

  /**
   * Check if a client connection is open and ready to receive messages
   */
  function isClientReady(client: WebSocketClient): boolean {
    // If readyState is not available, assume the connection is open
    if (client.readyState === undefined) {
      return true;
    }
    return client.readyState === WS_READY_STATE.OPEN;
  }

  /**
   * Safely send a message to a client
   * Returns true if successful, false otherwise
   */
  function safeSend(client: WebSocketClient, message: string): boolean {
    try {
      if (!isClientReady(client)) {
        log.debug('Client not ready, skipping send');
        return false;
      }
      client.send(message);
      return true;
    } catch (error) {
      log.error('Failed to send message to client:', error);
      return false;
    }
  }

  /**
   * Parse a raw message into a ClientCommand
   * Returns null if parsing fails or the message is invalid
   */
  function parseCommand(message: string | unknown): ClientCommand | null {
    try {
      let parsed: unknown;

      if (typeof message === 'string') {
        parsed = JSON.parse(message);
      } else {
        parsed = message;
      }

      // Validate the parsed object has a type property
      if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
        log.warn('Invalid command: missing type property');
        return null;
      }

      const command = parsed as { type: string; data?: unknown };

      // Validate the command type is a known type using the single source of truth
      if (!CLIENT_COMMAND_TYPES.includes(command.type as (typeof CLIENT_COMMAND_TYPES)[number])) {
        log.warn(`Unknown command type: ${command.type}`);
        return null;
      }

      return command as ClientCommand;
    } catch (error) {
      log.error('Failed to parse command:', error);
      return null;
    }
  }

  return {
    addClient(client: WebSocketClient): void {
      clients.add(client);
      log.debug(`Client added, total clients: ${clients.size}`);

      // Send connected event with server version
      const connectedEvent: ServerEvent = {
        type: 'connected',
        data: { serverVersion },
      };

      safeSend(client, JSON.stringify(connectedEvent));
    },

    removeClient(client: WebSocketClient): void {
      const deleted = clients.delete(client);
      if (deleted) {
        log.debug(`Client removed, total clients: ${clients.size}`);
      }
    },

    broadcast(event: ServerEvent): void {
      const message = JSON.stringify(event);
      const clientsToRemove: WebSocketClient[] = [];

      for (const client of clients) {
        if (!isClientReady(client)) {
          // Mark closed clients for removal
          clientsToRemove.push(client);
          continue;
        }

        const sent = safeSend(client, message);
        if (!sent) {
          // Mark failed clients for removal
          clientsToRemove.push(client);
        }
      }

      // Remove closed/failed clients
      for (const client of clientsToRemove) {
        clients.delete(client);
        log.debug('Removed stale client during broadcast');
      }

      log.debug(`Broadcast ${event.type} to ${clients.size} clients`);
    },

    handleMessage(client: WebSocketClient, message: string | unknown): void {
      const command = parseCommand(message);

      if (!command) {
        // Invalid command, already logged in parseCommand
        return;
      }

      log.debug(`Received command: ${command.type}`);

      if (commandHandler) {
        try {
          commandHandler(client, command);
        } catch (error) {
          log.error(`Command handler error for ${command.type}:`, error);

          // Send error response to client
          const errorEvent: ServerEvent = {
            type: 'error' as const,
            data: {
              command: command.type,
              message: error instanceof Error ? error.message : 'Command handler failed',
            },
          };

          safeSend(client, JSON.stringify(errorEvent));
        }
      } else {
        log.warn(`No command handler set, ignoring command: ${command.type}`);
      }
    },

    setCommandHandler(handler: CommandHandler): void {
      commandHandler = handler;
      log.debug('Command handler updated');
    },

    getClientCount(): number {
      return clients.size;
    },

    sendTo(client: WebSocketClient, event: ServerEvent): boolean {
      if (!clients.has(client)) {
        log.warn('Attempted to send to unknown client');
        return false;
      }

      return safeSend(client, JSON.stringify(event));
    },

    hasClient(client: WebSocketClient): boolean {
      return clients.has(client);
    },

    clear(): void {
      const count = clients.size;
      clients.clear();
      log.debug(`Cleared ${count} clients`);
    },
  };
}
