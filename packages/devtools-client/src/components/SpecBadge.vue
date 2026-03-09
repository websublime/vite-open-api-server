<script setup lang="ts">
/**
 * SpecBadge Component
 *
 * What: Inline colored dot indicator for a spec
 * How: Uses useSpecs composable to get the spec color by ID
 * Why: Provides visual spec identification across the DevTools UI
 *
 * @component SpecBadge
 */

import { computed } from 'vue';

import { useSpecs } from '../composables/useSpecs';

const props = withDefaults(
  defineProps<{
    /** Spec identifier to display a badge for */
    specId: string;
    /** Size variant */
    size?: 'small' | 'default';
  }>(),
  {
    size: 'default',
  },
);

const { getSpecColor } = useSpecs();

const dotColor = computed(() => getSpecColor(props.specId));

const dotSize = computed(() => (props.size === 'small' ? '6px' : '8px'));
</script>

<template>
  <span class="spec-badge">
    <span
      class="spec-badge__dot"
      :style="{ backgroundColor: dotColor, width: dotSize, height: dotSize }"
    />
  </span>
</template>

<style scoped>
.spec-badge {
  display: inline-flex;
  align-items: center;
}

.spec-badge__dot {
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
