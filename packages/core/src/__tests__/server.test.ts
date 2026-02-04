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
      expect(html).toContain('<div id="app">');
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

  describe('WebSocket placeholder', () => {
    it('should respond to /_ws', async () => {
      const server = await createOpenApiServer({
        spec: minimalDocument,
      });

      const response = await server.app.request('/_ws');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.message).toContain('WebSocket');
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
      // Note: The router looks up simulations by the OpenAPI path (e.g., '/pets')
      server.simulationManager.set({
        path: '/pets',
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
