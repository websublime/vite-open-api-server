/**
 * Simulation Manager
 *
 * What: Manages active simulations for endpoints
 * How: Maps paths to simulation configurations
 * Why: Enables per-endpoint error and delay simulation
 */

// TODO: Will be implemented in Task 5.3: Simulation Manager

/**
 * Simulation configuration
 */
export interface Simulation {
  path: string;
  operationId: string;
  status: number;
  delay?: number;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Simulation manager interface
 */
export interface SimulationManager {
  get(path: string): Simulation | undefined;
  set(simulation: Simulation): void;
  remove(path: string): boolean;
  list(): Simulation[];
  clear(): void;
}

/**
 * Create a new simulation manager
 *
 * @returns Simulation manager instance
 */
export function createSimulationManager(): SimulationManager {
  // TODO: Implement in Task 5.3
  throw new Error('Not implemented yet - see Task 5.3');
}
