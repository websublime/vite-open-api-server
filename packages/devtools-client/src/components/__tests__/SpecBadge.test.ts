/**
 * SpecBadge Component Tests
 *
 * What: Unit tests for the SpecBadge component
 * How: Mounts component with @vue/test-utils and Pinia, verifies dot rendering
 * Why: Ensures the spec badge renders correct colors and sizes
 *
 * @module components/__tests__/SpecBadge.test
 */

import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSpecsStore } from '../../stores/specs';
import SpecBadge from '../SpecBadge.vue';
import { createMockSpec } from './helpers/mockSpec';

describe('SpecBadge', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  function mountBadge(props: { specId: string; size?: 'small' | 'default' }) {
    return mount(SpecBadge, {
      props,
      global: {
        plugins: [pinia],
      },
    });
  }

  it('should render a dot with the correct spec color', () => {
    const store = useSpecsStore();
    store.setSpecs([createMockSpec({ id: 'petstore', color: '#4ade80' })]);

    const wrapper = mountBadge({ specId: 'petstore' });
    const dot = wrapper.find('.spec-badge__dot');

    expect(dot.exists()).toBe(true);
    expect(dot.attributes('style')).toContain('background-color: rgb(74, 222, 128)');
  });

  it('should render fallback color for unknown spec', () => {
    const wrapper = mountBadge({ specId: 'nonexistent' });
    const dot = wrapper.find('.spec-badge__dot');

    expect(dot.exists()).toBe(true);
    // #94a3b8 = rgb(148, 163, 184)
    expect(dot.attributes('style')).toContain('background-color: rgb(148, 163, 184)');
  });

  it('should render default size (8px)', () => {
    const store = useSpecsStore();
    store.setSpecs([createMockSpec({ id: 'petstore' })]);

    const wrapper = mountBadge({ specId: 'petstore' });
    const dot = wrapper.find('.spec-badge__dot');

    expect(dot.attributes('style')).toContain('width: 8px');
    expect(dot.attributes('style')).toContain('height: 8px');
  });

  it('should render small size (6px)', () => {
    const store = useSpecsStore();
    store.setSpecs([createMockSpec({ id: 'petstore' })]);

    const wrapper = mountBadge({ specId: 'petstore', size: 'small' });
    const dot = wrapper.find('.spec-badge__dot');

    expect(dot.attributes('style')).toContain('width: 6px');
    expect(dot.attributes('style')).toContain('height: 6px');
  });

  it('should have the spec-badge root class', () => {
    const wrapper = mountBadge({ specId: 'petstore' });

    expect(wrapper.find('.spec-badge').exists()).toBe(true);
  });
});
