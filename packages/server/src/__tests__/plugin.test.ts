/**
 * Plugin Integration Tests
 *
 * What: Tests for openApiServer() Vite plugin with multi-spec support
 * How: Creates plugin instance with 2 inline OpenAPI specs, invokes lifecycle hooks
 * Why: Ensures plugin correctly creates orchestrator, configures multi-proxy,
 *      preserves existing hooks, and cleans up on close
 *
 * @see Task 1.7.4: Write integration test for plugin
 */

import type { ProxyOptions } from 'vite';
import { afterEach, describe, expect, it } from 'vitest';

import { openApiServer } from '../plugin.js';
import { createMockLogger, createMockViteServer } from './test-utils.js';

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Inline OpenAPI 3.1 document for "Petstore" spec.
 */
const petstoreSpec = JSON.stringify({
  openapi: '3.1.0',
  info: { title: 'Petstore API', version: '1.0.0' },
  servers: [{ url: 'https://api.example.com/pets/v1' }],
  paths: {
    '/pets': {
      get: {
        operationId: 'listPets',
        summary: 'List all pets',
        responses: {
          '200': {
            description: 'A list of pets',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    title: 'Pet',
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});

/**
 * Inline OpenAPI 3.1 document for "Inventory" spec.
 */
const inventorySpec = JSON.stringify({
  openapi: '3.1.0',
  info: { title: 'Inventory API', version: '2.0.0' },
  servers: [{ url: 'https://api.example.com/inventory/v1' }],
  paths: {
    '/items': {
      get: {
        operationId: 'listItems',
        summary: 'List all items',
        responses: {
          '200': {
            description: 'A list of items',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    title: 'Item',
                    properties: {
                      id: { type: 'integer' },
                      sku: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create a mock ViteDevServer enhanced with config.server.proxy for proxy testing.
 *
 * Extends the standard mock with the `config` structure that `configureMultiProxy`
 * expects to mutate.
 */
function createPluginTestViteServer() {
  const baseMock = createMockViteServer();

  return {
    ...baseMock,
    config: {
      root: process.cwd(),
      server: {
        proxy: {} as Record<string, ProxyOptions>,
      },
    },
  } as ReturnType<typeof createMockViteServer> & {
    config: { root: string; server: { proxy: Record<string, ProxyOptions> } };
  };
}

/** Track the orchestrator HTTP server for cleanup in afterEach */
let cleanupFn: (() => Promise<void>) | null = null;

afterEach(async () => {
  if (cleanupFn) {
    await cleanupFn();
    cleanupFn = null;
  }
});

// =============================================================================
// Tests
// =============================================================================

describe('openApiServer plugin', () => {
  // ---------------------------------------------------------------------------
  // configureServer — orchestrator and multi-proxy
  // ---------------------------------------------------------------------------

  describe('configureServer', () => {
    it('should generate correct Vite proxy config for 2 specs', async () => {
      const logger = createMockLogger();
      const plugin = openApiServer({
        specs: [
          { spec: petstoreSpec, id: 'petstore', proxyPath: '/pets/v1' },
          { spec: inventorySpec, id: 'inventory', proxyPath: '/inventory/v1' },
        ],
        port: 0, // Ephemeral port to avoid conflicts
        cors: false,
        devtools: false,
        silent: true,
        logger,
      });

      const vite = createPluginTestViteServer();

      // Invoke configureServer hook
      const configureServer = plugin.configureServer as (server: typeof vite) => Promise<void>;
      await configureServer(vite);

      // Register cleanup
      cleanupFn = plugin.closeBundle as () => Promise<void>;

      const proxy = vite.config.server.proxy;

      // Per-spec proxy entries
      expect(proxy['/pets/v1']).toBeDefined();
      expect(proxy['/inventory/v1']).toBeDefined();

      // Shared service proxies
      expect(proxy['/_devtools']).toBeDefined();
      expect(proxy['/_api']).toBeDefined();
      expect(proxy['/_ws']).toBeDefined();

      // Total: 2 per-spec + 3 shared = 5
      expect(Object.keys(proxy)).toHaveLength(5);
    });

    it('should set correct X-Spec-Id headers in proxy entries', async () => {
      const logger = createMockLogger();
      const plugin = openApiServer({
        specs: [
          { spec: petstoreSpec, id: 'petstore', proxyPath: '/pets/v1' },
          { spec: inventorySpec, id: 'inventory', proxyPath: '/inventory/v1' },
        ],
        port: 0,
        cors: false,
        devtools: false,
        silent: true,
        logger,
      });

      const vite = createPluginTestViteServer();
      const configureServer = plugin.configureServer as (server: typeof vite) => Promise<void>;
      await configureServer(vite);
      cleanupFn = plugin.closeBundle as () => Promise<void>;

      const proxy = vite.config.server.proxy;
      expect(proxy['/pets/v1'].headers).toEqual({ 'x-spec-id': 'petstore' });
      expect(proxy['/inventory/v1'].headers).toEqual({ 'x-spec-id': 'inventory' });
    });

    it('should configure path rewriting for each spec', async () => {
      const logger = createMockLogger();
      const plugin = openApiServer({
        specs: [
          { spec: petstoreSpec, id: 'petstore', proxyPath: '/pets/v1' },
          { spec: inventorySpec, id: 'inventory', proxyPath: '/inventory/v1' },
        ],
        port: 0,
        cors: false,
        devtools: false,
        silent: true,
        logger,
      });

      const vite = createPluginTestViteServer();
      const configureServer = plugin.configureServer as (server: typeof vite) => Promise<void>;
      await configureServer(vite);
      cleanupFn = plugin.closeBundle as () => Promise<void>;

      const proxy = vite.config.server.proxy;

      // Verify path rewriting strips the prefix
      expect(proxy['/pets/v1'].rewrite?.('/pets/v1/cats')).toBe('/cats');
      expect(proxy['/inventory/v1'].rewrite?.('/inventory/v1/items')).toBe('/items');
    });

    it('should not configure proxy when plugin is disabled', async () => {
      const logger = createMockLogger();
      const plugin = openApiServer({
        specs: [{ spec: petstoreSpec, proxyPath: '/pets/v1' }],
        port: 0,
        enabled: false,
        logger,
      });

      const vite = createPluginTestViteServer();
      const configureServer = plugin.configureServer as (server: typeof vite) => Promise<void>;
      await configureServer(vite);

      // Proxy should remain empty — no orchestrator was created
      expect(Object.keys(vite.config.server.proxy)).toHaveLength(0);
    });

    it('should use the actual bound port in proxy target', async () => {
      const logger = createMockLogger();
      const plugin = openApiServer({
        specs: [{ spec: petstoreSpec, id: 'petstore', proxyPath: '/pets/v1' }],
        port: 0, // Ephemeral
        cors: false,
        devtools: false,
        silent: true,
        logger,
      });

      const vite = createPluginTestViteServer();
      const configureServer = plugin.configureServer as (server: typeof vite) => Promise<void>;
      await configureServer(vite);
      cleanupFn = plugin.closeBundle as () => Promise<void>;

      const proxy = vite.config.server.proxy;
      const target = proxy['/pets/v1'].target as string;

      // With port 0, the OS assigns an ephemeral port (> 0)
      const portMatch = target.match(/:(\d+)$/);
      expect(portMatch).not.toBeNull();
      // biome-ignore lint/style/noNonNullAssertion: guarded by expect().not.toBeNull() above
      const boundPort = Number.parseInt(portMatch![1], 10);
      expect(boundPort).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // resolveId / load / transformIndexHtml hooks — unchanged from v0.x
  // ---------------------------------------------------------------------------

  describe('resolveId hook', () => {
    it('should resolve virtual devtools tab module', () => {
      const plugin = openApiServer({
        specs: [{ spec: petstoreSpec, proxyPath: '/pets/v1' }],
      });

      const resolveId = plugin.resolveId as (id: string) => string | undefined;

      // Plugin uses `call(this, ...)` style internally, so we call directly
      expect(resolveId.call({}, 'virtual:open-api-devtools-tab')).toBe(
        '\0virtual:open-api-devtools-tab',
      );
    });

    it('should return undefined for non-matching IDs', () => {
      const plugin = openApiServer({
        specs: [{ spec: petstoreSpec, proxyPath: '/pets/v1' }],
      });

      const resolveId = plugin.resolveId as (id: string) => string | undefined;
      expect(resolveId.call({}, 'some-other-module')).toBeUndefined();
    });
  });

  describe('load hook', () => {
    it('should return DevTools tab registration code for virtual module', () => {
      const plugin = openApiServer({
        specs: [{ spec: petstoreSpec, proxyPath: '/pets/v1' }],
      });

      const load = plugin.load as (id: string) => string | undefined;
      const result = load.call({}, '\0virtual:open-api-devtools-tab');

      expect(result).toBeDefined();
      expect(result).toContain('addCustomTab');
      expect(result).toContain('/_devtools/');
    });

    it('should return undefined for non-matching IDs', () => {
      const plugin = openApiServer({
        specs: [{ spec: petstoreSpec, proxyPath: '/pets/v1' }],
      });

      const load = plugin.load as (id: string) => string | undefined;
      expect(load.call({}, 'some-other-module')).toBeUndefined();
    });
  });

  describe('transformIndexHtml hook', () => {
    it('should inject DevTools script tag when devtools is enabled', () => {
      const plugin = openApiServer({
        specs: [{ spec: petstoreSpec, proxyPath: '/pets/v1' }],
        devtools: true,
      });

      const transformIndexHtml = plugin.transformIndexHtml as () => unknown;
      const result = transformIndexHtml.call({}) as Array<{
        tag: string;
        attrs: Record<string, string>;
        injectTo: string;
      }>;

      expect(result).toHaveLength(1);
      expect(result[0].tag).toBe('script');
      expect(result[0].attrs.type).toBe('module');
      expect(result[0].attrs.src).toContain('virtual:open-api-devtools-tab');
      expect(result[0].injectTo).toBe('head');
    });

    it('should return undefined when devtools is disabled', () => {
      const plugin = openApiServer({
        specs: [{ spec: petstoreSpec, proxyPath: '/pets/v1' }],
        devtools: false,
      });

      const transformIndexHtml = plugin.transformIndexHtml as () => unknown;
      expect(transformIndexHtml.call({})).toBeUndefined();
    });

    it('should return undefined when plugin is disabled', () => {
      const plugin = openApiServer({
        specs: [{ spec: petstoreSpec, proxyPath: '/pets/v1' }],
        enabled: false,
        devtools: true,
      });

      const transformIndexHtml = plugin.transformIndexHtml as () => unknown;
      expect(transformIndexHtml.call({})).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // closeBundle — cleanup
  // ---------------------------------------------------------------------------

  describe('closeBundle', () => {
    it('should stop the orchestrator server on cleanup', async () => {
      const logger = createMockLogger();
      const plugin = openApiServer({
        specs: [{ spec: petstoreSpec, id: 'petstore', proxyPath: '/pets/v1' }],
        port: 0,
        cors: false,
        devtools: false,
        silent: true,
        logger,
      });

      const vite = createPluginTestViteServer();
      const configureServer = plugin.configureServer as (server: typeof vite) => Promise<void>;
      await configureServer(vite);

      // Invoke closeBundle to clean up
      const closeBundle = plugin.closeBundle as () => Promise<void>;
      await closeBundle();

      // Server should have logged stop message
      const infoCalls = logger.info.mock.calls.map((c) => c[0]);
      expect(infoCalls.some((msg: string) => msg.includes('Server stopped'))).toBe(true);
    });

    it('should be safe to call closeBundle without configureServer', async () => {
      const plugin = openApiServer({
        specs: [{ spec: petstoreSpec, proxyPath: '/pets/v1' }],
        silent: true,
      });

      const closeBundle = plugin.closeBundle as () => Promise<void>;
      // Should not throw when no orchestrator was created
      await expect(closeBundle()).resolves.toBeUndefined();
    });

    it('should be safe to call closeBundle twice', async () => {
      const logger = createMockLogger();
      const plugin = openApiServer({
        specs: [{ spec: petstoreSpec, id: 'petstore', proxyPath: '/pets/v1' }],
        port: 0,
        cors: false,
        devtools: false,
        silent: true,
        logger,
      });

      const vite = createPluginTestViteServer();
      const configureServer = plugin.configureServer as (server: typeof vite) => Promise<void>;
      await configureServer(vite);

      const closeBundle = plugin.closeBundle as () => Promise<void>;
      await closeBundle();
      // Second call should be a no-op, not throw
      await expect(closeBundle()).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Plugin metadata
  // ---------------------------------------------------------------------------

  describe('plugin metadata', () => {
    it('should have the correct plugin name', () => {
      const plugin = openApiServer({
        specs: [{ spec: petstoreSpec, proxyPath: '/pets/v1' }],
      });

      expect(plugin.name).toBe('vite-plugin-open-api-server');
    });

    it('should only apply in serve mode', () => {
      const plugin = openApiServer({
        specs: [{ spec: petstoreSpec, proxyPath: '/pets/v1' }],
      });

      expect(plugin.apply).toBe('serve');
    });
  });
});
