/**
 * Registry Builder Tests
 *
 * Tests for the OpenAPI registry builder module that constructs
 * an endpoint registry from enhanced OpenAPI specifications.
 *
 * @module
 */

import type { OpenAPIV3_1 } from 'openapi-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildRegistry, generateEndpointKey } from '../registry-builder.js';

/**
 * Create a mock Vite logger for testing.
 */
function createMockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    warnOnce: vi.fn(),
    clearScreen: vi.fn(),
    hasErrorLogged: vi.fn(),
    hasWarned: false,
  };
}

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
            '200': {
              description: 'A list of pets',
            },
          },
        },
        post: {
          operationId: 'createPet',
          summary: 'Create a pet',
          tags: ['pets'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Pet' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Pet created',
            },
          },
        },
      },
      '/pets/{petId}': {
        parameters: [
          {
            name: 'petId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        get: {
          operationId: 'getPetById',
          summary: 'Get a pet by ID',
          responses: {
            '200': {
              description: 'A pet',
            },
            '404': {
              description: 'Pet not found',
            },
          },
        },
        delete: {
          operationId: 'deletePet',
          summary: 'Delete a pet',
          responses: {
            '204': {
              description: 'Pet deleted',
            },
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
            id: { type: 'integer' },
            name: { type: 'string' },
            status: { type: 'string', enum: ['available', 'pending', 'sold'] },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            petId: { type: 'integer' },
            quantity: { type: 'integer' },
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
        oauth2: {
          type: 'oauth2',
          flows: {
            implicit: {
              authorizationUrl: 'https://example.com/oauth/authorize',
              scopes: {
                'read:pets': 'Read pets',
                'write:pets': 'Write pets',
              },
            },
          },
        },
      },
    },
    ...overrides,
  };
}

describe('Registry Builder', () => {
  describe('generateEndpointKey', () => {
    it('should generate correct key for GET method', () => {
      expect(generateEndpointKey('get', '/pets')).toBe('GET /pets');
    });

    it('should generate correct key for POST method', () => {
      expect(generateEndpointKey('post', '/pets')).toBe('POST /pets');
    });

    it('should handle path parameters', () => {
      expect(generateEndpointKey('get', '/pets/{petId}')).toBe('GET /pets/{petId}');
    });

    it('should uppercase the method', () => {
      expect(generateEndpointKey('delete', '/pets')).toBe('DELETE /pets');
    });
  });

  describe('buildRegistry', () => {
    let mockLogger: ReturnType<typeof createMockLogger>;

    beforeEach(() => {
      mockLogger = createMockLogger();
    });

    describe('empty spec', () => {
      it('should handle spec with no paths', () => {
        const spec: OpenAPIV3_1.Document = {
          openapi: '3.1.0',
          info: { title: 'Empty', version: '1.0.0' },
        };

        const result = buildRegistry(spec, mockLogger);

        expect(result.registry.endpoints.size).toBe(0);
        expect(result.registry.schemas.size).toBe(0);
        expect(result.registry.securitySchemes.size).toBe(0);
        expect(result.stats.endpointCount).toBe(0);
      });

      it('should handle spec with empty paths object', () => {
        const spec: OpenAPIV3_1.Document = {
          openapi: '3.1.0',
          info: { title: 'Empty', version: '1.0.0' },
          paths: {},
        };

        const result = buildRegistry(spec, mockLogger);

        expect(result.registry.endpoints.size).toBe(0);
        expect(result.stats.endpointCount).toBe(0);
      });

      it('should handle spec without components', () => {
        const spec: OpenAPIV3_1.Document = {
          openapi: '3.1.0',
          info: { title: 'No Components', version: '1.0.0' },
          paths: {
            '/test': {
              get: {
                responses: { '200': { description: 'OK' } },
              },
            },
          },
        };

        const result = buildRegistry(spec, mockLogger);

        expect(result.registry.endpoints.size).toBe(1);
        expect(result.registry.schemas.size).toBe(0);
        expect(result.registry.securitySchemes.size).toBe(0);
      });
    });

    describe('endpoint extraction', () => {
      it('should extract all endpoints from paths', () => {
        const spec = createTestSpec();
        const result = buildRegistry(spec, mockLogger);

        expect(result.registry.endpoints.size).toBe(4);
        expect(result.registry.endpoints.has('GET /pets')).toBe(true);
        expect(result.registry.endpoints.has('POST /pets')).toBe(true);
        expect(result.registry.endpoints.has('GET /pets/{petId}')).toBe(true);
        expect(result.registry.endpoints.has('DELETE /pets/{petId}')).toBe(true);
      });

      it('should create endpoint entries with correct metadata', () => {
        const spec = createTestSpec();
        const result = buildRegistry(spec, mockLogger);

        const listPets = result.registry.endpoints.get('GET /pets');
        expect(listPets).toBeDefined();
        expect(listPets?.method).toBe('get');
        expect(listPets?.path).toBe('/pets');
        expect(listPets?.operationId).toBe('listPets');
        expect(listPets?.summary).toBe('List all pets');
        expect(listPets?.tags).toEqual(['pets']);
      });

      it('should include parameters in endpoint entry', () => {
        const spec = createTestSpec();
        const result = buildRegistry(spec, mockLogger);

        const getPetById = result.registry.endpoints.get('GET /pets/{petId}');
        expect(getPetById?.parameters).toHaveLength(1);
        expect(getPetById?.parameters[0].name).toBe('petId');
        expect(getPetById?.parameters[0].in).toBe('path');
      });

      it('should include request body in endpoint entry', () => {
        const spec = createTestSpec();
        const result = buildRegistry(spec, mockLogger);

        const createPet = result.registry.endpoints.get('POST /pets');
        expect(createPet?.requestBody).toBeDefined();
        expect(createPet?.requestBody?.required).toBe(true);
      });

      it('should include responses in endpoint entry', () => {
        const spec = createTestSpec();
        const result = buildRegistry(spec, mockLogger);

        const getPetById = result.registry.endpoints.get('GET /pets/{petId}');
        expect(getPetById?.responses).toHaveProperty('200');
        expect(getPetById?.responses).toHaveProperty('404');
      });

      it('should merge path-level and operation-level parameters', () => {
        const spec: OpenAPIV3_1.Document = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {
            '/items/{itemId}': {
              parameters: [
                { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
                { name: 'version', in: 'header', schema: { type: 'string' } },
              ],
              get: {
                operationId: 'getItem',
                parameters: [{ name: 'include', in: 'query', schema: { type: 'string' } }],
                responses: { '200': { description: 'OK' } },
              },
            },
          },
        };

        const result = buildRegistry(spec, mockLogger);
        const endpoint = result.registry.endpoints.get('GET /items/{itemId}');

        expect(endpoint?.parameters).toHaveLength(3);
        const paramNames = endpoint?.parameters.map((p) => p.name);
        expect(paramNames).toContain('itemId');
        expect(paramNames).toContain('version');
        expect(paramNames).toContain('include');
      });

      it('should override path parameters with operation parameters', () => {
        const spec: OpenAPIV3_1.Document = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {
            '/items/{itemId}': {
              parameters: [
                {
                  name: 'itemId',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'Path level',
                },
              ],
              get: {
                operationId: 'getItem',
                parameters: [
                  {
                    name: 'itemId',
                    in: 'path',
                    required: true,
                    schema: { type: 'integer' },
                    description: 'Operation level',
                  },
                ],
                responses: { '200': { description: 'OK' } },
              },
            },
          },
        };

        const result = buildRegistry(spec, mockLogger);
        const endpoint = result.registry.endpoints.get('GET /items/{itemId}');

        // Should have only one itemId parameter (operation level wins)
        const itemIdParams = endpoint?.parameters.filter((p) => p.name === 'itemId');
        expect(itemIdParams).toHaveLength(1);
        expect(itemIdParams?.[0].description).toBe('Operation level');
        expect(itemIdParams?.[0].schema).toEqual({ type: 'integer' });
      });

      it('should generate default operationId if missing', () => {
        const spec: OpenAPIV3_1.Document = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {
            '/pets/{petId}/orders': {
              get: {
                // No operationId
                responses: { '200': { description: 'OK' } },
              },
            },
          },
        };

        const result = buildRegistry(spec, mockLogger);
        const endpoint = result.registry.endpoints.get('GET /pets/{petId}/orders');

        expect(endpoint?.operationId).toBe('get_pets_petId_orders');
      });
    });

    describe('handler tracking', () => {
      it('should count endpoints with x-handler extension', () => {
        const spec = createTestSpec();
        // Add x-handler to some operations
        if (spec.paths?.['/pets']?.get) {
          (spec.paths['/pets'].get as Record<string, unknown>)['x-handler'] = () => {};
        }
        if (spec.paths?.['/pets']?.post) {
          (spec.paths['/pets'].post as Record<string, unknown>)['x-handler'] = () => {};
        }

        const result = buildRegistry(spec, mockLogger);

        expect(result.stats.handlerCount).toBe(2);
      });

      it('should count zero handlers when none have x-handler', () => {
        const spec = createTestSpec();
        const result = buildRegistry(spec, mockLogger);

        expect(result.stats.handlerCount).toBe(0);
      });
    });

    describe('schema extraction', () => {
      it('should extract all schemas from components', () => {
        const spec = createTestSpec();
        const result = buildRegistry(spec, mockLogger);

        expect(result.registry.schemas.size).toBe(2);
        expect(result.registry.schemas.has('Pet')).toBe(true);
        expect(result.registry.schemas.has('Order')).toBe(true);
      });

      it('should create schema entries with correct structure', () => {
        const spec = createTestSpec();
        const result = buildRegistry(spec, mockLogger);

        const petSchema = result.registry.schemas.get('Pet');
        expect(petSchema?.name).toBe('Pet');
        expect(petSchema?.schema.type).toBe('object');
        expect(petSchema?.schema.properties).toHaveProperty('id');
        expect(petSchema?.schema.properties).toHaveProperty('name');
      });

      it('should count schemas with x-seed extension', () => {
        const spec = createTestSpec();
        // Add x-seed to Pet schema
        if (spec.components?.schemas?.Pet) {
          (spec.components.schemas.Pet as Record<string, unknown>)['x-seed'] = () => [];
        }

        const result = buildRegistry(spec, mockLogger);

        expect(result.stats.seedCount).toBe(1);
      });

      it('should handle spec without schemas', () => {
        const spec: OpenAPIV3_1.Document = {
          openapi: '3.1.0',
          info: { title: 'No Schemas', version: '1.0.0' },
          paths: {},
          components: {},
        };

        const result = buildRegistry(spec, mockLogger);

        expect(result.registry.schemas.size).toBe(0);
        expect(result.stats.schemaCount).toBe(0);
      });
    });

    describe('security scheme extraction', () => {
      it('should extract all security schemes from components', () => {
        const spec = createTestSpec();
        const result = buildRegistry(spec, mockLogger);

        expect(result.registry.securitySchemes.size).toBe(3);
        expect(result.registry.securitySchemes.has('api_key')).toBe(true);
        expect(result.registry.securitySchemes.has('bearerAuth')).toBe(true);
        expect(result.registry.securitySchemes.has('oauth2')).toBe(true);
      });

      it('should create apiKey scheme entry with correct properties', () => {
        const spec = createTestSpec();
        const result = buildRegistry(spec, mockLogger);

        const apiKey = result.registry.securitySchemes.get('api_key');
        expect(apiKey?.name).toBe('api_key');
        expect(apiKey?.type).toBe('apiKey');
        expect(apiKey?.in).toBe('header');
        expect(apiKey?.apiKeyName).toBe('X-API-Key');
      });

      it('should create http bearer scheme entry with correct properties', () => {
        const spec = createTestSpec();
        const result = buildRegistry(spec, mockLogger);

        const bearerAuth = result.registry.securitySchemes.get('bearerAuth');
        expect(bearerAuth?.name).toBe('bearerAuth');
        expect(bearerAuth?.type).toBe('http');
        expect(bearerAuth?.scheme).toBe('bearer');
        expect(bearerAuth?.bearerFormat).toBe('JWT');
      });

      it('should create oauth2 scheme entry with flows', () => {
        const spec = createTestSpec();
        const result = buildRegistry(spec, mockLogger);

        const oauth2 = result.registry.securitySchemes.get('oauth2');
        expect(oauth2?.name).toBe('oauth2');
        expect(oauth2?.type).toBe('oauth2');
        expect(oauth2?.flows).toBeDefined();
        expect(oauth2?.flows?.implicit).toBeDefined();
      });

      it('should handle spec without security schemes', () => {
        const spec: OpenAPIV3_1.Document = {
          openapi: '3.1.0',
          info: { title: 'No Security', version: '1.0.0' },
          paths: {},
          components: {
            schemas: {},
          },
        };

        const result = buildRegistry(spec, mockLogger);

        expect(result.registry.securitySchemes.size).toBe(0);
        expect(result.stats.securitySchemeCount).toBe(0);
      });
    });

    describe('statistics', () => {
      it('should return correct statistics', () => {
        const spec = createTestSpec();
        const result = buildRegistry(spec, mockLogger);

        expect(result.stats.endpointCount).toBe(4);
        expect(result.stats.handlerCount).toBe(0);
        expect(result.stats.schemaCount).toBe(2);
        expect(result.stats.seedCount).toBe(0);
        expect(result.stats.securitySchemeCount).toBe(3);
      });

      it('should log statistics', () => {
        const spec = createTestSpec();
        buildRegistry(spec, mockLogger);

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('[registry] Built registry:'),
          expect.any(Object),
        );
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('4 endpoint(s)'),
          expect.any(Object),
        );
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('2 schema(s)'),
          expect.any(Object),
        );
      });

      it('should include handler count in log when handlers exist', () => {
        const spec = createTestSpec();
        if (spec.paths?.['/pets']?.get) {
          (spec.paths['/pets'].get as Record<string, unknown>)['x-handler'] = () => {};
        }

        buildRegistry(spec, mockLogger);

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('(1 with handlers)'),
          expect.any(Object),
        );
      });

      it('should include seed count in log when seeds exist', () => {
        const spec = createTestSpec();
        if (spec.components?.schemas?.Pet) {
          (spec.components.schemas.Pet as Record<string, unknown>)['x-seed'] = () => [];
        }

        buildRegistry(spec, mockLogger);

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('(1 with seeds)'),
          expect.any(Object),
        );
      });
    });

    describe('result structure', () => {
      it('should return registry and stats', () => {
        const spec = createTestSpec();
        const result = buildRegistry(spec, mockLogger);

        expect(result).toHaveProperty('registry');
        expect(result).toHaveProperty('stats');
      });

      it('should return registry with correct Maps', () => {
        const spec = createTestSpec();
        const result = buildRegistry(spec, mockLogger);

        expect(result.registry.endpoints).toBeInstanceOf(Map);
        expect(result.registry.schemas).toBeInstanceOf(Map);
        expect(result.registry.securitySchemes).toBeInstanceOf(Map);
      });
    });

    describe('edge cases', () => {
      it('should handle all HTTP methods', () => {
        const spec: OpenAPIV3_1.Document = {
          openapi: '3.1.0',
          info: { title: 'All Methods', version: '1.0.0' },
          paths: {
            '/resource': {
              get: { responses: { '200': { description: 'OK' } } },
              post: { responses: { '201': { description: 'Created' } } },
              put: { responses: { '200': { description: 'OK' } } },
              patch: { responses: { '200': { description: 'OK' } } },
              delete: { responses: { '204': { description: 'Deleted' } } },
              options: { responses: { '200': { description: 'OK' } } },
              head: { responses: { '200': { description: 'OK' } } },
              trace: { responses: { '200': { description: 'OK' } } },
            },
          },
        };

        const result = buildRegistry(spec, mockLogger);

        expect(result.registry.endpoints.size).toBe(8);
        expect(result.registry.endpoints.has('GET /resource')).toBe(true);
        expect(result.registry.endpoints.has('POST /resource')).toBe(true);
        expect(result.registry.endpoints.has('PUT /resource')).toBe(true);
        expect(result.registry.endpoints.has('PATCH /resource')).toBe(true);
        expect(result.registry.endpoints.has('DELETE /resource')).toBe(true);
        expect(result.registry.endpoints.has('OPTIONS /resource')).toBe(true);
        expect(result.registry.endpoints.has('HEAD /resource')).toBe(true);
        expect(result.registry.endpoints.has('TRACE /resource')).toBe(true);
      });

      it('should handle paths with complex path parameters', () => {
        const spec: OpenAPIV3_1.Document = {
          openapi: '3.1.0',
          info: { title: 'Complex Paths', version: '1.0.0' },
          paths: {
            '/users/{userId}/posts/{postId}/comments/{commentId}': {
              get: {
                operationId: 'getComment',
                responses: { '200': { description: 'OK' } },
              },
            },
          },
        };

        const result = buildRegistry(spec, mockLogger);

        expect(
          result.registry.endpoints.has('GET /users/{userId}/posts/{postId}/comments/{commentId}'),
        ).toBe(true);
      });

      it('should handle operation with security requirements', () => {
        const spec: OpenAPIV3_1.Document = {
          openapi: '3.1.0',
          info: { title: 'With Security', version: '1.0.0' },
          paths: {
            '/secure': {
              get: {
                operationId: 'secureEndpoint',
                security: [{ api_key: [] }, { bearerAuth: [] }],
                responses: { '200': { description: 'OK' } },
              },
            },
          },
        };

        const result = buildRegistry(spec, mockLogger);
        const endpoint = result.registry.endpoints.get('GET /secure');

        expect(endpoint?.security).toHaveLength(2);
        expect(endpoint?.security?.[0]).toHaveProperty('api_key');
        expect(endpoint?.security?.[1]).toHaveProperty('bearerAuth');
      });
    });
  });
});
