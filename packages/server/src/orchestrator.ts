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
// Phase 3 Helpers (extracted for cognitive complexity)
// =============================================================================

/** CORS configuration used by both mainApp and sub-instance middleware */
interface CorsConfig {
  origin: string | string[];
  allowMethods: string[];
  allowHeaders: string[];
  exposeHeaders: string[];
  maxAge: number;
  credentials: boolean;
}

/**
 * Build the CORS configuration from resolved options.
 *
 * Normalizes `['*']` to `'*'` (Hono's array branch uses `.includes(origin)`
 * which never matches browser-sent origins against the literal `'*'`).
 */
function buildCorsConfig(options: ResolvedOptions): CorsConfig {
  const isWildcardOrigin =
    options.corsOrigin === '*' ||
    (Array.isArray(options.corsOrigin) && options.corsOrigin.includes('*'));

  const effectiveCorsOrigin =
    Array.isArray(options.corsOrigin) && options.corsOrigin.includes('*')
      ? '*'
      : options.corsOrigin;

  return {
    origin: effectiveCorsOrigin,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Spec-Id'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400,
    credentials: !isWildcardOrigin,
  };
}

/**
 * Mount the DevTools SPA on the main Hono app.
 *
 * Resolves the SPA directory relative to this file's location.
 * Logs a warning if the built SPA is not found.
 */
function mountDevToolsSpa(mainApp: Hono, logger: Logger): void {
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

/**
 * Create the X-Spec-Id dispatch middleware.
 *
 * Uses slugify() to normalize the incoming header so it matches the
 * instanceMap keys produced by deriveSpecId().
 */
function createDispatchMiddleware(instanceMap: Map<string, SpecInstance>) {
  return async (c: Parameters<Parameters<Hono['use']>[1]>[0], next: () => Promise<void>) => {
    const rawSpecId = c.req.header('x-spec-id');
    if (!rawSpecId) {
      await next();
      return;
    }

    const specId = slugify(rawSpecId.trim());
    if (!specId) {
      await next();
      return;
    }

    const instance = instanceMap.get(specId);
    if (!instance) {
      return c.json({ error: `Unknown spec: ${specId}` }, 404);
    }

    return instance.server.app.fetch(c.req.raw);
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

    // Write resolved values back to options.specs[i]. Since processSpec
    // received this same object reference as specConfig, and the instance
    // was created with `config: specConfig`, these mutations are visible
    // through both options.specs[i] and instance.config (shared object).
    const specConfig = options.specs[i];
    specConfig.id = resolvedConfig.id;
    specConfig.proxyPath = resolvedConfig.proxyPath;
    specConfig.proxyPathSource = resolvedConfig.proxyPathSource;
    specConfig.handlersDir = resolvedConfig.handlersDir;
    specConfig.seedsDir = resolvedConfig.seedsDir;

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

  // --- CORS ---
  const corsConfig = buildCorsConfig(options);
  if (options.cors) {
    // mainApp CORS covers shared services (/_devtools, /_api).
    mainApp.use('*', cors(corsConfig));
    // Sub-instance CORS covers dispatched requests (app.fetch() bypasses mainApp middleware).
    for (const inst of instances) {
      inst.server.app.use('*', cors(corsConfig));
    }
  }

  // --- DevTools SPA (single SPA for all specs, spec-aware via WebSocket) ---
  if (options.devtools) {
    mountDevToolsSpa(mainApp, logger);
  }

  // --- Internal API — first spec only (multi-spec: Epic 3, Task 3.x) ---
  if (instances.length > 0) {
    if (instances.length > 1) {
      logger.warn?.(
        "[vite-plugin-open-api-server] Only first spec's internal API mounted on /_api; multi-spec support planned in Epic 3 (Task 3.x).",
      );
    }
    const firstInstance = instances[0];
    // Cast to mutable — getTimeline() returns `readonly TimelineEntry[]` at the type level,
    // but the underlying array is mutable. The clearTimeline lambda needs to truncate it
    // without broadcasting (internal-api.ts broadcasts after calling clearTimeline).
    const timeline = firstInstance.server.getTimeline() as TimelineEntry[];
    mountInternalApi(mainApp, {
      store: firstInstance.server.store,
      registry: firstInstance.server.registry,
      simulationManager: firstInstance.server.simulationManager,
      wsHub: firstInstance.server.wsHub,
      timeline,
      timelineLimit: options.timelineLimit,
      clearTimeline: () => {
        const count = timeline.length;
        timeline.length = 0;
        return count;
      },
      document: firstInstance.server.document,
    });
  }

  // --- X-Spec-Id dispatch middleware ---
  const instanceMap = new Map(instances.map((inst) => [inst.id, inst]));
  mainApp.use('*', createDispatchMiddleware(instanceMap));

  // ========================================================================
  // Spec metadata
  // ========================================================================

  const specsInfo = instances.map((inst) => inst.info);

  // ========================================================================
  // Lifecycle
  // ========================================================================

  /** Minimal interface for the Node.js HTTP server returned by @hono/node-server */
  type NodeServer = import('node:http').Server;

  let serverInstance: NodeServer | null = null;

  return {
    app: mainApp,
    instances,
    specsInfo,

    async start(): Promise<void> {
      // Guard against double-start — prevents leaking the first server
      if (serverInstance) {
        throw new Error('[vite-plugin-open-api-server] Server already running. Call stop() first.');
      }

      // Dynamic import — only one HTTP server for all specs.
      // Use createAdaptorServer() to separate server creation from listen(),
      // ensuring event listeners are attached before listen() is called.
      let createAdaptorServer: typeof import('@hono/node-server').createAdaptorServer;
      try {
        const nodeServer = await import('@hono/node-server');
        createAdaptorServer = nodeServer.createAdaptorServer;
      } catch {
        throw new Error(
          '@hono/node-server is required. Install with: npm install @hono/node-server',
        );
      }

      const server = createAdaptorServer({ fetch: mainApp.fetch }) as NodeServer;

      // Wait for the server to be listening before resolving.
      // Attach listeners BEFORE calling listen() to avoid a race condition
      // where the 'listening' event fires before the handler is registered.
      await new Promise<void>((resolve, reject) => {
        const onListening = () => {
          server.removeListener('error', onError);
          // Read the actual bound port from the server (handles port 0 / ephemeral)
          const addr = server.address();
          const actualPort = typeof addr === 'object' && addr ? addr.port : options.port;
          logger.info(
            `[vite-plugin-open-api-server] Server started on http://localhost:${actualPort}`,
          );
          serverInstance = server;
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
        server.listen(options.port);
      });
    },

    async stop(): Promise<void> {
      const server = serverInstance;
      if (server) {
        try {
          await new Promise<void>((resolve, reject) => {
            server.close((err?: Error) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          });
          logger.info('[vite-plugin-open-api-server] Server stopped');
        } catch (err) {
          logger.error?.('[vite-plugin-open-api-server] Error closing server:', err);
          throw err;
        } finally {
          serverInstance = null;
        }
      }
    },
  };
}
