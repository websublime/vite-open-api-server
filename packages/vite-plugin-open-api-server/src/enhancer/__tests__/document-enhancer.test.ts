/**
 * Document Enhancer Tests
 *
 * Tests for the OpenAPI document enhancer module that injects
 * x-handler and x-seed extensions into OpenAPI specs.
 *
 * @module
 */

import type { OpenAPIV3_1 } from 'openapi-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerCodeGenerator } from '../../types/handlers.js';
import type { SeedCodeGenerator } from '../../types/seeds.js';
import {
  cloneDocument,
  enhanceDocument,
  findOperationById,
  getExtension,
  hasExtension,
  setExtension,
} from '../document-enhancer.js';

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
          responses: {
            '200': {
              description: 'A list of pets',
            },
          },
        },
        post: {
          operationId: 'createPet',
          summary: 'Create a pet',
          responses: {
            '201': {
              description: 'Pet created',
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
              schema: { type: 'string' },
            },
          ],
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
    },
    ...overrides,
  };
}

/**
 * Create a mock handler function.
 */
function createMockHandler(): HandlerCodeGenerator {
  return vi.fn().mockResolvedValue({ status: 200, body: {} });
}

/**
 * Create a mock seed function.
 */
function createMockSeed(): SeedCodeGenerator {
  return vi.fn().mockResolvedValue([]);
}

describe('Document Enhancer', () => {
  describe('cloneDocument', () => {
    it('should create a deep copy of the document', () => {
      const original = createTestSpec();
      const cloned = cloneDocument(original);

      // Should be equal in structure
      expect(cloned).toEqual(original);

      // Should not be the same reference
      expect(cloned).not.toBe(original);
    });

    it('should not modify original when modifying clone', () => {
      const original = createTestSpec();
      const cloned = cloneDocument(original);

      // Modify the clone
      cloned.info.title = 'Modified Title';
      if (cloned.paths?.['/pets']?.get) {
        cloned.paths['/pets'].get.summary = 'Modified summary';
      }

      // Original should be unchanged
      expect(original.info.title).toBe('Test API');
      expect(original.paths?.['/pets']?.get?.summary).toBe('List all pets');
    });

    it('should handle nested objects', () => {
      const original = createTestSpec();
      const cloned = cloneDocument(original);

      // Components should also be cloned
      expect(cloned.components).not.toBe(original.components);
      expect(cloned.components?.schemas).not.toBe(original.components?.schemas);
    });

    it('should handle empty spec', () => {
      const original: OpenAPIV3_1.Document = {
        openapi: '3.1.0',
        info: { title: 'Empty', version: '1.0.0' },
      };
      const cloned = cloneDocument(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });
  });

  describe('findOperationById', () => {
    it('should find operation by operationId', () => {
      const spec = createTestSpec();
      const result = findOperationById(spec, 'getPetById');

      expect(result).not.toBeNull();
      expect(result?.path).toBe('/pets/{petId}');
      expect(result?.method).toBe('get');
      expect(result?.operation.operationId).toBe('getPetById');
    });

    it('should find operation for different HTTP methods', () => {
      const spec = createTestSpec();

      const getResult = findOperationById(spec, 'listPets');
      expect(getResult?.method).toBe('get');
      expect(getResult?.path).toBe('/pets');

      const postResult = findOperationById(spec, 'createPet');
      expect(postResult?.method).toBe('post');
      expect(postResult?.path).toBe('/pets');

      const deleteResult = findOperationById(spec, 'deletePet');
      expect(deleteResult?.method).toBe('delete');
      expect(deleteResult?.path).toBe('/pets/{petId}');
    });

    it('should return null for non-existent operationId', () => {
      const spec = createTestSpec();
      const result = findOperationById(spec, 'nonExistentOperation');

      expect(result).toBeNull();
    });

    it('should return null when paths is undefined', () => {
      const spec: OpenAPIV3_1.Document = {
        openapi: '3.1.0',
        info: { title: 'No Paths', version: '1.0.0' },
      };
      const result = findOperationById(spec, 'anyOperation');

      expect(result).toBeNull();
    });

    it('should return null when paths is empty', () => {
      const spec = createTestSpec({ paths: {} });
      const result = findOperationById(spec, 'anyOperation');

      expect(result).toBeNull();
    });

    it('should handle operations without operationId', () => {
      const spec: OpenAPIV3_1.Document = {
        openapi: '3.1.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/test': {
            get: {
              // No operationId
              responses: {
                '200': { description: 'OK' },
              },
            },
          },
        },
      };

      const result = findOperationById(spec, 'anyId');
      expect(result).toBeNull();
    });
  });

  describe('hasExtension', () => {
    it('should return true when extension exists', () => {
      const obj = { 'x-handler': () => {} };
      expect(hasExtension(obj, 'x-handler')).toBe(true);
    });

    it('should return false when extension does not exist', () => {
      const obj = { operationId: 'test' };
      expect(hasExtension(obj, 'x-handler')).toBe(false);
    });

    it('should return true for undefined extension value', () => {
      const obj = { 'x-handler': undefined };
      expect(hasExtension(obj, 'x-handler')).toBe(true);
    });

    it('should return true for null extension value', () => {
      const obj = { 'x-handler': null };
      expect(hasExtension(obj, 'x-handler')).toBe(true);
    });
  });

  describe('setExtension / getExtension', () => {
    it('should set and get extension value', () => {
      const obj: Record<string, unknown> = {};
      const value = { test: true };

      setExtension(obj, 'x-custom', value);
      expect(getExtension(obj, 'x-custom')).toBe(value);
    });

    it('should overwrite existing extension', () => {
      const obj = { 'x-custom': 'old' };

      setExtension(obj, 'x-custom', 'new');
      expect(getExtension(obj, 'x-custom')).toBe('new');
    });

    it('should return undefined for non-existent extension', () => {
      const obj = {};
      expect(getExtension(obj, 'x-nonexistent')).toBeUndefined();
    });

    it('should handle function values', () => {
      const obj: Record<string, unknown> = {};
      const fn = () => 'test';

      setExtension(obj, 'x-handler', fn);
      expect(getExtension<() => string>(obj, 'x-handler')).toBe(fn);
    });
  });

  describe('enhanceDocument', () => {
    let mockLogger: ReturnType<typeof createMockLogger>;

    beforeEach(() => {
      mockLogger = createMockLogger();
    });

    describe('handler injection', () => {
      it('should inject x-handler into matching operations', () => {
        const spec = createTestSpec();
        const handler = createMockHandler();
        const handlers = new Map([['getPetById', handler]]);
        const seeds = new Map<string, SeedCodeGenerator>();

        const result = enhanceDocument(spec, handlers, seeds, mockLogger);

        // Find the operation in the enhanced document
        const operationInfo = findOperationById(result.document, 'getPetById');
        expect(operationInfo).not.toBeNull();
        expect(getExtension(operationInfo?.operation as object, 'x-handler')).toBe(handler);
      });

      it('should inject multiple handlers', () => {
        const spec = createTestSpec();
        const handler1 = createMockHandler();
        const handler2 = createMockHandler();
        const handlers = new Map([
          ['listPets', handler1],
          ['createPet', handler2],
        ]);
        const seeds = new Map<string, SeedCodeGenerator>();

        const result = enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.handlerCount).toBe(2);

        const listPetsOp = findOperationById(result.document, 'listPets');
        expect(getExtension(listPetsOp?.operation as object, 'x-handler')).toBe(handler1);

        const createPetOp = findOperationById(result.document, 'createPet');
        expect(getExtension(createPetOp?.operation as object, 'x-handler')).toBe(handler2);
      });

      it('should skip handlers for non-existent operations', () => {
        const spec = createTestSpec();
        const handler = createMockHandler();
        const handlers = new Map([['nonExistentOperation', handler]]);
        const seeds = new Map<string, SeedCodeGenerator>();

        const result = enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.handlerCount).toBe(0);
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Skipped handler "nonExistentOperation"'),
          expect.any(Object),
        );
      });

      it('should log info for each injected handler', () => {
        const spec = createTestSpec();
        const handlers = new Map([['getPetById', createMockHandler()]]);
        const seeds = new Map<string, SeedCodeGenerator>();

        enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Injected x-handler into GET /pets/{petId} (getPetById)'),
          expect.any(Object),
        );
      });
    });

    describe('seed injection', () => {
      it('should inject x-seed into matching schemas', () => {
        const spec = createTestSpec();
        const seed = createMockSeed();
        const handlers = new Map<string, HandlerCodeGenerator>();
        const seeds = new Map([['Pet', seed]]);

        const result = enhanceDocument(spec, handlers, seeds, mockLogger);

        const petSchema = result.document.components?.schemas?.Pet;
        expect(petSchema).toBeDefined();
        expect(getExtension(petSchema as object, 'x-seed')).toBe(seed);
      });

      it('should inject multiple seeds', () => {
        const spec = createTestSpec();
        const seed1 = createMockSeed();
        const seed2 = createMockSeed();
        const handlers = new Map<string, HandlerCodeGenerator>();
        const seeds = new Map([
          ['Pet', seed1],
          ['Order', seed2],
        ]);

        const result = enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.seedCount).toBe(2);

        const petSchema = result.document.components?.schemas?.Pet;
        expect(getExtension(petSchema as object, 'x-seed')).toBe(seed1);

        const orderSchema = result.document.components?.schemas?.Order;
        expect(getExtension(orderSchema as object, 'x-seed')).toBe(seed2);
      });

      it('should skip seeds for non-existent schemas', () => {
        const spec = createTestSpec();
        const seed = createMockSeed();
        const handlers = new Map<string, HandlerCodeGenerator>();
        const seeds = new Map([['NonExistentSchema', seed]]);

        const result = enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.seedCount).toBe(0);
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Skipped seed "NonExistentSchema"'),
          expect.any(Object),
        );
      });

      it('should log info for each injected seed', () => {
        const spec = createTestSpec();
        const handlers = new Map<string, HandlerCodeGenerator>();
        const seeds = new Map([['Pet', createMockSeed()]]);

        enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Injected x-seed into schema Pet'),
          expect.any(Object),
        );
      });

      it('should handle spec without components.schemas', () => {
        const spec: OpenAPIV3_1.Document = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
        };
        const handlers = new Map<string, HandlerCodeGenerator>();
        const seeds = new Map([['Pet', createMockSeed()]]);

        const result = enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.seedCount).toBe(0);
      });
    });

    describe('preservation checks (override behavior)', () => {
      it('should warn when overriding existing x-handler', () => {
        const spec = createTestSpec();
        // Pre-add x-handler to the operation
        const operation = spec.paths?.['/pets/{petId}']?.get;
        if (operation) {
          (operation as Record<string, unknown>)['x-handler'] = 'existingHandler';
        }

        const handler = createMockHandler();
        const handlers = new Map([['getPetById', handler]]);
        const seeds = new Map<string, SeedCodeGenerator>();

        const result = enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Overriding existing x-handler for getPetById'),
          expect.any(Object),
        );
        expect(result.overrideCount).toBe(1);

        // Should still inject the new handler
        const operationInfo = findOperationById(result.document, 'getPetById');
        expect(getExtension(operationInfo?.operation as object, 'x-handler')).toBe(handler);
      });

      it('should warn when overriding existing x-seed', () => {
        const spec = createTestSpec();
        // Pre-add x-seed to the schema
        const petSchema = spec.components?.schemas?.Pet;
        if (petSchema) {
          (petSchema as Record<string, unknown>)['x-seed'] = 'existingSeed';
        }

        const seed = createMockSeed();
        const handlers = new Map<string, HandlerCodeGenerator>();
        const seeds = new Map([['Pet', seed]]);

        const result = enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Overriding existing x-seed for Pet'),
          expect.any(Object),
        );
        expect(result.overrideCount).toBe(1);

        // Should still inject the new seed
        const schema = result.document.components?.schemas?.Pet;
        expect(getExtension(schema as object, 'x-seed')).toBe(seed);
      });

      it('should count multiple overrides', () => {
        const spec = createTestSpec();
        // Pre-add extensions
        const operation = spec.paths?.['/pets/{petId}']?.get;
        if (operation) {
          (operation as Record<string, unknown>)['x-handler'] = 'existing';
        }
        const schema = spec.components?.schemas?.Pet;
        if (schema) {
          (schema as Record<string, unknown>)['x-seed'] = 'existing';
        }

        const handlers = new Map([['getPetById', createMockHandler()]]);
        const seeds = new Map([['Pet', createMockSeed()]]);

        const result = enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.overrideCount).toBe(2);
      });
    });

    describe('empty maps', () => {
      it('should handle empty handlers map', () => {
        const spec = createTestSpec();
        const handlers = new Map<string, HandlerCodeGenerator>();
        const seeds = new Map([['Pet', createMockSeed()]]);

        const result = enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.handlerCount).toBe(0);
        expect(result.seedCount).toBe(1);
      });

      it('should handle empty seeds map', () => {
        const spec = createTestSpec();
        const handlers = new Map([['getPetById', createMockHandler()]]);
        const seeds = new Map<string, SeedCodeGenerator>();

        const result = enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.handlerCount).toBe(1);
        expect(result.seedCount).toBe(0);
      });

      it('should handle both maps empty', () => {
        const spec = createTestSpec();
        const handlers = new Map<string, HandlerCodeGenerator>();
        const seeds = new Map<string, SeedCodeGenerator>();

        const result = enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.handlerCount).toBe(0);
        expect(result.seedCount).toBe(0);
        expect(result.overrideCount).toBe(0);
      });
    });

    describe('original spec preservation', () => {
      it('should not modify the original spec', () => {
        const spec = createTestSpec();
        const originalSpecString = JSON.stringify(spec);

        const handlers = new Map([['getPetById', createMockHandler()]]);
        const seeds = new Map([['Pet', createMockSeed()]]);

        enhanceDocument(spec, handlers, seeds, mockLogger);

        // Original spec should be unchanged
        expect(JSON.stringify(spec)).toBe(originalSpecString);
      });

      it('should return a new document object', () => {
        const spec = createTestSpec();
        const handlers = new Map<string, HandlerCodeGenerator>();
        const seeds = new Map<string, SeedCodeGenerator>();

        const result = enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.document).not.toBe(spec);
      });
    });

    describe('summary logging', () => {
      it('should log summary with handler and seed counts', () => {
        const spec = createTestSpec();
        const handlers = new Map([
          ['getPetById', createMockHandler()],
          ['listPets', createMockHandler()],
        ]);
        const seeds = new Map([['Pet', createMockSeed()]]);

        enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Enhanced document: 2 handler(s), 1 seed(s)'),
          expect.any(Object),
        );
      });

      it('should include override count in summary when present', () => {
        const spec = createTestSpec();
        // Pre-add extension to trigger override
        const operation = spec.paths?.['/pets/{petId}']?.get;
        if (operation) {
          (operation as Record<string, unknown>)['x-handler'] = 'existing';
        }

        const handlers = new Map([['getPetById', createMockHandler()]]);
        const seeds = new Map<string, SeedCodeGenerator>();

        enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('1 override(s)'),
          expect.any(Object),
        );
      });

      it('should not include override count when zero', () => {
        const spec = createTestSpec();
        const handlers = new Map([['getPetById', createMockHandler()]]);
        const seeds = new Map<string, SeedCodeGenerator>();

        enhanceDocument(spec, handlers, seeds, mockLogger);

        // The summary should not mention overrides
        const summaryCalls = mockLogger.info.mock.calls.filter((call) =>
          call[0].includes('Enhanced document:'),
        );
        expect(summaryCalls.length).toBe(1);
        expect(summaryCalls[0][0]).not.toContain('override');
      });
    });

    describe('result object', () => {
      it('should return correct result structure', () => {
        const spec = createTestSpec();
        const handlers = new Map([['getPetById', createMockHandler()]]);
        const seeds = new Map([['Pet', createMockSeed()]]);

        const result = enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result).toHaveProperty('document');
        expect(result).toHaveProperty('handlerCount');
        expect(result).toHaveProperty('seedCount');
        expect(result).toHaveProperty('overrideCount');
      });

      it('should return valid OpenAPI document', () => {
        const spec = createTestSpec();
        const handlers = new Map<string, HandlerCodeGenerator>();
        const seeds = new Map<string, SeedCodeGenerator>();

        const result = enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.document.openapi).toBe('3.1.0');
        expect(result.document.info).toBeDefined();
        expect(result.document.info.title).toBe('Test API');
      });
    });
  });
});
