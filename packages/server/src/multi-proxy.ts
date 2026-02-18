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
        if (!path.startsWith(prefix)) return path;
        return path.slice(prefix.length) || '/';
      },
      headers: { 'x-spec-id': instance.id },
    };
  }

  // ── Shared service proxies ─────────────────────────────────────────────
  // Placed after per-spec entries so reserved paths always win if a spec's
  // proxyPath were to collide with /_devtools, /_api, or /_ws.
  // In practice validateUniqueProxyPaths() guards against such collisions
  // before this function is reached.

  proxyConfig['/_devtools'] = {
    target: httpTarget,
    changeOrigin: true,
  };

  proxyConfig['/_api'] = {
    target: httpTarget,
    changeOrigin: true,
  };

  proxyConfig['/_ws'] = {
    target: `ws://localhost:${port}`,
    changeOrigin: true,
    ws: true,
  };
}
