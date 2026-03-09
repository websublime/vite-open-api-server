/**
 * Specs Store
 *
 * What: Pinia store for managing OpenAPI spec metadata
 * How: Stores spec info received via WebSocket, provides filtering by active spec
 * Why: Enables multi-spec awareness across the DevTools UI (colors, labels, filtering)
 *
 * @module stores/specs
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

/**
 * OpenAPI spec metadata
 *
 * Canonical source of truth: packages/core/src/websocket/protocol.ts (SpecInfo)
 * This interface is duplicated here to keep devtools-client decoupled from core.
 * If the core SpecInfo changes, this must be updated to match.
 */
export interface SpecInfo {
  /** Unique spec identifier */
  id: string;
  /** Human-readable title from the OpenAPI info object */
  title: string;
  /** Spec version from the OpenAPI info object */
  version: string;
  /** Proxy path prefix for this spec's endpoints */
  proxyPath: string;
  /** Assigned color for UI differentiation (hex) */
  color: string;
  /** Number of endpoints in this spec */
  endpointCount: number;
  /** Number of schemas in this spec */
  schemaCount: number;
}

/** Default fallback color when a spec has no assigned color (slate-400) */
const DEFAULT_SPEC_COLOR = '#94a3b8';

/**
 * Specs store for multi-spec metadata management
 *
 * Provides:
 * - Spec list storage and lookup
 * - Active spec filtering (null = show all)
 * - Color retrieval with fallback
 * - Computed helpers for spec IDs, map, and filter state
 */
export const useSpecsStore = defineStore('specs', () => {
  // ==========================================================================
  // State
  // ==========================================================================

  /** All registered specs from the server */
  const specs = ref<SpecInfo[]>([]);

  /** Currently active spec filter (null = all specs visible) */
  const activeSpecFilter = ref<string | null>(null);

  // ==========================================================================
  // Getters / Computed
  // ==========================================================================

  /**
   * Map of spec ID to SpecInfo for O(1) lookup
   */
  const specMap = computed(() => new Map(specs.value.map((s) => [s.id, s])));

  /**
   * Ordered list of spec IDs
   */
  const specIds = computed(() => specs.value.map((s) => s.id));

  /**
   * The currently filtered spec, or null if no filter is active
   */
  const activeSpec = computed(() =>
    activeSpecFilter.value ? (specMap.value.get(activeSpecFilter.value) ?? null) : null,
  );

  /**
   * Whether a spec filter is currently active
   */
  const isFiltered = computed(() => activeSpecFilter.value !== null);

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Replace the full specs list (typically from a WebSocket connected event)
   */
  function setSpecs(newSpecs: SpecInfo[]): void {
    specs.value = newSpecs;
  }

  /**
   * Set the active spec filter by ID, or null to show all
   */
  function setFilter(specId: string | null): void {
    activeSpecFilter.value = specId;
  }

  /**
   * Toggle the active spec filter: if the given spec is already active, clear;
   * otherwise set it as the active filter
   */
  function toggleFilter(specId: string): void {
    activeSpecFilter.value = activeSpecFilter.value === specId ? null : specId;
  }

  /**
   * Get the assigned color for a spec, with fallback to default slate color
   */
  function getColor(specId: string): string {
    return specMap.value.get(specId)?.color ?? DEFAULT_SPEC_COLOR;
  }

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    specs,
    activeSpecFilter,

    // Getters
    specMap,
    specIds,
    activeSpec,
    isFiltered,

    // Actions
    setSpecs,
    setFilter,
    toggleFilter,
    getColor,
  };
});
