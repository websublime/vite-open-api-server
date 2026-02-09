/**
 * WebSocket Command Handler
 *
 * What: Processes client commands received via WebSocket
 * How: Maps each command type to the appropriate store/registry/simulation action
 * Why: Bridges the WebSocket hub with the server's data layer for DevTools
 *
 * @module websocket/command-handler
 */

import type { Logger } from '../handlers/index.js';
import type { TimelineEntry } from '../internal-api.js';
import type { EndpointRegistry } from '../router/index.js';
import type { SimulationManager } from '../simulation/index.js';
import type { Store } from '../store/index.js';
import type { CommandHandler, WebSocketClient, WebSocketHub } from './hub.js';
import type { ClientCommand, ServerEvent } from './protocol.js';

/**
 * Dependencies required by the command handler
 *
 * Follows the same dependency-injection pattern as InternalApiDeps in internal-api.ts
 */
export interface CommandHandlerDeps {
  /** In-memory data store */
  store: Store;

  /** Endpoint registry */
  registry: EndpointRegistry;

  /** Simulation manager */
  simulationManager: SimulationManager;

  /** WebSocket hub for broadcasting updates */
  wsHub: WebSocketHub;

  /**
   * Getter for the current timeline array
   *
   * A function instead of a direct reference so the command handler
   * always operates on the live shared array, even if the server
   * reassigns the timeline variable in the future.
   */
  getTimeline: () => TimelineEntry[];

  /** Maximum timeline entries */
  timelineLimit: number;

  /**
   * Getter for current seed data
   *
   * A function instead of a direct reference because seeds are replaced
   * on hot reload (the Map reference changes). The getter ensures the
   * command handler always reads the latest seeds.
   */
  getSeeds: () => Map<string, unknown[]>;

  /** Logger instance */
  logger: Logger;
}

/**
 * Create a command handler that processes all client command types
 *
 * The returned handler is compatible with `wsHub.setCommandHandler()`.
 * Each command reads from or writes to the appropriate data source
 * and sends responses back to the requesting client.
 *
 * @param deps - Dependencies for command processing
 * @returns CommandHandler function
 */
export function createCommandHandler(deps: CommandHandlerDeps): CommandHandler {
  const { store, registry, simulationManager, wsHub, timelineLimit, logger } = deps;

  // Cached registry serialization — invalidated when endpoints size or handler/seed counts change
  let cachedRegistryData: { endpoints: unknown[]; stats: unknown } | null = null;
  let cachedEndpointsSize = -1;
  let cachedHandlerCount = -1;
  let cachedSeedCount = -1;

  return (client: WebSocketClient, command: ClientCommand): void => {
    switch (command.type) {
      case 'get:registry':
        handleGetRegistry(client);
        break;
      case 'get:timeline':
        handleGetTimeline(client, command.data);
        break;
      case 'get:store':
        handleGetStore(client, command.data);
        break;
      case 'set:store':
        handleSetStore(client, command.data);
        break;
      case 'clear:store':
        handleClearStore(client, command.data);
        break;
      case 'set:simulation':
        handleSetSimulation(client, command.data);
        break;
      case 'clear:simulation':
        handleClearSimulation(client, command.data);
        break;
      case 'clear:timeline':
        handleClearTimeline(client);
        break;
      case 'reseed':
        handleReseed(client);
        break;
      default:
        logger.warn(
          `[CommandHandler] Unhandled command type: ${(command as { type: string }).type}`,
        );
    }
  };

  /**
   * Send registry endpoints + stats to the requesting client
   */
  function handleGetRegistry(client: WebSocketClient): void {
    const currentEndpointsSize = registry.endpoints.size;
    const currentHandlerCount = registry.stats.withCustomHandler;
    const currentSeedCount = registry.stats.withCustomSeed;

    if (
      !cachedRegistryData ||
      cachedEndpointsSize !== currentEndpointsSize ||
      cachedHandlerCount !== currentHandlerCount ||
      cachedSeedCount !== currentSeedCount
    ) {
      cachedRegistryData = {
        endpoints: Array.from(registry.endpoints.entries()).map(([key, entry]) => ({
          key,
          ...entry,
        })),
        stats: { ...registry.stats },
      };
      cachedEndpointsSize = currentEndpointsSize;
      cachedHandlerCount = currentHandlerCount;
      cachedSeedCount = currentSeedCount;
    }

    sendTo(client, { type: 'registry', data: cachedRegistryData });

    // Also send current simulation state so Simulator page gets initial data
    const simulations = simulationManager.list();
    sendTo(client, { type: 'simulation:active', data: simulations });
  }

  /**
   * Send timeline entries to the requesting client
   */
  function handleGetTimeline(client: WebSocketClient, data?: { limit?: number }): void {
    const limit = data?.limit ?? timelineLimit;
    const currentTimeline = deps.getTimeline();
    const entries = currentTimeline.slice(-limit);

    sendTo(client, {
      type: 'timeline',
      data: { entries, count: entries.length, total: currentTimeline.length },
    });
  }

  /**
   * Send store items for a schema to the requesting client
   */
  function handleGetStore(client: WebSocketClient, data: { schema: string }): void {
    if (!data?.schema) {
      sendError(client, 'get:store', 'Missing required field: schema');
      return;
    }

    const items = store.list(data.schema);

    sendTo(client, {
      type: 'store',
      data: { schema: data.schema, items, count: items.length },
    });
  }

  /**
   * Clear and repopulate schema data, broadcast update
   */
  function handleSetStore(
    client: WebSocketClient,
    data: { schema: string; items: unknown[] },
  ): void {
    if (!data?.schema || !Array.isArray(data.items)) {
      sendError(client, 'set:store', 'Missing required fields: schema, items');
      return;
    }

    store.clear(data.schema);

    let created = 0;
    for (const item of data.items) {
      try {
        store.create(data.schema, item);
        created++;
      } catch (error) {
        logger.warn(`[CommandHandler] Failed to create item in ${data.schema}:`, error);
      }
    }

    // Broadcast notification to all clients (including sender) about the store change
    wsHub.broadcast({
      type: 'store:updated',
      data: { schema: data.schema, action: 'bulk', count: created },
    });

    // Send direct acknowledgment to the sender with operation result
    sendTo(client, {
      type: 'store:set',
      data: { schema: data.schema, success: true, count: created },
    });
  }

  /**
   * Clear schema data and broadcast update
   */
  function handleClearStore(client: WebSocketClient, data: { schema: string }): void {
    if (!data?.schema) {
      sendError(client, 'clear:store', 'Missing required field: schema');
      return;
    }

    store.clear(data.schema);

    // Broadcast notification to all clients (including sender) about the store change
    wsHub.broadcast({
      type: 'store:updated',
      data: { schema: data.schema, action: 'clear', count: 0 },
    });

    // Send direct acknowledgment to the sender with operation result
    sendTo(client, {
      type: 'store:cleared',
      data: { schema: data.schema, success: true },
    });
  }

  /**
   * Set a simulation and broadcast
   */
  function handleSetSimulation(
    client: WebSocketClient,
    data: { path: string; operationId?: string; status: number; delay?: number; body?: unknown },
  ): void {
    if (!data?.path || typeof data.status !== 'number') {
      sendError(client, 'set:simulation', 'Missing required fields: path, status');
      return;
    }

    try {
      simulationManager.set({
        path: data.path,
        operationId: data.operationId ?? '',
        status: data.status,
        delay: data.delay,
        body: data.body,
      });
    } catch (error) {
      sendError(
        client,
        'set:simulation',
        error instanceof Error ? error.message : 'Invalid simulation configuration',
      );
      return;
    }

    // Broadcast notification to all clients (including sender) about the new simulation
    wsHub.broadcast({
      type: 'simulation:added',
      data: { path: data.path },
    });

    // Send direct acknowledgment to the sender with operation result
    sendTo(client, {
      type: 'simulation:set',
      data: { path: data.path, success: true },
    });
  }

  /**
   * Remove a simulation and broadcast
   */
  function handleClearSimulation(client: WebSocketClient, data: { path: string }): void {
    if (!data?.path) {
      sendError(client, 'clear:simulation', 'Missing required field: path');
      return;
    }

    const removed = simulationManager.remove(data.path);

    if (removed) {
      // Broadcast notification to all clients (including sender) about the removal
      wsHub.broadcast({
        type: 'simulation:removed',
        data: { path: data.path },
      });
    }

    // Send direct acknowledgment to the sender with operation result
    sendTo(client, {
      type: 'simulation:cleared',
      data: { path: data.path, success: removed },
    });
  }

  /**
   * Clear timeline and broadcast
   */
  function handleClearTimeline(_client: WebSocketClient): void {
    const currentTimeline = deps.getTimeline();
    const count = currentTimeline.length;
    currentTimeline.length = 0;

    // Broadcast covers all clients including the sender
    wsHub.broadcast({
      type: 'timeline:cleared',
      data: { count },
    });
  }

  /**
   * Re-insert seed data into the store and broadcast
   */
  function handleReseed(_client: WebSocketClient): void {
    store.clearAll();

    const seeds = deps.getSeeds();
    const schemas: string[] = [];
    for (const [schemaName, items] of seeds) {
      for (const item of items) {
        try {
          store.create(schemaName, item);
        } catch (error) {
          logger.warn(`[CommandHandler] Failed to reseed ${schemaName}:`, error);
        }
      }
      schemas.push(schemaName);
    }

    // Broadcast covers all clients including the sender
    wsHub.broadcast({
      type: 'reseeded',
      data: { success: true, schemas },
    });
  }

  /**
   * Send a server event to a specific client
   */
  function sendTo(client: WebSocketClient, event: ServerEvent): void {
    wsHub.sendTo(client, event);
  }

  /**
   * Send an error event to a specific client
   */
  function sendError(client: WebSocketClient, command: string, message: string): void {
    logger.warn(`[CommandHandler] Validation failed for ${command}: ${message}`);
    sendTo(client, { type: 'error', data: { command, message } });
  }
}
