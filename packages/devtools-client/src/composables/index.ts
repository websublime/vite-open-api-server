/**
 * Composables Index
 *
 * What: Central export point for all Vue composables
 * How: Re-exports individual composables for convenient importing
 * Why: Provides a single import location for composable consumers
 *
 * Composable responsibilities:
 * - useTheme: Manages dark/light mode theme switching
 * - useWebSocket: Handles WebSocket connection with auto-reconnect
 */

export type { ThemeMode } from './useTheme';
export { useTheme } from './useTheme';
export type {
  ClientCommand,
  ClientCommandType,
  ConnectedEventData,
  ConnectionState,
  EventHandler,
  ServerEvent,
  ServerEventType,
  UseWebSocketOptions,
  UseWebSocketReturn,
} from './useWebSocket';
export { useWebSocket } from './useWebSocket';
