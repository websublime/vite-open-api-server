/**
 * In-Memory Store
 *
 * What: CRUD operations for schema data with configurable ID fields
 * How: Uses Map data structures for O(1) lookups
 * Why: Enables stateful mock data that handlers can modify
 *
 * @module store
 */

/**
 * Store configuration options
 */
export interface StoreOptions {
  /** ID field configuration per schema (default: 'id') */
  idFields?: Record<string, string>;
}

/**
 * Store interface for data operations
 *
 * The store manages collections of items organized by schema name.
 * Each item is identified by a configurable ID field (default: 'id').
 *
 * Note: The store is schema-agnostic and stores items as `unknown`.
 * Type safety should be enforced at the handler/seed level.
 */
export interface Store {
  /** List all items of a schema */
  list(schema: string): unknown[];
  /** Get item by ID */
  get(schema: string, id: string | number): unknown | null;
  /** Create new item (must have the ID field defined for this schema) */
  create(schema: string, data: unknown): unknown;
  /** Update existing item (merge with existing data) */
  update(schema: string, id: string | number, data: Record<string, unknown>): unknown | null;
  /** Delete item by ID */
  delete(schema: string, id: string | number): boolean;
  /** Clear all items of a schema */
  clear(schema: string): void;
  /** Clear all data across all schemas */
  clearAll(): void;
  /** Configure identifier field for a schema */
  setIdField(schema: string, field: string): void;
  /** Get the configured ID field for a schema */
  getIdField(schema: string): string;
  /** Get all schema names that have data */
  getSchemas(): string[];
  /** Get item count for a schema */
  getCount(schema: string): number;
  /** Check if a schema exists in the store */
  hasSchema(schema: string): boolean;
  /** Check if an item exists */
  has(schema: string, id: string | number): boolean;
}

/**
 * Error thrown during store operations
 */
export class StoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoreError';

    // Capture V8 stack trace excluding constructor frame
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, StoreError);
    }
  }
}

/** Default ID field name when not configured */
const DEFAULT_ID_FIELD = 'id';

/**
 * Create a new in-memory store
 *
 * The store provides CRUD operations for schema-based data with O(1) lookups.
 * Each schema maintains its own collection of items, identified by a configurable
 * ID field (defaults to 'id').
 *
 * @example
 * ```typescript
 * const store = createStore({ idFields: { User: 'username' } });
 *
 * // Create items
 * store.create('Pet', { id: 1, name: 'Buddy' });
 * store.create('User', { username: 'john', email: 'john@example.com' });
 *
 * // Retrieve items
 * const pet = store.get('Pet', 1);
 * const user = store.get('User', 'john');
 *
 * // Update items
 * store.update('Pet', 1, { status: 'adopted' });
 *
 * // List all items
 * const allPets = store.list('Pet');
 * ```
 *
 * @param options - Store configuration
 * @returns Store instance
 */
export function createStore(options?: StoreOptions): Store {
  /**
   * Main data storage: schema name -> (item ID -> item data)
   * Uses nested Maps for O(1) lookup by schema and ID
   */
  const data = new Map<string, Map<string | number, unknown>>();

  /**
   * ID field configuration per schema
   * Allows schemas to use different fields as their primary identifier
   */
  const idFields = new Map<string, string>(Object.entries(options?.idFields ?? {}));

  /**
   * Get the ID field name for a schema
   */
  function getIdFieldForSchema(schema: string): string {
    return idFields.get(schema) ?? DEFAULT_ID_FIELD;
  }

  /**
   * Extract the ID value from an item using the schema's configured ID field
   * @throws {StoreError} If the item is missing the ID field or ID is null/undefined
   */
  function extractId(schema: string, item: unknown): string | number {
    if (!item || typeof item !== 'object') {
      throw new StoreError(`Cannot extract ID from ${typeof item}: expected an object`);
    }

    const field = getIdFieldForSchema(schema);
    const record = item as Record<string, unknown>;
    const id = record[field];

    if (id === undefined || id === null) {
      throw new StoreError(`Item is missing required ID field '${field}' for schema '${schema}'`);
    }

    if (typeof id !== 'string' && typeof id !== 'number') {
      throw new StoreError(`ID field '${field}' must be a string or number, got ${typeof id}`);
    }

    return id;
  }

  /**
   * Get or create the data map for a schema
   */
  function ensureSchema(schema: string): Map<string | number, unknown> {
    let schemaData = data.get(schema);
    if (!schemaData) {
      schemaData = new Map();
      data.set(schema, schemaData);
    }
    return schemaData;
  }

  const store: Store = {
    list(schema: string): unknown[] {
      const schemaData = data.get(schema);
      if (!schemaData) {
        return [];
      }
      return Array.from(schemaData.values());
    },

    get(schema: string, id: string | number): unknown | null {
      const schemaData = data.get(schema);
      if (!schemaData) {
        return null;
      }
      const item = schemaData.get(id);
      return item ?? null;
    },

    create(schema: string, item: unknown): unknown {
      const id = extractId(schema, item);
      const schemaData = ensureSchema(schema);

      // Check for duplicates
      if (schemaData.has(id)) {
        throw new StoreError(`Item with ID '${id}' already exists in schema '${schema}'`);
      }

      schemaData.set(id, item);
      return item;
    },

    update(schema: string, id: string | number, updates: Record<string, unknown>): unknown | null {
      const schemaData = data.get(schema);
      if (!schemaData) {
        return null;
      }

      const existing = schemaData.get(id);
      if (!existing) {
        return null;
      }

      // Merge existing data with updates
      const updated = {
        ...(existing as object),
        ...(updates as object),
      };

      schemaData.set(id, updated);
      return updated;
    },

    delete(schema: string, id: string | number): boolean {
      const schemaData = data.get(schema);
      if (!schemaData) {
        return false;
      }
      return schemaData.delete(id);
    },

    clear(schema: string): void {
      const schemaData = data.get(schema);
      if (schemaData) {
        schemaData.clear();
      }
    },

    clearAll(): void {
      data.clear();
    },

    setIdField(schema: string, field: string): void {
      if (!field || typeof field !== 'string') {
        throw new StoreError('ID field must be a non-empty string');
      }
      idFields.set(schema, field);
    },

    getIdField(schema: string): string {
      return getIdFieldForSchema(schema);
    },

    getSchemas(): string[] {
      return Array.from(data.keys());
    },

    getCount(schema: string): number {
      const schemaData = data.get(schema);
      return schemaData?.size ?? 0;
    },

    hasSchema(schema: string): boolean {
      return data.has(schema);
    },

    has(schema: string, id: string | number): boolean {
      const schemaData = data.get(schema);
      return schemaData?.has(id) ?? false;
    },
  };

  return store;
}
