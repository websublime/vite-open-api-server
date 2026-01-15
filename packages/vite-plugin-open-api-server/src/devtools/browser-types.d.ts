/**
 * Browser Environment Type Declarations for DevTools Module
 *
 * ## What
 * This module provides TypeScript declarations for browser-specific globals
 * that are used by the DevTools plugin module.
 *
 * ## How
 * Declares the minimal Window interface and related types needed for DevTools
 * integration without requiring the full DOM lib.
 *
 * ## Why
 * The main package is configured for Node.js types only, but the DevTools
 * module runs in the browser. These declarations bridge the gap without
 * changing the package-wide tsconfig.
 *
 * @module
 * @internal
 */

// Declare window as a global when in browser context
declare const window: Window & typeof globalThis;

// Minimal Window interface for DevTools integration
declare interface Window {
  /**
   * Vue DevTools global hook installed by the Vue DevTools browser extension.
   * Present when Vue DevTools is installed and active.
   */
  __VUE_DEVTOOLS_GLOBAL_HOOK__?: {
    enabled?: boolean;
    emit?: (event: string, ...args: unknown[]) => void;
    on?: (event: string, handler: (...args: unknown[]) => void) => void;
    off?: (event: string, handler: (...args: unknown[]) => void) => void;
  };
}

// Augment ImportMeta for Vite's environment variables
declare interface ImportMeta {
  env?: {
    DEV?: boolean;
    PROD?: boolean;
    MODE?: string;
    SSR?: boolean;
    BASE_URL?: string;
    [key: string]: unknown;
  };
}
