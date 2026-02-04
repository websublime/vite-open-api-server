<!--
  EndpointList.vue - Grouped Endpoint Listing Component

  What: Displays a list of API endpoints grouped by tags with collapsible sections
  How: Renders endpoint groups from registry store with method badges and selection support
  Why: Provides organized navigation through available mock endpoints
-->

<script setup lang="ts">
import { ChevronDown, ChevronRight, Code, Sprout } from 'lucide-vue-next';

import type { EndpointEntry, EndpointGroup } from '@/stores/registry';

/**
 * Component props
 */
interface Props {
  /** Grouped endpoints to display */
  groups: EndpointGroup[];
  /** Currently selected endpoint key */
  selectedKey: string | null;
}

const props = defineProps<Props>();

/**
 * Component events
 */
const emit = defineEmits<{
  /** Emitted when an endpoint is selected */
  (e: 'select', key: string): void;
  /** Emitted when a group is toggled */
  (e: 'toggle-group', tag: string): void;
}>();

/**
 * Get display label for HTTP method
 */
function getMethodLabel(method: string): string {
  return method.toUpperCase();
}

/**
 * Handle endpoint click
 */
function handleEndpointClick(endpoint: EndpointEntry): void {
  emit('select', endpoint.key);
}

/**
 * Handle group toggle
 */
function handleGroupToggle(tag: string): void {
  emit('toggle-group', tag);
}

/**
 * Check if endpoint is selected
 */
function isSelected(endpoint: EndpointEntry): boolean {
  return props.selectedKey === endpoint.key;
}
</script>

<template>
  <div class="endpoint-list">
    <!-- Empty state -->
    <div v-if="groups.length === 0" class="endpoint-list__empty">
      <p class="text-muted">No endpoints found</p>
    </div>

    <!-- Endpoint groups -->
    <div v-else class="endpoint-list__groups">
      <div
        v-for="group in groups"
        :key="group.tag"
        class="endpoint-group"
      >
        <!-- Group header -->
        <button
          type="button"
          class="endpoint-group__header"
          :aria-expanded="group.isExpanded"
          :aria-controls="`group-${group.tag}`"
          @click="handleGroupToggle(group.tag)"
        >
          <component
            :is="group.isExpanded ? ChevronDown : ChevronRight"
            :size="16"
            class="endpoint-group__chevron"
          />
          <span class="endpoint-group__tag">{{ group.tag }}</span>
          <span class="endpoint-group__count text-muted">
            ({{ group.endpoints.length }})
          </span>
        </button>

        <!-- Group endpoints -->
        <div
          v-show="group.isExpanded"
          :id="`group-${group.tag}`"
          class="endpoint-group__items"
          role="group"
          :aria-label="`${group.tag} endpoints`"
        >
          <button
            v-for="endpoint in group.endpoints"
            :key="endpoint.key"
            type="button"
            :class="[
              'endpoint-item',
              { 'endpoint-item--selected': isSelected(endpoint) }
            ]"
            :aria-selected="isSelected(endpoint)"
            @click="handleEndpointClick(endpoint)"
          >
            <!-- Method badge -->
            <span
              :class="[
                'method-badge',
                `method-badge--${endpoint.method}`
              ]"
            >
              {{ getMethodLabel(endpoint.method) }}
            </span>

            <!-- Path -->
            <span class="endpoint-item__path font-mono">
              {{ endpoint.path }}
            </span>

            <!-- Status indicators -->
            <div class="endpoint-item__indicators">
              <span
                v-if="endpoint.hasHandler"
                class="endpoint-item__indicator endpoint-item__indicator--handler"
                title="Has custom handler"
              >
                <Code :size="12" />
              </span>
              <span
                v-if="endpoint.hasSeed"
                class="endpoint-item__indicator endpoint-item__indicator--seed"
                title="Has seed data"
              >
                <Sprout :size="12" />
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.endpoint-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.endpoint-list__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--devtools-space-lg);
}

.endpoint-list__groups {
  flex: 1;
  overflow-y: auto;
  padding: var(--devtools-space-xs);
}

/* Group styles */
.endpoint-group {
  margin-bottom: var(--devtools-space-xs);
}

.endpoint-group__header {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-xs);
  width: 100%;
  padding: var(--devtools-space-sm) var(--devtools-space-sm);
  background: none;
  border: none;
  border-radius: var(--devtools-radius-sm);
  font-family: var(--devtools-font-sans);
  font-size: var(--font-size-1);
  font-weight: var(--font-weight-5);
  color: var(--devtools-text);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--devtools-transition-fast);
}

.endpoint-group__header:hover {
  background-color: var(--devtools-surface-elevated);
}

.endpoint-group__header:focus {
  outline: none;
}

.endpoint-group__header:focus-visible {
  outline: 2px solid var(--devtools-primary);
  outline-offset: -2px;
}

.endpoint-group__chevron {
  flex-shrink: 0;
  color: var(--devtools-text-muted);
}

.endpoint-group__tag {
  flex: 1;
  text-transform: capitalize;
}

.endpoint-group__count {
  font-size: var(--font-size-0);
  font-weight: var(--font-weight-4);
}

.endpoint-group__items {
  padding-left: var(--devtools-space-md);
}

/* Endpoint item styles */
.endpoint-item {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-sm);
  width: 100%;
  padding: var(--devtools-space-xs) var(--devtools-space-sm);
  background: none;
  border: none;
  border-radius: var(--devtools-radius-sm);
  font-family: var(--devtools-font-sans);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--devtools-transition-fast);
}

.endpoint-item:hover {
  background-color: var(--devtools-surface-elevated);
}

.endpoint-item:focus {
  outline: none;
}

.endpoint-item:focus-visible {
  outline: 2px solid var(--devtools-primary);
  outline-offset: -2px;
}

.endpoint-item--selected {
  background-color: color-mix(in srgb, var(--devtools-primary) 15%, transparent);
}

.endpoint-item--selected:hover {
  background-color: color-mix(in srgb, var(--devtools-primary) 20%, transparent);
}

.endpoint-item__path {
  flex: 1;
  font-size: var(--font-size-0);
  color: var(--devtools-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.endpoint-item__indicators {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-xs);
}

.endpoint-item__indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: var(--devtools-radius-sm);
}

.endpoint-item__indicator--handler {
  background-color: color-mix(in srgb, var(--devtools-info) 15%, transparent);
  color: var(--devtools-info);
}

.endpoint-item__indicator--seed {
  background-color: color-mix(in srgb, var(--devtools-success) 15%, transparent);
  color: var(--devtools-success);
}
</style>
