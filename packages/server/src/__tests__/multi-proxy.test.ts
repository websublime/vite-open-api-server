/**
 * Multi-Proxy Configuration Tests
 *
 * What: Unit tests for configureMultiProxy()
 * How: Tests proxy entry generation with correct targets, path rewriting, headers,
 *      and shared service proxies
 * Why: Ensures Vite proxy configuration is correctly generated for multi-spec routing
 */

import type { ProxyOptions } from 'vite';
import { describe, expect, it } from 'vitest';

import { configureMultiProxy } from '../multi-proxy.js';
import type { SpecInstance } from '../orchestrator.js';
import type { ResolvedSpecConfig } from '../types.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create a minimal mock ViteDevServer with a mutable proxy config.
 *
 * Only the `config.server.proxy` path is needed by the proxy function.
 *
 * @param options.proxy - Pre-existing proxy entries (defaults to empty object)
 * @param options.omitProxy - If true, omit the `proxy` key entirely to test
 *   the `??=` fallback branch that initialises proxy from scratch
 */
function createMockVite(options?: { proxy?: Record<string, ProxyOptions>; omitProxy?: boolean }) {
  const server = options?.omitProxy ? {} : { proxy: options?.proxy ?? {} };
  return {
    config: { server },
  } as Parameters<typeof configureMultiProxy>[0];
}

/**
 * Return `vite.config.server.proxy` with a narrowed type.
 *
 * Every test that calls `configureMultiProxy` first ensures proxy is defined,
 * so the non-null assertion is safe here and silences the TS2532 diagnostic
 * that otherwise fires on every `vite.config.server.proxy[…]` access.
 */
function proxyOf(vite: Parameters<typeof configureMultiProxy>[0]): Record<string, ProxyOptions> {
  // biome-ignore lint/style/noNonNullAssertion: test helper — proxy is always set after configureMultiProxy()
  return vite.config.server.proxy! as Record<string, ProxyOptions>;
}

/**
 * Create a minimal SpecInstance for proxy testing.
 *
 * Only `id` and `config.proxyPath` are used by configureMultiProxy().
 */
function createSpecInstance(id: string, proxyPath: string): SpecInstance {
  return {
    id,
    config: { proxyPath } as ResolvedSpecConfig,
    info: {} as unknown as SpecInstance['info'],
    server: {} as unknown as SpecInstance['server'],
  };
}

// =============================================================================
// configureMultiProxy() — per-spec proxy entries
// =============================================================================

describe('configureMultiProxy', () => {
  // ---------------------------------------------------------------------------
  // Early-return guard
  // ---------------------------------------------------------------------------

  describe('early-return when vite.config.server is falsy', () => {
    it('should not throw when vite.config.server is undefined', () => {
      const vite = { config: {} } as Parameters<typeof configureMultiProxy>[0];
      const instances = [createSpecInstance('petstore', '/api/v3')];

      expect(() => configureMultiProxy(vite, instances, 4000)).not.toThrow();
      expect(vite.config.server).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Proxy initialisation from scratch
  // ---------------------------------------------------------------------------

  describe('proxy initialisation when vite.config.server.proxy is undefined', () => {
    it('should initialise proxy config from scratch for per-spec entries', () => {
      const vite = createMockVite({ omitProxy: true });
      const instances = [createSpecInstance('petstore', '/api/v3')];

      configureMultiProxy(vite, instances, 4000);

      expect(vite.config.server.proxy).toBeDefined();
      const proxy = proxyOf(vite);
      expect(proxy['/api/v3']).toBeDefined();
    });

    it('should initialise proxy config from scratch for shared service entries', () => {
      const vite = createMockVite({ omitProxy: true });

      configureMultiProxy(vite, [], 4000);

      expect(vite.config.server.proxy).toBeDefined();
      const proxy = proxyOf(vite);
      expect(proxy['/_devtools']).toBeDefined();
      expect(proxy['/_api']).toBeDefined();
      expect(proxy['/_ws']).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Basic proxy entry generation
  // ---------------------------------------------------------------------------

  describe('proxy entry generation', () => {
    it('should create one proxy entry per spec instance', () => {
      const vite = createMockVite();
      const instances = [
        createSpecInstance('petstore', '/api/v3'),
        createSpecInstance('inventory', '/inventory/v1'),
      ];

      configureMultiProxy(vite, instances, 4000);

      const proxy = proxyOf(vite);
      expect(proxy['/api/v3']).toBeDefined();
      expect(proxy['/inventory/v1']).toBeDefined();
    });

    it('should set correct target for each proxy entry', () => {
      const vite = createMockVite();
      const instances = [createSpecInstance('petstore', '/api/v3')];

      configureMultiProxy(vite, instances, 5000);

      const entry = proxyOf(vite)['/api/v3'];
      expect(entry.target).toBe('http://localhost:5000');
    });

    it('should set changeOrigin to true', () => {
      const vite = createMockVite();
      const instances = [createSpecInstance('petstore', '/api/v3')];

      configureMultiProxy(vite, instances, 4000);

      const entry = proxyOf(vite)['/api/v3'];
      expect(entry.changeOrigin).toBe(true);
    });

    it('should handle empty instances array gracefully', () => {
      const vite = createMockVite();

      configureMultiProxy(vite, [], 4000);

      const proxy = proxyOf(vite);
      // Only the 3 shared service entries, no per-spec entries
      const perSpecKeys = Object.keys(proxy).filter((k) => !k.startsWith('/_'));
      expect(perSpecKeys).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // X-Spec-Id header
  // ---------------------------------------------------------------------------

  describe('X-Spec-Id header', () => {
    it('should set x-spec-id header to the spec instance id', () => {
      const vite = createMockVite();
      const instances = [createSpecInstance('petstore', '/api/v3')];

      configureMultiProxy(vite, instances, 4000);

      const entry = proxyOf(vite)['/api/v3'];
      expect(entry.headers).toEqual({ 'x-spec-id': 'petstore' });
    });

    it('should set distinct x-spec-id for each spec', () => {
      const vite = createMockVite();
      const instances = [
        createSpecInstance('petstore', '/api/v3'),
        createSpecInstance('billing', '/billing/v2'),
      ];

      configureMultiProxy(vite, instances, 4000);

      const proxy = proxyOf(vite);
      expect((proxy['/api/v3'] as ProxyOptions).headers).toEqual({ 'x-spec-id': 'petstore' });
      expect((proxy['/billing/v2'] as ProxyOptions).headers).toEqual({ 'x-spec-id': 'billing' });
    });
  });

  // ---------------------------------------------------------------------------
  // Path rewriting
  // ---------------------------------------------------------------------------

  describe('path rewriting', () => {
    it('should strip the proxy path prefix from the request path', () => {
      const vite = createMockVite();
      const instances = [createSpecInstance('petstore', '/api/v3')];

      configureMultiProxy(vite, instances, 4000);

      const entry = proxyOf(vite)['/api/v3'];
      const rewrite = entry.rewrite;
      expect(rewrite?.('/api/v3/pets')).toBe('/pets');
      expect(rewrite?.('/api/v3/pets/123')).toBe('/pets/123');
    });

    it('should rewrite exact-prefix path to root instead of empty string', () => {
      const vite = createMockVite();
      const instances = [createSpecInstance('petstore', '/api/v3')];

      configureMultiProxy(vite, instances, 4000);

      const entry = proxyOf(vite)['/api/v3'];
      const rewrite = entry.rewrite;
      // Exact prefix rewrites to '/' (not '') to avoid http-proxy edge cases
      expect(rewrite?.('/api/v3')).toBe('/');
    });

    it('should rewrite prefix with trailing slash to root', () => {
      const vite = createMockVite();
      const instances = [createSpecInstance('petstore', '/api/v3')];

      configureMultiProxy(vite, instances, 4000);

      const entry = proxyOf(vite)['/api/v3'];
      const rewrite = entry.rewrite;
      expect(rewrite?.('/api/v3/')).toBe('/');
    });

    it('should only strip the prefix, not occurrences elsewhere in the path', () => {
      const vite = createMockVite();
      const instances = [createSpecInstance('test', '/api')];

      configureMultiProxy(vite, instances, 4000);

      const entry = proxyOf(vite)['/api'];
      const rewrite = entry.rewrite;
      // Only first occurrence (prefix) is stripped
      expect(rewrite?.('/api/v1/api/status')).toBe('/v1/api/status');
    });

    it('should not rewrite paths that share a string prefix but differ at segment boundary', () => {
      const vite = createMockVite();
      // '/api' must NOT match '/api2/users' — only '/api' or '/api/...'
      const instances = [createSpecInstance('test', '/api')];

      configureMultiProxy(vite, instances, 4000);

      const entry = proxyOf(vite)['/api'];
      const rewrite = entry.rewrite;
      expect(rewrite?.('/api2/users')).toBe('/api2/users');
      expect(rewrite?.('/api')).toBe('/');
      expect(rewrite?.('/api/')).toBe('/');
      expect(rewrite?.('/api/users')).toBe('/users');
    });

    it('should handle deeply nested proxy paths', () => {
      const vite = createMockVite();
      const instances = [createSpecInstance('billing', '/services/billing/api/v2')];

      configureMultiProxy(vite, instances, 4000);

      const entry = proxyOf(vite)['/services/billing/api/v2'];
      const rewrite = entry.rewrite;
      expect(rewrite?.('/services/billing/api/v2/invoices')).toBe('/invoices');
    });

    it('should handle proxy paths with special characters', () => {
      const vite = createMockVite();
      // Proxy path with characters that would be special in regex
      const instances = [createSpecInstance('special', '/api.v3')];

      configureMultiProxy(vite, instances, 4000);

      const entry = proxyOf(vite)['/api.v3'];
      const rewrite = entry.rewrite;
      // Should match literal "/api.v3", not "/apiXv3"
      expect(rewrite?.('/api.v3/pets')).toBe('/pets');
      expect(rewrite?.('/apiXv3/pets')).toBe('/apiXv3/pets');
    });
  });

  // ---------------------------------------------------------------------------
  // Preserving existing proxy entries
  // ---------------------------------------------------------------------------

  describe('existing proxy entries', () => {
    it('should preserve existing proxy entries', () => {
      const existingProxy: Record<string, ProxyOptions> = {
        '/existing': { target: 'http://localhost:3000', changeOrigin: true },
      };
      const vite = createMockVite({ proxy: existingProxy });
      const instances = [createSpecInstance('petstore', '/api/v3')];

      configureMultiProxy(vite, instances, 4000);

      const proxy = proxyOf(vite);
      expect(proxy['/existing']).toBeDefined();
      expect(proxy['/api/v3']).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Duplicate proxyPath (prevented upstream by validateUniqueProxyPaths)
  // ---------------------------------------------------------------------------

  describe('duplicate proxyPath (prevented upstream by validateUniqueProxyPaths)', () => {
    it('documents raw function behavior: last-writer-wins when called directly', () => {
      const vite = createMockVite();
      // NOTE: The orchestrator's validateUniqueProxyPaths() prevents this
      // state from occurring in normal plugin flow. This test documents
      // the raw function behavior when called directly (e.g., custom integrations).
      const instances = [
        createSpecInstance('first', '/api/v3'),
        createSpecInstance('second', '/api/v3'),
      ];

      configureMultiProxy(vite, instances, 4000);

      const proxy = proxyOf(vite);
      // Only one entry for the path (object key is overwritten)
      const keys = Object.keys(proxy).filter((k) => k === '/api/v3');
      expect(keys).toHaveLength(1);

      // Last instance wins
      const entry = proxy['/api/v3'] as ProxyOptions;
      expect(entry.headers).toEqual({ 'x-spec-id': 'second' });
      expect(entry.target).toBe('http://localhost:4000');
      expect(entry.changeOrigin).toBe(true);
      expect(entry.rewrite?.('/api/v3/pets')).toBe('/pets');
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple specs
  // ---------------------------------------------------------------------------

  describe('multiple specs', () => {
    it('should configure all specs with correct individual settings', () => {
      const vite = createMockVite();
      const instances = [
        createSpecInstance('petstore', '/api/v3'),
        createSpecInstance('inventory', '/inventory/v1'),
        createSpecInstance('billing', '/billing/v2'),
      ];

      configureMultiProxy(vite, instances, 4000);

      const proxy = proxyOf(vite);

      // Each per-spec entry has the correct target
      for (const path of ['/api/v3', '/inventory/v1', '/billing/v2']) {
        expect((proxy[path] as ProxyOptions).target).toBe('http://localhost:4000');
        expect((proxy[path] as ProxyOptions).changeOrigin).toBe(true);
      }

      // Each entry rewrites correctly
      expect((proxy['/api/v3'] as ProxyOptions).rewrite?.('/api/v3/pets')).toBe('/pets');
      expect((proxy['/inventory/v1'] as ProxyOptions).rewrite?.('/inventory/v1/items')).toBe(
        '/items',
      );
      expect((proxy['/billing/v2'] as ProxyOptions).rewrite?.('/billing/v2/invoices')).toBe(
        '/invoices',
      );
    });
  });

  // ===========================================================================
  // Shared service proxies (/_devtools, /_api, /_ws)
  // ===========================================================================

  describe('shared service proxies', () => {
    it('should create /_devtools proxy entry', () => {
      const vite = createMockVite();

      configureMultiProxy(vite, [], 4000);

      const entry = proxyOf(vite)['/_devtools'];
      expect(entry).toBeDefined();
      expect(entry.target).toBe('http://localhost:4000');
      expect(entry.changeOrigin).toBe(true);
    });

    it('should create /_api proxy entry', () => {
      const vite = createMockVite();

      configureMultiProxy(vite, [], 4000);

      const entry = proxyOf(vite)['/_api'];
      expect(entry).toBeDefined();
      expect(entry.target).toBe('http://localhost:4000');
      expect(entry.changeOrigin).toBe(true);
    });

    it('should create /_ws proxy entry with WebSocket support and ws:// protocol', () => {
      const vite = createMockVite();

      configureMultiProxy(vite, [], 4000);

      const entry = proxyOf(vite)['/_ws'];
      expect(entry).toBeDefined();
      expect(entry.target).toBe('ws://localhost:4000');
      expect(entry.changeOrigin).toBe(true);
      expect(entry.ws).toBe(true);
    });

    it('should not set ws on /_devtools or /_api entries', () => {
      const vite = createMockVite();

      configureMultiProxy(vite, [], 4000);

      const proxy = proxyOf(vite);
      expect((proxy['/_devtools'] as ProxyOptions).ws).toBeUndefined();
      expect((proxy['/_api'] as ProxyOptions).ws).toBeUndefined();
    });

    it('should use the provided port', () => {
      const vite = createMockVite();

      configureMultiProxy(vite, [], 9999);

      const proxy = proxyOf(vite);
      expect((proxy['/_devtools'] as ProxyOptions).target).toBe('http://localhost:9999');
      expect((proxy['/_api'] as ProxyOptions).target).toBe('http://localhost:9999');
      expect((proxy['/_ws'] as ProxyOptions).target).toBe('ws://localhost:9999');
    });

    it('should not set rewrite on shared service proxies', () => {
      const vite = createMockVite();

      configureMultiProxy(vite, [], 4000);

      const proxy = proxyOf(vite);
      expect((proxy['/_devtools'] as ProxyOptions).rewrite).toBeUndefined();
      expect((proxy['/_api'] as ProxyOptions).rewrite).toBeUndefined();
      expect((proxy['/_ws'] as ProxyOptions).rewrite).toBeUndefined();
    });

    it('should not set headers on shared service proxies', () => {
      const vite = createMockVite();

      configureMultiProxy(vite, [], 4000);

      const proxy = proxyOf(vite);
      expect((proxy['/_devtools'] as ProxyOptions).headers).toBeUndefined();
      expect((proxy['/_api'] as ProxyOptions).headers).toBeUndefined();
      expect((proxy['/_ws'] as ProxyOptions).headers).toBeUndefined();
    });

    it('should preserve existing proxy entries alongside shared services', () => {
      const existingProxy: Record<string, ProxyOptions> = {
        '/api/v3': { target: 'http://localhost:4000', changeOrigin: true },
      };
      const vite = createMockVite({ proxy: existingProxy });

      configureMultiProxy(vite, [], 4000);

      const proxy = proxyOf(vite);
      expect(proxy['/api/v3']).toBeDefined();
      expect(proxy['/_devtools']).toBeDefined();
      expect(proxy['/_api']).toBeDefined();
      expect(proxy['/_ws']).toBeDefined();
    });
  });

  // ===========================================================================
  // Integration: per-spec + shared service proxies
  // ===========================================================================

  describe('integration: per-spec + shared service proxies', () => {
    it('should configure both per-spec and shared entries in a single call', () => {
      const vite = createMockVite();
      const instances = [
        createSpecInstance('petstore', '/api/v3'),
        createSpecInstance('inventory', '/inventory/v1'),
      ];

      configureMultiProxy(vite, instances, 4000);

      const proxy = proxyOf(vite);

      // Per-spec entries
      expect(proxy['/api/v3']).toBeDefined();
      expect(proxy['/inventory/v1']).toBeDefined();

      // Shared service entries
      expect(proxy['/_devtools']).toBeDefined();
      expect(proxy['/_api']).toBeDefined();
      expect(proxy['/_ws']).toBeDefined();

      // Total entries: 2 spec + 3 shared
      expect(Object.keys(proxy)).toHaveLength(5);
    });

    it('should use the same target port for all entries', () => {
      const vite = createMockVite();
      const instances = [createSpecInstance('petstore', '/api/v3')];

      configureMultiProxy(vite, instances, 7777);

      const proxy = proxyOf(vite);
      for (const [path, entry] of Object.entries(proxy)) {
        const expectedProtocol = path === '/_ws' ? 'ws' : 'http';
        expect((entry as ProxyOptions).target).toBe(`${expectedProtocol}://localhost:7777`);
      }
    });
  });
});
