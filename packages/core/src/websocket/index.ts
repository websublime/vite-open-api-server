/**
 * WebSocket Module
 *
 * What: WebSocket hub for real-time communication
 * How: Manages client connections and broadcasts events
 * Why: Enables DevTools real-time updates
 *
 * @module websocket
 */

export { type CommandHandlerDeps, createCommandHandler } from './command-handler.js';

export {
  type CommandHandler,
  createWebSocketHub,
  type WebSocketClient,
  type WebSocketHub,
  type WebSocketHubLogger,
  type WebSocketHubOptions,
} from './hub.js';

export {
  CLIENT_COMMAND_TYPES,
  type ClientCommand,
  type ClientCommandData,
  type ClientCommandType,
  type RequestLogEntry,
  type ResponseLogEntry,
  type ServerEvent,
  type ServerEventData,
  type SimulationBase,
  type SimulationConfig,
  type SimulationState,
} from './protocol.js';
