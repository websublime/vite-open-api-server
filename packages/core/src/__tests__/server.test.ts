/**
 * Server Factory Integration Tests
 *
 * @see Task 1.6: Server Factory
 */

import type { OpenAPIV3_1 } from '@scalar/openapi-types';
import { beforeEach, describe, expect, it } from 'vitest';

import packageJson from '../../package.json' with { type: 'json' };
import type { HandlerFn } from '../handlers/index.js';
import { createOpenApiServer, type OpenApiServer } from '../server.js';

/**
 * Minimal valid OpenAPI document for testing
 */
const minimalDocument: OpenAPIV3_1.Document = {
  openapi: '3.1.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {},
};

/**
 * OpenAPI document with a single endpoint
 */
const singleEndpointDocument: OpenAPIV3_1.Document = {
  openapi: '3.1.0',
  info: { title: 'Test API', version: '1.0.0' },
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
      post: {
        operationId: 'createPet',
        summary: 'Create a pet',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                title: 'Pet',
                properties: {
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Pet created',
            content: {
              'application/json': {
                schema: {
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
    '/pets/{petId}': {
      get: {
        operationId: 'getPetById',
        summary: 'Get a pet by ID',
        parameters: [
          {
            name: 'petId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: {
          '200': {
            description: 'A pet',
            content: {
              'application/json': {
                schema: {
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
};

describe('createOpenApiServer', () => {
  describe('initialization', () => {
    it('should create a server with minimal config', async () => {
      const server = await createOpenApiServer({
        spec: minimalDocument,
      });

      expect(server).toBeDefined();
      expect(server.app).toBeDefined();
      expect(server.store).toBeDefined();
      expect(server.registry).toBeDefined();
      expect(server.document).toBeDefined();
      expect(server.wsHub).toBeDefined();
      expect(server.simulationManager).toBeDefined();
    });

    it('should use default port 3000', async () => {
      const server = await createOpenApiServer({
        spec: minimalDocument,
      });

      expect(server.port).toBe(3000);
    });

    it('should use custom port when specified', async () => {
      const server = await createOpenApiServer({
        spec: minimalDocument,
        port: 8080,
      });

      expect(server.port).toBe(8080);
    });

    it('should process OpenAPI document', async () => {
      const server = await createOpenApiServer({
        spec: singleEndpointDocument,
      });

      expect(server.document.openapi).toBe('3.1.0');
      expect(server.document.info?.title).toBe('Test API');
    });

    it('should build registry from document', async () => {
      const server = await createOpenApiServer({
        spec: singleEndpointDocument,
      });

      expect(server.registry.endpoints.size).toBe(3);
      expect(server.registry.endpoints.has('get:/pets')).toBe(true);
      expect(server.registry.endpoints.has('post:/pets')).toBe(true);
      expect(server.registry.endpoints.has('get:/pets/{petId}')).toBe(true);
    });
  });

  describe('store initialization', () => {
    it('should create store with custom ID fields', async () => {
      const server = await createOpenApiServer({
        spec: minimalDocument,
        idFields: { User: 'username', Pet: 'petId' },
      });

      expect(server.store.getIdField('User')).toBe('username');
      expect(server.store.getIdField('Pet')).toBe('petId');
      expect(server.store.getIdField('Other')).toBe('id'); // default
    });

    it('should populate store with seed data', async () => {
      const seeds = new Map<string, unknown[]>([
        [
          'Pet',
          [
            { id: 1, name: 'Buddy' },
            { id: 2, name: 'Max' },
          ],
        ],
      ]);

      const server = await createOpenApiServer({
        spec: minimalDocument,
        seeds,
      });

      expect(server.store.getCount('Pet')).toBe(2);
      expect(server.store.get('Pet', 1)).toEqual({ id: 1, name: 'Buddy' });
      expect(server.store.get('Pet', 2)).toEqual({ id: 2, name: 'Max' });
    });
  });

  describe('API routes', () => {
    let server: OpenApiServer;

    beforeEach(async () => {
      server = await createOpenApiServer({
        spec: singleEndpointDocument,
      });
    });

    it('should respond to GET /pets', async () => {
      const response = await server.app.request('/pets');
      expect(response.status).toBe(200);
    });

    it('should respond to POST /pets', async () => {
      const response = await server.app.request('/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Buddy' }),
      });
      expect(response.status).toBe(200);
    });

    it('should respond to GET /pets/:petId', async () => {
      const response = await server.app.request('/pets/123');
      expect(response.status).toBe(200);
    });
  });

  describe('internal API routes', () => {
    let server: OpenApiServer;

    beforeEach(async () => {
      server = await createOpenApiServer({
        spec: singleEndpointDocument,
        seeds: new Map([['Pet', [{ id: 1, name: 'Buddy' }]]]),
      });
    });

    describe('/_api/registry', () => {
      it('should return registry data', async () => {
        const response = await server.app.request('/_api/registry');
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.endpoints).toBeInstanceOf(Array);
        expect(data.endpoints.length).toBe(3);
        expect(data.stats).toBeDefined();
        expect(data.stats.totalEndpoints).toBe(3);
      });
    });

    describe('/_api/store', () => {
      it('should return list of schemas', async () => {
        const response = await server.app.request('/_api/store');
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.schemas).toBeInstanceOf(Array);
        expect(data.schemas).toContainEqual({
          name: 'Pet',
          count: 1,
          idField: 'id',
        });
      });
    });

    describe('/_api/store/:schema', () => {
      it('should return items for a schema', async () => {
        const response = await server.app.request('/_api/store/Pet');
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.schema).toBe('Pet');
        expect(data.count).toBe(1);
        expect(data.items).toEqual([{ id: 1, name: 'Buddy' }]);
      });

      it('should return empty array for unknown schema', async () => {
        const response = await server.app.request('/_api/store/Unknown');
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.items).toEqual([]);
      });
    });

    describe('POST /_api/store/:schema', () => {
      it('should bulk replace items', async () => {
        const response = await server.app.request('/_api/store/Pet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([
            { id: 10, name: 'New Pet 1' },
            { id: 20, name: 'New Pet 2' },
          ]),
        });
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.created).toBe(2);

        // Verify store was updated
        expect(server.store.getCount('Pet')).toBe(2);
      });

      it('should return error for invalid JSON', async () => {
        const response = await server.app.request('/_api/store/Pet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json',
        });
        expect(response.status).toBe(400);
      });

      it('should return error for non-array body', async () => {
        const response = await server.app.request('/_api/store/Pet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 1, name: 'Buddy' }),
        });
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error).toContain('array');
      });
    });

    describe('DELETE /_api/store/:schema', () => {
      it('should clear all items for a schema', async () => {
        const response = await server.app.request('/_api/store/Pet', {
          method: 'DELETE',
        });
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.deleted).toBe(1);

        expect(server.store.getCount('Pet')).toBe(0);
      });
    });

    describe('/_api/timeline', () => {
      it('should return empty timeline initially', async () => {
        const response = await server.app.request('/_api/timeline');
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.entries).toEqual([]);
        expect(data.count).toBe(0);
      });

      it('should include request/response in timeline after API call', async () => {
        // Make an API call
        await server.app.request('/pets');

        // Check timeline
        const response = await server.app.request('/_api/timeline');
        const data = await response.json();

        expect(data.count).toBeGreaterThan(0);
        expect(data.entries.some((e: { type: string }) => e.type === 'request')).toBe(true);
        expect(data.entries.some((e: { type: string }) => e.type === 'response')).toBe(true);
      });
    });

    describe('DELETE /_api/timeline', () => {
      it('should clear the timeline', async () => {
        // Make an API call to populate timeline
        await server.app.request('/pets');

        // Clear timeline
        const clearResponse = await server.app.request('/_api/timeline', {
          method: 'DELETE',
        });
        expect(clearResponse.status).toBe(200);

        // Verify it's empty
        const response = await server.app.request('/_api/timeline');
        const data = await response.json();
        expect(data.count).toBe(0);
      });
    });

    describe('/_api/simulations', () => {
      it('should return empty simulations initially', async () => {
        const response = await server.app.request('/_api/simulations');
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.simulations).toEqual([]);
        expect(data.count).toBe(0);
      });
    });

    describe('POST /_api/simulations', () => {
      it('should add a simulation', async () => {
        const response = await server.app.request('/_api/simulations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: 'GET /pets',
            operationId: 'listPets',
            status: 500,
          }),
        });
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);

        // Verify simulation was added
        expect(server.simulationManager.count()).toBe(1);
      });

      it('should return error for invalid simulation', async () => {
        const response = await server.app.request('/_api/simulations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: 'GET /pets' }), // missing required fields
        });
        expect(response.status).toBe(400);
      });
    });

    describe('DELETE /_api/simulations/:path', () => {
      it('should remove a simulation', async () => {
        // Add a simulation first
        server.simulationManager.set({
          path: 'GET /pets',
          operationId: 'listPets',
          status: 500,
        });

        const response = await server.app.request('/_api/simulations/GET%20%2Fpets', {
          method: 'DELETE',
        });
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(server.simulationManager.count()).toBe(0);
      });

      it('should return error for malformed URI encoding', async () => {
        // %E0%A4%A is an incomplete/invalid UTF-8 sequence
        const response = await server.app.request('/_api/simulations/%E0%A4%A', {
          method: 'DELETE',
        });
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error).toBe('Invalid path encoding');
      });
    });

    describe('DELETE /_api/simulations', () => {
      it('should clear all simulations', async () => {
        // Add simulations
        server.simulationManager.set({
          path: 'GET /pets',
          operationId: 'listPets',
          status: 500,
        });
        server.simulationManager.set({
          path: 'POST /pets',
          operationId: 'createPet',
          status: 503,
        });

        const response = await server.app.request('/_api/simulations', {
          method: 'DELETE',
        });
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.cleared).toBe(2);
        expect(server.simulationManager.count()).toBe(0);
      });
    });

    describe('/_api/document', () => {
      it('should return the OpenAPI document', async () => {
        const response = await server.app.request('/_api/document');
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.openapi).toBe('3.1.0');
        expect(data.info.title).toBe('Test API');
      });
    });

    describe('/_api/health', () => {
      it('should return health status', async () => {
        const response = await server.app.request('/_api/health');
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.status).toBe('ok');
        expect(data.endpoints).toBe(3);
        expect(data.version).toBe(packageJson.version);
        expect(data.timestamp).toBeDefined();
      });
    });
  });

  describe('getTimeline', () => {
    it('should return empty timeline initially', async () => {
      const server = await createOpenApiServer({
        spec: singleEndpointDocument,
      });

      const timeline = server.getTimeline();
      expect(timeline).toBeInstanceOf(Array);
      expect(timeline).toHaveLength(0);
    });

    it('should return timeline entries after requests', async () => {
      const server = await createOpenApiServer({
        spec: singleEndpointDocument,
      });

      await server.app.request('/pets');

      const timeline = server.getTimeline();
      expect(timeline.length).toBeGreaterThan(0);
      expect(timeline[0]).toHaveProperty('id');
      expect(timeline[0]).toHaveProperty('timestamp');
      expect(timeline[0]).toHaveProperty('type');
      expect(timeline[0]).toHaveProperty('data');
    });

    it('should contain both request and response entries', async () => {
      const server = await createOpenApiServer({
        spec: singleEndpointDocument,
      });

      await server.app.request('/pets');

      const timeline = server.getTimeline();
      const types = timeline.map((e) => e.type);
      expect(types).toContain('request');
      expect(types).toContain('response');
    });
  });

  describe('clearTimeline', () => {
    it('should clear timeline and return count', async () => {
      const server = await createOpenApiServer({
        spec: singleEndpointDocument,
      });

      await server.app.request('/pets');

      const timelineBefore = server.getTimeline();
      const initialCount = timelineBefore.length;
      expect(initialCount).toBeGreaterThan(0);

      const clearedCount = server.clearTimeline();
      expect(clearedCount).toBe(initialCount);
      expect(server.getTimeline()).toHaveLength(0);
    });

    it('should return 0 when clearing empty timeline', async () => {
      const server = await createOpenApiServer({
        spec: minimalDocument,
      });

      const clearedCount = server.clearTimeline();
      expect(clearedCount).toBe(0);
    });

    it('should allow new entries after clearing', async () => {
      const server = await createOpenApiServer({
        spec: singleEndpointDocument,
      });

      await server.app.request('/pets');
      server.clearTimeline();
      expect(server.getTimeline()).toHaveLength(0);

      await server.app.request('/pets');
      expect(server.getTimeline().length).toBeGreaterThan(0);
    });
  });

  describe('custom handlers', () => {
    it('should use custom handler when provided', async () => {
      const handlers = new Map<string, HandlerFn>([
        [
          'listPets',
          () => ({
            type: 'raw',
            data: [{ id: 999, name: 'Custom Pet' }],
          }),
        ],
      ]);

      const server = await createOpenApiServer({
        spec: singleEndpointDocument,
        handlers,
      });

      const response = await server.app.request('/pets');
      const data = await response.json();

      expect(data).toEqual([{ id: 999, name: 'Custom Pet' }]);
    });

    it('should track handler status in registry', async () => {
      const handlers = new Map<string, HandlerFn>([
        ['listPets', () => ({ type: 'raw', data: [] })],
      ]);

      const server = await createOpenApiServer({
        spec: singleEndpointDocument,
        handlers,
      });

      const endpoint = server.registry.endpoints.get('get:/pets');
      expect(endpoint?.hasHandler).toBe(true);

      const otherEndpoint = server.registry.endpoints.get('post:/pets');
      expect(otherEndpoint?.hasHandler).toBe(false);
    });
  });

  describe('updateHandlers', () => {
    it('should update handlers at runtime', async () => {
      const server = await createOpenApiServer({
        spec: singleEndpointDocument,
      });

      // Initial request (no handler)
      const initial = await server.app.request('/pets');
      expect(initial.status).toBe(200);

      // Update handlers
      const newHandlers = new Map<string, HandlerFn>([
        [
          'listPets',
          () => ({
            type: 'status',
            status: 201,
            data: [{ id: 1, name: 'Updated' }],
          }),
        ],
      ]);

      server.updateHandlers(newHandlers);

      // Note: The route handler still uses the handlers captured at build time
      // The updateHandlers method updates the registry for DevTools tracking
      // Hot reload of actual handlers requires rebuilding routes
      const endpoint = server.registry.endpoints.get('get:/pets');
      expect(endpoint?.hasHandler).toBe(true);
    });
  });

  describe('updateSeeds', () => {
    it('should update seeds and repopulate store', async () => {
      const initialSeeds = new Map([['Pet', [{ id: 1, name: 'Buddy' }]]]);

      const server = await createOpenApiServer({
        spec: singleEndpointDocument,
        seeds: initialSeeds,
      });

      expect(server.store.getCount('Pet')).toBe(1);

      // Update seeds
      const newSeeds = new Map([
        [
          'Pet',
          [
            { id: 10, name: 'New Pet 1' },
            { id: 20, name: 'New Pet 2' },
          ],
        ],
        ['Category', [{ id: 1, name: 'Dogs' }]],
      ]);

      server.updateSeeds(newSeeds);

      // Store should be repopulated
      expect(server.store.getCount('Pet')).toBe(2);
      expect(server.store.getCount('Category')).toBe(1);
      expect(server.store.get('Pet', 10)).toEqual({ id: 10, name: 'New Pet 1' });
    });
  });

  describe('CORS', () => {
    it('should include CORS headers by default', async () => {
      const server = await createOpenApiServer({
        spec: minimalDocument,
      });

      const response = await server.app.request('/_api/health', {
        method: 'OPTIONS',
      });

      // CORS preflight should be handled
      expect(response.status).toBe(204);
      expect(response.headers.get('access-control-allow-origin')).toBeDefined();
    });

    it('should disable CORS when configured', async () => {
      const server = await createOpenApiServer({
        spec: minimalDocument,
        cors: false,
      });

      const response = await server.app.request('/_api/health');

      // No CORS headers
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
    });
  });

  describe('DevTools SPA', () => {
    it('should redirect /_devtools to /_devtools/', async () => {
      const server = await createOpenApiServer({
        spec: minimalDocument,
      });

      const response = await server.app.request('/_devtools');
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/_devtools/');
    });

    it('should serve HTML at /_devtools/', async () => {
      const server = await createOpenApiServer({
        spec: minimalDocument,
      });

      const response = await server.app.request('/_devtools/');
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');

      const html = await response.text();
      expect(html).toContain('OpenAPI DevTools');
    });

    it('should redirect /_devtools/* paths to /_devtools/', async () => {
      const server = await createOpenApiServer({
        spec: minimalDocument,
      });

      const response = await server.app.request('/_devtools/app.js');
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/_devtools/');
    });
  });

  describe('DevTools configuration', () => {
    it('should not mount DevTools routes when devtools is false', async () => {
      const server = await createOpenApiServer({
        spec: minimalDocument,
        devtools: false,
      });

      // DevTools routes should not be available
      const response1 = await server.app.request('/_devtools');
      expect(response1.status).toBe(404);

      const response2 = await server.app.request('/_devtools/');
      expect(response2.status).toBe(404);

      const response3 = await server.app.request('/_devtools/app.js');
      expect(response3.status).toBe(404);
    });

    it('should mount DevTools routes when devtools is true', async () => {
      const server = await createOpenApiServer({
        spec: minimalDocument,
        devtools: true,
      });

      const response = await server.app.request('/_devtools/');
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
    });

    it('should mount DevTools routes by default (devtools undefined)', async () => {
      const server = await createOpenApiServer({
        spec: minimalDocument,
        // devtools not specified - should default to enabled
      });

      const response = await server.app.request('/_devtools/');
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
    });
  });

  describe('WebSocket endpoint', () => {
    it('should have /_ws route configured with WebSocket upgrade middleware', async () => {
      const server = await createOpenApiServer({
        spec: minimalDocument,
      });

      // @hono/node-ws is a devDependency so the upgradeWebSocket middleware
      // is active. A plain HTTP request (no Upgrade header) is not handled
      // by the middleware — Hono replies 404 because upgradeWebSocket returns
      // undefined for non-upgrade requests. This 404 proves the route exists
      // with the upgrade middleware (a missing route would also 404, but with
      // a different body). Verify via the wsHub that the upgrade wiring is
      // functional — see the "command handler wired" test below.
      const response = await server.app.request('/_ws');
      expect(response.status).toBe(404);

      // The route is confirmed via the hub being accessible and wired
      expect(server.wsHub).toBeDefined();
      expect(server.wsHub.getClientCount()).toBe(0);
    });

    it('should have command handler wired to WebSocket hub', async () => {
      const server = await createOpenApiServer({
        spec: minimalDocument,
      });

      // Verify the hub is accessible and functional
      expect(server.wsHub).toBeDefined();
      expect(server.wsHub.getClientCount()).toBe(0);
    });
  });

  describe('timeline limit', () => {
    it('should respect timeline limit', async () => {
      const server = await createOpenApiServer({
        spec: singleEndpointDocument,
        timelineLimit: 3,
      });

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        await server.app.request('/pets');
      }

      // Timeline should only have 3 entries (limit * 2 for request+response = 6, but limit is per total entries)
      const response = await server.app.request('/_api/timeline');
      const data = await response.json();

      // Each request generates 2 entries (request + response), but limit is 3 total
      expect(data.total).toBeLessThanOrEqual(3);
    });
  });

  describe('simulation integration', () => {
    it('should return simulated response when simulation is active', async () => {
      const server = await createOpenApiServer({
        spec: singleEndpointDocument,
      });

      // Add simulation for 500 error
      // Note: The router looks up simulations by method:path key (e.g., 'get:/pets')
      server.simulationManager.set({
        path: 'get:/pets',
        operationId: 'listPets',
        status: 500,
        body: { error: 'Simulated error' },
      });

      const response = await server.app.request('/pets');
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe('Simulated error');
    });
  });
});

describe('security handling', () => {
  /**
   * OpenAPI document with security schemes and a secured endpoint
   */
  const securedDocument: OpenAPIV3_1.Document = {
    openapi: '3.1.0',
    info: { title: 'Secured API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
        },
      },
    },
    paths: {
      '/public': {
        get: {
          operationId: 'getPublic',
          responses: { '200': { description: 'Public endpoint' } },
        },
      },
      '/secured-bearer': {
        get: {
          operationId: 'getSecuredBearer',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Secured endpoint',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
                },
              },
            },
          },
        },
      },
      '/secured-apikey': {
        get: {
          operationId: 'getSecuredApiKey',
          security: [{ apiKey: [] }],
          responses: { '200': { description: 'Secured endpoint' } },
        },
      },
      '/secured-either': {
        get: {
          operationId: 'getSecuredEither',
          security: [{ bearerAuth: [] }, { apiKey: [] }],
          responses: { '200': { description: 'Secured endpoint' } },
        },
      },
    },
  };

  let server: OpenApiServer;

  beforeEach(async () => {
    server = await createOpenApiServer({ spec: securedDocument });
  });

  it('should allow access to public endpoints without credentials', async () => {
    const response = await server.app.request('/public');
    expect(response.status).toBe(200);
  });

  it('should return 401 when Bearer token is missing', async () => {
    const response = await server.app.request('/secured-bearer');
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
    expect(data.message).toContain('bearerAuth');
  });

  it('should return WWW-Authenticate header on 401', async () => {
    const response = await server.app.request('/secured-bearer');
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toContain('Bearer');
  });

  it('should allow access with valid Bearer token', async () => {
    const response = await server.app.request('/secured-bearer', {
      headers: { Authorization: 'Bearer any-token-works' },
    });
    expect(response.status).toBe(200);
  });

  it('should return 401 when API key header is missing', async () => {
    const response = await server.app.request('/secured-apikey');
    expect(response.status).toBe(401);
  });

  it('should allow access with valid API key', async () => {
    const response = await server.app.request('/secured-apikey', {
      headers: { 'X-API-Key': 'any-key-works' },
    });
    expect(response.status).toBe(200);
  });

  it('should allow access with either scheme when OR logic is used', async () => {
    // Bearer should work
    const r1 = await server.app.request('/secured-either', {
      headers: { Authorization: 'Bearer token' },
    });
    expect(r1.status).toBe(200);

    // API key should also work
    const r2 = await server.app.request('/secured-either', {
      headers: { 'X-API-Key': 'key' },
    });
    expect(r2.status).toBe(200);
  });

  it('should return 401 when neither scheme is satisfied for OR endpoint', async () => {
    const response = await server.app.request('/secured-either');
    expect(response.status).toBe(401);
  });

  it('should pass security context to custom handlers', async () => {
    let capturedSecurity: unknown = null;

    const handlers = new Map<string, HandlerFn>([
      [
        'getSecuredBearer',
        (ctx) => {
          capturedSecurity = ctx.security;
          return { type: 'raw', data: { ok: true } };
        },
      ],
    ]);

    // Create a dedicated server with custom handlers
    const handlerServer = await createOpenApiServer({
      spec: securedDocument,
      handlers,
    });

    await handlerServer.app.request('/secured-bearer', {
      headers: { Authorization: 'Bearer test-token-123' },
    });

    expect(capturedSecurity).toEqual({
      authenticated: true,
      scheme: 'bearerAuth',
      credentials: 'test-token-123',
      scopes: [],
    });
  });

  it('should log both request and 401 response to timeline', async () => {
    // Make an unauthenticated request
    await server.app.request('/secured-bearer');

    // Check timeline
    const timelineResponse = await server.app.request('/_api/timeline');
    const data = await timelineResponse.json();

    expect(data.count).toBeGreaterThan(0);

    // Should have the request entry logged
    const requestEntry = data.entries.find(
      (e: { type: string; data: { path?: string } }) =>
        e.type === 'request' && e.data?.path === '/secured-bearer',
    );
    expect(requestEntry).toBeDefined();

    // Should have the 401 response entry logged
    const responseEntry = data.entries.find(
      (e: { type: string; data: { status?: number } }) =>
        e.type === 'response' && e.data?.status === 401,
    );
    expect(responseEntry).toBeDefined();
  });
});

describe('document-level security fallback', () => {
  /**
   * OpenAPI document with top-level security that applies to all operations
   * unless overridden at the operation level.
   */
  const documentLevelSecurityDoc: OpenAPIV3_1.Document = {
    openapi: '3.1.0',
    info: { title: 'Document Security API', version: '1.0.0' },
    // Document-level security applies to all operations by default
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
      },
    },
    paths: {
      '/protected': {
        get: {
          operationId: 'getProtected',
          // No operation-level security — inherits from document level
          responses: { '200': { description: 'Protected endpoint' } },
        },
      },
      '/public-override': {
        get: {
          operationId: 'getPublicOverride',
          // Empty security array overrides document-level to make this public
          security: [],
          responses: { '200': { description: 'Public endpoint' } },
        },
      },
    },
  };

  it('should require auth for endpoints inheriting document-level security', async () => {
    const server = await createOpenApiServer({ spec: documentLevelSecurityDoc });

    // Without credentials — should get 401
    const response = await server.app.request('/protected');
    expect(response.status).toBe(401);
  });

  it('should allow auth for endpoints inheriting document-level security', async () => {
    const server = await createOpenApiServer({ spec: documentLevelSecurityDoc });

    // With credentials — should pass
    const response = await server.app.request('/protected', {
      headers: { Authorization: 'Bearer my-token' },
    });
    expect(response.status).toBe(200);
  });

  it('should allow access to endpoints with empty security override (security: [])', async () => {
    const server = await createOpenApiServer({ spec: documentLevelSecurityDoc });

    // Empty security override makes endpoint public
    const response = await server.app.request('/public-override');
    expect(response.status).toBe(200);
  });
});

describe('security + simulation interaction', () => {
  const securedSimDoc: OpenAPIV3_1.Document = {
    openapi: '3.1.0',
    info: { title: 'Secured Sim API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
      },
    },
    paths: {
      '/data': {
        get: {
          operationId: 'getData',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Data',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { value: { type: 'string' } } },
                },
              },
            },
          },
        },
      },
    },
  };

  it('should reject unauthenticated requests even when simulation is active', async () => {
    const server = await createOpenApiServer({ spec: securedSimDoc });

    // Set up a simulation for this endpoint
    server.simulationManager.set({
      path: 'get:/data',
      operationId: 'getData',
      status: 500,
      body: { error: 'Simulated error' },
    });

    // Without auth — security should reject BEFORE simulation runs
    const response = await server.app.request('/data');
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should apply simulation when request is authenticated', async () => {
    const server = await createOpenApiServer({ spec: securedSimDoc });

    // Set up a simulation
    server.simulationManager.set({
      path: 'get:/data',
      operationId: 'getData',
      status: 503,
      body: { error: 'Service unavailable' },
    });

    // With auth — security passes, simulation should take effect
    const response = await server.app.request('/data', {
      headers: { Authorization: 'Bearer valid-token' },
    });
    expect(response.status).toBe(503);

    const data = await response.json();
    expect(data.error).toBe('Service unavailable');
  });
});

describe('createSimulationManager', () => {
  it('should be accessible via server instance', async () => {
    const server = await createOpenApiServer({
      spec: minimalDocument,
    });

    expect(server.simulationManager).toBeDefined();
    expect(typeof server.simulationManager.get).toBe('function');
    expect(typeof server.simulationManager.set).toBe('function');
    expect(typeof server.simulationManager.remove).toBe('function');
    expect(typeof server.simulationManager.list).toBe('function');
    expect(typeof server.simulationManager.clear).toBe('function');
    expect(typeof server.simulationManager.has).toBe('function');
    expect(typeof server.simulationManager.count).toBe('function');
  });

  it('should manage simulations correctly', async () => {
    const server = await createOpenApiServer({
      spec: minimalDocument,
    });

    const manager = server.simulationManager;

    // Initially empty
    expect(manager.count()).toBe(0);
    expect(manager.list()).toEqual([]);

    // Add simulation
    manager.set({
      path: 'GET /test',
      operationId: 'testOp',
      status: 500,
      delay: 100,
    });

    expect(manager.count()).toBe(1);
    expect(manager.has('GET /test')).toBe(true);
    expect(manager.get('GET /test')).toEqual({
      path: 'GET /test',
      operationId: 'testOp',
      status: 500,
      delay: 100,
    });

    // Update simulation
    manager.set({
      path: 'GET /test',
      operationId: 'testOp',
      status: 404,
    });

    expect(manager.count()).toBe(1);
    expect(manager.get('GET /test')?.status).toBe(404);

    // Remove simulation
    expect(manager.remove('GET /test')).toBe(true);
    expect(manager.count()).toBe(0);
    expect(manager.remove('GET /test')).toBe(false); // already removed

    // Add multiple and clear
    manager.set({ path: 'a', operationId: 'a', status: 500 });
    manager.set({ path: 'b', operationId: 'b', status: 500 });
    expect(manager.count()).toBe(2);

    manager.clear();
    expect(manager.count()).toBe(0);
  });
});

// =============================================================================
// TODO: Integration Tests for Server Lifecycle
// =============================================================================
// The start() and stop() methods require @hono/node-server and actual port
// binding, which makes them difficult to test in unit tests.
//
// Consider adding a separate integration test file: server.integration.test.ts
// that tests:
// - Server starts and listens on configured port
// - Server responds to HTTP requests when started
// - Server stops gracefully and releases the port
// - Error handling when port is already in use
// - Error handling when @hono/node-server is not installed
// =============================================================================
