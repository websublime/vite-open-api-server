/**
 * Hot Reload Tests
 *
 * What: Unit tests for hot reload utilities
 * How: Tests debounce function with sync and async functions
 * Why: Ensures debounce properly handles rapid calls and prevents overlapping async executions
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from '../hot-reload.js';

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
