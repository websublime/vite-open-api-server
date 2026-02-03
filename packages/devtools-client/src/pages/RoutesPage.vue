<!--
  RoutesPage.vue - Endpoint Listing Page

  What: Displays a list of all available API endpoints from the OpenAPI spec
  How: Will fetch endpoint data from registry store and display in a searchable/filterable list
  Why: Allows developers to quickly browse and inspect available mock endpoints
-->

<script setup lang="ts">
import { Route, Search } from 'lucide-vue-next';
import { ref } from 'vue';

// TODO: Will be replaced with data from registry store
const searchQuery = ref('');

// Placeholder endpoints for UI development
const endpoints = ref([
  { method: 'GET', path: '/pets', operationId: 'listPets', hasHandler: true },
  { method: 'POST', path: '/pets', operationId: 'createPet', hasHandler: false },
  { method: 'GET', path: '/pets/{petId}', operationId: 'getPetById', hasHandler: true },
  { method: 'PUT', path: '/pets/{petId}', operationId: 'updatePet', hasHandler: false },
  { method: 'DELETE', path: '/pets/{petId}', operationId: 'deletePet', hasHandler: false },
]);
</script>

<template>
  <div class="routes-page">
    <!-- Search and Filter Bar -->
    <div class="routes-toolbar">
      <div class="routes-search">
        <Search :size="16" class="routes-search__icon" />
        <input
          v-model="searchQuery"
          type="text"
          class="routes-search__input input"
          placeholder="Search endpoints..."
        />
      </div>
      <div class="routes-stats">
        <span class="text-muted">{{ endpoints.length }} endpoints</span>
      </div>
    </div>

    <!-- Endpoint List -->
    <div class="routes-list">
      <div
        v-for="endpoint in endpoints"
        :key="`${endpoint.method}-${endpoint.path}`"
        class="routes-item card"
      >
        <div class="routes-item__method">
          <span :class="['method-badge', `method-badge--${endpoint.method.toLowerCase()}`]">
            {{ endpoint.method }}
          </span>
        </div>
        <div class="routes-item__path font-mono">
          {{ endpoint.path }}
        </div>
        <div class="routes-item__operation text-muted">
          {{ endpoint.operationId }}
        </div>
        <div class="routes-item__status">
          <span
            v-if="endpoint.hasHandler"
            class="routes-item__badge routes-item__badge--handler"
          >
            Handler
          </span>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="endpoints.length === 0" class="empty-state">
        <Route :size="48" class="empty-state__icon" />
        <h3 class="empty-state__title">No endpoints found</h3>
        <p class="empty-state__description">
          No API endpoints are available. Make sure your OpenAPI spec is loaded.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.routes-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--devtools-space-md);
  overflow: hidden;
}

/* Toolbar */
.routes-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--devtools-space-md);
  margin-bottom: var(--devtools-space-md);
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
  padding-left: calc(var(--devtools-space-sm) + 20px);
}

.routes-stats {
  font-size: var(--font-size-0);
}

/* Endpoint List */
.routes-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--devtools-space-xs);
}

/* Endpoint Item */
.routes-item {
  display: grid;
  grid-template-columns: 80px 1fr auto auto;
  align-items: center;
  gap: var(--devtools-space-md);
  padding: var(--devtools-space-sm) var(--devtools-space-md);
  cursor: pointer;
  transition: background-color var(--devtools-transition-fast);
}

.routes-item:hover {
  background-color: var(--devtools-surface-elevated);
}

.routes-item__path {
  font-size: var(--font-size-1);
  color: var(--devtools-text);
}

.routes-item__operation {
  font-size: var(--font-size-0);
}

.routes-item__badge {
  display: inline-flex;
  align-items: center;
  padding: var(--devtools-space-xs) var(--devtools-space-sm);
  border-radius: var(--devtools-radius-sm);
  font-size: var(--font-size-0);
  font-weight: var(--font-weight-5);
}

.routes-item__badge--handler {
  background-color: color-mix(in srgb, var(--devtools-success) 15%, transparent);
  color: var(--devtools-success);
}
</style>
