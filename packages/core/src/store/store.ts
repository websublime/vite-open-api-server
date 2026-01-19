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
 * Generic type T allows typed operations when schema type is known
 */
export interface Store<T = unknown> {
  /** List all items of a schema */
  list(schema: string): T[];
  /** Get item by ID */
  get(schema: string, id: string | number): T | null;
  /** Create new item */
  create(schema: string, data: T): T;
  /** Update existing item */
  update<U extends T>(schema: string, id: string | number, data: Partial<U>): U | null;
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

    // Capture V8 stack trace excluding constructor frame
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, StoreError);
    }
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
