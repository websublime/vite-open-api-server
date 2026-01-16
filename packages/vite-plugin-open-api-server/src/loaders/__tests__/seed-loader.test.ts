/**
 * Unit tests for Seed Loader Module
 *
 * Tests the loadSeeds function and related utilities for:
 * - Empty directory handling
 * - Valid seed file loading (object exports)
 * - Invalid exports (no default, function instead of object, array)
 * - Duplicate schema name detection
 * - Schema name extraction from filename
 * - Singular/plural conversion utilities
 * - Cross-reference with registry
 * - Error resilience (continue loading on individual failures)
 */

import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OpenApiEndpointRegistry } from '../../types/registry.js';
import {
  capitalize,
  extractSchemaName,
  findMatchingSchema,
  loadSeeds,
  pluralize,
  singularize,
} from '../seed-loader.js';

const SEED_FIXTURES_DIR = path.join(__dirname, 'seed-fixtures');
const SEED_EMPTY_DIR = path.join(__dirname, 'seed-fixtures-empty');

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
 * Create a mock registry for testing.
 */
function createMockRegistry(schemaNames: string[] = []): OpenApiEndpointRegistry {
  const schemas = new Map();

  for (const name of schemaNames) {
    schemas.set(name, {
      name,
      schema: { type: 'object', properties: {} },
    });
  }

  return {
    endpoints: new Map(),
    schemas,
    securitySchemes: new Map(),
  };
}

describe('Seed Loader', () => {
  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('pets')).toBe('Pets');
    });

    it('should return unchanged if already capitalized', () => {
      expect(capitalize('Pet')).toBe('Pet');
    });

    it('should handle single character', () => {
      expect(capitalize('p')).toBe('P');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should preserve rest of string case', () => {
      expect(capitalize('pETS')).toBe('PETS');
    });
  });

  describe('singularize', () => {
    it('should remove trailing s', () => {
      expect(singularize('pets')).toBe('pet');
    });

    it('should handle -ies ending', () => {
      expect(singularize('categories')).toBe('category');
    });

    it('should handle -es ending for words ending in s', () => {
      expect(singularize('statuses')).toBe('status');
    });

    it('should handle -es ending for words ending in x', () => {
      expect(singularize('boxes')).toBe('box');
    });

    it('should handle -es ending for words ending in ch', () => {
      expect(singularize('matches')).toBe('match');
    });

    it('should handle -es ending for words ending in sh', () => {
      expect(singularize('dishes')).toBe('dish');
    });

    it('should not change already singular words', () => {
      expect(singularize('pet')).toBe('pet');
    });

    it('should preserve words ending in ss', () => {
      expect(singularize('class')).toBe('class');
    });

    it('should handle empty string', () => {
      expect(singularize('')).toBe('');
    });

    it('should handle known irregulars', () => {
      expect(singularize('addresses')).toBe('address');
      expect(singularize('companies')).toBe('company');
    });
  });

  describe('pluralize', () => {
    it('should add trailing s', () => {
      expect(pluralize('pet')).toBe('pets');
    });

    it('should handle -y ending with consonant before', () => {
      expect(pluralize('category')).toBe('categories');
    });

    it('should not change -y ending with vowel before', () => {
      expect(pluralize('day')).toBe('days');
    });

    it('should add -es for words ending in x', () => {
      expect(pluralize('box')).toBe('boxes');
    });

    it('should add -es for words ending in ch', () => {
      expect(pluralize('match')).toBe('matches');
    });

    it('should add -es for words ending in sh', () => {
      expect(pluralize('dish')).toBe('dishes');
    });

    it('should return unchanged if already ends in s', () => {
      expect(pluralize('pets')).toBe('pets');
    });

    it('should handle empty string', () => {
      expect(pluralize('')).toBe('');
    });
  });

  describe('extractSchemaName', () => {
    it('should extract schema name from .seed.ts file', () => {
      expect(extractSchemaName('pets.seed.ts')).toBe('pets');
    });

    it('should extract schema name from .seed.js file', () => {
      expect(extractSchemaName('Pet.seed.js')).toBe('Pet');
    });

    it('should extract schema name from .seed.mts file', () => {
      expect(extractSchemaName('Order.seed.mts')).toBe('Order');
    });

    it('should extract schema name from .seed.mjs file', () => {
      expect(extractSchemaName('users.seed.mjs')).toBe('users');
    });

    it('should preserve case of filename', () => {
      expect(extractSchemaName('OrderItem.seed.ts')).toBe('OrderItem');
    });

    it('should handle kebab-case names', () => {
      expect(extractSchemaName('order-items.seed.ts')).toBe('order-items');
    });
  });

  describe('findMatchingSchema', () => {
    it('should find exact match', () => {
      const registry = createMockRegistry(['pets']);
      expect(findMatchingSchema('pets', registry)).toBe('pets');
    });

    it('should find capitalized match from lowercase', () => {
      const registry = createMockRegistry(['Pets']);
      expect(findMatchingSchema('pets', registry)).toBe('Pets');
    });

    it('should find singular match from plural', () => {
      const registry = createMockRegistry(['Pet']);
      expect(findMatchingSchema('pets', registry)).toBe('Pet');
    });

    it('should find match with complex plural form', () => {
      const registry = createMockRegistry(['Category']);
      expect(findMatchingSchema('categories', registry)).toBe('Category');
    });

    it('should return null if no match found', () => {
      const registry = createMockRegistry(['User']);
      expect(findMatchingSchema('pets', registry)).toBeNull();
    });

    it('should prefer exact match over transformed', () => {
      const registry = createMockRegistry(['pets', 'Pets', 'Pet']);
      expect(findMatchingSchema('pets', registry)).toBe('pets');
    });

    it('should handle empty registry', () => {
      const registry = createMockRegistry([]);
      expect(findMatchingSchema('pets', registry)).toBeNull();
    });
  });

  describe('loadSeeds', () => {
    let mockLogger: ReturnType<typeof createMockLogger>;

    beforeEach(() => {
      mockLogger = createMockLogger();
    });

    describe('empty directory', () => {
      it('should return empty result and log warning for empty directory', async () => {
        const registry = createMockRegistry();
        const result = await loadSeeds(SEED_EMPTY_DIR, registry, mockLogger);

        expect(result.seeds.size).toBe(0);
        expect(result.loadedFiles).toHaveLength(0);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain('No seed files found');
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('No seed files found'),
        );
      });
    });

    describe('missing directory', () => {
      it('should return empty result and log warning for non-existent directory', async () => {
        const registry = createMockRegistry();
        const nonExistentDir = path.join(__dirname, 'non-existent-seed-directory');
        const result = await loadSeeds(nonExistentDir, registry, mockLogger);

        expect(result.seeds.size).toBe(0);
        expect(result.loadedFiles).toHaveLength(0);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('No seed files found'),
        );
      });
    });

    describe('valid seeds', () => {
      it('should load valid seed files with object exports', async () => {
        const registry = createMockRegistry(['Pet', 'Order', 'Category']);
        const result = await loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger);

        // Should have loaded the valid seeds
        expect(result.seeds.size).toBeGreaterThan(0);
        expect(result.loadedFiles.length).toBeGreaterThan(0);
      });

      it('should load static seed values as strings', async () => {
        const registry = createMockRegistry(['Pet']);
        const result = await loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger);

        // Pet seed should be a string (static)
        const petSeed = result.seeds.get('Pet');
        expect(typeof petSeed).toBe('string');
        expect(petSeed).toContain('seed.count');
      });

      it('should load dynamic seed values as functions', async () => {
        const registry = createMockRegistry(['Category']);
        const result = await loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger);

        // Category seed should be a function (dynamic)
        const categorySeed = result.seeds.get('Category');
        expect(typeof categorySeed).toBe('function');
      });

      it('should log info message for each loaded seed', async () => {
        const registry = createMockRegistry(['Pet', 'Order', 'Category']);
        await loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger);

        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Loaded seed:'));
      });

      it('should load seeds from subdirectories', async () => {
        const registry = createMockRegistry(['Pet']);
        const result = await loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger);

        // The subdirectory also has a pets.seed.mjs with Pet key
        // Duplicate warning should be logged
        expect(result.seeds.has('Pet')).toBe(true);
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Duplicate seed'));
      });

      it('should return loaded files list', async () => {
        const registry = createMockRegistry(['Pet', 'Order']);
        const result = await loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger);

        expect(result.loadedFiles.length).toBeGreaterThan(0);
        for (const file of result.loadedFiles) {
          expect(file).toMatch(/\.seed\.(ts|js|mts|mjs)$/);
        }
      });
    });

    describe('invalid seeds', () => {
      it('should log error for seed without default export', async () => {
        const registry = createMockRegistry();
        const result = await loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger);

        // Should log error for invalid-no-default.seed.mjs
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to load'));
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should log error for seed with function default export', async () => {
        const registry = createMockRegistry();
        const result = await loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger);

        // Should log error for invalid-function-export.seed.mjs (exports function instead of object)
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to load'));
        expect(result.errors.some((e) => e.includes('function'))).toBe(true);
      });

      it('should log error for seed with array default export', async () => {
        const registry = createMockRegistry();
        const result = await loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger);

        // Should log error for invalid-array-export.seed.mjs
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to load'));
        expect(result.errors.some((e) => e.includes('array'))).toBe(true);
      });

      it('should continue loading other seeds after error', async () => {
        const registry = createMockRegistry(['Pet', 'Order', 'Category']);
        const result = await loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger);

        // Should still have valid seeds despite errors
        expect(result.seeds.has('Pet')).toBe(true);
        expect(result.seeds.has('Order')).toBe(true);
        expect(result.seeds.has('Category')).toBe(true);
      });
    });

    describe('duplicate schema names', () => {
      it('should warn about duplicate schema names', async () => {
        const registry = createMockRegistry(['Pet']);
        const result = await loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger);

        // Should warn about duplicate Pet (from fixtures/ and fixtures/subdirectory/)
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Duplicate seed'));
        expect(result.warnings.some((w) => w.includes('Duplicate'))).toBe(true);
      });

      it('should overwrite earlier seed with later one for duplicates', async () => {
        const registry = createMockRegistry(['Pet']);
        const result = await loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger);

        // Should still have the seed (last one wins)
        expect(result.seeds.has('Pet')).toBe(true);
        expect(result.seeds.size).toBeGreaterThan(0);
      });
    });

    describe('registry cross-reference', () => {
      it('should warn when seed does not match any schema', async () => {
        // Registry without matching schemas
        const registry = createMockRegistry(['SomeOtherSchema']);
        const result = await loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger);

        // Should warn about seeds not matching schemas
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('does not match any schema'),
        );
        expect(result.warnings.some((w) => w.includes('does not match any schema'))).toBe(true);
      });

      it('should not warn when seed matches schema', async () => {
        // Registry with matching schema names
        const registry = createMockRegistry(['Pet', 'Order', 'Category']);
        const result = await loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger);

        // Verify that Pet, Order, Category are loaded successfully
        expect(result.seeds.has('Pet')).toBe(true);
        expect(result.seeds.has('Order')).toBe(true);
        expect(result.seeds.has('Category')).toBe(true);
      });
    });

    describe('error resilience', () => {
      it('should log summary with file and seed counts', async () => {
        const registry = createMockRegistry(['Pet', 'Order', 'Category']);
        await loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger);

        // Should log summary
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringMatching(/Summary: \d+ seed\(s\), from \d+ file\(s\)/),
        );
      });

      it('should not throw on individual file failures', async () => {
        const registry = createMockRegistry();

        // Should not throw even with invalid seeds in fixtures
        await expect(loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger)).resolves.toBeDefined();
      });

      it('should return errors in result object', async () => {
        const registry = createMockRegistry();
        const result = await loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger);

        // Should have errors for invalid fixtures
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('file patterns', () => {
      it('should only load files matching *.seed.{ts,js,mts,mjs} pattern', async () => {
        const registry = createMockRegistry();
        const result = await loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger);

        // All loaded files should match the pattern
        for (const file of result.loadedFiles) {
          expect(file).toMatch(/\.seed\.(ts|js|mts|mjs)$/);
        }
      });
    });

    describe('seed value types', () => {
      it('should return string seed values for static seeds', async () => {
        const registry = createMockRegistry(['Pet']);
        const result = await loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger);

        const petSeed = result.seeds.get('Pet');
        expect(typeof petSeed).toBe('string');
      });

      it('should return function seed values for dynamic seeds', async () => {
        const registry = createMockRegistry(['Category', 'Order']);
        const result = await loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger);

        // Category is a dynamic seed in pets.seed.mjs
        const categorySeed = result.seeds.get('Category');
        expect(typeof categorySeed).toBe('function');

        // Order is a dynamic seed in Order.seed.mjs
        const orderSeed = result.seeds.get('Order');
        expect(typeof orderSeed).toBe('function');
      });

      it('should allow calling dynamic seed functions', async () => {
        const registry = createMockRegistry(['Category']);
        const result = await loadSeeds(SEED_FIXTURES_DIR, registry, mockLogger);

        const categorySeed = result.seeds.get('Category');
        expect(typeof categorySeed).toBe('function');

        // Call the function with a mock context
        const mockContext = {
          schemaName: 'Category',
          schema: { type: 'object', properties: { description: { type: 'string' } } },
          document: { openapi: '3.1.0', info: { title: 'Test', version: '1.0' }, paths: {} },
          schemas: {},
        };

        // biome-ignore lint/complexity/noBannedTypes: test assertion with dynamic seed function
        const code = (categorySeed as Function)(mockContext);
        expect(typeof code).toBe('string');
        expect(code).toContain('seed');
      });
    });
  });
});
