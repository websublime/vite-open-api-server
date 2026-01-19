/**
 * Server Factory
 *
 * What: Main factory function to create the OpenAPI server
 * How: Wires together processor, store, router, and WebSocket hub
 * Why: Single entry point for creating a fully configured server
 */

// TODO: Will be implemented in Task 1.6: Server Factory

import type { EndpointRegistry } from './router/index.js';
import type { Store } from './store/index.js';

/**
 * Server configuration options
 */
export interface OpenApiServerConfig {
  /** OpenAPI document (string path, URL, or object) */
  spec: string | Record<string, unknown>;
  /** Server port */
  port?: number;
  /** ID field configuration per schema */
  idFields?: Record<string, string>;
  /** Loaded handlers */
  handlers?: Map<string, unknown>;
  /** Seed data per schema */
  seeds?: Map<string, unknown[]>;
  /** Maximum timeline events */
  timelineLimit?: number;
}

/**
 * OpenAPI server instance
 */
export interface OpenApiServer {
  app: unknown; // Hono instance
  store: Store;
  registry: EndpointRegistry;
  document: Record<string, unknown>;
  start(): Promise<void>;
  stop(): Promise<void>;
  updateHandlers(handlers: Map<string, unknown>): void;
}

/**
 * Create a new OpenAPI server
 *
 * @param config - Server configuration
 * @returns Server instance
 */
export async function createOpenApiServer(_config: OpenApiServerConfig): Promise<OpenApiServer> {
  // TODO: Implement in Task 1.6
  throw new Error('Not implemented yet - see Task 1.6');
}
