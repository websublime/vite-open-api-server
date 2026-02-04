/**
 * Server Factory
 *
 * What: Main factory function to create the OpenAPI server
 * How: Wires together processor, store, router, WebSocket hub, and simulation manager
 * Why: Single entry point for creating a fully configured server instance
 *
 * @module server
 */

import type { OpenAPIV3_1 } from '@scalar/openapi-types';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { generateDevToolsHtml } from './devtools-template.js';
import type { HandlerFn, Logger } from './handlers/index.js';
import { mountInternalApi, type TimelineEntry } from './internal-api.js';
import { processOpenApiDocument } from './parser/index.js';
import { buildRoutes, type EndpointRegistry } from './router/index.js';
import { createSimulationManager, type SimulationManager } from './simulation/index.js';
import { createStore, type Store } from './store/index.js';
import { createWebSocketHub, type WebSocketHub } from './websocket/index.js';

/**
 * Server configuration options
 */
export interface OpenApiServerConfig {
  /**
   * OpenAPI document source
   * Can be a file path, URL, YAML/JSON string, or parsed object
   */
  spec: string | Record<string, unknown>;

  /**
   * Server port for standalone mode
   * @default 3000
   */
  port?: number;

  /**
   * ID field configuration per schema
   * Maps schema name to the field used as primary identifier
   * @default { '*': 'id' }
   */
  idFields?: Record<string, string>;

  /**
   * Loaded handlers map (operationId -> handler function)
   */
  handlers?: Map<string, HandlerFn>;

  /**
   * Seed data per schema (schema name -> array of items)
   */
  seeds?: Map<string, unknown[]>;

  /**
   * Maximum timeline events to keep in memory
   * @default 100
   */
  timelineLimit?: number;

  /**
   * Enable CORS middleware
   * @default true
   */
  cors?: boolean;

  /**
   * CORS origin configuration
   * @default '*'
   */
  corsOrigin?: string | string[];

  /**
   * Custom logger instance
   * @default console
   */
  logger?: Logger;

  /**
   * Enable DevTools routes (/_devtools/*)
   * @default true
   */
  devtools?: boolean;
}

/**
 * OpenAPI server instance
 *
 * Provides access to the Hono app, store, registry, and lifecycle methods.
 */
export interface OpenApiServer {
  /** Hono application instance with all routes configured */
  app: Hono;

  /** In-memory data store */
  store: Store;

  /** Endpoint registry for DevTools */
  registry: EndpointRegistry;

  /** Processed OpenAPI document */
  document: OpenAPIV3_1.Document;

  /** WebSocket hub for real-time updates */
  wsHub: WebSocketHub;

  /** Simulation manager for error/delay simulation */
  simulationManager: SimulationManager;

  /**
   * Start the server (standalone mode)
   * @returns Promise that resolves when server is listening
   */
  start(): Promise<void>;

  /**
   * Stop the server gracefully
   * @returns Promise that resolves when server is stopped
   */
  stop(): Promise<void>;

  /**
   * Update handlers at runtime (for hot reload)
   * @param handlers - New handlers map
   */
  updateHandlers(handlers: Map<string, HandlerFn>): void;

  /**
   * Update seed data at runtime (for hot reload)
   * @param seeds - New seeds map
   */
  updateSeeds(seeds: Map<string, unknown[]>): void;

  /**
   * Get the configured port
   */
  readonly port: number;
}

/**
 * Create a new OpenAPI server
 *
 * This is the main entry point for creating a fully configured mock server.
 * It processes the OpenAPI document, sets up the store, builds routes,
 * and configures all middleware.
 *
 * @example
 * ```typescript
 * import { createOpenApiServer } from '@websublime/vite-plugin-open-api-core';
 *
 * const server = await createOpenApiServer({
 *   spec: './openapi/petstore.yaml',
 *   port: 3000,
 *   idFields: { Pet: 'id', User: 'username' },
 * });
 *
 * // Access the Hono app for testing or custom middleware
 * const response = await server.app.request('/pets');
 *
 * // Start standalone server
 * await server.start();
 *
 * // Update handlers on hot reload
 * server.updateHandlers(newHandlers);
 *
 * // Stop server
 * await server.stop();
 * ```
 *
 * @param config - Server configuration
 * @returns Configured server instance
 */
export async function createOpenApiServer(config: OpenApiServerConfig): Promise<OpenApiServer> {
  const {
    spec,
    port = 3000,
    idFields = {},
    handlers = new Map(),
    seeds = new Map(),
    timelineLimit = 100,
    cors: enableCors = true,
    corsOrigin = '*',
    logger = console,
  } = config;

  // Process OpenAPI document through bundle -> upgrade -> dereference pipeline
  const document = await processOpenApiDocument(spec);

  // Create in-memory store with ID field configuration
  const store = createStore({ idFields });

  // Populate store with seed data
  for (const [schemaName, items] of seeds) {
    for (const item of items) {
      try {
        store.create(schemaName, item);
      } catch (error) {
        // Log but don't fail - duplicate IDs in seeds are common
        logger.warn(`[vite-plugin-open-api-core] Failed to seed ${schemaName}:`, error);
      }
    }
  }

  // Create WebSocket hub for real-time updates
  const wsHub = createWebSocketHub();

  // Create simulation manager for error/delay testing
  const simulationManager = createSimulationManager();

  // Timeline for request/response history
  const timeline: TimelineEntry[] = [];

  /**
   * Add entry to timeline with size limit
   */
  function addToTimeline(type: 'request' | 'response', data: unknown): void {
    const entry: TimelineEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      data,
    };

    timeline.push(entry);

    // Trim to limit
    while (timeline.length > timelineLimit) {
      timeline.shift();
    }
  }

  // Current handlers (mutable for hot reload)
  const currentHandlers = handlers;
  let currentSeeds = seeds;

  // Build routes from OpenAPI document
  const { app: apiRouter, registry } = buildRoutes(document, {
    store,
    handlers: currentHandlers,
    seeds: currentSeeds,
    simulationManager,
    onRequest: (entry) => {
      addToTimeline('request', entry);
      wsHub.broadcast({ type: 'request', data: entry });
    },
    onResponse: (entry) => {
      addToTimeline('response', entry);
      wsHub.broadcast({ type: 'response', data: entry });
    },
    logger,
  });

  // Create main Hono app
  const app = new Hono();

  // CORS middleware
  if (enableCors) {
    app.use(
      '*',
      cors({
        origin: corsOrigin,
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposeHeaders: ['Content-Length', 'X-Request-Id'],
        maxAge: 86400,
        // Browsers reject credentials: true with origin: '*'
        // Only enable credentials when a specific origin is configured
        credentials: corsOrigin !== '*',
      }),
    );
  }

  // ==========================================================================
  // Internal API Routes (/_api/*)
  // ==========================================================================

  mountInternalApi(app, {
    store,
    registry,
    simulationManager,
    wsHub,
    timeline,
    timelineLimit,
    document,
  });

  // ==========================================================================
  // DevTools Routes (/_devtools/*)
  // ==========================================================================

  if (config.devtools !== false) {
    app.get('/_devtools', (c) => {
      // Redirect to index
      return c.redirect('/_devtools/', 302);
    });

    app.get('/_devtools/', (c) => {
      // Serve DevTools SPA HTML
      const html = generateDevToolsHtml();

      // Warn about placeholder usage (should be replaced with built SPA in production)
      config.logger?.warn?.(
        '[DevTools] Serving development placeholder with CDN imports. For production, serve the full built DevTools SPA.',
      );

      // Cache for 1 hour in development (reload will bypass cache anyway)
      c.header('Cache-Control', 'public, max-age=3600');

      return c.html(html);
    });

    app.get('/_devtools/*', (c) => {
      // For now, redirect all sub-routes to the main DevTools page
      // In a full implementation, this would serve static assets or handle SPA routing
      return c.redirect('/_devtools/', 302);
    });
  }

  // ==========================================================================
  // WebSocket Route (/_ws)
  // TODO: Full WebSocket implementation in Task 4.1
  // ==========================================================================

  app.get('/_ws', (c) => {
    // WebSocket upgrade will be handled by the Vite plugin
    // For now, return info about the endpoint
    return c.json({
      message: 'WebSocket endpoint - use ws:// protocol',
      note: 'Full implementation in Task 4.1',
    });
  });

  // ==========================================================================
  // API Routes (mount the router)
  // ==========================================================================

  app.route('/', apiRouter);

  // ==========================================================================
  // Server Lifecycle
  // ==========================================================================

  let serverInstance: unknown = null;

  const server: OpenApiServer = {
    app,
    store,
    registry,
    document,
    wsHub,
    simulationManager,
    port,

    async start(): Promise<void> {
      // Dynamic import to avoid bundling node-server when not needed
      let serve: typeof import('@hono/node-server').serve;
      try {
        const nodeServer = await import('@hono/node-server');
        serve = nodeServer.serve;
      } catch (_error) {
        // @hono/node-server not installed - provide helpful message
        logger.error(
          '[vite-plugin-open-api-core] Failed to start server. Install @hono/node-server for standalone mode:',
          '\n  npm install @hono/node-server',
        );
        throw new Error(
          '@hono/node-server is required for standalone mode. Install with: npm install @hono/node-server',
        );
      }

      // Start the server outside the import try/catch
      serverInstance = serve({
        fetch: app.fetch,
        port,
      });

      // Handle runtime server errors (e.g., EADDRINUSE)
      (serverInstance as { on?: (event: string, handler: (err: Error) => void) => void }).on?.(
        'error',
        (err: Error) => {
          const errorCode = (err as NodeJS.ErrnoException).code;
          if (errorCode === 'EADDRINUSE') {
            logger.error(
              `[vite-plugin-open-api-core] Port ${port} is already in use. Choose a different port or stop the other process.`,
            );
          } else {
            logger.error(`[vite-plugin-open-api-core] Server error: ${err.message}`);
          }
        },
      );

      logger.info(`[vite-plugin-open-api-core] Server started on http://localhost:${port}`);
    },

    async stop(): Promise<void> {
      if (
        serverInstance &&
        typeof (serverInstance as { close?: () => void }).close === 'function'
      ) {
        (serverInstance as { close: () => void }).close();
        serverInstance = null;
        logger.info('[vite-plugin-open-api-core] Server stopped');
      }
    },

    updateHandlers(newHandlers: Map<string, HandlerFn>): void {
      // Mutate the existing Map in-place so route closures see the updates
      // (reassigning currentHandlers would break closures that captured the original Map)
      currentHandlers.clear();
      for (const [key, value] of newHandlers) {
        currentHandlers.set(key, value);
      }

      // Update registry with new handler info
      const handlerOperationIds = new Set(newHandlers.keys());
      for (const entry of registry.endpoints.values()) {
        entry.hasHandler = handlerOperationIds.has(entry.operationId);
      }

      wsHub.broadcast({
        type: 'handlers:updated',
        data: { count: newHandlers.size },
      });

      logger.info(`[vite-plugin-open-api-core] Handlers updated: ${newHandlers.size} handlers`);
    },

    /**
     * Update seed data at runtime (for hot reload)
     *
     * @remarks
     * **Warning**: This method clears ALL data in the store before repopulating
     * with the new seeds. Any manually added data (including data in schemas
     * not present in the new seeds) will be permanently lost.
     *
     * @param newSeeds - New seeds map (schema name -> array of items)
     */
    updateSeeds(newSeeds: Map<string, unknown[]>): void {
      currentSeeds = newSeeds;

      // Re-populate store with new seeds
      // Note: clearAll() removes ALL schemas, not just the ones being updated
      store.clearAll();
      for (const [schemaName, items] of newSeeds) {
        for (const item of items) {
          try {
            store.create(schemaName, item);
          } catch (error) {
            logger.warn(`[vite-plugin-open-api-core] Failed to seed ${schemaName}:`, error);
          }
        }
      }

      // Update registry with new seed info
      const seedSchemaNames = new Set(newSeeds.keys());
      for (const entry of registry.endpoints.values()) {
        if (entry.responseSchema) {
          entry.hasSeed = seedSchemaNames.has(entry.responseSchema);
        }
      }

      wsHub.broadcast({
        type: 'seeds:updated',
        data: { count: newSeeds.size },
      });

      logger.info(`[vite-plugin-open-api-core] Seeds updated: ${newSeeds.size} schemas`);
    },
  };

  return server;
}
