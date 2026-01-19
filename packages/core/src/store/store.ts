/**
 * In-Memory Store
 *
 * What: CRUD operations for schema data with configurable ID fields
 * How: Uses Map data structures for O(1) lookups
 * Why: Enables stateful mock data that handlers can modify
 */

// TODO: Will be implemented in Task 1.3: In-Memory Store

/**
 * Store configuration options
 */
export interface StoreOptions {
  /** ID field configuration per schema */
  idFields?: Record<string, string>;
}

/**
 * Store interface for data operations
 */
export interface Store {
  /** List all items of a schema */
  list(schema: string): unknown[];
  /** Get item by ID */
  get(schema: string, id: string | number): unknown | null;
  /** Create new item */
  create(schema: string, data: unknown): unknown;
  /** Update existing item */
  update(schema: string, id: string | number, data: Partial<unknown>): unknown | null;
  /** Delete item */
  delete(schema: string, id: string | number): boolean;
  /** Clear all items of a schema */
  clear(schema: string): void;
  /** Clear all data */
  clearAll(): void;
  /** Configure identifier field for a schema */
  setIdField(schema: string, field: string): void;
  /** Get all schema names */
  getSchemas(): string[];
  /** Get item count for a schema */
  getCount(schema: string): number;
}

/**
 * Error thrown during store operations
 */
export class StoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoreError';
  }
}

/**
 * Create a new in-memory store
 *
 * @param options - Store configuration
 * @returns Store instance
 */
export function createStore(_options?: StoreOptions): Store {
  // TODO: Implement in Task 1.3
  throw new StoreError('Not implemented yet - see Task 1.3');
}
