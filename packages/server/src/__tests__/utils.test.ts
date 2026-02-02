/**
 * Utils Tests
 *
 * What: Unit tests for shared utility functions
 * How: Tests directoryExists function with real filesystem operations
 * Why: Ensures filesystem utilities work correctly for handler and seed loading
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { directoryExists } from '../utils.js';

describe('directoryExists', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'utils-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('with existing paths', () => {
    it('should return true for an existing directory', async () => {
      const result = await directoryExists(tempDir);
      expect(result).toBe(true);
    });

    it('should return true for a nested existing directory', async () => {
      const nestedDir = path.join(tempDir, 'nested', 'deep');
      await fs.mkdir(nestedDir, { recursive: true });

      const result = await directoryExists(nestedDir);
      expect(result).toBe(true);
    });

    it('should return false for an existing file (not a directory)', async () => {
      const filePath = path.join(tempDir, 'test-file.txt');
      await fs.writeFile(filePath, 'test content');

      const result = await directoryExists(filePath);
      expect(result).toBe(false);
    });
  });

  describe('with non-existing paths', () => {
    it('should return false for a non-existing path', async () => {
      const nonExistingPath = path.join(tempDir, 'does-not-exist');

      const result = await directoryExists(nonExistingPath);
      expect(result).toBe(false);
    });

    it('should return false for a deeply nested non-existing path', async () => {
      const nonExistingPath = path.join(tempDir, 'a', 'b', 'c', 'd', 'e');

      const result = await directoryExists(nonExistingPath);
      expect(result).toBe(false);
    });

    it('should return false for an empty string path', async () => {
      const result = await directoryExists('');
      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle paths with special characters', async () => {
      const specialDir = path.join(tempDir, 'dir-with-special-chars-!@#$%');
      await fs.mkdir(specialDir);

      const result = await directoryExists(specialDir);
      expect(result).toBe(true);
    });

    it('should handle paths with spaces', async () => {
      const spacedDir = path.join(tempDir, 'dir with spaces');
      await fs.mkdir(spacedDir);

      const result = await directoryExists(spacedDir);
      expect(result).toBe(true);
    });

    it('should handle relative paths', async () => {
      // Create a known directory structure
      const testDir = path.join(tempDir, 'relative-test');
      await fs.mkdir(testDir);

      // Use a relative path from tempDir
      const originalCwd = process.cwd();
      try {
        process.chdir(tempDir);
        const result = await directoryExists('./relative-test');
        expect(result).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle symlinks to directories', async () => {
      const realDir = path.join(tempDir, 'real-dir');
      const symlinkPath = path.join(tempDir, 'symlink-dir');

      await fs.mkdir(realDir);
      await fs.symlink(realDir, symlinkPath);

      const result = await directoryExists(symlinkPath);
      expect(result).toBe(true);
    });

    it('should handle symlinks to files (return false)', async () => {
      const realFile = path.join(tempDir, 'real-file.txt');
      const symlinkPath = path.join(tempDir, 'symlink-file');

      await fs.writeFile(realFile, 'content');
      await fs.symlink(realFile, symlinkPath);

      const result = await directoryExists(symlinkPath);
      expect(result).toBe(false);
    });

    it('should handle broken symlinks', async () => {
      const nonExistingTarget = path.join(tempDir, 'non-existing-target');
      const symlinkPath = path.join(tempDir, 'broken-symlink');

      // Create symlink to non-existing target
      await fs.symlink(nonExistingTarget, symlinkPath);

      const result = await directoryExists(symlinkPath);
      expect(result).toBe(false);
    });
  });

  describe('concurrent access', () => {
    it('should handle multiple concurrent checks', async () => {
      const dirs = await Promise.all(
        Array.from({ length: 5 }, async (_, i) => {
          const dir = path.join(tempDir, `concurrent-${i}`);
          await fs.mkdir(dir);
          return dir;
        }),
      );

      const results = await Promise.all(dirs.map((dir) => directoryExists(dir)));

      expect(results).toEqual([true, true, true, true, true]);
    });
  });
});
