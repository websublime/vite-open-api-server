/**
 * Unit tests for useNotifications composable
 *
 * What: Tests toast notification and confirmation dialog functionality
 * How: Uses Vitest with fake timers for auto-dismiss testing
 * Why: Ensures notification system works correctly for user feedback
 *
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useNotifications } from '../useNotifications';

describe('useNotifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    const { clearAll } = useNotifications();
    clearAll();
  });

  describe('toast notifications', () => {
    it('should create a success toast', () => {
      const { success, toasts } = useNotifications();
      const id = success('Operation successful');

      expect(toasts.value).toHaveLength(1);
      expect(toasts.value[0]).toMatchObject({
        id,
        type: 'success',
        message: 'Operation successful',
        duration: 3000,
      });
    });

    it('should create an error toast', () => {
      const { error, toasts } = useNotifications();
      const id = error('Something went wrong');

      expect(toasts.value[0]).toMatchObject({
        id,
        type: 'error',
        message: 'Something went wrong',
      });
    });

    it('should create an info toast', () => {
      const { info, toasts } = useNotifications();
      info('Information message');

      expect(toasts.value[0].type).toBe('info');
    });

    it('should create a warning toast', () => {
      const { warning, toasts } = useNotifications();
      warning('Warning message');

      expect(toasts.value[0].type).toBe('warning');
    });

    it('should auto-dismiss toast after duration', () => {
      const { success, toasts } = useNotifications();
      success('Auto dismiss', 1000);

      expect(toasts.value).toHaveLength(1);
      vi.advanceTimersByTime(1000);
      expect(toasts.value).toHaveLength(0);
    });

    it('should not auto-dismiss when duration is 0', () => {
      const { success, toasts } = useNotifications();
      success('Persistent toast', 0);

      vi.advanceTimersByTime(10000);
      expect(toasts.value).toHaveLength(1);
    });

    it('should manually dismiss a toast', () => {
      const { success, dismiss, toasts } = useNotifications();
      const id = success('Toast');

      dismiss(id);
      expect(toasts.value).toHaveLength(0);
    });

    it('should clear all toasts', () => {
      const { success, error, clearAll, toasts } = useNotifications();
      success('Toast 1');
      error('Toast 2');

      clearAll();
      expect(toasts.value).toHaveLength(0);
    });

    it('should generate unique IDs', () => {
      const { success, toasts } = useNotifications();
      success('Toast 1');
      success('Toast 2');

      const ids = toasts.value.map((t) => t.id);
      expect(ids[0]).not.toBe(ids[1]);
    });
  });

  describe('confirmation dialog', () => {
    it('should show confirmation dialog', async () => {
      const { confirm, confirmDialog } = useNotifications();
      const promise = confirm('Are you sure?');

      expect(confirmDialog.visible).toBe(true);
      expect(confirmDialog.message).toBe('Are you sure?');

      confirmDialog.onConfirm?.();
      const result = await promise;
      expect(result).toBe(true);
    });

    it('should resolve true when confirmed', async () => {
      const { confirm, confirmDialog } = useNotifications();
      const promise = confirm('Proceed?');

      confirmDialog.onConfirm?.();
      expect(await promise).toBe(true);
    });

    it('should resolve false when cancelled', async () => {
      const { confirm, confirmDialog } = useNotifications();
      const promise = confirm('Proceed?');

      confirmDialog.onCancel?.();
      expect(await promise).toBe(false);
    });

    it('should support custom options', () => {
      const { confirm, confirmDialog } = useNotifications();
      confirm('Delete?', {
        title: 'Confirm Delete',
        confirmText: 'Delete',
        cancelText: 'Keep',
      });

      expect(confirmDialog.title).toBe('Confirm Delete');
      expect(confirmDialog.confirmText).toBe('Delete');
      expect(confirmDialog.cancelText).toBe('Keep');
    });

    it('should close dialog', async () => {
      const { confirm, closeConfirm, confirmDialog } = useNotifications();
      const promise = confirm('Test?');

      closeConfirm();
      expect(confirmDialog.visible).toBe(false);
      expect(await promise).toBe(false);
    });

    it('should cancel previous dialog when new one opens', async () => {
      const { confirm } = useNotifications();
      const promise1 = confirm('First?');
      const promise2 = confirm('Second?');

      expect(await promise1).toBe(false);
    });
  });

  describe('singleton behavior', () => {
    it('should share state between instances', () => {
      const instance1 = useNotifications();
      const instance2 = useNotifications();

      instance1.success('Shared');
      expect(instance2.toasts.value).toHaveLength(1);
      expect(instance1.toasts.value).toBe(instance2.toasts.value);
    });
  });
});
