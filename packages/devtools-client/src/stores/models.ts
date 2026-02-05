/**
 * Models Store - Store Data Management
 *
 * What: Manages in-memory store data for viewing and editing mock data
 * How: Fetches data from /_api/store endpoints and sends WebSocket commands
 * Why: Provides centralized state management for the Models page
 *
 * API Endpoints Used:
 * - GET  /_api/store          - List all schemas
 * - GET  /_api/store/:schema  - Get items for a schema
 * - POST /_api/store/:schema  - Bulk replace items
 * - DELETE /_api/store/:schema - Clear schema data
 *
 * WebSocket Commands:
 * - reseed - Trigger reseed of all schemas
 */

import { defineStore } from 'pinia';
import type { ComputedRef, Ref } from 'vue';
import { computed, ref } from 'vue';

/**
 * Schema metadata from the server
 */
export interface SchemaInfo {
  /** Schema name from OpenAPI components */
  name: string;
  /** Number of items in the store for this schema */
  count: number;
  /** ID field name for this schema */
  idField: string;
}

/**
 * Schema data response from the server
 */
export interface SchemaData {
  /** Schema name */
  schema: string;
  /** Number of items */
  count: number;
  /** ID field name */
  idField: string;
  /** Array of data items */
  items: unknown[];
}

/**
 * Store state data
 */
export interface ModelsData {
  /** List of available schemas */
  schemas: SchemaInfo[];
  /** Currently selected schema name */
  selectedSchema: string | null;
  /** Items for the currently selected schema */
  currentItems: unknown[];
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Editing state - whether data has been modified */
  isDirty: boolean;
}

/**
 * Models store for managing store data
 */
export const useModelsStore = defineStore('models', () => {
  // ==========================================================================
  // State
  // ==========================================================================

  /** List of available schemas with metadata */
  const schemas: Ref<SchemaInfo[]> = ref([]);

  /** Currently selected schema name */
  const selectedSchema: Ref<string | null> = ref(null);

  /** Items for the currently selected schema */
  const currentItems: Ref<unknown[]> = ref([]);

  /** Original items (before editing) for dirty detection */
  const originalItems: Ref<unknown[]> = ref([]);

  /** Loading state */
  const loading: Ref<boolean> = ref(false);

  /** Error message */
  const error: Ref<string | null> = ref(null);

  // ==========================================================================
  // Computed
  // ==========================================================================

  /**
   * Currently selected schema metadata
   */
  const currentSchema: ComputedRef<SchemaInfo | null> = computed(() => {
    if (!selectedSchema.value) return null;
    return schemas.value.find((s) => s.name === selectedSchema.value) ?? null;
  });

  /**
   * Whether the current data has been modified
   */
  const isDirty: ComputedRef<boolean> = computed(() => {
    return JSON.stringify(currentItems.value) !== JSON.stringify(originalItems.value);
  });

  /**
   * Total number of schemas
   */
  const schemaCount: ComputedRef<number> = computed(() => schemas.value.length);

  /**
   * Total number of items across all schemas
   */
  const totalItems: ComputedRef<number> = computed(() => {
    return schemas.value.reduce((sum, schema) => sum + schema.count, 0);
  });

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Fetch the list of schemas from the server
   */
  async function fetchSchemas(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch('/_api/store');
      if (!response.ok) {
        throw new Error(`Failed to fetch schemas: ${response.statusText}`);
      }

      const data = await response.json();
      schemas.value = data.schemas ?? [];
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch schemas';
      console.error('[ModelsStore] Error fetching schemas:', err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Select a schema and fetch its data
   */
  async function selectSchemaByName(schemaName: string): Promise<void> {
    if (selectedSchema.value === schemaName) return;

    selectedSchema.value = schemaName;
    await fetchSchemaData(schemaName);
  }

  /**
   * Fetch data for a specific schema
   */
  async function fetchSchemaData(schemaName: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`/_api/store/${encodeURIComponent(schemaName)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch schema data: ${response.statusText}`);
      }

      const data: SchemaData = await response.json();
      const items = data.items ?? [];
      // Clone items to avoid shared references between current and original
      // Use JSON parse/stringify for reliable cross-environment cloning
      currentItems.value = JSON.parse(JSON.stringify(items));
      originalItems.value = JSON.parse(JSON.stringify(items));

      // Update schema count in the list
      const schemaIndex = schemas.value.findIndex((s) => s.name === schemaName);
      if (schemaIndex !== -1) {
        schemas.value[schemaIndex].count = data.count;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch schema data';
      console.error('[ModelsStore] Error fetching schema data:', err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update the current items (for editing)
   */
  function updateItems(items: unknown): void {
    // Validate that items is an array
    if (!Array.isArray(items)) {
      error.value = 'Invalid data: Expected an array of items';
      console.error('[ModelsStore] updateItems received non-array value:', typeof items);
      return;
    }

    currentItems.value = items;
    // Clear any previous validation errors
    error.value = null;
  }

  /**
   * Save the current items to the server
   */
  async function saveItems(): Promise<boolean> {
    if (!selectedSchema.value) {
      error.value = 'No schema selected';
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`/_api/store/${encodeURIComponent(selectedSchema.value)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentItems.value),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save items: ${response.statusText}`);
      }

      const result = await response.json();

      // Update original items to match saved items
      // Use JSON parse/stringify for reliable cross-environment cloning
      originalItems.value = JSON.parse(JSON.stringify(currentItems.value));

      // Update schema count
      const schemaIndex = schemas.value.findIndex((s) => s.name === selectedSchema.value);
      if (schemaIndex !== -1) {
        schemas.value[schemaIndex].count = result.created ?? currentItems.value.length;
      }

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save items';
      console.error('[ModelsStore] Error saving items:', err);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Clear all items for the current schema
   */
  async function clearSchema(): Promise<boolean> {
    if (!selectedSchema.value) {
      error.value = 'No schema selected';
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`/_api/store/${encodeURIComponent(selectedSchema.value)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to clear schema: ${response.statusText}`);
      }

      // Update local state
      currentItems.value = [];
      originalItems.value = [];

      // Update schema count
      const schemaIndex = schemas.value.findIndex((s) => s.name === selectedSchema.value);
      if (schemaIndex !== -1) {
        schemas.value[schemaIndex].count = 0;
      }

      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to clear schema';
      console.error('[ModelsStore] Error clearing schema:', err);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Discard changes and revert to original items
   */
  function discardChanges(): void {
    // Use JSON parse/stringify for reliable cross-environment cloning
    // This works in both browser and Node.js test environments
    currentItems.value = JSON.parse(JSON.stringify(originalItems.value));
  }

  /**
   * Refresh the current schema data from the server
   */
  async function refresh(): Promise<void> {
    if (selectedSchema.value) {
      await fetchSchemaData(selectedSchema.value);
    } else {
      await fetchSchemas();
    }
  }

  /**
   * Reset the store state
   */
  function reset(): void {
    schemas.value = [];
    selectedSchema.value = null;
    currentItems.value = [];
    originalItems.value = [];
    loading.value = false;
    error.value = null;
  }

  /**
   * Handle store update from WebSocket event
   */
  function handleStoreUpdate(data: { schema: string; action: string; count: number }): void {
    const schemaIndex = schemas.value.findIndex((s) => s.name === data.schema);
    if (schemaIndex !== -1) {
      schemas.value[schemaIndex].count = data.count;
    }

    // If the updated schema is currently selected, refresh it only if no unsaved changes
    if (selectedSchema.value === data.schema) {
      if (!isDirty.value) {
        fetchSchemaData(data.schema);
      } else {
        // Don't auto-refresh when there are unsaved changes
        console.warn(
          `[ModelsStore] Skipping auto-refresh for schema "${data.schema}" - unsaved changes exist`,
        );
      }
    }
  }

  /**
   * Handle reseed completion from WebSocket event
   */
  function handleReseedComplete(data: { success: boolean; schemas: string[] }): void {
    if (data.success) {
      // Refresh schema list
      fetchSchemas();

      // Refresh current schema data only if no unsaved changes
      if (selectedSchema.value) {
        if (!isDirty.value) {
          fetchSchemaData(selectedSchema.value);
        } else {
          console.warn(
            `[ModelsStore] Skipping auto-refresh after reseed for schema "${selectedSchema.value}" - unsaved changes exist`,
          );
        }
      }
    }
  }

  // ==========================================================================
  // Return store interface
  // ==========================================================================

  return {
    // State
    schemas,
    selectedSchema,
    currentItems,
    loading,
    error,

    // Computed
    currentSchema,
    isDirty,
    schemaCount,
    totalItems,

    // Actions
    fetchSchemas,
    selectSchemaByName,
    fetchSchemaData,
    updateItems,
    saveItems,
    clearSchema,
    discardChanges,
    refresh,
    reset,
    handleStoreUpdate,
    handleReseedComplete,
  };
});

export type ModelsStore = ReturnType<typeof useModelsStore>;
