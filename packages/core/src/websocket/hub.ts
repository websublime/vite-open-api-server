/**
 * WebSocket Hub
 *
 * What: Manages WebSocket connections and message broadcasting
 * How: Maintains set of connected clients, broadcasts to all
 * Why: Enables real-time communication with DevTools
 */

// TODO: Will be implemented in Task 4.1: WebSocket Hub

let hasWarnedNoOp = false;

/**
 * WebSocket hub interface
 */
export interface WebSocketHub {
  addClient(ws: unknown): void;
  removeClient(ws: unknown): void;
  broadcast(event: unknown): void;
  handleMessage(ws: unknown, message: unknown): void;
}

/**
 * Create a new WebSocket hub
 *
 * Returns a no-op implementation until Task 4.1 is complete.
 * A single warning is logged on first call.
 *
 * @returns WebSocket hub instance (no-op until implemented)
 */
export function createWebSocketHub(): WebSocketHub {
  // Log warning once to inform developers
  if (!hasWarnedNoOp) {
    // biome-ignore lint/suspicious/noConsole: Intentional warning to inform developers about stub implementation
    console.warn(
      '[vite-open-api-core] WebSocket hub not implemented yet - see Task 4.1. Using no-op stub.',
    );
    hasWarnedNoOp = true;
  }

  // Return no-op implementation that satisfies the interface
  return {
    addClient(_ws: unknown): void {
      // No-op until Task 4.1
    },
    removeClient(_ws: unknown): void {
      // No-op until Task 4.1
    },
    broadcast(_event: unknown): void {
      // No-op until Task 4.1
    },
    handleMessage(_ws: unknown, _message: unknown): void {
      // No-op until Task 4.1
    },
  };
}
