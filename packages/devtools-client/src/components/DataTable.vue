<!--
  DataTable.vue - Dynamic Data Table Component

  What: Displays an array of objects as a scrollable table with dynamic columns
  How: Discovers columns from all items' keys, places idField first, formats cells
  Why: Shows store data in tabular form alongside the JSON editor on the Models page
-->

<script setup lang="ts">
import { Database } from 'lucide-vue-next';
import { computed } from 'vue';

/**
 * Component props
 */
interface Props {
  /** Array of items to display */
  items: unknown[];
  /** Name of the ID field (placed first in columns) */
  idField: string;
  /** Index of the currently selected row (-1 for none) */
  selectedIndex?: number;
}

/**
 * Component emits
 */
interface Emits {
  (e: 'select', index: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  selectedIndex: -1,
});

const emit = defineEmits<Emits>();

// ==========================================================================
// Computed
// ==========================================================================

/**
 * Discover columns from all items' keys.
 * Iterates over every item to accumulate all unique keys,
 * then places idField first if present.
 */
const columns = computed<string[]>(() => {
  if (props.items.length === 0) return [];

  const keySet = new Set<string>();
  for (const item of props.items) {
    if (typeof item === 'object' && item !== null) {
      for (const key of Object.keys(item as Record<string, unknown>)) {
        keySet.add(key);
      }
    }
  }

  if (keySet.size === 0) return [];

  const keys = Array.from(keySet);
  const idField = props.idField;

  // Put idField first if it exists
  if (keys.includes(idField)) {
    return [idField, ...keys.filter((k) => k !== idField)];
  }

  return keys;
});
// ==========================================================================
// Methods
// ==========================================================================

/**
 * Format a cell value for display
 */
function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '--';
  if (typeof value === 'string') return truncate(value, 50);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return truncate(JSON.stringify(value), 50);
  if (typeof value === 'object') return truncate(JSON.stringify(value), 50);
  return String(value);
}

/**
 * Truncate a string to maxLen characters
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen)}…`;
}

/**
 * Get a cell value from an item by column name
 */
function getCellValue(item: unknown, column: string): unknown {
  if (typeof item !== 'object' || item === null) return undefined;
  return (item as Record<string, unknown>)[column];
}

/**
 * Handle row click
 */
function onRowClick(index: number): void {
  emit('select', index);
}

/**
 * Get a stable key for a row, using the item's ID field value if available
 */
function getRowKey(item: unknown, index: number): string | number {
  const id = getCellValue(item, props.idField);
  if (id !== undefined && id !== null) return id as string | number;
  return index;
}
</script>

<template>
  <div class="data-table">
    <!-- Empty State -->
    <div v-if="items.length === 0" class="data-table__empty">
      <Database :size="32" class="data-table__empty-icon" />
      <span>No items</span>
    </div>

    <!-- Table -->
    <div v-else class="data-table__container">
      <table class="data-table__table">
        <thead>
          <tr>
            <th class="data-table__row-num">#</th>
            <th
              v-for="col in columns"
              :key="col"
              :class="['data-table__header', { 'data-table__header--id': col === idField }]"
            >
              {{ col }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in items"
            :key="getRowKey(item, index)"
            :class="['data-table__row', { 'data-table__row--selected': index === selectedIndex }]"
            @click="onRowClick(index)"
          >
            <td class="data-table__row-num">{{ index + 1 }}</td>
            <td
              v-for="col in columns"
              :key="col"
              :class="['data-table__cell', { 'data-table__cell--id': col === idField }]"
            >
              {{ formatCell(getCellValue(item, col)) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div v-if="items.length > 0" class="data-table__footer">
      <span class="data-table__info">{{ items.length }} items</span>
      <span class="data-table__info">{{ columns.length }} columns</span>
    </div>
  </div>
</template>

<style scoped>
.data-table {
  display: flex;
  flex-direction: column;
  background-color: var(--devtools-surface);
  border: 1px solid var(--devtools-border);
  border-radius: var(--devtools-radius-md);
  overflow: hidden;
  height: 100%;
}

/* Empty State */
.data-table__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--devtools-space-sm);
  flex: 1;
  color: var(--devtools-text-muted);
  font-size: var(--font-size-1);
}

.data-table__empty-icon {
  opacity: 0.4;
}

/* Table Container */
.data-table__container {
  flex: 1;
  overflow: auto;
}

.data-table__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-0);
  font-family: var(--devtools-font-mono);
}

/* Header */
.data-table__table thead {
  position: sticky;
  top: 0;
  z-index: 1;
}

.data-table__header {
  padding: var(--devtools-space-xs) var(--devtools-space-sm);
  text-align: left;
  font-weight: var(--font-weight-6);
  font-family: var(--devtools-font-sans);
  font-size: var(--font-size-0);
  background-color: var(--devtools-surface-elevated);
  border-bottom: 1px solid var(--devtools-border);
  white-space: nowrap;
  color: var(--devtools-text);
}

.data-table__header--id {
  color: var(--devtools-primary);
}

/* Row Numbers */
.data-table__row-num {
  padding: var(--devtools-space-xs) var(--devtools-space-sm);
  text-align: right;
  color: var(--devtools-text-muted);
  font-size: var(--font-size-0);
  font-family: var(--devtools-font-mono);
  background-color: var(--devtools-surface-elevated);
  border-right: 1px solid var(--devtools-border);
  border-bottom: 1px solid var(--devtools-border);
  white-space: nowrap;
  min-width: 2ch;
  user-select: none;
}

thead .data-table__row-num {
  background-color: var(--devtools-surface-elevated);
}

/* Rows */
.data-table__row {
  cursor: pointer;
  transition: background-color var(--devtools-transition-fast);
}

.data-table__row:hover {
  background-color: var(--devtools-surface-elevated);
}

.data-table__row--selected {
  background-color: color-mix(in srgb, var(--devtools-primary) 15%, transparent);
}

/* Cells */
.data-table__cell {
  padding: var(--devtools-space-xs) var(--devtools-space-sm);
  border-bottom: 1px solid var(--devtools-border);
  white-space: nowrap;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--devtools-text);
}

.data-table__cell--id {
  color: var(--devtools-primary);
  font-weight: var(--font-weight-5);
}

/* Footer */
.data-table__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--devtools-space-xs) var(--devtools-space-sm);
  background-color: var(--devtools-surface-elevated);
  border-top: 1px solid var(--devtools-border);
  font-size: var(--font-size-0);
}

.data-table__info {
  color: var(--devtools-text-muted);
}
</style>
