<!--
  ModelsPage.vue - Store Data Editor Page

  What: Displays and allows editing of in-memory store data organized by schema
  How: Will fetch store data from models store and display in an editable JSON view
  Why: Allows developers to inspect and modify mock data during development
-->

<script setup lang="ts">
import { Database, RefreshCw } from 'lucide-vue-next';
import { ref } from 'vue';

// TODO: Will be replaced with data from models store
const selectedSchema = ref<string | null>('Pet');

// Placeholder schemas for UI development
const schemas = ref([
  { name: 'Pet', count: 5 },
  { name: 'Category', count: 3 },
  { name: 'Order', count: 2 },
  { name: 'User', count: 1 },
]);

// Placeholder data for selected schema
const schemaData = ref([
  { id: 1, name: 'Fluffy', category: { id: 1, name: 'Dogs' }, status: 'available' },
  { id: 2, name: 'Whiskers', category: { id: 2, name: 'Cats' }, status: 'pending' },
  { id: 3, name: 'Goldie', category: { id: 3, name: 'Fish' }, status: 'available' },
  { id: 4, name: 'Tweety', category: { id: 4, name: 'Birds' }, status: 'sold' },
  { id: 5, name: 'Hoppy', category: { id: 5, name: 'Rabbits' }, status: 'available' },
]);

/**
 * Select a schema to view its data
 */
function selectSchema(schemaName: string): void {
  selectedSchema.value = schemaName;
}

/**
 * Reseed the selected schema with fresh generated data
 */
function reseedSchema(): void {
  // TODO: Will trigger reseed via WebSocket command
  console.log('Reseeding schema:', selectedSchema.value);
}
</script>

<template>
  <div class="models-page">
    <!-- Schema Sidebar -->
    <aside class="models-sidebar">
      <div class="models-sidebar__header">
        <Database :size="18" />
        <span>Schemas</span>
      </div>
      <div class="models-sidebar__list">
        <button
          v-for="schema in schemas"
          :key="schema.name"
          :class="[
            'models-sidebar__item',
            { 'models-sidebar__item--active': selectedSchema === schema.name },
          ]"
          @click="selectSchema(schema.name)"
        >
          <span class="models-sidebar__name">{{ schema.name }}</span>
          <span class="models-sidebar__count">{{ schema.count }}</span>
        </button>
      </div>
    </aside>

    <!-- Data Panel -->
    <main class="models-content">
      <template v-if="selectedSchema">
        <!-- Toolbar -->
        <div class="models-toolbar">
          <div class="models-toolbar__title">
            <span class="font-mono">{{ selectedSchema }}</span>
            <span class="text-muted">({{ schemaData.length }} items)</span>
          </div>
          <div class="models-toolbar__actions">
            <button
              class="btn btn--secondary"
              title="Reseed with generated data"
              @click="reseedSchema"
            >
              <RefreshCw :size="16" />
              <span>Reseed</span>
            </button>
          </div>
        </div>

        <!-- Data List -->
        <div class="models-data">
          <div
            v-for="item in schemaData"
            :key="item.id"
            class="models-data__item card"
          >
            <pre class="models-data__json font-mono">{{ JSON.stringify(item, null, 2) }}</pre>
          </div>
        </div>
      </template>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <Database :size="48" class="empty-state__icon" />
        <h3 class="empty-state__title">Select a schema</h3>
        <p class="empty-state__description">
          Choose a schema from the sidebar to view and edit its data.
        </p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.models-page {
  display: grid;
  grid-template-columns: 240px 1fr;
  height: 100%;
  overflow: hidden;
}

/* Sidebar */
.models-sidebar {
  display: flex;
  flex-direction: column;
  background-color: var(--devtools-surface);
  border-right: 1px solid var(--devtools-border);
  overflow: hidden;
}

.models-sidebar__header {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-sm);
  padding: var(--devtools-space-md);
  font-weight: var(--font-weight-6);
  font-size: var(--font-size-1);
  border-bottom: 1px solid var(--devtools-border);
}

.models-sidebar__list {
  flex: 1;
  overflow-y: auto;
  padding: var(--devtools-space-xs);
}

.models-sidebar__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--devtools-space-sm) var(--devtools-space-md);
  background: none;
  border: none;
  border-radius: var(--devtools-radius-sm);
  color: var(--devtools-text);
  font-family: var(--devtools-font-sans);
  font-size: var(--font-size-1);
  cursor: pointer;
  transition: background-color var(--devtools-transition-fast);
}

.models-sidebar__item:hover {
  background-color: var(--devtools-surface-elevated);
}

.models-sidebar__item--active {
  background-color: color-mix(in srgb, var(--devtools-primary) 15%, transparent);
  color: var(--devtools-primary);
}

.models-sidebar__name {
  font-family: var(--devtools-font-mono);
}

.models-sidebar__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 20px;
  padding: 0 var(--devtools-space-xs);
  background-color: var(--devtools-surface-elevated);
  border-radius: var(--devtools-radius-sm);
  font-size: var(--font-size-0);
  color: var(--devtools-text-muted);
}

/* Content Area */
.models-content {
  display: flex;
  flex-direction: column;
  padding: var(--devtools-space-md);
  overflow: hidden;
}

/* Toolbar */
.models-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--devtools-space-md);
  margin-bottom: var(--devtools-space-md);
}

.models-toolbar__title {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-sm);
  font-size: var(--font-size-2);
  font-weight: var(--font-weight-6);
}

.models-toolbar__actions {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-sm);
}

/* Data Display */
.models-data {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--devtools-space-sm);
}

.models-data__item {
  padding: var(--devtools-space-sm);
}

.models-data__json {
  margin: 0;
  padding: var(--devtools-space-sm);
  background-color: var(--devtools-bg);
  border-radius: var(--devtools-radius-sm);
  font-size: var(--font-size-0);
  line-height: var(--font-lineheight-3);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
