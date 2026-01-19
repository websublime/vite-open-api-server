/**
 * In-Memory Store Tests
 *
 * Tests for the createStore function which provides CRUD operations
 * for schema-based data storage with configurable ID fields.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createStore, type Store, StoreError } from '../store.js';

describe('createStore', () => {
  let store: Store;

  beforeEach(() => {
    store = createStore();
  });

  describe('factory function', () => {
    it('should create a store with default options', () => {
      const store = createStore();
      expect(store).toBeDefined();
      expect(typeof store.list).toBe('function');
      expect(typeof store.get).toBe('function');
      expect(typeof store.create).toBe('function');
      expect(typeof store.update).toBe('function');
      expect(typeof store.delete).toBe('function');
    });

    it('should create a store with custom ID fields', () => {
      const store = createStore({
        idFields: {
          User: 'username',
          Order: 'orderId',
        },
      });

      expect(store.getIdField('User')).toBe('username');
      expect(store.getIdField('Order')).toBe('orderId');
      expect(store.getIdField('Pet')).toBe('id'); // default
    });
  });

  describe('create', () => {
    it('should create an item with default ID field', () => {
      const pet = { id: 1, name: 'Buddy', status: 'available' };

      const result = store.create('Pet', pet);

      expect(result).toEqual(pet);
      expect(store.getCount('Pet')).toBe(1);
    });

    it('should create an item with custom ID field', () => {
      const store = createStore({ idFields: { User: 'username' } });
      const user = { username: 'john', email: 'john@example.com' };

      const result = store.create('User', user);

      expect(result).toEqual(user);
      expect(store.get('User', 'john')).toEqual(user);
    });

    it('should create multiple items', () => {
      store.create('Pet', { id: 1, name: 'Buddy' });
      store.create('Pet', { id: 2, name: 'Max' });
      store.create('Pet', { id: 3, name: 'Charlie' });

      expect(store.getCount('Pet')).toBe(3);
    });

    it('should throw StoreError for missing ID field', () => {
      const pet = { name: 'Buddy' }; // missing 'id'

      expect(() => store.create('Pet', pet)).toThrow(StoreError);
      expect(() => store.create('Pet', pet)).toThrow(/missing required ID field 'id'/);
    });

    it('should throw StoreError for null ID value', () => {
      const pet = { id: null, name: 'Buddy' };

      expect(() => store.create('Pet', pet)).toThrow(StoreError);
    });

    it('should throw StoreError for undefined ID value', () => {
      const pet = { id: undefined, name: 'Buddy' };

      expect(() => store.create('Pet', pet)).toThrow(StoreError);
    });

    it('should throw StoreError for duplicate ID', () => {
      store.create('Pet', { id: 1, name: 'Buddy' });

      expect(() => store.create('Pet', { id: 1, name: 'Max' })).toThrow(StoreError);
      expect(() => store.create('Pet', { id: 1, name: 'Max' })).toThrow(/already exists/);
    });

    it('should throw StoreError for non-object item', () => {
      expect(() => store.create('Pet', 'not an object')).toThrow(StoreError);
      expect(() => store.create('Pet', 123)).toThrow(StoreError);
      expect(() => store.create('Pet', null)).toThrow(StoreError);
    });

    it('should support string IDs', () => {
      const pet = { id: 'pet-001', name: 'Buddy' };

      store.create('Pet', pet);

      expect(store.get('Pet', 'pet-001')).toEqual(pet);
    });

    it('should throw StoreError for non-string/number ID', () => {
      const pet = { id: { nested: 'id' }, name: 'Buddy' };

      expect(() => store.create('Pet', pet)).toThrow(StoreError);
      expect(() => store.create('Pet', pet)).toThrow(/must be a string or number/);
    });
  });

  describe('get', () => {
    it('should get an existing item by ID', () => {
      const pet = { id: 1, name: 'Buddy' };
      store.create('Pet', pet);

      const result = store.get('Pet', 1);

      expect(result).toEqual(pet);
    });

    it('should return null for non-existent ID', () => {
      const result = store.get('Pet', 999);

      expect(result).toBeNull();
    });

    it('should return null for non-existent schema', () => {
      const result = store.get('NonExistent', 1);

      expect(result).toBeNull();
    });

    it('should support string IDs', () => {
      const pet = { id: 'pet-001', name: 'Buddy' };
      store.create('Pet', pet);

      expect(store.get('Pet', 'pet-001')).toEqual(pet);
      expect(store.get('Pet', 'pet-002')).toBeNull();
    });
  });

  describe('list', () => {
    it('should return empty array for non-existent schema', () => {
      const result = store.list('Pet');

      expect(result).toEqual([]);
    });

    it('should return all items for a schema', () => {
      store.create('Pet', { id: 1, name: 'Buddy' });
      store.create('Pet', { id: 2, name: 'Max' });

      const result = store.list('Pet');

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ id: 1, name: 'Buddy' });
      expect(result).toContainEqual({ id: 2, name: 'Max' });
    });

    it('should only return items from the specified schema', () => {
      store.create('Pet', { id: 1, name: 'Buddy' });
      store.create('Category', { id: 1, name: 'Dogs' });

      expect(store.list('Pet')).toHaveLength(1);
      expect(store.list('Category')).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update an existing item', () => {
      store.create('Pet', { id: 1, name: 'Buddy', status: 'available' });

      const result = store.update('Pet', 1, { status: 'sold' });

      expect(result).toEqual({ id: 1, name: 'Buddy', status: 'sold' });
    });

    it('should return null for non-existent ID', () => {
      const result = store.update('Pet', 999, { status: 'sold' });

      expect(result).toBeNull();
    });

    it('should return null for non-existent schema', () => {
      const result = store.update('NonExistent', 1, { status: 'sold' });

      expect(result).toBeNull();
    });

    it('should merge updates with existing data', () => {
      store.create('Pet', { id: 1, name: 'Buddy', status: 'available', tags: ['cute'] });

      const result = store.update('Pet', 1, { name: 'Max' });

      expect(result).toEqual({
        id: 1,
        name: 'Max',
        status: 'available',
        tags: ['cute'],
      });
    });

    it('should persist the update', () => {
      store.create('Pet', { id: 1, name: 'Buddy' });
      store.update('Pet', 1, { name: 'Max' });

      const retrieved = store.get('Pet', 1);

      expect(retrieved).toEqual({ id: 1, name: 'Max' });
    });
  });

  describe('delete', () => {
    it('should delete an existing item', () => {
      store.create('Pet', { id: 1, name: 'Buddy' });

      const result = store.delete('Pet', 1);

      expect(result).toBe(true);
      expect(store.get('Pet', 1)).toBeNull();
    });

    it('should return false for non-existent ID', () => {
      const result = store.delete('Pet', 999);

      expect(result).toBe(false);
    });

    it('should return false for non-existent schema', () => {
      const result = store.delete('NonExistent', 1);

      expect(result).toBe(false);
    });

    it('should not affect other items', () => {
      store.create('Pet', { id: 1, name: 'Buddy' });
      store.create('Pet', { id: 2, name: 'Max' });

      store.delete('Pet', 1);

      expect(store.get('Pet', 2)).toEqual({ id: 2, name: 'Max' });
      expect(store.getCount('Pet')).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all items for a schema', () => {
      store.create('Pet', { id: 1, name: 'Buddy' });
      store.create('Pet', { id: 2, name: 'Max' });

      store.clear('Pet');

      expect(store.list('Pet')).toEqual([]);
      expect(store.getCount('Pet')).toBe(0);
    });

    it('should not affect other schemas', () => {
      store.create('Pet', { id: 1, name: 'Buddy' });
      store.create('Category', { id: 1, name: 'Dogs' });

      store.clear('Pet');

      expect(store.list('Category')).toHaveLength(1);
    });

    it('should handle clearing non-existent schema', () => {
      // Should not throw
      expect(() => store.clear('NonExistent')).not.toThrow();
    });
  });

  describe('clearAll', () => {
    it('should clear all data from all schemas', () => {
      store.create('Pet', { id: 1, name: 'Buddy' });
      store.create('Category', { id: 1, name: 'Dogs' });
      store.create('User', { id: 1, name: 'John' });

      store.clearAll();

      expect(store.list('Pet')).toEqual([]);
      expect(store.list('Category')).toEqual([]);
      expect(store.list('User')).toEqual([]);
      expect(store.getSchemas()).toEqual([]);
    });
  });

  describe('setIdField', () => {
    it('should set a custom ID field for a schema', () => {
      store.setIdField('User', 'username');

      expect(store.getIdField('User')).toBe('username');
    });

    it('should allow creating items with the new ID field', () => {
      store.setIdField('User', 'username');
      const user = { username: 'john', email: 'john@example.com' };

      store.create('User', user);

      expect(store.get('User', 'john')).toEqual(user);
    });

    it('should throw StoreError for empty field name', () => {
      expect(() => store.setIdField('User', '')).toThrow(StoreError);
    });

    it('should throw StoreError for non-string field name', () => {
      expect(() => store.setIdField('User', null as unknown as string)).toThrow(StoreError);
    });
  });

  describe('getIdField', () => {
    it('should return the configured ID field', () => {
      store.setIdField('User', 'username');

      expect(store.getIdField('User')).toBe('username');
    });

    it('should return default "id" for unconfigured schemas', () => {
      expect(store.getIdField('Pet')).toBe('id');
      expect(store.getIdField('Category')).toBe('id');
    });
  });

  describe('getSchemas', () => {
    it('should return empty array when no data', () => {
      expect(store.getSchemas()).toEqual([]);
    });

    it('should return all schema names with data', () => {
      store.create('Pet', { id: 1, name: 'Buddy' });
      store.create('Category', { id: 1, name: 'Dogs' });

      const schemas = store.getSchemas();

      expect(schemas).toContain('Pet');
      expect(schemas).toContain('Category');
      expect(schemas).toHaveLength(2);
    });
  });

  describe('getCount', () => {
    it('should return 0 for non-existent schema', () => {
      expect(store.getCount('Pet')).toBe(0);
    });

    it('should return correct count', () => {
      store.create('Pet', { id: 1, name: 'Buddy' });
      store.create('Pet', { id: 2, name: 'Max' });
      store.create('Pet', { id: 3, name: 'Charlie' });

      expect(store.getCount('Pet')).toBe(3);
    });

    it('should update count after delete', () => {
      store.create('Pet', { id: 1, name: 'Buddy' });
      store.create('Pet', { id: 2, name: 'Max' });

      store.delete('Pet', 1);

      expect(store.getCount('Pet')).toBe(1);
    });
  });

  describe('hasSchema', () => {
    it('should return false for non-existent schema', () => {
      expect(store.hasSchema('Pet')).toBe(false);
    });

    it('should return true for existing schema', () => {
      store.create('Pet', { id: 1, name: 'Buddy' });

      expect(store.hasSchema('Pet')).toBe(true);
    });
  });

  describe('has', () => {
    it('should return false for non-existent item', () => {
      expect(store.has('Pet', 1)).toBe(false);
    });

    it('should return true for existing item', () => {
      store.create('Pet', { id: 1, name: 'Buddy' });

      expect(store.has('Pet', 1)).toBe(true);
    });

    it('should return false after item is deleted', () => {
      store.create('Pet', { id: 1, name: 'Buddy' });
      store.delete('Pet', 1);

      expect(store.has('Pet', 1)).toBe(false);
    });
  });
});

describe('StoreError', () => {
  it('should have correct name', () => {
    const error = new StoreError('Test error');
    expect(error.name).toBe('StoreError');
  });

  it('should have correct message', () => {
    const error = new StoreError('Something went wrong');
    expect(error.message).toBe('Something went wrong');
  });

  it('should be instanceof Error', () => {
    const error = new StoreError('Test');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(StoreError);
  });

  it('should have a stack trace', () => {
    const error = new StoreError('Test');
    expect(error.stack).toBeDefined();
    expect(error.stack?.length).toBeGreaterThan(0);
  });
});
