/**
 * Specs Store Tests
 *
 * What: Unit tests for the specs Pinia store
 * How: Tests state management, computed properties, and actions
 * Why: Ensures reliable multi-spec metadata management for DevTools UI
 *
 * @module stores/__tests__/specs.test
 */

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { type SpecInfo, useSpecsStore } from '../specs';

/**
 * Create a mock SpecInfo entry
 */
function createMockSpec(overrides: Partial<SpecInfo> = {}): SpecInfo {
  return {
    id: 'petstore',
    title: 'Petstore API',
    version: '1.0.0',
    proxyPath: '/api/petstore',
    color: '#4ade80',
    endpointCount: 10,
    schemaCount: 5,
    ...overrides,
  };
}

describe('useSpecsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('should have empty specs array', () => {
      const store = useSpecsStore();
      expect(store.specs).toEqual([]);
    });

    it('should have null activeSpecFilter', () => {
      const store = useSpecsStore();
      expect(store.activeSpecFilter).toBeNull();
    });

    it('should have empty specMap', () => {
      const store = useSpecsStore();
      expect(store.specMap.size).toBe(0);
    });

    it('should have empty specIds', () => {
      const store = useSpecsStore();
      expect(store.specIds).toEqual([]);
    });

    it('should have null activeSpec', () => {
      const store = useSpecsStore();
      expect(store.activeSpec).toBeNull();
    });

    it('should not be filtered', () => {
      const store = useSpecsStore();
      expect(store.isFiltered).toBe(false);
    });
  });

  describe('setSpecs', () => {
    it('should set specs from array', () => {
      const store = useSpecsStore();
      const spec = createMockSpec();

      store.setSpecs([spec]);

      expect(store.specs).toHaveLength(1);
      expect(store.specs[0]).toEqual(spec);
    });

    it('should replace existing specs', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'first' })]);
      store.setSpecs([createMockSpec({ id: 'second' })]);

      expect(store.specs).toHaveLength(1);
      expect(store.specs[0].id).toBe('second');
    });

    it('should handle empty array', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec()]);
      store.setSpecs([]);

      expect(store.specs).toEqual([]);
    });

    it('should handle multiple specs', () => {
      const store = useSpecsStore();
      const specs = [
        createMockSpec({ id: 'petstore', title: 'Petstore' }),
        createMockSpec({ id: 'users', title: 'Users API', color: '#60a5fa' }),
      ];

      store.setSpecs(specs);

      expect(store.specs).toHaveLength(2);
    });
  });

  describe('specMap computed', () => {
    it('should create a map keyed by spec id', () => {
      const store = useSpecsStore();
      const spec = createMockSpec({ id: 'petstore' });
      store.setSpecs([spec]);

      expect(store.specMap.get('petstore')).toEqual(spec);
    });

    it('should update when specs change', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'first' })]);

      expect(store.specMap.has('first')).toBe(true);

      store.setSpecs([createMockSpec({ id: 'second' })]);

      expect(store.specMap.has('first')).toBe(false);
      expect(store.specMap.has('second')).toBe(true);
    });

    it('should handle multiple specs in map', () => {
      const store = useSpecsStore();
      store.setSpecs([
        createMockSpec({ id: 'a' }),
        createMockSpec({ id: 'b' }),
        createMockSpec({ id: 'c' }),
      ]);

      expect(store.specMap.size).toBe(3);
    });
  });

  describe('specIds computed', () => {
    it('should return ordered list of spec IDs', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'petstore' }), createMockSpec({ id: 'users' })]);

      expect(store.specIds).toEqual(['petstore', 'users']);
    });

    it('should preserve insertion order', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'z-api' }), createMockSpec({ id: 'a-api' })]);

      expect(store.specIds).toEqual(['z-api', 'a-api']);
    });
  });

  describe('setFilter', () => {
    it('should set active spec filter', () => {
      const store = useSpecsStore();
      store.setFilter('petstore');

      expect(store.activeSpecFilter).toBe('petstore');
    });

    it('should clear filter when set to null', () => {
      const store = useSpecsStore();
      store.setFilter('petstore');
      store.setFilter(null);

      expect(store.activeSpecFilter).toBeNull();
    });
  });

  describe('toggleFilter', () => {
    it('should activate filter for a spec', () => {
      const store = useSpecsStore();
      store.toggleFilter('petstore');

      expect(store.activeSpecFilter).toBe('petstore');
    });

    it('should deactivate filter when toggling same spec', () => {
      const store = useSpecsStore();
      store.toggleFilter('petstore');
      store.toggleFilter('petstore');

      expect(store.activeSpecFilter).toBeNull();
    });

    it('should switch filter when toggling different spec', () => {
      const store = useSpecsStore();
      store.toggleFilter('petstore');
      store.toggleFilter('users');

      expect(store.activeSpecFilter).toBe('users');
    });
  });

  describe('activeSpec computed', () => {
    it('should return null when no filter is active', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'petstore' })]);

      expect(store.activeSpec).toBeNull();
    });

    it('should return the filtered spec', () => {
      const store = useSpecsStore();
      const spec = createMockSpec({ id: 'petstore' });
      store.setSpecs([spec]);
      store.setFilter('petstore');

      expect(store.activeSpec).toEqual(spec);
    });

    it('should return null when filter references nonexistent spec', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'petstore' })]);
      store.setFilter('nonexistent');

      expect(store.activeSpec).toBeNull();
    });
  });

  describe('isFiltered computed', () => {
    it('should be false when no filter is active', () => {
      const store = useSpecsStore();
      expect(store.isFiltered).toBe(false);
    });

    it('should be true when a filter is active', () => {
      const store = useSpecsStore();
      store.setFilter('petstore');
      expect(store.isFiltered).toBe(true);
    });

    it('should return to false when filter is cleared', () => {
      const store = useSpecsStore();
      store.setFilter('petstore');
      store.setFilter(null);
      expect(store.isFiltered).toBe(false);
    });
  });

  describe('getColor', () => {
    it('should return the color for a known spec', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'petstore', color: '#4ade80' })]);

      expect(store.getColor('petstore')).toBe('#4ade80');
    });

    it('should return fallback color for unknown spec', () => {
      const store = useSpecsStore();

      expect(store.getColor('nonexistent')).toBe('#94a3b8');
    });

    it('should return correct color for each spec', () => {
      const store = useSpecsStore();
      store.setSpecs([
        createMockSpec({ id: 'petstore', color: '#4ade80' }),
        createMockSpec({ id: 'users', color: '#60a5fa' }),
      ]);

      expect(store.getColor('petstore')).toBe('#4ade80');
      expect(store.getColor('users')).toBe('#60a5fa');
    });
  });
});
