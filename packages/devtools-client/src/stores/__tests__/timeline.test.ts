/**
 * Timeline Store Tests
 *
 * What: Unit tests for the timeline Pinia store
 * How: Tests state management, computed properties, and actions
 * Why: Ensures reliable timeline functionality for the Timeline Page
 *
 * @module stores/__tests__/timeline.test
 */

import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  type RequestLogEntry,
  type ResponseLogEntry,
  type TimelineData,
  type TimelineEntry,
  useTimelineStore,
} from '../timeline';

/**
 * Create mock request log entry
 */
function createMockRequest(overrides: Partial<RequestLogEntry> = {}): RequestLogEntry {
  return {
    id: 'req-1',
    method: 'GET',
    path: '/pets',
    operationId: 'listPets',
    timestamp: Date.now(),
    headers: { 'content-type': 'application/json' },
    query: {},
    ...overrides,
  };
}

/**
 * Create mock response log entry
 */
function createMockResponse(overrides: Partial<ResponseLogEntry> = {}): ResponseLogEntry {
  return {
    id: 'res-1',
    requestId: 'req-1',
    status: 200,
    duration: 45,
    headers: { 'content-type': 'application/json' },
    body: { data: 'test' },
    simulated: false,
    ...overrides,
  };
}

/**
 * Create mock timeline entry
 */
function createMockTimelineEntry(overrides: Partial<TimelineEntry> = {}): TimelineEntry {
  const request = createMockRequest(overrides.request);
  const response = overrides.response !== undefined ? overrides.response : createMockResponse();

  return {
    id: request.id,
    request,
    response,
    status: response?.status ?? null,
    duration: response?.duration ?? null,
    simulated: response?.simulated ?? false,
    ...overrides,
  };
}

describe('useTimelineStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('should have empty entries array', () => {
      const store = useTimelineStore();
      expect(store.entries).toEqual([]);
    });

    it('should not be loading', () => {
      const store = useTimelineStore();
      expect(store.isLoading).toBe(false);
    });

    it('should have no error', () => {
      const store = useTimelineStore();
      expect(store.error).toBeNull();
    });

    it('should have empty search query', () => {
      const store = useTimelineStore();
      expect(store.filter.searchQuery).toBe('');
    });

    it('should have no selected entry', () => {
      const store = useTimelineStore();
      expect(store.selectedEntryId).toBeNull();
    });

    it('should have default max entries of 500', () => {
      const store = useTimelineStore();
      expect(store.maxEntries).toBe(500);
    });

    it('should have empty filters', () => {
      const store = useTimelineStore();
      expect(store.filter.methods).toEqual([]);
      expect(store.filter.statusCodes).toEqual([]);
      expect(store.filter.simulatedOnly).toBeNull();
    });
  });

  describe('addRequest', () => {
    it('should add a request to entries', () => {
      const store = useTimelineStore();
      const request = createMockRequest();

      store.addRequest(request);

      expect(store.entries).toHaveLength(1);
      expect(store.entries[0].id).toBe(request.id);
      expect(store.entries[0].request).toEqual(request);
      expect(store.entries[0].response).toBeNull();
    });

    it('should add new entries at the beginning (newest first)', () => {
      const store = useTimelineStore();
      const request1 = createMockRequest({ id: 'req-1' });
      const request2 = createMockRequest({ id: 'req-2' });

      store.addRequest(request1);
      store.addRequest(request2);

      expect(store.entries[0].id).toBe('req-2');
      expect(store.entries[1].id).toBe('req-1');
    });

    it('should respect max entries limit', () => {
      const store = useTimelineStore();
      store.setMaxEntries(3);

      for (let i = 0; i < 5; i++) {
        store.addRequest(createMockRequest({ id: `req-${i}` }));
      }

      expect(store.entries).toHaveLength(3);
      expect(store.entries[0].id).toBe('req-4');
      expect(store.entries[2].id).toBe('req-2');
    });
  });

  describe('addResponse', () => {
    it('should add response to matching request', () => {
      const store = useTimelineStore();
      const request = createMockRequest({ id: 'req-1' });
      const response = createMockResponse({ requestId: 'req-1', status: 200 });

      store.addRequest(request);
      store.addResponse(response);

      expect(store.entries[0].response).toEqual(response);
      expect(store.entries[0].status).toBe(200);
      expect(store.entries[0].duration).toBe(response.duration);
    });

    it('should not add response if request not found', () => {
      const store = useTimelineStore();
      const response = createMockResponse({ requestId: 'non-existent' });

      store.addResponse(response);

      expect(store.entries).toHaveLength(0);
    });

    it('should set simulated flag from response', () => {
      const store = useTimelineStore();
      const request = createMockRequest({ id: 'req-1' });
      const response = createMockResponse({ requestId: 'req-1', simulated: true });

      store.addRequest(request);
      store.addResponse(response);

      expect(store.entries[0].simulated).toBe(true);
    });

    it('should create stub entry when buffer exceeds threshold (100 responses)', () => {
      const store = useTimelineStore();

      // Add 100 orphaned responses to fill the buffer
      for (let i = 0; i < 100; i++) {
        store.addResponse(createMockResponse({ requestId: `orphan-${i}` }));
      }

      // Buffer should be full, no entries created yet
      expect(store.entries).toHaveLength(0);

      // Add one more response - should trigger stub creation for this response
      const response101 = createMockResponse({ requestId: 'orphan-101', status: 404 });
      store.addResponse(response101);

      // Should have created a stub entry for the 101st response
      expect(store.entries).toHaveLength(1);
      expect(store.entries[0].request.method).toBe('UNKNOWN');
      expect(store.entries[0].request.path).toBe('/unknown');
      expect(store.entries[0].response?.status).toBe(404);
      expect(store.entries[0].status).toBe(404);
    });

    it('should merge buffered response when request arrives later', () => {
      const store = useTimelineStore();
      const response = createMockResponse({ requestId: 'req-delayed', status: 200 });

      // Response arrives first (gets buffered)
      store.addResponse(response);
      expect(store.entries).toHaveLength(0);

      // Request arrives later
      const request = createMockRequest({ id: 'req-delayed' });
      store.addRequest(request);

      // Should have merged the buffered response with the request
      expect(store.entries).toHaveLength(1);
      expect(store.entries[0].response).toEqual(response);
      expect(store.entries[0].status).toBe(200);
    });
  });

  describe('setTimelineData', () => {
    it('should set entries from timeline data', () => {
      const store = useTimelineStore();
      const data: TimelineData = {
        entries: [
          { type: 'request', data: createMockRequest({ id: 'req-1', timestamp: 1000 }) },
          { type: 'response', data: createMockResponse({ requestId: 'req-1' }) },
        ],
        count: 2,
        total: 2,
      };

      store.setTimelineData(data);

      expect(store.entries).toHaveLength(1);
      expect(store.entries[0].id).toBe('req-1');
      expect(store.entries[0].response).not.toBeNull();
    });

    it('should pair requests with their responses', () => {
      const store = useTimelineStore();
      const data: TimelineData = {
        entries: [
          { type: 'request', data: createMockRequest({ id: 'req-1', timestamp: 1000 }) },
          { type: 'request', data: createMockRequest({ id: 'req-2', timestamp: 2000 }) },
          { type: 'response', data: createMockResponse({ requestId: 'req-1', status: 200 }) },
          { type: 'response', data: createMockResponse({ requestId: 'req-2', status: 404 }) },
        ],
        count: 4,
        total: 4,
      };

      store.setTimelineData(data);

      expect(store.entries).toHaveLength(2);
      expect(store.entries.find((e) => e.id === 'req-1')?.status).toBe(200);
      expect(store.entries.find((e) => e.id === 'req-2')?.status).toBe(404);
    });

    it('should sort entries by timestamp (newest first)', () => {
      const store = useTimelineStore();
      const data: TimelineData = {
        entries: [
          { type: 'request', data: createMockRequest({ id: 'req-1', timestamp: 1000 }) },
          { type: 'request', data: createMockRequest({ id: 'req-2', timestamp: 3000 }) },
          { type: 'request', data: createMockRequest({ id: 'req-3', timestamp: 2000 }) },
        ],
        count: 3,
        total: 3,
      };

      store.setTimelineData(data);

      expect(store.entries[0].id).toBe('req-2');
      expect(store.entries[1].id).toBe('req-3');
      expect(store.entries[2].id).toBe('req-1');
    });

    it('should clear error on set', () => {
      const store = useTimelineStore();
      store.setError('Some error');

      store.setTimelineData({ entries: [], count: 0, total: 0 });

      expect(store.error).toBeNull();
    });
  });

  describe('clearTimeline', () => {
    it('should clear all entries', () => {
      const store = useTimelineStore();
      store.addRequest(createMockRequest());
      store.addRequest(createMockRequest({ id: 'req-2' }));

      store.clearTimeline();

      expect(store.entries).toHaveLength(0);
    });

    it('should clear selected entry', () => {
      const store = useTimelineStore();
      store.addRequest(createMockRequest());
      store.selectEntry('req-1');

      store.clearTimeline();

      expect(store.selectedEntryId).toBeNull();
    });

    it('should clear response buffer when clearing timeline', () => {
      const store = useTimelineStore();

      // Add a response without a matching request (gets buffered)
      const response = createMockResponse({ requestId: 'orphaned-req' });
      store.addResponse(response);

      // Clear timeline
      store.clearTimeline();

      // Now add the matching request - it should NOT have the buffered response
      const request = createMockRequest({ id: 'orphaned-req' });
      store.addRequest(request);

      const entry = store.entries.find((e) => e.id === 'orphaned-req');
      expect(entry?.response).toBeNull();
    });
  });

  describe('loading state', () => {
    it('should set loading to true', () => {
      const store = useTimelineStore();
      store.setLoading(true);
      expect(store.isLoading).toBe(true);
    });

    it('should set loading to false', () => {
      const store = useTimelineStore();
      store.setLoading(true);
      store.setLoading(false);
      expect(store.isLoading).toBe(false);
    });
  });

  describe('error state', () => {
    it('should set error message', () => {
      const store = useTimelineStore();
      store.setError('Connection failed');
      expect(store.error).toBe('Connection failed');
    });

    it('should clear loading when error is set', () => {
      const store = useTimelineStore();
      store.setLoading(true);
      store.setError('Error');
      expect(store.isLoading).toBe(false);
    });

    it('should clear error', () => {
      const store = useTimelineStore();
      store.setError('Error');
      store.clearError();
      expect(store.error).toBeNull();
    });
  });

  describe('search functionality', () => {
    it('should set search query', () => {
      const store = useTimelineStore();
      store.setSearchQuery('pets');
      expect(store.filter.searchQuery).toBe('pets');
    });

    it('should filter entries by path', () => {
      const store = useTimelineStore();
      store.addRequest(createMockRequest({ id: 'req-1', path: '/pets', operationId: 'listPets' }));
      store.addRequest(
        createMockRequest({ id: 'req-2', path: '/users', operationId: 'listUsers' }),
      );

      store.setSearchQuery('pets');

      expect(store.filteredEntries).toHaveLength(1);
      expect(store.filteredEntries[0].request.path).toBe('/pets');
    });

    it('should filter entries by operationId', () => {
      const store = useTimelineStore();
      store.addRequest(
        createMockRequest({ id: 'req-1', path: '/api/pets', operationId: 'listPets' }),
      );
      store.addRequest(
        createMockRequest({ id: 'req-2', path: '/api/users', operationId: 'createUser' }),
      );

      store.setSearchQuery('User');

      expect(store.filteredEntries).toHaveLength(1);
      expect(store.filteredEntries[0].request.operationId).toBe('createUser');
    });

    it('should be case insensitive', () => {
      const store = useTimelineStore();
      store.addRequest(createMockRequest({ path: '/PETS' }));

      store.setSearchQuery('pets');

      expect(store.filteredEntries).toHaveLength(1);
    });
  });

  describe('method filter', () => {
    it('should toggle method filter on', () => {
      const store = useTimelineStore();
      store.toggleMethodFilter('GET');
      expect(store.filter.methods).toContain('GET');
    });

    it('should toggle method filter off', () => {
      const store = useTimelineStore();
      store.toggleMethodFilter('GET');
      store.toggleMethodFilter('GET');
      expect(store.filter.methods).not.toContain('GET');
    });

    it('should filter entries by method', () => {
      const store = useTimelineStore();
      store.addRequest(createMockRequest({ id: 'req-1', method: 'GET' }));
      store.addRequest(createMockRequest({ id: 'req-2', method: 'POST' }));

      store.toggleMethodFilter('GET');

      expect(store.filteredEntries).toHaveLength(1);
      expect(store.filteredEntries[0].request.method).toBe('GET');
    });

    it('should allow multiple method filters', () => {
      const store = useTimelineStore();
      store.addRequest(createMockRequest({ id: 'req-1', method: 'GET' }));
      store.addRequest(createMockRequest({ id: 'req-2', method: 'POST' }));
      store.addRequest(createMockRequest({ id: 'req-3', method: 'DELETE' }));

      store.toggleMethodFilter('GET');
      store.toggleMethodFilter('POST');

      expect(store.filteredEntries).toHaveLength(2);
    });
  });

  describe('status code filter', () => {
    it('should toggle status filter on', () => {
      const store = useTimelineStore();
      store.toggleStatusFilter('2xx');
      expect(store.filter.statusCodes).toContain('2xx');
    });

    it('should toggle status filter off', () => {
      const store = useTimelineStore();
      store.toggleStatusFilter('2xx');
      store.toggleStatusFilter('2xx');
      expect(store.filter.statusCodes).not.toContain('2xx');
    });

    it('should filter entries by status category', () => {
      const store = useTimelineStore();

      store.addRequest(createMockRequest({ id: 'req-1' }));
      store.addResponse(createMockResponse({ requestId: 'req-1', status: 200 }));

      store.addRequest(createMockRequest({ id: 'req-2' }));
      store.addResponse(createMockResponse({ requestId: 'req-2', status: 404 }));

      store.toggleStatusFilter('2xx');

      expect(store.filteredEntries).toHaveLength(1);
      expect(store.filteredEntries[0].status).toBe(200);
    });

    it('should exclude entries without response from status filter', () => {
      const store = useTimelineStore();
      store.addRequest(createMockRequest({ id: 'req-1' }));
      // No response added

      store.toggleStatusFilter('2xx');

      expect(store.filteredEntries).toHaveLength(0);
    });
  });

  describe('simulated filter', () => {
    it('should set simulated filter', () => {
      const store = useTimelineStore();
      store.setSimulatedFilter(true);
      expect(store.filter.simulatedOnly).toBe(true);
    });

    it('should clear simulated filter', () => {
      const store = useTimelineStore();
      store.setSimulatedFilter(true);
      store.setSimulatedFilter(null);
      expect(store.filter.simulatedOnly).toBeNull();
    });

    it('should filter entries by simulated flag', () => {
      const store = useTimelineStore();

      store.addRequest(createMockRequest({ id: 'req-1' }));
      store.addResponse(createMockResponse({ requestId: 'req-1', simulated: true }));

      store.addRequest(createMockRequest({ id: 'req-2' }));
      store.addResponse(createMockResponse({ requestId: 'req-2', simulated: false }));

      store.setSimulatedFilter(true);

      expect(store.filteredEntries).toHaveLength(1);
      expect(store.filteredEntries[0].simulated).toBe(true);
    });
  });

  describe('clearFilters', () => {
    it('should clear all filters', () => {
      const store = useTimelineStore();
      store.setSearchQuery('test');
      store.toggleMethodFilter('GET');
      store.toggleStatusFilter('2xx');
      store.setSimulatedFilter(true);

      store.clearFilters();

      expect(store.filter.searchQuery).toBe('');
      expect(store.filter.methods).toEqual([]);
      expect(store.filter.statusCodes).toEqual([]);
      expect(store.filter.simulatedOnly).toBeNull();
    });
  });

  describe('hasActiveFilters', () => {
    it('should return false when no filters active', () => {
      const store = useTimelineStore();
      expect(store.hasActiveFilters()).toBe(false);
    });

    it('should return true when search is active', () => {
      const store = useTimelineStore();
      store.setSearchQuery('test');
      expect(store.hasActiveFilters()).toBe(true);
    });

    it('should return true when method filter is active', () => {
      const store = useTimelineStore();
      store.toggleMethodFilter('GET');
      expect(store.hasActiveFilters()).toBe(true);
    });

    it('should return true when status filter is active', () => {
      const store = useTimelineStore();
      store.toggleStatusFilter('2xx');
      expect(store.hasActiveFilters()).toBe(true);
    });

    it('should return true when simulated filter is active', () => {
      const store = useTimelineStore();
      store.setSimulatedFilter(true);
      expect(store.hasActiveFilters()).toBe(true);
    });
  });

  describe('entry selection', () => {
    it('should select entry by ID', () => {
      const store = useTimelineStore();
      store.addRequest(createMockRequest({ id: 'req-1' }));

      store.selectEntry('req-1');

      expect(store.selectedEntryId).toBe('req-1');
    });

    it('should return selected entry', () => {
      const store = useTimelineStore();
      store.addRequest(createMockRequest({ id: 'req-1' }));

      store.selectEntry('req-1');

      expect(store.selectedEntry).not.toBeNull();
      expect(store.selectedEntry?.id).toBe('req-1');
    });

    it('should return null when no entry selected', () => {
      const store = useTimelineStore();
      expect(store.selectedEntry).toBeNull();
    });

    it('should return null when selected ID not found', () => {
      const store = useTimelineStore();
      store.selectEntry('non-existent');
      expect(store.selectedEntry).toBeNull();
    });

    it('should deselect entry', () => {
      const store = useTimelineStore();
      store.addRequest(createMockRequest({ id: 'req-1' }));
      store.selectEntry('req-1');

      store.selectEntry(null);

      expect(store.selectedEntryId).toBeNull();
    });
  });

  describe('computed counts', () => {
    it('should count total entries', () => {
      const store = useTimelineStore();
      store.addRequest(createMockRequest({ id: 'req-1' }));
      store.addRequest(createMockRequest({ id: 'req-2' }));

      expect(store.totalCount).toBe(2);
    });

    it('should count completed entries (with response)', () => {
      const store = useTimelineStore();
      store.addRequest(createMockRequest({ id: 'req-1' }));
      store.addResponse(createMockResponse({ requestId: 'req-1' }));
      store.addRequest(createMockRequest({ id: 'req-2' }));

      expect(store.completedCount).toBe(1);
    });

    it('should count pending entries (without response)', () => {
      const store = useTimelineStore();
      store.addRequest(createMockRequest({ id: 'req-1' }));
      store.addResponse(createMockResponse({ requestId: 'req-1' }));
      store.addRequest(createMockRequest({ id: 'req-2' }));

      expect(store.pendingCount).toBe(1);
    });

    it('should count entries by status category', () => {
      const store = useTimelineStore();

      store.addRequest(createMockRequest({ id: 'req-1' }));
      store.addResponse(createMockResponse({ requestId: 'req-1', status: 200 }));

      store.addRequest(createMockRequest({ id: 'req-2' }));
      store.addResponse(createMockResponse({ requestId: 'req-2', status: 201 }));

      store.addRequest(createMockRequest({ id: 'req-3' }));
      store.addResponse(createMockResponse({ requestId: 'req-3', status: 404 }));

      store.addRequest(createMockRequest({ id: 'req-4' }));
      store.addResponse(createMockResponse({ requestId: 'req-4', status: 500 }));

      expect(store.statusCounts['2xx']).toBe(2);
      expect(store.statusCounts['4xx']).toBe(1);
      expect(store.statusCounts['5xx']).toBe(1);
    });

    it('should calculate average duration', () => {
      const store = useTimelineStore();

      store.addRequest(createMockRequest({ id: 'req-1' }));
      store.addResponse(createMockResponse({ requestId: 'req-1', duration: 100 }));

      store.addRequest(createMockRequest({ id: 'req-2' }));
      store.addResponse(createMockResponse({ requestId: 'req-2', duration: 200 }));

      expect(store.averageDuration).toBe(150);
    });

    it('should return 0 average duration when no completed entries', () => {
      const store = useTimelineStore();
      store.addRequest(createMockRequest());

      expect(store.averageDuration).toBe(0);
    });
  });

  describe('setMaxEntries', () => {
    it('should set max entries limit', () => {
      const store = useTimelineStore();
      store.setMaxEntries(100);
      expect(store.maxEntries).toBe(100);
    });

    it('should trim entries when limit is reduced', () => {
      const store = useTimelineStore();
      for (let i = 0; i < 10; i++) {
        store.addRequest(createMockRequest({ id: `req-${i}` }));
      }

      store.setMaxEntries(5);

      expect(store.entries).toHaveLength(5);
    });
  });
});
