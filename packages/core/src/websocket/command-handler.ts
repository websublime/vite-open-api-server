/**
 * WebSocket Command Handler
 *
 * What: Processes client commands received via WebSocket
 * How: Maps each command type to the appropriate store/registry/simulation action
 * Why: Bridges the WebSocket hub with the server's data layer for DevTools
 *
 * @module websocket/command-handler
 */

import type { OpenAPIV3_1 } from '@scalar/openapi-types';

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

  /** Request/response timeline */
  timeline: TimelineEntry[];

  /** Maximum timeline entries */
  timelineLimit: number;

  /** Processed OpenAPI document */
  document: OpenAPIV3_1.Document;

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
  const { store, registry, simulationManager, wsHub, timeline, timelineLimit, logger } = deps;

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
    const registryData = {
      endpoints: Array.from(registry.endpoints.entries()).map(([key, entry]) => ({
        key,
        ...entry,
      })),
      stats: registry.stats,
    };

    sendTo(client, { type: 'registry', data: registryData });

    // Also send current simulation state so Simulator page gets initial data
    const simulations = simulationManager.list();
    sendTo(client, { type: 'simulation:active', data: simulations });
  }

  /**
   * Send timeline entries to the requesting client
   */
  function handleGetTimeline(client: WebSocketClient, data?: { limit?: number }): void {
    const limit = data?.limit ?? timelineLimit;
    const entries = timeline.slice(-limit);

    sendTo(client, {
      type: 'timeline',
      data: { entries, count: entries.length, total: timeline.length },
    });
  }

  /**
   * Send store items for a schema to the requesting client
   */
  function handleGetStore(client: WebSocketClient, data: { schema: string }): void {
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

    wsHub.broadcast({
      type: 'store:updated',
      data: { schema: data.schema, action: 'bulk', count: created },
    });

    sendTo(client, {
      type: 'store:set',
      data: { schema: data.schema, success: true, count: created },
    });
  }

  /**
   * Clear schema data and broadcast update
   */
  function handleClearStore(client: WebSocketClient, data: { schema: string }): void {
    store.clear(data.schema);

    wsHub.broadcast({
      type: 'store:updated',
      data: { schema: data.schema, action: 'clear', count: 0 },
    });

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
    data: { path: string; status: number; delay?: number; body?: unknown },
  ): void {
    simulationManager.set({
      path: data.path,
      operationId: '',
      status: data.status,
      delay: data.delay,
      body: data.body,
    });

    wsHub.broadcast({
      type: 'simulation:added',
      data: { path: data.path },
    });

    sendTo(client, {
      type: 'simulation:set',
      data: { path: data.path, success: true },
    });
  }

  /**
   * Remove a simulation and broadcast
   */
  function handleClearSimulation(client: WebSocketClient, data: { path: string }): void {
    const removed = simulationManager.remove(data.path);

    if (removed) {
      wsHub.broadcast({
        type: 'simulation:removed',
        data: { path: data.path },
      });
    }

    sendTo(client, {
      type: 'simulation:cleared',
      data: { path: data.path, success: removed },
    });
  }

  /**
   * Clear timeline and broadcast
   */
  function handleClearTimeline(client: WebSocketClient): void {
    const count = timeline.length;
    timeline.length = 0;

    wsHub.broadcast({
      type: 'timeline:cleared',
      data: { count },
    });

    // Send confirmation to requesting client
    sendTo(client, {
      type: 'timeline:cleared',
      data: { count },
    });
  }

  /**
   * Re-insert seed data into the store and broadcast
   */
  function handleReseed(client: WebSocketClient): void {
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

    wsHub.broadcast({
      type: 'reseeded',
      data: { success: true, schemas },
    });

    sendTo(client, {
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
}
