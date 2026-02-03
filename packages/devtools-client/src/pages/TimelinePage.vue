<!--
  TimelinePage.vue - Request/Response Timeline Page

  What: Displays a real-time timeline of API requests and responses
  How: Will subscribe to WebSocket events and display request/response logs
  Why: Allows developers to monitor and debug API traffic in real-time
-->

<script setup lang="ts">
import { Clock, Trash2 } from 'lucide-vue-next';
import { ref } from 'vue';

// TODO: Will be replaced with data from timeline store
const entries = ref([
  {
    id: '1',
    method: 'GET',
    path: '/pets',
    status: 200,
    duration: 45,
    timestamp: new Date().toISOString(),
  },
  {
    id: '2',
    method: 'POST',
    path: '/pets',
    status: 201,
    duration: 78,
    timestamp: new Date().toISOString(),
  },
  {
    id: '3',
    method: 'GET',
    path: '/pets/123',
    status: 404,
    duration: 12,
    timestamp: new Date().toISOString(),
  },
  {
    id: '4',
    method: 'DELETE',
    path: '/pets/456',
    status: 500,
    duration: 234,
    timestamp: new Date().toISOString(),
  },
]);

/**
 * Get the status badge class based on status code
 */
function getStatusClass(status: number): string {
  if (status < 200) return 'status-badge--1xx';
  if (status < 300) return 'status-badge--2xx';
  if (status < 400) return 'status-badge--3xx';
  if (status < 500) return 'status-badge--4xx';
  return 'status-badge--5xx';
}

/**
 * Format timestamp for display
 */
function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

/**
 * Clear all timeline entries
 */
function clearTimeline() {
  entries.value = [];
}
</script>

<template>
  <div class="timeline-page">
    <!-- Toolbar -->
    <div class="timeline-toolbar">
      <div class="timeline-toolbar__title">
        <Clock :size="18" />
        <span>Request Timeline</span>
      </div>
      <div class="timeline-toolbar__actions">
        <span class="text-muted">{{ entries.length }} requests</span>
        <button
          class="btn btn--secondary btn--icon"
          title="Clear timeline"
          :disabled="entries.length === 0"
          @click="clearTimeline"
        >
          <Trash2 :size="16" />
        </button>
      </div>
    </div>

    <!-- Timeline List -->
    <div class="timeline-list">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="timeline-entry card"
      >
        <div class="timeline-entry__time font-mono text-muted">
          {{ formatTime(entry.timestamp) }}
        </div>
        <div class="timeline-entry__method">
          <span :class="['method-badge', `method-badge--${entry.method.toLowerCase()}`]">
            {{ entry.method }}
          </span>
        </div>
        <div class="timeline-entry__path font-mono">
          {{ entry.path }}
        </div>
        <div class="timeline-entry__status">
          <span :class="['status-badge', getStatusClass(entry.status)]">
            {{ entry.status }}
          </span>
        </div>
        <div class="timeline-entry__duration font-mono text-muted">
          {{ entry.duration }}ms
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="entries.length === 0" class="empty-state">
        <Clock :size="48" class="empty-state__icon" />
        <h3 class="empty-state__title">No requests yet</h3>
        <p class="empty-state__description">
          API requests will appear here in real-time as they are made.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--devtools-space-md);
  overflow: hidden;
}

/* Toolbar */
.timeline-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--devtools-space-md);
  margin-bottom: var(--devtools-space-md);
}

.timeline-toolbar__title {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-sm);
  font-weight: var(--font-weight-6);
  font-size: var(--font-size-2);
}

.timeline-toolbar__actions {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-md);
}

/* Timeline List */
.timeline-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--devtools-space-xs);
}

/* Timeline Entry */
.timeline-entry {
  display: grid;
  grid-template-columns: 100px 80px 1fr auto 80px;
  align-items: center;
  gap: var(--devtools-space-md);
  padding: var(--devtools-space-sm) var(--devtools-space-md);
  cursor: pointer;
  transition: background-color var(--devtools-transition-fast);
}

.timeline-entry:hover {
  background-color: var(--devtools-surface-elevated);
}

.timeline-entry__time {
  font-size: var(--font-size-0);
}

.timeline-entry__path {
  font-size: var(--font-size-1);
  color: var(--devtools-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timeline-entry__duration {
  font-size: var(--font-size-0);
  text-align: right;
}
</style>
