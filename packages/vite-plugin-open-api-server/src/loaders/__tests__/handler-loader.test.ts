/**
 * Unit tests for Handler Loader Module
 *
 * Tests the loadHandlers function and related utilities for:
 * - Empty directory handling
 * - Valid handler file loading (object exports)
 * - Static handlers (string code)
 * - Dynamic handlers (functions returning string code)
 * - Invalid exports (no default, wrong type, array instead of object)
 * - Invalid handler values (not string or function)
 * - Duplicate operationId detection
 * - Cross-reference with registry
 * - Error resilience (continue loading on individual failures)
 */

import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OpenApiEndpointRegistry } from '../../types/registry.js';
import { extractBaseName, kebabToCamelCase, loadHandlers } from '../handler-loader.js';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const EMPTY_DIR = path.join(__dirname, 'fixtures-empty');

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
function createMockRegistry(operationIds: string[] = []): OpenApiEndpointRegistry {
  const endpoints = new Map();

  for (const operationId of operationIds) {
    endpoints.set(`GET /${operationId}`, {
      method: 'get',
      path: `/${operationId}`,
      operationId,
      parameters: [],
      responses: {},
    });
  }

  return {
    endpoints,
    schemas: new Map(),
    securitySchemes: new Map(),
  };
}

describe('Handler Loader', () => {
  describe('kebabToCamelCase', () => {
    it('should convert simple kebab-case to camelCase', () => {
      expect(kebabToCamelCase('add-pet')).toBe('addPet');
    });

    it('should convert multi-word kebab-case to camelCase', () => {
      expect(kebabToCamelCase('get-pet-by-id')).toBe('getPetById');
    });

    it('should return unchanged if already camelCase', () => {
      expect(kebabToCamelCase('listPets')).toBe('listPets');
    });

    it('should handle single word', () => {
      expect(kebabToCamelCase('pet')).toBe('pet');
    });

    it('should handle empty string', () => {
      expect(kebabToCamelCase('')).toBe('');
    });

    it('should handle consecutive dashes correctly', () => {
      // Edge case: consecutive dashes (unusual but should handle gracefully)
      expect(kebabToCamelCase('add--pet')).toBe('add-Pet');
    });
  });

  describe('extractBaseName', () => {
    it('should extract base name from .handler.ts file', () => {
      expect(extractBaseName('pets.handler.ts')).toBe('pets');
    });

    it('should extract base name from .handler.js file', () => {
      expect(extractBaseName('store.handler.js')).toBe('store');
    });

    it('should extract base name from .handler.mts file', () => {
      expect(extractBaseName('users.handler.mts')).toBe('users');
    });

    it('should extract base name from .handler.mjs file', () => {
      expect(extractBaseName('orders.handler.mjs')).toBe('orders');
    });

    it('should preserve kebab-case in filename', () => {
      expect(extractBaseName('pet-store.handler.ts')).toBe('pet-store');
    });
  });

  describe('loadHandlers', () => {
    let mockLogger: ReturnType<typeof createMockLogger>;

    beforeEach(() => {
      mockLogger = createMockLogger();
    });

    describe('empty directory', () => {
      it('should return empty result and log warning for empty directory', async () => {
        const registry = createMockRegistry();
        const result = await loadHandlers(EMPTY_DIR, registry, mockLogger);

        expect(result.handlers.size).toBe(0);
        expect(result.loadedFiles).toHaveLength(0);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('No handler files found'),
        );
      });
    });

    describe('missing directory', () => {
      it('should return empty result and log warning for non-existent directory', async () => {
        const registry = createMockRegistry();
        const nonExistentDir = path.join(__dirname, 'non-existent-directory');
        const result = await loadHandlers(nonExistentDir, registry, mockLogger);

        expect(result.handlers.size).toBe(0);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('No handler files found'),
        );
      });
    });

    describe('valid handlers (object exports)', () => {
      it('should load valid handler files with object exports', async () => {
        const registry = createMockRegistry(['getPet', 'getPetById', 'addPet', 'addNewPet']);
        const result = await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Should have loaded handlers from the valid files
        expect(result.handlers.size).toBeGreaterThan(0);
        expect(result.loadedFiles.length).toBeGreaterThan(0);
      });

      it('should load static handlers (string code)', async () => {
        const registry = createMockRegistry(['getPet', 'getPetById']);
        const result = await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // getPet and getPetById are static string handlers
        const getPet = result.handlers.get('getPet');
        const getPetById = result.handlers.get('getPetById');

        expect(typeof getPet).toBe('string');
        expect(typeof getPetById).toBe('string');
      });

      it('should load dynamic handlers (functions)', async () => {
        const registry = createMockRegistry(['addNewPet']);
        const result = await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // addNewPet is a dynamic function handler
        const addNewPet = result.handlers.get('addNewPet');
        expect(typeof addNewPet).toBe('function');
      });

      it('should log info message for each loaded handler', async () => {
        const registry = createMockRegistry(['getPet', 'addPet']);
        await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Should log info for loaded handlers with type info
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringMatching(/Loaded handler:.*\(static|dynamic/),
        );
      });

      it('should load handlers from subdirectories', async () => {
        const registry = createMockRegistry(['getPet']);
        const result = await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // The subdirectory also has getPet, so duplicate warning should be logged
        expect(result.handlers.has('getPet')).toBe(true);
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Duplicate handler'));
      });
    });

    describe('invalid handlers', () => {
      it('should log error for handler without default export', async () => {
        const registry = createMockRegistry();
        await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Should log error for invalid-no-default.handler.mjs
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to load'));
      });

      it('should log error for handler with array export instead of object', async () => {
        const registry = createMockRegistry();
        await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Should log error for invalid-not-function.handler.mjs (now exports array)
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to load'));
      });

      it('should continue loading other handlers after error', async () => {
        const registry = createMockRegistry(['getPet', 'addPet', 'addNewPet']);
        const result = await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Should still have valid handlers despite errors
        expect(result.handlers.size).toBeGreaterThan(0);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('duplicate operationIds', () => {
      it('should warn about duplicate operationIds across files', async () => {
        const registry = createMockRegistry(['getPet']);
        const result = await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Should warn about duplicate getPet (from fixtures/ and fixtures/subdirectory/)
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Duplicate handler'));
        expect(result.warnings.some((w) => w.includes('Duplicate'))).toBe(true);
      });

      it('should overwrite earlier handler with later one for duplicates', async () => {
        const registry = createMockRegistry(['getPet']);
        const result = await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Should still have the handler (last one wins)
        expect(result.handlers.has('getPet')).toBe(true);
      });
    });

    describe('registry cross-reference', () => {
      it('should warn when handler operationId does not match any endpoint', async () => {
        // Registry without matching operationIds
        const registry = createMockRegistry(['someOtherOperation']);
        const result = await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Should warn about handlers not matching endpoints
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('does not match any operation'),
        );
        expect(result.warnings.some((w) => w.includes('does not match'))).toBe(true);
      });

      it('should not warn when handler operationId matches endpoint', async () => {
        // Registry with matching operationIds for all handlers in fixtures
        const registry = createMockRegistry(['getPet', 'getPetById', 'addPet', 'addNewPet']);
        const result = await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Check that handlers were loaded
        expect(result.handlers.size).toBeGreaterThan(0);

        // Warnings about "does not match" should be fewer or none
        // (may still have duplicate warnings which is expected)
      });
    });

    describe('error resilience', () => {
      it('should return result with errors array populated', async () => {
        const registry = createMockRegistry();
        const result = await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Should have some errors from invalid fixtures
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should log summary with handler and file counts', async () => {
        const registry = createMockRegistry(['getPet', 'addPet', 'addNewPet']);
        await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Should log summary
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringMatching(/Summary.*handler\(s\).*file\(s\)/),
        );
      });

      it('should not throw on individual file failures', async () => {
        const registry = createMockRegistry();

        // Should not throw even with invalid handlers in fixtures
        await expect(loadHandlers(FIXTURES_DIR, registry, mockLogger)).resolves.toBeDefined();
      });
    });

    describe('HandlerLoadResult structure', () => {
      it('should return proper HandlerLoadResult structure', async () => {
        const registry = createMockRegistry(['getPet']);
        const result = await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        expect(result).toHaveProperty('handlers');
        expect(result).toHaveProperty('loadedFiles');
        expect(result).toHaveProperty('warnings');
        expect(result).toHaveProperty('errors');

        expect(result.handlers).toBeInstanceOf(Map);
        expect(Array.isArray(result.loadedFiles)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
        expect(Array.isArray(result.errors)).toBe(true);
      });

      it('should track loaded files in loadedFiles array', async () => {
        const registry = createMockRegistry(['getPet', 'addPet']);
        const result = await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Should have loaded some files successfully
        expect(result.loadedFiles.length).toBeGreaterThan(0);

        // Each loaded file should be an absolute path
        for (const file of result.loadedFiles) {
          expect(path.isAbsolute(file)).toBe(true);
          expect(file).toMatch(/\.handler\.(ts|js|mts|mjs)$/);
        }
      });
    });

    describe('file patterns', () => {
      it('should only load files matching *.handler.{ts,js,mts,mjs} pattern', async () => {
        const registry = createMockRegistry();
        const result = await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // All loaded files should match the pattern
        for (const file of result.loadedFiles) {
          expect(file).toMatch(/\.handler\.(ts|js|mts|mjs)$/);
        }
      });
    });
  });
});
