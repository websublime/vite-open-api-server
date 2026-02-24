/**
 * Multi-Spec WebSocket Hub
 *
 * What: Creates a single WebSocket hub for all spec instances
 * How: Wraps the core hub with broadcast interception and enhanced connected event
 * Why: Enables spec-aware real-time communication with DevTools
 *
 * @module multi-ws
 */

import {
  createWebSocketHub,
  type SpecInfo,
  type WebSocketClient,
  type WebSocketHub,
} from '@websublime/vite-plugin-open-api-core';
import packageJson from '../package.json' with { type: 'json' };
import { createMultiSpecCommandHandler } from './multi-command.js';
import type { SpecInstance } from './orchestrator.js';

/**
 * Package version from package.json
 */
const PACKAGE_VERSION = packageJson.version;

/**
 * Command types that exist only in multi-spec mode and are NOT in
 * the core hub's CLIENT_COMMAND_TYPES. These need special handling
 * because the core hub rejects unknown command types.
 */
const MULTI_SPEC_ONLY_COMMANDS = new Set(['get:specs']);

/**
 * Create a multi-spec aware WebSocket hub.
 *
 * Strategy:
 * - Single WebSocket hub for all connections (`autoConnect: false`)
 * - `addClient()` is overridden to send an enhanced `connected` event with
 *   `specs` metadata and `PACKAGE_VERSION`
 * - Each core server's `wsHub.broadcast()` is intercepted to add `specId`
 *   to event data before broadcasting on the shared hub
 * - Client commands are routed to the correct spec instance via the
 *   multi-spec command handler
 *
 * @param instances - All resolved spec instances
 * @param specsInfo - Spec metadata array (for the `connected` event)
 * @returns Shared WebSocket hub with multi-spec support
 */
export function createMultiSpecWebSocketHub(
  instances: SpecInstance[],
  specsInfo: SpecInfo[],
): WebSocketHub {
  // autoConnect: false prevents the hub from sending its own 'connected'
  // event in addClient(). We send an enhanced version instead.
  const hub = createWebSocketHub({ autoConnect: false });

  // --- Override addClient to send enhanced connected event ---
  const originalAddClient = hub.addClient.bind(hub);
  hub.addClient = (ws: WebSocketClient) => {
    originalAddClient(ws);

    // Send multi-spec enhanced connected event
    hub.sendTo(ws, {
      type: 'connected',
      // biome-ignore lint/suspicious/noExplicitAny: MultiSpecServerEvent extends ServerEvent with specs[]
      data: { serverVersion: PACKAGE_VERSION, specs: specsInfo } as any,
    });
  };

  // --- Wire each core server's broadcasts to add specId ---
  for (const instance of instances) {
    instance.server.wsHub.broadcast = (event) => {
      // Add specId to the event data and broadcast on the shared hub
      // biome-ignore lint/suspicious/noExplicitAny: enriching ServerEvent with specId at runtime
      const enriched = { type: event.type, data: { ...(event as any).data, specId: instance.id } };
      // biome-ignore lint/suspicious/noExplicitAny: enriched event compatible with ServerEvent
      hub.broadcast(enriched as any);
    };

    // Also intercept sendTo for direct responses that go through the core hub
    instance.server.wsHub.sendTo = (client, event) => {
      // Add specId to direct responses too
      // biome-ignore lint/suspicious/noExplicitAny: enriching ServerEvent with specId at runtime
      const enriched = { type: event.type, data: { ...(event as any).data, specId: instance.id } };
      // biome-ignore lint/suspicious/noExplicitAny: enriched event compatible with ServerEvent
      return hub.sendTo(client, enriched as any);
    };
  }

  // --- Set up multi-spec command handler ---
  const commandHandler = createMultiSpecCommandHandler({
    hub,
    instances,
    specsInfo,
    serverVersion: PACKAGE_VERSION,
  });

  hub.setCommandHandler(commandHandler);

  // --- Override handleMessage to accept multi-spec-only commands ---
  // The core hub's handleMessage validates command types against CLIENT_COMMAND_TYPES,
  // which doesn't include multi-spec commands like 'get:specs'. We intercept these
  // before the core validation and route them directly to the command handler.
  const originalHandleMessage = hub.handleMessage.bind(hub);
  hub.handleMessage = (client: WebSocketClient, message: string | unknown) => {
    try {
      const parsed = typeof message === 'string' ? JSON.parse(message) : message;
      if (parsed && typeof parsed === 'object' && 'type' in parsed) {
        const cmd = parsed as { type: string };
        if (MULTI_SPEC_ONLY_COMMANDS.has(cmd.type)) {
          commandHandler(client, cmd as never);
          return;
        }
      }
    } catch {
      // Fall through to core handleMessage which handles parse errors
    }
    originalHandleMessage(client, message);
  };

  return hub;
}
