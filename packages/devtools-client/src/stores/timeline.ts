/**
 * Timeline Store
 *
 * What: Pinia store for managing request/response timeline data
 * How: Receives and stores timeline events from the server via WebSocket
 * Why: Provides reactive access to timeline data for the Timeline Page
 *
 * @module stores/timeline
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

/**
 * HTTP method type for timeline entries
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'TRACE';

/**
 * Request log entry from the server
 */
export interface RequestLogEntry {
  id: string;
  method: string;
  path: string;
  operationId: string;
  timestamp: number;
  headers: Record<string, string>;
  query: Record<string, string | string[]>;
  body?: unknown;
}

/**
 * Response log entry from the server
 */
export interface ResponseLogEntry {
  id: string;
  requestId: string;
  status: number;
  duration: number;
  headers: Record<string, string>;
  body: unknown;
  simulated: boolean;
}

/**
 * Combined timeline entry with request and optional response
 */
export interface TimelineEntry {
  id: string;
  request: RequestLogEntry;
  response: ResponseLogEntry | null;
  status: number | null;
  duration: number | null;
  simulated: boolean;
}

/**
 * Timeline data from server
 */
export interface TimelineData {
  entries: Array<{ type: 'request' | 'response'; data: RequestLogEntry | ResponseLogEntry }>;
  count: number;
  total: number;
}

/**
 * Filter options for timeline entries
 */
export interface TimelineFilter {
  methods: HttpMethod[];
  statusCodes: ('1xx' | '2xx' | '3xx' | '4xx' | '5xx')[];
  searchQuery: string;
  simulatedOnly: boolean | null;
}

/**
 * Timeline store for request/response tracking
 *
 * Provides:
 * - Timeline entry storage and retrieval
 * - Real-time updates via WebSocket events
 * - Search and filter functionality
 * - Selected entry tracking for detail view
 * - Timeline limit management
 */
export const useTimelineStore = defineStore('timeline', () => {
  // ==========================================================================
  // State
  // ==========================================================================

  /** All timeline entries (request + response pairs) */
  const entries = ref<TimelineEntry[]>([]);

  /** Loading state */
  const isLoading = ref(false);

  /** Error state */
  const error = ref<string | null>(null);

  /** Active filters */
  const filter = ref<TimelineFilter>({
    methods: [],
    statusCodes: [],
    searchQuery: '',
    simulatedOnly: null,
  });

  /** Currently selected entry ID */
  const selectedEntryId = ref<string | null>(null);

  /** Maximum number of entries to keep */
  const maxEntries = ref(500);

  // ==========================================================================
  // Getters / Computed
  // ==========================================================================

  /**
   * Get status category from status code
   */
  function getStatusCategory(status: number): '1xx' | '2xx' | '3xx' | '4xx' | '5xx' {
    if (status < 200) return '1xx';
    if (status < 300) return '2xx';
    if (status < 400) return '3xx';
    if (status < 500) return '4xx';
    return '5xx';
  }

  /**
   * Filtered entries based on search and filters
   */
  const filteredEntries = computed(() => {
    let result = entries.value;

    // Apply search query (matches path or operationId)
    if (filter.value.searchQuery.trim()) {
      const query = filter.value.searchQuery.toLowerCase().trim();
      result = result.filter((entry) => {
        return (
          entry.request.path.toLowerCase().includes(query) ||
          entry.request.operationId.toLowerCase().includes(query)
        );
      });
    }

    // Apply method filter
    if (filter.value.methods.length > 0) {
      result = result.filter((entry) =>
        filter.value.methods.includes(entry.request.method.toUpperCase() as HttpMethod),
      );
    }

    // Apply status code filter
    if (filter.value.statusCodes.length > 0) {
      result = result.filter((entry) => {
        if (entry.status === null) return false;
        const category = getStatusCategory(entry.status);
        return filter.value.statusCodes.includes(category);
      });
    }

    // Apply simulated filter
    if (filter.value.simulatedOnly !== null) {
      result = result.filter((entry) => entry.simulated === filter.value.simulatedOnly);
    }

    return result;
  });

  /**
   * Currently selected entry
   */
  const selectedEntry = computed(() => {
    if (!selectedEntryId.value) return null;
    return entries.value.find((e) => e.id === selectedEntryId.value) ?? null;
  });

  /**
   * Total number of entries (including pending responses)
   */
  const totalCount = computed(() => entries.value.length);

  /**
   * Count of entries with responses
   */
  const completedCount = computed(() => entries.value.filter((e) => e.response !== null).length);

  /**
   * Count of pending requests (no response yet)
   */
  const pendingCount = computed(() => entries.value.filter((e) => e.response === null).length);

  /**
   * Count of entries by status category
   */
  const statusCounts = computed(() => {
    const counts = {
      '1xx': 0,
      '2xx': 0,
      '3xx': 0,
      '4xx': 0,
      '5xx': 0,
    };

    for (const entry of entries.value) {
      if (entry.status !== null) {
        const category = getStatusCategory(entry.status);
        counts[category]++;
      }
    }

    return counts;
  });

  /**
   * Average response duration in milliseconds
   */
  const averageDuration = computed(() => {
    const completedEntries = entries.value.filter((e) => e.duration !== null);
    if (completedEntries.length === 0) return 0;

    const totalDuration = completedEntries.reduce((sum, e) => sum + (e.duration ?? 0), 0);
    return Math.round(totalDuration / completedEntries.length);
  });

  // ==========================================================================
  // Actions
  // ==========================================================================

  /**
   * Add a request to the timeline
   */
  function addRequest(request: RequestLogEntry): void {
    const entry: TimelineEntry = {
      id: request.id,
      request,
      response: null,
      status: null,
      duration: null,
      simulated: false,
    };

    // Add to beginning of array (newest first)
    entries.value.unshift(entry);

    // Trim to max entries
    if (entries.value.length > maxEntries.value) {
      entries.value = entries.value.slice(0, maxEntries.value);
    }
  }

  /**
   * Add a response to an existing request
   */
  function addResponse(response: ResponseLogEntry): void {
    const entry = entries.value.find((e) => e.id === response.requestId);
    if (entry) {
      entry.response = response;
      entry.status = response.status;
      entry.duration = response.duration;
      entry.simulated = response.simulated;
    }
  }

  /**
   * Set timeline data from server response
   * Used when fetching initial timeline data
   */
  function setTimelineData(data: TimelineData): void {
    // Create a map to pair requests with responses
    const requestMap = new Map<string, TimelineEntry>();

    for (const item of data.entries) {
      if (item.type === 'request') {
        const request = item.data as RequestLogEntry;
        requestMap.set(request.id, {
          id: request.id,
          request,
          response: null,
          status: null,
          duration: null,
          simulated: false,
        });
      } else if (item.type === 'response') {
        const response = item.data as ResponseLogEntry;
        const entry = requestMap.get(response.requestId);
        if (entry) {
          entry.response = response;
          entry.status = response.status;
          entry.duration = response.duration;
          entry.simulated = response.simulated;
        }
      }
    }

    // Convert map to array and sort by timestamp (newest first)
    entries.value = Array.from(requestMap.values()).sort(
      (a, b) => b.request.timestamp - a.request.timestamp,
    );

    error.value = null;
  }

  /**
   * Clear all timeline entries
   */
  function clearTimeline(): void {
    entries.value = [];
    selectedEntryId.value = null;
  }

  /**
   * Set loading state
   */
  function setLoading(loading: boolean): void {
    isLoading.value = loading;
  }

  /**
   * Set error state
   */
  function setError(errorMessage: string): void {
    error.value = errorMessage;
    isLoading.value = false;
  }

  /**
   * Clear error state
   */
  function clearError(): void {
    error.value = null;
  }

  /**
   * Set search query
   */
  function setSearchQuery(query: string): void {
    filter.value.searchQuery = query;
  }

  /**
   * Toggle method filter
   */
  function toggleMethodFilter(method: HttpMethod): void {
    const index = filter.value.methods.indexOf(method);
    if (index === -1) {
      filter.value.methods.push(method);
    } else {
      filter.value.methods.splice(index, 1);
    }
  }

  /**
   * Toggle status code filter
   */
  function toggleStatusFilter(status: '1xx' | '2xx' | '3xx' | '4xx' | '5xx'): void {
    const index = filter.value.statusCodes.indexOf(status);
    if (index === -1) {
      filter.value.statusCodes.push(status);
    } else {
      filter.value.statusCodes.splice(index, 1);
    }
  }

  /**
   * Set simulated filter
   */
  function setSimulatedFilter(simulated: boolean | null): void {
    filter.value.simulatedOnly = simulated;
  }

  /**
   * Clear all filters
   */
  function clearFilters(): void {
    filter.value = {
      methods: [],
      statusCodes: [],
      searchQuery: '',
      simulatedOnly: null,
    };
  }

  /**
   * Check if any filter is active
   */
  function hasActiveFilters(): boolean {
    return (
      filter.value.searchQuery.trim() !== '' ||
      filter.value.methods.length > 0 ||
      filter.value.statusCodes.length > 0 ||
      filter.value.simulatedOnly !== null
    );
  }

  /**
   * Select an entry by ID
   */
  function selectEntry(id: string | null): void {
    selectedEntryId.value = id;
  }

  /**
   * Set maximum entries limit
   */
  function setMaxEntries(limit: number): void {
    maxEntries.value = limit;
    // Trim if necessary
    if (entries.value.length > limit) {
      entries.value = entries.value.slice(0, limit);
    }
  }

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    // State
    entries,
    isLoading,
    error,
    filter,
    selectedEntryId,
    maxEntries,

    // Getters
    filteredEntries,
    selectedEntry,
    totalCount,
    completedCount,
    pendingCount,
    statusCounts,
    averageDuration,

    // Actions
    addRequest,
    addResponse,
    setTimelineData,
    clearTimeline,
    setLoading,
    setError,
    clearError,
    setSearchQuery,
    toggleMethodFilter,
    toggleStatusFilter,
    setSimulatedFilter,
    clearFilters,
    hasActiveFilters,
    selectEntry,
    setMaxEntries,
  };
});
