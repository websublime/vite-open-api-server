/**
 * Vite Plugin Implementation
 *
 * What: Main Vite plugin for OpenAPI mock server
 * How: Uses configureServer hook to start mock server and configure proxy
 * Why: Integrates OpenAPI mock server seamlessly into Vite dev workflow
 *
 * @module plugin
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createOpenApiServer,
  executeSeeds,
  type OpenApiServer,
} from '@websublime/vite-plugin-open-api-core';
import type { Plugin, ViteDevServer } from 'vite';
import { extractBannerInfo, printBanner, printError, printReloadNotification } from './banner.js';
import { loadHandlers } from './handlers.js';
import { createFileWatcher, debounce, type FileWatcher } from './hot-reload.js';
import { loadSeeds } from './seeds.js';
import { type OpenApiServerOptions, resolveOptions } from './types.js';

/**
 * Create the OpenAPI Server Vite plugin
 *
 * This plugin starts a mock server based on an OpenAPI specification
 * and configures Vite to proxy API requests to it.
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
 *       spec: './openapi/petstore.yaml',
 *       port: 4000,
 *       proxyPath: '/api',
 *       handlersDir: './mocks/handlers',
 *       seedsDir: './mocks/seeds',
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

  // Server instance (created in configureServer)
  let server: OpenApiServer | null = null;

  // Vite dev server reference (needed for ssrLoadModule)
  let vite: ViteDevServer | null = null;

  // File watcher for hot reload
  let fileWatcher: FileWatcher | null = null;

  // Current working directory (set in configureServer)
  let cwd: string = process.cwd();

  return {
    name: 'vite-plugin-open-api-server',

    // Only active in dev mode
    apply: 'serve',

    /**
     * Configure the Vite dev server
     *
     * This hook is called when the dev server is created.
     * We use it to:
     * 1. Start the OpenAPI mock server
     * 2. Configure the Vite proxy to forward API requests
     * 3. Set up file watching for hot reload
     */
    async configureServer(viteServer: ViteDevServer): Promise<void> {
      vite = viteServer;
      cwd = viteServer.config.root;

      // Check if plugin is disabled
      if (!resolvedOptions.enabled) {
        return;
      }

      try {
        // Load handlers from handlers directory (using Vite's ssrLoadModule for TS support)
        const handlersResult = await loadHandlers(resolvedOptions.handlersDir, viteServer, cwd);

        // Load seeds from seeds directory (using Vite's ssrLoadModule for TS support)
        const seedsResult = await loadSeeds(resolvedOptions.seedsDir, viteServer, cwd);

        // Resolve DevTools SPA directory (shipped inside this package's dist/)
        let devtoolsSpaDir: string | undefined;
        if (resolvedOptions.devtools) {
          const pluginDir = dirname(fileURLToPath(import.meta.url));
          const spaDir = join(pluginDir, 'devtools-spa');
          if (existsSync(spaDir)) {
            devtoolsSpaDir = spaDir;
          } else {
            resolvedOptions.logger?.warn?.(
              '[vite-plugin-open-api-server] DevTools SPA not found at',
              spaDir,
              '- serving placeholder. Run "pnpm build" to include the SPA.',
            );
          }
        }

        // Create the OpenAPI mock server
        server = await createOpenApiServer({
          spec: resolvedOptions.spec,
          port: resolvedOptions.port,
          idFields: resolvedOptions.idFields,
          handlers: handlersResult.handlers,
          // Seeds are populated via executeSeeds, not directly
          seeds: new Map(),
          timelineLimit: resolvedOptions.timelineLimit,
          devtools: resolvedOptions.devtools,
          devtoolsSpaDir,
          cors: resolvedOptions.cors,
          corsOrigin: resolvedOptions.corsOrigin,
          logger: resolvedOptions.logger,
        });

        // Execute seeds to populate the store
        if (seedsResult.seeds.size > 0) {
          await executeSeeds(seedsResult.seeds, server.store, server.document);
        }

        // Start the mock server
        await server.start();

        // Configure Vite proxy
        configureProxy(viteServer, resolvedOptions.proxyPath, resolvedOptions.port);

        // Print startup banner
        const bannerInfo = extractBannerInfo(
          server.registry,
          {
            info: {
              title: server.document.info?.title ?? 'OpenAPI Server',
              version: server.document.info?.version ?? '1.0.0',
            },
          },
          handlersResult.handlers.size,
          seedsResult.seeds.size,
          resolvedOptions,
        );
        printBanner(bannerInfo, resolvedOptions);

        // Set up file watching for hot reload
        await setupFileWatching();
      } catch (error) {
        printError('Failed to start OpenAPI mock server', error, resolvedOptions);
        throw error;
      }
    },

    /**
     * Clean up when Vite server closes
     */
    async closeBundle(): Promise<void> {
      await cleanup();
    },

    /**
     * Inject Vue DevTools custom tab registration script
     *
     * When devtools is enabled, this injects a small script into the host app's
     * HTML that registers a custom "OpenAPI Server" tab in Vue DevTools.
     * The tab embeds the DevTools SPA via iframe.
     */
    transformIndexHtml(html: string) {
      if (!resolvedOptions.devtools || !resolvedOptions.enabled) {
        return html;
      }

      const port = resolvedOptions.port;
      const devtoolsIcon =
        'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%234f46e5%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z%22/%3E%3Cpolyline points=%223.29 7 12 12 20.71 7%22/%3E%3Cline x1=%2212%22 y1=%2222%22 x2=%2212%22 y2=%2212%22/%3E%3C/svg%3E';

      const devtoolsScript = `
<script type="module">
try {
  const { addCustomTab } = await import('@vue/devtools-api');
  addCustomTab({
    name: 'vite-plugin-open-api-server',
    title: 'OpenAPI Server',
    icon: '${devtoolsIcon}',
    view: {
      type: 'iframe',
      src: window.location.protocol + '//' + window.location.hostname + ':${port}/_devtools/',
    },
    category: 'app',
  });
} catch (e) {
  // Vue DevTools not available - this is expected when the extension is not installed
}
</script>`;

      return html.replace('</head>', `${devtoolsScript}\n</head>`);
    },
  };

  /**
   * Configure Vite proxy for API requests
   *
   * @param vite - Vite dev server
   * @param proxyPath - Base path to proxy
   * @param port - Mock server port
   */
  function configureProxy(vite: ViteDevServer, proxyPath: string, port: number): void {
    // Ensure server config exists (create mutable copy if needed)
    const serverConfig = vite.config.server ?? {};
    const proxyConfig = serverConfig.proxy ?? {};

    // Escape special regex characters in proxy path
    const escapedPath = proxyPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Add proxy configuration for API requests
    proxyConfig[proxyPath] = {
      target: `http://localhost:${port}`,
      changeOrigin: true,
      // Remove the proxy path prefix when forwarding
      rewrite: (path: string) => path.replace(new RegExp(`^${escapedPath}`), ''),
    };

    // Proxy internal routes so they work through Vite's dev server port
    proxyConfig['/_devtools'] = {
      target: `http://localhost:${port}`,
      changeOrigin: true,
    };

    proxyConfig['/_api'] = {
      target: `http://localhost:${port}`,
      changeOrigin: true,
    };

    proxyConfig['/_ws'] = {
      target: `http://localhost:${port}`,
      changeOrigin: true,
      ws: true,
    };

    // Update the proxy config (Vite's proxy is mutable)
    if (vite.config.server) {
      vite.config.server.proxy = proxyConfig;
    }
  }

  /**
   * Set up file watching for hot reload
   */
  async function setupFileWatching(): Promise<void> {
    if (!server || !vite) return;

    // Debounce reload functions to prevent rapid-fire reloads
    const debouncedHandlerReload = debounce(reloadHandlers, 100);
    const debouncedSeedReload = debounce(reloadSeeds, 100);

    fileWatcher = await createFileWatcher({
      handlersDir: resolvedOptions.handlersDir,
      seedsDir: resolvedOptions.seedsDir,
      cwd,
      onHandlerChange: debouncedHandlerReload,
      onSeedChange: debouncedSeedReload,
    });
  }

  /**
   * Reload handlers when files change
   */
  async function reloadHandlers(): Promise<void> {
    if (!server || !vite) return;

    try {
      const handlersResult = await loadHandlers(resolvedOptions.handlersDir, vite, cwd);
      server.updateHandlers(handlersResult.handlers);

      // Notify via WebSocket
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
   * Reload seeds when files change
   *
   * Note: This operation is not fully atomic - there's a brief window between
   * clearing the store and repopulating it where requests may see empty data.
   * For development tooling, this tradeoff is acceptable.
   */
  async function reloadSeeds(): Promise<void> {
    if (!server || !vite) return;

    try {
      // Load seeds first (before clearing) to minimize the window where store is empty
      const seedsResult = await loadSeeds(resolvedOptions.seedsDir, vite, cwd);

      // Only clear and repopulate if we successfully loaded seeds
      // This prevents clearing the store on load errors
      if (seedsResult.seeds.size > 0) {
        // Clear and immediately repopulate - minimizes empty window
        server.store.clearAll();
        await executeSeeds(seedsResult.seeds, server.store, server.document);
      } else {
        // User removed all seed files - clear the store
        server.store.clearAll();
      }

      // Notify via WebSocket
      server.wsHub.broadcast({
        type: 'seeds:updated',
        data: { count: seedsResult.seeds.size },
      });

      printReloadNotification('seeds', seedsResult.seeds.size, resolvedOptions);
    } catch (error) {
      printError('Failed to reload seeds', error, resolvedOptions);
    }
  }

  /**
   * Clean up resources
   */
  async function cleanup(): Promise<void> {
    // Close file watcher
    if (fileWatcher) {
      await fileWatcher.close();
      fileWatcher = null;
    }

    // Stop mock server
    if (server) {
      await server.stop();
      server = null;
    }

    vite = null;
  }
}
