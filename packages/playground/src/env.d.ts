/// <reference types="vite/client" />

/**
 * Vue SFC Type Declarations
 *
 * What: TypeScript type declarations for Vue Single File Components
 * How: Declares module types for .vue files and Vite client types
 * Why: Allows TypeScript to recognize and type-check .vue imports
 */

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, any>;
  export default component;
}
