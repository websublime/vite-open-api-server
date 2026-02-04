/**
 * Pinia Stores Index
 *
 * What: Central export point for all Pinia stores
 * How: Re-exports individual stores for convenient importing
 * Why: Provides a single import location for store consumers
 *
 * Store responsibilities:
 * - registry: Manages endpoint registry data from the server
 * - timeline: Tracks request/response timeline events
 * - models: Manages store data for viewing/editing mock data
 * - simulation: Controls active error simulations
 */

export type {
  EndpointEntry,
  EndpointFilter,
  EndpointGroup,
  HttpMethod,
  RegistryData,
  RegistryStats,
  SecurityRequirement,
} from './registry';
// Registry store - manages endpoint data for the Routes pages,
export { useRegistryStore } from './registry';
export type {
  HttpMethod as TimelineHttpMethod,
  RequestLogEntry,
  ResponseLogEntry,
  TimelineData,
  TimelineEntry,
  TimelineFilter,
} from './timeline';
// Timeline store - manages request/response timeline events
export { useTimelineStore } from './timeline';

// Store exports will be added as stores are implemented
// export { useModelsStore } from './models';
// export { useSimulationStore } from './simulation';

/**
 * Store initialization helper
 *
 * Ensures all stores are properly initialized when the app starts
 * Can be called from main.ts after Pinia is installed
 */
export function initializeStores(): void {
  // Stores will be initialized here as they are implemented
  // This function can be used to set up initial state,
  // establish WebSocket connections, etc.
}
