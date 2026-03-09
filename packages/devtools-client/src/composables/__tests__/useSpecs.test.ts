/**
 * useSpecs Composable Tests
 *
 * What: Unit tests for the useSpecs composable
 * How: Tests utility functions and store delegation
 * Why: Ensures spec metadata helpers work correctly for component consumers
 *
 * @module composables/__tests__/useSpecs.test
 */

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import type { SpecInfo } from '../../stores/specs';
import { useSpecsStore } from '../../stores/specs';
import { useSpecs } from '../useSpecs';

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

describe('useSpecs', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('store delegation', () => {
    it('should expose specs from store', () => {
      const store = useSpecsStore();
      const specs = [createMockSpec()];
      store.setSpecs(specs);

      const { specs: composableSpecs } = useSpecs();

      expect(composableSpecs.value).toEqual(specs);
    });

    it('should expose activeSpecFilter from store', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'petstore' })]);
      store.setFilter('petstore');

      const { activeSpecFilter } = useSpecs();

      expect(activeSpecFilter.value).toBe('petstore');
    });

    it('should expose specMap from store', () => {
      const store = useSpecsStore();
      const spec = createMockSpec({ id: 'petstore' });
      store.setSpecs([spec]);

      const { specMap } = useSpecs();

      expect(specMap.value.get('petstore')).toEqual(spec);
    });

    it('should expose specIds from store', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'a' }), createMockSpec({ id: 'b' })]);

      const { specIds } = useSpecs();

      expect(specIds.value).toEqual(['a', 'b']);
    });

    it('should expose activeSpec from store', () => {
      const store = useSpecsStore();
      const spec = createMockSpec({ id: 'petstore' });
      store.setSpecs([spec]);
      store.setFilter('petstore');

      const { activeSpec } = useSpecs();

      expect(activeSpec.value).toEqual(spec);
    });

    it('should expose isFiltered from store', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'petstore' })]);
      store.setFilter('petstore');

      const { isFiltered } = useSpecs();

      expect(isFiltered.value).toBe(true);
    });

    it('should delegate setSpecs to store', () => {
      const store = useSpecsStore();
      const { setSpecs } = useSpecs();
      const specs = [createMockSpec()];

      setSpecs(specs);

      expect(store.specs).toEqual(specs);
    });

    it('should delegate setFilter to store', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'petstore' })]);
      const { setFilter } = useSpecs();

      setFilter('petstore');

      expect(store.activeSpecFilter).toBe('petstore');
    });

    it('should delegate toggleFilter to store', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'petstore' })]);
      const { toggleFilter } = useSpecs();

      toggleFilter('petstore');
      expect(store.activeSpecFilter).toBe('petstore');

      toggleFilter('petstore');
      expect(store.activeSpecFilter).toBeNull();
    });
  });

  describe('getSpecColor', () => {
    it('should return the color for a known spec', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'petstore', color: '#4ade80' })]);

      const { getSpecColor } = useSpecs();

      expect(getSpecColor('petstore')).toBe('#4ade80');
    });

    it('should return fallback color for unknown spec', () => {
      const { getSpecColor } = useSpecs();

      expect(getSpecColor('nonexistent')).toBe('#94a3b8');
    });
  });

  describe('specLabel', () => {
    it('should format label as "title (version)"', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'petstore', title: 'Petstore API', version: '1.0.0' })]);

      const { specLabel } = useSpecs();

      expect(specLabel('petstore')).toBe('Petstore API (1.0.0)');
    });

    it('should return spec ID when spec not found', () => {
      const { specLabel } = useSpecs();

      expect(specLabel('unknown-spec')).toBe('unknown-spec');
    });

    it('should handle different title and version combinations', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'users', title: 'Users Service', version: '2.3.1' })]);

      const { specLabel } = useSpecs();

      expect(specLabel('users')).toBe('Users Service (2.3.1)');
    });
  });

  describe('isActiveSpec', () => {
    it('should return true when spec is the active filter', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'petstore' })]);
      store.setFilter('petstore');

      const { isActiveSpec } = useSpecs();

      expect(isActiveSpec('petstore')).toBe(true);
    });

    it('should return false when spec is not the active filter', () => {
      const store = useSpecsStore();
      store.setSpecs([
        createMockSpec({ id: 'petstore' }),
        createMockSpec({ id: 'users', title: 'Users API' }),
      ]);
      store.setFilter('users');

      const { isActiveSpec } = useSpecs();

      expect(isActiveSpec('petstore')).toBe(false);
    });

    it('should return false when no filter is active', () => {
      const { isActiveSpec } = useSpecs();

      expect(isActiveSpec('petstore')).toBe(false);
    });
  });
});
