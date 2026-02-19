/**
 * Multi-Path Proxy Configuration
 *
 * What: Configures Vite proxy for multiple OpenAPI spec instances
 * How: Generates one proxy entry per spec with path rewriting and X-Spec-Id header,
 *      plus shared service proxies for DevTools, Internal API, and WebSocket
 * Why: Enables each spec's API requests to be routed through Vite to the shared server
 *
 * @module multi-proxy
 */

import type { ProxyOptions, ViteDevServer } from 'vite';

import type { SpecInstance } from './orchestrator.js';

/**
 * Shared service proxy path prefixes.
 *
 * These constants are the single source of truth for the reserved proxy paths
 * used by the DevTools iframe, internal API, and WebSocket connections.
 * Both `configureMultiProxy()` and the virtual DevTools tab module in
 * `plugin.ts` reference these to prevent divergence.
 */
export const DEVTOOLS_PROXY_PATH = '/_devtools';
export const API_PROXY_PATH = '/_api';
export const WS_PROXY_PATH = '/_ws';

/**
 * Ensure `vite.config.server.proxy` exists and return a mutable reference.
 *
 * Returns `null` when `vite.config.server` is falsy, which can happen if
 * the function is called outside the normal Vite plugin lifecycle (e.g.,
 * a custom integration). Callers should early-return on `null`.
 *
 * @internal
 */
function getProxyConfig(vite: ViteDevServer): Record<string, ProxyOptions> | null {
  if (!vite.config.server) {
    return null;
  }

  vite.config.server.proxy ??= {};
  return vite.config.server.proxy as Record<string, ProxyOptions>;
}

/**
 * Configure Vite proxy for multiple spec instances and shared services.
 *
 * Generates:
 * 1. **Per-spec proxy entries** — one per spec, with path rewriting (prefix
 *    stripping) and an `X-Spec-Id` header so the shared Hono server can
 *    route to the correct spec instance.
 * 2. **Shared service proxies** — spec-agnostic entries for `/_devtools`,
 *    `/_api`, and `/_ws` that forward to the same server without path
 *    rewriting or spec headers.
 *
 * Uses `startsWith`/`slice` for path rewriting instead of the regex approach
 * described in the tech spec (Section 5.7). Literal prefix matching is safer
 * because it correctly handles regex metacharacters in proxy paths (e.g.,
 * `/api.v3` matches literally, not as `/api<any>v3`).
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
  const proxyConfig = getProxyConfig(vite);
  if (!proxyConfig) {
    return;
  }

  const httpTarget = `http://localhost:${port}`;

  // ── Per-spec proxy entries ──────────────────────────────────────────────

  for (const instance of instances) {
    const prefix = instance.config.proxyPath;

    proxyConfig[prefix] = {
      target: httpTarget,
      changeOrigin: true,
      rewrite: (path: string) => {
        // Guard against prefix collisions: only rewrite when the path equals
        // the prefix exactly or continues with a '/' or '?' segment boundary.
        // e.g. prefix '/api' must NOT rewrite '/api2/users'.
        if (path !== prefix && !path.startsWith(`${prefix}/`) && !path.startsWith(`${prefix}?`))
          return path;
        const rest = path.slice(prefix.length);
        if (rest === '' || rest === '/') return '/';
        if (rest.startsWith('?')) return `/${rest}`;
        return rest;
      },
      headers: { 'x-spec-id': instance.id },
    };
  }

  // ── Shared service proxies ─────────────────────────────────────────────
  // Placed after per-spec entries so they overwrite (last-writer-wins on
  // object keys) any per-spec entry that happens to use a reserved path.
  // In practice validateUniqueProxyPaths() guards against such collisions
  // before this function is reached.

  proxyConfig[DEVTOOLS_PROXY_PATH] = {
    target: httpTarget,
    changeOrigin: true,
  };

  proxyConfig[API_PROXY_PATH] = {
    target: httpTarget,
    changeOrigin: true,
  };

  proxyConfig[WS_PROXY_PATH] = {
    target: `ws://localhost:${port}`,
    changeOrigin: true,
    ws: true,
  };
}
