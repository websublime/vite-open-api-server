<script setup lang="ts">
/**
 * SpecFilter Component
 *
 * What: Horizontal chip bar for filtering by OpenAPI spec
 * How: Reads specs from the Pinia store via useSpecs composable, renders toggle chips
 * Why: Enables users to focus on a single spec in multi-spec DevTools views
 *
 * @component SpecFilter
 */

import { computed } from 'vue';

import { useSpecs } from '../composables/useSpecs';

const { specs, toggleFilter, isActiveSpec, getSpecColor } = useSpecs();

/**
 * Build inline styles for a chip based on its active state
 */
function chipStyle(specId: string) {
  const color = getSpecColor(specId);
  const active = isActiveSpec(specId);

  if (active) {
    return {
      backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
      borderColor: color,
      color: color,
    };
  }

  return {
    backgroundColor: 'transparent',
    borderColor: 'var(--devtools-border)',
    color: 'var(--devtools-text-muted)',
  };
}

const hasSpecs = computed(() => specs.value.length > 0);
</script>

<template>
  <div v-if="hasSpecs" class="spec-filter">
    <span class="spec-filter__label">SPECS</span>
    <div class="spec-filter__chips">
      <button
        v-for="spec in specs"
        :key="spec.id"
        type="button"
        class="spec-filter__chip"
        :style="chipStyle(spec.id)"
        :aria-pressed="isActiveSpec(spec.id)"
        @click="toggleFilter(spec.id)"
      >
        <span
          class="spec-filter__dot"
          :style="{ backgroundColor: getSpecColor(spec.id) }"
        />
        {{ spec.id }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.spec-filter {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-sm, 8px);
}

.spec-filter__label {
  font-size: var(--font-size-0, 0.75rem);
  font-weight: 600;
  color: var(--devtools-text-muted);
  letter-spacing: 0.05em;
  user-select: none;
}

.spec-filter__chips {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-xs, 4px);
  flex-wrap: wrap;
}

.spec-filter__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--devtools-space-xs, 4px);
  padding: 2px 8px;
  border: 1px solid;
  border-radius: var(--radius-round, 9999px);
  font-size: var(--font-size-0, 0.75rem);
  font-family: inherit;
  line-height: 1.5;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s, color 0.15s;
  white-space: nowrap;
}

.spec-filter__chip:focus-visible {
  outline: 2px solid var(--devtools-primary);
  outline-offset: 1px;
}

.spec-filter__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
