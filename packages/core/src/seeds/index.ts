/**
 * Seeds Module
 *
 * What: Seed loading and execution with context injection
 * How: Provides SeedHelper, SeedContext, and executeSeeds
 * Why: Enables pre-populated data stores for realistic mock scenarios
 *
 * @module seeds
 */

export type {
  AnySeedFn,
  AsyncSeedFn,
  SeedContext,
  SeedFn,
  SeedHelper,
} from './context.js';
export { defineSeeds, type SeedDefinition, type SeedFnMap } from './define-seeds.js';
export {
  createSeedContext,
  createSeedHelper,
  type ExecuteSeedsOptions,
  type ExecuteSeedsResult,
  executeSeedDefinition,
  executeSeeds,
  SeedExecutorError,
} from './executor.js';
