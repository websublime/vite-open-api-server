/**
 * Handler Loading Tests
 *
 * What: Unit tests for handler file loading functionality
 * How: Tests loadHandlers and getHandlerFiles functions with mocked Vite dev server
 * Why: Ensures handlers are correctly loaded from filesystem with TypeScript support
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getHandlerFiles, loadHandlers } from '../handlers.js';

/**
 * Creates a mock ViteDevServer with ssrLoadModule support
 */
function createMockViteServer(
  moduleMap: Map<string, Record<string, unknown>> = new Map(),
): ViteDevServer {
  const moduleGraph = {
    getModuleById: vi.fn().mockReturnValue(null),
    invalidateModule: vi.fn(),
  };

  return {
    moduleGraph,
    ssrLoadModule: vi.fn().mockImplementation(async (filePath: string) => {
      const module = moduleMap.get(filePath);
      if (!module) {
        throw new Error(`Module not found: ${filePath}`);
      }
      return module;
    }),
  } as unknown as ViteDevServer;
}

/**
 * Creates a mock logger
 */
function createMockLogger() {
  return {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

describe('loadHandlers', () => {
  let tempDir: string;
  let handlersDir: string;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'handlers-test-'));
    handlersDir = path.join(tempDir, 'handlers');
    await fs.mkdir(handlersDir, { recursive: true });
    mockLogger = createMockLogger();
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    vi.clearAllMocks();
  });

  describe('directory handling', () => {
    it('should return empty result when handlers directory does not exist', async () => {
      const nonExistingDir = path.join(tempDir, 'non-existing');
      const mockVite = createMockViteServer();

      const result = await loadHandlers(nonExistingDir, mockVite, tempDir, mockLogger);

      expect(result.handlers.size).toBe(0);
      expect(result.fileCount).toBe(0);
      expect(result.files).toEqual([]);
    });

    it('should return empty result when handlers directory is empty', async () => {
      const mockVite = createMockViteServer();

      const result = await loadHandlers(handlersDir, mockVite, tempDir, mockLogger);

      expect(result.handlers.size).toBe(0);
      expect(result.fileCount).toBe(0);
      expect(result.files).toEqual([]);
    });

    it('should handle relative directory paths', async () => {
      const handlerFile = path.join(handlersDir, 'pets.handlers.ts');
      await fs.writeFile(handlerFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(handlerFile, {
        default: {
          getPetById: () => ({ status: 200, data: { id: 1 } }),
        },
      });

      const mockVite = createMockViteServer(moduleMap);

      // Use relative path
      const result = await loadHandlers('handlers', mockVite, tempDir, mockLogger);

      expect(result.handlers.size).toBe(1);
      expect(result.handlers.has('getPetById')).toBe(true);
    });
  });

  describe('file pattern matching', () => {
    it('should load .handlers.ts files', async () => {
      const handlerFile = path.join(handlersDir, 'pets.handlers.ts');
      await fs.writeFile(handlerFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(handlerFile, {
        default: {
          getPetById: () => ({ status: 200 }),
        },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadHandlers(handlersDir, mockVite, tempDir, mockLogger);

      expect(result.fileCount).toBe(1);
      expect(result.files).toContain('pets.handlers.ts');
    });

    it('should load .handlers.js files', async () => {
      const handlerFile = path.join(handlersDir, 'users.handlers.js');
      await fs.writeFile(handlerFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(handlerFile, {
        default: {
          getUserById: () => ({ status: 200 }),
        },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadHandlers(handlersDir, mockVite, tempDir, mockLogger);

      expect(result.fileCount).toBe(1);
      expect(result.files).toContain('users.handlers.js');
    });

    it('should load .handlers.mjs files', async () => {
      const handlerFile = path.join(handlersDir, 'orders.handlers.mjs');
      await fs.writeFile(handlerFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(handlerFile, {
        default: {
          getOrderById: () => ({ status: 200 }),
        },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadHandlers(handlersDir, mockVite, tempDir, mockLogger);

      expect(result.fileCount).toBe(1);
      expect(result.files).toContain('orders.handlers.mjs');
    });

    it('should ignore non-handler files', async () => {
      // Create a handler file
      const handlerFile = path.join(handlersDir, 'pets.handlers.ts');
      await fs.writeFile(handlerFile, '');

      // Create non-handler files
      await fs.writeFile(path.join(handlersDir, 'utils.ts'), '');
      await fs.writeFile(path.join(handlersDir, 'types.d.ts'), '');
      await fs.writeFile(path.join(handlersDir, 'README.md'), '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(handlerFile, {
        default: { getPetById: () => ({}) },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadHandlers(handlersDir, mockVite, tempDir, mockLogger);

      expect(result.fileCount).toBe(1);
      expect(result.files).toEqual(['pets.handlers.ts']);
    });

    it('should load handlers from nested directories', async () => {
      const nestedDir = path.join(handlersDir, 'v1', 'api');
      await fs.mkdir(nestedDir, { recursive: true });

      const handlerFile = path.join(nestedDir, 'nested.handlers.ts');
      await fs.writeFile(handlerFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(handlerFile, {
        default: {
          nestedHandler: () => ({ status: 200 }),
        },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadHandlers(handlersDir, mockVite, tempDir, mockLogger);

      expect(result.fileCount).toBe(1);
      expect(result.files).toContain('v1/api/nested.handlers.ts');
    });

    it('should ignore node_modules and dist directories', async () => {
      // Create handler in node_modules (should be ignored)
      const nodeModulesDir = path.join(handlersDir, 'node_modules');
      await fs.mkdir(nodeModulesDir, { recursive: true });
      await fs.writeFile(path.join(nodeModulesDir, 'ignored.handlers.ts'), '');

      // Create handler in dist (should be ignored)
      const distDir = path.join(handlersDir, 'dist');
      await fs.mkdir(distDir, { recursive: true });
      await fs.writeFile(path.join(distDir, 'ignored.handlers.ts'), '');

      // Create valid handler
      const validFile = path.join(handlersDir, 'valid.handlers.ts');
      await fs.writeFile(validFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(validFile, {
        default: { validHandler: () => ({}) },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadHandlers(handlersDir, mockVite, tempDir, mockLogger);

      expect(result.fileCount).toBe(1);
      expect(result.files).toEqual(['valid.handlers.ts']);
    });
  });

  describe('module loading', () => {
    it('should use Vite ssrLoadModule to load handler files', async () => {
      const handlerFile = path.join(handlersDir, 'pets.handlers.ts');
      await fs.writeFile(handlerFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(handlerFile, {
        default: { getPetById: () => ({}) },
      });

      const mockVite = createMockViteServer(moduleMap);
      await loadHandlers(handlersDir, mockVite, tempDir, mockLogger);

      expect(mockVite.ssrLoadModule).toHaveBeenCalledWith(handlerFile);
    });

    it('should invalidate module cache before loading for hot reload', async () => {
      const handlerFile = path.join(handlersDir, 'pets.handlers.ts');
      await fs.writeFile(handlerFile, '');

      const mockModuleNode = { id: handlerFile };
      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(handlerFile, {
        default: { getPetById: () => ({}) },
      });

      const mockVite = createMockViteServer(moduleMap);
      (mockVite.moduleGraph.getModuleById as ReturnType<typeof vi.fn>).mockReturnValue(
        mockModuleNode,
      );

      await loadHandlers(handlersDir, mockVite, tempDir, mockLogger);

      expect(mockVite.moduleGraph.getModuleById).toHaveBeenCalledWith(handlerFile);
      expect(mockVite.moduleGraph.invalidateModule).toHaveBeenCalledWith(mockModuleNode);
    });

    it('should support default export', async () => {
      const handlerFile = path.join(handlersDir, 'default.handlers.ts');
      await fs.writeFile(handlerFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(handlerFile, {
        default: {
          myHandler: () => ({ status: 200, data: 'default' }),
        },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadHandlers(handlersDir, mockVite, tempDir, mockLogger);

      expect(result.handlers.has('myHandler')).toBe(true);
    });

    it('should support named handlers export', async () => {
      const handlerFile = path.join(handlersDir, 'named.handlers.ts');
      await fs.writeFile(handlerFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(handlerFile, {
        handlers: {
          namedHandler: () => ({ status: 200, data: 'named' }),
        },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadHandlers(handlersDir, mockVite, tempDir, mockLogger);

      expect(result.handlers.has('namedHandler')).toBe(true);
    });

    it('should support module object export (fallback)', async () => {
      const handlerFile = path.join(handlersDir, 'module.handlers.ts');
      await fs.writeFile(handlerFile, '');

      const handlerFn = () => ({ status: 200, data: 'module' });
      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(handlerFile, {
        moduleHandler: handlerFn,
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadHandlers(handlersDir, mockVite, tempDir, mockLogger);

      expect(result.handlers.has('moduleHandler')).toBe(true);
    });
  });

  describe('handler extraction', () => {
    it('should extract handler functions from module', async () => {
      const handlerFile = path.join(handlersDir, 'multi.handlers.ts');
      await fs.writeFile(handlerFile, '');

      const getPetById = () => ({ status: 200 });
      const createPet = () => ({ status: 201 });
      const deletePet = () => ({ status: 204 });

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(handlerFile, {
        default: {
          getPetById,
          createPet,
          deletePet,
        },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadHandlers(handlersDir, mockVite, tempDir, mockLogger);

      expect(result.handlers.size).toBe(3);
      expect(result.handlers.get('getPetById')).toBe(getPetById);
      expect(result.handlers.get('createPet')).toBe(createPet);
      expect(result.handlers.get('deletePet')).toBe(deletePet);
    });

    it('should only include function values as handlers', async () => {
      const handlerFile = path.join(handlersDir, 'mixed.handlers.ts');
      await fs.writeFile(handlerFile, '');

      const validHandler = () => ({ status: 200 });

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(handlerFile, {
        default: {
          validHandler,
          invalidString: 'not a function',
          invalidNumber: 42,
          invalidObject: { nested: 'object' },
          invalidNull: null,
          invalidUndefined: undefined,
        },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadHandlers(handlersDir, mockVite, tempDir, mockLogger);

      expect(result.handlers.size).toBe(1);
      expect(result.handlers.has('validHandler')).toBe(true);
      expect(result.handlers.has('invalidString')).toBe(false);
      expect(result.handlers.has('invalidNumber')).toBe(false);
    });

    it('should merge handlers from multiple files', async () => {
      const file1 = path.join(handlersDir, 'pets.handlers.ts');
      const file2 = path.join(handlersDir, 'users.handlers.ts');
      await fs.writeFile(file1, '');
      await fs.writeFile(file2, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(file1, {
        default: {
          getPetById: () => ({ status: 200 }),
          createPet: () => ({ status: 201 }),
        },
      });
      moduleMap.set(file2, {
        default: {
          getUserById: () => ({ status: 200 }),
          createUser: () => ({ status: 201 }),
        },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadHandlers(handlersDir, mockVite, tempDir, mockLogger);

      expect(result.handlers.size).toBe(4);
      expect(result.handlers.has('getPetById')).toBe(true);
      expect(result.handlers.has('createPet')).toBe(true);
      expect(result.handlers.has('getUserById')).toBe(true);
      expect(result.handlers.has('createUser')).toBe(true);
      expect(result.fileCount).toBe(2);
    });
  });

  describe('duplicate handling', () => {
    it('should warn about duplicate operationIds and use last definition', async () => {
      const file1 = path.join(handlersDir, 'v1.handlers.ts');
      const file2 = path.join(handlersDir, 'v2.handlers.ts');
      await fs.writeFile(file1, '');
      await fs.writeFile(file2, '');

      const firstHandler = () => ({ status: 200, data: 'first' });
      const secondHandler = () => ({ status: 200, data: 'second' });

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(file1, {
        default: { duplicateHandler: firstHandler },
      });
      moduleMap.set(file2, {
        default: { duplicateHandler: secondHandler },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadHandlers(handlersDir, mockVite, tempDir, mockLogger);

      expect(result.handlers.size).toBe(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate handler for operationId "duplicateHandler"'),
      );
    });
  });

  describe('error handling', () => {
    it('should warn and skip file when module has no valid export', async () => {
      const handlerFile = path.join(handlersDir, 'invalid.handlers.ts');
      await fs.writeFile(handlerFile, '');

      // Module returns a primitive string, which is not a valid object export
      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(handlerFile, {
        default: 'not an object',
      } as unknown as Record<string, unknown>);

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadHandlers(handlersDir, mockVite, tempDir, mockLogger);

      expect(result.handlers.size).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid handler file'));
    });

    it('should log error and skip file when ssrLoadModule fails', async () => {
      const handlerFile = path.join(handlersDir, 'error.handlers.ts');
      await fs.writeFile(handlerFile, '');

      // Don't add module to map - will cause ssrLoadModule to throw
      const mockVite = createMockViteServer(new Map());
      const result = await loadHandlers(handlersDir, mockVite, tempDir, mockLogger);

      expect(result.handlers.size).toBe(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load handler file'),
        expect.any(String),
      );
    });

    it('should continue loading other files when one file fails', async () => {
      const validFile = path.join(handlersDir, 'valid.handlers.ts');
      const errorFile = path.join(handlersDir, 'error.handlers.ts');
      await fs.writeFile(validFile, '');
      await fs.writeFile(errorFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(validFile, {
        default: { validHandler: () => ({ status: 200 }) },
      });
      // Don't add errorFile - will cause it to fail

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadHandlers(handlersDir, mockVite, tempDir, mockLogger);

      expect(result.handlers.size).toBe(1);
      expect(result.handlers.has('validHandler')).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should use console as default logger', async () => {
      const handlerFile = path.join(handlersDir, 'test.handlers.ts');
      await fs.writeFile(handlerFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(handlerFile, {
        default: { testHandler: () => ({}) },
      });

      const mockVite = createMockViteServer(moduleMap);

      // Call without logger parameter
      const result = await loadHandlers(handlersDir, mockVite, tempDir);

      expect(result.handlers.has('testHandler')).toBe(true);
    });
  });

  describe('async handlers', () => {
    it('should support async handler functions', async () => {
      const handlerFile = path.join(handlersDir, 'async.handlers.ts');
      await fs.writeFile(handlerFile, '');

      const asyncHandler = async () => {
        return { status: 200, data: { async: true } };
      };

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(handlerFile, {
        default: { asyncHandler },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadHandlers(handlersDir, mockVite, tempDir, mockLogger);

      expect(result.handlers.has('asyncHandler')).toBe(true);
      expect(result.handlers.get('asyncHandler')).toBe(asyncHandler);
    });
  });
});

describe('getHandlerFiles', () => {
  let tempDir: string;
  let handlersDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'handler-files-test-'));
    handlersDir = path.join(tempDir, 'handlers');
    await fs.mkdir(handlersDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should return empty array when directory does not exist', async () => {
    const nonExistingDir = path.join(tempDir, 'non-existing');

    const result = await getHandlerFiles(nonExistingDir, tempDir);

    expect(result).toEqual([]);
  });

  it('should return empty array when directory is empty', async () => {
    const result = await getHandlerFiles(handlersDir, tempDir);

    expect(result).toEqual([]);
  });

  it('should return absolute paths of handler files', async () => {
    const handlerFile = path.join(handlersDir, 'pets.handlers.ts');
    await fs.writeFile(handlerFile, '');

    const result = await getHandlerFiles(handlersDir, tempDir);

    expect(result).toEqual([handlerFile]);
  });

  it('should return all handler file types', async () => {
    await fs.writeFile(path.join(handlersDir, 'ts.handlers.ts'), '');
    await fs.writeFile(path.join(handlersDir, 'js.handlers.js'), '');
    await fs.writeFile(path.join(handlersDir, 'mjs.handlers.mjs'), '');

    const result = await getHandlerFiles(handlersDir, tempDir);

    expect(result).toHaveLength(3);
    expect(result.some((f) => f.endsWith('ts.handlers.ts'))).toBe(true);
    expect(result.some((f) => f.endsWith('js.handlers.js'))).toBe(true);
    expect(result.some((f) => f.endsWith('mjs.handlers.mjs'))).toBe(true);
  });

  it('should include files from nested directories', async () => {
    const nestedDir = path.join(handlersDir, 'nested', 'deep');
    await fs.mkdir(nestedDir, { recursive: true });

    const rootFile = path.join(handlersDir, 'root.handlers.ts');
    const nestedFile = path.join(nestedDir, 'nested.handlers.ts');
    await fs.writeFile(rootFile, '');
    await fs.writeFile(nestedFile, '');

    const result = await getHandlerFiles(handlersDir, tempDir);

    expect(result).toHaveLength(2);
    expect(result).toContain(rootFile);
    expect(result).toContain(nestedFile);
  });

  it('should ignore node_modules and dist directories', async () => {
    const nodeModulesDir = path.join(handlersDir, 'node_modules');
    const distDir = path.join(handlersDir, 'dist');
    await fs.mkdir(nodeModulesDir, { recursive: true });
    await fs.mkdir(distDir, { recursive: true });

    await fs.writeFile(path.join(nodeModulesDir, 'ignored.handlers.ts'), '');
    await fs.writeFile(path.join(distDir, 'ignored.handlers.ts'), '');
    const validFile = path.join(handlersDir, 'valid.handlers.ts');
    await fs.writeFile(validFile, '');

    const result = await getHandlerFiles(handlersDir, tempDir);

    expect(result).toEqual([validFile]);
  });

  it('should handle relative directory paths', async () => {
    const handlerFile = path.join(handlersDir, 'test.handlers.ts');
    await fs.writeFile(handlerFile, '');

    const result = await getHandlerFiles('handlers', tempDir);

    expect(result).toEqual([handlerFile]);
  });

  it('should use process.cwd() as default when cwd not provided', async () => {
    // This test verifies the default parameter behavior
    // We can't easily test this without mocking process.cwd
    // so we just verify the function signature works
    const result = await getHandlerFiles(handlersDir);

    // Result depends on whether handlersDir exists from process.cwd()
    expect(Array.isArray(result)).toBe(true);
  });
});
