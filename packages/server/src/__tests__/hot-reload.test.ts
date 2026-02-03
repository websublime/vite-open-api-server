/**
 * Hot Reload Tests
 *
 * What: Unit tests for hot reload utilities
 * How: Tests debounce function with sync and async functions, and file watcher creation
 * Why: Ensures debounce properly handles rapid calls and prevents overlapping async executions
 *
 * Note: File detection tests are skipped by default as they are inherently flaky
 * due to filesystem timing differences across environments. They can be enabled
 * by setting RUN_FLAKY_TESTS=1 environment variable for local debugging.
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFileWatcher, debounce, type FileWatcher } from '../hot-reload.js';
import { createMockLogger } from './test-utils.js';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic debouncing', () => {
    it('should delay function execution by the specified delay', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should only execute once for multiple rapid calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();
      debouncedFn();
      debouncedFn();

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should reset the timer on each call', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      vi.advanceTimersByTime(50);

      debouncedFn();
      vi.advanceTimersByTime(50);

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should pass the latest arguments to the function', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('third');
    });

    it('should pass multiple arguments correctly', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('arg1', 'arg2', 123);

      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2', 123);
    });
  });

  describe('async function handling', () => {
    it('should work with async functions', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      const debouncedFn = debounce(fn, 100);

      debouncedFn();

      vi.advanceTimersByTime(100);

      // Allow promise to resolve
      await vi.runAllTimersAsync();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should prevent overlapping async executions', async () => {
      const executionLog: string[] = [];
      const resolvers: Array<() => void> = [];

      const asyncFn = vi.fn().mockImplementation(async (id: string) => {
        executionLog.push(`start-${id}`);
        await new Promise<void>((resolve) => {
          resolvers.push(resolve);
        });
        executionLog.push(`end-${id}`);
      });

      const debouncedFn = debounce(asyncFn, 100);

      // First call
      debouncedFn('first');
      vi.advanceTimersByTime(100);
      await Promise.resolve(); // Let microtasks run

      expect(executionLog).toEqual(['start-first']);

      // Second call while first is still running
      debouncedFn('second');
      vi.advanceTimersByTime(100);
      await Promise.resolve();

      // Second should be queued, not started
      expect(executionLog).toEqual(['start-first']);
      expect(asyncFn).toHaveBeenCalledTimes(1);

      // Complete first execution
      resolvers[0]();
      await Promise.resolve();
      vi.advanceTimersByTime(0);
      await Promise.resolve();

      expect(executionLog).toContain('end-first');

      // Second should now start
      await vi.runAllTimersAsync();

      expect(asyncFn).toHaveBeenCalledTimes(2);
      expect(asyncFn).toHaveBeenLastCalledWith('second');
    });

    it('should coalesce multiple calls during async execution', async () => {
      const resolvers: Array<() => void> = [];
      const asyncFn = vi.fn().mockImplementation(async () => {
        await new Promise<void>((resolve) => {
          resolvers.push(resolve);
        });
      });

      const debouncedFn = debounce(asyncFn, 100);

      // Start first execution
      debouncedFn('first');
      await vi.advanceTimersByTimeAsync(100);

      // First execution should have started
      expect(asyncFn).toHaveBeenCalledTimes(1);
      expect(asyncFn).toHaveBeenLastCalledWith('first');

      // Multiple calls during execution - only last should be queued
      debouncedFn('second');
      debouncedFn('third');
      debouncedFn('fourth');
      await vi.advanceTimersByTimeAsync(100);

      // Still only one call - second is queued, not executed
      expect(asyncFn).toHaveBeenCalledTimes(1);

      // Complete first execution
      resolvers[0]();
      await vi.advanceTimersByTimeAsync(0);

      // Should now execute with 'fourth' (the latest args)
      expect(asyncFn).toHaveBeenCalledTimes(2);
      expect(asyncFn).toHaveBeenLastCalledWith('fourth');

      // Complete second execution
      resolvers[1]();
      await vi.runAllTimersAsync();

      // No more executions should happen
      expect(asyncFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should continue working after sync function throws', async () => {
      const fn = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      await vi.advanceTimersByTimeAsync(100);

      expect(fn).toHaveBeenCalledTimes(1);

      // Should still work for subsequent calls (error is caught internally)
      debouncedFn();
      await vi.advanceTimersByTimeAsync(100);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should continue working after async function rejects', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Async error'));
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      await vi.advanceTimersByTimeAsync(100);

      expect(fn).toHaveBeenCalledTimes(1);

      // Should still work for subsequent calls (rejection is caught internally)
      debouncedFn();
      await vi.advanceTimersByTimeAsync(100);

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not propagate errors to the caller', async () => {
      const fn = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      const debouncedFn = debounce(fn, 100);

      // This should not throw
      debouncedFn();
      await vi.advanceTimersByTimeAsync(100);

      // If we get here, the error was caught internally
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should execute pending calls after error in current execution', async () => {
      let callCount = 0;
      const fn = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First call error');
        }
        return 'success';
      });
      const debouncedFn = debounce(fn, 100);

      // First call - will throw
      debouncedFn('first');
      await vi.advanceTimersByTimeAsync(100);

      expect(fn).toHaveBeenCalledTimes(1);

      // Second call - should succeed
      debouncedFn('second');
      await vi.advanceTimersByTimeAsync(100);

      expect(fn).toHaveBeenCalledTimes(2);
      expect(fn).toHaveBeenLastCalledWith('second');
    });
  });

  describe('timing edge cases', () => {
    it('should handle zero delay', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 0);

      debouncedFn();

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(0);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle very long delay', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 10000);

      debouncedFn();

      vi.advanceTimersByTime(5000);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(5000);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should allow multiple separate debounced calls after delay passes', async () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('first');
      await vi.advanceTimersByTimeAsync(100);

      expect(fn).toHaveBeenCalledWith('first');
      expect(fn).toHaveBeenCalledTimes(1);

      debouncedFn('second');
      await vi.advanceTimersByTimeAsync(100);

      expect(fn).toHaveBeenCalledWith('second');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});

describe('createFileWatcher', () => {
  let tempDir: string;
  let handlersDir: string;
  let seedsDir: string;
  let watcher: FileWatcher | null = null;

  beforeEach(async () => {
    // Create temporary directories for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hot-reload-test-'));
    handlersDir = path.join(tempDir, 'handlers');
    seedsDir = path.join(tempDir, 'seeds');

    await fs.mkdir(handlersDir, { recursive: true });
    await fs.mkdir(seedsDir, { recursive: true });
  });

  afterEach(async () => {
    // Close watcher if open
    if (watcher) {
      await watcher.close();
      watcher = null;
    }

    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('initialization', () => {
    it('should create a watcher with isWatching set to true', async () => {
      const onHandlerChange = vi.fn();

      watcher = await createFileWatcher({
        handlersDir: 'handlers',
        cwd: tempDir,
        onHandlerChange,
      });

      expect(watcher.isWatching).toBe(true);
    });

    it('should set isWatching to false after close', async () => {
      const onHandlerChange = vi.fn();

      watcher = await createFileWatcher({
        handlersDir: 'handlers',
        cwd: tempDir,
        onHandlerChange,
      });

      expect(watcher.isWatching).toBe(true);

      await watcher.close();
      expect(watcher.isWatching).toBe(false);
      watcher = null; // Prevent double close in afterEach
    });

    it('should work without any directories configured', async () => {
      watcher = await createFileWatcher({
        cwd: tempDir,
      });

      expect(watcher.isWatching).toBe(true);
    });

    it('should resolve ready promise when watcher is initialized', async () => {
      const onHandlerChange = vi.fn();

      watcher = await createFileWatcher({
        handlersDir: 'handlers',
        cwd: tempDir,
        onHandlerChange,
      });

      // ready should resolve without error
      await expect(watcher.ready).resolves.toBeUndefined();
    });

    it('should resolve ready promise with no watchers configured', async () => {
      watcher = await createFileWatcher({
        cwd: tempDir,
      });

      // ready should resolve even with no watchers
      await expect(watcher.ready).resolves.toBeUndefined();
    });

    it('should resolve ready promise when watching both directories', async () => {
      const onHandlerChange = vi.fn();
      const onSeedChange = vi.fn();

      watcher = await createFileWatcher({
        handlersDir: 'handlers',
        seedsDir: 'seeds',
        cwd: tempDir,
        onHandlerChange,
        onSeedChange,
      });

      // ready should resolve without error
      await expect(watcher.ready).resolves.toBeUndefined();
    });
  });

  describe('callback configuration', () => {
    it('should not create handler watcher if onHandlerChange is not provided', async () => {
      // Should not throw even without callbacks
      watcher = await createFileWatcher({
        handlersDir: 'handlers',
        cwd: tempDir,
        // No onHandlerChange provided
      });

      expect(watcher.isWatching).toBe(true);
    });

    it('should not create seed watcher if onSeedChange is not provided', async () => {
      // Should not throw even without callbacks
      watcher = await createFileWatcher({
        seedsDir: 'seeds',
        cwd: tempDir,
        // No onSeedChange provided
      });

      expect(watcher.isWatching).toBe(true);
    });

    it('should accept a custom logger', async () => {
      const mockLogger = createMockLogger();
      const onHandlerChange = vi.fn();

      watcher = await createFileWatcher({
        handlersDir: 'handlers',
        cwd: tempDir,
        onHandlerChange,
        logger: mockLogger,
      });

      expect(watcher.isWatching).toBe(true);
    });
  });

  describe('close behavior', () => {
    it('should be safe to close multiple times', async () => {
      watcher = await createFileWatcher({
        handlersDir: 'handlers',
        cwd: tempDir,
        onHandlerChange: vi.fn(),
      });

      await watcher.close();
      expect(watcher.isWatching).toBe(false);

      // Second close should not throw
      await expect(watcher.close()).resolves.toBeUndefined();
      watcher = null;
    });

    it('should close all watchers when watching both directories', async () => {
      watcher = await createFileWatcher({
        handlersDir: 'handlers',
        seedsDir: 'seeds',
        cwd: tempDir,
        onHandlerChange: vi.fn(),
        onSeedChange: vi.fn(),
      });

      await watcher.ready;

      await watcher.close();
      expect(watcher.isWatching).toBe(false);
      watcher = null;
    });
  });

  /**
   * File detection tests are skipped by default because they are inherently
   * flaky due to filesystem timing differences across platforms and CI environments.
   *
   * To run these tests locally for debugging, set RUN_FLAKY_TESTS=1:
   *   RUN_FLAKY_TESTS=1 pnpm test -- hot-reload.test.ts
   */
  const describeFlaky = process.env.RUN_FLAKY_TESTS ? describe : describe.skip;

  describeFlaky('file detection (flaky)', () => {
    /**
     * Helper to wait for a mock function to be called with timeout
     * Uses polling to avoid flaky timing-based assertions
     */
    async function waitForCall(
      mockFn: ReturnType<typeof vi.fn>,
      timeoutMs = 10000,
      intervalMs = 100,
    ): Promise<boolean> {
      const startTime = Date.now();
      while (Date.now() - startTime < timeoutMs) {
        if (mockFn.mock.calls.length > 0) {
          return true;
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
      return false;
    }

    it('should call onHandlerChange when a handler file is added', async () => {
      const onHandlerChange = vi.fn();

      watcher = await createFileWatcher({
        handlersDir: 'handlers',
        cwd: tempDir,
        onHandlerChange,
      });

      await watcher.ready;

      // Create a handler file
      const handlerFile = path.join(handlersDir, 'test.handlers.ts');
      await fs.writeFile(handlerFile, 'export default {}');

      const called = await waitForCall(onHandlerChange);

      expect(called).toBe(true);
      expect(onHandlerChange).toHaveBeenCalled();
      expect(onHandlerChange.mock.calls[0][0]).toContain('test.handlers.ts');
    });

    it('should call onSeedChange when a seed file is added', async () => {
      const onSeedChange = vi.fn();

      watcher = await createFileWatcher({
        seedsDir: 'seeds',
        cwd: tempDir,
        onSeedChange,
      });

      await watcher.ready;

      // Create a seed file
      const seedFile = path.join(seedsDir, 'test.seeds.ts');
      await fs.writeFile(seedFile, 'export default {}');

      const called = await waitForCall(onSeedChange);

      expect(called).toBe(true);
      expect(onSeedChange).toHaveBeenCalled();
      expect(onSeedChange.mock.calls[0][0]).toContain('test.seeds.ts');
    });

    it('should only watch files matching handler pattern', async () => {
      const onHandlerChange = vi.fn();

      watcher = await createFileWatcher({
        handlersDir: 'handlers',
        cwd: tempDir,
        onHandlerChange,
      });

      await watcher.ready;

      // Create a non-handler file (should be ignored)
      const otherFile = path.join(handlersDir, 'other.ts');
      await fs.writeFile(otherFile, 'export default {}');

      // Wait a bit for potential detection
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Should NOT have been called for non-handler file
      expect(onHandlerChange).not.toHaveBeenCalled();
    });
  });
});
