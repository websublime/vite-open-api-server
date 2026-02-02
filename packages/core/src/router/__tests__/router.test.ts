/**
 * Router Module Tests
 *
 * Tests for path converter, registry builder, and route builder components.
 */

import type { OpenAPIV3_1 } from '@scalar/openapi-types';
import { describe, expect, it, vi } from 'vitest';

import { createStore } from '../../store/store.js';
import { convertOpenApiPath } from '../path-converter.js';
import { buildRegistry, updateRegistryHandlers, updateRegistrySeeds } from '../registry-builder.js';
import { buildRoutes } from '../route-builder.js';
import { createEndpointKey, parseEndpointKey } from '../types.js';

// =============================================================================
// Path Converter Tests
// =============================================================================

describe('convertOpenApiPath', () => {
  it('should convert single path parameter', () => {
    expect(convertOpenApiPath('/pet/{petId}')).toBe('/pet/:petId');
  });

  it('should convert multiple path parameters', () => {
    expect(convertOpenApiPath('/store/{storeId}/order/{orderId}')).toBe(
      '/store/:storeId/order/:orderId',
    );
  });

  it('should handle paths without parameters', () => {
    expect(convertOpenApiPath('/pets')).toBe('/pets');
    expect(convertOpenApiPath('/users/list')).toBe('/users/list');
  });

  it('should handle root path', () => {
    expect(convertOpenApiPath('/')).toBe('/');
  });

  it('should handle path with parameter at end', () => {
    expect(convertOpenApiPath('/api/v1/users/{userId}')).toBe('/api/v1/users/:userId');
  });

  it('should handle complex parameter names', () => {
    expect(convertOpenApiPath('/users/{user_id}/posts/{post-id}')).toBe(
      '/users/:user_id/posts/:post-id',
    );
  });
});

// =============================================================================
// Endpoint Key Tests
// =============================================================================

describe('EndpointKey utilities', () => {
  describe('createEndpointKey', () => {
    it('should create a valid endpoint key', () => {
      expect(createEndpointKey('get', '/pets')).toBe('get:/pets');
      expect(createEndpointKey('post', '/users')).toBe('post:/users');
      expect(createEndpointKey('delete', '/pet/{petId}')).toBe('delete:/pet/{petId}');
    });
  });

  describe('parseEndpointKey', () => {
    it('should parse endpoint key correctly', () => {
      const result = parseEndpointKey('get:/pets');
      expect(result.method).toBe('get');
      expect(result.path).toBe('/pets');
    });

    it('should handle paths with colons', () => {
      // Edge case: path contains a colon
      const result = parseEndpointKey('get:/api:v2/users');
      expect(result.method).toBe('get');
      expect(result.path).toBe('/api:v2/users');
    });

    it('should handle all HTTP methods', () => {
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'] as const;
      for (const method of methods) {
        const result = parseEndpointKey(`${method}:/test`);
        expect(result.method).toBe(method);
        expect(result.path).toBe('/test');
      }
    });
  });
});

// =============================================================================
// Registry Builder Tests
// =============================================================================

describe('buildRegistry', () => {
  const createMinimalDoc = (paths: OpenAPIV3_1.PathsObject = {}): OpenAPIV3_1.Document => ({
    openapi: '3.1.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths,
  });

  it('should create an empty registry for empty document', () => {
    const doc = createMinimalDoc({});
    const registry = buildRegistry(doc);

    expect(registry.endpoints.size).toBe(0);
    expect(registry.byTag.size).toBe(0);
    expect(registry.byPath.size).toBe(0);
    expect(registry.stats.totalEndpoints).toBe(0);
  });

  it('should register a single endpoint', () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: { '200': { description: 'Success' } },
        },
      },
    });

    const registry = buildRegistry(doc);

    expect(registry.endpoints.size).toBe(1);
    expect(registry.endpoints.has('get:/pets')).toBe(true);

    const endpoint = registry.endpoints.get('get:/pets');
    expect(endpoint?.operationId).toBe('getPets');
    expect(endpoint?.method).toBe('get');
    expect(endpoint?.path).toBe('/pets');
  });

  it('should register multiple methods for same path', () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: { '200': { description: 'Success' } },
        },
        post: {
          operationId: 'createPet',
          responses: { '201': { description: 'Created' } },
        },
      },
    });

    const registry = buildRegistry(doc);

    expect(registry.endpoints.size).toBe(2);
    expect(registry.endpoints.has('get:/pets')).toBe(true);
    expect(registry.endpoints.has('post:/pets')).toBe(true);
    expect(registry.byPath.get('/pets')?.length).toBe(2);
  });

  it('should generate operationId if not provided', () => {
    const doc = createMinimalDoc({
      '/pet/{petId}': {
        get: {
          responses: { '200': { description: 'Success' } },
        },
      },
    });

    const registry = buildRegistry(doc);
    const endpoint = registry.endpoints.get('get:/pet/{petId}');

    expect(endpoint?.operationId).toBe('getPetPetId');
  });

  it('should index by tags', () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          tags: ['pet'],
          responses: { '200': { description: 'Success' } },
        },
      },
      '/users': {
        get: {
          operationId: 'getUsers',
          tags: ['user'],
          responses: { '200': { description: 'Success' } },
        },
      },
    });

    const registry = buildRegistry(doc);

    expect(registry.byTag.has('pet')).toBe(true);
    expect(registry.byTag.has('user')).toBe(true);
    expect(registry.byTag.get('pet')?.length).toBe(1);
    expect(registry.byTag.get('user')?.length).toBe(1);
  });

  it('should use "default" tag when none provided', () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: { '200': { description: 'Success' } },
        },
      },
    });

    const registry = buildRegistry(doc);

    expect(registry.byTag.has('default')).toBe(true);
    expect(registry.byTag.get('default')?.length).toBe(1);
  });

  it('should track handler status', () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: { '200': { description: 'Success' } },
        },
        post: {
          operationId: 'createPet',
          responses: { '201': { description: 'Created' } },
        },
      },
    });

    const registry = buildRegistry(doc, {
      handlerOperationIds: new Set(['getPets']),
    });

    expect(registry.endpoints.get('get:/pets')?.hasHandler).toBe(true);
    expect(registry.endpoints.get('post:/pets')?.hasHandler).toBe(false);
    expect(registry.stats.withCustomHandler).toBe(1);
  });

  it('should extract response schema name from title', () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { title: 'Pet', type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    });

    const registry = buildRegistry(doc);
    const endpoint = registry.endpoints.get('get:/pets');

    expect(endpoint?.responseSchema).toBe('Pet');
  });

  it('should track seed status based on response schema', () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: { title: 'Pet', type: 'object' },
                },
              },
            },
          },
        },
      },
    });

    const registry = buildRegistry(doc, {
      seedSchemaNames: new Set(['Pet']),
    });

    expect(registry.endpoints.get('get:/pets')?.hasSeed).toBe(true);
    expect(registry.stats.withCustomSeed).toBe(1);
  });

  it('should extract security requirements from operation', () => {
    const doc: OpenAPIV3_1.Document = {
      openapi: '3.1.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/pets': {
          get: {
            operationId: 'getPets',
            security: [{ api_key: [] }, { oauth2: ['read:pets'] }],
            responses: { '200': { description: 'Success' } },
          },
        },
      },
    };

    const registry = buildRegistry(doc);
    const endpoint = registry.endpoints.get('get:/pets');

    expect(endpoint?.security).toHaveLength(2);
    expect(endpoint?.security[0]).toEqual({ name: 'api_key', scopes: [] });
    expect(endpoint?.security[1]).toEqual({ name: 'oauth2', scopes: ['read:pets'] });
  });

  it('should calculate stats correctly', () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: { title: 'Pet', type: 'object' },
                },
              },
            },
          },
        },
        post: {
          operationId: 'createPet',
          responses: { '201': { description: 'Created' } },
        },
      },
      '/users': {
        get: {
          operationId: 'getUsers',
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: { title: 'User', type: 'object' },
                },
              },
            },
          },
        },
      },
    });

    const registry = buildRegistry(doc, {
      handlerOperationIds: new Set(['getPets']),
      seedSchemaNames: new Set(['User']),
    });

    expect(registry.stats.totalEndpoints).toBe(3);
    expect(registry.stats.withCustomHandler).toBe(1);
    expect(registry.stats.withCustomSeed).toBe(1);
    expect(registry.stats.totalSchemas).toBe(2);
  });
});

describe('updateRegistryHandlers', () => {
  it('should update handler status for existing endpoints', () => {
    const doc: OpenAPIV3_1.Document = {
      openapi: '3.1.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/pets': {
          get: {
            operationId: 'getPets',
            responses: { '200': { description: 'Success' } },
          },
          post: {
            operationId: 'createPet',
            responses: { '201': { description: 'Created' } },
          },
        },
      },
    };

    const registry = buildRegistry(doc);
    expect(registry.endpoints.get('get:/pets')?.hasHandler).toBe(false);
    expect(registry.endpoints.get('post:/pets')?.hasHandler).toBe(false);

    updateRegistryHandlers(registry, new Set(['getPets', 'createPet']));

    expect(registry.endpoints.get('get:/pets')?.hasHandler).toBe(true);
    expect(registry.endpoints.get('post:/pets')?.hasHandler).toBe(true);
    expect(registry.stats.withCustomHandler).toBe(2);
  });
});

describe('updateRegistrySeeds', () => {
  it('should update seed status for existing endpoints', () => {
    const doc: OpenAPIV3_1.Document = {
      openapi: '3.1.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/pets': {
          get: {
            operationId: 'getPets',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: { title: 'Pet', type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    };

    const registry = buildRegistry(doc);
    expect(registry.endpoints.get('get:/pets')?.hasSeed).toBe(false);

    updateRegistrySeeds(registry, new Set(['Pet']));

    expect(registry.endpoints.get('get:/pets')?.hasSeed).toBe(true);
    expect(registry.stats.withCustomSeed).toBe(1);
  });
});

// =============================================================================
// Route Builder Tests
// =============================================================================

describe('buildRoutes', () => {
  const createMinimalDoc = (paths: OpenAPIV3_1.PathsObject = {}): OpenAPIV3_1.Document => ({
    openapi: '3.1.0',
    info: { title: 'Test API', version: '1.0.0' },
    paths,
  });

  it('should create a Hono app with routes', () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: { '200': { description: 'Success' } },
        },
      },
    });

    const store = createStore();
    const { app, registry } = buildRoutes(doc, { store });

    expect(app).toBeDefined();
    expect(registry.endpoints.size).toBe(1);
  });

  it('should return registry with endpoints', () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: { '200': { description: 'Success' } },
        },
        post: {
          operationId: 'createPet',
          responses: { '201': { description: 'Created' } },
        },
      },
    });

    const store = createStore();
    const { registry } = buildRoutes(doc, { store });

    expect(registry.endpoints.has('get:/pets')).toBe(true);
    expect(registry.endpoints.has('post:/pets')).toBe(true);
  });

  it('should call onRequest callback when request is made', async () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: { '200': { description: 'Success' } },
        },
      },
    });

    const onRequest = vi.fn();
    const store = createStore();
    const { app } = buildRoutes(doc, { store, onRequest });

    const response = await app.request('/pets', { method: 'GET' });

    expect(response.status).toBe(200);
    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/pets',
        operationId: 'getPets',
      }),
    );
  });

  it('should call onResponse callback when response is sent', async () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: { '200': { description: 'Success' } },
        },
      },
    });

    const onResponse = vi.fn();
    const store = createStore();
    const { app } = buildRoutes(doc, { store, onResponse });

    await app.request('/pets', { method: 'GET' });

    expect(onResponse).toHaveBeenCalledTimes(1);
    expect(onResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 200,
        simulated: false,
      }),
    );
  });

  it('should use custom handler when provided', async () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: { '200': { description: 'Success' } },
        },
      },
    });

    const handlers = new Map([
      [
        'getPets',
        () => ({
          type: 'raw' as const,
          data: [{ id: 1, name: 'Custom Pet' }],
        }),
      ],
    ]);

    const store = createStore();
    const { app } = buildRoutes(doc, { store, handlers });

    const response = await app.request('/pets', { method: 'GET' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([{ id: 1, name: 'Custom Pet' }]);
  });

  it('should handle custom handler with status code', async () => {
    const doc = createMinimalDoc({
      '/pets/{petId}': {
        get: {
          operationId: 'getPetById',
          responses: { '200': { description: 'Success' } },
        },
      },
    });

    const handlers = new Map([
      [
        'getPetById',
        () => ({
          type: 'status' as const,
          status: 404,
          data: { error: 'Pet not found' },
        }),
      ],
    ]);

    const store = createStore();
    const { app } = buildRoutes(doc, { store, handlers });

    const response = await app.request('/pets/999', { method: 'GET' });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: 'Pet not found' });
  });

  it('should return example from OpenAPI spec when available', async () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  example: [{ id: 1, name: 'Example Pet' }],
                },
              },
            },
          },
        },
      },
    });

    const store = createStore();
    const { app } = buildRoutes(doc, { store });

    const response = await app.request('/pets', { method: 'GET' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([{ id: 1, name: 'Example Pet' }]);
  });

  it('should use seed data when available', async () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { title: 'Pet', type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    });

    const seeds = new Map([
      [
        'Pet',
        [
          { id: 1, name: 'Seed Pet 1' },
          { id: 2, name: 'Seed Pet 2' },
        ],
      ],
    ]);

    const store = createStore();
    const { app } = buildRoutes(doc, { store, seeds });

    const response = await app.request('/pets', { method: 'GET' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([
      { id: 1, name: 'Seed Pet 1' },
      { id: 2, name: 'Seed Pet 2' },
    ]);
  });

  it('should generate placeholder data when no example or seed', async () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
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
    });

    const store = createStore();
    const { app } = buildRoutes(doc, { store });

    const response = await app.request('/pets', { method: 'GET' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('name');
    expect(typeof body.id).toBe('number');
    expect(typeof body.name).toBe('string');
  });

  it('should handle POST requests with body', async () => {
    const doc = createMinimalDoc({
      '/pets': {
        post: {
          operationId: 'createPet',
          responses: { '201': { description: 'Created' } },
        },
      },
    });

    const onRequest = vi.fn();
    const handlers = new Map([
      [
        'createPet',
        (ctx: { req: { body: unknown } }) => ({
          type: 'status' as const,
          status: 201,
          data: ctx.req.body,
        }),
      ],
    ]);

    const store = createStore();
    const { app } = buildRoutes(doc, { store, handlers, onRequest });

    const response = await app.request('/pets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Pet' }),
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ name: 'New Pet' });
    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        body: { name: 'New Pet' },
      }),
    );
  });

  it('should handle path parameters', async () => {
    const doc = createMinimalDoc({
      '/pets/{petId}': {
        get: {
          operationId: 'getPetById',
          responses: { '200': { description: 'Success' } },
        },
      },
    });

    const handlers = new Map([
      [
        'getPetById',
        (ctx: { req: { params: Record<string, string> } }) => ({
          type: 'raw' as const,
          data: { id: ctx.req.params.petId },
        }),
      ],
    ]);

    const store = createStore();
    const { app } = buildRoutes(doc, { store, handlers });

    const response = await app.request('/pets/123', { method: 'GET' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ id: '123' });
  });

  it('should handle query parameters', async () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: { '200': { description: 'Success' } },
        },
      },
    });

    const handlers = new Map([
      [
        'getPets',
        (ctx: { req: { query: Record<string, string | string[]> } }) => ({
          type: 'raw' as const,
          data: { status: ctx.req.query.status },
        }),
      ],
    ]);

    const store = createStore();
    const { app } = buildRoutes(doc, { store, handlers });

    const response = await app.request('/pets?status=available', { method: 'GET' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: 'available' });
  });

  it('should provide store access to handlers', async () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: { '200': { description: 'Success' } },
        },
      },
    });

    const store = createStore();
    store.create('Pet', { id: 1, name: 'Store Pet' });

    const handlers = new Map([
      [
        'getPets',
        (ctx: { store: typeof store }) => ({
          type: 'raw' as const,
          data: ctx.store.list('Pet'),
        }),
      ],
    ]);

    const { app } = buildRoutes(doc, { store, handlers });

    const response = await app.request('/pets', { method: 'GET' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([{ id: 1, name: 'Store Pet' }]);
  });

  it('should handle handler errors gracefully', async () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: { '200': { description: 'Success' } },
        },
      },
    });

    const handlers = new Map([
      [
        'getPets',
        () => {
          throw new Error('Handler crashed');
        },
      ],
    ]);

    const logger = {
      log: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const store = createStore();
    const { app } = buildRoutes(doc, { store, handlers, logger });

    const response = await app.request('/pets', { method: 'GET' });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: 'Handler execution failed',
      message: 'Handler crashed',
    });
    expect(logger.error).toHaveBeenCalled();
  });

  it('should track request and response with matching IDs', async () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: { '200': { description: 'Success' } },
        },
      },
    });

    let capturedRequestId: string | undefined;
    const onRequest = vi.fn((entry) => {
      capturedRequestId = entry.id;
    });
    const onResponse = vi.fn();

    const store = createStore();
    const { app } = buildRoutes(doc, { store, onRequest, onResponse });

    await app.request('/pets', { method: 'GET' });

    expect(capturedRequestId).toBeDefined();
    expect(onResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: capturedRequestId,
      }),
    );
  });

  it('should track response duration', async () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: { '200': { description: 'Success' } },
        },
      },
    });

    const onResponse = vi.fn();

    const store = createStore();
    const { app } = buildRoutes(doc, { store, onResponse });

    await app.request('/pets', { method: 'GET' });

    expect(onResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: expect.any(Number),
      }),
    );
    expect(onResponse.mock.calls[0][0].duration).toBeGreaterThanOrEqual(0);
  });

  it('should handle multiple HTTP methods', async () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: { operationId: 'getPets', responses: { '200': { description: 'Success' } } },
        post: { operationId: 'createPet', responses: { '201': { description: 'Created' } } },
        put: { operationId: 'updatePets', responses: { '200': { description: 'Success' } } },
        patch: { operationId: 'patchPets', responses: { '200': { description: 'Success' } } },
        delete: { operationId: 'deletePets', responses: { '204': { description: 'Deleted' } } },
      },
    });

    const store = createStore();
    const { app, registry } = buildRoutes(doc, { store });

    expect(registry.endpoints.size).toBe(5);

    // Test each method
    expect((await app.request('/pets', { method: 'GET' })).status).toBe(200);
    expect((await app.request('/pets', { method: 'POST' })).status).toBe(200);
    expect((await app.request('/pets', { method: 'PUT' })).status).toBe(200);
    expect((await app.request('/pets', { method: 'PATCH' })).status).toBe(200);
    expect((await app.request('/pets', { method: 'DELETE' })).status).toBe(200);
  });

  it('should handle enum values in generated data', async () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        enum: ['available', 'pending', 'sold'],
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

    const store = createStore();
    const { app } = buildRoutes(doc, { store });

    const response = await app.request('/pets', { method: 'GET' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('available'); // First enum value
  });

  it('should handle default values in schema', async () => {
    const doc = createMinimalDoc({
      '/pets': {
        get: {
          operationId: 'getPets',
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        default: 'available',
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

    const store = createStore();
    const { app } = buildRoutes(doc, { store });

    const response = await app.request('/pets', { method: 'GET' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('available');
  });
});
