/**
 * WebSocket Protocol
 *
 * What: Type definitions for WebSocket message protocol
 * How: Defines server events and client commands
 * Why: Ensures type-safe communication between server and DevTools
 *
 * @module websocket/protocol
 */

/**
 * Request log entry for timeline
 * Note: query allows string[] to match HandlerRequest.query for multi-value params
 */
export interface RequestLogEntry {
  id: string;
  method: string;
  path: string;
  operationId: string;
  timestamp: number;
  headers: Record<string, string>;
  query: Record<string, string | string[]>;
  body?: unknown;
}

/**
 * Response log entry for timeline
 */
export interface ResponseLogEntry {
  id: string;
  requestId: string;
  status: number;
  duration: number;
  headers: Record<string, string>;
  body: unknown;
  simulated: boolean;
}

/**
 * Base simulation configuration
 * Shared definition to avoid drift between SimulationState and SimulationConfig
 */
export interface SimulationBase {
  path: string;
  status: number;
  delay?: number;
  body?: unknown;
}

/**
 * Simulation state for active simulations
 */
export type SimulationState = SimulationBase;

/**
 * Simulation configuration (alias for SimulationBase)
 * Used in client commands for setting simulations
 */
export type SimulationConfig = SimulationBase;

/**
 * Server to client events
 *
 * These events are sent from the server to connected DevTools clients.
 * Each event has a type and associated data payload.
 */
export type ServerEvent =
  // Connection events
  | { type: 'connected'; data: { serverVersion: string } }

  // Timeline events (real-time request/response tracking)
  | { type: 'request'; data: RequestLogEntry }
  | { type: 'response'; data: ResponseLogEntry }
  | { type: 'timeline:cleared'; data: { count: number } }

  // Store events
  | { type: 'store:updated'; data: { schema: string; action: string; count?: number } }

  // Handler hot-reload events
  | { type: 'handler:reloaded'; data: { file: string } }
  | { type: 'handlers:updated'; data: { count: number } }

  // Seed hot-reload events
  | { type: 'seed:reloaded'; data: { file: string } }
  | { type: 'seeds:updated'; data: { count: number } }

  // Simulation events
  | { type: 'simulation:active'; data: SimulationState[] }
  | { type: 'simulation:added'; data: { path: string } }
  | { type: 'simulation:removed'; data: { path: string } }
  | { type: 'simulations:cleared'; data: { count: number } }

  // Response events for client commands
  | { type: 'registry'; data: unknown }
  | { type: 'timeline'; data: { entries: unknown[]; count: number; total: number } }
  | { type: 'store'; data: { schema: string; items: unknown[]; count: number } }
  | { type: 'store:set'; data: { schema: string; success: boolean; count: number } }
  | { type: 'store:cleared'; data: { schema: string; success: boolean } }
  | { type: 'simulation:set'; data: { path: string; success: boolean } }
  | { type: 'simulation:cleared'; data: { path: string; success: boolean } }
  | { type: 'reseeded'; data: { success: boolean; schemas: string[] } }

  // Error event for command failures
  | { type: 'error'; data: { command: string; message: string } };

/**
 * Valid client command types
 *
 * Single source of truth for command type validation.
 * Used both for TypeScript type inference and runtime validation.
 *
 * @remarks
 * When adding new commands, add them here first. The ClientCommand type
 * and runtime validation will automatically include them.
 */
export const CLIENT_COMMAND_TYPES = [
  'get:registry',
  'get:timeline',
  'get:store',
  'set:store',
  'clear:store',
  'set:simulation',
  'clear:simulation',
  'clear:timeline',
  'reseed',
] as const;

/**
 * Type for valid client command types
 */
export type ClientCommandType = (typeof CLIENT_COMMAND_TYPES)[number];

/**
 * Client to server commands
 *
 * These commands are sent from DevTools clients to the server.
 * The server processes each command and may respond with a ServerEvent.
 *
 * @remarks
 * Command handlers are responsible for validating the `data` property
 * of each command. The hub validates the command type but not the data shape.
 */
export type ClientCommand =
  // Query commands
  | { type: 'get:registry' }
  | { type: 'get:timeline'; data?: { limit?: number } }
  | { type: 'get:store'; data: { schema: string } }

  // Mutation commands
  | { type: 'set:store'; data: { schema: string; items: unknown[] } }
  | { type: 'clear:store'; data: { schema: string } }
  | { type: 'set:simulation'; data: SimulationConfig }
  | { type: 'clear:simulation'; data: { path: string } }
  | { type: 'clear:timeline' }
  | { type: 'reseed' };

/**
 * Extract the data type for a specific server event type
 *
 * @example
 * ```typescript
 * type ConnectedData = ServerEventData<'connected'>;
 * // { serverVersion: string }
 * ```
 */
export type ServerEventData<T extends ServerEvent['type']> = Extract<
  ServerEvent,
  { type: T }
>['data'];

/**
 * Extract the data type for a specific client command type
 *
 * @example
 * ```typescript
 * type GetStoreData = ClientCommandData<'get:store'>;
 * // { schema: string }
 * ```
 */
export type ClientCommandData<T extends ClientCommand['type']> =
  Extract<ClientCommand, { type: T }> extends { data: infer D } ? D : undefined;
