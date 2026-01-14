/**
 * Registry Serializer Tests
 *
 * Tests for the registry serializer module that converts the endpoint
 * registry into a JSON-compatible format for the inspection endpoint.
 *
 * @module
 */

import type { OpenAPIV3_1 } from 'openapi-types';
import { describe, expect, it } from 'vitest';

import type { OpenApiEndpointRegistry } from '../../types/registry.js';
import { serializeRegistry } from '../registry-serializer.js';

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
    ...overrides,
  };
}

/**
 * Create a test registry with sample data.
 */
function createTestRegistry(): OpenApiEndpointRegistry {
  const registry: OpenApiEndpointRegistry = {
    endpoints: new Map([
      [
        'GET /pets',
        {
          method: 'get',
          path: '/pets',
          operationId: 'listPets',
          summary: 'List all pets',
          parameters: [],
          responses: { '200': { description: 'OK' } },
          tags: ['pets'],
        },
      ],
      [
        'POST /pets',
        {
          method: 'post',
          path: '/pets',
          operationId: 'createPet',
          summary: 'Create a pet',
          parameters: [],
          responses: { '201': { description: 'Created' } },
          tags: ['pets'],
        },
      ],
      [
        'GET /pets/{petId}',
        {
          method: 'get',
          path: '/pets/{petId}',
          operationId: 'getPetById',
          summary: 'Get a pet by ID',
          parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'OK' } },
          tags: ['pets'],
        },
      ],
      [
        'DELETE /pets/{petId}',
        {
          method: 'delete',
          path: '/pets/{petId}',
          operationId: 'deletePet',
          summary: 'Delete a pet',
          parameters: [],
          responses: { '204': { description: 'Deleted' } },
          tags: ['pets'],
        },
      ],
    ]),
    schemas: new Map([
      [
        'Pet',
        {
          name: 'Pet',
          schema: {
            type: 'object',
            required: ['id', 'name'],
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              status: { type: 'string' },
            },
          },
        },
      ],
      [
        'Order',
        {
          name: 'Order',
          schema: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              petId: { type: 'integer' },
            },
          },
        },
      ],
    ]),
    securitySchemes: new Map([
      [
        'api_key',
        {
          name: 'api_key',
          type: 'apiKey',
          in: 'header',
          apiKeyName: 'X-API-Key',
        },
      ],
      [
        'bearerAuth',
        {
          name: 'bearerAuth',
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      ],
    ]),
  };

  return registry;
}

describe('Registry Serializer', () => {
  describe('serializeRegistry', () => {
    it('should serialize registry to JSON-compatible format', () => {
      const registry = createTestRegistry();
      const spec = createTestSpec();

      const result = serializeRegistry(registry, { spec, port: 3001 });

      expect(result).toHaveProperty('meta');
      expect(result).toHaveProperty('endpoints');
      expect(result).toHaveProperty('schemas');
      expect(result).toHaveProperty('securitySchemes');
      expect(result).toHaveProperty('statistics');
    });

    describe('meta', () => {
      it('should include correct metadata', () => {
        const registry = createTestRegistry();
        const spec = createTestSpec({ info: { title: 'My API', version: '2.0.0' } });

        const result = serializeRegistry(registry, {
          spec,
          port: 4000,
          version: '1.2.3',
        });

        expect(result.meta.version).toBe('1.2.3');
        expect(result.meta.openApiVersion).toBe('3.1.0');
        expect(result.meta.specTitle).toBe('My API');
        expect(result.meta.specVersion).toBe('2.0.0');
        expect(result.meta.port).toBe(4000);
        expect(result.meta.timestamp).toBeDefined();
      });

      it('should use default version if not provided', () => {
        const registry = createTestRegistry();
        const spec = createTestSpec();

        const result = serializeRegistry(registry, { spec, port: 3001 });

        expect(result.meta.version).toBe('1.0.0');
      });

      it('should include valid ISO timestamp', () => {
        const registry = createTestRegistry();
        const spec = createTestSpec();

        const result = serializeRegistry(registry, { spec, port: 3001 });

        expect(() => new Date(result.meta.timestamp)).not.toThrow();
      });
    });

    describe('endpoints', () => {
      it('should serialize all endpoints', () => {
        const registry = createTestRegistry();
        const spec = createTestSpec();

        const result = serializeRegistry(registry, { spec, port: 3001 });

        expect(result.endpoints).toHaveLength(4);
      });

      it('should include correct endpoint properties', () => {
        const registry = createTestRegistry();
        const spec = createTestSpec();

        const result = serializeRegistry(registry, { spec, port: 3001 });

        const listPets = result.endpoints.find((e) => e.operationId === 'listPets');
        expect(listPets).toBeDefined();
        expect(listPets?.key).toBe('GET /pets');
        expect(listPets?.method).toBe('GET');
        expect(listPets?.path).toBe('/pets');
        expect(listPets?.summary).toBe('List all pets');
        expect(listPets?.tags).toEqual(['pets']);
      });

      it('should sort endpoints by path then method', () => {
        const registry = createTestRegistry();
        const spec = createTestSpec();

        const result = serializeRegistry(registry, { spec, port: 3001 });

        const paths = result.endpoints.map((e) => `${e.path} ${e.method}`);
        expect(paths).toEqual([
          '/pets GET',
          '/pets POST',
          '/pets/{petId} DELETE',
          '/pets/{petId} GET',
        ]);
      });

      it('should detect hasHandler flag when x-handler is present', () => {
        const registry = createTestRegistry();
        // Add x-handler to one endpoint
        const listPetsEntry = registry.endpoints.get('GET /pets');
        if (listPetsEntry) {
          (listPetsEntry as Record<string, unknown>)['x-handler'] = () => {};
        }

        const spec = createTestSpec();
        const result = serializeRegistry(registry, { spec, port: 3001 });

        const listPets = result.endpoints.find((e) => e.operationId === 'listPets');
        const createPet = result.endpoints.find((e) => e.operationId === 'createPet');

        expect(listPets?.hasHandler).toBe(true);
        expect(createPet?.hasHandler).toBe(false);
      });
    });

    describe('schemas', () => {
      it('should serialize all schemas', () => {
        const registry = createTestRegistry();
        const spec = createTestSpec();

        const result = serializeRegistry(registry, { spec, port: 3001 });

        expect(result.schemas).toHaveLength(2);
      });

      it('should include correct schema properties', () => {
        const registry = createTestRegistry();
        const spec = createTestSpec();

        const result = serializeRegistry(registry, { spec, port: 3001 });

        const pet = result.schemas.find((s) => s.name === 'Pet');
        expect(pet).toBeDefined();
        expect(pet?.type).toBe('object');
        expect(pet?.required).toEqual(['id', 'name']);
        expect(pet?.properties).toEqual(['id', 'name', 'status']);
      });

      it('should sort schemas alphabetically', () => {
        const registry = createTestRegistry();
        const spec = createTestSpec();

        const result = serializeRegistry(registry, { spec, port: 3001 });

        const names = result.schemas.map((s) => s.name);
        expect(names).toEqual(['Order', 'Pet']);
      });

      it('should detect hasSeed flag when x-seed is present', () => {
        const registry = createTestRegistry();
        // Add x-seed to Pet schema
        const petEntry = registry.schemas.get('Pet');
        if (petEntry) {
          (petEntry.schema as Record<string, unknown>)['x-seed'] = () => [];
        }

        const spec = createTestSpec();
        const result = serializeRegistry(registry, { spec, port: 3001 });

        const pet = result.schemas.find((s) => s.name === 'Pet');
        const order = result.schemas.find((s) => s.name === 'Order');

        expect(pet?.hasSeed).toBe(true);
        expect(order?.hasSeed).toBe(false);
      });
    });

    describe('securitySchemes', () => {
      it('should serialize all security schemes', () => {
        const registry = createTestRegistry();
        const spec = createTestSpec();

        const result = serializeRegistry(registry, { spec, port: 3001 });

        expect(result.securitySchemes).toHaveLength(2);
      });

      it('should include correct apiKey scheme properties', () => {
        const registry = createTestRegistry();
        const spec = createTestSpec();

        const result = serializeRegistry(registry, { spec, port: 3001 });

        const apiKey = result.securitySchemes.find((s) => s.name === 'api_key');
        expect(apiKey).toBeDefined();
        expect(apiKey?.type).toBe('apiKey');
        expect(apiKey?.in).toBe('header');
        expect(apiKey?.apiKeyName).toBe('X-API-Key');
      });

      it('should include correct http bearer scheme properties', () => {
        const registry = createTestRegistry();
        const spec = createTestSpec();

        const result = serializeRegistry(registry, { spec, port: 3001 });

        const bearerAuth = result.securitySchemes.find((s) => s.name === 'bearerAuth');
        expect(bearerAuth).toBeDefined();
        expect(bearerAuth?.type).toBe('http');
        expect(bearerAuth?.scheme).toBe('bearer');
        expect(bearerAuth?.bearerFormat).toBe('JWT');
      });

      it('should sort security schemes alphabetically', () => {
        const registry = createTestRegistry();
        const spec = createTestSpec();

        const result = serializeRegistry(registry, { spec, port: 3001 });

        const names = result.securitySchemes.map((s) => s.name);
        expect(names).toEqual(['api_key', 'bearerAuth']);
      });
    });

    describe('statistics', () => {
      it('should compute correct endpoint counts', () => {
        const registry = createTestRegistry();
        const spec = createTestSpec();

        const result = serializeRegistry(registry, { spec, port: 3001 });

        expect(result.statistics.totalEndpoints).toBe(4);
        expect(result.statistics.endpointsWithHandlers).toBe(0);
        expect(result.statistics.handlerPercentage).toBe(0);
      });

      it('should compute correct schema counts', () => {
        const registry = createTestRegistry();
        const spec = createTestSpec();

        const result = serializeRegistry(registry, { spec, port: 3001 });

        expect(result.statistics.totalSchemas).toBe(2);
        expect(result.statistics.schemasWithSeeds).toBe(0);
        expect(result.statistics.seedPercentage).toBe(0);
      });

      it('should compute correct security scheme count', () => {
        const registry = createTestRegistry();
        const spec = createTestSpec();

        const result = serializeRegistry(registry, { spec, port: 3001 });

        expect(result.statistics.totalSecuritySchemes).toBe(2);
      });

      it('should compute handler percentage correctly', () => {
        const registry = createTestRegistry();
        // Add x-handler to 2 of 4 endpoints
        const entry1 = registry.endpoints.get('GET /pets');
        const entry2 = registry.endpoints.get('POST /pets');
        if (entry1) (entry1 as Record<string, unknown>)['x-handler'] = () => {};
        if (entry2) (entry2 as Record<string, unknown>)['x-handler'] = () => {};

        const spec = createTestSpec();
        const result = serializeRegistry(registry, { spec, port: 3001 });

        expect(result.statistics.endpointsWithHandlers).toBe(2);
        expect(result.statistics.handlerPercentage).toBe(50);
      });

      it('should compute seed percentage correctly', () => {
        const registry = createTestRegistry();
        // Add x-seed to 1 of 2 schemas
        const petEntry = registry.schemas.get('Pet');
        if (petEntry) (petEntry.schema as Record<string, unknown>)['x-seed'] = () => [];

        const spec = createTestSpec();
        const result = serializeRegistry(registry, { spec, port: 3001 });

        expect(result.statistics.schemasWithSeeds).toBe(1);
        expect(result.statistics.seedPercentage).toBe(50);
      });

      it('should handle zero totals without division errors', () => {
        const emptyRegistry: OpenApiEndpointRegistry = {
          endpoints: new Map(),
          schemas: new Map(),
          securitySchemes: new Map(),
        };

        const spec = createTestSpec();
        const result = serializeRegistry(emptyRegistry, { spec, port: 3001 });

        expect(result.statistics.totalEndpoints).toBe(0);
        expect(result.statistics.handlerPercentage).toBe(0);
        expect(result.statistics.totalSchemas).toBe(0);
        expect(result.statistics.seedPercentage).toBe(0);
      });
    });

    describe('empty registry', () => {
      it('should handle empty registry gracefully', () => {
        const emptyRegistry: OpenApiEndpointRegistry = {
          endpoints: new Map(),
          schemas: new Map(),
          securitySchemes: new Map(),
        };

        const spec = createTestSpec();
        const result = serializeRegistry(emptyRegistry, { spec, port: 3001 });

        expect(result.endpoints).toHaveLength(0);
        expect(result.schemas).toHaveLength(0);
        expect(result.securitySchemes).toHaveLength(0);
        expect(result.statistics.totalEndpoints).toBe(0);
      });
    });

    describe('JSON serialization', () => {
      it('should produce JSON-serializable output', () => {
        const registry = createTestRegistry();
        const spec = createTestSpec();

        const result = serializeRegistry(registry, { spec, port: 3001 });

        // Should not throw when stringifying
        expect(() => JSON.stringify(result)).not.toThrow();
      });

      it('should exclude function references from output', () => {
        const registry = createTestRegistry();
        // Add x-handler (function) to endpoint
        const entry = registry.endpoints.get('GET /pets');
        if (entry) (entry as Record<string, unknown>)['x-handler'] = () => {};

        const spec = createTestSpec();
        const result = serializeRegistry(registry, { spec, port: 3001 });

        // The serialized result should not contain the function
        const json = JSON.stringify(result);
        expect(json).not.toContain('function');

        // But hasHandler should be true
        const listPets = result.endpoints.find((e) => e.operationId === 'listPets');
        expect(listPets?.hasHandler).toBe(true);
      });
    });
  });
});
