/**
 * Multi-Proxy Configuration Tests
 *
 * What: Unit tests for configureMultiProxy() and configureSharedServiceProxies()
 * How: Tests proxy entry generation with correct targets, rewrite regexes, and headers
 * Why: Ensures Vite proxy configuration is correctly generated for multi-spec routing
 */

import type { ProxyOptions } from 'vite';
import { describe, expect, it } from 'vitest';

import { configureMultiProxy, configureSharedServiceProxies } from '../multi-proxy.js';
import type { SpecInstance } from '../orchestrator.js';
import type { ResolvedSpecConfig } from '../types.js';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create a minimal mock ViteDevServer with a mutable proxy config.
 *
 * Only the `config.server.proxy` path is needed by the proxy functions.
 */
function createMockVite(existingProxy?: Record<string, ProxyOptions>) {
  return {
    config: {
      server: {
        proxy: existingProxy ?? {},
      },
    },
  } as Parameters<typeof configureMultiProxy>[0];
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
    info: {} as SpecInstance['info'],
    server: {} as SpecInstance['server'],
  };
}

// =============================================================================
// configureMultiProxy()
// =============================================================================

describe('configureMultiProxy', () => {
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

      const proxy = vite.config.server.proxy as Record<string, ProxyOptions>;
      expect(proxy['/api/v3']).toBeDefined();
      expect(proxy['/inventory/v1']).toBeDefined();
    });

    it('should set correct target for each proxy entry', () => {
      const vite = createMockVite();
      const instances = [createSpecInstance('petstore', '/api/v3')];

      configureMultiProxy(vite, instances, 5000);

      const entry = vite.config.server.proxy['/api/v3'] as ProxyOptions;
      expect(entry.target).toBe('http://localhost:5000');
    });

    it('should set changeOrigin to true', () => {
      const vite = createMockVite();
      const instances = [createSpecInstance('petstore', '/api/v3')];

      configureMultiProxy(vite, instances, 4000);

      const entry = vite.config.server.proxy['/api/v3'] as ProxyOptions;
      expect(entry.changeOrigin).toBe(true);
    });

    it('should handle empty instances array gracefully', () => {
      const vite = createMockVite();

      configureMultiProxy(vite, [], 4000);

      expect(Object.keys(vite.config.server.proxy)).toHaveLength(0);
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

      const entry = vite.config.server.proxy['/api/v3'] as ProxyOptions;
      expect(entry.headers).toEqual({ 'x-spec-id': 'petstore' });
    });

    it('should set distinct x-spec-id for each spec', () => {
      const vite = createMockVite();
      const instances = [
        createSpecInstance('petstore', '/api/v3'),
        createSpecInstance('billing', '/billing/v2'),
      ];

      configureMultiProxy(vite, instances, 4000);

      const proxy = vite.config.server.proxy as Record<string, ProxyOptions>;
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

      const entry = vite.config.server.proxy['/api/v3'] as ProxyOptions;
      const rewrite = entry.rewrite!;
      expect(rewrite('/api/v3/pets')).toBe('/pets');
      expect(rewrite('/api/v3/pets/123')).toBe('/pets/123');
      expect(rewrite('/api/v3')).toBe('');
    });

    it('should only strip the prefix, not occurrences elsewhere in the path', () => {
      const vite = createMockVite();
      const instances = [createSpecInstance('test', '/api')];

      configureMultiProxy(vite, instances, 4000);

      const entry = vite.config.server.proxy['/api'] as ProxyOptions;
      const rewrite = entry.rewrite!;
      // Only first occurrence (prefix) is stripped
      expect(rewrite('/api/v1/api/status')).toBe('/v1/api/status');
    });

    it('should handle deeply nested proxy paths', () => {
      const vite = createMockVite();
      const instances = [createSpecInstance('billing', '/services/billing/api/v2')];

      configureMultiProxy(vite, instances, 4000);

      const entry = vite.config.server.proxy['/services/billing/api/v2'] as ProxyOptions;
      const rewrite = entry.rewrite!;
      expect(rewrite('/services/billing/api/v2/invoices')).toBe('/invoices');
    });

    it('should escape special regex characters in proxy path', () => {
      const vite = createMockVite();
      // Proxy path with characters that are special in regex
      const instances = [createSpecInstance('special', '/api.v3')];

      configureMultiProxy(vite, instances, 4000);

      const entry = vite.config.server.proxy['/api.v3'] as ProxyOptions;
      const rewrite = entry.rewrite!;
      // Should match literal "/api.v3", not "/apiXv3"
      expect(rewrite('/api.v3/pets')).toBe('/pets');
      expect(rewrite('/apiXv3/pets')).toBe('/apiXv3/pets');
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
      const vite = createMockVite(existingProxy);
      const instances = [createSpecInstance('petstore', '/api/v3')];

      configureMultiProxy(vite, instances, 4000);

      const proxy = vite.config.server.proxy as Record<string, ProxyOptions>;
      expect(proxy['/existing']).toBeDefined();
      expect(proxy['/api/v3']).toBeDefined();
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

      const proxy = vite.config.server.proxy as Record<string, ProxyOptions>;
      expect(Object.keys(proxy)).toHaveLength(3);

      // Each entry has the correct target
      for (const path of ['/api/v3', '/inventory/v1', '/billing/v2']) {
        expect((proxy[path] as ProxyOptions).target).toBe('http://localhost:4000');
        expect((proxy[path] as ProxyOptions).changeOrigin).toBe(true);
      }

      // Each entry rewrites correctly
      expect((proxy['/api/v3'] as ProxyOptions).rewrite!('/api/v3/pets')).toBe('/pets');
      expect((proxy['/inventory/v1'] as ProxyOptions).rewrite!('/inventory/v1/items')).toBe(
        '/items',
      );
      expect((proxy['/billing/v2'] as ProxyOptions).rewrite!('/billing/v2/invoices')).toBe(
        '/invoices',
      );
    });
  });
});

// =============================================================================
// configureSharedServiceProxies()
// =============================================================================

describe('configureSharedServiceProxies', () => {
  // ---------------------------------------------------------------------------
  // Shared proxy entries
  // ---------------------------------------------------------------------------

  describe('shared proxy entries', () => {
    it('should create /_devtools proxy entry', () => {
      const vite = createMockVite();

      configureSharedServiceProxies(vite, 4000);

      const entry = vite.config.server.proxy['/_devtools'] as ProxyOptions;
      expect(entry).toBeDefined();
      expect(entry.target).toBe('http://localhost:4000');
      expect(entry.changeOrigin).toBe(true);
    });

    it('should create /_api proxy entry', () => {
      const vite = createMockVite();

      configureSharedServiceProxies(vite, 4000);

      const entry = vite.config.server.proxy['/_api'] as ProxyOptions;
      expect(entry).toBeDefined();
      expect(entry.target).toBe('http://localhost:4000');
      expect(entry.changeOrigin).toBe(true);
    });

    it('should create /_ws proxy entry with WebSocket support', () => {
      const vite = createMockVite();

      configureSharedServiceProxies(vite, 4000);

      const entry = vite.config.server.proxy['/_ws'] as ProxyOptions;
      expect(entry).toBeDefined();
      expect(entry.target).toBe('http://localhost:4000');
      expect(entry.changeOrigin).toBe(true);
      expect(entry.ws).toBe(true);
    });

    it('should not set ws on /_devtools or /_api entries', () => {
      const vite = createMockVite();

      configureSharedServiceProxies(vite, 4000);

      const proxy = vite.config.server.proxy as Record<string, ProxyOptions>;
      expect((proxy['/_devtools'] as ProxyOptions).ws).toBeUndefined();
      expect((proxy['/_api'] as ProxyOptions).ws).toBeUndefined();
    });

    it('should use the provided port', () => {
      const vite = createMockVite();

      configureSharedServiceProxies(vite, 9999);

      const proxy = vite.config.server.proxy as Record<string, ProxyOptions>;
      expect((proxy['/_devtools'] as ProxyOptions).target).toBe('http://localhost:9999');
      expect((proxy['/_api'] as ProxyOptions).target).toBe('http://localhost:9999');
      expect((proxy['/_ws'] as ProxyOptions).target).toBe('http://localhost:9999');
    });
  });

  // ---------------------------------------------------------------------------
  // Preserving existing proxy entries
  // ---------------------------------------------------------------------------

  describe('existing proxy entries', () => {
    it('should preserve existing proxy entries', () => {
      const existingProxy: Record<string, ProxyOptions> = {
        '/api/v3': { target: 'http://localhost:4000', changeOrigin: true },
      };
      const vite = createMockVite(existingProxy);

      configureSharedServiceProxies(vite, 4000);

      const proxy = vite.config.server.proxy as Record<string, ProxyOptions>;
      expect(proxy['/api/v3']).toBeDefined();
      expect(proxy['/_devtools']).toBeDefined();
      expect(proxy['/_api']).toBeDefined();
      expect(proxy['/_ws']).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // No path rewriting or headers
  // ---------------------------------------------------------------------------

  describe('no path rewriting or headers', () => {
    it('should not set rewrite on shared service proxies', () => {
      const vite = createMockVite();

      configureSharedServiceProxies(vite, 4000);

      const proxy = vite.config.server.proxy as Record<string, ProxyOptions>;
      expect((proxy['/_devtools'] as ProxyOptions).rewrite).toBeUndefined();
      expect((proxy['/_api'] as ProxyOptions).rewrite).toBeUndefined();
      expect((proxy['/_ws'] as ProxyOptions).rewrite).toBeUndefined();
    });

    it('should not set headers on shared service proxies', () => {
      const vite = createMockVite();

      configureSharedServiceProxies(vite, 4000);

      const proxy = vite.config.server.proxy as Record<string, ProxyOptions>;
      expect((proxy['/_devtools'] as ProxyOptions).headers).toBeUndefined();
      expect((proxy['/_api'] as ProxyOptions).headers).toBeUndefined();
      expect((proxy['/_ws'] as ProxyOptions).headers).toBeUndefined();
    });
  });
});

// =============================================================================
// Integration: configureMultiProxy + configureSharedServiceProxies
// =============================================================================

describe('integration: multi-proxy + shared service proxies', () => {
  it('should work together to configure full proxy setup', () => {
    const vite = createMockVite();
    const instances = [
      createSpecInstance('petstore', '/api/v3'),
      createSpecInstance('inventory', '/inventory/v1'),
    ];

    configureMultiProxy(vite, instances, 4000);
    configureSharedServiceProxies(vite, 4000);

    const proxy = vite.config.server.proxy as Record<string, ProxyOptions>;

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
    configureSharedServiceProxies(vite, 7777);

    const proxy = vite.config.server.proxy as Record<string, ProxyOptions>;
    for (const entry of Object.values(proxy)) {
      expect((entry as ProxyOptions).target).toBe('http://localhost:7777');
    }
  });
});
