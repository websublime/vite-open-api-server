/**
 * Notifications Composable
 *
 * What: Provides consistent user feedback mechanism for the DevTools
 * How: Manages toast notifications and confirmation modals
 * Why: Replaces inconsistent alert()/confirm()/console.log() usage
 *
 * Features:
 * - Toast notifications for success/error/info messages
 * - Confirmation modals with custom messages
 * - Auto-dismiss for toast notifications
 * - Centralized state management
 */

import { reactive, ref } from 'vue';

/**
 * Toast notification types
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * Toast notification
 */
export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  timestamp: number;
}

/**
 * Confirmation dialog state
 */
export interface ConfirmDialog {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: (() => void) | null;
  onCancel: (() => void) | null;
}

// ==========================================================================
// Global State
// ==========================================================================

const toasts = ref<Toast[]>([]);
const confirmDialog = reactive<ConfirmDialog>({
  visible: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  onConfirm: null,
  onCancel: null,
});

// ==========================================================================
// Helper Functions
// ==========================================================================

let toastIdCounter = 0;

function generateToastId(): string {
  return `toast-${Date.now()}-${toastIdCounter++}`;
}

function addToast(type: ToastType, message: string, duration = 3000): string {
  const id = generateToastId();
  const toast: Toast = {
    id,
    type,
    message,
    duration,
    timestamp: Date.now(),
  };

  toasts.value.push(toast);

  // Auto-dismiss
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
}

function removeToast(id: string): void {
  const index = toasts.value.findIndex((t) => t.id === id);
  if (index !== -1) {
    toasts.value.splice(index, 1);
  }
}

// ==========================================================================
// Composable
// ==========================================================================

/**
 * Notifications composable
 *
 * Provides methods for showing toast notifications and confirmation dialogs
 */
export function useNotifications() {
  /**
   * Show a success toast notification
   */
  function success(message: string, duration?: number): string {
    return addToast('success', message, duration);
  }

  /**
   * Show an error toast notification
   */
  function error(message: string, duration?: number): string {
    return addToast('error', message, duration);
  }

  /**
   * Show an info toast notification
   */
  function info(message: string, duration?: number): string {
    return addToast('info', message, duration);
  }

  /**
   * Show a warning toast notification
   */
  function warning(message: string, duration?: number): string {
    return addToast('warning', message, duration);
  }

  /**
   * Show a confirmation dialog
   *
   * @returns Promise that resolves to true if confirmed, false if cancelled
   */
  function confirm(
    message: string,
    options?: {
      title?: string;
      confirmText?: string;
      cancelText?: string;
    },
  ): Promise<boolean> {
    return new Promise((resolve) => {
      confirmDialog.visible = true;
      confirmDialog.title = options?.title || 'Confirm';
      confirmDialog.message = message;
      confirmDialog.confirmText = options?.confirmText || 'Confirm';
      confirmDialog.cancelText = options?.cancelText || 'Cancel';

      confirmDialog.onConfirm = () => {
        confirmDialog.visible = false;
        resolve(true);
      };

      confirmDialog.onCancel = () => {
        confirmDialog.visible = false;
        resolve(false);
      };
    });
  }

  /**
   * Close the confirmation dialog
   */
  function closeConfirm(): void {
    confirmDialog.visible = false;
    if (confirmDialog.onCancel) {
      confirmDialog.onCancel();
    }
  }

  /**
   * Manually dismiss a toast by ID
   */
  function dismiss(id: string): void {
    removeToast(id);
  }

  /**
   * Clear all toasts
   */
  function clearAll(): void {
    toasts.value = [];
  }

  return {
    // State
    toasts,
    confirmDialog,

    // Toast methods
    success,
    error,
    info,
    warning,
    dismiss,
    clearAll,

    // Confirm methods
    confirm,
    closeConfirm,
  };
}
