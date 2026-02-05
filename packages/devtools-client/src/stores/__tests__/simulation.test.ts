/**
 * Simulation Store Tests
 *
 * What: Unit tests for the simulation Pinia store
 * How: Tests state management, computed properties, and actions
 * Why: Ensures reliable simulation functionality for the Simulator Page
 *
 * @module stores/__tests__/simulation.test
 */

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ActiveSimulation } from '../simulation';
import { SIMULATION_PRESETS, useSimulationStore } from '../simulation';

/**
 * Create mock active simulation
 */
function createMockSimulation(overrides: Partial<ActiveSimulation> = {}): ActiveSimulation {
  return {
    path: 'GET /pets',
    operationId: 'listPets',
    status: 500,
    delay: undefined,
    body: { error: 'Internal Server Error' },
    presetId: 'server-error',
    ...overrides,
  };
}

describe('useSimulationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('should have empty simulations map', () => {
      const store = useSimulationStore();
      expect(store.simulations.size).toBe(0);
    });

    it('should not be loading', () => {
      const store = useSimulationStore();
      expect(store.isLoading).toBe(false);
    });

    it('should have no error', () => {
      const store = useSimulationStore();
      expect(store.error).toBeNull();
    });
  });

  describe('presets', () => {
    it('should have 7 predefined presets', () => {
      const store = useSimulationStore();
      expect(store.presets).toHaveLength(7);
      expect(store.presets).toBe(SIMULATION_PRESETS);
    });

    it('should include slow-network preset', () => {
      const store = useSimulationStore();
      const preset = store.presets.find((p) => p.id === 'slow-network');
      expect(preset).toBeDefined();
      expect(preset?.delay).toBe(3000);
      expect(preset?.status).toBe(200);
      expect(preset?.type).toBe('delay');
    });

    it('should include server-error preset', () => {
      const store = useSimulationStore();
      const preset = store.presets.find((p) => p.id === 'server-error');
      expect(preset).toBeDefined();
      expect(preset?.status).toBe(500);
      expect(preset?.type).toBe('error');
      expect(preset?.body).toBeDefined();
    });

    it('should include empty-response preset', () => {
      const store = useSimulationStore();
      const preset = store.presets.find((p) => p.id === 'empty-response');
      expect(preset).toBeDefined();
      expect(preset?.status).toBe(200);
      expect(preset?.type).toBe('empty');
      expect(preset?.body).toBeNull();
    });
  });

  describe('computed properties', () => {
    describe('activeSimulations', () => {
      it('should return empty array when no simulations', () => {
        const store = useSimulationStore();
        expect(store.activeSimulations).toEqual([]);
      });

      it('should return all simulations as array', () => {
        const store = useSimulationStore();
        const sim1 = createMockSimulation({ path: 'GET /pets' });
        const sim2 = createMockSimulation({ path: 'POST /pets', status: 404 });

        store.addSimulationLocal(sim1);
        store.addSimulationLocal(sim2);

        expect(store.activeSimulations).toHaveLength(2);
        expect(store.activeSimulations).toContainEqual(sim1);
        expect(store.activeSimulations).toContainEqual(sim2);
      });
    });

    describe('count', () => {
      it('should return 0 when no simulations', () => {
        const store = useSimulationStore();
        expect(store.count).toBe(0);
      });

      it('should return correct count', () => {
        const store = useSimulationStore();
        store.addSimulationLocal(createMockSimulation({ path: 'GET /pets' }));
        store.addSimulationLocal(createMockSimulation({ path: 'POST /pets' }));

        expect(store.count).toBe(2);
      });
    });

    describe('hasActiveSimulations', () => {
      it('should be false when no simulations', () => {
        const store = useSimulationStore();
        expect(store.hasActiveSimulations).toBe(false);
      });

      it('should be true when simulations exist', () => {
        const store = useSimulationStore();
        store.addSimulationLocal(createMockSimulation());

        expect(store.hasActiveSimulations).toBe(true);
      });
    });

    describe('simulationsByType', () => {
      it('should group simulations by type', () => {
        const store = useSimulationStore();
        store.addSimulationLocal(
          createMockSimulation({
            path: 'GET /pets',
            presetId: 'slow-network',
            delay: 3000,
          }),
        );
        store.addSimulationLocal(
          createMockSimulation({
            path: 'POST /pets',
            presetId: 'server-error',
            status: 500,
          }),
        );
        store.addSimulationLocal(
          createMockSimulation({
            path: 'DELETE /pets',
            presetId: 'empty-response',
            status: 200,
            body: null,
          }),
        );

        const grouped = store.simulationsByType;

        expect(grouped.delay).toHaveLength(1);
        expect(grouped.error).toHaveLength(1);
        expect(grouped.empty).toHaveLength(1);
      });
    });
  });

  describe('actions', () => {
    describe('setSimulations', () => {
      it('should replace all simulations', () => {
        const store = useSimulationStore();
        store.addSimulationLocal(createMockSimulation({ path: 'GET /old' }));

        const newSims = [
          createMockSimulation({ path: 'GET /new1' }),
          createMockSimulation({ path: 'GET /new2' }),
        ];

        store.setSimulations(newSims);

        expect(store.count).toBe(2);
        expect(store.activeSimulations).toEqual(newSims);
      });

      it('should clear error on success', () => {
        const store = useSimulationStore();
        store.setError('Test error');

        store.setSimulations([]);

        expect(store.error).toBeNull();
      });
    });

    describe('addSimulationLocal', () => {
      it('should add simulation to map', () => {
        const store = useSimulationStore();
        const sim = createMockSimulation({ path: 'GET /pets' });

        store.addSimulationLocal(sim);

        expect(store.count).toBe(1);
        expect(store.getSimulation('GET /pets')).toEqual(sim);
      });

      it('should replace existing simulation for same path', () => {
        const store = useSimulationStore();
        const sim1 = createMockSimulation({ path: 'GET /pets', status: 500 });
        const sim2 = createMockSimulation({ path: 'GET /pets', status: 404 });

        store.addSimulationLocal(sim1);
        store.addSimulationLocal(sim2);

        expect(store.count).toBe(1);
        expect(store.getSimulation('GET /pets')?.status).toBe(404);
      });
    });

    describe('removeSimulationLocal', () => {
      it('should remove simulation by path', () => {
        const store = useSimulationStore();
        store.addSimulationLocal(createMockSimulation({ path: 'GET /pets' }));

        const removed = store.removeSimulationLocal('GET /pets');

        expect(removed).toBe(true);
        expect(store.count).toBe(0);
      });

      it('should return false if simulation not found', () => {
        const store = useSimulationStore();
        const removed = store.removeSimulationLocal('GET /nonexistent');

        expect(removed).toBe(false);
      });
    });

    describe('clearSimulationsLocal', () => {
      it('should remove all simulations', () => {
        const store = useSimulationStore();
        store.addSimulationLocal(createMockSimulation({ path: 'GET /pets' }));
        store.addSimulationLocal(createMockSimulation({ path: 'POST /pets' }));

        store.clearSimulationsLocal();

        expect(store.count).toBe(0);
        expect(store.activeSimulations).toEqual([]);
      });
    });

    describe('getSimulation', () => {
      it('should return simulation if exists', () => {
        const store = useSimulationStore();
        const sim = createMockSimulation({ path: 'GET /pets' });
        store.addSimulationLocal(sim);

        const result = store.getSimulation('GET /pets');

        expect(result).toEqual(sim);
      });

      it('should return undefined if not found', () => {
        const store = useSimulationStore();
        const result = store.getSimulation('GET /nonexistent');

        expect(result).toBeUndefined();
      });
    });

    describe('hasSimulation', () => {
      it('should return true if simulation exists', () => {
        const store = useSimulationStore();
        store.addSimulationLocal(createMockSimulation({ path: 'GET /pets' }));

        expect(store.hasSimulation('GET /pets')).toBe(true);
      });

      it('should return false if simulation does not exist', () => {
        const store = useSimulationStore();
        expect(store.hasSimulation('GET /pets')).toBe(false);
      });
    });

    describe('getPreset', () => {
      it('should return preset by id', () => {
        const store = useSimulationStore();
        const preset = store.getPreset('slow-network');

        expect(preset).toBeDefined();
        expect(preset?.id).toBe('slow-network');
      });

      it('should return undefined for invalid id', () => {
        const store = useSimulationStore();
        const preset = store.getPreset('invalid-preset');

        expect(preset).toBeUndefined();
      });
    });

    describe('createSimulationFromPreset', () => {
      it('should create simulation from valid preset', () => {
        const store = useSimulationStore();
        const simulation = store.createSimulationFromPreset(
          'GET /pets',
          'server-error',
          'listPets',
        );

        expect(simulation).toBeDefined();
        expect(simulation?.path).toBe('GET /pets');
        expect(simulation?.operationId).toBe('listPets');
        expect(simulation?.status).toBe(500);
        expect(simulation?.presetId).toBe('server-error');
        expect(simulation?.body).toBeDefined();
      });

      it('should return null for invalid preset', () => {
        const store = useSimulationStore();
        const simulation = store.createSimulationFromPreset('GET /pets', 'invalid');

        expect(simulation).toBeNull();
      });

      it('should set error for invalid preset', () => {
        const store = useSimulationStore();
        store.createSimulationFromPreset('GET /pets', 'invalid');

        expect(store.error).toBe('Preset not found: invalid');
      });

      it('should include delay for delay presets', () => {
        const store = useSimulationStore();
        const simulation = store.createSimulationFromPreset('GET /pets', 'slow-network');

        expect(simulation?.delay).toBe(3000);
      });

      it('should work without operationId', () => {
        const store = useSimulationStore();
        const simulation = store.createSimulationFromPreset('GET /pets', 'server-error');

        expect(simulation).toBeDefined();
        expect(simulation?.operationId).toBeUndefined();
      });
    });

    describe('setLoading', () => {
      it('should set loading state', () => {
        const store = useSimulationStore();
        store.setLoading(true);

        expect(store.isLoading).toBe(true);

        store.setLoading(false);

        expect(store.isLoading).toBe(false);
      });
    });

    describe('setError', () => {
      it('should set error message', () => {
        const store = useSimulationStore();
        store.setError('Test error');

        expect(store.error).toBe('Test error');
      });

      it('should set loading to false', () => {
        const store = useSimulationStore();
        store.setLoading(true);
        store.setError('Test error');

        expect(store.isLoading).toBe(false);
      });
    });

    describe('clearError', () => {
      it('should clear error', () => {
        const store = useSimulationStore();
        store.setError('Test error');

        store.clearError();

        expect(store.error).toBeNull();
      });
    });
  });

  describe('event handlers', () => {
    describe('handleSimulationAdded', () => {
      it('should log added simulation', () => {
        const store = useSimulationStore();
        const consoleSpy = vi.spyOn(console, 'log');

        store.handleSimulationAdded({ path: 'GET /pets' });

        expect(consoleSpy).toHaveBeenCalledWith('[Simulation] Added:', 'GET /pets');
        consoleSpy.mockRestore();
      });
    });

    describe('handleSimulationRemoved', () => {
      it('should remove simulation locally', () => {
        const store = useSimulationStore();
        store.addSimulationLocal(createMockSimulation({ path: 'GET /pets' }));

        store.handleSimulationRemoved({ path: 'GET /pets' });

        expect(store.count).toBe(0);
      });
    });

    describe('handleSimulationsCleared', () => {
      it('should clear all simulations locally', () => {
        const store = useSimulationStore();
        store.addSimulationLocal(createMockSimulation({ path: 'GET /pets' }));
        store.addSimulationLocal(createMockSimulation({ path: 'POST /pets' }));

        store.handleSimulationsCleared({ count: 2 });

        expect(store.count).toBe(0);
      });
    });

    describe('handleSimulationSet', () => {
      it('should set loading to false on success', () => {
        const store = useSimulationStore();
        store.setLoading(true);

        store.handleSimulationSet({ path: 'GET /pets', success: true });

        expect(store.isLoading).toBe(false);
      });

      it('should set error on failure', () => {
        const store = useSimulationStore();
        store.handleSimulationSet({ path: 'GET /pets', success: false });

        expect(store.error).toBe('Failed to set simulation for GET /pets');
      });
    });

    describe('handleSimulationCleared', () => {
      it('should remove simulation and set loading to false on success', () => {
        const store = useSimulationStore();
        store.addSimulationLocal(createMockSimulation({ path: 'GET /pets' }));
        store.setLoading(true);

        store.handleSimulationCleared({ path: 'GET /pets', success: true });

        expect(store.count).toBe(0);
        expect(store.isLoading).toBe(false);
      });

      it('should set error on failure', () => {
        const store = useSimulationStore();
        store.handleSimulationCleared({ path: 'GET /pets', success: false });

        expect(store.error).toBe('Failed to clear simulation for GET /pets');
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple simulations for different paths', () => {
      const store = useSimulationStore();

      const sim1 = store.createSimulationFromPreset('GET /pets', 'slow-network');
      const sim2 = store.createSimulationFromPreset('POST /pets', 'server-error');

      if (sim1) store.addSimulationLocal(sim1);
      if (sim2) store.addSimulationLocal(sim2);

      expect(store.count).toBe(2);
      expect(store.hasSimulation('GET /pets')).toBe(true);
      expect(store.hasSimulation('POST /pets')).toBe(true);
    });

    it('should enforce one simulation per path', () => {
      const store = useSimulationStore();

      const sim1 = store.createSimulationFromPreset('GET /pets', 'slow-network');
      const sim2 = store.createSimulationFromPreset('GET /pets', 'server-error');

      if (sim1) store.addSimulationLocal(sim1);
      if (sim2) store.addSimulationLocal(sim2);

      expect(store.count).toBe(1);
      expect(store.getSimulation('GET /pets')?.status).toBe(500);
    });

    it('should handle full workflow: add, get, remove', () => {
      const store = useSimulationStore();

      // Add
      const sim = store.createSimulationFromPreset('GET /pets', 'rate-limit');
      if (sim) store.addSimulationLocal(sim);

      expect(store.count).toBe(1);

      // Get
      const retrieved = store.getSimulation('GET /pets');
      expect(retrieved?.status).toBe(429);

      // Remove
      const removed = store.removeSimulationLocal('GET /pets');
      expect(removed).toBe(true);
      expect(store.count).toBe(0);
    });
  });
});
