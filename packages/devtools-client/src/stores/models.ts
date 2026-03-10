/**
 * Models Store - Store Data Management
 *
 * What: Manages in-memory store data for viewing and editing mock data
 * How: Fetches data from /_api/store endpoints and sends WebSocket commands
 * Why: Provides centralized state management for the Models page
 *
 * Multi-spec: Schemas are stored per-spec in a Map. Fetch URLs are
 * scoped by specId. Computed views respect activeSpecFilter.
 *
 * API Endpoints Used:
 * - GET  /_api/{specId}/store          - List all schemas for a spec
 * - GET  /_api/{specId}/store/:schema  - Get items for a schema
 * - POST /_api/{specId}/store/:schema  - Bulk replace items
 * - DELETE /_api/{specId}/store/:schema - Clear schema data
 *
 * WebSocket Commands:
 * - reseed - Trigger reseed of all schemas
 */

import { defineStore } from 'pinia';
import type { ComputedRef, Ref } from 'vue';
import { computed, ref, toRaw } from 'vue';

import { useSpecsStore } from './specs';

/**
 * Safe clone helper that handles Vue reactive/proxy values
 * Attempts structuredClone with toRaw, falls back to JSON serialization
 */
function safeClone<T>(value: T): T {
  try {
    return structuredClone(toRaw(value));
  } catch {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}

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
  /** Which spec this schema belongs to */
  specId: string;
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
  /** Currently selected spec for schema operations */
  selectedSpecId: string | null;
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
 * Build the API base path for a spec.
 * Uses /_api/{specId} for multi-spec, falls back to /_api for empty specId.
 */
function apiBasePath(specId: string): string {
  return specId ? `/_api/${encodeURIComponent(specId)}` : '/_api';
}

/**
 * Models store for managing store data
 */
export const useModelsStore = defineStore('models', () => {
  const specsStore = useSpecsStore();

  // ==========================================================================
  // State
  // ==========================================================================

  /** Per-spec schemas: Map<specId, SchemaInfo[]> */
  const schemasBySpec: Ref<Map<string, SchemaInfo[]>> = ref(new Map());

  /** Currently selected schema name */
  const selectedSchema: Ref<string | null> = ref(null);

  /** Currently selected spec ID for schema operations */
  const selectedSpecId: Ref<string | null> = ref(null);

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
   * Flattened list of all schemas, respecting activeSpecFilter.
   * Returns schemas for the active spec only, or all schemas when no filter.
   */
  const schemas: ComputedRef<SchemaInfo[]> = computed(() => {
    const specFilter = specsStore.activeSpecFilter;

    if (specFilter) {
      return schemasBySpec.value.get(specFilter) ?? [];
    }

    // All schemas across all specs
    const all: SchemaInfo[] = [];
    for (const [, specSchemas] of schemasBySpec.value) {
      all.push(...specSchemas);
    }
    return all;
  });

  /**
   * Currently selected schema metadata
   */
  const currentSchema: ComputedRef<SchemaInfo | null> = computed(() => {
    if (!selectedSchema.value || !selectedSpecId.value) return null;
    const specSchemas = schemasBySpec.value.get(selectedSpecId.value);
    if (!specSchemas) return null;
    return specSchemas.find((s) => s.name === selectedSchema.value) ?? null;
  });

  /**
   * Dirty state flag - updated by functions that mutate state
   */
  const isDirtyFlag: Ref<boolean> = ref(false);

  /**
   * Whether the current data has been modified
   */
  const isDirty: ComputedRef<boolean> = computed(() => isDirtyFlag.value);

  /**
   * Total number of schemas (respects spec filter)
   */
  const schemaCount: ComputedRef<number> = computed(() => schemas.value.length);

  /**
   * Total number of items across visible schemas
   */
  const totalItems: ComputedRef<number> = computed(() => {
    return schemas.value.reduce((sum, schema) => sum + schema.count, 0);
  });

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Fetch the list of schemas from the server for a specific spec
   */
  async function fetchSchemas(specId: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${apiBasePath(specId)}/store`);
      if (!response.ok) {
        throw new Error(`Failed to fetch schemas: ${response.statusText}`);
      }

      const data = await response.json();
      const rawSchemas: Array<Omit<SchemaInfo, 'specId'>> = data.schemas ?? [];
      // Stamp each schema with its specId
      const stampedSchemas: SchemaInfo[] = rawSchemas.map((s) => ({ ...s, specId }));
      schemasBySpec.value.set(specId, stampedSchemas);
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
  async function selectSchemaByName(specId: string, schemaName: string): Promise<void> {
    if (selectedSchema.value === schemaName && selectedSpecId.value === specId) return;

    selectedSchema.value = schemaName;
    selectedSpecId.value = specId;
    await fetchSchemaData(specId, schemaName);
  }

  /**
   * Fetch data for a specific schema
   */
  async function fetchSchemaData(specId: string, schemaName: string): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${apiBasePath(specId)}/store/${encodeURIComponent(schemaName)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch schema data: ${response.statusText}`);
      }

      const data: SchemaData = await response.json();
      const items = data.items ?? [];
      // Clone items to avoid shared references between current and original
      currentItems.value = safeClone(items);
      originalItems.value = safeClone(items);
      isDirtyFlag.value = false;

      // Update schema count in the list
      const specSchemas = schemasBySpec.value.get(specId);
      if (specSchemas) {
        const schemaIndex = specSchemas.findIndex((s) => s.name === schemaName);
        if (schemaIndex !== -1) {
          specSchemas[schemaIndex].count = data.count;
        }
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
    // Mark as dirty since items were updated
    isDirtyFlag.value = true;
  }

  /**
   * Save the current items to the server
   */
  async function saveItems(): Promise<boolean> {
    if (!selectedSchema.value || !selectedSpecId.value) {
      error.value = 'No schema selected';
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(
        `${apiBasePath(selectedSpecId.value)}/store/${encodeURIComponent(selectedSchema.value)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(currentItems.value),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to save items: ${response.statusText}`);
      }

      const result = await response.json();

      // Update original items to match saved items
      originalItems.value = safeClone(currentItems.value);
      isDirtyFlag.value = false;

      // Update schema count
      const specSchemas = schemasBySpec.value.get(selectedSpecId.value);
      if (specSchemas) {
        const schemaIndex = specSchemas.findIndex((s) => s.name === selectedSchema.value);
        if (schemaIndex !== -1) {
          specSchemas[schemaIndex].count = result.created ?? currentItems.value.length;
        }
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
    if (!selectedSchema.value || !selectedSpecId.value) {
      error.value = 'No schema selected';
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(
        `${apiBasePath(selectedSpecId.value)}/store/${encodeURIComponent(selectedSchema.value)}`,
        {
          method: 'DELETE',
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to clear schema: ${response.statusText}`);
      }

      // Update local state
      currentItems.value = [];
      originalItems.value = [];
      isDirtyFlag.value = false;

      // Update schema count
      const specSchemas = schemasBySpec.value.get(selectedSpecId.value);
      if (specSchemas) {
        const schemaIndex = specSchemas.findIndex((s) => s.name === selectedSchema.value);
        if (schemaIndex !== -1) {
          specSchemas[schemaIndex].count = 0;
        }
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
    currentItems.value = safeClone(originalItems.value);
    isDirtyFlag.value = false;
  }

  /**
   * Refresh the current schema data from the server
   */
  async function refresh(): Promise<void> {
    if (selectedSchema.value && selectedSpecId.value) {
      await fetchSchemaData(selectedSpecId.value, selectedSchema.value);
    } else if (selectedSpecId.value) {
      await fetchSchemas(selectedSpecId.value);
    }
  }

  /**
   * Reset the store state
   */
  function reset(): void {
    schemasBySpec.value.clear();
    selectedSchema.value = null;
    selectedSpecId.value = null;
    currentItems.value = [];
    originalItems.value = [];
    loading.value = false;
    error.value = null;
    isDirtyFlag.value = false;
  }

  /**
   * Handle store update from WebSocket event
   */
  function handleStoreUpdate(data: { specId: string; schema: string; action: string; count: number }): void {
    const specSchemas = schemasBySpec.value.get(data.specId);
    if (specSchemas) {
      const schemaIndex = specSchemas.findIndex((s) => s.name === data.schema);
      if (schemaIndex !== -1) {
        specSchemas[schemaIndex].count = data.count;
      }
    }

    // If the updated schema is currently selected, refresh it only if no unsaved changes
    if (selectedSchema.value === data.schema && selectedSpecId.value === data.specId) {
      if (!isDirty.value) {
        fetchSchemaData(data.specId, data.schema);
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
  function handleReseedComplete(data: { specId: string; success: boolean; schemas: string[] }): void {
    if (data.success) {
      // Refresh schema list for this spec
      fetchSchemas(data.specId);

      // Refresh current schema data only if no unsaved changes
      if (selectedSchema.value && selectedSpecId.value === data.specId) {
        if (!isDirty.value) {
          fetchSchemaData(data.specId, selectedSchema.value);
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
    schemasBySpec,
    schemas,
    selectedSchema,
    selectedSpecId,
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
