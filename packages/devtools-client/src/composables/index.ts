/**
 * Composables Index
 *
 * What: Central export point for all Vue composables
 * How: Re-exports individual composables for convenient importing
 * Why: Provides a single import location for composable consumers
 *
 * Composable responsibilities:
 * - useTheme: Manages dark/light mode theme switching
 * - useWebSocket: Handles WebSocket connection (TODO: Task 4.3)
 */

export type { ThemeMode } from './useTheme';
export { useTheme } from './useTheme';

// WebSocket composable will be added in Task 4.3
// export { useWebSocket } from './useWebSocket';
