<!--
  EndpointDetail.vue - Endpoint Detail Panel Component

  What: Displays detailed information about a selected API endpoint
  How: Shows method, path, operation ID, tags, summary, description, and status indicators
  Why: Provides comprehensive endpoint information for developers using the DevTools
-->

<script setup lang="ts">
import { Code, FileJson, Lock, Shield, Sprout, Tag } from 'lucide-vue-next';
import { computed } from 'vue';

import type { EndpointEntry } from '@/stores/registry';

/**
 * Component props
 */
interface Props {
  /** Endpoint to display details for */
  endpoint: EndpointEntry | null;
}

const props = defineProps<Props>();

/**
 * Get display label for HTTP method
 */
function getMethodLabel(method: string): string {
  return method.toUpperCase();
}

/**
 * Check if endpoint has security requirements
 */
const hasSecurity = computed(() => {
  return props.endpoint?.security && props.endpoint.security.length > 0;
});

/**
 * Format security requirements for display
 */
const securityDisplay = computed(() => {
  if (!props.endpoint?.security) return [];
  return props.endpoint.security.map((sec) => ({
    name: sec.name,
    scopes: sec.scopes.length > 0 ? sec.scopes.join(', ') : 'No scopes',
  }));
});
</script>

<template>
  <div class="endpoint-detail">
    <!-- Empty state when no endpoint selected -->
    <div v-if="!endpoint" class="endpoint-detail__empty">
      <FileJson :size="48" class="endpoint-detail__empty-icon" />
      <h3 class="endpoint-detail__empty-title">No endpoint selected</h3>
      <p class="endpoint-detail__empty-text text-muted">
        Select an endpoint from the list to view its details
      </p>
    </div>

    <!-- Endpoint details -->
    <div v-else class="endpoint-detail__content">
      <!-- Header with method and path -->
      <header class="endpoint-detail__header">
        <span
          :class="[
            'method-badge',
            'method-badge--large',
            `method-badge--${endpoint.method}`
          ]"
        >
          {{ getMethodLabel(endpoint.method) }}
        </span>
        <h2 class="endpoint-detail__path font-mono">
          {{ endpoint.path }}
        </h2>
      </header>

      <!-- Status indicators -->
      <div class="endpoint-detail__status">
        <div
          v-if="endpoint.hasHandler"
          class="endpoint-detail__status-item endpoint-detail__status-item--handler"
        >
          <Code :size="14" />
          <span>Has custom handler</span>
        </div>
        <div
          v-if="endpoint.hasSeed"
          class="endpoint-detail__status-item endpoint-detail__status-item--seed"
        >
          <Sprout :size="14" />
          <span>Has seed data</span>
        </div>
        <div
          v-if="hasSecurity"
          class="endpoint-detail__status-item endpoint-detail__status-item--security"
        >
          <Lock :size="14" />
          <span>Requires authentication</span>
        </div>
        <div
          v-if="!endpoint.hasHandler && !endpoint.hasSeed"
          class="endpoint-detail__status-item endpoint-detail__status-item--auto"
        >
          <FileJson :size="14" />
          <span>Auto-generated response</span>
        </div>
      </div>

      <!-- Info sections -->
      <div class="endpoint-detail__sections">
        <!-- Operation ID -->
        <section class="endpoint-detail__section">
          <h3 class="endpoint-detail__section-title">Operation</h3>
          <p class="endpoint-detail__section-content font-mono">
            {{ endpoint.operationId }}
          </p>
        </section>

        <!-- Tags -->
        <section v-if="endpoint.tags.length > 0" class="endpoint-detail__section">
          <h3 class="endpoint-detail__section-title">
            <Tag :size="14" />
            Tags
          </h3>
          <div class="endpoint-detail__tags">
            <span
              v-for="tag in endpoint.tags"
              :key="tag"
              class="endpoint-detail__tag"
            >
              {{ tag }}
            </span>
          </div>
        </section>

        <!-- Summary -->
        <section v-if="endpoint.summary" class="endpoint-detail__section">
          <h3 class="endpoint-detail__section-title">Summary</h3>
          <p class="endpoint-detail__section-content">
            {{ endpoint.summary }}
          </p>
        </section>

        <!-- Description -->
        <section v-if="endpoint.description" class="endpoint-detail__section">
          <h3 class="endpoint-detail__section-title">Description</h3>
          <p class="endpoint-detail__section-content endpoint-detail__description">
            {{ endpoint.description }}
          </p>
        </section>

        <!-- Response Schema -->
        <section v-if="endpoint.responseSchema" class="endpoint-detail__section">
          <h3 class="endpoint-detail__section-title">
            <FileJson :size="14" />
            Response Schema
          </h3>
          <p class="endpoint-detail__section-content font-mono">
            {{ endpoint.responseSchema }}
          </p>
        </section>

        <!-- Security -->
        <section v-if="hasSecurity" class="endpoint-detail__section">
          <h3 class="endpoint-detail__section-title">
            <Shield :size="14" />
            Security
          </h3>
          <div class="endpoint-detail__security">
            <div
              v-for="sec in securityDisplay"
              :key="sec.name"
              class="endpoint-detail__security-item"
            >
              <span class="endpoint-detail__security-name font-mono">
                {{ sec.name }}
              </span>
              <span class="endpoint-detail__security-scopes text-muted">
                {{ sec.scopes }}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.endpoint-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Empty state */
.endpoint-detail__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: var(--devtools-space-xl);
  text-align: center;
}

.endpoint-detail__empty-icon {
  color: var(--devtools-text-muted);
  opacity: 0.5;
  margin-bottom: var(--devtools-space-md);
}

.endpoint-detail__empty-title {
  font-size: var(--font-size-2);
  font-weight: var(--font-weight-5);
  color: var(--devtools-text);
  margin: 0 0 var(--devtools-space-sm);
}

.endpoint-detail__empty-text {
  font-size: var(--font-size-1);
  margin: 0;
}

/* Content */
.endpoint-detail__content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  padding: var(--devtools-space-md);
}

/* Header */
.endpoint-detail__header {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-md);
  margin-bottom: var(--devtools-space-md);
  padding-bottom: var(--devtools-space-md);
  border-bottom: 1px solid var(--devtools-border);
}

.endpoint-detail__path {
  font-size: var(--font-size-2);
  font-weight: var(--font-weight-5);
  color: var(--devtools-text);
  margin: 0;
  word-break: break-all;
}

/* Large method badge */
.method-badge--large {
  font-size: var(--font-size-0);
  padding: var(--devtools-space-sm) var(--devtools-space-md);
  min-width: 70px;
}

/* Status indicators */
.endpoint-detail__status {
  display: flex;
  flex-wrap: wrap;
  gap: var(--devtools-space-sm);
  margin-bottom: var(--devtools-space-md);
}

.endpoint-detail__status-item {
  display: inline-flex;
  align-items: center;
  gap: var(--devtools-space-xs);
  padding: var(--devtools-space-xs) var(--devtools-space-sm);
  border-radius: var(--devtools-radius-sm);
  font-size: var(--font-size-0);
  font-weight: var(--font-weight-5);
}

.endpoint-detail__status-item--handler {
  background-color: color-mix(in srgb, var(--devtools-info) 15%, transparent);
  color: var(--devtools-info);
}

.endpoint-detail__status-item--seed {
  background-color: color-mix(in srgb, var(--devtools-success) 15%, transparent);
  color: var(--devtools-success);
}

.endpoint-detail__status-item--security {
  background-color: color-mix(in srgb, var(--devtools-warning) 15%, transparent);
  color: var(--devtools-warning);
}

.endpoint-detail__status-item--auto {
  background-color: color-mix(in srgb, var(--devtools-text-muted) 15%, transparent);
  color: var(--devtools-text-muted);
}

/* Sections */
.endpoint-detail__sections {
  display: flex;
  flex-direction: column;
  gap: var(--devtools-space-md);
}

.endpoint-detail__section {
  display: flex;
  flex-direction: column;
  gap: var(--devtools-space-xs);
}

.endpoint-detail__section-title {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-xs);
  font-size: var(--font-size-0);
  font-weight: var(--font-weight-6);
  color: var(--devtools-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.endpoint-detail__section-content {
  font-size: var(--font-size-1);
  color: var(--devtools-text);
  margin: 0;
  line-height: var(--font-lineheight-3);
}

.endpoint-detail__description {
  white-space: pre-wrap;
}

/* Tags */
.endpoint-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--devtools-space-xs);
}

.endpoint-detail__tag {
  display: inline-flex;
  align-items: center;
  padding: var(--devtools-space-xs) var(--devtools-space-sm);
  background-color: var(--devtools-surface-elevated);
  border-radius: var(--devtools-radius-sm);
  font-size: var(--font-size-0);
  color: var(--devtools-text);
}

/* Security */
.endpoint-detail__security {
  display: flex;
  flex-direction: column;
  gap: var(--devtools-space-xs);
}

.endpoint-detail__security-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--devtools-space-sm);
  background-color: var(--devtools-surface-elevated);
  border-radius: var(--devtools-radius-sm);
}

.endpoint-detail__security-name {
  font-size: var(--font-size-1);
  font-weight: var(--font-weight-5);
}

.endpoint-detail__security-scopes {
  font-size: var(--font-size-0);
}
</style>
