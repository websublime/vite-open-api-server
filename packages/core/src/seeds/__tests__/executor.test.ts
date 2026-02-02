/**
 * Seed Executor Tests
 *
 * What: Unit tests for executeSeeds, createSeedHelper, and createSeedContext
 * How: Tests various seed scenarios including sync/async, errors, and edge cases
 * Why: Ensures seed execution is robust and predictable
 */

import { faker } from '@faker-js/faker';
import type { OpenAPIV3_1 } from '@scalar/openapi-types';
import { describe, expect, it, vi } from 'vitest';

import type { Logger } from '../../handlers/context.js';
import { createStore } from '../../store/index.js';
import type { SeedContext } from '../context.js';
import {
  createSeedContext,
  createSeedHelper,
  executeSeedDefinition,
  executeSeeds,
  SeedExecutorError,
} from '../executor.js';

/**
 * Create a mock logger for testing
 * Returns a Logger-compatible mock with vi.fn() for each method
 */
function createMockLogger(): Logger {
  return {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

/**
 * Create a minimal OpenAPI document for testing
 */
function createMockDocument(
  schemas: Record<string, OpenAPIV3_1.SchemaObject> = {},
): OpenAPIV3_1.Document {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
    },
    paths: {},
    components: {
      schemas,
    },
  };
}

describe('createSeedHelper', () => {
  describe('array invocation', () => {
    it('should return the same array when called with an array', () => {
      const helper = createSeedHelper();
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];

      const result = helper(items);

      expect(result).toBe(items);
      expect(result).toHaveLength(3);
    });

    it('should handle empty array', () => {
      const helper = createSeedHelper();

      const result = helper([]);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle array with various types', () => {
      const helper = createSeedHelper();
      const items = [{ id: 1, name: 'Pet 1' }, { id: 2, name: 'Pet 2' }, null, 'string', 42];

      const result = helper(items);

      expect(result).toHaveLength(5);
      expect(result[0]).toEqual({ id: 1, name: 'Pet 1' });
      expect(result[2]).toBeNull();
      expect(result[3]).toBe('string');
      expect(result[4]).toBe(42);
    });
  });

  describe('factory invocation', () => {
    it('should call factory once and wrap result in array', () => {
      const helper = createSeedHelper();
      const factory = vi.fn(() => ({ id: 1, name: 'Test' }));

      const result = helper(factory);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: 1, name: 'Test' });
    });

    it('should handle factory returning null', () => {
      const helper = createSeedHelper();

      const result = helper(() => null);

      expect(result).toEqual([null]);
    });

    it('should handle factory returning undefined', () => {
      const helper = createSeedHelper();

      const result = helper(() => undefined);

      expect(result).toEqual([undefined]);
    });
  });

  describe('count method', () => {
    it('should generate N items using factory', () => {
      const helper = createSeedHelper();

      const result = helper.count(5, (index) => ({
        id: index + 1,
        name: `Pet ${index + 1}`,
      }));

      expect(result).toHaveLength(5);
      expect(result[0]).toEqual({ id: 1, name: 'Pet 1' });
      expect(result[4]).toEqual({ id: 5, name: 'Pet 5' });
    });

    it('should pass correct index to factory', () => {
      const helper = createSeedHelper();
      const factory = vi.fn((index: number) => index);

      const result = helper.count(3, factory);

      expect(factory).toHaveBeenCalledTimes(3);
      expect(factory).toHaveBeenNthCalledWith(1, 0);
      expect(factory).toHaveBeenNthCalledWith(2, 1);
      expect(factory).toHaveBeenNthCalledWith(3, 2);
      expect(result).toEqual([0, 1, 2]);
    });

    it('should return empty array for count of 0', () => {
      const helper = createSeedHelper();

      const result = helper.count(0, () => ({ id: 1 }));

      expect(result).toEqual([]);
    });

    it('should return empty array for negative count', () => {
      const helper = createSeedHelper();

      const result = helper.count(-5, () => ({ id: 1 }));

      expect(result).toEqual([]);
    });

    it('should return empty array for non-integer count', () => {
      const helper = createSeedHelper();

      const result = helper.count(3.5, () => ({ id: 1 }));

      expect(result).toEqual([]);
    });

    it('should handle large count', () => {
      const helper = createSeedHelper();

      const result = helper.count(100, (i) => i);

      expect(result).toHaveLength(100);
      expect(result[0]).toBe(0);
      expect(result[99]).toBe(99);
    });
  });
});

describe('createSeedContext', () => {
  it('should create context with all required properties', () => {
    const store = createStore();
    const document = createMockDocument({
      Pet: { type: 'object', properties: { id: { type: 'integer' } } },
    });
    const logger = createMockLogger();

    const context = createSeedContext('Pet', store, document, logger);

    expect(context).toHaveProperty('seed');
    expect(context).toHaveProperty('store');
    expect(context).toHaveProperty('faker');
    expect(context).toHaveProperty('schema');
    expect(context).toHaveProperty('logger');
  });

  it('should provide working seed helper', () => {
    const store = createStore();
    const document = createMockDocument();
    const logger = createMockLogger();

    const context = createSeedContext('Pet', store, document, logger);

    const items = context.seed([{ id: 1 }, { id: 2 }]);
    expect(items).toHaveLength(2);

    const counted = context.seed.count(3, (i) => ({ id: i }));
    expect(counted).toHaveLength(3);
  });

  it('should provide the correct schema from document', () => {
    const store = createStore();
    const schema: OpenAPIV3_1.SchemaObject = {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
      },
      required: ['id', 'name'],
    };
    const document = createMockDocument({ Pet: schema });
    const logger = createMockLogger();

    const context = createSeedContext('Pet', store, document, logger);

    expect(context.schema).toEqual(schema);
  });

  it('should provide default schema when schema not found', () => {
    const store = createStore();
    const document = createMockDocument({});
    const logger = createMockLogger();

    const context = createSeedContext('NonExistent', store, document, logger);

    expect(context.schema).toEqual({ type: 'object' });
  });

  it('should provide working faker instance', () => {
    const store = createStore();
    const document = createMockDocument();
    const logger = createMockLogger();

    const context = createSeedContext('Pet', store, document, logger);

    expect(context.faker).toBe(faker);
    expect(typeof context.faker.string.uuid).toBe('function');
    expect(typeof context.faker.person.firstName).toBe('function');
  });

  it('should provide working store instance', () => {
    const store = createStore();
    const document = createMockDocument();
    const logger = createMockLogger();

    const context = createSeedContext('Pet', store, document, logger);

    expect(context.store).toBe(store);
    expect(typeof context.store.create).toBe('function');
    expect(typeof context.store.list).toBe('function');
  });
});

describe('executeSeeds', () => {
  describe('basic execution', () => {
    it('should execute seed function and populate store', async () => {
      const store = createStore();
      const document = createMockDocument();
      const seeds = new Map<string, (ctx: SeedContext) => unknown[]>();
      seeds.set('Pet', ({ seed }) =>
        seed([
          { id: 1, name: 'Buddy' },
          { id: 2, name: 'Max' },
        ]),
      );

      const result = await executeSeeds(seeds, store, document);

      expect(result.schemaCount).toBe(1);
      expect(result.totalItems).toBe(2);
      expect(result.itemsPerSchema.Pet).toBe(2);
      expect(store.list('Pet')).toHaveLength(2);
    });

    it('should execute multiple seed functions', async () => {
      const store = createStore();
      const document = createMockDocument();
      const seeds = new Map<string, (ctx: SeedContext) => unknown[]>();
      seeds.set('Pet', ({ seed }) => seed([{ id: 1, name: 'Buddy' }]));
      seeds.set('User', ({ seed }) => seed([{ id: 1, name: 'John' }]));
      seeds.set('Order', ({ seed }) => seed([{ id: 1, quantity: 2 }]));

      const result = await executeSeeds(seeds, store, document);

      expect(result.schemaCount).toBe(3);
      expect(result.totalItems).toBe(3);
      expect(store.list('Pet')).toHaveLength(1);
      expect(store.list('User')).toHaveLength(1);
      expect(store.list('Order')).toHaveLength(1);
    });

    it('should use seed.count correctly', async () => {
      const store = createStore();
      const document = createMockDocument();
      const seeds = new Map<string, (ctx: SeedContext) => unknown[]>();
      seeds.set('Pet', ({ seed }) =>
        seed.count(10, (i) => ({
          id: i + 1,
          name: `Pet ${i + 1}`,
        })),
      );

      const result = await executeSeeds(seeds, store, document);

      expect(result.totalItems).toBe(10);
      expect(store.list('Pet')).toHaveLength(10);
    });
  });

  describe('async seeds', () => {
    it('should handle async seed functions', async () => {
      const store = createStore();
      const document = createMockDocument();
      const seeds = new Map<string, (ctx: SeedContext) => Promise<unknown[]>>();
      seeds.set('Pet', async ({ seed }) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return seed([{ id: 1, name: 'Async Pet' }]);
      });

      const result = await executeSeeds(seeds, store, document);

      expect(result.totalItems).toBe(1);
      expect(store.get('Pet', 1)).toEqual({ id: 1, name: 'Async Pet' });
    });
  });

  describe('context access', () => {
    it('should allow seed to access faker', async () => {
      const store = createStore();
      const document = createMockDocument();
      const seeds = new Map<string, (ctx: SeedContext) => unknown[]>();
      seeds.set('Pet', ({ seed, faker: f }) =>
        seed.count(5, (i) => ({
          id: i + 1,
          name: f.animal.dog(),
          uuid: f.string.uuid(),
        })),
      );

      const result = await executeSeeds(seeds, store, document);

      expect(result.totalItems).toBe(5);
      const pets = store.list('Pet') as Array<{ id: number; name: string; uuid: string }>;
      expect(pets[0].uuid).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('should allow seed to access store for relationships', async () => {
      const store = createStore();
      const document = createMockDocument();
      const seeds = new Map<string, (ctx: SeedContext) => unknown[]>();

      // First seed: categories
      seeds.set('Category', ({ seed }) =>
        seed([
          { id: 1, name: 'Dogs' },
          { id: 2, name: 'Cats' },
        ]),
      );

      // Second seed: pets that reference categories
      seeds.set('Pet', ({ seed, store: s }) => {
        const categories = s.list('Category') as Array<{ id: number }>;
        return seed.count(2, (i) => ({
          id: i + 1,
          name: `Pet ${i + 1}`,
          categoryId: categories[i % categories.length].id,
        }));
      });

      const result = await executeSeeds(seeds, store, document);

      expect(result.schemaCount).toBe(2);
      const pets = store.list('Pet') as Array<{ id: number; categoryId: number }>;
      expect(pets[0].categoryId).toBe(1);
      expect(pets[1].categoryId).toBe(2);
    });

    it('should provide schema from document to context', async () => {
      const store = createStore();
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'object',
        properties: { id: { type: 'integer' } },
      };
      const document = createMockDocument({ Pet: schema });
      const seeds = new Map<string, (ctx: SeedContext) => unknown[]>();
      let capturedSchema: OpenAPIV3_1.SchemaObject | undefined;

      seeds.set('Pet', ({ seed, schema: s }) => {
        capturedSchema = s;
        return seed([{ id: 1 }]);
      });

      await executeSeeds(seeds, store, document);

      expect(capturedSchema).toEqual(schema);
    });
  });

  describe('options', () => {
    it('should clear store before seeding when clearBeforeSeeding is true', async () => {
      const store = createStore();
      store.create('Pet', { id: 1, name: 'Existing' });
      const document = createMockDocument();
      const seeds = new Map<string, (ctx: SeedContext) => unknown[]>();
      seeds.set('Pet', ({ seed }) => seed([{ id: 2, name: 'New' }]));

      await executeSeeds(seeds, store, document, {
        clearBeforeSeeding: true,
      });

      expect(store.list('Pet')).toHaveLength(1);
      expect(store.get('Pet', 2)).toBeTruthy();
      expect(store.get('Pet', 1)).toBeNull();
    });

    it('should not clear store when clearBeforeSeeding is false', async () => {
      const store = createStore();
      store.create('Pet', { id: 1, name: 'Existing' });
      const document = createMockDocument();
      const seeds = new Map<string, (ctx: SeedContext) => unknown[]>();
      seeds.set('User', ({ seed }) => seed([{ id: 1, name: 'New User' }]));

      await executeSeeds(seeds, store, document, {
        clearBeforeSeeding: false,
      });

      expect(store.list('Pet')).toHaveLength(1);
      expect(store.list('User')).toHaveLength(1);
    });

    it('should skip schema validation by default', async () => {
      const store = createStore();
      const document = createMockDocument({});
      const seeds = new Map<string, (ctx: SeedContext) => unknown[]>();
      seeds.set('NonExistentSchema', ({ seed }) => seed([{ id: 1 }]));

      const result = await executeSeeds(seeds, store, document);

      expect(result.schemaCount).toBe(1);
      expect(result.skippedSchemas).toHaveLength(0);
    });

    it('should skip and warn for non-existent schemas when validateSchemas is true', async () => {
      const store = createStore();
      const document = createMockDocument({ Pet: { type: 'object' } });
      const seeds = new Map<string, (ctx: SeedContext) => unknown[]>();
      seeds.set('NonExistentSchema', ({ seed }) => seed([{ id: 1 }]));
      seeds.set('Pet', ({ seed }) => seed([{ id: 1, name: 'Buddy' }]));
      const logger = createMockLogger();

      const result = await executeSeeds(seeds, store, document, {
        validateSchemas: true,
        logger,
      });

      expect(result.schemaCount).toBe(1);
      expect(result.skippedSchemas).toContain('NonExistentSchema');
      expect(result.warnings).toHaveLength(1);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should throw SeedExecutorError when seed function throws', async () => {
      const store = createStore();
      const document = createMockDocument();
      const seeds = new Map<string, (ctx: SeedContext) => unknown[]>();
      seeds.set('Pet', () => {
        throw new Error('Seed function error');
      });

      await expect(executeSeeds(seeds, store, document)).rejects.toThrow(SeedExecutorError);
    });

    it('should include schema name in SeedExecutorError', async () => {
      const store = createStore();
      const document = createMockDocument();
      const seeds = new Map<string, (ctx: SeedContext) => unknown[]>();
      seeds.set('MySchema', () => {
        throw new Error('Test error');
      });

      try {
        await executeSeeds(seeds, store, document);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(SeedExecutorError);
        expect((error as SeedExecutorError).schemaName).toBe('MySchema');
      }
    });

    it('should warn but continue when seed returns non-array', async () => {
      const store = createStore();
      const document = createMockDocument();
      const seeds = new Map<string, (ctx: SeedContext) => unknown[]>();
      seeds.set('Bad', () => 'not an array' as unknown as unknown[]);
      seeds.set('Good', ({ seed }) => seed([{ id: 1 }]));
      const logger = createMockLogger();

      const result = await executeSeeds(seeds, store, document, { logger });

      expect(result.schemaCount).toBe(1);
      expect(result.skippedSchemas).toContain('Bad');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should warn but continue when individual item creation fails', async () => {
      const store = createStore();
      const document = createMockDocument();
      const seeds = new Map<string, (ctx: SeedContext) => unknown[]>();
      seeds.set('Pet', ({ seed }) =>
        seed([
          { id: 1, name: 'First' },
          { id: 1, name: 'Duplicate ID' }, // Will fail - duplicate
          { id: 2, name: 'Second' },
        ]),
      );
      const logger = createMockLogger();

      const result = await executeSeeds(seeds, store, document, { logger });

      expect(result.totalItems).toBe(2);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(store.list('Pet')).toHaveLength(2);
    });
  });

  describe('result object', () => {
    it('should return accurate counts', async () => {
      const store = createStore();
      const document = createMockDocument();
      const seeds = new Map<string, (ctx: SeedContext) => unknown[]>();
      seeds.set('Pet', ({ seed }) => seed.count(5, (i) => ({ id: i + 1 })));
      seeds.set('User', ({ seed }) => seed.count(3, (i) => ({ id: i + 1 })));

      const result = await executeSeeds(seeds, store, document);

      expect(result.schemaCount).toBe(2);
      expect(result.totalItems).toBe(8);
      expect(result.itemsPerSchema).toEqual({
        Pet: 5,
        User: 3,
      });
    });

    it('should return empty result for no seeds', async () => {
      const store = createStore();
      const document = createMockDocument();
      const seeds = new Map<string, (ctx: SeedContext) => unknown[]>();

      const result = await executeSeeds(seeds, store, document);

      expect(result.schemaCount).toBe(0);
      expect(result.totalItems).toBe(0);
      expect(result.itemsPerSchema).toEqual({});
      expect(result.skippedSchemas).toEqual([]);
      expect(result.warnings).toEqual([]);
    });
  });
});

describe('executeSeedDefinition', () => {
  it('should work with plain object instead of Map', async () => {
    const store = createStore();
    const document = createMockDocument();
    const seeds = {
      Pet: ({ seed }: SeedContext) =>
        seed([
          { id: 1, name: 'Buddy' },
          { id: 2, name: 'Max' },
        ]),
    };

    const result = await executeSeedDefinition(seeds, store, document);

    expect(result.schemaCount).toBe(1);
    expect(result.totalItems).toBe(2);
    expect(store.list('Pet')).toHaveLength(2);
  });

  it('should pass options correctly', async () => {
    const store = createStore();
    store.create('Old', { id: 1, name: 'Existing' });
    const document = createMockDocument();
    const seeds = {
      New: ({ seed }: SeedContext) => seed([{ id: 1, name: 'New Item' }]),
    };

    await executeSeedDefinition(seeds, store, document, {
      clearBeforeSeeding: true,
    });

    expect(store.hasSchema('Old')).toBe(false);
    expect(store.list('New')).toHaveLength(1);
  });
});

describe('SeedExecutorError', () => {
  it('should create error with schema name and message', () => {
    const error = new SeedExecutorError('Pet', 'Something went wrong');

    expect(error.name).toBe('SeedExecutorError');
    expect(error.schemaName).toBe('Pet');
    expect(error.message).toBe('[Seed:Pet] Something went wrong');
  });

  it('should store cause if provided', () => {
    const cause = new Error('Original error');
    const error = new SeedExecutorError('Pet', 'Failed', cause);

    expect(error.cause).toBe(cause);
  });

  it('should be instanceof Error', () => {
    const error = new SeedExecutorError('Pet', 'Test');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SeedExecutorError);
  });
});
