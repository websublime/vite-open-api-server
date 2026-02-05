/**
 * Simulation Store
 *
 * What: Pinia store for managing error and delay simulations
 * How: Manages simulation state and communicates with server via WebSocket
 * Why: Enables developers to test error handling and loading states
 *
 * @module stores/simulation
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

/**
 * Simulation preset type
 */
export type SimulationPresetType = 'delay' | 'error' | 'empty';

/**
 * Simulation preset definition
 */
export interface SimulationPreset {
  id: string;
  label: string;
  description: string;
  type: SimulationPresetType;
  status: number;
  delay?: number;
  body?: unknown;
}

/**
 * Active simulation state
 */
export interface ActiveSimulation {
  path: string;
  operationId?: string;
  status: number;
  delay?: number;
  body?: unknown;
  presetId?: string;
}

/**
 * Preset definitions matching PRD FR-104 requirements
 */
export const SIMULATION_PRESETS: SimulationPreset[] = [
  {
    id: 'slow-network',
    label: 'Slow Network',
    description: '3000ms delay (3G simulation)',
    type: 'delay',
    status: 200,
    delay: 3000,
  },
  {
    id: 'server-error',
    label: 'Server Error',
    description: 'Returns HTTP 500',
    type: 'error',
    status: 500,
    body: { error: 'Internal Server Error', message: 'Simulated server error' },
  },
  {
    id: 'rate-limit',
    label: 'Rate Limited',
    description: 'Returns HTTP 429',
    type: 'error',
    status: 429,
    body: { error: 'Too Many Requests', message: 'Rate limit exceeded' },
  },
  {
    id: 'not-found',
    label: 'Not Found',
    description: 'Returns HTTP 404',
    type: 'error',
    status: 404,
    body: { error: 'Not Found', message: 'Resource not found' },
  },
  {
    id: 'request-timeout',
    label: 'Request Timeout',
    description: '30000ms delay (simulates timeout)',
    type: 'delay',
    status: 200,
    delay: 30000,
  },
  {
    id: 'empty-response',
    label: 'Empty Response',
    description: 'Returns HTTP 200 with empty body',
    type: 'empty',
    status: 200,
    body: null,
  },
  {
    id: 'unauthorized',
    label: 'Unauthorized',
    description: 'Returns HTTP 401',
    type: 'error',
    status: 401,
    body: { error: 'Unauthorized', message: 'Authentication required' },
  },
];

/**
 * Simulation store for managing endpoint simulations
 *
 * Provides:
 * - Active simulations storage and retrieval
 * - Preset definitions and lookup
 * - WebSocket command integration
 * - Simulation count and status tracking
 */
export const useSimulationStore = defineStore('simulation', () => {
  // ==========================================================================
  // State
  // ==========================================================================

  /**
   * Active simulations keyed by path
   * One simulation per path (enforced by Map)
   */
  const simulations = ref<Map<string, ActiveSimulation>>(new Map());

  /**
   * Loading state for async operations
   */
  const isLoading = ref(false);

  /**
   * Error state
   */
  const error = ref<string | null>(null);

  // ==========================================================================
  // Getters / Computed
  // ==========================================================================

  /**
   * All active simulations as an array
   */
  const activeSimulations = computed(() => {
    return Array.from(simulations.value.values());
  });

  /**
   * Count of active simulations
   */
  const count = computed(() => simulations.value.size);

  /**
   * Available presets
   */
  const presets = computed(() => SIMULATION_PRESETS);

  /**
   * Check if any simulations are active
   */
  const hasActiveSimulations = computed(() => simulations.value.size > 0);

  /**
   * Get simulations grouped by type
   */
  const simulationsByType = computed(() => {
    const grouped = {
      delay: [] as ActiveSimulation[],
      error: [] as ActiveSimulation[],
      empty: [] as ActiveSimulation[],
    };

    for (const simulation of simulations.value.values()) {
      const type = getSimulationType(simulation);
      grouped[type].push(simulation);
    }

    return grouped;
  });

  /**
   * Determine simulation type from simulation config
   */
  function getSimulationType(simulation: ActiveSimulation): SimulationPresetType {
    const preset = simulation.presetId
      ? SIMULATION_PRESETS.find((p) => p.id === simulation.presetId)
      : null;

    if (preset) {
      return preset.type;
    }

    if (simulation.delay && simulation.delay > 0) {
      return 'delay';
    }

    if (simulation.body === null) {
      return 'empty';
    }

    return 'error';
  }

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Set active simulations from server (e.g., on 'simulation:active' event)
   */
  function setSimulations(newSimulations: ActiveSimulation[]): void {
    simulations.value.clear();
    for (const simulation of newSimulations) {
      simulations.value.set(simulation.path, simulation);
    }
    error.value = null;
  }

  /**
   * Add a new simulation locally
   * Note: This updates local state only. Use addSimulation() to sync with server.
   */
  function addSimulationLocal(simulation: ActiveSimulation): void {
    simulations.value.set(simulation.path, simulation);
  }

  /**
   * Remove a simulation locally by path
   * Note: This updates local state only. Use removeSimulation() to sync with server.
   */
  function removeSimulationLocal(path: string): boolean {
    return simulations.value.delete(path);
  }

  /**
   * Clear all simulations locally
   * Note: This updates local state only. Use clearSimulations() to sync with server.
   */
  function clearSimulationsLocal(): void {
    simulations.value.clear();
  }

  /**
   * Get a simulation by path
   */
  function getSimulation(path: string): ActiveSimulation | undefined {
    return simulations.value.get(path);
  }

  /**
   * Check if a simulation exists for a path
   */
  function hasSimulation(path: string): boolean {
    return simulations.value.has(path);
  }

  /**
   * Get a preset by ID
   */
  function getPreset(id: string): SimulationPreset | undefined {
    return SIMULATION_PRESETS.find((p) => p.id === id);
  }

  /**
   * Create a simulation from a preset
   */
  function createSimulationFromPreset(
    path: string,
    presetId: string,
    operationId?: string,
  ): ActiveSimulation | null {
    const preset = getPreset(presetId);
    if (!preset) {
      error.value = `Preset not found: ${presetId}`;
      return null;
    }

    return {
      path,
      operationId,
      status: preset.status,
      delay: preset.delay,
      body: preset.body,
      presetId: preset.id,
    };
  }

  /**
   * Set loading state
   */
  function setLoading(loading: boolean): void {
    isLoading.value = loading;
  }

  /**
   * Set error state
   */
  function setError(errorMessage: string): void {
    error.value = errorMessage;
    isLoading.value = false;
  }

  /**
   * Clear error state
   */
  function clearError(): void {
    error.value = null;
  }

  /**
   * Handle simulation:added event from server
   */
  function handleSimulationAdded(data: { path: string }): void {
    // Server will send 'simulation:active' event with full state
    // This event is just a notification
    console.log('[Simulation] Added:', data.path);
  }

  /**
   * Handle simulation:removed event from server
   */
  function handleSimulationRemoved(data: { path: string }): void {
    removeSimulationLocal(data.path);
    console.log('[Simulation] Removed:', data.path);
  }

  /**
   * Handle simulations:cleared event from server
   */
  function handleSimulationsCleared(data: { count: number }): void {
    clearSimulationsLocal();
    console.log('[Simulation] Cleared all:', data.count);
  }

  /**
   * Handle simulation:set response from server
   */
  function handleSimulationSet(data: { path: string; success: boolean }): void {
    if (data.success) {
      console.log('[Simulation] Set successfully:', data.path);
    } else {
      setError(`Failed to set simulation for ${data.path}`);
    }
    setLoading(false);
  }

  /**
   * Handle simulation:cleared response from server
   */
  function handleSimulationCleared(data: { path: string; success: boolean }): void {
    if (data.success) {
      removeSimulationLocal(data.path);
      console.log('[Simulation] Cleared successfully:', data.path);
    } else {
      setError(`Failed to clear simulation for ${data.path}`);
    }
    setLoading(false);
  }

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    simulations,
    isLoading,
    error,

    // Getters
    activeSimulations,
    count,
    presets,
    hasActiveSimulations,
    simulationsByType,

    // Actions
    setSimulations,
    addSimulationLocal,
    removeSimulationLocal,
    clearSimulationsLocal,
    getSimulation,
    hasSimulation,
    getPreset,
    createSimulationFromPreset,
    setLoading,
    setError,
    clearError,

    // Event handlers
    handleSimulationAdded,
    handleSimulationRemoved,
    handleSimulationsCleared,
    handleSimulationSet,
    handleSimulationCleared,
  };
});
