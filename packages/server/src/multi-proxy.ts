/**
 * Multi-Path Proxy Configuration
 *
 * What: Configures Vite proxy for multiple OpenAPI spec instances
 * How: Generates one proxy entry per spec with path rewriting and X-Spec-Id header
 * Why: Enables each spec's API requests to be routed through Vite to the shared server
 *
 * @module multi-proxy
 */

import type { ViteDevServer } from 'vite';

import type { SpecInstance } from './orchestrator.js';

/**
 * Configure Vite proxy for multiple spec instances.
 *
 * Each spec gets its own proxy entry that:
 * 1. Matches requests by proxy path prefix
 * 2. Rewrites the path to strip the prefix
 * 3. Adds X-Spec-Id header for routing
 * 4. Forwards to the shared server port
 *
 * Shared service proxies (/_devtools, /_api, /_ws) are added separately
 * via {@link configureSharedServiceProxies}.
 *
 * @param vite - Vite dev server instance
 * @param instances - Resolved spec instances from the orchestrator
 * @param port - Shared server port
 */
export function configureMultiProxy(
  vite: ViteDevServer,
  instances: SpecInstance[],
  port: number,
): void {
  if (!vite.config.server) {
    return;
  }

  const proxyConfig = vite.config.server.proxy ?? {};

  for (const instance of instances) {
    const prefix = instance.config.proxyPath;

    proxyConfig[prefix] = {
      target: `http://localhost:${port}`,
      changeOrigin: true,
      rewrite: (path: string) => (path.startsWith(prefix) ? path.slice(prefix.length) : path),
      headers: { 'x-spec-id': instance.id },
    };
  }

  vite.config.server.proxy = proxyConfig;
}

/**
 * Configure shared service proxy entries.
 *
 * These proxies are spec-agnostic and forward requests to the shared
 * server without any path rewriting or X-Spec-Id header:
 * - `/_devtools` — DevTools SPA iframe
 * - `/_api` — Internal API endpoints
 * - `/_ws` — WebSocket connection (with ws upgrade support)
 *
 * @param vite - Vite dev server instance
 * @param port - Shared server port
 */
export function configureSharedServiceProxies(vite: ViteDevServer, port: number): void {
  if (!vite.config.server) {
    return;
  }

  const proxyConfig = vite.config.server.proxy ?? {};

  proxyConfig['/_devtools'] = {
    target: `http://localhost:${port}`,
    changeOrigin: true,
  };

  proxyConfig['/_api'] = {
    target: `http://localhost:${port}`,
    changeOrigin: true,
  };

  proxyConfig['/_ws'] = {
    target: `ws://localhost:${port}`,
    changeOrigin: true,
    ws: true,
  };

  vite.config.server.proxy = proxyConfig;
}
