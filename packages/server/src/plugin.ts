/**
 * Vite Plugin Implementation
 *
 * What: Main Vite plugin for OpenAPI mock server (multi-spec)
 * How: Uses orchestrator to create N spec instances, configures multi-proxy
 * Why: Integrates multiple OpenAPI mock servers seamlessly into Vite dev workflow
 *
 * @module plugin
 */

import { createRequire } from 'node:module';
import { executeSeeds, type OpenApiServer } from '@websublime/vite-plugin-open-api-core';
import type { Plugin, ViteDevServer } from 'vite';
import { extractBannerInfo, printBanner, printError, printReloadNotification } from './banner.js';
import { loadHandlers } from './handlers.js';
import { createFileWatcher, debounce, type FileWatcher } from './hot-reload.js';
import { configureMultiProxy, DEVTOOLS_PROXY_PATH } from './multi-proxy.js';
import { createOrchestrator, type OrchestratorResult } from './orchestrator.js';
import { loadSeeds } from './seeds.js';
import { type OpenApiServerOptions, resolveOptions } from './types.js';

/**
 * Virtual module ID for the DevTools tab registration script.
 *
 * This script is served as a Vite module (not inline HTML) so that bare
 * import specifiers like `@vue/devtools-api` are resolved through Vite's
 * module pipeline. Inline `<script type="module">` blocks in HTML are
 * executed directly by the browser, which cannot resolve bare specifiers.
 */
const VIRTUAL_DEVTOOLS_TAB_ID = 'virtual:open-api-devtools-tab';
const RESOLVED_VIRTUAL_DEVTOOLS_TAB_ID = `\0${VIRTUAL_DEVTOOLS_TAB_ID}`;

/**
 * Create the OpenAPI Server Vite plugin
 *
 * This plugin starts mock servers based on OpenAPI specifications
 * and configures Vite to proxy API requests to them. Supports
 * multiple specs via the orchestrator pattern.
 *
 * @example
 * ```typescript
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import vue from '@vitejs/plugin-vue';
 * import { openApiServer } from '@websublime/vite-plugin-open-api-server';
 *
 * export default defineConfig({
 *   plugins: [
 *     vue(),
 *     openApiServer({
 *       specs: [
 *         { spec: './openapi/petstore.yaml', proxyPath: '/api/pets' },
 *         { spec: './openapi/inventory.yaml', proxyPath: '/api/inventory' },
 *       ],
 *       port: 4000,
 *     }),
 *   ],
 * });
 * ```
 *
 * @param options - Plugin configuration options
 * @returns Vite plugin
 */
export function openApiServer(options: OpenApiServerOptions): Plugin {
  const resolvedOptions = resolveOptions(options);

  let orchestrator: OrchestratorResult | null = null;
  let fileWatchers: FileWatcher[] = [];
  let cwd: string = process.cwd();

  return {
    name: 'vite-plugin-open-api-server',
    apply: 'serve',

    /**
     * Ensure @vue/devtools-api is available for the DevTools tab module
     *
     * The virtual module imports from '@vue/devtools-api', which Vite needs
     * to pre-bundle so it can be resolved at runtime in the browser, even
     * though the host app may not have it as a direct dependency.
     */
    config() {
      if (!resolvedOptions.devtools || !resolvedOptions.enabled) {
        return;
      }

      // Only add to optimizeDeps if the package is actually resolvable
      // to avoid Vite warnings when the consumer hasn't installed it
      const require = createRequire(import.meta.url);
      try {
        require.resolve('@vue/devtools-api');
      } catch {
        return;
      }

      return {
        optimizeDeps: {
          include: ['@vue/devtools-api'],
        },
      };
    },

    /**
     * Resolve the virtual module for DevTools tab registration
     */
    resolveId(id: string) {
      if (id === VIRTUAL_DEVTOOLS_TAB_ID) {
        return RESOLVED_VIRTUAL_DEVTOOLS_TAB_ID;
      }
    },

    /**
     * Load the virtual module that registers the custom Vue DevTools tab
     *
     * This code is served as a proper Vite module, allowing bare import
     * specifiers to be resolved through Vite's dependency pre-bundling.
     */
    load(id: string) {
      if (id === RESOLVED_VIRTUAL_DEVTOOLS_TAB_ID) {
        return `
import { addCustomTab } from '@vue/devtools-api';

try {
  // Route through Vite's proxy so it works in all environments
  const iframeSrc = window.location.origin + '${DEVTOOLS_PROXY_PATH}/';

  addCustomTab({
    name: 'vite-plugin-open-api-server',
    title: 'OpenAPI Server',
    icon: 'https://api.iconify.design/carbon:api-1.svg?width=24&height=24&color=%2394a3b8',
    view: {
      type: 'iframe',
      src: iframeSrc,
    },
    category: 'app',
  });
} catch (e) {
  // @vue/devtools-api not available - expected when the package is not installed
}
`;
      }
    },

    /**
     * Configure the Vite dev server
     *
     * This hook is called when the dev server is created.
     * We use it to:
     * 1. Create and start the multi-spec orchestrator
     * 2. Configure Vite's multi-proxy for all specs
     * 3. Set up per-spec file watchers for hot reload
     * 4. Print startup banner
     */
    async configureServer(viteServer: ViteDevServer): Promise<void> {
      cwd = viteServer.config.root;

      if (!resolvedOptions.enabled) {
        return;
      }

      try {
        // Create multi-spec orchestrator (processes all specs, loads handlers/seeds)
        orchestrator = await createOrchestrator(resolvedOptions, viteServer, cwd);

        // Start the shared HTTP server
        await orchestrator.start();

        // Configure Vite proxies for all specs
        configureMultiProxy(viteServer, orchestrator.instances, orchestrator.port);

        // Set up per-spec file watchers for hot reload
        // TODO: Replace with createPerSpecFileWatchers() in Epic 2 (Task 2.1)
        fileWatchers = await setupPerSpecFileWatching(orchestrator, viteServer, cwd);

        // Print startup banner (v0.x single-spec banner, shows first spec only)
        // TODO: Replace with printMultiSpecBanner() in Epic 5 (Task 5.1)
        if (!resolvedOptions.silent && orchestrator.instances.length > 0) {
          const firstInstance = orchestrator.instances[0];
          const bannerInfo = extractBannerInfo(
            firstInstance.server.registry,
            {
              info: {
                title: firstInstance.server.document.info?.title ?? 'OpenAPI Server',
                version: firstInstance.server.document.info?.version ?? '1.0.0',
              },
            },
            // Handler/seed counts are internal to orchestrator processSpec.
            // Use info from SpecInfo for now; multi-spec banner (Epic 5) will
            // display proper per-spec counts.
            firstInstance.info.endpointCount,
            firstInstance.info.schemaCount,
            resolvedOptions,
          );
          printBanner(bannerInfo, resolvedOptions);
        }
      } catch (error) {
        await teardownPartialInit();
        printError('Failed to start OpenAPI mock server', error, resolvedOptions);
        throw error;
      }
    },

    /**
     * Inject Vue DevTools custom tab registration script
     *
     * When devtools is enabled, this injects a script tag that loads the
     * virtual module for custom tab registration. Using a virtual module
     * (instead of an inline script) ensures that bare import specifiers
     * like `@vue/devtools-api` are resolved through Vite's module pipeline.
     */
    transformIndexHtml() {
      if (!resolvedOptions.devtools || !resolvedOptions.enabled) {
        return;
      }

      return [
        {
          tag: 'script',
          attrs: { type: 'module', src: `/@id/${VIRTUAL_DEVTOOLS_TAB_ID}` },
          injectTo: 'head' as const,
        },
      ];
    },

    /**
     * Clean up when Vite server closes
     *
     * NOTE: closeBundle() is called by Vite when the dev server shuts down
     * (e.g., Ctrl+C). This is the same lifecycle hook used in v0.x.
     * While configureServer's viteServer.httpServer?.on('close', ...) is
     * an alternative, closeBundle() is more reliable across Vite versions
     * and is the established pattern in this codebase.
     */
    async closeBundle(): Promise<void> {
      // Close all per-spec file watchers — use allSettled so one failure
      // doesn't prevent the rest from being cleaned up
      await Promise.allSettled(fileWatchers.map((w) => w.close()));
      fileWatchers = [];

      // Stop the orchestrator (shared HTTP server)
      // Wrap in try/catch so a stop() rejection doesn't propagate —
      // matches the teardownPartialInit pattern.
      if (orchestrator) {
        try {
          await orchestrator.stop();
        } catch {
          // Swallow stop errors — nothing actionable at shutdown
        }
        orchestrator = null;
      }
    },
  };

  /**
   * Clean up partially-initialised resources when configureServer fails.
   *
   * Closes any file watchers that were created and stops the orchestrator
   * HTTP server if it was started. Swallows errors so the original failure
   * propagates unchanged.
   */
  async function teardownPartialInit(): Promise<void> {
    await Promise.allSettled(fileWatchers.map((w) => w.close()));
    fileWatchers = [];

    if (orchestrator) {
      try {
        await orchestrator.stop();
      } catch {
        // Swallow stop errors — the original error is more important
      }
      orchestrator = null;
    }
  }

  /**
   * Set up per-spec file watchers for hot reload
   *
   * Creates one FileWatcher per spec instance, each watching that spec's
   * handlers and seeds directories. Reload callbacks are scoped to the
   * individual spec — changing a handler in spec A does not affect spec B.
   *
   * TODO: This will be replaced by createPerSpecFileWatchers() in Epic 2 (Task 2.1)
   * which will add proper reload-spec isolation and WebSocket notifications.
   */
  async function setupPerSpecFileWatching(
    orch: OrchestratorResult,
    viteServer: ViteDevServer,
    projectCwd: string,
  ): Promise<FileWatcher[]> {
    const watchers: FileWatcher[] = [];

    try {
      for (const instance of orch.instances) {
        const specServer = instance.server;
        const specConfig = instance.config;

        // Create debounced reload functions scoped to this spec
        const debouncedHandlerReload = debounce(
          () => reloadSpecHandlers(specServer, specConfig.handlersDir, viteServer, projectCwd),
          100,
        );
        const debouncedSeedReload = debounce(
          () => reloadSpecSeeds(specServer, specConfig.seedsDir, viteServer, projectCwd),
          100,
        );

        const watcher = await createFileWatcher({
          handlersDir: specConfig.handlersDir,
          seedsDir: specConfig.seedsDir,
          cwd: projectCwd,
          onHandlerChange: debouncedHandlerReload,
          onSeedChange: debouncedSeedReload,
        });

        watchers.push(watcher);
      }
    } catch (error) {
      // Clean up already-created watchers before re-throwing
      await Promise.allSettled(watchers.map((w) => w.close()));
      throw error;
    }

    return watchers;
  }

  /**
   * Reload handlers for a single spec instance
   */
  async function reloadSpecHandlers(
    server: OpenApiServer,
    handlersDir: string,
    viteServer: ViteDevServer,
    projectCwd: string,
  ): Promise<void> {
    try {
      const handlersResult = await loadHandlers(handlersDir, viteServer, projectCwd);
      server.updateHandlers(handlersResult.handlers);

      server.wsHub.broadcast({
        type: 'handlers:updated',
        data: { count: handlersResult.handlers.size },
      });

      printReloadNotification('handlers', handlersResult.handlers.size, resolvedOptions);
    } catch (error) {
      printError('Failed to reload handlers', error, resolvedOptions);
    }
  }

  /**
   * Reload seeds for a single spec instance
   *
   * Note: This operation is not fully atomic - there's a brief window between
   * clearing the store and repopulating it where requests may see empty data.
   * For development tooling, this tradeoff is acceptable.
   */
  async function reloadSpecSeeds(
    server: OpenApiServer,
    seedsDir: string,
    viteServer: ViteDevServer,
    projectCwd: string,
  ): Promise<void> {
    try {
      // Load seeds first (before clearing) to minimize the window where store is empty
      const seedsResult = await loadSeeds(seedsDir, viteServer, projectCwd);

      server.store.clearAll();
      if (seedsResult.seeds.size > 0) {
        await executeSeeds(seedsResult.seeds, server.store, server.document);
      }

      server.wsHub.broadcast({
        type: 'seeds:updated',
        data: { count: seedsResult.seeds.size },
      });

      printReloadNotification('seeds', seedsResult.seeds.size, resolvedOptions);
    } catch (error) {
      printError('Failed to reload seeds', error, resolvedOptions);
    }
  }
}
