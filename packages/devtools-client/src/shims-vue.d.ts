/**
 * Vue Component Type Declaration Shim
 *
 * What: Provides TypeScript type declarations for .vue files
 * How: Declares module type for all files matching *.vue pattern
 * Why: Enables TypeScript to understand Vue single-file components
 */

declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
