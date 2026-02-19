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
import type { Plugin, ViteDevServer } from 'vite';
import { extractBannerInfo, printBanner, printError } from './banner.js';
import { createPerSpecFileWatchers, type FileWatcher } from './hot-reload.js';
import { configureMultiProxy, DEVTOOLS_PROXY_PATH } from './multi-proxy.js';
import { createOrchestrator, type OrchestratorResult } from './orchestrator.js';
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
        fileWatchers = await createPerSpecFileWatchers(
          orchestrator.instances,
          viteServer,
          cwd,
          resolvedOptions,
        );

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
            // Handler/seed counts are not tracked per-instance yet.
            // Multi-spec banner (Epic 5, Task 5.1) will display proper per-spec counts.
            0,
            0,
            resolvedOptions,
          );
          printBanner(bannerInfo, resolvedOptions);
        }
      } catch (error) {
        await teardown();
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
      await teardown();
    },
  };

  /**
   * Tear down all plugin resources: close file watchers and stop the orchestrator.
   *
   * Shared by `closeBundle` (normal shutdown) and the error path in
   * `configureServer` (partial-init cleanup). Uses `Promise.allSettled`
   * and try/catch so failures in one resource do not prevent cleanup
   * of the others.
   */
  async function teardown(): Promise<void> {
    await Promise.allSettled(fileWatchers.map((w) => w.close()));
    fileWatchers = [];

    if (orchestrator) {
      try {
        await orchestrator.stop();
      } catch {
        // Swallow stop errors — nothing actionable at shutdown
      }
      orchestrator = null;
    }
  }
}
