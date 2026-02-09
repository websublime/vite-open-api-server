/**
 * Data Table Utilities Tests
 *
 * What: Unit tests for data-table utility functions
 * How: Tests pure functions for column discovery, cell formatting, and row keys
 * Why: Ensures reliable data rendering logic for the DataTable component
 *
 * @module utils/__tests__/data-table.test
 */

import { describe, expect, it } from 'vitest';

import { discoverColumns, formatCell, getCellValue, getRowKey, truncate } from '../data-table';

// ==========================================================================
// truncate
// ==========================================================================

describe('truncate', () => {
  it('should return the string as-is when shorter than maxLen', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('should return the string as-is when exactly maxLen', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('should truncate and append ellipsis when longer than maxLen', () => {
    expect(truncate('hello world', 5)).toBe('hello\u2026');
  });

  it('should handle empty string', () => {
    expect(truncate('', 5)).toBe('');
  });

  it('should handle maxLen of 0', () => {
    expect(truncate('hello', 0)).toBe('\u2026');
  });
});

// ==========================================================================
// formatCell
// ==========================================================================

describe('formatCell', () => {
  it('should return "--" for null', () => {
    expect(formatCell(null)).toBe('--');
  });

  it('should return "--" for undefined', () => {
    expect(formatCell(undefined)).toBe('--');
  });

  it('should return string values, truncated at 50 chars', () => {
    expect(formatCell('hello')).toBe('hello');
  });

  it('should truncate long strings at 50 characters', () => {
    const longStr = 'a'.repeat(60);
    const result = formatCell(longStr);
    expect(result.length).toBe(51); // 50 chars + ellipsis
    expect(result.endsWith('\u2026')).toBe(true);
  });

  it('should convert numbers to string', () => {
    expect(formatCell(42)).toBe('42');
    expect(formatCell(0)).toBe('0');
    expect(formatCell(-1)).toBe('-1');
    expect(formatCell(3.14)).toBe('3.14');
  });

  it('should convert booleans to string', () => {
    expect(formatCell(true)).toBe('true');
    expect(formatCell(false)).toBe('false');
  });

  it('should stringify arrays', () => {
    expect(formatCell([1, 2, 3])).toBe('[1,2,3]');
  });

  it('should truncate long arrays', () => {
    const longArray = Array.from({ length: 100 }, (_, i) => i);
    const result = formatCell(longArray);
    expect(result.length).toBeLessThanOrEqual(51);
    expect(result.endsWith('\u2026')).toBe(true);
  });

  it('should stringify objects', () => {
    expect(formatCell({ a: 1 })).toBe('{"a":1}');
  });

  it('should truncate long objects', () => {
    const longObj: Record<string, number> = {};
    for (let i = 0; i < 50; i++) {
      longObj[`key${i}`] = i;
    }
    const result = formatCell(longObj);
    expect(result.length).toBeLessThanOrEqual(51);
  });
});

// ==========================================================================
// getCellValue
// ==========================================================================

describe('getCellValue', () => {
  it('should return the value for an existing key', () => {
    expect(getCellValue({ name: 'Alice' }, 'name')).toBe('Alice');
  });

  it('should return undefined for a missing key', () => {
    expect(getCellValue({ name: 'Alice' }, 'age')).toBeUndefined();
  });

  it('should return undefined for null item', () => {
    expect(getCellValue(null, 'name')).toBeUndefined();
  });

  it('should return undefined for undefined item', () => {
    expect(getCellValue(undefined, 'name')).toBeUndefined();
  });

  it('should return undefined for primitive item', () => {
    expect(getCellValue('string', 'length')).toBeUndefined();
    expect(getCellValue(42, 'toString')).toBeUndefined();
  });

  it('should handle nested object values', () => {
    const item = { meta: { nested: true } };
    expect(getCellValue(item, 'meta')).toEqual({ nested: true });
  });

  it('should handle array values', () => {
    const item = { tags: ['a', 'b'] };
    expect(getCellValue(item, 'tags')).toEqual(['a', 'b']);
  });
});

// ==========================================================================
// getRowKey
// ==========================================================================

describe('getRowKey', () => {
  it('should return the ID field value when it is a string', () => {
    expect(getRowKey({ id: 'abc-123' }, 'id', 0)).toBe('abc-123');
  });

  it('should return the ID field value when it is a number', () => {
    expect(getRowKey({ id: 42 }, 'id', 0)).toBe(42);
  });

  it('should fall back to index when ID field is missing', () => {
    expect(getRowKey({ name: 'Alice' }, 'id', 5)).toBe(5);
  });

  it('should fall back to index when ID field is null', () => {
    expect(getRowKey({ id: null }, 'id', 3)).toBe(3);
  });

  it('should fall back to index when ID field is undefined', () => {
    expect(getRowKey({ id: undefined }, 'id', 7)).toBe(7);
  });

  it('should fall back to index when ID field is a boolean', () => {
    expect(getRowKey({ id: true }, 'id', 2)).toBe(2);
  });

  it('should fall back to index when ID field is an object', () => {
    expect(getRowKey({ id: { nested: true } }, 'id', 4)).toBe(4);
  });

  it('should fall back to index when ID field is an array', () => {
    expect(getRowKey({ id: [1, 2] }, 'id', 6)).toBe(6);
  });

  it('should fall back to index for null item', () => {
    expect(getRowKey(null, 'id', 0)).toBe(0);
  });

  it('should use custom idField name', () => {
    expect(getRowKey({ uuid: 'x-y-z' }, 'uuid', 0)).toBe('x-y-z');
  });
});

// ==========================================================================
// discoverColumns
// ==========================================================================

describe('discoverColumns', () => {
  it('should return empty array for empty items', () => {
    expect(discoverColumns([], 'id')).toEqual([]);
  });

  it('should discover columns from a single item', () => {
    const items = [{ id: 1, name: 'Alice', age: 30 }];
    const cols = discoverColumns(items, 'id');
    expect(cols[0]).toBe('id');
    expect(cols).toContain('name');
    expect(cols).toContain('age');
    expect(cols).toHaveLength(3);
  });

  it('should place idField first', () => {
    const items = [{ name: 'Alice', age: 30, id: 1 }];
    const cols = discoverColumns(items, 'id');
    expect(cols[0]).toBe('id');
  });

  it('should merge keys from items with different shapes', () => {
    const items = [
      { id: 1, name: 'Alice' },
      { id: 2, email: 'bob@test.com' },
    ];
    const cols = discoverColumns(items, 'id');
    expect(cols[0]).toBe('id');
    expect(cols).toContain('name');
    expect(cols).toContain('email');
    expect(cols).toHaveLength(3);
  });

  it('should handle items where idField does not exist', () => {
    const items = [{ name: 'Alice', age: 30 }];
    const cols = discoverColumns(items, 'id');
    expect(cols).not.toContain('id');
    expect(cols).toContain('name');
    expect(cols).toContain('age');
  });

  it('should return empty array when all items are non-objects', () => {
    const items = ['string', 42, null, true] as unknown[];
    expect(discoverColumns(items, 'id')).toEqual([]);
  });

  it('should skip non-object items while collecting keys from objects', () => {
    const items = [null, { id: 1, name: 'Alice' }, 'string'] as unknown[];
    const cols = discoverColumns(items, 'id');
    expect(cols[0]).toBe('id');
    expect(cols).toContain('name');
    expect(cols).toHaveLength(2);
  });

  it('should deduplicate columns across items', () => {
    const items = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ];
    const cols = discoverColumns(items, 'id');
    expect(cols).toHaveLength(2);
    expect(cols).toEqual(['id', 'name']);
  });
});
