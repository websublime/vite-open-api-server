/**
 * Multi-Spec Command Handler
 *
 * What: Routes WebSocket commands to the correct spec instance
 * How: Global commands aggregate across specs; spec-scoped commands delegate to instances
 * Why: Enables DevTools to interact with multiple spec instances through a single WebSocket
 *
 * @module multi-command
 */

import type {
  SpecInfo,
  WebSocketClient,
  WebSocketHub,
} from '@websublime/vite-plugin-open-api-core';
import type { SpecInstance } from './orchestrator.js';

/**
 * Dependencies for the multi-spec command handler
 */
export interface MultiCommandHandlerDeps {
  /** Shared WebSocket hub (the multi-spec hub) */
  hub: WebSocketHub;

  /** All spec instances */
  instances: SpecInstance[];

  /** Spec metadata array */
  specsInfo: SpecInfo[];

  /** Server version string */
  serverVersion: string;
}

/**
 * Spec-scoped command types that require a `specId` parameter
 */
const SPEC_SCOPED_COMMANDS = new Set([
  'get:store',
  'set:store',
  'clear:store',
  'set:simulation',
  'clear:simulation',
  'reseed',
]);

/** Parsed command shape from client */
interface ParsedCommand {
  type: string;
  data?: { specId?: string; [key: string]: unknown };
}

/**
 * Send an error response to a client
 */
function sendError(
  hub: WebSocketHub,
  client: WebSocketClient,
  command: string,
  message: string,
): void {
  // biome-ignore lint/suspicious/noExplicitAny: error event data shape compatible with ServerEvent
  hub.sendTo(client, { type: 'error', data: { command, message } } as any);
}

/**
 * Resolve a spec instance from a specId, sending an error if not found.
 * Returns the instance or undefined if invalid.
 */
function resolveInstance(
  specId: string | undefined,
  instanceMap: Map<string, SpecInstance>,
  hub: WebSocketHub,
  client: WebSocketClient,
  commandType: string,
): SpecInstance | undefined {
  if (!specId) return undefined;
  const instance = instanceMap.get(specId);
  if (!instance) {
    sendError(hub, client, commandType, `Unknown spec: ${specId}`);
  }
  return instance;
}

/**
 * Handle get:specs — return enhanced connected event
 */
function handleGetSpecs(
  hub: WebSocketHub,
  client: WebSocketClient,
  specsInfo: SpecInfo[],
  serverVersion: string,
): void {
  // biome-ignore lint/suspicious/noExplicitAny: MultiSpecServerEvent connected data extends ServerEvent
  hub.sendTo(client, { type: 'connected', data: { serverVersion, specs: specsInfo } } as any);
}

/**
 * Handle get:registry — single spec (by specId) or all specs.
 *
 * Constructs the registry response directly (with specId) rather than
 * delegating to per-spec hubs, for consistency with other handlers.
 */
function handleGetRegistry(
  cmd: ParsedCommand,
  hub: WebSocketHub,
  client: WebSocketClient,
  instances: SpecInstance[],
  instanceMap: Map<string, SpecInstance>,
): void {
  const sendRegistry = (instance: SpecInstance, id: string) => {
    const registryEvent = {
      type: 'registry',
      data: {
        specId: id,
        endpoints: Array.from(instance.server.registry.endpoints.entries()).map(([key, entry]) => ({
          key,
          ...entry,
        })),
        stats: { ...instance.server.registry.stats },
      },
    };
    // biome-ignore lint/suspicious/noExplicitAny: registry data with specId extends ServerEvent
    hub.sendTo(client, registryEvent as any);
  };

  const specId = cmd.data?.specId;
  if (specId) {
    const instance = resolveInstance(specId, instanceMap, hub, client, cmd.type);
    if (!instance) return;
    sendRegistry(instance, specId);
  } else {
    for (const instance of instances) {
      sendRegistry(instance, instance.id);
    }
  }
}

/**
 * Handle get:timeline — single spec or all specs
 */
function handleGetTimeline(
  cmd: ParsedCommand,
  hub: WebSocketHub,
  client: WebSocketClient,
  instances: SpecInstance[],
  instanceMap: Map<string, SpecInstance>,
): void {
  const specId = cmd.data?.specId;
  const rawLimit = Number(cmd.data?.limit);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.floor(rawLimit), 0), 1000) : 100;

  const sendTimeline = (instance: SpecInstance, id: string) => {
    const timeline = instance.server.getTimeline();
    const entries = limit === 0 ? [] : timeline.slice(-limit);
    const timelineEvent = {
      type: 'timeline',
      data: {
        specId: id,
        entries,
        count: entries.length,
        total: timeline.length,
      },
    };
    // biome-ignore lint/suspicious/noExplicitAny: timeline data with specId extends ServerEvent
    hub.sendTo(client, timelineEvent as any);
  };

  if (specId) {
    const instance = resolveInstance(specId, instanceMap, hub, client, cmd.type);
    if (!instance) return;
    sendTimeline(instance, specId);
  } else {
    for (const instance of instances) {
      sendTimeline(instance, instance.id);
    }
  }
}

/**
 * Handle clear:timeline — single spec or all specs
 */
function handleClearTimeline(
  cmd: ParsedCommand,
  hub: WebSocketHub,
  client: WebSocketClient,
  instances: SpecInstance[],
  instanceMap: Map<string, SpecInstance>,
): void {
  const specId = cmd.data?.specId;

  const clearAndNotify = (instance: SpecInstance, id: string) => {
    const count = instance.server.clearTimeline();
    // biome-ignore lint/suspicious/noExplicitAny: cleared data with specId
    hub.sendTo(client, { type: 'timeline:cleared', data: { specId: id, count } } as any);
  };

  if (specId) {
    const instance = resolveInstance(specId, instanceMap, hub, client, cmd.type);
    if (!instance) return;
    clearAndNotify(instance, specId);
  } else {
    for (const instance of instances) {
      clearAndNotify(instance, instance.id);
    }
  }
}

/**
 * Handle spec-scoped commands — delegate to the correct instance's command handler
 */
function handleSpecScoped(
  cmd: ParsedCommand,
  hub: WebSocketHub,
  client: WebSocketClient,
  instanceMap: Map<string, SpecInstance>,
): void {
  const specId = cmd.data?.specId;
  if (!specId) {
    sendError(hub, client, cmd.type, 'specId is required for this command');
    return;
  }

  const instance = resolveInstance(specId, instanceMap, hub, client, cmd.type);
  if (!instance) return;

  // Forward to the instance's command handler, stripping specId
  // (core command handler doesn't know about specId)
  const { specId: _, ...coreData } = cmd.data ?? {};
  const coreCommand =
    Object.keys(coreData).length > 0 ? { type: cmd.type, data: coreData } : { type: cmd.type };

  instance.server.wsHub.handleMessage(client, JSON.stringify(coreCommand));
}

/**
 * Create a multi-spec command handler that routes commands to the correct spec instance.
 *
 * Command routing:
 * - `get:specs` — returns enhanced connected event with all specs metadata
 * - `get:registry` — aggregates across all specs (no specId) or single spec (with specId)
 * - `get:timeline` / `clear:timeline` — global (all specs) or single spec
 * - Spec-scoped commands (`get:store`, `set:store`, `clear:store`, `set:simulation`,
 *   `clear:simulation`, `reseed`) — require specId, delegate to instance's command handler
 *
 * @param deps - Dependencies for command routing
 * @returns Command handler function compatible with `hub.setCommandHandler()`
 */
export function createMultiSpecCommandHandler(
  deps: MultiCommandHandlerDeps,
): (client: WebSocketClient, command: unknown) => void {
  const { hub, instances, specsInfo, serverVersion } = deps;
  const instanceMap = new Map(instances.map((i) => [i.id, i]));

  return (client: WebSocketClient, command: unknown) => {
    if (!command || typeof command !== 'object' || !('type' in command)) {
      return;
    }
    const cmd = command as ParsedCommand;
    if (typeof cmd.type !== 'string') {
      return;
    }

    switch (cmd.type) {
      case 'get:specs':
        handleGetSpecs(hub, client, specsInfo, serverVersion);
        break;
      case 'get:registry':
        handleGetRegistry(cmd, hub, client, instances, instanceMap);
        break;
      case 'get:timeline':
        handleGetTimeline(cmd, hub, client, instances, instanceMap);
        break;
      case 'clear:timeline':
        handleClearTimeline(cmd, hub, client, instances, instanceMap);
        break;
      default:
        if (SPEC_SCOPED_COMMANDS.has(cmd.type)) {
          handleSpecScoped(cmd, hub, client, instanceMap);
        } else {
          sendError(hub, client, cmd.type, `Unknown command type: ${cmd.type}`);
        }
        break;
    }
  };
}
