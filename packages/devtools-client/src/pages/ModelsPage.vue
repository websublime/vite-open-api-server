<!--
  ModelsPage.vue - Store Data Editor Page

  What: Displays and allows editing of in-memory store data organized by schema
  How: Fetches store data from models store and displays in an editable JSON view
  Why: Allows developers to inspect and modify mock data during development

  Features:
  - Schema listing sidebar with item counts
  - JSON editor with syntax validation
  - Save, discard, clear, and reseed actions
  - Real-time updates via WebSocket
  - Dirty state tracking
-->
<script setup lang="ts">
import { Database, RefreshCw, Save, Trash2, X } from 'lucide-vue-next';
import { nextTick, onMounted, ref, watch } from 'vue';
// biome-ignore lint/style/useImportType: Component needs to be available at runtime
import JsonEditor from '@/components/JsonEditor.vue';
import { useNotifications } from '@/composables/useNotifications';
import { useWebSocket } from '@/composables/useWebSocket';
import { useModelsStore } from '@/stores';

// ==========================================================================
// Store & Composables
// ==========================================================================

const modelsStore = useModelsStore();
const { send, on, connected } = useWebSocket();
const { success, error: notifyError, confirm } = useNotifications();

// ==========================================================================
// State
// ==========================================================================

/** Reference to the JSON editor component */
const jsonEditorRef = ref<InstanceType<typeof JsonEditor> | null>(null);

/** Confirmation dialog state */
const showClearConfirm = ref(false);

// ==========================================================================
// Lifecycle
// ==========================================================================

onMounted(async () => {
  // Load schemas on mount
  try {
    await modelsStore.fetchSchemas();

    // Select first schema if available
    if (modelsStore.schemas.length > 0 && !modelsStore.selectedSchema) {
      await modelsStore.selectSchemaByName(modelsStore.schemas[0].name);
    }
  } catch (err) {
    // Error is already set in the store, but ensure it's visible
    if (!modelsStore.error) {
      modelsStore.error = err instanceof Error ? err.message : 'Failed to load schemas';
    }
  }
});

// ==========================================================================
// WebSocket Event Handlers
// ==========================================================================

// Handle store updates from WebSocket
on('store:updated', (data) => {
  // Validate payload structure
  const payload = data as any;
  if (
    typeof data !== 'object' ||
    data === null ||
    typeof payload.schema !== 'string' ||
    typeof payload.action !== 'string' ||
    typeof payload.count !== 'number'
  ) {
    console.warn('[ModelsPage] Invalid store:updated payload:', data);
    return;
  }

  modelsStore.handleStoreUpdate(data as { schema: string; action: string; count: number });
});

// Handle reseed completion
on('reseeded', (data) => {
  // Validate payload structure
  const payload = data as any;
  if (
    typeof data !== 'object' ||
    data === null ||
    typeof payload.success !== 'boolean' ||
    !Array.isArray(payload.schemas)
  ) {
    console.warn('[ModelsPage] Invalid reseeded payload:', data);
    return;
  }

  modelsStore.handleReseedComplete(data as { success: boolean; schemas: string[] });
});

// ==========================================================================
// Watchers
// ==========================================================================

// Format JSON when schema changes
watch(
  () => modelsStore.selectedSchema,
  async () => {
    if (jsonEditorRef.value && modelsStore.currentItems.length > 0) {
      // Wait for next tick to ensure editor is updated
      await nextTick();
      jsonEditorRef.value?.formatJson();
    }
  },
);

// ==========================================================================
// Actions
// ==========================================================================

/**
 * Select a schema and fetch its data
 */
async function selectSchema(schemaName: string): Promise<void> {
  if (modelsStore.isDirty) {
    const confirmed = await confirm(
      'You have unsaved changes. Are you sure you want to switch schemas?',
      {
        title: 'Unsaved Changes',
        confirmText: 'Switch Schema',
        cancelText: 'Cancel',
      },
    );
    if (!confirmed) return;
  }

  await modelsStore.selectSchemaByName(schemaName);
}

/**
 * Save the current items to the server
 */
async function saveItems(): Promise<void> {
  if (!jsonEditorRef.value?.isValid) {
    notifyError('Cannot save invalid JSON. Please fix the errors first.');
    return;
  }

  const saved = await modelsStore.saveItems();
  if (saved) {
    success('Items saved successfully');
  } else {
    // Show error to user if save failed
    const errorMessage = modelsStore.error || 'Failed to save items';
    notifyError(errorMessage);
  }
}

/**
 * Discard changes and revert to original
 */
async function discardChanges(): Promise<void> {
  if (!modelsStore.isDirty) return;

  const confirmed = await confirm('Discard all changes and revert to saved data?', {
    title: 'Discard Changes',
    confirmText: 'Discard',
    cancelText: 'Cancel',
  });
  if (confirmed) {
    modelsStore.discardChanges();
    success('Changes discarded');
  }
}

/**
 * Clear all items for the current schema
 */
async function clearSchema(): Promise<void> {
  showClearConfirm.value = false;

  try {
    const cleared = await modelsStore.clearSchema();
    if (cleared) {
      success('Schema cleared successfully');
    } else {
      // Show error to user if clear failed
      const errorMessage = modelsStore.error || 'Failed to clear schema';
      notifyError(errorMessage);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to clear schema';
    notifyError(errorMessage);
  }
}

/**
 * Trigger reseed via WebSocket
 */
async function reseedAll(): Promise<void> {
  if (!connected.value) {
    notifyError('WebSocket not connected. Cannot trigger reseed.');
    return;
  }

  const confirmed = await confirm(
    'This will regenerate all seed data and replace existing items. Continue?',
    {
      title: 'Reseed All Schemas',
      confirmText: 'Reseed',
      cancelText: 'Cancel',
    },
  );
  if (!confirmed) return;

  send({ type: 'reseed' });
  success('Reseed command sent');
}

/**
 * Handle JSON editor value updates
 */
function onJsonEditorUpdate(value: unknown): void {
  modelsStore.updateItems(value);
}
</script>

<template>
  <div class="models-page">
    <!-- Schema Sidebar -->
    <aside class="models-sidebar">
      <div class="models-sidebar__header">
        <Database :size="18" />
        <span>Schemas</span>
        <span class="models-sidebar__badge">{{ modelsStore.schemaCount }}</span>
      </div>

      <!-- Loading State -->
      <div v-if="modelsStore.loading && modelsStore.schemas.length === 0" class="models-sidebar__loading">
        <div class="spinner" />
        <span>Loading...</span>
      </div>

      <!-- Schema List -->
      <div v-else class="models-sidebar__list">
        <button
          v-for="schema in modelsStore.schemas"
          :key="schema.name"
          :class="[
            'models-sidebar__item',
            { 'models-sidebar__item--active': modelsStore.selectedSchema === schema.name },
          ]"
          @click="selectSchema(schema.name)"
        >
          <span class="models-sidebar__name">{{ schema.name }}</span>
          <span class="models-sidebar__count">{{ schema.count }}</span>
        </button>
      </div>

      <!-- Footer Stats -->
      <div class="models-sidebar__footer">
        <div class="models-sidebar__stat">
          <span class="text-muted">Total Items:</span>
          <span class="font-mono">{{ modelsStore.totalItems }}</span>
        </div>
      </div>
    </aside>

    <!-- Data Panel -->
    <main class="models-content">
      <template v-if="modelsStore.selectedSchema">
        <!-- Toolbar -->
        <div class="models-toolbar">
          <div class="models-toolbar__title">
            <span class="font-mono">{{ modelsStore.selectedSchema }}</span>
            <span class="text-muted">({{ modelsStore.currentItems.length }} items)</span>
            <span
              v-if="modelsStore.isDirty"
              class="models-toolbar__badge models-toolbar__badge--warning"
            >
              Unsaved
            </span>
          </div>

          <div class="models-toolbar__actions">
            <!-- Discard Button -->
            <button
              v-if="modelsStore.isDirty"
              class="btn btn--ghost"
              title="Discard changes"
              @click="discardChanges"
            >
              <X :size="16" />
              <span>Discard</span>
            </button>

            <!-- Save Button -->
            <button
              :disabled="!modelsStore.isDirty || modelsStore.loading"
              class="btn btn--primary"
              title="Save changes"
              @click="saveItems"
            >
              <Save :size="16" />
              <span>Save</span>
            </button>

            <!-- Clear Button -->
            <button
              class="btn btn--danger"
              title="Clear all items"
              @click="showClearConfirm = true"
            >
              <Trash2 :size="16" />
              <span>Clear</span>
            </button>

            <!-- Reseed Button -->
            <button
              :disabled="!connected"
              class="btn btn--secondary"
              title="Reseed all schemas with generated data"
              @click="reseedAll"
            >
              <RefreshCw :size="16" />
              <span>Reseed All</span>
            </button>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="modelsStore.error" class="models-error">
          <span>⚠️ {{ modelsStore.error }}</span>
        </div>

        <!-- JSON Editor -->
        <div class="models-editor">
          <JsonEditor
            ref="jsonEditorRef"
            :model-value="modelsStore.currentItems"
            :readonly="modelsStore.loading"
            :min-height="400"
            @update:model-value="onJsonEditorUpdate"
          />
        </div>

        <!-- Loading Overlay -->
        <div v-if="modelsStore.loading" class="models-loading-overlay">
          <div class="spinner" />
          <span>Loading...</span>
        </div>
      </template>

      <!-- Empty State or Error -->
      <div v-else class="empty-state">
        <!-- Show error if present and no schema selected -->
        <div v-if="modelsStore.error" class="models-error">
          <span>⚠️ {{ modelsStore.error }}</span>
        </div>
        <template v-else>
          <Database :size="48" class="empty-state__icon" />
          <h3 class="empty-state__title">Select a schema</h3>
          <p class="empty-state__description">
            Choose a schema from the sidebar to view and edit its data.
          </p>
        </template>
      </div>
    </main>

    <!-- Clear Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showClearConfirm" class="modal-overlay" @click="showClearConfirm = false">
        <div class="modal" @click.stop>
          <div class="modal__header">
            <h3>Clear Schema Data</h3>
          </div>
          <div class="modal__body">
            <p>
              Are you sure you want to clear all items for
              <strong>{{ modelsStore.selectedSchema }}</strong>?
            </p>
            <p class="text-muted">This action cannot be undone.</p>
          </div>
          <div class="modal__footer">
            <button class="btn btn--ghost" @click="showClearConfirm = false">
              Cancel
            </button>
            <button class="btn btn--danger" @click="clearSchema">
              Clear Schema
            </button>
          </div>
        </div>
      </div>
    </Teleport>
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

.models-sidebar__badge {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 var(--devtools-space-xs);
  background-color: var(--devtools-primary);
  color: white;
  border-radius: var(--devtools-radius-sm);
  font-size: var(--font-size-0);
  font-weight: var(--font-weight-6);
}

.models-sidebar__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--devtools-space-md);
  padding: var(--devtools-space-xl);
  color: var(--devtools-text-muted);
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

.models-sidebar__footer {
  padding: var(--devtools-space-md);
  border-top: 1px solid var(--devtools-border);
}

.models-sidebar__stat {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-0);
}

/* Content Area */
.models-content {
  position: relative;
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

.models-toolbar__badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--devtools-radius-sm);
  font-size: var(--font-size-0);
  font-weight: var(--font-weight-5);
}

.models-toolbar__badge--warning {
  background-color: color-mix(in srgb, #f59e0b 20%, transparent);
  color: #f59e0b;
}

.models-toolbar__actions {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-sm);
}

/* Error Display */
.models-error {
  padding: var(--devtools-space-sm) var(--devtools-space-md);
  margin-bottom: var(--devtools-space-md);
  background-color: color-mix(in srgb, var(--devtools-error) 10%, transparent);
  border: 1px solid var(--devtools-error);
  border-radius: var(--devtools-radius-sm);
  color: var(--devtools-error);
  font-size: var(--font-size-0);
}

/* Editor */
.models-editor {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Loading Overlay */
.models-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--devtools-space-md);
  background-color: color-mix(in srgb, var(--devtools-bg) 80%, transparent);
  backdrop-filter: blur(2px);
  z-index: 10;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.modal {
  min-width: 400px;
  background-color: var(--devtools-surface);
  border: 1px solid var(--devtools-border);
  border-radius: var(--devtools-radius-md);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.modal__header {
  padding: var(--devtools-space-md);
  border-bottom: 1px solid var(--devtools-border);
}

.modal__header h3 {
  margin: 0;
  font-size: var(--font-size-2);
  font-weight: var(--font-weight-6);
}

.modal__body {
  padding: var(--devtools-space-md);
}

.modal__body p {
  margin: 0 0 var(--devtools-space-sm) 0;
}

.modal__body p:last-child {
  margin-bottom: 0;
}

.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--devtools-space-sm);
  padding: var(--devtools-space-md);
  border-top: 1px solid var(--devtools-border);
}

/* Spinner */
.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--devtools-border);
  border-top-color: var(--devtools-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
