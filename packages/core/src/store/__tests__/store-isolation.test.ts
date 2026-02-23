/**
 * Store Isolation Tests
 *
 * What: Validates that same-named schemas across separate store instances are isolated
 * How: Creates two independent stores (simulating per-spec isolation), performs CRUD
 * Why: Ensures multi-spec orchestration where two specs both define "User" schema
 *       does not cause cross-contamination (PRD FR-007)
 *
 * @see Task 2.2.1: Test independent CRUD for same-named schemas
 * @see Task 2.2.2: Test store clear isolation
 * @see Task 2.2.3: Test per-spec idFields configuration
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createStore, type Store, StoreError } from '../store.js';

// =============================================================================
// 2.2.1: Independent CRUD for same-named schemas
// =============================================================================

describe('Store isolation: independent CRUD (Task 2.2.1)', () => {
  let storeA: Store;
  let storeB: Store;

  beforeEach(() => {
    storeA = createStore();
    storeB = createStore();
  });

  it('should create items in store A without affecting store B', () => {
    storeA.create('User', { id: 1, name: 'Alice' });
    storeA.create('User', { id: 2, name: 'Bob' });

    expect(storeA.getCount('User')).toBe(2);
    expect(storeB.hasSchema('User')).toBe(false);
    expect(storeB.getCount('User')).toBe(0);
    expect(storeB.list('User')).toEqual([]);
  });

  it('should create same-ID items independently in both stores', () => {
    storeA.create('User', { id: 1, name: 'Alice (Spec A)' });
    storeB.create('User', { id: 1, name: 'Alice (Spec B)' });

    expect(storeA.get('User', 1)).toEqual({ id: 1, name: 'Alice (Spec A)' });
    expect(storeB.get('User', 1)).toEqual({ id: 1, name: 'Alice (Spec B)' });
  });

  it('should list items independently per store', () => {
    storeA.create('User', { id: 1, name: 'Alice' });
    storeA.create('User', { id: 2, name: 'Bob' });

    storeB.create('User', { id: 10, name: 'Charlie' });

    expect(storeA.list('User')).toHaveLength(2);
    expect(storeB.list('User')).toHaveLength(1);

    expect(storeA.list('User')).toContainEqual({ id: 1, name: 'Alice' });
    expect(storeA.list('User')).toContainEqual({ id: 2, name: 'Bob' });
    expect(storeB.list('User')).toContainEqual({ id: 10, name: 'Charlie' });
  });

  it('should update items in store A without affecting store B', () => {
    storeA.create('User', { id: 1, name: 'Alice', role: 'admin' });
    storeB.create('User', { id: 1, name: 'Alice', role: 'viewer' });

    storeA.update('User', 1, { role: 'superadmin' });

    expect(storeA.get('User', 1)).toEqual({ id: 1, name: 'Alice', role: 'superadmin' });
    expect(storeB.get('User', 1)).toEqual({ id: 1, name: 'Alice', role: 'viewer' });
  });

  it('should delete items in store A without affecting store B', () => {
    storeA.create('User', { id: 1, name: 'Alice' });
    storeB.create('User', { id: 1, name: 'Alice' });

    storeA.delete('User', 1);

    expect(storeA.get('User', 1)).toBeNull();
    expect(storeA.has('User', 1)).toBe(false);
    expect(storeB.get('User', 1)).toEqual({ id: 1, name: 'Alice' });
    expect(storeB.has('User', 1)).toBe(true);
  });

  it('should support full CRUD lifecycle independently on both stores', () => {
    // Create
    storeA.create('User', { id: 1, name: 'Alice' });
    storeB.create('User', { id: 1, name: 'Bob' });

    // Read
    expect(storeA.get('User', 1)).toEqual({ id: 1, name: 'Alice' });
    expect(storeB.get('User', 1)).toEqual({ id: 1, name: 'Bob' });

    // Update
    storeA.update('User', 1, { name: 'Alice Updated' });
    expect(storeA.get('User', 1)).toEqual({ id: 1, name: 'Alice Updated' });
    expect(storeB.get('User', 1)).toEqual({ id: 1, name: 'Bob' });

    // Delete
    storeA.delete('User', 1);
    expect(storeA.has('User', 1)).toBe(false);
    expect(storeB.has('User', 1)).toBe(true);
    expect(storeB.get('User', 1)).toEqual({ id: 1, name: 'Bob' });
  });

  it('should isolate multiple schemas across stores', () => {
    storeA.create('User', { id: 1, name: 'Alice' });
    storeA.create('Pet', { id: 1, name: 'Rex' });

    storeB.create('User', { id: 1, name: 'Bob' });
    storeB.create('Pet', { id: 1, name: 'Buddy' });

    expect(storeA.getSchemas()).toContain('User');
    expect(storeA.getSchemas()).toContain('Pet');
    expect(storeA.get('User', 1)).toEqual({ id: 1, name: 'Alice' });
    expect(storeA.get('Pet', 1)).toEqual({ id: 1, name: 'Rex' });

    expect(storeB.get('User', 1)).toEqual({ id: 1, name: 'Bob' });
    expect(storeB.get('Pet', 1)).toEqual({ id: 1, name: 'Buddy' });
  });
});

// =============================================================================
// 2.2.2: Store clear isolation
// =============================================================================

describe('Store isolation: clear (Task 2.2.2)', () => {
  let storeA: Store;
  let storeB: Store;

  beforeEach(() => {
    storeA = createStore();
    storeB = createStore();

    // Pre-populate both stores with same-named schema
    storeA.create('User', { id: 1, name: 'Alice' });
    storeA.create('User', { id: 2, name: 'Bob' });
    storeB.create('User', { id: 1, name: 'Charlie' });
    storeB.create('User', { id: 2, name: 'Diana' });
  });

  it('should not affect store B when clearing a schema in store A', () => {
    storeA.clear('User');

    expect(storeA.list('User')).toEqual([]);
    expect(storeA.hasSchema('User')).toBe(false);
    expect(storeA.getCount('User')).toBe(0);

    expect(storeB.list('User')).toHaveLength(2);
    expect(storeB.hasSchema('User')).toBe(true);
    expect(storeB.getCount('User')).toBe(2);
    expect(storeB.get('User', 1)).toEqual({ id: 1, name: 'Charlie' });
    expect(storeB.get('User', 2)).toEqual({ id: 2, name: 'Diana' });
  });

  it('should not affect store B when calling clearAll on store A', () => {
    // Add another schema to store A
    storeA.create('Pet', { id: 1, name: 'Rex' });

    storeA.clearAll();

    expect(storeA.getSchemas()).toEqual([]);
    expect(storeA.list('User')).toEqual([]);
    expect(storeA.list('Pet')).toEqual([]);

    expect(storeB.list('User')).toHaveLength(2);
    expect(storeB.get('User', 1)).toEqual({ id: 1, name: 'Charlie' });
  });

  it('should allow re-populating store A after clear without affecting store B', () => {
    storeA.clear('User');
    storeA.create('User', { id: 10, name: 'Eve' });

    expect(storeA.list('User')).toHaveLength(1);
    expect(storeA.get('User', 10)).toEqual({ id: 10, name: 'Eve' });

    // Store B should still have its original data
    expect(storeB.list('User')).toHaveLength(2);
    expect(storeB.get('User', 1)).toEqual({ id: 1, name: 'Charlie' });
  });

  it('should allow independent clearAll and re-population cycles', () => {
    // Clear store A completely
    storeA.clearAll();

    // Re-populate store A with different data
    storeA.create('User', { id: 100, name: 'Frank' });
    storeA.create('Order', { id: 1, total: 99.99 });

    // Clear store B's User schema only
    storeB.clear('User');
    storeB.create('User', { id: 200, name: 'Grace' });

    // Verify independence
    expect(storeA.list('User')).toEqual([{ id: 100, name: 'Frank' }]);
    expect(storeA.list('Order')).toEqual([{ id: 1, total: 99.99 }]);
    expect(storeB.list('User')).toEqual([{ id: 200, name: 'Grace' }]);
    expect(storeB.hasSchema('Order')).toBe(false);
  });
});

// =============================================================================
// 2.2.3: Per-spec idFields configuration
// =============================================================================

describe('Store isolation: per-spec idFields (Task 2.2.3)', () => {
  it('should apply different idFields per store instance', () => {
    const storeA = createStore({ idFields: { User: 'username' } });
    const storeB = createStore({ idFields: { User: 'email' } });

    storeA.create('User', { username: 'alice', email: 'alice@a.com' });
    storeB.create('User', { username: 'alice', email: 'alice@b.com' });

    // Store A uses 'username' as ID
    expect(storeA.get('User', 'alice')).toEqual({ username: 'alice', email: 'alice@a.com' });
    expect(storeA.getIdField('User')).toBe('username');

    // Store B uses 'email' as ID
    expect(storeB.get('User', 'alice@b.com')).toEqual({ username: 'alice', email: 'alice@b.com' });
    expect(storeB.getIdField('User')).toBe('email');
  });

  it('should allow one store to use default ID while another uses custom', () => {
    const storeA = createStore(); // default: 'id'
    const storeB = createStore({ idFields: { User: 'userId' } });

    storeA.create('User', { id: 1, name: 'Alice' });
    storeB.create('User', { userId: 1, name: 'Bob' });

    expect(storeA.get('User', 1)).toEqual({ id: 1, name: 'Alice' });
    expect(storeB.get('User', 1)).toEqual({ userId: 1, name: 'Bob' });

    expect(storeA.getIdField('User')).toBe('id');
    expect(storeB.getIdField('User')).toBe('userId');
  });

  it('should apply idFields per schema independently across stores', () => {
    const storeA = createStore({ idFields: { Pet: 'petId', User: 'username' } });
    const storeB = createStore({ idFields: { Pet: 'tag', User: 'email' } });

    storeA.create('Pet', { petId: 'p1', name: 'Rex' });
    storeA.create('User', { username: 'alice', name: 'Alice' });

    storeB.create('Pet', { tag: 'T001', name: 'Buddy' });
    storeB.create('User', { email: 'bob@test.com', name: 'Bob' });

    expect(storeA.get('Pet', 'p1')).toEqual({ petId: 'p1', name: 'Rex' });
    expect(storeA.get('User', 'alice')).toEqual({ username: 'alice', name: 'Alice' });

    expect(storeB.get('Pet', 'T001')).toEqual({ tag: 'T001', name: 'Buddy' });
    expect(storeB.get('User', 'bob@test.com')).toEqual({ email: 'bob@test.com', name: 'Bob' });
  });

  it('should enforce idFields independently — missing custom ID field throws only in that store', () => {
    const storeA = createStore({ idFields: { User: 'username' } });
    const storeB = createStore(); // default: 'id'

    // Store A requires 'username' field
    expect(() => storeA.create('User', { id: 1, name: 'Alice' })).toThrow(StoreError);
    expect(() => storeA.create('User', { id: 1, name: 'Alice' })).toThrow(/username/);

    // Store B uses default 'id' field — same data works fine
    expect(() => storeB.create('User', { id: 1, name: 'Alice' })).not.toThrow();
    expect(storeB.get('User', 1)).toEqual({ id: 1, name: 'Alice' });
  });

  it('should update using the correct idField per store', () => {
    const storeA = createStore({ idFields: { User: 'username' } });
    const storeB = createStore({ idFields: { User: 'email' } });

    storeA.create('User', { username: 'alice', role: 'admin' });
    storeB.create('User', { email: 'alice@test.com', role: 'viewer' });

    storeA.update('User', 'alice', { role: 'superadmin' });
    storeB.update('User', 'alice@test.com', { role: 'editor' });

    expect(storeA.get('User', 'alice')).toEqual({ username: 'alice', role: 'superadmin' });
    expect(storeB.get('User', 'alice@test.com')).toEqual({
      email: 'alice@test.com',
      role: 'editor',
    });
  });

  it('should delete using the correct idField per store', () => {
    const storeA = createStore({ idFields: { User: 'username' } });
    const storeB = createStore({ idFields: { User: 'email' } });

    storeA.create('User', { username: 'alice', name: 'Alice' });
    storeB.create('User', { email: 'alice@test.com', name: 'Alice' });

    storeA.delete('User', 'alice');

    expect(storeA.has('User', 'alice')).toBe(false);
    expect(storeB.has('User', 'alice@test.com')).toBe(true);
  });
});
