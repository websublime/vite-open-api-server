/**
 * Multi-Spec Orchestrator
 *
 * What: Central orchestrator that creates N spec instances and mounts them on a single Hono app
 * How: Three phases — process specs, validate uniqueness, build main Hono app with dispatch middleware
 * Why: Enables multiple OpenAPI specs to run on a single server with isolated stores and handlers
 *
 * @module orchestrator
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createOpenApiServer,
  executeSeeds,
  type Logger,
  mountDevToolsRoutes,
  mountInternalApi,
  type OpenApiServer,
  type SpecInfo,
  type TimelineEntry,
} from '@websublime/vite-plugin-open-api-core';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { ViteDevServer } from 'vite';

import { loadHandlers } from './handlers.js';
import { deriveProxyPath, validateUniqueProxyPaths } from './proxy-path.js';
import { loadSeeds } from './seeds.js';
import { deriveSpecId, slugify, validateUniqueIds } from './spec-id.js';
import type { ResolvedOptions, ResolvedSpecConfig } from './types.js';

// =============================================================================
// Constants
// =============================================================================

/**
 * Deterministic color palette for spec identification in DevTools.
 *
 * Colors are assigned by index: spec 0 gets green, spec 1 gets blue, etc.
 * Wraps around for >8 specs.
 */
export const SPEC_COLORS: readonly string[] = [
  '#4ade80', // green
  '#60a5fa', // blue
  '#f472b6', // pink
  '#facc15', // yellow
  '#a78bfa', // purple
  '#fb923c', // orange
  '#2dd4bf', // teal
  '#f87171', // red
];

// =============================================================================
// Types
// =============================================================================

/**
 * Resolved spec instance with all runtime data.
 *
 * Created during Phase 1 of orchestration. Each instance owns
 * an isolated core `OpenApiServer` with its own store, registry,
 * handlers, seeds, and timeline.
 */
export interface SpecInstance {
  /** Unique spec identifier (explicit or auto-derived from info.title) */
  id: string;

  /** Spec metadata for DevTools display and WebSocket protocol */
  info: SpecInfo;

  /** Core server instance (isolated Hono app, store, registry, etc.) */
  server: OpenApiServer;

  /** Resolved configuration for this spec */
  config: ResolvedSpecConfig;
}

/**
 * Orchestrator result — returned by `createOrchestrator()`.
 *
 * Provides access to the main Hono app (all specs mounted),
 * individual spec instances, aggregated metadata, and lifecycle methods.
 */
export interface OrchestratorResult {
  /** Main Hono app with all specs mounted via X-Spec-Id dispatch */
  app: Hono;

  /** All spec instances (in config order) */
  instances: SpecInstance[];

  /** Spec metadata array for WebSocket `connected` event */
  specsInfo: SpecInfo[];

  /** Start the shared HTTP server on the configured port */
  start(): Promise<void>;

  /** Stop the HTTP server and clean up resources */
  stop(): Promise<void>;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Resolved values produced by `processSpec` for a single spec.
 *
 * Returned instead of mutating the input `ResolvedSpecConfig` so that
 * the caller (`createOrchestrator`) decides how to propagate the values.
 */
interface ProcessedSpec {
  instance: SpecInstance;
  resolvedConfig: {
    id: string;
    proxyPath: string;
    proxyPathSource: 'auto' | 'explicit';
    handlersDir: string;
    seedsDir: string;
  };
}

/**
 * Process a single spec configuration into a resolved SpecInstance.
 *
 * Loads handlers and seeds, creates the core OpenApiServer, derives the
 * spec ID and proxy path, and builds the SpecInfo metadata.
 *
 * Does **not** mutate `specConfig`. Returns resolved values separately
 * so the caller can assign them back.
 */
async function processSpec(
  specConfig: ResolvedSpecConfig,
  index: number,
  options: ResolvedOptions,
  vite: ViteDevServer,
  cwd: string,
  logger: Logger,
): Promise<ProcessedSpec> {
  // Derive a filesystem-safe namespace for fallback directories.
  // Uses slugified ID to match the final resolved spec ID (e.g., "My API" → "my-api").
  const specNamespace = specConfig.id ? slugify(specConfig.id) : `spec-${index}`;

  // Resolve handlers directory (fallback uses spec namespace)
  const handlersDir = specConfig.handlersDir || `./mocks/${specNamespace}/handlers`;

  // Resolve seeds directory (same namespace pattern)
  const seedsDir = specConfig.seedsDir || `./mocks/${specNamespace}/seeds`;

  // Load handlers via Vite's ssrLoadModule
  const handlersResult = await loadHandlers(handlersDir, vite, cwd, logger);

  // Load seeds via Vite's ssrLoadModule
  const seedsResult = await loadSeeds(seedsDir, vite, cwd, logger);

  // Create core server instance (processes the OpenAPI document internally)
  // NOTE: Pass empty Map for seeds — createOpenApiServer.seeds expects
  // Map<string, unknown[]> (static data), while loadSeeds() returns
  // Map<string, AnySeedFn> (functions). Seeds are executed separately
  // via executeSeeds() after server creation.
  const server = await createOpenApiServer({
    spec: specConfig.spec,
    port: options.port,
    idFields: specConfig.idFields,
    handlers: handlersResult.handlers,
    seeds: new Map(),
    timelineLimit: options.timelineLimit,
    cors: false, // CORS handled at main app level
    devtools: false, // DevTools mounted at main app level
    logger,
  });

  // Execute seed functions to populate the store
  if (seedsResult.seeds.size > 0) {
    await executeSeeds(seedsResult.seeds, server.store, server.document);
  }

  // Derive spec ID (now that document is processed and info.title is available)
  const id = deriveSpecId(specConfig.id, server.document);

  // Derive proxy path (from explicit config or servers[0].url)
  const { proxyPath, proxyPathSource } = deriveProxyPath(specConfig.proxyPath, server.document, id);

  // Build SpecInfo metadata for DevTools and WebSocket protocol
  const info: SpecInfo = {
    id,
    title: server.document.info?.title ?? id,
    version: server.document.info?.version ?? 'unknown',
    proxyPath,
    color: SPEC_COLORS[index % SPEC_COLORS.length],
    endpointCount: server.registry.endpoints.size,
    schemaCount: server.store.getSchemas().length,
  };

  return {
    instance: { id, info, server, config: specConfig },
    resolvedConfig: { id, proxyPath, proxyPathSource, handlersDir, seedsDir },
  };
}

// =============================================================================
// Orchestrator Factory
// =============================================================================

/**
 * Create the multi-spec orchestrator.
 *
 * Flow:
 * 1. **Phase 1 — Process specs**: For each spec config, load handlers/seeds,
 *    create a core `OpenApiServer` instance, derive ID and proxy path.
 * 2. **Phase 2 — Validate uniqueness**: Ensure all spec IDs and proxy paths
 *    are unique and non-overlapping.
 * 3. **Phase 3 — Build main app**: Create a single Hono app with CORS,
 *    DevTools, Internal API, and X-Spec-Id dispatch middleware.
 *
 * **Note**: This function mutates `options.specs[i]` to write back resolved
 * values (id, proxyPath, proxyPathSource, handlersDir, seedsDir) so that
 * downstream consumers (banner, file watcher, plugin.ts) see the final values.
 *
 * @param options - Resolved plugin options (from `resolveOptions()`)
 * @param vite - Vite dev server instance (for ssrLoadModule)
 * @param cwd - Project root directory
 * @returns Orchestrator result with app, instances, and lifecycle methods
 */
export async function createOrchestrator(
  options: ResolvedOptions,
  vite: ViteDevServer,
  cwd: string,
): Promise<OrchestratorResult> {
  const logger = options.logger ?? console;

  // ========================================================================
  // Phase 1: Process each spec — load handlers/seeds, create core instances
  // ========================================================================

  const instances: SpecInstance[] = [];
  for (let i = 0; i < options.specs.length; i++) {
    const { instance, resolvedConfig } = await processSpec(
      options.specs[i],
      i,
      options,
      vite,
      cwd,
      logger,
    );

    // Write resolved values back to options.specs so downstream consumers
    // (banner, file watcher, plugin.ts) see the final values.
    const specConfig = options.specs[i];
    specConfig.id = resolvedConfig.id;
    specConfig.proxyPath = resolvedConfig.proxyPath;
    specConfig.proxyPathSource = resolvedConfig.proxyPathSource;
    specConfig.handlersDir = resolvedConfig.handlersDir;
    specConfig.seedsDir = resolvedConfig.seedsDir;

    // Update the instance config reference to reflect the resolved values
    instance.config = specConfig;

    instances.push(instance);
  }

  // ========================================================================
  // Phase 2: Validate uniqueness of IDs and proxy paths
  // ========================================================================

  validateUniqueIds(instances.map((inst) => inst.id));
  validateUniqueProxyPaths(
    instances.map((inst) => ({
      id: inst.id,
      proxyPath: inst.config.proxyPath,
    })),
  );

  // ========================================================================
  // Phase 3: Build main Hono app
  // ========================================================================

  const mainApp = new Hono();

  // --- CORS configuration ---
  // Determines whether Access-Control-Allow-Credentials should be sent.
  // Credentials must be false when origin is '*' (wildcard), regardless
  // of whether corsOrigin is a string or array containing '*'.
  const isWildcardOrigin =
    options.corsOrigin === '*' ||
    (Array.isArray(options.corsOrigin) && options.corsOrigin.includes('*'));

  const corsConfig = {
    origin: options.corsOrigin,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Spec-Id'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400,
    credentials: !isWildcardOrigin,
  };

  // CORS middleware on mainApp (applies to shared services: /_devtools, /_api).
  // Sub-instances also get CORS middleware (see below) because app.fetch()
  // creates a separate Hono context that bypasses mainApp's middleware chain.
  if (options.cors) {
    mainApp.use('*', cors(corsConfig));
  }

  // --- DevTools SPA (single SPA for all specs, spec-aware via WebSocket) ---
  if (options.devtools) {
    const pluginDir = dirname(fileURLToPath(import.meta.url));
    const spaDir = join(pluginDir, 'devtools-spa');
    const devtoolsSpaDir = existsSync(spaDir) ? spaDir : undefined;

    if (!devtoolsSpaDir) {
      logger.warn?.(
        '[vite-plugin-open-api-server] DevTools SPA not found at',
        spaDir,
        '- serving placeholder. Run "pnpm build" to include the SPA.',
      );
    }

    mountDevToolsRoutes(mainApp, {
      spaDir: devtoolsSpaDir,
      logger,
    });
  }

  // --- Internal API — aggregated across specs ---
  // TODO: Multi-spec internal API will be implemented in Epic 3 (Task 3.x).
  // For now, mount the first spec's internal API as a baseline so
  // /_api/health and /_api/registry are reachable.
  if (instances.length > 0) {
    const firstInstance = instances[0];
    mountInternalApi(mainApp, {
      store: firstInstance.server.store,
      registry: firstInstance.server.registry,
      simulationManager: firstInstance.server.simulationManager,
      wsHub: firstInstance.server.wsHub,
      timeline: firstInstance.server.getTimeline() as TimelineEntry[],
      timelineLimit: options.timelineLimit,
      document: firstInstance.server.document,
    });
  }

  // --- X-Spec-Id dispatch middleware ---
  // Routes requests with X-Spec-Id header to the correct spec's Hono app.
  // Requests without the header fall through to shared services
  // (/_devtools, /_api) registered above.
  // NOTE: /_ws is not yet mounted at the orchestrator level (see Epic 3).
  // The instanceMap keys are lowercase (from slugify()), so we normalize
  // the incoming header to match.
  // Mount CORS on each sub-instance's Hono app so that dispatched
  // requests (via app.fetch()) include proper CORS headers.
  // mainApp CORS only covers shared services; sub-instance responses
  // bypass mainApp's middleware chain entirely.
  if (options.cors) {
    for (const inst of instances) {
      inst.server.app.use('*', cors(corsConfig));
    }
  }

  const instanceMap = new Map(instances.map((inst) => [inst.id, inst]));

  mainApp.use('*', async (c, next) => {
    const rawSpecId = c.req.header('x-spec-id');
    if (!rawSpecId) {
      // No spec header — shared service request, continue to next middleware
      await next();
      return;
    }

    const specId = rawSpecId.trim().toLowerCase();
    const instance = instanceMap.get(specId);
    if (!instance) {
      // Use sanitized specId in the error response (not raw user input)
      return c.json({ error: `Unknown spec: ${specId}` }, 404);
    }

    // Dispatch to the spec's Hono app via app.fetch()
    return instance.server.app.fetch(c.req.raw);
  });

  // ========================================================================
  // Spec metadata
  // ========================================================================

  const specsInfo = instances.map((inst) => inst.info);

  // ========================================================================
  // Lifecycle
  // ========================================================================

  // Server instance reference. Typed as unknown to match core's convention;
  // we only access .close() / .removeListener() / .once() via type narrowing.
  let serverInstance: unknown = null;

  return {
    app: mainApp,
    instances,
    specsInfo,

    async start(): Promise<void> {
      // Guard against double-start — prevents leaking the first server
      if (serverInstance) {
        throw new Error('[vite-plugin-open-api-server] Server already running. Call stop() first.');
      }

      // Dynamic import — only one HTTP server for all specs
      let serve: typeof import('@hono/node-server').serve;
      try {
        const nodeServer = await import('@hono/node-server');
        serve = nodeServer.serve;
      } catch {
        throw new Error(
          '@hono/node-server is required. Install with: npm install @hono/node-server',
        );
      }

      const server = serve({
        fetch: mainApp.fetch,
        port: options.port,
      });

      serverInstance = server;

      // Wait for the server to be listening before resolving.
      // Rejects on 'error' (e.g., EADDRINUSE) so callers know immediately.
      await new Promise<void>((resolve, reject) => {
        const onListening = () => {
          server.removeListener('error', onError);
          logger.info(
            `[vite-plugin-open-api-server] Server started on http://localhost:${options.port}`,
          );
          resolve();
        };

        const onError = (err: NodeJS.ErrnoException) => {
          server.removeListener('listening', onListening);
          // Close and null the server to prevent leaks on error
          server.close(() => {});
          serverInstance = null;
          if (err.code === 'EADDRINUSE') {
            reject(
              new Error(`[vite-plugin-open-api-server] Port ${options.port} is already in use.`),
            );
          } else {
            reject(new Error(`[vite-plugin-open-api-server] Server error: ${err.message}`));
          }
        };

        server.once('listening', onListening);
        server.once('error', onError);
      });
    },

    async stop(): Promise<void> {
      const server = serverInstance as { close?: (cb: (err?: Error) => void) => void } | null;
      const closeFn = server?.close;
      if (server && typeof closeFn === 'function') {
        await new Promise<void>((resolve, reject) => {
          closeFn.call(server, (err?: Error) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
        serverInstance = null;
        logger.info('[vite-plugin-open-api-server] Server stopped');
      }
    },
  };
}
