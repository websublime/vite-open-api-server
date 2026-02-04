<!--
  TimelineDetail.vue - Timeline Entry Detail Panel

  What: Displays full request and response details for a selected timeline entry
  How: Shows headers, query params, body content in organized collapsible sections
  Why: Allows developers to inspect API traffic in detail for debugging
-->

<script setup lang="ts">
import { Check, ChevronDown, ChevronRight, Clock, Copy, Zap } from 'lucide-vue-next';

import { computed, ref } from 'vue';

import type { TimelineEntry } from '@/stores/timeline';

import { getMethodLabel } from '@/utils/format';

/**
 * Component props
 */
interface Props {
  /** The timeline entry to display */
  entry: TimelineEntry | null;
}

const props = defineProps<Props>();

/**
 * Section expansion state
 */
const expandedSections = ref({
  requestHeaders: true,
  requestQuery: true,
  requestBody: true,
  responseHeaders: true,
  responseBody: true,
});

/**
 * Copy feedback state
 */
const copiedField = ref<string | null>(null);

/**
 * Format timestamp for display
 */
const formattedTimestamp = computed(() => {
  if (!props.entry) return '';
  const date = new Date(props.entry.request.timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hour12: false,
  });
});

/**
 * Format duration for display
 */
const formattedDuration = computed(() => {
  if (!props.entry?.duration) return 'pending...';
  if (props.entry.duration < 1000) {
    return `${props.entry.duration}ms`;
  }
  return `${(props.entry.duration / 1000).toFixed(2)}s`;
});

/**
 * Get status badge class based on status code
 */
const statusClass = computed(() => {
  if (!props.entry?.status) return 'status-badge--pending';
  if (props.entry.status < 200) return 'status-badge--1xx';
  if (props.entry.status < 300) return 'status-badge--2xx';
  if (props.entry.status < 400) return 'status-badge--3xx';
  if (props.entry.status < 500) return 'status-badge--4xx';
  return 'status-badge--5xx';
});

/**
 * Check if request has query parameters
 */
const hasQueryParams = computed(() => {
  if (!props.entry?.request.query) return false;
  return Object.keys(props.entry.request.query).length > 0;
});

/**
 * Check if request has headers
 */
const hasRequestHeaders = computed(() => {
  if (!props.entry?.request.headers) return false;
  return Object.keys(props.entry.request.headers).length > 0;
});

/**
 * Check if request has body
 */
const hasRequestBody = computed(() => {
  return props.entry?.request.body !== undefined && props.entry?.request.body !== null;
});

/**
 * Check if response has headers
 */
const hasResponseHeaders = computed(() => {
  if (!props.entry?.response?.headers) return false;
  return Object.keys(props.entry.response.headers).length > 0;
});

/**
 * Check if response has body
 */
const hasResponseBody = computed(() => {
  return props.entry?.response?.body !== undefined && props.entry?.response?.body !== null;
});

/**
 * Format JSON for display
 */
function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Toggle section expansion
 */
function toggleSection(section: keyof typeof expandedSections.value): void {
  expandedSections.value[section] = !expandedSections.value[section];
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text: string, fieldId: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    copiedField.value = fieldId;
    setTimeout(() => {
      copiedField.value = null;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}

/**
 * Copy full entry as JSON
 */
async function copyFullEntry(): Promise<void> {
  if (!props.entry) return;
  const data = {
    request: props.entry.request,
    response: props.entry.response,
  };
  await copyToClipboard(JSON.stringify(data, null, 2), 'full');
}
</script>

<template>
  <div class="timeline-detail">
    <!-- Empty state -->
    <div v-if="!entry" class="timeline-detail__empty">
      <Clock :size="48" class="timeline-detail__empty-icon" />
      <h3 class="timeline-detail__empty-title">Select an entry</h3>
      <p class="timeline-detail__empty-description">
        Click on a timeline entry to view its details.
      </p>
    </div>

    <!-- Entry details -->
    <div v-else class="timeline-detail__content">
      <!-- Header with summary -->
      <div class="timeline-detail__header">
        <div class="timeline-detail__summary">
          <span :class="['method-badge', `method-badge--${entry.request.method.toLowerCase()}`]">
            {{ getMethodLabel(entry.request.method) }}
          </span>
          <span class="timeline-detail__path font-mono">{{ entry.request.path }}</span>
        </div>

        <div class="timeline-detail__meta">
          <span v-if="entry.status !== null" :class="['status-badge', statusClass]">
            {{ entry.status }}
          </span>
          <span v-else class="status-badge status-badge--pending">pending</span>

          <span class="timeline-detail__duration">
            <Clock :size="14" />
            {{ formattedDuration }}
          </span>

          <span v-if="entry.simulated" class="timeline-detail__simulated" title="Simulated response">
            <Zap :size="14" />
            Simulated
          </span>
        </div>

        <div class="timeline-detail__actions">
          <button
            type="button"
            class="btn btn--ghost btn--sm"
            title="Copy as JSON"
            @click="copyFullEntry"
          >
            <component :is="copiedField === 'full' ? Check : Copy" :size="14" />
            {{ copiedField === 'full' ? 'Copied!' : 'Copy JSON' }}
          </button>
        </div>
      </div>

      <!-- Info section -->
      <div class="timeline-detail__info">
        <div class="timeline-detail__info-item">
          <span class="timeline-detail__info-label">Timestamp</span>
          <span class="timeline-detail__info-value font-mono">{{ formattedTimestamp }}</span>
        </div>
        <div class="timeline-detail__info-item">
          <span class="timeline-detail__info-label">Operation ID</span>
          <span class="timeline-detail__info-value font-mono">{{ entry.request.operationId }}</span>
        </div>
        <div class="timeline-detail__info-item">
          <span class="timeline-detail__info-label">Request ID</span>
          <span class="timeline-detail__info-value font-mono">{{ entry.id }}</span>
        </div>
      </div>

      <!-- Request section -->
      <div class="timeline-detail__section">
        <h3 class="timeline-detail__section-title">Request</h3>

        <!-- Query Parameters -->
        <div v-if="hasQueryParams" class="timeline-detail__subsection">
          <button
            type="button"
            class="timeline-detail__subsection-header"
            @click="toggleSection('requestQuery')"
          >
            <component
              :is="expandedSections.requestQuery ? ChevronDown : ChevronRight"
              :size="16"
            />
            <span>Query Parameters</span>
            <span class="text-muted">({{ Object.keys(entry.request.query).length }})</span>
          </button>
          <div v-show="expandedSections.requestQuery" class="timeline-detail__subsection-content">
            <div
              v-for="(value, key) in entry.request.query"
              :key="key"
              class="timeline-detail__kv-row"
            >
              <span class="timeline-detail__kv-key font-mono">{{ key }}</span>
              <span class="timeline-detail__kv-value font-mono">
                {{ Array.isArray(value) ? value.join(', ') : value }}
              </span>
            </div>
          </div>
        </div>

        <!-- Request Headers -->
        <div v-if="hasRequestHeaders" class="timeline-detail__subsection">
          <button
            type="button"
            class="timeline-detail__subsection-header"
            @click="toggleSection('requestHeaders')"
          >
            <component
              :is="expandedSections.requestHeaders ? ChevronDown : ChevronRight"
              :size="16"
            />
            <span>Headers</span>
            <span class="text-muted">({{ Object.keys(entry.request.headers).length }})</span>
          </button>
          <div v-show="expandedSections.requestHeaders" class="timeline-detail__subsection-content">
            <div
              v-for="(value, key) in entry.request.headers"
              :key="key"
              class="timeline-detail__kv-row"
            >
              <span class="timeline-detail__kv-key font-mono">{{ key }}</span>
              <span class="timeline-detail__kv-value font-mono">{{ value }}</span>
            </div>
          </div>
        </div>

        <!-- Request Body -->
        <div v-if="hasRequestBody" class="timeline-detail__subsection">
          <button
            type="button"
            class="timeline-detail__subsection-header"
            @click="toggleSection('requestBody')"
          >
            <component
              :is="expandedSections.requestBody ? ChevronDown : ChevronRight"
              :size="16"
            />
            <span>Body</span>
            <button
              type="button"
              class="btn btn--ghost btn--icon btn--sm"
              title="Copy body"
              @click.stop="copyToClipboard(formatJson(entry.request.body), 'reqBody')"
            >
              <component :is="copiedField === 'reqBody' ? Check : Copy" :size="12" />
            </button>
          </button>
          <div v-show="expandedSections.requestBody" class="timeline-detail__subsection-content">
            <pre class="timeline-detail__json">{{ formatJson(entry.request.body) }}</pre>
          </div>
        </div>
      </div>

      <!-- Response section -->
      <div v-if="entry.response" class="timeline-detail__section">
        <h3 class="timeline-detail__section-title">Response</h3>

        <!-- Response Headers -->
        <div v-if="hasResponseHeaders" class="timeline-detail__subsection">
          <button
            type="button"
            class="timeline-detail__subsection-header"
            @click="toggleSection('responseHeaders')"
          >
            <component
              :is="expandedSections.responseHeaders ? ChevronDown : ChevronRight"
              :size="16"
            />
            <span>Headers</span>
            <span class="text-muted">({{ Object.keys(entry.response.headers).length }})</span>
          </button>
          <div v-show="expandedSections.responseHeaders" class="timeline-detail__subsection-content">
            <div
              v-for="(value, key) in entry.response.headers"
              :key="key"
              class="timeline-detail__kv-row"
            >
              <span class="timeline-detail__kv-key font-mono">{{ key }}</span>
              <span class="timeline-detail__kv-value font-mono">{{ value }}</span>
            </div>
          </div>
        </div>

        <!-- Response Body -->
        <div v-if="hasResponseBody" class="timeline-detail__subsection">
          <button
            type="button"
            class="timeline-detail__subsection-header"
            @click="toggleSection('responseBody')"
          >
            <component
              :is="expandedSections.responseBody ? ChevronDown : ChevronRight"
              :size="16"
            />
            <span>Body</span>
            <button
              type="button"
              class="btn btn--ghost btn--icon btn--sm"
              title="Copy body"
              @click.stop="copyToClipboard(formatJson(entry.response.body), 'resBody')"
            >
              <component :is="copiedField === 'resBody' ? Check : Copy" :size="12" />
            </button>
          </button>
          <div v-show="expandedSections.responseBody" class="timeline-detail__subsection-content">
            <pre class="timeline-detail__json">{{ formatJson(entry.response.body) }}</pre>
          </div>
        </div>
      </div>

      <!-- Pending response state -->
      <div v-else class="timeline-detail__section timeline-detail__section--pending">
        <h3 class="timeline-detail__section-title">Response</h3>
        <div class="timeline-detail__pending">
          <Clock :size="24" class="timeline-detail__pending-icon" />
          <span class="text-muted">Waiting for response...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Empty state */
.timeline-detail__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--devtools-space-xl);
  text-align: center;
}

.timeline-detail__empty-icon {
  color: var(--devtools-text-muted);
  opacity: 0.5;
  margin-bottom: var(--devtools-space-md);
}

.timeline-detail__empty-title {
  font-size: var(--font-size-3);
  font-weight: var(--font-weight-6);
  color: var(--devtools-text);
  margin: 0 0 var(--devtools-space-sm) 0;
}

.timeline-detail__empty-description {
  font-size: var(--font-size-1);
  color: var(--devtools-text-muted);
  margin: 0;
}

/* Content */
.timeline-detail__content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}

/* Header */
.timeline-detail__header {
  display: flex;
  flex-direction: column;
  gap: var(--devtools-space-sm);
  padding: var(--devtools-space-md);
  background-color: var(--devtools-surface);
  border-bottom: 1px solid var(--devtools-border);
}

.timeline-detail__summary {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-sm);
}

.timeline-detail__path {
  font-size: var(--font-size-2);
  font-weight: var(--font-weight-5);
  color: var(--devtools-text);
  word-break: break-all;
}

.timeline-detail__meta {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-md);
}

.timeline-detail__duration {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-xs);
  font-size: var(--font-size-0);
  color: var(--devtools-text-muted);
}

.timeline-detail__simulated {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-xs);
  font-size: var(--font-size-0);
  color: var(--devtools-warning);
}

.timeline-detail__actions {
  display: flex;
  gap: var(--devtools-space-sm);
}

/* Info section */
.timeline-detail__info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--devtools-space-md);
  padding: var(--devtools-space-md);
  background-color: var(--devtools-surface-elevated);
  border-bottom: 1px solid var(--devtools-border);
}

.timeline-detail__info-item {
  display: flex;
  flex-direction: column;
  gap: var(--devtools-space-xs);
}

.timeline-detail__info-label {
  font-size: var(--font-size-0);
  font-weight: var(--font-weight-5);
  color: var(--devtools-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.timeline-detail__info-value {
  font-size: var(--font-size-1);
  color: var(--devtools-text);
}

/* Section */
.timeline-detail__section {
  padding: var(--devtools-space-md);
  border-bottom: 1px solid var(--devtools-border);
}

.timeline-detail__section:last-child {
  border-bottom: none;
}

.timeline-detail__section-title {
  font-size: var(--font-size-1);
  font-weight: var(--font-weight-6);
  color: var(--devtools-text);
  margin: 0 0 var(--devtools-space-md) 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Subsection */
.timeline-detail__subsection {
  margin-bottom: var(--devtools-space-sm);
}

.timeline-detail__subsection:last-child {
  margin-bottom: 0;
}

.timeline-detail__subsection-header {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-xs);
  width: 100%;
  padding: var(--devtools-space-xs) var(--devtools-space-sm);
  background-color: var(--devtools-surface);
  border: 1px solid var(--devtools-border);
  border-radius: var(--devtools-radius-sm);
  font-family: var(--devtools-font-sans);
  font-size: var(--font-size-1);
  font-weight: var(--font-weight-5);
  color: var(--devtools-text);
  text-align: left;
  cursor: pointer;
  transition: all var(--devtools-transition-fast);
}

.timeline-detail__subsection-header:hover {
  background-color: var(--devtools-surface-elevated);
}

.timeline-detail__subsection-content {
  margin-top: var(--devtools-space-xs);
  padding: var(--devtools-space-sm);
  background-color: var(--devtools-surface);
  border: 1px solid var(--devtools-border);
  border-radius: var(--devtools-radius-sm);
}

/* Key-value rows */
.timeline-detail__kv-row {
  display: grid;
  grid-template-columns: minmax(120px, auto) 1fr;
  gap: var(--devtools-space-md);
  padding: var(--devtools-space-xs) 0;
  border-bottom: 1px solid var(--devtools-border);
}

.timeline-detail__kv-row:last-child {
  border-bottom: none;
}

.timeline-detail__kv-key {
  font-size: var(--font-size-0);
  font-weight: var(--font-weight-5);
  color: var(--devtools-text-muted);
  word-break: break-all;
}

.timeline-detail__kv-value {
  font-size: var(--font-size-0);
  color: var(--devtools-text);
  word-break: break-all;
}

/* JSON display */
.timeline-detail__json {
  margin: 0;
  padding: var(--devtools-space-sm);
  background-color: var(--devtools-bg);
  border-radius: var(--devtools-radius-sm);
  font-family: var(--devtools-font-mono);
  font-size: var(--font-size-0);
  color: var(--devtools-text);
  white-space: pre-wrap;
  word-break: break-all;
  overflow-x: auto;
}

/* Status badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--devtools-space-xs);
  padding: 2px var(--devtools-space-sm);
  border-radius: var(--devtools-radius-sm);
  font-size: var(--font-size-0);
  font-weight: var(--font-weight-5);
  font-family: var(--devtools-font-mono);
}

.status-badge--pending {
  background-color: color-mix(in srgb, var(--devtools-text-muted) 15%, transparent);
  color: var(--devtools-text-muted);
}

.status-badge--1xx {
  background-color: color-mix(in srgb, var(--devtools-info) 15%, transparent);
  color: var(--devtools-info);
}

.status-badge--2xx {
  background-color: color-mix(in srgb, var(--devtools-success) 15%, transparent);
  color: var(--devtools-success);
}

.status-badge--3xx {
  background-color: color-mix(in srgb, var(--devtools-info) 15%, transparent);
  color: var(--devtools-info);
}

.status-badge--4xx {
  background-color: color-mix(in srgb, var(--devtools-warning) 15%, transparent);
  color: var(--devtools-warning);
}

.status-badge--5xx {
  background-color: color-mix(in srgb, var(--devtools-error) 15%, transparent);
  color: var(--devtools-error);
}

/* Pending response */
.timeline-detail__pending {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--devtools-space-sm);
  padding: var(--devtools-space-lg);
}

.timeline-detail__pending-icon {
  color: var(--devtools-text-muted);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
