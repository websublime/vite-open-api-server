/**
 * Multi-Spec Internal API
 *
 * What: HTTP API routes for multi-spec DevTools and management
 * How: Aggregated routes across all specs + per-spec routes via :specId param
 * Why: Enables DevTools and external tools to query/manage individual spec instances
 *
 * @module multi-internal-api
 */

import type { Hono } from 'hono';
import packageJson from '../package.json' with { type: 'json' };
import type { SpecInstance } from './orchestrator.js';

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
 * Per-spec routes:
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

  /**
   * Resolve a spec instance from the :specId param, returning a 404 response
   * if the spec is unknown. Returns undefined when instance is not found
   * (caller should return the 404 response).
   */
  function resolveSpec(specId: string): SpecInstance | undefined {
    return instanceMap.get(specId);
  }

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
        key,
        ...entry,
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
  // Per-Spec Routes
  // ========================================================================

  /**
   * GET /_api/specs/:specId/registry
   * Registry for one spec
   */
  app.get('/_api/specs/:specId/registry', (c) => {
    const instance = resolveSpec(c.req.param('specId'));
    if (!instance) return c.json({ error: `Unknown spec: ${c.req.param('specId')}` }, 404);

    return c.json({
      specId: instance.id,
      endpoints: Array.from(instance.server.registry.endpoints.entries()).map(([key, entry]) => ({
        key,
        ...entry,
      })),
      stats: instance.server.registry.stats,
    });
  });

  /**
   * GET /_api/specs/:specId/store
   * List schemas for one spec
   */
  app.get('/_api/specs/:specId/store', (c) => {
    const instance = resolveSpec(c.req.param('specId'));
    if (!instance) return c.json({ error: `Unknown spec: ${c.req.param('specId')}` }, 404);

    const schemas = instance.server.store.getSchemas().map((schema) => ({
      name: schema,
      count: instance.server.store.getCount(schema),
      idField: instance.server.store.getIdField(schema),
    }));
    return c.json({ schemas });
  });

  /**
   * GET /_api/specs/:specId/store/:schema
   * Store data for one spec
   */
  app.get('/_api/specs/:specId/store/:schema', (c) => {
    const instance = resolveSpec(c.req.param('specId'));
    if (!instance) return c.json({ error: `Unknown spec: ${c.req.param('specId')}` }, 404);

    const schema = c.req.param('schema');
    const items = instance.server.store.list(schema);
    return c.json({ schema, count: items.length, items });
  });

  /**
   * GET /_api/specs/:specId/document
   * OpenAPI document for one spec
   */
  app.get('/_api/specs/:specId/document', (c) => {
    const instance = resolveSpec(c.req.param('specId'));
    if (!instance) return c.json({ error: `Unknown spec: ${c.req.param('specId')}` }, 404);

    return c.json(instance.server.document);
  });

  /**
   * GET /_api/specs/:specId/simulations
   * Simulations for one spec
   */
  app.get('/_api/specs/:specId/simulations', (c) => {
    const instance = resolveSpec(c.req.param('specId'));
    if (!instance) return c.json({ error: `Unknown spec: ${c.req.param('specId')}` }, 404);

    return c.json({
      simulations: instance.server.simulationManager.list(),
      count: instance.server.simulationManager.count(),
    });
  });

  /**
   * GET /_api/specs/:specId/timeline
   * Timeline for one spec
   */
  app.get('/_api/specs/:specId/timeline', (c) => {
    const instance = resolveSpec(c.req.param('specId'));
    if (!instance) return c.json({ error: `Unknown spec: ${c.req.param('specId')}` }, 404);

    const limit = Number(c.req.query('limit')) || 100;
    const entries = instance.server.getTimeline().slice(-limit);
    return c.json({
      specId: instance.id,
      entries,
      count: entries.length,
      total: instance.server.getTimeline().length,
    });
  });
}
