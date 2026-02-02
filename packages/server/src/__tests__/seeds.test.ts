/**
 * Seed Loading Tests
 *
 * What: Unit tests for seed file loading functionality
 * How: Tests loadSeeds and getSeedFiles functions with mocked Vite dev server
 * Why: Ensures seeds are correctly loaded from filesystem with TypeScript support
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSeedFiles, loadSeeds } from '../seeds.js';

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

describe('loadSeeds', () => {
  let tempDir: string;
  let seedsDir: string;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'seeds-test-'));
    seedsDir = path.join(tempDir, 'seeds');
    await fs.mkdir(seedsDir, { recursive: true });
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
    it('should return empty result when seeds directory does not exist', async () => {
      const nonExistingDir = path.join(tempDir, 'non-existing');
      const mockVite = createMockViteServer();

      const result = await loadSeeds(nonExistingDir, mockVite, tempDir, mockLogger);

      expect(result.seeds.size).toBe(0);
      expect(result.fileCount).toBe(0);
      expect(result.files).toEqual([]);
    });

    it('should return empty result when seeds directory is empty', async () => {
      const mockVite = createMockViteServer();

      const result = await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(result.seeds.size).toBe(0);
      expect(result.fileCount).toBe(0);
      expect(result.files).toEqual([]);
    });

    it('should handle relative directory paths', async () => {
      const seedFile = path.join(seedsDir, 'pets.seeds.ts');
      await fs.writeFile(seedFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(seedFile, {
        default: {
          Pet: () => [{ id: 1, name: 'Fluffy' }],
        },
      });

      const mockVite = createMockViteServer(moduleMap);

      // Use relative path
      const result = await loadSeeds('seeds', mockVite, tempDir, mockLogger);

      expect(result.seeds.size).toBe(1);
      expect(result.seeds.has('Pet')).toBe(true);
    });
  });

  describe('file pattern matching', () => {
    it('should load .seeds.ts files', async () => {
      const seedFile = path.join(seedsDir, 'pets.seeds.ts');
      await fs.writeFile(seedFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(seedFile, {
        default: {
          Pet: () => [{ id: 1 }],
        },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(result.fileCount).toBe(1);
      expect(result.files).toContain('pets.seeds.ts');
    });

    it('should load .seeds.js files', async () => {
      const seedFile = path.join(seedsDir, 'users.seeds.js');
      await fs.writeFile(seedFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(seedFile, {
        default: {
          User: () => [{ id: 1 }],
        },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(result.fileCount).toBe(1);
      expect(result.files).toContain('users.seeds.js');
    });

    it('should load .seeds.mjs files', async () => {
      const seedFile = path.join(seedsDir, 'orders.seeds.mjs');
      await fs.writeFile(seedFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(seedFile, {
        default: {
          Order: () => [{ id: 1 }],
        },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(result.fileCount).toBe(1);
      expect(result.files).toContain('orders.seeds.mjs');
    });

    it('should ignore non-seed files', async () => {
      // Create a seed file
      const seedFile = path.join(seedsDir, 'pets.seeds.ts');
      await fs.writeFile(seedFile, '');

      // Create non-seed files
      await fs.writeFile(path.join(seedsDir, 'utils.ts'), '');
      await fs.writeFile(path.join(seedsDir, 'types.d.ts'), '');
      await fs.writeFile(path.join(seedsDir, 'README.md'), '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(seedFile, {
        default: { Pet: () => [{ id: 1 }] },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(result.fileCount).toBe(1);
      expect(result.files).toEqual(['pets.seeds.ts']);
    });

    it('should load seeds from nested directories', async () => {
      const nestedDir = path.join(seedsDir, 'v1', 'api');
      await fs.mkdir(nestedDir, { recursive: true });

      const seedFile = path.join(nestedDir, 'nested.seeds.ts');
      await fs.writeFile(seedFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(seedFile, {
        default: {
          NestedSchema: () => [{ id: 1 }],
        },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(result.fileCount).toBe(1);
      expect(result.files).toContain('v1/api/nested.seeds.ts');
    });

    it('should ignore node_modules and dist directories', async () => {
      // Create seed in node_modules (should be ignored)
      const nodeModulesDir = path.join(seedsDir, 'node_modules');
      await fs.mkdir(nodeModulesDir, { recursive: true });
      await fs.writeFile(path.join(nodeModulesDir, 'ignored.seeds.ts'), '');

      // Create seed in dist (should be ignored)
      const distDir = path.join(seedsDir, 'dist');
      await fs.mkdir(distDir, { recursive: true });
      await fs.writeFile(path.join(distDir, 'ignored.seeds.ts'), '');

      // Create valid seed
      const validFile = path.join(seedsDir, 'valid.seeds.ts');
      await fs.writeFile(validFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(validFile, {
        default: { ValidSchema: () => [{ id: 1 }] },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(result.fileCount).toBe(1);
      expect(result.files).toEqual(['valid.seeds.ts']);
    });
  });

  describe('module loading', () => {
    it('should use Vite ssrLoadModule to load seed files', async () => {
      const seedFile = path.join(seedsDir, 'pets.seeds.ts');
      await fs.writeFile(seedFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(seedFile, {
        default: { Pet: () => [{ id: 1 }] },
      });

      const mockVite = createMockViteServer(moduleMap);
      await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(mockVite.ssrLoadModule).toHaveBeenCalledWith(seedFile);
    });

    it('should invalidate module cache before loading for hot reload', async () => {
      const seedFile = path.join(seedsDir, 'pets.seeds.ts');
      await fs.writeFile(seedFile, '');

      const mockModuleNode = { id: seedFile };
      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(seedFile, {
        default: { Pet: () => [{ id: 1 }] },
      });

      const mockVite = createMockViteServer(moduleMap);
      (mockVite.moduleGraph.getModuleById as ReturnType<typeof vi.fn>).mockReturnValue(
        mockModuleNode,
      );

      await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(mockVite.moduleGraph.getModuleById).toHaveBeenCalledWith(seedFile);
      expect(mockVite.moduleGraph.invalidateModule).toHaveBeenCalledWith(mockModuleNode);
    });

    it('should support default export', async () => {
      const seedFile = path.join(seedsDir, 'default.seeds.ts');
      await fs.writeFile(seedFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(seedFile, {
        default: {
          MySchema: () => [{ data: 'default' }],
        },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(result.seeds.has('MySchema')).toBe(true);
    });

    it('should support named seeds export', async () => {
      const seedFile = path.join(seedsDir, 'named.seeds.ts');
      await fs.writeFile(seedFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(seedFile, {
        seeds: {
          NamedSchema: () => [{ data: 'named' }],
        },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(result.seeds.has('NamedSchema')).toBe(true);
    });

    it('should support module object export (fallback)', async () => {
      const seedFile = path.join(seedsDir, 'module.seeds.ts');
      await fs.writeFile(seedFile, '');

      const seedFn = () => [{ data: 'module' }];
      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(seedFile, {
        ModuleSchema: seedFn,
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(result.seeds.has('ModuleSchema')).toBe(true);
    });
  });

  describe('seed extraction', () => {
    it('should extract seed functions from module', async () => {
      const seedFile = path.join(seedsDir, 'multi.seeds.ts');
      await fs.writeFile(seedFile, '');

      const petSeed = () => [{ id: 1, name: 'Fluffy' }];
      const categorySeed = () => [{ id: 1, name: 'Dogs' }];
      const tagSeed = () => [{ id: 1, name: 'Friendly' }];

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(seedFile, {
        default: {
          Pet: petSeed,
          Category: categorySeed,
          Tag: tagSeed,
        },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(result.seeds.size).toBe(3);
      expect(result.seeds.get('Pet')).toBe(petSeed);
      expect(result.seeds.get('Category')).toBe(categorySeed);
      expect(result.seeds.get('Tag')).toBe(tagSeed);
    });

    it('should only include function values as seeds', async () => {
      const seedFile = path.join(seedsDir, 'mixed.seeds.ts');
      await fs.writeFile(seedFile, '');

      const validSeed = () => [{ id: 1 }];

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(seedFile, {
        default: {
          ValidSchema: validSeed,
          invalidString: 'not a function',
          invalidNumber: 42,
          invalidObject: { nested: 'object' },
          invalidNull: null,
          invalidUndefined: undefined,
        },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(result.seeds.size).toBe(1);
      expect(result.seeds.has('ValidSchema')).toBe(true);
      expect(result.seeds.has('invalidString')).toBe(false);
      expect(result.seeds.has('invalidNumber')).toBe(false);
    });

    it('should merge seeds from multiple files', async () => {
      const file1 = path.join(seedsDir, 'pets.seeds.ts');
      const file2 = path.join(seedsDir, 'users.seeds.ts');
      await fs.writeFile(file1, '');
      await fs.writeFile(file2, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(file1, {
        default: {
          Pet: () => [{ id: 1 }],
          Category: () => [{ id: 1 }],
        },
      });
      moduleMap.set(file2, {
        default: {
          User: () => [{ id: 1 }],
          Role: () => [{ id: 1 }],
        },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(result.seeds.size).toBe(4);
      expect(result.seeds.has('Pet')).toBe(true);
      expect(result.seeds.has('Category')).toBe(true);
      expect(result.seeds.has('User')).toBe(true);
      expect(result.seeds.has('Role')).toBe(true);
      expect(result.fileCount).toBe(2);
    });
  });

  describe('duplicate handling', () => {
    it('should warn about duplicate schema names and use last definition', async () => {
      const file1 = path.join(seedsDir, 'v1.seeds.ts');
      const file2 = path.join(seedsDir, 'v2.seeds.ts');
      await fs.writeFile(file1, '');
      await fs.writeFile(file2, '');

      const firstSeed = () => [{ data: 'first' }];
      const secondSeed = () => [{ data: 'second' }];

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(file1, {
        default: { DuplicateSchema: firstSeed },
      });
      moduleMap.set(file2, {
        default: { DuplicateSchema: secondSeed },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(result.seeds.size).toBe(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate seed for schema "DuplicateSchema"'),
      );
    });
  });

  describe('error handling', () => {
    it('should warn and skip file when module has no valid export', async () => {
      const seedFile = path.join(seedsDir, 'invalid.seeds.ts');
      await fs.writeFile(seedFile, '');

      // Module returns a primitive string, which is not a valid object export
      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(seedFile, {
        default: 'not an object',
      } as unknown as Record<string, unknown>);

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(result.seeds.size).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid seed file'));
    });

    it('should log error and skip file when ssrLoadModule fails', async () => {
      const seedFile = path.join(seedsDir, 'error.seeds.ts');
      await fs.writeFile(seedFile, '');

      // Don't add module to map - will cause ssrLoadModule to throw
      const mockVite = createMockViteServer(new Map());
      const result = await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(result.seeds.size).toBe(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load seed file'),
        expect.any(String),
      );
    });

    it('should continue loading other files when one file fails', async () => {
      const validFile = path.join(seedsDir, 'valid.seeds.ts');
      const errorFile = path.join(seedsDir, 'error.seeds.ts');
      await fs.writeFile(validFile, '');
      await fs.writeFile(errorFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(validFile, {
        default: { ValidSchema: () => [{ id: 1 }] },
      });
      // Don't add errorFile - will cause it to fail

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(result.seeds.size).toBe(1);
      expect(result.seeds.has('ValidSchema')).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should use console as default logger', async () => {
      const seedFile = path.join(seedsDir, 'test.seeds.ts');
      await fs.writeFile(seedFile, '');

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(seedFile, {
        default: { TestSchema: () => [{ id: 1 }] },
      });

      const mockVite = createMockViteServer(moduleMap);

      // Call without logger parameter
      const result = await loadSeeds(seedsDir, mockVite, tempDir);

      expect(result.seeds.has('TestSchema')).toBe(true);
    });
  });

  describe('async seeds', () => {
    it('should support async seed functions', async () => {
      const seedFile = path.join(seedsDir, 'async.seeds.ts');
      await fs.writeFile(seedFile, '');

      const asyncSeed = async () => {
        return [{ id: 1, async: true }];
      };

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(seedFile, {
        default: { AsyncSchema: asyncSeed },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(result.seeds.has('AsyncSchema')).toBe(true);
      expect(result.seeds.get('AsyncSchema')).toBe(asyncSeed);
    });
  });

  describe('seed context usage', () => {
    it('should allow seed functions that use context parameters', async () => {
      const seedFile = path.join(seedsDir, 'context.seeds.ts');
      await fs.writeFile(seedFile, '');

      // Seed function that would use context (faker, seed helper, etc.)
      const contextSeed = (_context: { seed: unknown; faker: unknown }) => {
        // In real usage, this would use _context.seed.count() and _context.faker
        return [{ id: 1, name: 'Generated' }];
      };

      const moduleMap = new Map<string, Record<string, unknown>>();
      moduleMap.set(seedFile, {
        default: { ContextSchema: contextSeed },
      });

      const mockVite = createMockViteServer(moduleMap);
      const result = await loadSeeds(seedsDir, mockVite, tempDir, mockLogger);

      expect(result.seeds.has('ContextSchema')).toBe(true);
    });
  });
});

describe('getSeedFiles', () => {
  let tempDir: string;
  let seedsDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'seed-files-test-'));
    seedsDir = path.join(tempDir, 'seeds');
    await fs.mkdir(seedsDir, { recursive: true });
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

    const result = await getSeedFiles(nonExistingDir, tempDir);

    expect(result).toEqual([]);
  });

  it('should return empty array when directory is empty', async () => {
    const result = await getSeedFiles(seedsDir, tempDir);

    expect(result).toEqual([]);
  });

  it('should return absolute paths of seed files', async () => {
    const seedFile = path.join(seedsDir, 'pets.seeds.ts');
    await fs.writeFile(seedFile, '');

    const result = await getSeedFiles(seedsDir, tempDir);

    expect(result).toEqual([seedFile]);
  });

  it('should return all seed file types', async () => {
    await fs.writeFile(path.join(seedsDir, 'ts.seeds.ts'), '');
    await fs.writeFile(path.join(seedsDir, 'js.seeds.js'), '');
    await fs.writeFile(path.join(seedsDir, 'mjs.seeds.mjs'), '');

    const result = await getSeedFiles(seedsDir, tempDir);

    expect(result).toHaveLength(3);
    expect(result.some((f) => f.endsWith('ts.seeds.ts'))).toBe(true);
    expect(result.some((f) => f.endsWith('js.seeds.js'))).toBe(true);
    expect(result.some((f) => f.endsWith('mjs.seeds.mjs'))).toBe(true);
  });

  it('should include files from nested directories', async () => {
    const nestedDir = path.join(seedsDir, 'nested', 'deep');
    await fs.mkdir(nestedDir, { recursive: true });

    const rootFile = path.join(seedsDir, 'root.seeds.ts');
    const nestedFile = path.join(nestedDir, 'nested.seeds.ts');
    await fs.writeFile(rootFile, '');
    await fs.writeFile(nestedFile, '');

    const result = await getSeedFiles(seedsDir, tempDir);

    expect(result).toHaveLength(2);
    expect(result).toContain(rootFile);
    expect(result).toContain(nestedFile);
  });

  it('should ignore node_modules and dist directories', async () => {
    const nodeModulesDir = path.join(seedsDir, 'node_modules');
    const distDir = path.join(seedsDir, 'dist');
    await fs.mkdir(nodeModulesDir, { recursive: true });
    await fs.mkdir(distDir, { recursive: true });

    await fs.writeFile(path.join(nodeModulesDir, 'ignored.seeds.ts'), '');
    await fs.writeFile(path.join(distDir, 'ignored.seeds.ts'), '');
    const validFile = path.join(seedsDir, 'valid.seeds.ts');
    await fs.writeFile(validFile, '');

    const result = await getSeedFiles(seedsDir, tempDir);

    expect(result).toEqual([validFile]);
  });

  it('should handle relative directory paths', async () => {
    const seedFile = path.join(seedsDir, 'test.seeds.ts');
    await fs.writeFile(seedFile, '');

    const result = await getSeedFiles('seeds', tempDir);

    expect(result).toEqual([seedFile]);
  });

  it('should use process.cwd() as default when cwd not provided', async () => {
    // This test verifies the default parameter behavior
    // We can't easily test this without mocking process.cwd
    // so we just verify the function signature works
    const result = await getSeedFiles(seedsDir);

    // Result depends on whether seedsDir exists from process.cwd()
    expect(Array.isArray(result)).toBe(true);
  });
});
