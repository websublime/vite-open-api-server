<!--
  TimelinePage.vue - Request/Response Timeline Page

  What: Displays a real-time timeline of API requests and responses
  How: Subscribes to WebSocket events and displays request/response logs with filtering
  Why: Allows developers to monitor and debug API traffic in real-time
-->

<script setup lang="ts">
import { ChevronDown, ChevronUp, Clock, Filter, Search, Trash2, X } from 'lucide-vue-next';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import TimelineDetail from '@/components/TimelineDetail.vue';
import TimelineEntryComponent from '@/components/TimelineEntry.vue';
import { useWebSocket } from '@/composables/useWebSocket';
import {
  type HttpMethod,
  type RequestLogEntry,
  type ResponseLogEntry,
  type TimelineData,
  useTimelineStore,
} from '@/stores/timeline';

// Store and WebSocket
const timelineStore = useTimelineStore();
const { send, on, connected } = useWebSocket();

// Local UI state
const showFilters = ref(false);
const searchInputRef = ref<HTMLInputElement | null>(null);

// HTTP methods for filter
const httpMethods: HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
  'HEAD',
  'TRACE',
];

// Status categories for filter
const statusCategories = ['2xx', '3xx', '4xx', '5xx'] as const;

/**
 * Fetch timeline data when connected
 */
function fetchTimeline(): void {
  if (connected.value) {
    timelineStore.setLoading(true);
    send({ type: 'get:timeline' });
  }
}

/**
 * Handle timeline data from server
 */
function handleTimelineData(data: TimelineData): void {
  timelineStore.setTimelineData(data);
  timelineStore.setLoading(false);
}

/**
 * Handle incoming request event
 */
function handleRequest(data: RequestLogEntry): void {
  timelineStore.addRequest(data);
}

/**
 * Handle incoming response event
 */
function handleResponse(data: ResponseLogEntry): void {
  timelineStore.addResponse(data);
}

/**
 * Handle timeline cleared event
 */
function handleTimelineCleared(): void {
  timelineStore.clearTimeline();
}

/**
 * Clear timeline on server and locally
 */
function clearTimeline(): void {
  send({ type: 'clear:timeline' });
  timelineStore.clearTimeline();
}

/**
 * Handle entry selection
 */
function handleSelectEntry(id: string): void {
  timelineStore.selectEntry(id);
}

/**
 * Handle search input
 */
function handleSearchInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  timelineStore.setSearchQuery(target.value);
}

/**
 * Clear search
 */
function clearSearch(): void {
  timelineStore.setSearchQuery('');
  searchInputRef.value?.focus();
}

/**
 * Toggle method filter
 */
function toggleMethod(method: HttpMethod): void {
  timelineStore.toggleMethodFilter(method);
}

/**
 * Check if method is active in filter
 */
function isMethodActive(method: HttpMethod): boolean {
  return timelineStore.filter.methods.includes(method);
}

/**
 * Toggle status filter
 */
function toggleStatus(status: '1xx' | '2xx' | '3xx' | '4xx' | '5xx'): void {
  timelineStore.toggleStatusFilter(status);
}

/**
 * Check if status is active in filter
 */
function isStatusActive(status: '1xx' | '2xx' | '3xx' | '4xx' | '5xx'): boolean {
  return timelineStore.filter.statusCodes.includes(status);
}

/**
 * Toggle simulated filter
 */
function toggleSimulatedFilter(): void {
  const current = timelineStore.filter.simulatedOnly;
  timelineStore.setSimulatedFilter(current === true ? null : true);
}

/**
 * Clear all filters
 */
function clearAllFilters(): void {
  timelineStore.clearFilters();
}

/**
 * Toggle filter panel visibility
 */
function toggleFilters(): void {
  showFilters.value = !showFilters.value;
}

/**
 * Computed: Has active filters
 */
const hasActiveFilters = computed(() => timelineStore.hasActiveFilters());

/**
 * Computed: Filter badge count
 */
const filterBadgeCount = computed(() => {
  return (
    timelineStore.filter.methods.length +
    timelineStore.filter.statusCodes.length +
    (timelineStore.filter.simulatedOnly !== null ? 1 : 0)
  );
});

// Event cleanup functions for WebSocket subscriptions
let unsubTimeline: (() => void) | null = null;
let unsubRequest: (() => void) | null = null;
let unsubResponse: (() => void) | null = null;
let unsubCleared: (() => void) | null = null;

// Subscribe to timeline events and setup cleanup
onMounted(() => {
  // Subscribe to WebSocket events
  unsubTimeline = on<TimelineData>('timeline', handleTimelineData);
  unsubRequest = on<RequestLogEntry>('request', handleRequest);
  unsubResponse = on<ResponseLogEntry>('response', handleResponse);
  unsubCleared = on('timeline:cleared', handleTimelineCleared);

  // Fetch timeline when already connected
  if (connected.value) {
    fetchTimeline();
  }
});

// Cleanup event subscriptions on unmount
onUnmounted(() => {
  unsubTimeline?.();
  unsubRequest?.();
  unsubResponse?.();
  unsubCleared?.();
});

// Re-fetch when connection is established
watch(connected, (isConnected) => {
  if (isConnected) {
    fetchTimeline();
  }
});
</script>

<template>
  <div class="timeline-page">
    <!-- Toolbar -->
    <div class="timeline-toolbar">
      <!-- Search -->
      <div class="timeline-search">
        <Search :size="16" class="timeline-search__icon" />
        <input
          ref="searchInputRef"
          type="text"
          class="timeline-search__input input"
          placeholder="Search by path or operation..."
          :value="timelineStore.filter.searchQuery"
          @input="handleSearchInput"
        />
        <button
          v-if="timelineStore.filter.searchQuery"
          type="button"
          class="timeline-search__clear btn btn--ghost btn--icon"
          title="Clear search"
          @click="clearSearch"
        >
          <X :size="14" />
        </button>
      </div>

      <!-- Filter toggle -->
      <button
        type="button"
        :class="[
          'timeline-filter-toggle btn btn--secondary',
          { 'timeline-filter-toggle--active': hasActiveFilters }
        ]"
        :aria-expanded="showFilters"
        @click="toggleFilters"
      >
        <Filter :size="16" />
        <span>Filters</span>
        <span v-if="filterBadgeCount > 0" class="timeline-filter-toggle__badge">
          {{ filterBadgeCount }}
        </span>
        <component :is="showFilters ? ChevronUp : ChevronDown" :size="14" />
      </button>

      <!-- Stats -->
      <div class="timeline-stats">
        <span class="timeline-stats__item">
          {{ timelineStore.filteredEntries.length }} requests
        </span>
        <span v-if="timelineStore.averageDuration > 0" class="timeline-stats__separator">|</span>
        <span v-if="timelineStore.averageDuration > 0" class="timeline-stats__item">
          avg {{ timelineStore.averageDuration }}ms
        </span>
      </div>

      <!-- Clear button -->
      <button
        type="button"
        class="btn btn--secondary btn--icon"
        title="Clear timeline"
        :disabled="timelineStore.entries.length === 0"
        @click="clearTimeline"
      >
        <Trash2 :size="16" />
      </button>
    </div>

    <!-- Filter panel -->
    <div v-if="showFilters" class="timeline-filters">
      <!-- Method filters -->
      <div class="timeline-filters__section">
        <h4 class="timeline-filters__title">Methods</h4>
        <div class="timeline-filters__methods">
          <button
            v-for="method in httpMethods"
            :key="method"
            type="button"
            :class="[
              'method-badge',
              `method-badge--${method.toLowerCase()}`,
              { 'method-badge--inactive': !isMethodActive(method) && timelineStore.filter.methods.length > 0 }
            ]"
            @click="toggleMethod(method)"
          >
            {{ method }}
          </button>
        </div>
      </div>

      <!-- Status filters -->
      <div class="timeline-filters__section">
        <h4 class="timeline-filters__title">Status</h4>
        <div class="timeline-filters__status">
          <button
            v-for="status in statusCategories"
            :key="status"
            type="button"
            :class="[
              'timeline-filters__status-btn',
              `timeline-filters__status-btn--${status}`,
              { 'timeline-filters__status-btn--active': isStatusActive(status) }
            ]"
            @click="toggleStatus(status)"
          >
            {{ status }}
            <span class="timeline-filters__status-count">
              ({{ timelineStore.statusCounts[status] }})
            </span>
          </button>
        </div>
      </div>

      <!-- Simulated filter -->
      <div class="timeline-filters__section">
        <h4 class="timeline-filters__title">Type</h4>
        <div class="timeline-filters__type">
          <button
            type="button"
            :class="[
              'timeline-filters__status-btn',
              { 'timeline-filters__status-btn--active': timelineStore.filter.simulatedOnly }
            ]"
            @click="toggleSimulatedFilter"
          >
            Simulated only
          </button>
        </div>
      </div>

      <!-- Clear filters -->
      <div v-if="hasActiveFilters" class="timeline-filters__actions">
        <button
          type="button"
          class="btn btn--ghost"
          @click="clearAllFilters"
        >
          <X :size="14" />
          Clear all filters
        </button>
      </div>
    </div>

    <!-- Main content -->
    <div class="timeline-content">
      <!-- Loading state -->
      <div v-if="timelineStore.isLoading" class="timeline-loading">
        <div class="timeline-loading__spinner" />
        <span class="text-muted">Loading timeline...</span>
      </div>

      <!-- Error state -->
      <div v-else-if="timelineStore.error" class="timeline-error">
        <p class="timeline-error__message">{{ timelineStore.error }}</p>
        <button type="button" class="btn btn--primary" @click="fetchTimeline">
          Retry
        </button>
      </div>

      <!-- Empty state -->
      <div v-else-if="timelineStore.entries.length === 0" class="timeline-empty empty-state">
        <Clock :size="48" class="empty-state__icon" />
        <h3 class="empty-state__title">No requests yet</h3>
        <p class="empty-state__description">
          API requests will appear here in real-time as they are made.
        </p>
      </div>

      <!-- No results state -->
      <div v-else-if="timelineStore.filteredEntries.length === 0" class="timeline-empty empty-state">
        <Search :size="48" class="empty-state__icon" />
        <h3 class="empty-state__title">No matching requests</h3>
        <p class="empty-state__description">
          Try adjusting your search or filters.
        </p>
        <button
          v-if="hasActiveFilters"
          type="button"
          class="btn btn--secondary"
          @click="clearAllFilters"
        >
          Clear filters
        </button>
      </div>

      <!-- Split panel layout -->
      <template v-else>
        <!-- Timeline list panel -->
        <div class="timeline-list-panel">
          <div class="timeline-list">
            <TimelineEntryComponent
              v-for="entry in timelineStore.filteredEntries"
              :key="entry.id"
              :entry="entry"
              :is-selected="timelineStore.selectedEntryId === entry.id"
              @select="handleSelectEntry"
            />
          </div>
        </div>

        <!-- Timeline detail panel -->
        <div class="timeline-detail-panel">
          <TimelineDetail :entry="timelineStore.selectedEntry" />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.timeline-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Toolbar */
.timeline-toolbar {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-md);
  padding: var(--devtools-space-md);
  background-color: var(--devtools-surface);
  border-bottom: 1px solid var(--devtools-border);
}

.timeline-search {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.timeline-search__icon {
  position: absolute;
  left: var(--devtools-space-sm);
  top: 50%;
  transform: translateY(-50%);
  color: var(--devtools-text-muted);
  pointer-events: none;
}

.timeline-search__input {
  padding-left: calc(var(--devtools-space-sm) + 24px);
  padding-right: calc(var(--devtools-space-sm) + 24px);
}

.timeline-search__clear {
  position: absolute;
  right: var(--devtools-space-xs);
  top: 50%;
  transform: translateY(-50%);
  padding: var(--devtools-space-xs);
}

.timeline-filter-toggle {
  flex-shrink: 0;
}

.timeline-filter-toggle--active {
  background-color: color-mix(in srgb, var(--devtools-primary) 15%, transparent);
  border-color: var(--devtools-primary);
  color: var(--devtools-primary);
}

.timeline-filter-toggle__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 var(--devtools-space-xs);
  background-color: var(--devtools-primary);
  color: var(--devtools-text-inverted);
  border-radius: 9px;
  font-size: var(--font-size-0);
  font-weight: var(--font-weight-6);
}

.timeline-stats {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-sm);
  margin-left: auto;
  font-size: var(--font-size-0);
  color: var(--devtools-text-muted);
}

.timeline-stats__separator {
  opacity: 0.5;
}

/* Filter panel */
.timeline-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--devtools-space-lg);
  padding: var(--devtools-space-md);
  background-color: var(--devtools-surface-elevated);
  border-bottom: 1px solid var(--devtools-border);
}

.timeline-filters__section {
  display: flex;
  flex-direction: column;
  gap: var(--devtools-space-sm);
}

.timeline-filters__title {
  font-size: var(--font-size-0);
  font-weight: var(--font-weight-6);
  color: var(--devtools-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.timeline-filters__methods {
  display: flex;
  flex-wrap: wrap;
  gap: var(--devtools-space-xs);
}

.timeline-filters__methods .method-badge {
  cursor: pointer;
  transition: all var(--devtools-transition-fast);
}

.timeline-filters__methods .method-badge--inactive {
  opacity: 0.4;
}

.timeline-filters__status {
  display: flex;
  gap: var(--devtools-space-sm);
}

.timeline-filters__type {
  display: flex;
  gap: var(--devtools-space-sm);
}

.timeline-filters__status-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--devtools-space-xs);
  padding: var(--devtools-space-xs) var(--devtools-space-sm);
  background-color: var(--devtools-surface);
  border: 1px solid var(--devtools-border);
  border-radius: var(--devtools-radius-sm);
  font-family: var(--devtools-font-sans);
  font-size: var(--font-size-0);
  color: var(--devtools-text-muted);
  cursor: pointer;
  transition: all var(--devtools-transition-fast);
}

.timeline-filters__status-btn:hover {
  background-color: var(--devtools-surface-elevated);
  color: var(--devtools-text);
}

.timeline-filters__status-btn--active {
  background-color: color-mix(in srgb, var(--devtools-primary) 15%, transparent);
  border-color: var(--devtools-primary);
  color: var(--devtools-primary);
}

.timeline-filters__status-btn--2xx.timeline-filters__status-btn--active {
  background-color: color-mix(in srgb, var(--devtools-success) 15%, transparent);
  border-color: var(--devtools-success);
  color: var(--devtools-success);
}

.timeline-filters__status-btn--3xx.timeline-filters__status-btn--active {
  background-color: color-mix(in srgb, var(--devtools-info) 15%, transparent);
  border-color: var(--devtools-info);
  color: var(--devtools-info);
}

.timeline-filters__status-btn--4xx.timeline-filters__status-btn--active {
  background-color: color-mix(in srgb, var(--devtools-warning) 15%, transparent);
  border-color: var(--devtools-warning);
  color: var(--devtools-warning);
}

.timeline-filters__status-btn--5xx.timeline-filters__status-btn--active {
  background-color: color-mix(in srgb, var(--devtools-error) 15%, transparent);
  border-color: var(--devtools-error);
  color: var(--devtools-error);
}

.timeline-filters__status-count {
  font-size: var(--font-size-00);
  opacity: 0.7;
}

.timeline-filters__actions {
  display: flex;
  align-items: flex-end;
  margin-left: auto;
}

/* Main content */
.timeline-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Loading state */
.timeline-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  gap: var(--devtools-space-md);
}

.timeline-loading__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--devtools-border);
  border-top-color: var(--devtools-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Error state */
.timeline-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  gap: var(--devtools-space-md);
  padding: var(--devtools-space-xl);
}

.timeline-error__message {
  color: var(--devtools-error);
  margin: 0;
}

/* Empty state */
.timeline-empty {
  width: 100%;
}

/* Split panels */
.timeline-list-panel {
  width: 50%;
  min-width: 300px;
  max-width: 600px;
  border-right: 1px solid var(--devtools-border);
  background-color: var(--devtools-bg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.timeline-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--devtools-space-sm);
  display: flex;
  flex-direction: column;
  gap: var(--devtools-space-xs);
}

.timeline-detail-panel {
  flex: 1;
  overflow: hidden;
  background-color: var(--devtools-bg);
}
</style>
