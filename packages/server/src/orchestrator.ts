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
import type { Server as NodeServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createOpenApiServer,
  createWebSocketHub,
  executeSeeds,
  type Logger,
  mountDevToolsRoutes,
  mountInternalApi,
  type OpenApiServer,
  type SpecInfo,
  type WebSocketClient,
  type WebSocketHub,
} from '@websublime/vite-plugin-open-api-core';
import { type Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import type { ViteDevServer } from 'vite';
import packageJson from '../package.json' with { type: 'json' };
import { loadHandlers } from './handlers.js';
import { deriveProxyPath, validateUniqueProxyPaths } from './proxy-path.js';
import { loadSeeds } from './seeds.js';
import { deriveSpecId, slugify, validateUniqueIds } from './spec-id.js';
import type { ResolvedOptions, ResolvedSpecConfig } from './types.js';

/**
 * Package version from package.json, used in the WebSocket `connected` event.
 */
const PACKAGE_VERSION = packageJson.version;

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
  /**
   * Main Hono app with all specs mounted via X-Spec-Id dispatch.
   *
   * **Note**: Consumers using this property directly must have `hono`
   * as a dependency. The `start()`/`stop()` lifecycle methods do not
   * require direct interaction with this Hono instance.
   */
  app: Hono;

  /** All spec instances (in config order) */
  instances: SpecInstance[];

  /** Spec metadata array for WebSocket `connected` event */
  specsInfo: SpecInfo[];

  /**
   * Shared WebSocket hub for the orchestrator.
   *
   * Created with `autoConnect: false` so the orchestrator controls
   * the `connected` event (enhanced with `specs` metadata).
   *
   * In multi-spec mode (Epic 3, Task 3.1), this hub will be replaced by
   * `createMultiSpecWebSocketHub()` which also wires broadcast interception
   * and multi-spec command routing.
   *
   * @experimental Will be replaced by `createMultiSpecWebSocketHub()` in Epic 3.
   */
  wsHub: WebSocketHub;

  /** Start the shared HTTP server on the configured port */
  start(): Promise<void>;

  /** Stop the HTTP server and clean up resources */
  stop(): Promise<void>;

  /** Actual bound port after start() resolves (0 before start or after stop) */
  readonly port: number;
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

  const effectiveCorsOrigin: string | string[] = isWildcardOrigin ? '*' : options.corsOrigin;

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
 * Result of WebSocket route setup.
 *
 * Contains the injection function that must be called on `start()` to
 * hook the Node.js HTTP server's `upgrade` event for WS handshakes.
 */
interface WebSocketRouteResult {
  // biome-ignore lint/suspicious/noExplicitAny: @hono/node-ws types expect node http.Server but we store generically
  injectWebSocket: ((server: any) => void) | null;
}

/**
 * Create the orchestrator's shared WebSocket hub with enhanced `connected` event.
 *
 * Uses `autoConnect: false` to suppress the core hub's default connected event,
 * then overrides `addClient` to send the multi-spec `connected` event instead
 * (with `specs` metadata and package version).
 *
 * **Note**: This override will be replaced by `createMultiSpecWebSocketHub()` in
 * Epic 3 (Task 3.1), which provides a proper factory with typed events.
 */
function createOrchestratorHub(specsInfo: SpecInfo[]): WebSocketHub {
  const wsHub = createWebSocketHub({ autoConnect: false });

  // Guard: ensure addClient is writable before overriding. The core hub
  // returns a plain object literal (writable by default), but this guard
  // protects against future refactors that might seal/freeze the object.
  const descriptor = Object.getOwnPropertyDescriptor(wsHub, 'addClient');
  if (descriptor && !descriptor.writable && !descriptor.configurable) {
    throw new Error(
      '[vite-plugin-open-api-server] Cannot override wsHub.addClient: property is non-writable and non-configurable. ' +
        'The core WebSocketHub implementation may have changed. This will be resolved by createMultiSpecWebSocketHub() in Epic 3.',
    );
  }

  const originalAddClient = wsHub.addClient.bind(wsHub);
  wsHub.addClient = (ws: WebSocketClient) => {
    originalAddClient(ws);
    wsHub.sendTo(ws, {
      type: 'connected',
      // biome-ignore lint/suspicious/noExplicitAny: MultiSpecServerEvent connected data extends ServerEvent connected data with specs[]
      data: { serverVersion: PACKAGE_VERSION, specs: specsInfo } as any,
    });
  };

  return wsHub;
}

/**
 * Mount the `/_ws` WebSocket route on the main Hono app.
 *
 * Attempts to dynamically import `@hono/node-ws`. On success, registers
 * the upgrade middleware and returns the `injectWebSocket` function for
 * use during `start()`. On failure (optional peer not installed), mounts
 * a 501 placeholder.
 */
async function mountWebSocketRoute(
  mainApp: Hono,
  wsHub: WebSocketHub,
  logger: Logger,
): Promise<WebSocketRouteResult> {
  // Isolate the dynamic import so only module-not-found errors produce
  // the 501 fallback. Runtime errors from createNodeWebSocket or route
  // registration are real bugs and must propagate.
  let nodeWsModule: typeof import('@hono/node-ws');
  try {
    nodeWsModule = await import('@hono/node-ws');
  } catch (err: unknown) {
    const isModuleNotFound =
      err instanceof Error &&
      ('code' in err
        ? (err as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND'
        : err.message.includes('@hono/node-ws'));

    if (!isModuleNotFound) {
      throw err;
    }

    // @hono/node-ws not available — serve 501 placeholder
    mainApp.get('/_ws', (c) => {
      return c.json(
        {
          message: 'WebSocket endpoint - use ws:// protocol',
          note: 'Install @hono/node-ws to enable WebSocket support',
        },
        501,
      );
    });

    logger.debug?.(
      '[vite-plugin-open-api-server] @hono/node-ws not available, WebSocket upgrade disabled',
    );
    return { injectWebSocket: null };
  }

  // Module loaded — wire up the WebSocket route. Errors here (e.g., from
  // createNodeWebSocket or mainApp.get) are bugs and must propagate.
  const nodeWs = nodeWsModule.createNodeWebSocket({ app: mainApp });

  mainApp.get(
    '/_ws',
    nodeWs.upgradeWebSocket(() => ({
      onOpen(_event, ws) {
        wsHub.addClient(ws);
      },
      onMessage(event, ws) {
        wsHub.handleMessage(ws, event.data);
      },
      onClose(_event, ws) {
        wsHub.removeClient(ws);
      },
    })),
  );

  logger.debug?.('[vite-plugin-open-api-server] WebSocket upgrade enabled at /_ws');
  return { injectWebSocket: nodeWs.injectWebSocket };
}

/**
 * Create the X-Spec-Id dispatch middleware.
 *
 * Uses slugify() to normalize the incoming header so it matches the
 * instanceMap keys produced by deriveSpecId().
 *
 * **Note**: Dispatched requests bypass `mainApp` response middleware
 * because `instance.server.app.fetch()` returns a raw `Response`.
 * Shared response concerns (e.g., CORS) are applied per-instance.
 */
function createDispatchMiddleware(
  instanceMap: Map<string, SpecInstance>,
): (c: Context, next: () => Promise<void>) => Promise<Response | undefined> {
  return async (c: Context, next: () => Promise<void>): Promise<Response | undefined> => {
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
 * **Note**: This function populates the resolved values (id, proxyPath,
 * proxyPathSource, handlersDir, seedsDir) on each `options.specs[i]` object.
 * Since `instances[i].config` is the same object reference, consumers should
 * access resolved values through `instances[i].config` (the authoritative view).
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

    // Populate the resolved values on the shared spec config object.
    // `instance.config` and `options.specs[i]` are the same reference,
    // so these writes are visible through both. This is intentional:
    // downstream consumers (banner, file watcher, plugin.ts) access
    // the final values via `instance.config`.
    instance.config.id = resolvedConfig.id;
    instance.config.proxyPath = resolvedConfig.proxyPath;
    instance.config.proxyPathSource = resolvedConfig.proxyPathSource;
    instance.config.handlersDir = resolvedConfig.handlersDir;
    instance.config.seedsDir = resolvedConfig.seedsDir;

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
  if (instances.length > 1) {
    logger.warn?.(
      "[vite-plugin-open-api-server] Only first spec's internal API mounted on /_api; multi-spec support planned in Epic 3 (Task 3.x).",
    );
    // Add a warning header so DevTools / callers know the data is scoped to one spec
    mainApp.use('/_api/*', async (c, next) => {
      await next();
      c.header('X-Multi-Spec-Warning', `Only showing data for spec "${instances[0].id}"`);
    });
  }
  if (instances.length > 0) {
    const firstInstance = instances[0];
    mountInternalApi(mainApp, {
      store: firstInstance.server.store,
      registry: firstInstance.server.registry,
      simulationManager: firstInstance.server.simulationManager,
      wsHub: firstInstance.server.wsHub,
      timeline: firstInstance.server.getTimeline(),
      timelineLimit: options.timelineLimit,
      clearTimeline: () => firstInstance.server.truncateTimeline(),
      document: firstInstance.server.document,
    });
  }

  // --- Spec metadata (computed early for the connected event) ---
  const specsInfo = instances.map((inst) => inst.info);

  // --- Shared WebSocket Hub (with enhanced connected event) ---
  const wsHub = createOrchestratorHub(specsInfo);

  // --- WebSocket Route (/_ws) ---
  const { injectWebSocket } = await mountWebSocketRoute(mainApp, wsHub, logger);

  // --- X-Spec-Id dispatch middleware ---
  const instanceMap = new Map(instances.map((inst) => [inst.id, inst]));
  mainApp.use('*', createDispatchMiddleware(instanceMap));

  // ========================================================================
  // Lifecycle
  // ========================================================================

  let serverInstance: NodeServer | null = null;
  let boundPort = 0;

  /**
   * Start a Node.js HTTP server and wait for it to bind.
   *
   * @returns The actual bound port (handles ephemeral port 0).
   */
  async function startServerOnPort(
    fetchHandler: Hono['fetch'],
    port: number,
  ): Promise<{ server: NodeServer; actualPort: number }> {
    let createAdaptorServer: typeof import('@hono/node-server').createAdaptorServer;
    try {
      const nodeServer = await import('@hono/node-server');
      createAdaptorServer = nodeServer.createAdaptorServer;
    } catch {
      throw new Error('@hono/node-server is required. Install with: npm install @hono/node-server');
    }

    const server = createAdaptorServer({ fetch: fetchHandler }) as NodeServer;

    // Attach listeners BEFORE calling listen() to avoid a race condition
    // where the 'listening' event fires before the handler is registered.
    const actualPort = await new Promise<number>((resolve, reject) => {
      const onListening = () => {
        server.removeListener('error', onError);
        const addr = server.address();
        resolve(typeof addr === 'object' && addr ? addr.port : port);
      };

      const onError = (err: NodeJS.ErrnoException) => {
        server.removeListener('listening', onListening);
        server.close(() => {});
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`[vite-plugin-open-api-server] Port ${port} is already in use.`));
        } else {
          reject(new Error(`[vite-plugin-open-api-server] Server error: ${err.message}`));
        }
      };

      server.once('listening', onListening);
      server.once('error', onError);
      server.listen(port);
    });

    return { server, actualPort };
  }

  return {
    app: mainApp,
    instances,
    specsInfo,
    wsHub,

    get port(): number {
      return boundPort;
    },

    async start(): Promise<void> {
      if (serverInstance) {
        throw new Error('[vite-plugin-open-api-server] Server already running. Call stop() first.');
      }

      const { server, actualPort } = await startServerOnPort(mainApp.fetch, options.port);
      serverInstance = server;
      boundPort = actualPort;

      // Inject WebSocket support into the Node.js HTTP server.
      // This hooks into the server's 'upgrade' event for WebSocket handshakes.
      if (injectWebSocket) {
        injectWebSocket(serverInstance);
      }

      logger.info(`[vite-plugin-open-api-server] Server started on http://localhost:${actualPort}`);
    },

    async stop(): Promise<void> {
      const server = serverInstance;
      if (server) {
        try {
          // Remove all clients from the hub's tracking set so broadcasts
          // during teardown are no-ops. Does not close WS connections —
          // closeAllConnections() handles the network layer below.
          wsHub.clear();

          // Forcibly destroy all open connections (including WebSocket clients)
          // so server.close() resolves promptly instead of waiting for idle drain.
          if (typeof server.closeAllConnections === 'function') {
            server.closeAllConnections();
          }
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
          boundPort = 0;
        }
      }
    },
  };
}
