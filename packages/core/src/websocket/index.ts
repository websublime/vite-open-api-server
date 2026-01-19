/**
 * WebSocket Module
 *
 * What: WebSocket hub for real-time communication
 * How: Manages client connections and broadcasts events
 * Why: Enables DevTools real-time updates
 *
 * @module websocket
 */

// TODO: Will be implemented in Task 4.1
export { createWebSocketHub, type WebSocketHub } from './hub.js';
export type {
  ClientCommand,
  RequestLogEntry,
  ResponseLogEntry,
  ServerEvent,
  SimulationConfig,
  SimulationState,
} from './protocol.js';
