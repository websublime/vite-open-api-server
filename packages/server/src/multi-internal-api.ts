/**
 * Multi-Spec Internal API
 *
 * What: HTTP API routes for multi-spec DevTools and management
 * How: Aggregated routes across all specs + per-spec routes via :specId param
 * Why: Enables DevTools and external tools to query/manage individual spec instances
 *
 * TODO: Task 5.4.7/5.4.8 will add integration tests for these routes
 * TODO: Export response types when DevTools client (Epic 4) consumes them
 * TODO: Write routes (POST/DELETE store, POST/DELETE simulations, DELETE timeline)
 *       are deferred — mutations use WebSocket commands (task 3.2.4). Add HTTP write
 *       routes if needed by external tooling.
 *
 * @module multi-internal-api
 */

import { Hono } from 'hono';
import packageJson from '../package.json' with { type: 'json' };
import type { SpecInstance } from './orchestrator.js';

/** Hono environment with per-spec middleware variables */
type SpecEnv = { Variables: { specInstance: SpecInstance } };

/**
 * Package version from package.json
 */
const PACKAGE_VERSION = packageJson.version;

/**
 * Mount multi-spec internal API routes on the main Hono app.
 *
 * Aggregated routes:
 *   GET /_api/specs                        - List all specs with metadata
 *   GET /_api/registry                     - Aggregated registry across all specs
 *   GET /_api/health                       - Aggregated health check
 *
 * Per-spec routes (resolved via middleware):
 *   GET /_api/specs/:specId/registry       - Registry for one spec
 *   GET /_api/specs/:specId/store          - List schemas for one spec
 *   GET /_api/specs/:specId/store/:schema  - Store data for one spec
 *   GET /_api/specs/:specId/document       - OpenAPI document for one spec
 *   GET /_api/specs/:specId/simulations    - Simulations for one spec
 *   GET /_api/specs/:specId/timeline       - Timeline for one spec
 *
 * @param app - Main Hono application
 * @param instances - All resolved spec instances
 */
export function mountMultiSpecInternalApi(app: Hono, instances: SpecInstance[]): void {
  const instanceMap = new Map(instances.map((i) => [i.id, i]));

  // ========================================================================
  // Aggregated Routes
  // ========================================================================

  /**
   * GET /_api/specs
   * List all spec instances with metadata
   */
  app.get('/_api/specs', (c) => {
    const specs = instances.map((i) => ({
      id: i.id,
      title: i.info.title,
      version: i.info.version,
      proxyPath: i.config.proxyPath,
      color: i.info.color,
      endpoints: i.server.registry.endpoints.size,
      schemas: i.server.store.getSchemas().length,
      simulations: i.server.simulationManager.count(),
    }));
    return c.json({ specs, count: specs.length });
  });

  /**
   * GET /_api/registry
   * Aggregated registry across all specs
   */
  app.get('/_api/registry', (c) => {
    const registries = instances.map((i) => ({
      specId: i.id,
      specTitle: i.info.title,
      specColor: i.info.color,
      endpoints: Array.from(i.server.registry.endpoints.entries()).map(([key, entry]) => ({
        ...entry,
        key,
      })),
      stats: i.server.registry.stats,
    }));

    const totalEndpoints = registries.reduce((sum, r) => sum + r.endpoints.length, 0);

    return c.json({
      specs: registries,
      totalEndpoints,
      totalSpecs: registries.length,
    });
  });

  /**
   * GET /_api/health
   * Aggregated health check with PACKAGE_VERSION
   */
  app.get('/_api/health', (c) => {
    const specs = instances.map((i) => ({
      id: i.id,
      endpoints: i.server.registry.endpoints.size,
      schemas: i.server.store.getSchemas().length,
      simulations: i.server.simulationManager.count(),
    }));

    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: PACKAGE_VERSION,
      totalSpecs: instances.length,
      totalEndpoints: specs.reduce((s, i) => s + i.endpoints, 0),
      specs,
    });
  });

  // ========================================================================
  // Per-Spec Routes (typed sub-app with middleware)
  // ========================================================================

  const specApi = new Hono<SpecEnv>();

  /**
   * Middleware: resolve spec instance from :specId param.
   * Returns 404 for unknown specId. Sets resolved instance on context
   * for downstream route handlers.
   */
  specApi.use('/:specId/*', async (c, next) => {
    const specId = c.req.param('specId');
    const instance = instanceMap.get(specId);
    if (!instance) {
      return c.json({ error: `Unknown spec: ${specId}` }, 404);
    }
    c.set('specInstance', instance);
    await next();
  });

  /**
   * GET /_api/specs/:specId/registry
   * Registry for one spec
   */
  specApi.get('/:specId/registry', (c) => {
    const instance = c.get('specInstance');

    return c.json({
      specId: instance.id,
      endpoints: Array.from(instance.server.registry.endpoints.entries()).map(([key, entry]) => ({
        ...entry,
        key,
      })),
      stats: instance.server.registry.stats,
    });
  });

  /**
   * GET /_api/specs/:specId/store
   * List schemas for one spec
   */
  specApi.get('/:specId/store', (c) => {
    const instance = c.get('specInstance');

    const schemas = instance.server.store.getSchemas().map((schema) => ({
      name: schema,
      count: instance.server.store.getCount(schema),
      idField: instance.server.store.getIdField(schema),
    }));
    return c.json({ specId: instance.id, schemas });
  });

  /**
   * GET /_api/specs/:specId/store/:schema
   * Store data for one spec. Supports optional `limit` and `offset` query params.
   *
   * Default limit = min(total, 1000). Store data is typically small so most
   * requests return all items. Capped at 1000 per request in all cases.
   */
  specApi.get('/:specId/store/:schema', (c) => {
    const instance = c.get('specInstance');

    const schema = c.req.param('schema');
    const allItems = instance.server.store.list(schema);
    const total = allItems.length;

    const rawOffset = Number(c.req.query('offset'));
    const offset = Number.isFinite(rawOffset) ? Math.max(Math.floor(rawOffset), 0) : 0;

    const rawLimit = Number(c.req.query('limit'));
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(Math.floor(rawLimit), 0), 1000)
      : Math.min(total, 1000);

    const items = limit === 0 ? [] : allItems.slice(offset, offset + limit);
    return c.json({
      specId: instance.id,
      schema,
      idField: instance.server.store.getIdField(schema),
      items,
      count: items.length,
      total,
      offset,
      limit,
    });
  });

  /**
   * GET /_api/specs/:specId/document
   * OpenAPI document for one spec
   */
  specApi.get('/:specId/document', (c) => {
    const instance = c.get('specInstance');
    return c.json(instance.server.document);
  });

  /**
   * GET /_api/specs/:specId/simulations
   * Simulations for one spec
   */
  specApi.get('/:specId/simulations', (c) => {
    const instance = c.get('specInstance');

    return c.json({
      specId: instance.id,
      simulations: instance.server.simulationManager.list(),
      count: instance.server.simulationManager.count(),
    });
  });

  /**
   * GET /_api/specs/:specId/timeline
   * Timeline for one spec.
   *
   * Default limit = 100 (most recent entries) because timeline can grow
   * unbounded during a dev session. Capped at 1000 per request.
   */
  specApi.get('/:specId/timeline', (c) => {
    const instance = c.get('specInstance');

    const parsed = Number(c.req.query('limit'));
    const limit = Number.isFinite(parsed) ? Math.min(Math.max(Math.floor(parsed), 0), 1000) : 100;
    const timeline = instance.server.getTimeline();
    const entries = limit === 0 ? [] : timeline.slice(-limit);
    return c.json({
      specId: instance.id,
      entries,
      count: entries.length,
      total: timeline.length,
      limit,
    });
  });

  // Mount per-spec sub-app under /_api/specs
  app.route('/_api/specs', specApi);
}
