/**
 * Models Store Tests
 *
 * What: Unit tests for the models Pinia store
 * How: Tests state management, CRUD operations, and WebSocket handlers
 * Why: Ensures reliable store data management functionality for Models Page
 *
 * Multi-spec: Tests per-spec schema storage, spec-scoped fetch URLs,
 * specId on SchemaInfo, and spec-filtered computeds.
 *
 * @module stores/__tests__/models.test
 */

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type SchemaData, type SchemaInfo, useModelsStore } from '../models';
import { useSpecsStore } from '../specs';

const DEFAULT_SPEC_ID = 'petstore';

// Mock fetch globally
global.fetch = vi.fn();

describe('useModelsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have empty schemasBySpec map', () => {
      const store = useModelsStore();
      expect(store.schemasBySpec.size).toBe(0);
    });

    it('should have empty schemas computed', () => {
      const store = useModelsStore();
      expect(store.schemas).toEqual([]);
    });

    it('should have no selected schema', () => {
      const store = useModelsStore();
      expect(store.selectedSchema).toBeNull();
    });

    it('should have no selected specId', () => {
      const store = useModelsStore();
      expect(store.selectedSpecId).toBeNull();
    });

    it('should have empty current items', () => {
      const store = useModelsStore();
      expect(store.currentItems).toEqual([]);
    });

    it('should not be loading', () => {
      const store = useModelsStore();
      expect(store.loading).toBe(false);
    });

    it('should have no error', () => {
      const store = useModelsStore();
      expect(store.error).toBeNull();
    });

    it('should not be dirty', () => {
      const store = useModelsStore();
      expect(store.isDirty).toBe(false);
    });
  });

  describe('computed properties', () => {
    it('should compute currentSchema from schemasBySpec', () => {
      const store = useModelsStore();
      const schema: SchemaInfo = {
        name: 'Pet',
        count: 10,
        idField: 'id',
        specId: DEFAULT_SPEC_ID,
      };
      store.schemasBySpec.set(DEFAULT_SPEC_ID, [schema]);
      store.selectedSchema = 'Pet';
      store.selectedSpecId = DEFAULT_SPEC_ID;

      expect(store.currentSchema).toEqual(schema);
    });

    it('should return null when no schema selected', () => {
      const store = useModelsStore();
      expect(store.currentSchema).toBeNull();
    });

    it('should return null when no specId selected', () => {
      const store = useModelsStore();
      store.selectedSchema = 'Pet';
      expect(store.currentSchema).toBeNull();
    });

    it('should compute schemaCount', () => {
      const store = useModelsStore();
      store.schemasBySpec.set(DEFAULT_SPEC_ID, [
        { name: 'Pet', count: 5, idField: 'id', specId: DEFAULT_SPEC_ID },
        { name: 'User', count: 3, idField: 'id', specId: DEFAULT_SPEC_ID },
      ]);

      expect(store.schemaCount).toBe(2);
    });

    it('should compute totalItems', () => {
      const store = useModelsStore();
      store.schemasBySpec.set(DEFAULT_SPEC_ID, [
        { name: 'Pet', count: 5, idField: 'id', specId: DEFAULT_SPEC_ID },
        { name: 'User', count: 3, idField: 'id', specId: DEFAULT_SPEC_ID },
      ]);

      expect(store.totalItems).toBe(8);
    });

    it('should detect dirty state', async () => {
      const store = useModelsStore();

      const mockData: SchemaData = {
        schema: 'Pet',
        count: 1,
        idField: 'id',
        items: [{ id: 1, name: 'Fluffy' }],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      await store.selectSchemaByName(DEFAULT_SPEC_ID, 'Pet');
      expect(store.isDirty).toBe(false);

      store.updateItems([{ id: 1, name: 'Fluffy Modified' }]);
      expect(store.isDirty).toBe(true);
    });
  });

  describe('spec filtering', () => {
    it('should return all schemas when no spec filter is active', () => {
      const store = useModelsStore();
      store.schemasBySpec.set('spec-a', [
        { name: 'Pet', count: 5, idField: 'id', specId: 'spec-a' },
      ]);
      store.schemasBySpec.set('spec-b', [
        { name: 'User', count: 3, idField: 'id', specId: 'spec-b' },
      ]);

      expect(store.schemas).toHaveLength(2);
    });

    it('should filter schemas by active spec', () => {
      const store = useModelsStore();
      const specsStore = useSpecsStore();

      store.schemasBySpec.set('spec-a', [
        { name: 'Pet', count: 5, idField: 'id', specId: 'spec-a' },
      ]);
      store.schemasBySpec.set('spec-b', [
        { name: 'User', count: 3, idField: 'id', specId: 'spec-b' },
      ]);

      specsStore.specs = [
        {
          id: 'spec-a',
          title: 'A',
          version: '1.0',
          proxyPath: '/a',
          color: '#000',
          endpointCount: 1,
          schemaCount: 1,
        },
        {
          id: 'spec-b',
          title: 'B',
          version: '1.0',
          proxyPath: '/b',
          color: '#fff',
          endpointCount: 1,
          schemaCount: 1,
        },
      ];
      specsStore.setFilter('spec-a');

      expect(store.schemas).toHaveLength(1);
      expect(store.schemas[0].name).toBe('Pet');
    });
  });

  describe('fetchSchemas', () => {
    it('should fetch schemas with spec-scoped URL', async () => {
      const store = useModelsStore();
      const mockSchemas = [
        { name: 'Pet', count: 10, idField: 'id' },
        { name: 'User', count: 5, idField: 'id' },
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ schemas: mockSchemas }),
      });

      await store.fetchSchemas(DEFAULT_SPEC_ID);

      expect(fetch).toHaveBeenCalledWith(`/_api/${DEFAULT_SPEC_ID}/store`);
      expect(store.schemas).toHaveLength(2);
      expect(store.schemas[0].specId).toBe(DEFAULT_SPEC_ID);
      expect(store.error).toBeNull();
      expect(store.loading).toBe(false);
    });

    it('should handle fetch error', async () => {
      const store = useModelsStore();

      (fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await store.fetchSchemas(DEFAULT_SPEC_ID);

      expect(store.error).toContain('Failed to fetch schemas');
    });

    it('should store schemas per-spec', async () => {
      const store = useModelsStore();

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ schemas: [{ name: 'Pet', count: 5, idField: 'id' }] }),
      });
      await store.fetchSchemas('spec-a');

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ schemas: [{ name: 'User', count: 3, idField: 'id' }] }),
      });
      await store.fetchSchemas('spec-b');

      expect(store.schemasBySpec.size).toBe(2);
      expect(store.schemasBySpec.get('spec-a')?.[0].name).toBe('Pet');
      expect(store.schemasBySpec.get('spec-b')?.[0].name).toBe('User');
    });
  });

  describe('selectSchemaByName', () => {
    it('should select schema and fetch data with spec-scoped URL', async () => {
      const store = useModelsStore();
      const mockData: SchemaData = {
        schema: 'Pet',
        count: 2,
        idField: 'id',
        items: [
          { id: 1, name: 'Fluffy' },
          { id: 2, name: 'Spot' },
        ],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      await store.selectSchemaByName(DEFAULT_SPEC_ID, 'Pet');

      expect(store.selectedSchema).toBe('Pet');
      expect(store.selectedSpecId).toBe(DEFAULT_SPEC_ID);
      expect(store.currentItems).toEqual(mockData.items);
      expect(fetch).toHaveBeenCalledWith(`/_api/${DEFAULT_SPEC_ID}/store/Pet`);
    });

    it('should not refetch when same schema and spec selected', async () => {
      const store = useModelsStore();
      store.selectedSchema = 'Pet';
      store.selectedSpecId = DEFAULT_SPEC_ID;

      await store.selectSchemaByName(DEFAULT_SPEC_ID, 'Pet');

      expect(fetch).not.toHaveBeenCalled();
    });

    it('should refetch when same schema but different spec', async () => {
      const store = useModelsStore();
      store.selectedSchema = 'Pet';
      store.selectedSpecId = 'old-spec';

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ schema: 'Pet', count: 1, idField: 'id', items: [] }),
      });

      await store.selectSchemaByName('new-spec', 'Pet');

      expect(fetch).toHaveBeenCalled();
      expect(store.selectedSpecId).toBe('new-spec');
    });
  });

  describe('updateItems', () => {
    it('should update current items', () => {
      const store = useModelsStore();
      const items = [{ id: 1, name: 'Test' }];

      store.updateItems(items);

      expect(store.currentItems).toEqual(items);
      expect(store.error).toBeNull();
    });

    it('should reject non-array values', () => {
      const store = useModelsStore();

      store.updateItems({ invalid: 'data' });

      expect(store.error).toContain('Expected an array');
    });
  });

  describe('saveItems', () => {
    it('should make POST request to spec-scoped URL', async () => {
      const store = useModelsStore();
      store.selectedSchema = 'Pet';
      store.selectedSpecId = DEFAULT_SPEC_ID;
      store.currentItems = [{ id: 1, name: 'Fluffy' }];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ created: 1 }),
      });

      await store.saveItems();

      expect(fetch).toHaveBeenCalledWith(
        `/_api/${DEFAULT_SPEC_ID}/store/Pet`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([{ id: 1, name: 'Fluffy' }]),
        }),
      );
    });

    it('should handle save error', async () => {
      const store = useModelsStore();
      store.selectedSchema = 'Pet';
      store.selectedSpecId = DEFAULT_SPEC_ID;

      (fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Save failed' }),
      });

      const result = await store.saveItems();

      expect(result).toBe(false);
      expect(store.error).toContain('Save failed');
    });

    it('should return false when no schema selected', async () => {
      const store = useModelsStore();
      const result = await store.saveItems();

      expect(result).toBe(false);
      expect(store.error).toContain('No schema selected');
    });

    it('should return false when no specId selected', async () => {
      const store = useModelsStore();
      store.selectedSchema = 'Pet';
      // selectedSpecId is still null
      const result = await store.saveItems();

      expect(result).toBe(false);
      expect(store.error).toContain('No schema selected');
    });
  });

  describe('clearSchema', () => {
    it('should clear schema with spec-scoped URL', async () => {
      const store = useModelsStore();
      store.selectedSchema = 'Pet';
      store.selectedSpecId = DEFAULT_SPEC_ID;
      store.currentItems = [{ id: 1 }];

      (fetch as any).mockResolvedValueOnce({ ok: true });

      const result = await store.clearSchema();

      expect(result).toBe(true);
      expect(store.currentItems).toEqual([]);
      expect(fetch).toHaveBeenCalledWith(
        `/_api/${DEFAULT_SPEC_ID}/store/Pet`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('should return false when no schema selected', async () => {
      const store = useModelsStore();
      const result = await store.clearSchema();

      expect(result).toBe(false);
    });
  });

  describe('discardChanges', () => {
    it('should revert to original items', async () => {
      const store = useModelsStore();

      const mockData: SchemaData = {
        schema: 'Pet',
        count: 2,
        idField: 'id',
        items: [
          { id: 1, name: 'Fluffy' },
          { id: 2, name: 'Spot' },
        ],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      await store.selectSchemaByName(DEFAULT_SPEC_ID, 'Pet');

      expect(store.currentItems).toEqual(mockData.items);
      expect(store.isDirty).toBe(false);

      store.updateItems([{ id: 1, name: 'Modified' }]);
      expect(store.isDirty).toBe(true);

      store.discardChanges();

      expect(store.currentItems).toEqual(mockData.items);
      expect(store.isDirty).toBe(false);
    });
  });

  describe('WebSocket handlers', () => {
    it('should handle store update event with specId', () => {
      const store = useModelsStore();
      store.schemasBySpec.set(DEFAULT_SPEC_ID, [
        { name: 'Pet', count: 5, idField: 'id', specId: DEFAULT_SPEC_ID },
      ]);

      store.handleStoreUpdate({
        specId: DEFAULT_SPEC_ID,
        schema: 'Pet',
        action: 'create',
        count: 6,
      });

      expect(store.schemasBySpec.get(DEFAULT_SPEC_ID)?.[0].count).toBe(6);
    });

    it('should not auto-refresh when dirty', () => {
      const store = useModelsStore();
      store.selectedSchema = 'Pet';
      store.selectedSpecId = DEFAULT_SPEC_ID;
      store.currentItems = [{ id: 1 }];
      store.updateItems([{ id: 1, name: 'Modified' }]);

      const spy = vi.spyOn(store, 'fetchSchemaData');

      store.handleStoreUpdate({
        specId: DEFAULT_SPEC_ID,
        schema: 'Pet',
        action: 'update',
        count: 2,
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it('should only auto-refresh when specId matches', () => {
      const store = useModelsStore();
      store.selectedSchema = 'Pet';
      store.selectedSpecId = DEFAULT_SPEC_ID;

      const spy = vi.spyOn(store, 'fetchSchemaData');

      store.handleStoreUpdate({
        specId: 'other-spec',
        schema: 'Pet',
        action: 'update',
        count: 2,
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it('should handle reseed complete event with specId', async () => {
      const store = useModelsStore();

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ schemas: [] }),
      });

      store.handleReseedComplete({
        specId: DEFAULT_SPEC_ID,
        success: true,
        schemas: ['Pet', 'User'],
      });

      // Wait for async operations
      await vi.waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(`/_api/${DEFAULT_SPEC_ID}/store`);
      });
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      const store = useModelsStore();
      store.schemasBySpec.set(DEFAULT_SPEC_ID, [
        { name: 'Pet', count: 1, idField: 'id', specId: DEFAULT_SPEC_ID },
      ]);
      store.selectedSchema = 'Pet';
      store.selectedSpecId = DEFAULT_SPEC_ID;
      store.currentItems = [{ id: 1 }];
      store.error = 'Error';

      store.reset();

      expect(store.schemasBySpec.size).toBe(0);
      expect(store.selectedSchema).toBeNull();
      expect(store.selectedSpecId).toBeNull();
      expect(store.currentItems).toEqual([]);
      expect(store.error).toBeNull();
    });
  });
});
