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
import type { HandlerCodeContext, HandlerValue } from '../../types/handlers.js';
import type { SeedCodeContext, SeedValue } from '../../types/seeds.js';
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
 * Create a test OpenAPI spec.
 */
function createTestSpec(): OpenAPIV3_1.Document {
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
  };
}

describe('Document Enhancer', () => {
  describe('cloneDocument', () => {
    it('should create a deep copy of the document', () => {
      const original = createTestSpec();
      const cloned = cloneDocument(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });

    it('should not modify original when modifying clone', () => {
      const original = createTestSpec();
      const cloned = cloneDocument(original);

      // Modify the clone
      if (cloned.paths?.['/pets']?.get) {
        cloned.paths['/pets'].get.operationId = 'modified';
      }

      // Original should be unchanged
      expect(original.paths?.['/pets']?.get?.operationId).toBe('listPets');
    });

    it('should handle nested objects', () => {
      const original = createTestSpec();
      const cloned = cloneDocument(original);

      expect(cloned.components?.schemas?.Pet).toEqual(original.components?.schemas?.Pet);
      expect(cloned.components?.schemas?.Pet).not.toBe(original.components?.schemas?.Pet);
    });

    it('should handle empty spec', () => {
      const original: OpenAPIV3_1.Document = {
        openapi: '3.1.0',
        info: { title: 'Test', version: '1.0.0' },
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
      const result = findOperationById(spec, 'nonExistent');

      expect(result).toBeNull();
    });

    it('should return null when paths is undefined', () => {
      const spec: OpenAPIV3_1.Document = {
        openapi: '3.1.0',
        info: { title: 'Test', version: '1.0.0' },
      };
      const result = findOperationById(spec, 'getPetById');

      expect(result).toBeNull();
    });

    it('should return null when paths is empty', () => {
      const spec = { ...createTestSpec(), paths: {} };
      const result = findOperationById(spec, 'getPetById');

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

      const result = findOperationById(spec, 'getPetById');
      expect(result).toBeNull();
    });
  });

  describe('hasExtension', () => {
    it('should return true when extension exists', () => {
      const obj = { 'x-handler': 'some code' };
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
      const value = 'return store.get("Pet", req.params.petId);';

      setExtension(obj, 'x-custom', value);
      expect(getExtension(obj, 'x-custom')).toBe(value);
    });

    it('should overwrite existing extension', () => {
      const obj = { 'x-custom': 'old value' };
      setExtension(obj, 'x-custom', 'new value');
      expect(getExtension(obj, 'x-custom')).toBe('new value');
    });

    it('should return undefined for non-existent extension', () => {
      const obj = {};
      expect(getExtension(obj, 'x-missing')).toBeUndefined();
    });

    it('should handle string values', () => {
      const obj: Record<string, unknown> = {};
      const code = 'return store.list("Pet");';
      setExtension(obj, 'x-handler', code);
      expect(getExtension(obj, 'x-handler')).toBe(code);
    });
  });

  describe('enhanceDocument', () => {
    let mockLogger: ReturnType<typeof createMockLogger>;

    beforeEach(() => {
      mockLogger = createMockLogger();
    });

    describe('static handler injection', () => {
      it('should inject static x-handler code into matching operations', async () => {
        const spec = createTestSpec();
        const handlerCode = 'return store.get("Pet", req.params.petId);';
        const handlers = new Map<string, HandlerValue>([['getPetById', handlerCode]]);
        const seeds = new Map<string, SeedValue>();

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        const operationInfo = findOperationById(result.document, 'getPetById');
        expect(operationInfo).not.toBeNull();
        expect(getExtension(operationInfo!.operation, 'x-handler')).toBe(handlerCode);
      });

      it('should inject multiple static handlers', async () => {
        const spec = createTestSpec();
        const handlers = new Map<string, HandlerValue>([
          ['listPets', 'return store.list("Pet");'],
          ['createPet', 'return store.create("Pet", req.body);'],
        ]);
        const seeds = new Map<string, SeedValue>();

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.handlerCount).toBe(2);

        const listPetsOp = findOperationById(result.document, 'listPets');
        expect(getExtension(listPetsOp!.operation, 'x-handler')).toBe('return store.list("Pet");');

        const createPetOp = findOperationById(result.document, 'createPet');
        expect(getExtension(createPetOp!.operation, 'x-handler')).toBe(
          'return store.create("Pet", req.body);',
        );
      });
    });

    describe('dynamic handler injection', () => {
      it('should resolve and inject dynamic handler code', async () => {
        const spec = createTestSpec();
        const dynamicHandler: HandlerValue = (ctx: HandlerCodeContext) => {
          const has404 = ctx.operation?.responses?.['404'];
          return `
            const pet = store.get("Pet", req.params.petId);
            ${has404 ? 'if (!pet) return res["404"];' : ''}
            return pet;
          `;
        };
        const handlers = new Map<string, HandlerValue>([['getPetById', dynamicHandler]]);
        const seeds = new Map<string, SeedValue>();

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        const operationInfo = findOperationById(result.document, 'getPetById');
        const injectedCode = getExtension<string>(operationInfo!.operation, 'x-handler');

        expect(injectedCode).toContain('store.get("Pet"');
        expect(injectedCode).toContain('res["404"]'); // Should include 404 handling
      });

      it('should pass correct context to dynamic handlers', async () => {
        const spec = createTestSpec();
        const contextSpy = vi.fn().mockReturnValue('return "test";');

        const handlers = new Map<string, HandlerValue>([['getPetById', contextSpy]]);
        const seeds = new Map<string, SeedValue>();

        await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(contextSpy).toHaveBeenCalledTimes(1);
        const context = contextSpy.mock.calls[0][0] as HandlerCodeContext;

        expect(context.operationId).toBe('getPetById');
        expect(context.path).toBe('/pets/{petId}');
        expect(context.method).toBe('get');
        expect(context.operation).toBeDefined();
        expect(context.operation.operationId).toBe('getPetById');
        expect(context.document).toBeDefined();
      });

      it('should handle async dynamic handlers', async () => {
        const spec = createTestSpec();
        const asyncHandler: HandlerValue = async (_ctx: HandlerCodeContext) => {
          // Simulate async operation
          await Promise.resolve();
          return 'return store.list("Pet");';
        };

        const handlers = new Map<string, HandlerValue>([['listPets', asyncHandler]]);
        const seeds = new Map<string, SeedValue>();

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        const operationInfo = findOperationById(result.document, 'listPets');
        expect(getExtension(operationInfo!.operation, 'x-handler')).toBe(
          'return store.list("Pet");',
        );
      });
    });

    describe('static seed injection', () => {
      it('should inject static x-seed code into matching schemas', async () => {
        const spec = createTestSpec();
        const seedCode = `seed.count(15, () => ({ id: faker.number.int(), name: faker.animal.dog() }))`;
        const handlers = new Map<string, HandlerValue>();
        const seeds = new Map<string, SeedValue>([['Pet', seedCode]]);

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        const petSchema = result.document.components?.schemas?.Pet;
        expect(petSchema).toBeDefined();
        expect(getExtension(petSchema as object, 'x-seed')).toBe(seedCode);
      });

      it('should inject multiple static seeds', async () => {
        const spec = createTestSpec();
        const handlers = new Map<string, HandlerValue>();
        const seeds = new Map<string, SeedValue>([
          ['Pet', 'seed.count(15, () => ({ name: faker.animal.dog() }))'],
          ['Order', 'seed.count(20, () => ({ id: faker.number.int() }))'],
        ]);

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.seedCount).toBe(2);

        const petSchema = result.document.components?.schemas?.Pet;
        expect(getExtension(petSchema as object, 'x-seed')).toContain('faker.animal.dog');

        const orderSchema = result.document.components?.schemas?.Order;
        expect(getExtension(orderSchema as object, 'x-seed')).toContain('faker.number.int');
      });
    });

    describe('dynamic seed injection', () => {
      it('should resolve and inject dynamic seed code', async () => {
        const spec = createTestSpec();
        const dynamicSeed: SeedValue = (ctx: SeedCodeContext) => {
          const hasStatus = ctx.schema?.properties?.status;
          return `
            seed.count(15, () => ({
              id: faker.number.int(),
              name: faker.animal.dog(),
              ${hasStatus ? "status: faker.helpers.arrayElement(['available', 'pending', 'sold'])," : ''}
            }))
          `;
        };

        const handlers = new Map<string, HandlerValue>();
        const seeds = new Map<string, SeedValue>([['Pet', dynamicSeed]]);

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        const petSchema = result.document.components?.schemas?.Pet;
        const injectedCode = getExtension<string>(petSchema as object, 'x-seed');

        expect(injectedCode).toContain('seed.count');
        expect(injectedCode).toContain('faker.helpers.arrayElement'); // Should include status
      });

      it('should pass correct context to dynamic seeds', async () => {
        const spec = createTestSpec();
        const contextSpy = vi.fn().mockReturnValue('seed([])');

        const handlers = new Map<string, HandlerValue>();
        const seeds = new Map<string, SeedValue>([['Pet', contextSpy]]);

        await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(contextSpy).toHaveBeenCalledTimes(1);
        const context = contextSpy.mock.calls[0][0] as SeedCodeContext;

        expect(context.schemaName).toBe('Pet');
        expect(context.schema).toBeDefined();
        expect(context.schema.type).toBe('object');
        expect(context.document).toBeDefined();
        expect(context.schemas).toBeDefined();
        expect(context.schemas.Pet).toBeDefined();
        expect(context.schemas.Order).toBeDefined();
      });

      it('should handle async dynamic seeds', async () => {
        const spec = createTestSpec();
        const asyncSeed: SeedValue = async (_ctx: SeedCodeContext) => {
          await Promise.resolve();
          return 'seed.count(10, () => ({ id: faker.number.int() }))';
        };

        const handlers = new Map<string, HandlerValue>();
        const seeds = new Map<string, SeedValue>([['Pet', asyncSeed]]);

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        const petSchema = result.document.components?.schemas?.Pet;
        expect(getExtension(petSchema as object, 'x-seed')).toContain('seed.count(10');
      });
    });

    describe('skip and warning behavior', () => {
      it('should skip handlers for non-existent operations', async () => {
        const spec = createTestSpec();
        const handlers = new Map<string, HandlerValue>([['nonExistentOperation', 'return null;']]);
        const seeds = new Map<string, SeedValue>();

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.handlerCount).toBe(0);
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Skipped handler "nonExistentOperation"'),
          expect.any(Object),
        );
      });

      it('should skip seeds for non-existent schemas', async () => {
        const spec = createTestSpec();
        const handlers = new Map<string, HandlerValue>();
        const seeds = new Map<string, SeedValue>([['NonExistentSchema', 'seed([])']]);

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.seedCount).toBe(0);
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Skipped seed "NonExistentSchema"'),
          expect.any(Object),
        );
      });

      it('should handle spec without components.schemas', async () => {
        const spec: OpenAPIV3_1.Document = {
          openapi: '3.1.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {},
        };
        const handlers = new Map<string, HandlerValue>();
        const seeds = new Map<string, SeedValue>([['Pet', 'seed([])']]);

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.seedCount).toBe(0);
      });
    });

    describe('preservation checks (override behavior)', () => {
      it('should warn when overriding existing x-handler', async () => {
        const spec = createTestSpec();
        const operation = spec.paths?.['/pets/{petId}']?.get;
        if (operation) {
          (operation as Record<string, unknown>)['x-handler'] = 'existing handler';
        }

        const handlers = new Map<string, HandlerValue>([
          ['getPetById', 'return store.get("Pet");'],
        ]);
        const seeds = new Map<string, SeedValue>();

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.overrideCount).toBe(1);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Overriding existing x-handler'),
          expect.any(Object),
        );

        const operationInfo = findOperationById(result.document, 'getPetById');
        expect(getExtension(operationInfo!.operation, 'x-handler')).toBe(
          'return store.get("Pet");',
        );
      });

      it('should warn when overriding existing x-seed', async () => {
        const spec = createTestSpec();
        const petSchema = spec.components?.schemas?.Pet;
        if (petSchema) {
          (petSchema as Record<string, unknown>)['x-seed'] = 'existing seed';
        }

        const handlers = new Map<string, HandlerValue>();
        const seeds = new Map<string, SeedValue>([['Pet', 'seed.count(10, () => ({}))']]);

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.overrideCount).toBe(1);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Overriding existing x-seed'),
          expect.any(Object),
        );

        const schema = result.document.components?.schemas?.Pet;
        expect(getExtension(schema as object, 'x-seed')).toBe('seed.count(10, () => ({}))');
      });

      it('should count multiple overrides', async () => {
        const spec = createTestSpec();
        const operation = spec.paths?.['/pets/{petId}']?.get;
        if (operation) {
          (operation as Record<string, unknown>)['x-handler'] = 'existing';
        }
        const schema = spec.components?.schemas?.Pet;
        if (schema) {
          (schema as Record<string, unknown>)['x-seed'] = 'existing';
        }

        const handlers = new Map<string, HandlerValue>([['getPetById', 'return null;']]);
        const seeds = new Map<string, SeedValue>([['Pet', 'seed([])']]);

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.overrideCount).toBe(2);
      });
    });

    describe('empty maps', () => {
      it('should handle empty handlers map', async () => {
        const spec = createTestSpec();
        const handlers = new Map<string, HandlerValue>();
        const seeds = new Map<string, SeedValue>([['Pet', 'seed([])']]);

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.handlerCount).toBe(0);
        expect(result.seedCount).toBe(1);
      });

      it('should handle empty seeds map', async () => {
        const spec = createTestSpec();
        const handlers = new Map<string, HandlerValue>([['getPetById', 'return null;']]);
        const seeds = new Map<string, SeedValue>();

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.handlerCount).toBe(1);
        expect(result.seedCount).toBe(0);
      });

      it('should handle both maps empty', async () => {
        const spec = createTestSpec();
        const handlers = new Map<string, HandlerValue>();
        const seeds = new Map<string, SeedValue>();

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.handlerCount).toBe(0);
        expect(result.seedCount).toBe(0);
        expect(result.overrideCount).toBe(0);
      });
    });

    describe('original spec preservation', () => {
      it('should not modify the original spec', async () => {
        const spec = createTestSpec();
        const originalSpecString = JSON.stringify(spec);

        const handlers = new Map<string, HandlerValue>([['getPetById', 'return null;']]);
        const seeds = new Map<string, SeedValue>([['Pet', 'seed([])']]);

        await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(JSON.stringify(spec)).toBe(originalSpecString);
      });

      it('should return a new document object', async () => {
        const spec = createTestSpec();
        const handlers = new Map<string, HandlerValue>();
        const seeds = new Map<string, SeedValue>();

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.document).not.toBe(spec);
      });
    });

    describe('summary logging', () => {
      it('should log summary with handler and seed counts', async () => {
        const spec = createTestSpec();
        const handlers = new Map<string, HandlerValue>([
          ['listPets', 'return store.list("Pet");'],
          ['getPetById', 'return store.get("Pet");'],
        ]);
        const seeds = new Map<string, SeedValue>([['Pet', 'seed([])']]);

        await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Enhanced document:'),
          expect.any(Object),
        );
      });

      it('should include override count in summary when present', async () => {
        const spec = createTestSpec();
        const operation = spec.paths?.['/pets/{petId}']?.get;
        if (operation) {
          (operation as Record<string, unknown>)['x-handler'] = 'existing';
        }

        const handlers = new Map<string, HandlerValue>([['getPetById', 'return null;']]);
        const seeds = new Map<string, SeedValue>();

        await enhanceDocument(spec, handlers, seeds, mockLogger);

        const summaryCalls = mockLogger.info.mock.calls.filter((call) =>
          call[0].includes('Enhanced document:'),
        );
        expect(summaryCalls.length).toBeGreaterThan(0);
        expect(summaryCalls[0][0]).toContain('override');
      });

      it('should not include override count when zero', async () => {
        const spec = createTestSpec();
        const handlers = new Map<string, HandlerValue>([['getPetById', 'return null;']]);
        const seeds = new Map<string, SeedValue>();

        await enhanceDocument(spec, handlers, seeds, mockLogger);

        const summaryCalls = mockLogger.info.mock.calls.filter((call) =>
          call[0].includes('Enhanced document:'),
        );
        expect(summaryCalls.length).toBeGreaterThan(0);
        expect(summaryCalls[0][0]).not.toContain('override');
      });
    });

    describe('result object', () => {
      it('should return correct result structure', async () => {
        const spec = createTestSpec();
        const handlers = new Map<string, HandlerValue>([['getPetById', 'return null;']]);
        const seeds = new Map<string, SeedValue>([['Pet', 'seed([])']]);

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result).toHaveProperty('document');
        expect(result).toHaveProperty('handlerCount');
        expect(result).toHaveProperty('seedCount');
        expect(result).toHaveProperty('overrideCount');
      });

      it('should return valid OpenAPI document', async () => {
        const spec = createTestSpec();
        const handlers = new Map<string, HandlerValue>();
        const seeds = new Map<string, SeedValue>();

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.document.openapi).toBe('3.1.0');
        expect(result.document.info).toBeDefined();
        expect(result.document.paths).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should log error when handler resolution fails', async () => {
        const spec = createTestSpec();
        const failingHandler: HandlerValue = () => {
          throw new Error('Handler generation failed');
        };

        const handlers = new Map<string, HandlerValue>([['getPetById', failingHandler]]);
        const seeds = new Map<string, SeedValue>();

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.handlerCount).toBe(0);
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to resolve handler'),
          expect.any(Object),
        );
      });

      it('should log error when seed resolution fails', async () => {
        const spec = createTestSpec();
        const failingSeed: SeedValue = () => {
          throw new Error('Seed generation failed');
        };

        const handlers = new Map<string, HandlerValue>();
        const seeds = new Map<string, SeedValue>([['Pet', failingSeed]]);

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.seedCount).toBe(0);
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to resolve seed'),
          expect.any(Object),
        );
      });

      it('should continue processing after resolution error', async () => {
        const spec = createTestSpec();
        const failingHandler: HandlerValue = () => {
          throw new Error('Failed');
        };

        const handlers = new Map<string, HandlerValue>([
          ['listPets', failingHandler],
          ['getPetById', 'return store.get("Pet");'],
        ]);
        const seeds = new Map<string, SeedValue>();

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        // One failed, one succeeded
        expect(result.handlerCount).toBe(1);
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });

    describe('mixed static and dynamic values', () => {
      it('should handle mixed static and dynamic handlers', async () => {
        const spec = createTestSpec();
        const handlers = new Map<string, HandlerValue>([
          ['listPets', 'return store.list("Pet");'], // static
          ['getPetById', (ctx) => `return store.get("Pet", req.params.petId); // ${ctx.method}`], // dynamic
        ]);
        const seeds = new Map<string, SeedValue>();

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.handlerCount).toBe(2);

        const listPetsOp = findOperationById(result.document, 'listPets');
        expect(getExtension(listPetsOp!.operation, 'x-handler')).toBe('return store.list("Pet");');

        const getPetByIdOp = findOperationById(result.document, 'getPetById');
        const dynamicCode = getExtension<string>(getPetByIdOp!.operation, 'x-handler');
        expect(dynamicCode).toContain('store.get("Pet"');
        expect(dynamicCode).toContain('// get');
      });

      it('should handle mixed static and dynamic seeds', async () => {
        const spec = createTestSpec();
        const handlers = new Map<string, HandlerValue>();
        const seeds = new Map<string, SeedValue>([
          ['Pet', 'seed.count(15, () => ({ name: faker.animal.dog() }))'], // static
          ['Order', (ctx) => `seed.count(20, () => ({ schema: "${ctx.schemaName}" }))`], // dynamic
        ]);

        const result = await enhanceDocument(spec, handlers, seeds, mockLogger);

        expect(result.seedCount).toBe(2);

        const petSchema = result.document.components?.schemas?.Pet;
        expect(getExtension(petSchema as object, 'x-seed')).toContain('faker.animal.dog');

        const orderSchema = result.document.components?.schemas?.Order;
        const dynamicCode = getExtension<string>(orderSchema as object, 'x-seed');
        expect(dynamicCode).toContain('schema: "Order"');
      });
    });
  });
});
