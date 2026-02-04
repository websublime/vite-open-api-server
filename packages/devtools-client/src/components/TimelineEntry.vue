<!--
  TimelineEntry.vue - Timeline Entry Component

  What: Displays a single request/response entry in the timeline
  How: Shows method, path, status, duration with color-coded badges
  Why: Provides consistent visualization of API traffic in the timeline list
-->

<script setup lang="ts">
import { AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-vue-next';
import { computed } from 'vue';

import type { TimelineEntry } from '@/stores/timeline';

import { getMethodLabel } from '@/utils/format';

/**
 * Component props
 */
interface Props {
  /** The timeline entry to display */
  entry: TimelineEntry;
  /** Whether this entry is currently selected */
  isSelected?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false,
});

/**
 * Component events
 */
const emit = defineEmits<{
  /** Emitted when the entry is clicked */
  (e: 'select', id: string): void;
}>();

/**
 * Format timestamp for display
 */
const formattedTime = computed(() => {
  const date = new Date(props.entry.request.timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
});

/**
 * Format duration for display
 */
const formattedDuration = computed(() => {
  if (props.entry.duration === null) {
    return 'pending...';
  }
  if (props.entry.duration < 1000) {
    return `${props.entry.duration}ms`;
  }
  return `${(props.entry.duration / 1000).toFixed(2)}s`;
});

/**
 * Get status badge class based on status code
 */
const statusClass = computed(() => {
  if (props.entry.status === null) return 'status-badge--pending';
  if (props.entry.status < 200) return 'status-badge--1xx';
  if (props.entry.status < 300) return 'status-badge--2xx';
  if (props.entry.status < 400) return 'status-badge--3xx';
  if (props.entry.status < 500) return 'status-badge--4xx';
  return 'status-badge--5xx';
});

/**
 * Status icon component based on status code
 */
const statusIcon = computed(() => {
  if (props.entry.status === null) return Clock;
  if (props.entry.status < 400) return CheckCircle;
  return AlertTriangle;
});

/**
 * Whether the response is pending
 */
const isPending = computed(() => props.entry.response === null);

/**
 * Handle entry click
 */
function handleClick(): void {
  emit('select', props.entry.id);
}
</script>

<template>
  <button
    type="button"
    :class="[
      'timeline-entry',
      { 'timeline-entry--selected': isSelected },
      { 'timeline-entry--pending': isPending },
      { 'timeline-entry--simulated': entry.simulated }
    ]"
    @click="handleClick"
  >
    <!-- Timestamp -->
    <div class="timeline-entry__time font-mono text-muted">
      {{ formattedTime }}
    </div>

    <!-- Method badge -->
    <div class="timeline-entry__method">
      <span :class="['method-badge', `method-badge--${entry.request.method.toLowerCase()}`]">
        {{ getMethodLabel(entry.request.method) }}
      </span>
    </div>

    <!-- Path -->
    <div class="timeline-entry__path font-mono">
      {{ entry.request.path }}
    </div>

    <!-- Status badge -->
    <div class="timeline-entry__status">
      <span v-if="entry.status !== null" :class="['status-badge', statusClass]">
        <component :is="statusIcon" :size="12" />
        {{ entry.status }}
      </span>
      <span v-else class="status-badge status-badge--pending">
        <Clock :size="12" />
        pending
      </span>
    </div>

    <!-- Duration -->
    <div class="timeline-entry__duration font-mono text-muted">
      {{ formattedDuration }}
    </div>

    <!-- Simulated indicator -->
    <div v-if="entry.simulated" class="timeline-entry__simulated" title="Simulated response">
      <Zap :size="14" />
    </div>
  </button>
</template>

<style scoped>
.timeline-entry {
  display: grid;
  grid-template-columns: 100px 80px 1fr auto 80px auto;
  align-items: center;
  gap: var(--devtools-space-md);
  width: 100%;
  padding: var(--devtools-space-sm) var(--devtools-space-md);
  background: var(--devtools-surface);
  border: 1px solid var(--devtools-border);
  border-radius: var(--devtools-radius-sm);
  font-family: var(--devtools-font-sans);
  text-align: left;
  cursor: pointer;
  transition: all var(--devtools-transition-fast);
}

.timeline-entry:hover {
  background-color: var(--devtools-surface-elevated);
  border-color: var(--devtools-border-hover);
}

.timeline-entry:focus {
  outline: none;
}

.timeline-entry:focus-visible {
  outline: 2px solid var(--devtools-primary);
  outline-offset: -2px;
}

.timeline-entry--selected {
  background-color: color-mix(in srgb, var(--devtools-primary) 10%, transparent);
  border-color: var(--devtools-primary);
}

.timeline-entry--selected:hover {
  background-color: color-mix(in srgb, var(--devtools-primary) 15%, transparent);
}

.timeline-entry--pending {
  opacity: 0.7;
}

.timeline-entry--simulated {
  border-left: 3px solid var(--devtools-warning);
}

/* Time column */
.timeline-entry__time {
  font-size: var(--font-size-0);
}

/* Path column */
.timeline-entry__path {
  font-size: var(--font-size-1);
  color: var(--devtools-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Status column */
.timeline-entry__status {
  display: flex;
  align-items: center;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--devtools-space-xs);
  padding: 2px var(--devtools-space-sm);
  border-radius: var(--devtools-radius-sm);
  font-size: var(--font-size-0);
  font-weight: var(--font-weight-5);
  font-family: var(--devtools-font-mono);
}

.status-badge--pending {
  background-color: color-mix(in srgb, var(--devtools-text-muted) 15%, transparent);
  color: var(--devtools-text-muted);
}

.status-badge--1xx {
  background-color: color-mix(in srgb, var(--devtools-info) 15%, transparent);
  color: var(--devtools-info);
}

.status-badge--2xx {
  background-color: color-mix(in srgb, var(--devtools-success) 15%, transparent);
  color: var(--devtools-success);
}

.status-badge--3xx {
  background-color: color-mix(in srgb, var(--devtools-info) 15%, transparent);
  color: var(--devtools-info);
}

.status-badge--4xx {
  background-color: color-mix(in srgb, var(--devtools-warning) 15%, transparent);
  color: var(--devtools-warning);
}

.status-badge--5xx {
  background-color: color-mix(in srgb, var(--devtools-error) 15%, transparent);
  color: var(--devtools-error);
}

/* Duration column */
.timeline-entry__duration {
  font-size: var(--font-size-0);
  text-align: right;
}

/* Simulated indicator */
.timeline-entry__simulated {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--devtools-warning);
}
</style>
