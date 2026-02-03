/**
 * WebSocket Protocol
 *
 * What: Type definitions for WebSocket message protocol
 * How: Defines server events and client commands
 * Why: Ensures type-safe communication between server and DevTools
 */

// TODO: Will be implemented in Task 4.1: WebSocket Hub

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
 * Server to client events
 */
export type ServerEvent =
  | { type: 'connected'; data: { serverVersion: string } }
  | { type: 'request'; data: RequestLogEntry }
  | { type: 'response'; data: ResponseLogEntry }
  | { type: 'store:updated'; data: { schema: string; action: string } }
  | { type: 'handler:reloaded'; data: { file: string } }
  | { type: 'handlers:updated'; data: { count: number } }
  | { type: 'seeds:updated'; data: { count: number } }
  | { type: 'simulation:active'; data: SimulationState[] };

/**
 * Simulation configuration (alias for SimulationBase)
 * Used in client commands for setting simulations
 */
export type SimulationConfig = SimulationBase;

/**
 * Client to server commands
 */
export type ClientCommand =
  | { type: 'get:registry' }
  | { type: 'get:timeline'; data?: { limit?: number } }
  | { type: 'get:store'; data: { schema: string } }
  | { type: 'set:store'; data: { schema: string; items: unknown[] } }
  | { type: 'clear:store'; data: { schema: string } }
  | { type: 'set:simulation'; data: SimulationConfig }
  | { type: 'clear:simulation'; data: { path: string } }
  | { type: 'clear:timeline' }
  | { type: 'reseed' };
