/**
 * Simulation Manager Unit Tests
 *
 * @see Task 5.3: Simulation Manager (basic implementation)
 * @see Task 1.6: Server Factory (integration)
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { createSimulationManager, type Simulation, type SimulationManager } from '../simulator.js';

describe('createSimulationManager', () => {
  let manager: SimulationManager;

  beforeEach(() => {
    manager = createSimulationManager();
  });

  describe('initial state', () => {
    it('should create an empty simulation manager', () => {
      expect(manager.count()).toBe(0);
      expect(manager.list()).toEqual([]);
    });
  });

  describe('set', () => {
    it('should add a simulation', () => {
      manager.set({
        path: 'GET /pets',
        operationId: 'listPets',
        status: 500,
      });

      expect(manager.count()).toBe(1);
      expect(manager.has('GET /pets')).toBe(true);
    });

    it('should update an existing simulation', () => {
      manager.set({
        path: 'GET /pets',
        operationId: 'listPets',
        status: 500,
      });

      manager.set({
        path: 'GET /pets',
        operationId: 'listPets',
        status: 404,
        delay: 100,
      });

      expect(manager.count()).toBe(1);
      const sim = manager.get('GET /pets');
      expect(sim?.status).toBe(404);
      expect(sim?.delay).toBe(100);
    });

    it('should store all simulation properties', () => {
      const simulation: Simulation = {
        path: '/pets',
        operationId: 'listPets',
        status: 500,
        delay: 1000,
        body: { error: 'Internal Server Error' },
        headers: { 'X-Error': 'true' },
      };

      manager.set(simulation);

      const stored = manager.get('/pets');
      expect(stored).toEqual(simulation);
    });

    it('should throw error for missing path', () => {
      expect(() => {
        manager.set({
          path: '',
          operationId: 'test',
          status: 500,
        });
      }).toThrow('path is required');
    });

    it('should throw error for missing status', () => {
      expect(() => {
        manager.set({
          path: 'GET /pets',
          operationId: 'test',
          status: undefined as unknown as number,
        });
      }).toThrow('status must be a valid HTTP status code');
    });

    it('should throw error for status code below 100', () => {
      expect(() => {
        manager.set({
          path: 'GET /pets',
          operationId: 'test',
          status: 99,
        });
      }).toThrow('status must be a valid HTTP status code (100-599)');
    });

    it('should throw error for status code above 599', () => {
      expect(() => {
        manager.set({
          path: 'GET /pets',
          operationId: 'test',
          status: 600,
        });
      }).toThrow('status must be a valid HTTP status code (100-599)');
    });

    it('should throw error for negative delay', () => {
      expect(() => {
        manager.set({
          path: 'GET /pets',
          operationId: 'test',
          status: 500,
          delay: -100,
        });
      }).toThrow('delay must be non-negative');
    });

    it('should accept zero delay', () => {
      expect(() => {
        manager.set({
          path: 'GET /pets',
          operationId: 'test',
          status: 500,
          delay: 0,
        });
      }).not.toThrow();
    });

    it('should accept valid status codes at boundaries', () => {
      expect(() => {
        manager.set({
          path: 'GET /pets',
          operationId: 'test',
          status: 100,
        });
      }).not.toThrow();

      expect(() => {
        manager.set({
          path: 'GET /pets2',
          operationId: 'test2',
          status: 599,
        });
      }).not.toThrow();
    });

    it('should store a copy to prevent external mutation', () => {
      const simulation: Simulation = {
        path: '/pets',
        operationId: 'listPets',
        status: 500,
      };

      manager.set(simulation);

      // Mutate original
      simulation.status = 404;

      // Stored copy should be unchanged
      const stored = manager.get('/pets');
      expect(stored?.status).toBe(500);
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent path', () => {
      expect(manager.get('GET /unknown')).toBeUndefined();
    });

    it('should return simulation for existing path', () => {
      manager.set({
        path: 'GET /pets',
        operationId: 'listPets',
        status: 500,
      });

      const sim = manager.get('GET /pets');
      expect(sim).toBeDefined();
      expect(sim?.path).toBe('GET /pets');
      expect(sim?.status).toBe(500);
    });
  });

  describe('has', () => {
    it('should return false for non-existent path', () => {
      expect(manager.has('GET /unknown')).toBe(false);
    });

    it('should return true for existing path', () => {
      manager.set({
        path: 'GET /pets',
        operationId: 'listPets',
        status: 500,
      });

      expect(manager.has('GET /pets')).toBe(true);
    });
  });

  describe('remove', () => {
    it('should return false for non-existent path', () => {
      expect(manager.remove('GET /unknown')).toBe(false);
    });

    it('should remove and return true for existing path', () => {
      manager.set({
        path: 'GET /pets',
        operationId: 'listPets',
        status: 500,
      });

      expect(manager.remove('GET /pets')).toBe(true);
      expect(manager.has('GET /pets')).toBe(false);
      expect(manager.count()).toBe(0);
    });

    it('should only remove the specified simulation', () => {
      manager.set({ path: 'a', operationId: 'a', status: 500 });
      manager.set({ path: 'b', operationId: 'b', status: 500 });
      manager.set({ path: 'c', operationId: 'c', status: 500 });

      manager.remove('b');

      expect(manager.count()).toBe(2);
      expect(manager.has('a')).toBe(true);
      expect(manager.has('b')).toBe(false);
      expect(manager.has('c')).toBe(true);
    });
  });

  describe('list', () => {
    it('should return empty array when no simulations', () => {
      expect(manager.list()).toEqual([]);
    });

    it('should return all simulations', () => {
      manager.set({ path: 'a', operationId: 'a', status: 500 });
      manager.set({ path: 'b', operationId: 'b', status: 404 });

      const list = manager.list();
      expect(list.length).toBe(2);
      expect(list.find((s) => s.path === 'a')).toBeDefined();
      expect(list.find((s) => s.path === 'b')).toBeDefined();
    });

    it('should return copies to prevent external mutation', () => {
      manager.set({ path: 'a', operationId: 'a', status: 500 });

      const list = manager.list();
      list[0].status = 404;

      // Original should be unchanged
      const stored = manager.get('a');
      expect(stored?.status).toBe(500);
    });
  });

  describe('clear', () => {
    it('should do nothing when empty', () => {
      manager.clear();
      expect(manager.count()).toBe(0);
    });

    it('should remove all simulations', () => {
      manager.set({ path: 'a', operationId: 'a', status: 500 });
      manager.set({ path: 'b', operationId: 'b', status: 404 });
      manager.set({ path: 'c', operationId: 'c', status: 503 });

      manager.clear();

      expect(manager.count()).toBe(0);
      expect(manager.list()).toEqual([]);
      expect(manager.has('a')).toBe(false);
    });
  });

  describe('count', () => {
    it('should return 0 for empty manager', () => {
      expect(manager.count()).toBe(0);
    });

    it('should return correct count', () => {
      manager.set({ path: 'a', operationId: 'a', status: 500 });
      expect(manager.count()).toBe(1);

      manager.set({ path: 'b', operationId: 'b', status: 404 });
      expect(manager.count()).toBe(2);

      manager.remove('a');
      expect(manager.count()).toBe(1);
    });
  });

  describe('simulation types', () => {
    it('should support error simulation (500)', () => {
      manager.set({
        path: '/api/data',
        operationId: 'getData',
        status: 500,
        body: { error: 'Internal Server Error' },
      });

      const sim = manager.get('/api/data');
      expect(sim?.status).toBe(500);
      expect(sim?.body).toEqual({ error: 'Internal Server Error' });
    });

    it('should support slow response simulation', () => {
      manager.set({
        path: '/api/data',
        operationId: 'getData',
        status: 200,
        delay: 3000,
      });

      const sim = manager.get('/api/data');
      expect(sim?.delay).toBe(3000);
    });

    it('should support rate limiting simulation (429)', () => {
      manager.set({
        path: '/api/data',
        operationId: 'getData',
        status: 429,
        headers: { 'Retry-After': '60' },
        body: { error: 'Too Many Requests' },
      });

      const sim = manager.get('/api/data');
      expect(sim?.status).toBe(429);
      expect(sim?.headers?.['Retry-After']).toBe('60');
    });

    it('should support not found simulation (404)', () => {
      manager.set({
        path: '/api/users/999',
        operationId: 'getUser',
        status: 404,
        body: { error: 'User not found' },
      });

      const sim = manager.get('/api/users/999');
      expect(sim?.status).toBe(404);
    });

    it('should support service unavailable simulation (503)', () => {
      manager.set({
        path: '/api/data',
        operationId: 'getData',
        status: 503,
        headers: { 'Retry-After': '300' },
        body: { error: 'Service Unavailable', message: 'Maintenance in progress' },
      });

      const sim = manager.get('/api/data');
      expect(sim?.status).toBe(503);
    });
  });

  describe('path formats', () => {
    it('should handle simple paths', () => {
      manager.set({ path: '/pets', operationId: 'listPets', status: 500 });
      expect(manager.has('/pets')).toBe(true);
    });

    it('should handle paths with parameters', () => {
      manager.set({ path: '/pets/{petId}', operationId: 'getPet', status: 404 });
      expect(manager.has('/pets/{petId}')).toBe(true);
    });

    it('should handle composite keys (METHOD path)', () => {
      manager.set({ path: 'GET /pets', operationId: 'listPets', status: 500 });
      manager.set({ path: 'POST /pets', operationId: 'createPet', status: 503 });

      expect(manager.has('GET /pets')).toBe(true);
      expect(manager.has('POST /pets')).toBe(true);
      expect(manager.get('GET /pets')?.status).toBe(500);
      expect(manager.get('POST /pets')?.status).toBe(503);
    });

    it('should handle endpoint key format (method:path)', () => {
      manager.set({ path: 'get:/pets', operationId: 'listPets', status: 500 });
      expect(manager.has('get:/pets')).toBe(true);
    });
  });
});
