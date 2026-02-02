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

import type { HandlerFn } from './handlers/index.js';
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
  logger?: Console;
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
 * Timeline entry for request/response logging
 */
interface TimelineEntry {
  id: string;
  timestamp: string;
  type: 'request' | 'response';
  data: unknown;
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
 * import { createOpenApiServer } from '@websublime/vite-open-api-core';
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
        logger.warn(`[vite-open-api-core] Failed to seed ${schemaName}:`, error);
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
  let currentHandlers = handlers;
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
        credentials: true,
      }),
    );
  }

  // ==========================================================================
  // Internal API Routes (/_api/*)
  // ==========================================================================

  /**
   * GET /_api/registry
   * Returns the endpoint registry for DevTools
   */
  app.get('/_api/registry', (c) => {
    const registryData = {
      endpoints: Array.from(registry.endpoints.entries()).map(([key, entry]) => ({
        key,
        ...entry,
      })),
      stats: registry.stats,
    };
    return c.json(registryData);
  });

  /**
   * GET /_api/store
   * Returns all schema names in the store
   */
  app.get('/_api/store', (c) => {
    const schemas = store.getSchemas();
    const data = schemas.map((schema) => ({
      name: schema,
      count: store.getCount(schema),
      idField: store.getIdField(schema),
    }));
    return c.json({ schemas: data });
  });

  /**
   * GET /_api/store/:schema
   * Returns all items for a schema
   */
  app.get('/_api/store/:schema', (c) => {
    const schema = c.req.param('schema');
    const items = store.list(schema);
    return c.json({
      schema,
      count: items.length,
      idField: store.getIdField(schema),
      items,
    });
  });

  /**
   * POST /_api/store/:schema
   * Bulk replace items for a schema
   */
  app.post('/_api/store/:schema', async (c) => {
    const schema = c.req.param('schema');

    let data: unknown[];
    try {
      data = await c.req.json();
      if (!Array.isArray(data)) {
        return c.json({ error: 'Request body must be an array' }, 400);
      }
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    // Clear and repopulate
    store.clear(schema);
    let created = 0;
    const errors: string[] = [];

    for (const item of data) {
      try {
        store.create(schema, item);
        created++;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    // Broadcast store update
    wsHub.broadcast({
      type: 'store:updated',
      data: { schema, action: 'bulk', count: created },
    });

    return c.json({
      success: true,
      schema,
      created,
      errors: errors.length > 0 ? errors : undefined,
    });
  });

  /**
   * DELETE /_api/store/:schema
   * Clear all items for a schema
   */
  app.delete('/_api/store/:schema', (c) => {
    const schema = c.req.param('schema');
    const countBefore = store.getCount(schema);
    store.clear(schema);

    wsHub.broadcast({
      type: 'store:updated',
      data: { schema, action: 'clear', count: 0 },
    });

    return c.json({
      success: true,
      schema,
      deleted: countBefore,
    });
  });

  /**
   * GET /_api/timeline
   * Returns request/response timeline
   */
  app.get('/_api/timeline', (c) => {
    const limit = Number(c.req.query('limit')) || timelineLimit;
    const entries = timeline.slice(-limit);
    return c.json({
      entries,
      count: entries.length,
      total: timeline.length,
    });
  });

  /**
   * DELETE /_api/timeline
   * Clear timeline
   */
  app.delete('/_api/timeline', (c) => {
    const count = timeline.length;
    timeline.length = 0;

    wsHub.broadcast({
      type: 'timeline:cleared',
      data: { count },
    });

    return c.json({ success: true, cleared: count });
  });

  /**
   * GET /_api/simulations
   * Returns all active simulations
   */
  app.get('/_api/simulations', (c) => {
    return c.json({
      simulations: simulationManager.list(),
      count: simulationManager.count(),
    });
  });

  /**
   * POST /_api/simulations
   * Add or update a simulation
   */
  app.post('/_api/simulations', async (c) => {
    let simulation: unknown;
    try {
      simulation = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    if (!simulation || typeof simulation !== 'object') {
      return c.json({ error: 'Invalid simulation object' }, 400);
    }

    const sim = simulation as Record<string, unknown>;
    if (!sim.path || !sim.operationId || typeof sim.status !== 'number') {
      return c.json({ error: 'Simulation requires path, operationId, and status' }, 400);
    }

    try {
      simulationManager.set({
        path: String(sim.path),
        operationId: String(sim.operationId),
        status: Number(sim.status),
        delay: sim.delay ? Number(sim.delay) : undefined,
        body: sim.body,
        headers: sim.headers as Record<string, string> | undefined,
      });

      wsHub.broadcast({
        type: 'simulation:added',
        data: { path: sim.path },
      });

      return c.json({ success: true, path: sim.path });
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : 'Failed to add simulation' },
        400,
      );
    }
  });

  /**
   * DELETE /_api/simulations/:path
   * Remove a simulation by path
   */
  app.delete('/_api/simulations/:path', (c) => {
    const path = decodeURIComponent(c.req.param('path'));
    const removed = simulationManager.remove(path);

    if (removed) {
      wsHub.broadcast({
        type: 'simulation:removed',
        data: { path },
      });
    }

    return c.json({ success: removed, path });
  });

  /**
   * DELETE /_api/simulations
   * Clear all simulations
   */
  app.delete('/_api/simulations', (c) => {
    const count = simulationManager.count();
    simulationManager.clear();

    wsHub.broadcast({
      type: 'simulations:cleared',
      data: { count },
    });

    return c.json({ success: true, cleared: count });
  });

  /**
   * GET /_api/document
   * Returns the processed OpenAPI document
   */
  app.get('/_api/document', (c) => {
    return c.json(document);
  });

  /**
   * GET /_api/health
   * Health check endpoint
   */
  app.get('/_api/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      endpoints: registry.endpoints.size,
      schemas: store.getSchemas().length,
      simulations: simulationManager.count(),
    });
  });

  // ==========================================================================
  // DevTools Routes (/_devtools/*)
  // TODO: Will be implemented in Task 4.2
  // ==========================================================================

  app.get('/_devtools', (c) => {
    return c.text('DevTools SPA - Coming in Task 4.2', 200);
  });

  app.get('/_devtools/*', (c) => {
    return c.text('DevTools SPA - Coming in Task 4.2', 200);
  });

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
      try {
        const { serve } = await import('@hono/node-server');
        serverInstance = serve({
          fetch: app.fetch,
          port,
        });
        logger.info(`[vite-open-api-core] Server started on http://localhost:${port}`);
      } catch (_error) {
        // @hono/node-server not installed - provide helpful message
        logger.error(
          '[vite-open-api-core] Failed to start server. Install @hono/node-server for standalone mode:',
          '\n  npm install @hono/node-server',
        );
        throw new Error(
          '@hono/node-server is required for standalone mode. Install with: npm install @hono/node-server',
        );
      }
    },

    async stop(): Promise<void> {
      if (
        serverInstance &&
        typeof (serverInstance as { close?: () => void }).close === 'function'
      ) {
        (serverInstance as { close: () => void }).close();
        serverInstance = null;
        logger.info('[vite-open-api-core] Server stopped');
      }
    },

    updateHandlers(newHandlers: Map<string, HandlerFn>): void {
      currentHandlers = newHandlers;

      // Update registry with new handler info
      const handlerOperationIds = new Set(newHandlers.keys());
      for (const entry of registry.endpoints.values()) {
        entry.hasHandler = handlerOperationIds.has(entry.operationId);
      }

      wsHub.broadcast({
        type: 'handlers:updated',
        data: { count: newHandlers.size },
      });

      logger.info(`[vite-open-api-core] Handlers updated: ${newHandlers.size} handlers`);
    },

    updateSeeds(newSeeds: Map<string, unknown[]>): void {
      currentSeeds = newSeeds;

      // Re-populate store with new seeds
      store.clearAll();
      for (const [schemaName, items] of newSeeds) {
        for (const item of items) {
          try {
            store.create(schemaName, item);
          } catch (error) {
            logger.warn(`[vite-open-api-core] Failed to seed ${schemaName}:`, error);
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

      logger.info(`[vite-open-api-core] Seeds updated: ${newSeeds.size} schemas`);
    },
  };

  return server;
}
