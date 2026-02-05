/**
 * Simulation Manager
 *
 * What: Manages active simulations for endpoints
 * How: Maps paths to simulation configurations using in-memory storage
 * Why: Enables per-endpoint error and delay simulation for testing
 *
 * @remarks
 * Simulations allow developers to test error handling and loading states
 * without modifying actual endpoint logic. Each simulation is keyed by
 * a unique path identifier (typically operationId or "METHOD /path").
 *
 * @see Task 5.3 for advanced simulation features
 */

/**
 * Simulation configuration for an endpoint
 *
 * When a simulation is active for a path, the router will:
 * 1. Wait for `delay` milliseconds (if specified)
 * 2. Return the configured `status` code
 * 3. Return `body` as response data (if specified)
 * 4. Include `headers` in response (if specified)
 */
export interface Simulation {
  /**
   * Unique path identifier.
   * Recommended format: "METHOD /path" (e.g., "GET /pets") to avoid collisions.
   * Alternatively, use the operationId if unique.
   */
  path: string;

  /** Operation ID from OpenAPI spec (for display/lookup) */
  operationId: string;

  /** HTTP status code to return */
  status: number;

  /** Optional delay in milliseconds before responding */
  delay?: number;

  /** Optional response body (overrides normal response) */
  body?: unknown;

  /** Optional response headers to include */
  headers?: Record<string, string>;
}

/**
 * Simulation manager interface
 *
 * Provides CRUD operations for managing endpoint simulations.
 * Each simulation is identified by its path, allowing only one
 * active simulation per endpoint.
 */
export interface SimulationManager {
  /**
   * Get the active simulation for a path
   * @param path - The path identifier to look up
   * @returns Simulation config if active, undefined otherwise
   */
  get(path: string): Simulation | undefined;

  /**
   * Set or update a simulation for a path
   * @param simulation - The simulation configuration
   */
  set(simulation: Simulation): void;

  /**
   * Remove a simulation by path
   * @param path - The path identifier to remove
   * @returns true if a simulation was removed, false if not found
   */
  remove(path: string): boolean;

  /**
   * List all active simulations
   * @returns Array of all simulation configurations
   */
  list(): Simulation[];

  /**
   * Clear all active simulations
   */
  clear(): void;

  /**
   * Check if a simulation exists for a path
   * @param path - The path identifier to check
   * @returns true if simulation exists
   */
  has(path: string): boolean;

  /**
   * Get the count of active simulations
   * @returns Number of active simulations
   */
  count(): number;
}

/**
 * Create a new simulation manager
 *
 * The simulation manager maintains an in-memory registry of active
 * simulations. When a request matches a simulated path, the router
 * will return the configured response instead of the normal handler.
 *
 * @example
 * ```typescript
 * const manager = createSimulationManager();
 *
 * // Add a 500 error simulation
 * manager.set({
 *   path: 'GET /pets',
 *   operationId: 'listPets',
 *   status: 500,
 *   body: { error: 'Internal Server Error' }
 * });
 *
 * // Add a slow response simulation
 * manager.set({
 *   path: 'GET /pets/{petId}',
 *   operationId: 'getPetById',
 *   status: 200,
 *   delay: 3000  // 3 second delay
 * });
 *
 * // Check if simulation exists
 * if (manager.has('GET /pets')) {
 *   const sim = manager.get('GET /pets');
 *   console.log(`Simulating ${sim.status} response`);
 * }
 *
 * // List all simulations
 * for (const sim of manager.list()) {
 *   console.log(`${sim.path}: ${sim.status}`);
 * }
 *
 * // Remove a simulation
 * manager.remove('GET /pets');
 *
 * // Clear all simulations
 * manager.clear();
 * ```
 *
 * @returns Simulation manager instance
 */
export function createSimulationManager(): SimulationManager {
  /**
   * In-memory storage for simulations
   * Key: path identifier (e.g., "GET /pets")
   * Value: Simulation configuration
   */
  const simulations = new Map<string, Simulation>();

  return {
    get(path: string): Simulation | undefined {
      const simulation = simulations.get(path);
      // Return a copy to prevent external mutation (consistent with set/list)
      return simulation ? { ...simulation } : undefined;
    },

    set(simulation: Simulation): void {
      if (!simulation.path) {
        throw new Error('Simulation path is required');
      }
      if (
        typeof simulation.status !== 'number' ||
        simulation.status < 100 ||
        simulation.status > 599
      ) {
        throw new Error('Simulation status must be a valid HTTP status code (100-599)');
      }
      if (simulation.delay !== undefined && simulation.delay < 0) {
        throw new Error('Simulation delay must be non-negative');
      }

      // Store a copy to prevent external mutation
      simulations.set(simulation.path, { ...simulation });
    },

    remove(path: string): boolean {
      return simulations.delete(path);
    },

    list(): Simulation[] {
      // Return copies to prevent external mutation
      return Array.from(simulations.values()).map((sim) => ({ ...sim }));
    },

    clear(): void {
      simulations.clear();
    },

    has(path: string): boolean {
      return simulations.has(path);
    },

    count(): number {
      return simulations.size;
    },
  };
}
