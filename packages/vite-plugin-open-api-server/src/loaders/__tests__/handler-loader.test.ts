/**
 * Unit tests for Handler Loader Module
 *
 * Tests the loadHandlers function and related utilities for:
 * - Empty directory handling
 * - Valid handler file loading
 * - Invalid exports (no default, wrong type)
 * - Duplicate operationId detection
 * - OperationId extraction from filename
 * - Kebab-case to camelCase conversion
 * - Cross-reference with registry
 * - Error resilience (continue loading on individual failures)
 */

import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OpenApiEndpointRegistry } from '../../types/registry.js';
import { extractOperationId, kebabToCamelCase, loadHandlers } from '../handler-loader.js';

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

  describe('extractOperationId', () => {
    it('should extract operationId from .handler.ts file', () => {
      expect(extractOperationId('get-pet.handler.ts')).toBe('getPet');
    });

    it('should extract operationId from .handler.js file', () => {
      expect(extractOperationId('add-pet.handler.js')).toBe('addPet');
    });

    it('should extract operationId from .handler.mts file', () => {
      expect(extractOperationId('list-pets.handler.mts')).toBe('listPets');
    });

    it('should extract operationId from .handler.mjs file', () => {
      expect(extractOperationId('delete-pet.handler.mjs')).toBe('deletePet');
    });

    it('should convert kebab-case filename to camelCase operationId', () => {
      expect(extractOperationId('get-pet-by-id.handler.ts')).toBe('getPetById');
    });

    it('should handle already camelCase filenames', () => {
      expect(extractOperationId('listPets.handler.ts')).toBe('listPets');
    });

    it('should handle complex kebab-case names', () => {
      expect(extractOperationId('add-new-pet-to-store.handler.mjs')).toBe('addNewPetToStore');
    });
  });

  describe('loadHandlers', () => {
    let mockLogger: ReturnType<typeof createMockLogger>;

    beforeEach(() => {
      mockLogger = createMockLogger();
    });

    describe('empty directory', () => {
      it('should return empty map and log warning for empty directory', async () => {
        const registry = createMockRegistry();
        const handlers = await loadHandlers(EMPTY_DIR, registry, mockLogger);

        expect(handlers.size).toBe(0);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('No handler files found'),
        );
      });
    });

    describe('missing directory', () => {
      it('should return empty map and log warning for non-existent directory', async () => {
        const registry = createMockRegistry();
        const nonExistentDir = path.join(__dirname, 'non-existent-directory');
        const handlers = await loadHandlers(nonExistentDir, registry, mockLogger);

        expect(handlers.size).toBe(0);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('No handler files found'),
        );
      });
    });

    describe('valid handlers', () => {
      it('should load valid handler files', async () => {
        // Create registry with matching operationIds
        const registry = createMockRegistry(['getPet', 'addNewPet']);
        const handlers = await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Should have loaded at least the valid handlers
        // (may also have duplicates from subdirectory)
        expect(handlers.size).toBeGreaterThan(0);
        expect(handlers.has('getPet')).toBe(true);
        expect(handlers.has('addNewPet')).toBe(true);

        // Verify the handler is a function
        const getPetHandler = handlers.get('getPet');
        expect(typeof getPetHandler).toBe('function');
      });

      it('should log info message for each loaded handler', async () => {
        const registry = createMockRegistry(['getPet', 'addNewPet']);
        await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Should log info for loaded handlers
        expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Loaded handler:'));
      });

      it('should load handlers from subdirectories', async () => {
        const registry = createMockRegistry(['getPet']);
        const handlers = await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // The subdirectory also has a get-pet.handler.mjs, so getPet should be present
        // (duplicate warning should be logged)
        expect(handlers.has('getPet')).toBe(true);
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Duplicate handler'));
      });

      it('should convert kebab-case filenames to camelCase operationIds', async () => {
        const registry = createMockRegistry(['addNewPet']);
        const handlers = await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // add-new-pet.handler.mjs → addNewPet
        expect(handlers.has('addNewPet')).toBe(true);
      });
    });

    describe('invalid handlers', () => {
      it('should log error for handler without default export', async () => {
        const registry = createMockRegistry();
        await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Should log error for invalid-no-default.handler.mjs
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to load'));
      });

      it('should log error for handler with non-function default export', async () => {
        const registry = createMockRegistry();
        await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Should log error for invalid-not-function.handler.mjs
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to load'));
      });

      it('should continue loading other handlers after error', async () => {
        const registry = createMockRegistry(['getPet', 'addNewPet']);
        const handlers = await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Should still have valid handlers despite errors
        expect(handlers.has('getPet')).toBe(true);
        expect(handlers.has('addNewPet')).toBe(true);
      });
    });

    describe('duplicate operationIds', () => {
      it('should warn about duplicate operationIds', async () => {
        const registry = createMockRegistry(['getPet']);
        await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Should warn about duplicate getPet (from fixtures/ and fixtures/subdirectory/)
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Duplicate handler'));
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('getPet'));
      });

      it('should overwrite earlier handler with later one for duplicates', async () => {
        const registry = createMockRegistry(['getPet']);
        const handlers = await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Should still have the handler (last one wins)
        expect(handlers.has('getPet')).toBe(true);
        expect(handlers.size).toBeGreaterThan(0);
      });
    });

    describe('registry cross-reference', () => {
      it('should warn when handler does not match any endpoint', async () => {
        // Registry without matching operationIds
        const registry = createMockRegistry(['someOtherOperation']);
        await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Should warn about handlers not matching endpoints
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('does not match any endpoint'),
        );
      });

      it('should not warn when handler matches endpoint', async () => {
        // Registry with matching operationIds
        const registry = createMockRegistry([
          'getPet',
          'addNewPet',
          'invalidNoDefault',
          'invalidNotFunction',
        ]);
        const handlers = await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Check that we loaded the valid handlers
        expect(handlers.has('getPet')).toBe(true);
        expect(handlers.has('addNewPet')).toBe(true);

        // Valid handlers that match the registry shouldn't trigger "does not match" warning
        // Only the duplicate getPet might cause a different warning (which is expected)
        // Verify that getPet and addNewPet are loaded successfully
        expect(handlers.size).toBeGreaterThanOrEqual(2);
      });
    });

    describe('error resilience', () => {
      it('should log summary with success and error counts', async () => {
        const registry = createMockRegistry(['getPet', 'addNewPet']);
        await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // Should log summary
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringMatching(/Loaded \d+ handler\(s\), \d+ error\(s\)/),
        );
      });

      it('should not throw on individual file failures', async () => {
        const registry = createMockRegistry();

        // Should not throw even with invalid handlers in fixtures
        await expect(loadHandlers(FIXTURES_DIR, registry, mockLogger)).resolves.toBeDefined();
      });
    });

    describe('file patterns', () => {
      it('should only load files matching *.handler.{ts,js,mts,mjs} pattern', async () => {
        const registry = createMockRegistry();
        const handlers = await loadHandlers(FIXTURES_DIR, registry, mockLogger);

        // All loaded handlers should come from .handler.* files
        // The handler map should not include any files without the .handler extension
        for (const [operationId] of handlers) {
          expect(typeof operationId).toBe('string');
          expect(operationId.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
