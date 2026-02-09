/**
 * Data Table Utilities
 *
 * What: Pure helper functions for the DataTable component
 * How: Provides column discovery, cell formatting, and row key logic
 * Why: Extracted from DataTable.vue for testability and reuse
 *
 * @module utils/data-table
 */

/**
 * Truncate a string to maxLen characters, appending an ellipsis if truncated.
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen)}…`;
}

/**
 * Format a cell value for display.
 * Returns a human-readable string representation suitable for table cells.
 */
export function formatCell(value: unknown): string {
  if (value === null || value === undefined) return '--';
  if (typeof value === 'string') return truncate(value, 50);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return truncate(JSON.stringify(value), 50);
  if (typeof value === 'object') return truncate(JSON.stringify(value), 50);
  return String(value);
}

/**
 * Get a cell value from an item by column name.
 * Returns undefined for non-object items.
 */
export function getCellValue(item: unknown, column: string): unknown {
  if (typeof item !== 'object' || item === null) return undefined;
  return (item as Record<string, unknown>)[column];
}

/**
 * Get a stable key for a row, using the item's ID field value if it is
 * a string or number. Falls back to the row index otherwise.
 */
export function getRowKey(item: unknown, idField: string, index: number): string | number {
  const id = getCellValue(item, idField);
  if (typeof id === 'string' || typeof id === 'number') return id;
  return index;
}

/**
 * Discover columns from all items' keys.
 * Iterates over every item to accumulate all unique keys,
 * then places idField first if present.
 */
export function discoverColumns(items: unknown[], idField: string): string[] {
  if (items.length === 0) return [];

  const keySet = new Set<string>();
  for (const item of items) {
    if (typeof item === 'object' && item !== null) {
      for (const key of Object.keys(item as Record<string, unknown>)) {
        keySet.add(key);
      }
    }
  }

  if (keySet.size === 0) return [];

  const keys = Array.from(keySet);

  // Put idField first if it exists
  if (keys.includes(idField)) {
    return [idField, ...keys.filter((k) => k !== idField)];
  }

  return keys;
}
