/**
 * DevTools Plugin Tests
 *
 * Unit tests for the DevTools plugin module functions.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import type { EndpointRegistryEntry, OpenApiEndpointRegistry } from '../../types/registry.js';
import {
  buildInspectorState,
  buildInspectorTree,
  checkDevToolsSupport,
  DEVTOOLS_INSPECTOR_ID,
  DEVTOOLS_INSPECTOR_LABEL,
  DEVTOOLS_PLUGIN_ID,
  DEVTOOLS_PLUGIN_LABEL,
  GLOBAL_STATE_KEY,
} from '../devtools-plugin.js';

/**
 * Creates a mock registry for testing
 */
function createMockRegistry(): OpenApiEndpointRegistry {
  const endpoints = new Map<string, EndpointRegistryEntry>();

  endpoints.set('GET /pets', {
    method: 'get',
    path: '/pets',
    operationId: 'listPets',
    summary: 'List all pets',
    parameters: [
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer' },
      },
    ],
    responses: {
      '200': {
        description: 'A paged array of pets',
      },
    },
    tags: ['pets'],
    hasHandler: true,
    hasSeed: false,
  });

  endpoints.set('POST /pets', {
    method: 'post',
    path: '/pets',
    operationId: 'createPet',
    summary: 'Create a pet',
    parameters: [],
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
    tags: ['pets'],
    hasHandler: false,
    hasSeed: true,
  });

  endpoints.set('GET /pets/{petId}', {
    method: 'get',
    path: '/pets/{petId}',
    operationId: 'getPetById',
    summary: 'Get pet by ID',
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
        description: 'Expected response to a valid request',
      },
      '404': {
        description: 'Pet not found',
      },
    },
    tags: ['pets'],
    hasHandler: true,
    hasSeed: true,
  });

  endpoints.set('GET /stores', {
    method: 'get',
    path: '/stores',
    operationId: 'listStores',
    summary: 'List all stores',
    parameters: [],
    responses: {
      '200': {
        description: 'A list of stores',
      },
    },
    tags: ['stores'],
    hasHandler: false,
    hasSeed: false,
  });

  const schemas = new Map();
  schemas.set('Pet', {
    name: 'Pet',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
      },
    },
  });

  const securitySchemes = new Map();
  securitySchemes.set('api_key', {
    name: 'api_key',
    type: 'apiKey',
    in: 'header',
    apiKeyName: 'X-API-Key',
  });

  return { endpoints, schemas, securitySchemes };
}

describe('DevTools Plugin Constants', () => {
  it('should export correct plugin ID', () => {
    expect(DEVTOOLS_PLUGIN_ID).toBe('vite-openapi-server');
  });

  it('should export correct plugin label', () => {
    expect(DEVTOOLS_PLUGIN_LABEL).toBe('OpenAPI Server');
  });

  it('should export correct inspector ID', () => {
    expect(DEVTOOLS_INSPECTOR_ID).toBe('openapi-endpoints');
  });

  it('should export correct inspector label', () => {
    expect(DEVTOOLS_INSPECTOR_LABEL).toBe('Endpoints');
  });

  it('should export correct global state key', () => {
    expect(GLOBAL_STATE_KEY).toBe('__VITE_OPENAPI_SERVER__');
  });
});

describe('checkDevToolsSupport', () => {
  it('should return object with all properties', () => {
    const result = checkDevToolsSupport();

    expect(result).toHaveProperty('isSupported');
    expect(result).toHaveProperty('isDev');
    expect(result).toHaveProperty('isBrowser');
    expect(result).toHaveProperty('hasDevToolsHook');
  });

  it('should return false for isBrowser in Node.js environment', () => {
    const result = checkDevToolsSupport();

    expect(result.isBrowser).toBe(false);
    expect(result.isSupported).toBe(false);
  });
});

describe('buildInspectorTree', () => {
  const registry = createMockRegistry();

  it('should return array with root node', () => {
    const tree = buildInspectorTree(registry);

    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBe(1);
    expect(tree[0].id).toBe('root');
  });

  it('should include endpoint count in root label', () => {
    const tree = buildInspectorTree(registry);

    expect(tree[0].label).toBe('Endpoints (4)');
  });

  it('should group endpoints by tag', () => {
    const tree = buildInspectorTree(registry);
    const children = tree[0].children;

    expect(children.length).toBe(2); // pets and stores tags

    const petsGroup = children.find((c: { id: string }) => c.id === 'tag:pets');
    const storesGroup = children.find((c: { id: string }) => c.id === 'tag:stores');

    expect(petsGroup).toBeDefined();
    expect(storesGroup).toBeDefined();
  });

  it('should show endpoint count per tag', () => {
    const tree = buildInspectorTree(registry);
    const petsGroup = tree[0].children.find((c: { id: string }) => c.id === 'tag:pets');

    expect(petsGroup.tags).toBeDefined();
    expect(petsGroup.tags[0].label).toBe('3'); // 3 pets endpoints
  });

  it('should filter endpoints by path', () => {
    const tree = buildInspectorTree(registry, 'store');

    expect(tree[0].label).toBe('Endpoints (1)');
  });

  it('should filter endpoints by method', () => {
    const tree = buildInspectorTree(registry, 'post');

    expect(tree[0].label).toBe('Endpoints (1)');
  });

  it('should filter endpoints by operationId', () => {
    const tree = buildInspectorTree(registry, 'getPetById');

    expect(tree[0].label).toBe('Endpoints (1)');
  });

  it('should show Handler badge for endpoints with handlers', () => {
    const tree = buildInspectorTree(registry);
    const petsGroup = tree[0].children.find((c: { id: string }) => c.id === 'tag:pets');
    const listPets = petsGroup.children.find((c: { id: string }) => c.id === 'listPets');

    const handlerBadge = listPets.tags.find((t: { label: string }) => t.label === 'Handler');
    expect(handlerBadge).toBeDefined();
  });

  it('should show Seed badge for endpoints with seeds', () => {
    const tree = buildInspectorTree(registry);
    const petsGroup = tree[0].children.find((c: { id: string }) => c.id === 'tag:pets');
    const createPet = petsGroup.children.find((c: { id: string }) => c.id === 'createPet');

    const seedBadge = createPet.tags.find((t: { label: string }) => t.label === 'Seed');
    expect(seedBadge).toBeDefined();
  });

  it('should include method badge with correct color', () => {
    const tree = buildInspectorTree(registry);
    const petsGroup = tree[0].children.find((c: { id: string }) => c.id === 'tag:pets');
    const listPets = petsGroup.children.find((c: { id: string }) => c.id === 'listPets');

    const methodBadge = listPets.tags.find((t: { label: string }) => t.label === 'GET');
    expect(methodBadge).toBeDefined();
    expect(methodBadge.backgroundColor).toBe(0x22c55e); // Green for GET
  });
});

describe('buildInspectorState', () => {
  const registry = createMockRegistry();

  describe('root node', () => {
    it('should return registry info for root node', () => {
      const state = buildInspectorState(registry, 'root');

      expect(state['Registry Info']).toBeDefined();
      expect(state['Registry Info'].length).toBe(4);
    });

    it('should include correct endpoint count', () => {
      const state = buildInspectorState(registry, 'root');
      const totalEndpoints = state['Registry Info'].find(
        (item: { key: string }) => item.key === 'Total Endpoints',
      );

      expect(totalEndpoints?.value).toBe(4);
    });

    it('should include correct schema count', () => {
      const state = buildInspectorState(registry, 'root');
      const schemas = state['Registry Info'].find(
        (item: { key: string }) => item.key === 'Schemas',
      );

      expect(schemas?.value).toBe(1);
    });

    it('should include correct security scheme count', () => {
      const state = buildInspectorState(registry, 'root');
      const securitySchemes = state['Registry Info'].find(
        (item: { key: string }) => item.key === 'Security Schemes',
      );

      expect(securitySchemes?.value).toBe(1);
    });
  });

  describe('tag node', () => {
    it('should return tag info for tag node', () => {
      const state = buildInspectorState(registry, 'tag:pets');

      expect(state['Tag Info']).toBeDefined();
      expect(state['Endpoints']).toBeDefined();
    });

    it('should include correct tag name', () => {
      const state = buildInspectorState(registry, 'tag:pets');
      const name = state['Tag Info'].find((item: { key: string }) => item.key === 'Name');

      expect(name?.value).toBe('pets');
    });

    it('should include correct endpoint count', () => {
      const state = buildInspectorState(registry, 'tag:pets');
      const endpoints = state['Tag Info'].find((item: { key: string }) => item.key === 'Endpoints');

      expect(endpoints?.value).toBe(3);
    });

    it('should include handler count', () => {
      const state = buildInspectorState(registry, 'tag:pets');
      const withHandlers = state['Tag Info'].find(
        (item: { key: string }) => item.key === 'With Handlers',
      );

      expect(withHandlers?.value).toBe(2);
    });

    it('should include seed count', () => {
      const state = buildInspectorState(registry, 'tag:pets');
      const withSeeds = state['Tag Info'].find(
        (item: { key: string }) => item.key === 'With Seeds',
      );

      expect(withSeeds?.value).toBe(2);
    });
  });

  describe('endpoint node', () => {
    it('should return endpoint info for operationId', () => {
      const state = buildInspectorState(registry, 'listPets');

      expect(state['Endpoint Info']).toBeDefined();
    });

    it('should include method', () => {
      const state = buildInspectorState(registry, 'listPets');
      const method = state['Endpoint Info'].find((item: { key: string }) => item.key === 'Method');

      expect(method?.value).toBe('GET');
    });

    it('should include path', () => {
      const state = buildInspectorState(registry, 'listPets');
      const path = state['Endpoint Info'].find((item: { key: string }) => item.key === 'Path');

      expect(path?.value).toBe('/pets');
    });

    it('should include parameters for endpoints with params', () => {
      const state = buildInspectorState(registry, 'listPets');

      expect(state['Parameters']).toBeDefined();
      expect(state['Parameters'].length).toBe(1);
    });

    it('should include request body for POST endpoints', () => {
      const state = buildInspectorState(registry, 'createPet');

      expect(state['Request Body']).toBeDefined();
    });

    it('should include responses', () => {
      const state = buildInspectorState(registry, 'getPetById');

      expect(state['Responses']).toBeDefined();
      expect(state['Responses'].length).toBe(2); // 200 and 404
    });

    it('should return error for non-existent endpoint', () => {
      const state = buildInspectorState(registry, 'nonexistent');

      expect(state['Error']).toBeDefined();
    });
  });
});
