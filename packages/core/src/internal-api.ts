/**
 * Internal API Routes
 *
 * What: HTTP routes for DevTools and management API
 * How: Mounts /_api/* routes for store, timeline, simulations, and health
 * Why: Separates internal API logic from main server factory for maintainability
 *
 * @module internal-api
 */

import type { Hono } from 'hono';

import packageJson from '../package.json' with { type: 'json' };
import type { EndpointRegistry } from './router/index.js';
import type { SimulationManager } from './simulation/index.js';
import type { Store } from './store/index.js';
import type { WebSocketHub } from './websocket/index.js';

/**
 * Package version from package.json
 */
const PACKAGE_VERSION = packageJson.version;

/**
 * Timeline entry for request/response logging
 */
export interface TimelineEntry {
  id: string;
  timestamp: string;
  type: 'request' | 'response';
  data: unknown;
}

/**
 * Dependencies required by internal API routes
 */
export interface InternalApiDeps {
  /** In-memory data store */
  store: Store;

  /** Endpoint registry */
  registry: EndpointRegistry;

  /** Simulation manager */
  simulationManager: SimulationManager;

  /** WebSocket hub for broadcasting updates */
  wsHub: WebSocketHub;

  /** Request/response timeline */
  timeline: TimelineEntry[];

  /** Maximum timeline entries */
  timelineLimit: number;

  /** Processed OpenAPI document */
  document: unknown;
}

/**
 * Mount internal API routes on a Hono app
 *
 * Adds the following routes:
 * - GET    /_api/registry      - Endpoint registry for DevTools
 * - GET    /_api/store         - List all schemas
 * - GET    /_api/store/:schema - Get items for a schema
 * - POST   /_api/store/:schema - Bulk replace items
 * - DELETE /_api/store/:schema - Clear schema data
 * - GET    /_api/timeline      - Request/response timeline
 * - DELETE /_api/timeline      - Clear timeline
 * - GET    /_api/simulations   - List active simulations
 * - POST   /_api/simulations   - Add/update simulation
 * - DELETE /_api/simulations/:path - Remove simulation
 * - DELETE /_api/simulations   - Clear all simulations
 * - GET    /_api/document      - OpenAPI document
 * - GET    /_api/health        - Health check
 *
 * @param app - Hono application to mount routes on
 * @param deps - Dependencies for route handlers
 */
export function mountInternalApi(app: Hono, deps: InternalApiDeps): void {
  const { store, registry, simulationManager, wsHub, timeline, timelineLimit, document } = deps;

  // ==========================================================================
  // Registry Routes
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

  // ==========================================================================
  // Store Routes
  // ==========================================================================

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

  // ==========================================================================
  // Timeline Routes
  // ==========================================================================

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

  // ==========================================================================
  // Simulation Routes
  // ==========================================================================

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
        data: { path: String(sim.path) },
      });

      return c.json({ success: true, path: String(sim.path) });
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
    let path: string;
    try {
      path = decodeURIComponent(c.req.param('path'));
    } catch {
      return c.json({ error: 'Invalid path encoding' }, 400);
    }

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

  // ==========================================================================
  // Document & Health Routes
  // ==========================================================================

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
      version: PACKAGE_VERSION,
      endpoints: registry.endpoints.size,
      schemas: store.getSchemas().length,
      simulations: simulationManager.count(),
    });
  });
}
