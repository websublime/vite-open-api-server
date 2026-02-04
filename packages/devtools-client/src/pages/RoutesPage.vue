<!--
  RoutesPage.vue - Endpoint Listing Page

  What: Displays a list of all available API endpoints from the OpenAPI spec
  How: Fetches endpoint data via WebSocket and displays in a searchable/filterable list
  Why: Allows developers to quickly browse and inspect available mock endpoints
-->

<script setup lang="ts">
import { ChevronDown, ChevronUp, Code, Filter, Route, Search, Sprout, X } from 'lucide-vue-next';
import { computed, onMounted, ref, watch } from 'vue';

import EndpointDetail from '@/components/EndpointDetail.vue';
import EndpointList from '@/components/EndpointList.vue';
import { useWebSocket } from '@/composables/useWebSocket';
import { type HttpMethod, type RegistryData, useRegistryStore } from '@/stores/registry';

// Store and WebSocket
const registryStore = useRegistryStore();
const { send, on, connected } = useWebSocket();

// Local UI state
const showFilters = ref(false);
const searchInputRef = ref<HTMLInputElement | null>(null);

// HTTP methods for filter
const httpMethods: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

/**
 * Fetch registry data when connected
 */
function fetchRegistry(): void {
  if (connected.value) {
    registryStore.setLoading(true);
    send({ type: 'get:registry' });
  }
}

/**
 * Handle registry data from server
 */
function handleRegistryData(data: RegistryData): void {
  registryStore.setRegistryData(data);
  registryStore.setLoading(false);
}

/**
 * Handle endpoint selection
 */
function handleSelectEndpoint(key: string): void {
  registryStore.selectEndpoint(key);
}

/**
 * Handle group toggle
 */
function handleToggleGroup(tag: string): void {
  registryStore.toggleGroup(tag);
}

/**
 * Handle search input
 */
function handleSearchInput(event: Event): void {
  const target = event.target as HTMLInputElement;
  registryStore.setSearchQuery(target.value);
}

/**
 * Clear search
 */
function clearSearch(): void {
  registryStore.setSearchQuery('');
  searchInputRef.value?.focus();
}

/**
 * Toggle method filter
 */
function toggleMethod(method: HttpMethod): void {
  registryStore.toggleMethodFilter(method);
}

/**
 * Check if method is active in filter
 */
function isMethodActive(method: HttpMethod): boolean {
  return registryStore.filter.methods.includes(method);
}

/**
 * Toggle handler filter
 */
function toggleHandlerFilter(): void {
  const current = registryStore.filter.hasHandler;
  registryStore.setHandlerFilter(current === true ? null : true);
}

/**
 * Toggle seed filter
 */
function toggleSeedFilter(): void {
  const current = registryStore.filter.hasSeed;
  registryStore.setSeedFilter(current === true ? null : true);
}

/**
 * Clear all filters
 */
function clearAllFilters(): void {
  registryStore.clearFilters();
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
const hasActiveFilters = computed(() => registryStore.hasActiveFilters());

// Subscribe to registry events
onMounted(() => {
  on<RegistryData>('registry', handleRegistryData);

  // Fetch registry when already connected or when connection established
  if (connected.value) {
    fetchRegistry();
  }
});

// Re-fetch when connection is established
watch(connected, (isConnected) => {
  if (isConnected) {
    fetchRegistry();
  }
});

// Also listen for handler/seed updates to refresh registry
onMounted(() => {
  on('handlers:updated', () => fetchRegistry());
  on('seeds:updated', () => fetchRegistry());
});
</script>

<template>
  <div class="routes-page">
    <!-- Toolbar -->
    <div class="routes-toolbar">
      <!-- Search -->
      <div class="routes-search">
        <Search :size="16" class="routes-search__icon" />
        <input
          ref="searchInputRef"
          type="text"
          class="routes-search__input input"
          placeholder="Search endpoints..."
          :value="registryStore.searchQuery"
          @input="handleSearchInput"
        />
        <button
          v-if="registryStore.searchQuery"
          type="button"
          class="routes-search__clear btn btn--ghost btn--icon"
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
          'routes-filter-toggle btn btn--secondary',
          { 'routes-filter-toggle--active': hasActiveFilters }
        ]"
        :aria-expanded="showFilters"
        @click="toggleFilters"
      >
        <Filter :size="16" />
        <span>Filters</span>
        <span v-if="hasActiveFilters" class="routes-filter-toggle__badge">
          {{ registryStore.filter.methods.length +
            (registryStore.filter.hasHandler ? 1 : 0) +
            (registryStore.filter.hasSeed ? 1 : 0) }}
        </span>
        <component :is="showFilters ? ChevronUp : ChevronDown" :size="14" />
      </button>

      <!-- Stats -->
      <div class="routes-stats">
        <span class="routes-stats__item">
          {{ registryStore.filteredEndpoints.length }} endpoints
        </span>
        <span class="routes-stats__separator">|</span>
        <span class="routes-stats__item">
          {{ registryStore.allTags.length }} tags
        </span>
      </div>
    </div>

    <!-- Filter panel -->
    <div v-if="showFilters" class="routes-filters">
      <!-- Method filters -->
      <div class="routes-filters__section">
        <h4 class="routes-filters__title">Methods</h4>
        <div class="routes-filters__methods">
          <button
            v-for="method in httpMethods"
            :key="method"
            type="button"
            :class="[
              'method-badge',
              `method-badge--${method}`,
              { 'method-badge--inactive': !isMethodActive(method) && registryStore.filter.methods.length > 0 }
            ]"
            @click="toggleMethod(method)"
          >
            {{ method.toUpperCase() }}
          </button>
        </div>
      </div>

      <!-- Status filters -->
      <div class="routes-filters__section">
        <h4 class="routes-filters__title">Status</h4>
        <div class="routes-filters__status">
          <button
            type="button"
            :class="[
              'routes-filters__status-btn',
              { 'routes-filters__status-btn--active': registryStore.filter.hasHandler }
            ]"
            @click="toggleHandlerFilter"
          >
            <Code :size="14" />
            <span>Has Handler</span>
          </button>
          <button
            type="button"
            :class="[
              'routes-filters__status-btn',
              { 'routes-filters__status-btn--active': registryStore.filter.hasSeed }
            ]"
            @click="toggleSeedFilter"
          >
            <Sprout :size="14" />
            <span>Has Seed</span>
          </button>
        </div>
      </div>

      <!-- Clear filters -->
      <div v-if="hasActiveFilters" class="routes-filters__actions">
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

    <!-- Main content: split panel -->
    <div class="routes-content">
      <!-- Loading state -->
      <div v-if="registryStore.isLoading" class="routes-loading">
        <div class="routes-loading__spinner" />
        <span class="text-muted">Loading endpoints...</span>
      </div>

      <!-- Error state -->
      <div v-else-if="registryStore.error" class="routes-error">
        <p class="routes-error__message">{{ registryStore.error }}</p>
        <button type="button" class="btn btn--primary" @click="fetchRegistry">
          Retry
        </button>
      </div>

      <!-- Empty state -->
      <div v-else-if="registryStore.endpoints.length === 0" class="routes-empty empty-state">
        <Route :size="48" class="empty-state__icon" />
        <h3 class="empty-state__title">No endpoints found</h3>
        <p class="empty-state__description">
          No API endpoints are available. Make sure your OpenAPI spec is loaded.
        </p>
      </div>

      <!-- No results state -->
      <div v-else-if="registryStore.filteredEndpoints.length === 0" class="routes-empty empty-state">
        <Search :size="48" class="empty-state__icon" />
        <h3 class="empty-state__title">No matching endpoints</h3>
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
        <!-- Endpoint list panel -->
        <div class="routes-list-panel">
          <EndpointList
            :groups="registryStore.groupedEndpoints"
            :selected-key="registryStore.selectedEndpointKey"
            @select="handleSelectEndpoint"
            @toggle-group="handleToggleGroup"
          />
        </div>

        <!-- Endpoint detail panel -->
        <div class="routes-detail-panel">
          <EndpointDetail :endpoint="registryStore.selectedEndpoint" />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.routes-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Toolbar */
.routes-toolbar {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-md);
  padding: var(--devtools-space-md);
  background-color: var(--devtools-surface);
  border-bottom: 1px solid var(--devtools-border);
}

.routes-search {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.routes-search__icon {
  position: absolute;
  left: var(--devtools-space-sm);
  top: 50%;
  transform: translateY(-50%);
  color: var(--devtools-text-muted);
  pointer-events: none;
}

.routes-search__input {
  padding-left: calc(var(--devtools-space-sm) + 24px);
  padding-right: calc(var(--devtools-space-sm) + 24px);
}

.routes-search__clear {
  position: absolute;
  right: var(--devtools-space-xs);
  top: 50%;
  transform: translateY(-50%);
  padding: var(--devtools-space-xs);
}

.routes-filter-toggle {
  flex-shrink: 0;
}

.routes-filter-toggle--active {
  background-color: color-mix(in srgb, var(--devtools-primary) 15%, transparent);
  border-color: var(--devtools-primary);
  color: var(--devtools-primary);
}

.routes-filter-toggle__badge {
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

.routes-stats {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-sm);
  margin-left: auto;
  font-size: var(--font-size-0);
  color: var(--devtools-text-muted);
}

.routes-stats__separator {
  opacity: 0.5;
}

/* Filter panel */
.routes-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--devtools-space-lg);
  padding: var(--devtools-space-md);
  background-color: var(--devtools-surface-elevated);
  border-bottom: 1px solid var(--devtools-border);
}

.routes-filters__section {
  display: flex;
  flex-direction: column;
  gap: var(--devtools-space-sm);
}

.routes-filters__title {
  font-size: var(--font-size-0);
  font-weight: var(--font-weight-6);
  color: var(--devtools-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.routes-filters__methods {
  display: flex;
  flex-wrap: wrap;
  gap: var(--devtools-space-xs);
}

.routes-filters__methods .method-badge {
  cursor: pointer;
  transition: all var(--devtools-transition-fast);
}

.routes-filters__methods .method-badge--inactive {
  opacity: 0.4;
}

.routes-filters__status {
  display: flex;
  gap: var(--devtools-space-sm);
}

.routes-filters__status-btn {
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

.routes-filters__status-btn:hover {
  background-color: var(--devtools-surface-elevated);
  color: var(--devtools-text);
}

.routes-filters__status-btn--active {
  background-color: color-mix(in srgb, var(--devtools-primary) 15%, transparent);
  border-color: var(--devtools-primary);
  color: var(--devtools-primary);
}

.routes-filters__actions {
  display: flex;
  align-items: flex-end;
  margin-left: auto;
}

/* Main content */
.routes-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Loading state */
.routes-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  gap: var(--devtools-space-md);
}

.routes-loading__spinner {
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
.routes-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  gap: var(--devtools-space-md);
  padding: var(--devtools-space-xl);
}

.routes-error__message {
  color: var(--devtools-error);
  margin: 0;
}

/* Empty state */
.routes-empty {
  width: 100%;
}

/* Split panels */
.routes-list-panel {
  width: var(--devtools-sidebar-width);
  min-width: 200px;
  max-width: 400px;
  border-right: 1px solid var(--devtools-border);
  background-color: var(--devtools-surface);
  overflow: hidden;
}

.routes-detail-panel {
  flex: 1;
  overflow: hidden;
  background-color: var(--devtools-bg);
}
</style>
