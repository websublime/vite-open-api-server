/**
 * Define Seeds Tests
 *
 * What: Unit tests for defineSeeds type helper
 * How: Tests that the helper correctly returns seeds with preserved types
 * Why: Ensures type helper works as expected for seed definitions
 */

import { faker } from '@faker-js/faker';
import { describe, expect, it, vi } from 'vitest';

import { createStore } from '../../store/index.js';
import type { SeedContext, SeedHelper } from '../context.js';
import { defineSeeds, type SeedDefinition } from '../define-seeds.js';

describe('defineSeeds', () => {
  describe('basic functionality', () => {
    it('should return the same seeds object', () => {
      const seeds = {
        Pet: (): unknown[] => [{ id: 1, name: 'Buddy' }],
      };

      const result = defineSeeds(seeds);

      expect(result).toBe(seeds);
    });

    it('should preserve seed functions', () => {
      const seeds = defineSeeds({
        Pet: (): unknown[] => [{ id: 1 }],
        User: (): unknown[] => [{ id: 1, name: 'John' }],
        Order: (): unknown[] => [{ id: 1, quantity: 2 }],
      });

      expect(typeof seeds.Pet).toBe('function');
      expect(typeof seeds.User).toBe('function');
      expect(typeof seeds.Order).toBe('function');
    });

    it('should allow calling seed functions', () => {
      const seeds = defineSeeds({
        Pet: (ctx: SeedContext): unknown[] =>
          ctx.seed([
            { id: 1, name: 'Buddy' },
            { id: 2, name: 'Max' },
          ]),
      });

      const mockContext = createMinimalContext();
      const result = seeds.Pet(mockContext);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 1, name: 'Buddy' });
    });
  });

  describe('seed helper usage', () => {
    it('should support seed with array', () => {
      const seeds = defineSeeds({
        Category: ({ seed }: SeedContext): unknown[] =>
          seed([
            { id: 1, name: 'Dogs' },
            { id: 2, name: 'Cats' },
            { id: 3, name: 'Birds' },
          ]),
      });

      const mockContext = createMinimalContext();
      const result = seeds.Category(mockContext);

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        { id: 1, name: 'Dogs' },
        { id: 2, name: 'Cats' },
        { id: 3, name: 'Birds' },
      ]);
    });

    it('should support seed.count', () => {
      const seeds = defineSeeds({
        Pet: ({ seed }: SeedContext): unknown[] =>
          seed.count(5, (index) => ({
            id: index + 1,
            name: `Pet ${index + 1}`,
          })),
      });

      const mockContext = createMinimalContext();
      const result = seeds.Pet(mockContext);

      expect(result).toHaveLength(5);
      expect(result[0]).toEqual({ id: 1, name: 'Pet 1' });
      expect(result[4]).toEqual({ id: 5, name: 'Pet 5' });
    });

    it('should support seed with factory function', () => {
      const seeds = defineSeeds({
        Single: ({ seed }: SeedContext): unknown[] =>
          seed(() => ({
            id: 1,
            generated: true,
          })),
      });

      const mockContext = createMinimalContext();
      const result = seeds.Single(mockContext);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: 1, generated: true });
    });
  });

  describe('context access', () => {
    it('should allow access to faker', () => {
      const seeds = defineSeeds({
        Pet: ({ seed, faker }: SeedContext): unknown[] =>
          seed.count(3, (i) => ({
            id: i + 1,
            uuid: faker.string.uuid(),
            name: faker.animal.dog(),
          })),
      });

      const mockContext = createMinimalContext();
      const result = seeds.Pet(mockContext) as Array<{ id: number; uuid: string; name: string }>;

      expect(result).toHaveLength(3);
      expect(result[0].uuid).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('should allow access to store', () => {
      const seeds = defineSeeds({
        Order: ({ seed, store }: SeedContext): unknown[] => {
          const pets = store.list('Pet');
          return seed.count(2, (i) => ({
            id: i + 1,
            petCount: pets.length,
          }));
        },
      });

      const mockContext = createMinimalContext();
      mockContext.store.create('Pet', { id: 1, name: 'Buddy' });
      mockContext.store.create('Pet', { id: 2, name: 'Max' });

      const result = seeds.Order(mockContext) as Array<{ id: number; petCount: number }>;

      expect(result[0].petCount).toBe(2);
    });

    it('should allow access to schema', () => {
      const seeds = defineSeeds({
        Pet: ({ seed, schema }: SeedContext): unknown[] =>
          seed([
            {
              id: 1,
              schemaType: schema.type,
            },
          ]),
      });

      const mockContext = createMinimalContext();
      const result = seeds.Pet(mockContext) as Array<{ id: number; schemaType: string }>;

      expect(result[0].schemaType).toBe('object');
    });

    it('should allow access to logger', () => {
      const seeds = defineSeeds({
        Pet: ({ seed, logger }: SeedContext): unknown[] => {
          logger.debug('Seeding pets');
          return seed([{ id: 1 }]);
        },
      });

      const mockContext = createMinimalContext();
      const result = seeds.Pet(mockContext);

      expect(mockContext.logger.debug).toHaveBeenCalledWith('Seeding pets');
      expect(result).toHaveLength(1);
    });
  });

  describe('async seeds', () => {
    it('should support async seed functions', async () => {
      const seeds = defineSeeds({
        Pet: async ({ seed }: SeedContext): Promise<unknown[]> => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return seed([{ id: 1, name: 'Async Pet' }]);
        },
      });

      const mockContext = createMinimalContext();
      const result = await seeds.Pet(mockContext);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: 1, name: 'Async Pet' });
    });
  });

  describe('multiple schemas', () => {
    it('should support multiple schema definitions', () => {
      const seeds = defineSeeds({
        Category: ({ seed }) =>
          seed([
            { id: 1, name: 'Dogs' },
            { id: 2, name: 'Cats' },
          ]),
        Pet: ({ seed }) =>
          seed.count(3, (i) => ({
            id: i + 1,
            name: `Pet ${i + 1}`,
            categoryId: (i % 2) + 1,
          })),
        User: ({ seed, faker }) =>
          seed.count(2, (i) => ({
            id: i + 1,
            email: faker.internet.email(),
          })),
        Order: ({ seed, store }) => {
          const pets = store.list('Pet') as Array<{ id: number }>;
          return seed.count(2, (i) => ({
            id: i + 1,
            petId: pets.length > 0 ? pets[i % pets.length].id : null,
          }));
        },
      });

      expect(Object.keys(seeds)).toHaveLength(4);
      expect(seeds.Category).toBeDefined();
      expect(seeds.Pet).toBeDefined();
      expect(seeds.User).toBeDefined();
      expect(seeds.Order).toBeDefined();
    });
  });

  describe('type safety', () => {
    it('should accept valid SeedDefinition', () => {
      const seedDef: SeedDefinition = {
        Test: (): unknown[] => [{ id: 1 }],
      };

      const result = defineSeeds(seedDef);

      expect(result).toBe(seedDef);
    });

    it('should preserve schema name keys', () => {
      const seeds = defineSeeds({
        Pet: () => [],
        User: () => [],
        Order: () => [],
        Category: () => [],
      });

      expect('Pet' in seeds).toBe(true);
      expect('User' in seeds).toBe(true);
      expect('Order' in seeds).toBe(true);
      expect('Category' in seeds).toBe(true);
    });

    it('should work with empty seeds object', () => {
      const seeds = defineSeeds({});

      expect(Object.keys(seeds)).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle seeds returning empty arrays', () => {
      const seeds = defineSeeds({
        Empty: ({ seed }) => seed([]),
      });

      const mockContext = createMinimalContext();
      const result = seeds.Empty(mockContext);

      expect(result).toEqual([]);
    });

    it('should handle seeds with complex nested data', () => {
      const seeds = defineSeeds({
        Complex: ({ seed }) =>
          seed([
            {
              id: 1,
              nested: {
                deep: {
                  value: 'test',
                  array: [1, 2, 3],
                },
              },
              tags: [
                { id: 1, name: 'tag1' },
                { id: 2, name: 'tag2' },
              ],
            },
          ]),
      });

      const mockContext = createMinimalContext();
      const result = seeds.Complex(mockContext);

      expect(result).toHaveLength(1);
      expect((result[0] as { nested: { deep: { value: string } } }).nested.deep.value).toBe('test');
    });

    it('should handle seeds with null and undefined values', () => {
      const seeds = defineSeeds({
        Nullable: ({ seed }) =>
          seed([
            { id: 1, value: null },
            { id: 2, value: undefined },
          ]),
      });

      const mockContext = createMinimalContext();
      const result = seeds.Nullable(mockContext);

      expect(result).toHaveLength(2);
      expect((result[0] as { value: unknown }).value).toBeNull();
      expect((result[1] as { value: unknown }).value).toBeUndefined();
    });
  });
});

/**
 * Helper to create a minimal mock context for testing
 */
function createMinimalContext(): SeedContext {
  const seedHelper = Object.assign(
    (dataOrFactory: unknown[] | (() => unknown)): unknown[] => {
      if (Array.isArray(dataOrFactory)) {
        return dataOrFactory;
      }
      if (typeof dataOrFactory === 'function') {
        return [dataOrFactory()];
      }
      return [];
    },
    {
      count: (n: number, factory: (index: number) => unknown): unknown[] => {
        if (n <= 0 || !Number.isInteger(n)) {
          return [];
        }
        return Array.from({ length: n }, (_, i) => factory(i));
      },
    },
  ) as SeedHelper;

  return {
    seed: seedHelper,
    store: createStore(),
    faker,
    schema: { type: 'object' },
    logger: {
      log: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };
}
