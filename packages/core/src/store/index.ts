/**
 * Store Module
 *
 * What: In-memory data store for schema data
 * How: CRUD operations with configurable ID fields per schema
 * Why: Provides stateful data management for mock responses
 *
 * @module store
 */

export { createStore, type Store, StoreError, type StoreOptions } from './store.js';
