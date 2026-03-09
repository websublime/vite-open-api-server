/**
 * useSpecs Composable
 *
 * What: Convenience wrapper around the specs Pinia store
 * How: Re-exports store state/computed and adds utility helpers for components
 * Why: Provides a clean API for components that need spec metadata (colors, labels, filter state)
 *
 * @module composables/useSpecs
 */

import { computed } from 'vue';

import { type SpecInfo, useSpecsStore } from '../stores/specs';

/**
 * useSpecs composable
 *
 * Provides spec metadata utilities for components including:
 * - Direct access to store state and computed
 * - Color lookup by spec ID
 * - Label formatting (title + version)
 * - Active spec checking
 *
 * @returns Spec metadata utilities
 */
export function useSpecs() {
  const store = useSpecsStore();

  /**
   * Get the assigned color for a spec ID, with fallback
   */
  function getSpecColor(specId: string): string {
    return store.getColor(specId);
  }

  /**
   * Format a spec label as "title (version)" for display
   * Returns the spec ID if the spec is not found
   */
  function specLabel(specId: string): string {
    const spec = store.specMap.get(specId);
    if (!spec) return specId;
    return `${spec.title} (${spec.version})`;
  }

  /**
   * Check whether a given spec is the currently active filter
   */
  function isActiveSpec(specId: string): boolean {
    return store.activeSpecFilter === specId;
  }

  return {
    // Store state (readonly via computed)
    /** All registered specs */
    specs: computed(() => store.specs),

    /** Currently active spec filter ID (null = all) */
    activeSpecFilter: computed(() => store.activeSpecFilter),

    // Store computed
    /** Map of spec ID to SpecInfo */
    specMap: computed(() => store.specMap),

    /** Ordered list of spec IDs */
    specIds: computed(() => store.specIds),

    /** The currently filtered spec, or null */
    activeSpec: computed(() => store.activeSpec),

    /** Whether a spec filter is currently active */
    isFiltered: computed(() => store.isFiltered),

    // Store actions
    /** Replace the full specs list */
    setSpecs: store.setSpecs,

    /** Set the active spec filter */
    setFilter: store.setFilter,

    /** Toggle the active spec filter */
    toggleFilter: store.toggleFilter,

    // Utility helpers
    /** Get the color for a spec ID */
    getSpecColor,

    /** Format spec label as "title (version)" */
    specLabel,

    /** Check if a spec is the active filter */
    isActiveSpec,
  };
}

export type { SpecInfo };
