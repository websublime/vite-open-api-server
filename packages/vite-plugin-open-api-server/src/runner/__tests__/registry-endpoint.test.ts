/**
 * Registry Endpoint Integration Tests
 *
 * Tests for the /_openapiserver/registry endpoint that provides
 * introspection of the mock server's endpoint registry.
 *
 * These tests simulate the Hono app setup used by the runner
 * to verify the endpoint behavior without spawning a child process.
 *
 * @module
 */

import { Hono } from 'hono';
import type { OpenAPIV3_1 } from 'openapi-types';
import { describe, expect, it } from 'vitest';

import { buildRegistry } from '../../registry/registry-builder.js';
import { serializeRegistry } from '../../registry/registry-serializer.js';
import type { OpenApiEndpointRegistry } from '../../types/registry.js';

/**
 * Create a minimal valid OpenAPI 3.1 document for testing.
 */
function createTestSpec(overrides?: Partial<OpenAPIV3_1.Document>): OpenAPIV3_1.Document {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
    },
    paths: {
      '/pets': {
        get: {
          operationId: 'listPets',
          summary: 'List all pets',
          tags: ['pets'],
          responses: {
            '200': { description: 'OK' },
          },
        },
        post: {
          operationId: 'createPet',
          summary: 'Create a pet',
          tags: ['pets'],
          responses: {
            '201': { description: 'Created' },
          },
        },
      },
      '/pets/{petId}': {
        get: {
          operationId: 'getPetById',
          summary: 'Get a pet by ID',
          tags: ['pets'],
          parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': { description: 'OK' },
            '404': { description: 'Not found' },
          },
        },
      },
    },
    components: {
      schemas: {
        Pet: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'integer', format: 'int64' },
            name: { type: 'string' },
            status: { type: 'string', enum: ['available', 'pending', 'sold'] },
          },
        },
        Error: {
          type: 'object',
          properties: {
            code: { type: 'integer' },
            message: { type: 'string' },
          },
        },
      },
      securitySchemes: {
        api_key: {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    ...overrides,
  };
}

/**
 * Create a mock logger for testing.
 */
function createMockLogger() {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
    warnOnce: () => {},
    clearScreen: () => {},
    hasWarned: false,
    hasErrorLogged: () => false,
  };
}

/**
 * Create a Hono app with the registry endpoint configured.
 * This simulates what openapi-server-runner.mts does.
 */
function createAppWithRegistryEndpoint(
  spec: OpenAPIV3_1.Document,
  registry: OpenApiEndpointRegistry,
  port = 3001,
): Hono {
  const app = new Hono();

  app.get('/_openapiserver/registry', (c) => {
    const serialized = serializeRegistry(registry, {
      spec,
      port,
      version: '1.0.0',
    });

    return c.json(serialized, 200);
  });

  return app;
}

describe('Registry Endpoint', () => {
  describe('GET /_openapiserver/registry', () => {
    it('should return 200 status code', async () => {
      const spec = createTestSpec();
      const logger = createMockLogger();
      const { registry } = buildRegistry(spec, logger as Parameters<typeof buildRegistry>[1]);

      const app = createAppWithRegistryEndpoint(spec, registry);

      const response = await app.request('/_openapiserver/registry');

      expect(response.status).toBe(200);
    });

    it('should return Content-Type application/json', async () => {
      const spec = createTestSpec();
      const logger = createMockLogger();
      const { registry } = buildRegistry(spec, logger as Parameters<typeof buildRegistry>[1]);

      const app = createAppWithRegistryEndpoint(spec, registry);

      const response = await app.request('/_openapiserver/registry');

      expect(response.headers.get('Content-Type')).toContain('application/json');
    });

    it('should return valid JSON response', async () => {
      const spec = createTestSpec();
      const logger = createMockLogger();
      const { registry } = buildRegistry(spec, logger as Parameters<typeof buildRegistry>[1]);

      const app = createAppWithRegistryEndpoint(spec, registry);

      const response = await app.request('/_openapiserver/registry');
      const body = await response.json();

      expect(body).toBeDefined();
      expect(typeof body).toBe('object');
    });

    it('should include meta object with required fields', async () => {
      const spec = createTestSpec();
      const logger = createMockLogger();
      const { registry } = buildRegistry(spec, logger as Parameters<typeof buildRegistry>[1]);

      const app = createAppWithRegistryEndpoint(spec, registry, 4000);

      const response = await app.request('/_openapiserver/registry');
      const body = await response.json();

      expect(body.meta).toBeDefined();
      expect(body.meta.version).toBe('1.0.0');
      expect(body.meta.openApiVersion).toBe('3.1.0');
      expect(body.meta.specTitle).toBe('Test API');
      expect(body.meta.specVersion).toBe('1.0.0');
      expect(body.meta.port).toBe(4000);
      expect(body.meta.timestamp).toBeDefined();
    });

    it('should include endpoints array', async () => {
      const spec = createTestSpec();
      const logger = createMockLogger();
      const { registry } = buildRegistry(spec, logger as Parameters<typeof buildRegistry>[1]);

      const app = createAppWithRegistryEndpoint(spec, registry);

      const response = await app.request('/_openapiserver/registry');
      const body = await response.json();

      expect(body.endpoints).toBeDefined();
      expect(Array.isArray(body.endpoints)).toBe(true);
    });

    it('should include correct endpoint count', async () => {
      const spec = createTestSpec();
      const logger = createMockLogger();
      const { registry } = buildRegistry(spec, logger as Parameters<typeof buildRegistry>[1]);

      const app = createAppWithRegistryEndpoint(spec, registry);

      const response = await app.request('/_openapiserver/registry');
      const body = await response.json();

      // Test spec has: GET /pets, POST /pets, GET /pets/{petId}
      expect(body.endpoints).toHaveLength(3);
    });

    it('should include endpoint details', async () => {
      const spec = createTestSpec();
      const logger = createMockLogger();
      const { registry } = buildRegistry(spec, logger as Parameters<typeof buildRegistry>[1]);

      const app = createAppWithRegistryEndpoint(spec, registry);

      const response = await app.request('/_openapiserver/registry');
      const body = await response.json();

      const listPets = body.endpoints.find(
        (e: { operationId: string }) => e.operationId === 'listPets',
      );

      expect(listPets).toBeDefined();
      expect(listPets.key).toBe('GET /pets');
      expect(listPets.method).toBe('GET');
      expect(listPets.path).toBe('/pets');
      expect(listPets.summary).toBe('List all pets');
      expect(listPets.tags).toEqual(['pets']);
      expect(listPets.hasHandler).toBe(false);
    });

    it('should include schemas array', async () => {
      const spec = createTestSpec();
      const logger = createMockLogger();
      const { registry } = buildRegistry(spec, logger as Parameters<typeof buildRegistry>[1]);

      const app = createAppWithRegistryEndpoint(spec, registry);

      const response = await app.request('/_openapiserver/registry');
      const body = await response.json();

      expect(body.schemas).toBeDefined();
      expect(Array.isArray(body.schemas)).toBe(true);
      // Test spec has: Pet, Error
      expect(body.schemas).toHaveLength(2);
    });

    it('should include schema details', async () => {
      const spec = createTestSpec();
      const logger = createMockLogger();
      const { registry } = buildRegistry(spec, logger as Parameters<typeof buildRegistry>[1]);

      const app = createAppWithRegistryEndpoint(spec, registry);

      const response = await app.request('/_openapiserver/registry');
      const body = await response.json();

      const petSchema = body.schemas.find((s: { name: string }) => s.name === 'Pet');

      expect(petSchema).toBeDefined();
      expect(petSchema.type).toBe('object');
      expect(petSchema.required).toEqual(['id', 'name']);
      expect(petSchema.properties).toContain('id');
      expect(petSchema.properties).toContain('name');
      expect(petSchema.properties).toContain('status');
      expect(petSchema.hasSeed).toBe(false);
    });

    it('should include securitySchemes array', async () => {
      const spec = createTestSpec();
      const logger = createMockLogger();
      const { registry } = buildRegistry(spec, logger as Parameters<typeof buildRegistry>[1]);

      const app = createAppWithRegistryEndpoint(spec, registry);

      const response = await app.request('/_openapiserver/registry');
      const body = await response.json();

      expect(body.securitySchemes).toBeDefined();
      expect(Array.isArray(body.securitySchemes)).toBe(true);
      // Test spec has: api_key, bearerAuth
      expect(body.securitySchemes).toHaveLength(2);
    });

    it('should include security scheme details', async () => {
      const spec = createTestSpec();
      const logger = createMockLogger();
      const { registry } = buildRegistry(spec, logger as Parameters<typeof buildRegistry>[1]);

      const app = createAppWithRegistryEndpoint(spec, registry);

      const response = await app.request('/_openapiserver/registry');
      const body = await response.json();

      const apiKey = body.securitySchemes.find((s: { name: string }) => s.name === 'api_key');
      const bearer = body.securitySchemes.find((s: { name: string }) => s.name === 'bearerAuth');

      expect(apiKey).toBeDefined();
      expect(apiKey.type).toBe('apiKey');
      expect(apiKey.in).toBe('header');

      expect(bearer).toBeDefined();
      expect(bearer.type).toBe('http');
      expect(bearer.scheme).toBe('bearer');
      expect(bearer.bearerFormat).toBe('JWT');
    });

    it('should include statistics object', async () => {
      const spec = createTestSpec();
      const logger = createMockLogger();
      const { registry } = buildRegistry(spec, logger as Parameters<typeof buildRegistry>[1]);

      const app = createAppWithRegistryEndpoint(spec, registry);

      const response = await app.request('/_openapiserver/registry');
      const body = await response.json();

      expect(body.statistics).toBeDefined();
      expect(body.statistics.totalEndpoints).toBe(3);
      expect(body.statistics.endpointsWithHandlers).toBe(0);
      expect(body.statistics.handlerPercentage).toBe(0);
      expect(body.statistics.totalSchemas).toBe(2);
      expect(body.statistics.schemasWithSeeds).toBe(0);
      expect(body.statistics.seedPercentage).toBe(0);
      expect(body.statistics.totalSecuritySchemes).toBe(2);
    });

    it('should handle spec with no paths gracefully', async () => {
      const spec = createTestSpec({ paths: {} });
      const logger = createMockLogger();
      const { registry } = buildRegistry(spec, logger as Parameters<typeof buildRegistry>[1]);

      const app = createAppWithRegistryEndpoint(spec, registry);

      const response = await app.request('/_openapiserver/registry');
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.endpoints).toHaveLength(0);
      expect(body.statistics.totalEndpoints).toBe(0);
    });

    it('should handle spec with no components gracefully', async () => {
      const spec = createTestSpec({ components: undefined });
      const logger = createMockLogger();
      const { registry } = buildRegistry(spec, logger as Parameters<typeof buildRegistry>[1]);

      const app = createAppWithRegistryEndpoint(spec, registry);

      const response = await app.request('/_openapiserver/registry');
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.schemas).toHaveLength(0);
      expect(body.securitySchemes).toHaveLength(0);
    });

    it('should work with different port numbers', async () => {
      const spec = createTestSpec();
      const logger = createMockLogger();
      const { registry } = buildRegistry(spec, logger as Parameters<typeof buildRegistry>[1]);

      const app = createAppWithRegistryEndpoint(spec, registry, 8080);

      const response = await app.request('/_openapiserver/registry');
      const body = await response.json();

      expect(body.meta.port).toBe(8080);
    });

    it('should return valid ISO timestamp', async () => {
      const spec = createTestSpec();
      const logger = createMockLogger();
      const { registry } = buildRegistry(spec, logger as Parameters<typeof buildRegistry>[1]);

      const app = createAppWithRegistryEndpoint(spec, registry);

      const response = await app.request('/_openapiserver/registry');
      const body = await response.json();

      // Verify timestamp is valid ISO 8601 format
      const date = new Date(body.meta.timestamp);
      expect(date.toISOString()).toBe(body.meta.timestamp);
    });

    it('should produce JSON-serializable response (no circular refs or functions)', async () => {
      const spec = createTestSpec();
      const logger = createMockLogger();
      const { registry } = buildRegistry(spec, logger as Parameters<typeof buildRegistry>[1]);

      const app = createAppWithRegistryEndpoint(spec, registry);

      const response = await app.request('/_openapiserver/registry');
      const body = await response.json();

      // Re-stringify should work without errors
      const serialized = JSON.stringify(body);
      expect(serialized).toBeDefined();

      // Parse back should equal original
      const parsed = JSON.parse(serialized);
      expect(parsed).toEqual(body);
    });
  });

  describe('Route Priority', () => {
    it('should respond before wildcard routes', async () => {
      const spec = createTestSpec();
      const logger = createMockLogger();
      const { registry } = buildRegistry(spec, logger as Parameters<typeof buildRegistry>[1]);

      const app = new Hono();

      // Add registry endpoint first (as done in runner)
      app.get('/_openapiserver/registry', (c) => {
        const serialized = serializeRegistry(registry, {
          spec,
          port: 3001,
          version: '1.0.0',
        });
        return c.json(serialized, 200);
      });

      // Add wildcard route after (simulating Scalar mock server)
      app.get('*', (c) => {
        return c.text('Wildcard handler', 200);
      });

      const response = await app.request('/_openapiserver/registry');
      const body = await response.json();

      // Should get registry response, not wildcard
      expect(body.meta).toBeDefined();
      expect(body.endpoints).toBeDefined();
    });
  });
});
