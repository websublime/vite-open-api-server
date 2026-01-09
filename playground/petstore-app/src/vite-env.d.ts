/**
 * Vite Environment Type Declarations
 *
 * ## What
 * This file provides TypeScript type declarations for Vite-specific features
 * and Vue Single File Component (SFC) module imports.
 *
 * ## How
 * - References Vite's client types for environment variables and HMR API
 * - Declares the `.vue` module type so TypeScript understands Vue SFC imports
 *
 * ## Why
 * TypeScript does not natively understand `.vue` file imports. This declaration
 * file tells TypeScript that any import ending in `.vue` is a valid Vue component,
 * enabling proper type checking and IDE support for Vue SFC imports.
 *
 * @module vite-env
 */

/// <reference types="vite/client" />

/**
 * Module declaration for Vue Single File Components.
 *
 * @remarks
 * This declaration enables TypeScript to understand imports like:
 * ```typescript
 * import App from './App.vue';
 * ```
 *
 * The `DefineComponent` type represents a Vue 3 component with:
 * - Unknown props, emits, and slots (relaxed typing for flexibility)
 * - Full component instance type information for IDE support
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  /**
   * Default export type for Vue SFC files.
   *
   * @remarks
   * Uses `DefineComponent` with relaxed generic parameters to allow
   * any valid Vue component structure while still providing basic
   * type safety and autocompletion.
   */
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;

  export default component;
}
