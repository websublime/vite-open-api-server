/**
 * SpecFilter Component Tests
 *
 * What: Unit tests for the SpecFilter component
 * How: Mounts component with @vue/test-utils and Pinia, verifies chip rendering and toggle
 * Why: Ensures spec filter chips render correctly and toggle behavior works
 *
 * @module components/__tests__/SpecFilter.test
 */

import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import type { SpecInfo } from '../../stores/specs';
import { useSpecsStore } from '../../stores/specs';
import SpecFilter from '../SpecFilter.vue';

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

describe('SpecFilter', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  function mountFilter() {
    return mount(SpecFilter, {
      global: {
        plugins: [pinia],
      },
    });
  }

  describe('rendering', () => {
    it('should not render when no specs exist', () => {
      const wrapper = mountFilter();

      expect(wrapper.find('.spec-filter').exists()).toBe(false);
    });

    it('should render when specs exist', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec()]);

      const wrapper = mountFilter();

      expect(wrapper.find('.spec-filter').exists()).toBe(true);
    });

    it('should render the SPECS label', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec()]);

      const wrapper = mountFilter();
      const label = wrapper.find('.spec-filter__label');

      expect(label.exists()).toBe(true);
      expect(label.text()).toBe('SPECS');
    });

    it('should render one chip per spec', () => {
      const store = useSpecsStore();
      store.setSpecs([
        createMockSpec({ id: 'petstore' }),
        createMockSpec({ id: 'users', title: 'Users API', color: '#60a5fa' }),
      ]);

      const wrapper = mountFilter();
      const chips = wrapper.findAll('.spec-filter__chip');

      expect(chips).toHaveLength(2);
    });

    it('should display spec id text in each chip', () => {
      const store = useSpecsStore();
      store.setSpecs([
        createMockSpec({ id: 'petstore' }),
        createMockSpec({ id: 'users', title: 'Users API' }),
      ]);

      const wrapper = mountFilter();
      const chips = wrapper.findAll('.spec-filter__chip');

      expect(chips[0].text()).toContain('petstore');
      expect(chips[1].text()).toContain('users');
    });

    it('should render a colored dot in each chip', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'petstore', color: '#4ade80' })]);

      const wrapper = mountFilter();
      const dot = wrapper.find('.spec-filter__dot');

      expect(dot.exists()).toBe(true);
      expect(dot.attributes('style')).toContain('background-color: rgb(74, 222, 128)');
    });
  });

  describe('toggle behavior', () => {
    it('should set aria-pressed=false for inactive chips', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'petstore' })]);

      const wrapper = mountFilter();
      const chip = wrapper.find('.spec-filter__chip');

      expect(chip.attributes('aria-pressed')).toBe('false');
    });

    it('should toggle a chip active on click', async () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'petstore' })]);

      const wrapper = mountFilter();
      const chip = wrapper.find('.spec-filter__chip');

      await chip.trigger('click');

      expect(store.activeSpecFilter).toBe('petstore');
      expect(chip.attributes('aria-pressed')).toBe('true');
    });

    it('should toggle a chip inactive on second click', async () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'petstore' })]);

      const wrapper = mountFilter();
      const chip = wrapper.find('.spec-filter__chip');

      await chip.trigger('click');
      expect(store.activeSpecFilter).toBe('petstore');

      await chip.trigger('click');
      expect(store.activeSpecFilter).toBeNull();
      expect(chip.attributes('aria-pressed')).toBe('false');
    });

    it('should switch active chip when clicking a different spec', async () => {
      const store = useSpecsStore();
      store.setSpecs([
        createMockSpec({ id: 'petstore' }),
        createMockSpec({ id: 'users', title: 'Users API', color: '#60a5fa' }),
      ]);

      const wrapper = mountFilter();
      const chips = wrapper.findAll('.spec-filter__chip');

      await chips[0].trigger('click');
      expect(store.activeSpecFilter).toBe('petstore');

      await chips[1].trigger('click');
      expect(store.activeSpecFilter).toBe('users');
      expect(chips[0].attributes('aria-pressed')).toBe('false');
      expect(chips[1].attributes('aria-pressed')).toBe('true');
    });
  });

  describe('styling', () => {
    it('should apply active styles to the active chip', async () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'petstore', color: '#4ade80' })]);

      const wrapper = mountFilter();
      const chip = wrapper.find('.spec-filter__chip');

      await chip.trigger('click');

      const style = chip.attributes('style') ?? '';
      expect(style).toContain('border-color: rgb(74, 222, 128)');
      expect(style).toContain('color: rgb(74, 222, 128)');
    });

    it('should apply inactive styles to non-active chips', () => {
      const store = useSpecsStore();
      store.setSpecs([createMockSpec({ id: 'petstore' })]);

      const wrapper = mountFilter();
      const chip = wrapper.find('.spec-filter__chip');

      const style = chip.attributes('style') ?? '';
      expect(style).toContain('background-color: transparent');
    });
  });
});
