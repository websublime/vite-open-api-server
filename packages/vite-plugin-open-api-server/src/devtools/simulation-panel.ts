/**
 * Simulation Panel for Vue DevTools
 *
 * ## What
 * Provides a Vue Single File Component (SFC) as a string for the DevTools
 * custom tab that allows configuring simulation parameters for API endpoints.
 *
 * ## How
 * The SFC is registered using `addCustomTab` with type 'sfc' from @vue/devtools-api.
 * It provides an interactive UI for:
 * - Selecting an endpoint from the registry
 * - Configuring simulation parameters (status code, delay, error type, etc.)
 * - Generating and copying simulation URLs
 * - Applying presets for common scenarios
 *
 * ## Why
 * Enables developers to easily test different API response scenarios without
 * modifying code or using external tools. The panel integrates directly into
 * Vue DevTools for a seamless development experience.
 *
 * @module
 */

import { BUILT_IN_PRESETS } from './simulation-types.js';

// ============================================================================
// SFC Template
// ============================================================================

/**
 * Generates the Simulation Panel SFC code.
 *
 * @param proxyPath - The proxy path for the API (e.g., '/api/v3')
 * @returns Vue SFC code as a string
 */
export function generateSimulationPanelSfc(proxyPath: string): string {
  // Serialize presets for injection into the SFC
  const presetsJson = JSON.stringify(BUILT_IN_PRESETS);

  return /* vue */ `
<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from 'vue'

// ============================================================================
// Types (inline for SFC compatibility)
// ============================================================================

interface EndpointData {
  operationId: string
  method: string
  path: string
  summary?: string
  tags?: string[]
  responses?: Record<string, unknown>
  hasHandler?: boolean
  hasSeed?: boolean
}

interface SimulationParams {
  statusCode: number | null
  delay: number
  errorType: string
  edgeCase: string
  networkPreset: string
  connectionType: string
}

interface SimulationPreset {
  id: string
  name: string
  description: string
  isBuiltIn: boolean
  icon?: string
  params: Omit<SimulationParams, 'operationId'>
}

// ============================================================================
// Constants
// ============================================================================

const PROXY_PATH = '${proxyPath}'
const GLOBAL_STATE_KEY = '__VITE_OPENAPI_SERVER__'

const ERROR_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'timeout', label: 'Timeout (never responds)' },
  { value: 'network-error', label: 'Network Error' },
  { value: 'server-error', label: 'Server Error' },
  { value: 'rate-limit', label: 'Rate Limited (429)' },
  { value: 'service-unavailable', label: 'Service Unavailable (503)' },
]

const EDGE_CASES = [
  { value: 'normal', label: 'Normal Response' },
  { value: 'empty-response', label: 'Empty Body' },
  { value: 'empty-array', label: 'Empty Array []' },
  { value: 'null-values', label: 'Null Values' },
  { value: 'malformed-json', label: 'Malformed JSON' },
  { value: 'large-response', label: 'Large Response' },
]

const NETWORK_PRESETS = [
  { value: 'none', label: 'None', delay: 0 },
  { value: '3g-slow', label: '3G Slow (2000ms)', delay: 2000 },
  { value: '3g-fast', label: '3G Fast (750ms)', delay: 750 },
  { value: '4g', label: '4G (100ms)', delay: 100 },
  { value: 'slow-connection', label: 'Slow (5000ms)', delay: 5000 },
]

const CONNECTION_TYPES = [
  { value: 'normal', label: 'Normal' },
  { value: 'drop', label: 'Drop Connection' },
  { value: 'reset', label: 'Reset Connection' },
  { value: 'partial', label: 'Partial Response' },
]

const BUILT_IN_PRESETS: SimulationPreset[] = ${presetsJson}

// ============================================================================
// State
// ============================================================================

const endpoints = ref<EndpointData[]>([])
const selectedOperationId = ref<string | null>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)
const urlCopied = ref(false)
const copyTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

const params = reactive<SimulationParams>({
  statusCode: null,
  delay: 0,
  errorType: 'none',
  edgeCase: 'normal',
  networkPreset: 'none',
  connectionType: 'normal',
})

// ============================================================================
// Computed
// ============================================================================

const selectedEndpoint = computed(() => {
  if (!selectedOperationId.value) return null
  return endpoints.value.find(ep => ep.operationId === selectedOperationId.value) || null
})

const availableStatusCodes = computed(() => {
  if (!selectedEndpoint.value?.responses) return []
  return Object.keys(selectedEndpoint.value.responses)
    .map(code => parseInt(code, 10))
    .filter(code => !isNaN(code))
    .sort((a, b) => a - b)
})

const generatedUrl = computed(() => {
  if (!selectedEndpoint.value) return ''

  const baseUrl = window.location.origin
  const endpointPath = selectedEndpoint.value.path
  const fullPath = \`\${PROXY_PATH}\${endpointPath}\`

  const queryParams: string[] = []

  if (params.statusCode !== null && params.statusCode > 0) {
    queryParams.push(\`simulateStatus=\${params.statusCode}\`)
  }

  if (params.delay > 0) {
    queryParams.push(\`simulateDelay=\${params.delay}\`)
  }

  if (params.errorType === 'timeout') {
    queryParams.push('simulateTimeout=true')
  } else if (params.errorType !== 'none') {
    queryParams.push(\`simulateError=\${params.errorType}\`)
  }

  if (params.edgeCase !== 'normal') {
    queryParams.push(\`simulateEdgeCase=\${params.edgeCase}\`)
  }

  if (params.connectionType !== 'normal') {
    queryParams.push(\`simulateConnection=\${params.connectionType}\`)
  }

  const queryString = queryParams.length > 0 ? '?' + queryParams.join('&') : ''
  return \`\${baseUrl}\${fullPath}\${queryString}\`
})

const simulationDescription = computed(() => {
  const parts: string[] = []

  if (params.statusCode !== null && params.statusCode > 0) {
    parts.push(\`HTTP \${params.statusCode}\`)
  }

  if (params.delay > 0) {
    const delayText = params.delay >= 1000 ? \`\${params.delay / 1000}s\` : \`\${params.delay}ms\`
    parts.push(\`\${delayText} delay\`)
  }

  if (params.errorType === 'timeout') {
    parts.push('timeout')
  } else if (params.errorType !== 'none') {
    parts.push(params.errorType.replace('-', ' '))
  }

  if (params.edgeCase !== 'normal') {
    parts.push(params.edgeCase.replace('-', ' '))
  }

  if (params.connectionType !== 'normal') {
    parts.push(\`\${params.connectionType} connection\`)
  }

  return parts.length > 0 ? parts.join(' • ') : 'Normal response'
})

const endpointsByTag = computed(() => {
  const grouped: Record<string, EndpointData[]> = {}

  for (const ep of endpoints.value) {
    const tag = ep.tags?.[0] || 'default'
    if (!grouped[tag]) {
      grouped[tag] = []
    }
    grouped[tag].push(ep)
  }

  return grouped
})

// ============================================================================
// Methods
// ============================================================================

async function fetchEndpoints() {
  isLoading.value = true
  error.value = null

  try {
    // Try to get from global state first
    const globalState = (window as any)[GLOBAL_STATE_KEY]
    if (globalState?.registry?.endpoints) {
      const endpointMap = globalState.registry.endpoints
      endpoints.value = Array.from(endpointMap.values())
      isLoading.value = false
      return
    }

    // Fallback: fetch from registry endpoint
    const response = await fetch(\`\${PROXY_PATH}/__registry__\`)
    if (!response.ok) {
      throw new Error(\`Failed to fetch registry: \${response.status}\`)
    }

    const data = await response.json()
    endpoints.value = data.endpoints || []
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load endpoints'
    endpoints.value = []
  } finally {
    isLoading.value = false
  }
}

function resetParams() {
  params.statusCode = null
  params.delay = 0
  params.errorType = 'none'
  params.edgeCase = 'normal'
  params.networkPreset = 'none'
  params.connectionType = 'normal'
}

function applyPreset(preset: SimulationPreset) {
  params.statusCode = preset.params.statusCode ?? null
  params.delay = preset.params.delay ?? 0
  params.errorType = preset.params.errorType ?? 'none'
  params.edgeCase = preset.params.edgeCase ?? 'normal'
  params.networkPreset = preset.params.networkPreset ?? 'none'
  params.connectionType = preset.params.connectionType ?? 'normal'
}

async function copyUrl() {
  if (!generatedUrl.value) return

  try {
    await navigator.clipboard.writeText(generatedUrl.value)
    urlCopied.value = true

    if (copyTimeout.value) {
      clearTimeout(copyTimeout.value)
    }

    copyTimeout.value = setTimeout(() => {
      urlCopied.value = false
    }, 2000)
  } catch (err) {
    // Fallback for non-secure contexts
    const textArea = document.createElement('textarea')
    textArea.value = generatedUrl.value
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    urlCopied.value = true

    if (copyTimeout.value) {
      clearTimeout(copyTimeout.value)
    }

    copyTimeout.value = setTimeout(() => {
      urlCopied.value = false
    }, 2000)
  }
}

function openInBrowser() {
  if (!generatedUrl.value) return
  window.open(generatedUrl.value, '_blank')
}

function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: '#22c55e',
    POST: '#3b82f6',
    PUT: '#f97316',
    PATCH: '#a855f7',
    DELETE: '#ef4444',
  }
  return colors[method.toUpperCase()] || '#6b7280'
}

// Watch network preset to auto-apply delay
watch(() => params.networkPreset, (preset) => {
  if (preset !== 'none') {
    const presetConfig = NETWORK_PRESETS.find(p => p.value === preset)
    if (presetConfig) {
      params.delay = presetConfig.delay
    }
  }
})

// ============================================================================
// Lifecycle
// ============================================================================

onMounted(() => {
  fetchEndpoints()
})
</script>

<template>
  <div class="simulation-panel">
    <!-- Header -->
    <div class="panel-header">
      <h2>🎭 API Simulation</h2>
      <p class="subtitle">Configure mock server response behavior</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <span>Loading endpoints...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <span class="error-icon">⚠️</span>
      <span>{{ error }}</span>
      <button class="btn btn-secondary" @click="fetchEndpoints">Retry</button>
    </div>

    <!-- Main Content -->
    <div v-else class="panel-content">
      <!-- Endpoint Selector -->
      <section class="section">
        <h3>📍 Select Endpoint</h3>
        <select v-model="selectedOperationId" class="select-endpoint">
          <option :value="null">-- Select an endpoint --</option>
          <optgroup v-for="(eps, tag) in endpointsByTag" :key="tag" :label="tag">
            <option v-for="ep in eps" :key="ep.operationId" :value="ep.operationId">
              {{ ep.method.toUpperCase() }} {{ ep.path }} ({{ ep.operationId }})
            </option>
          </optgroup>
        </select>
      </section>

      <!-- Simulation Controls (only show when endpoint selected) -->
      <template v-if="selectedEndpoint">
        <!-- Selected Endpoint Info -->
        <section class="section endpoint-info">
          <div class="endpoint-badge">
            <span class="method" :style="{ backgroundColor: getMethodColor(selectedEndpoint.method) }">
              {{ selectedEndpoint.method.toUpperCase() }}
            </span>
            <span class="path">{{ selectedEndpoint.path }}</span>
          </div>
          <p v-if="selectedEndpoint.summary" class="summary">{{ selectedEndpoint.summary }}</p>
          <div class="badges">
            <span v-if="selectedEndpoint.hasHandler" class="badge badge-handler">Custom Handler</span>
            <span v-if="selectedEndpoint.hasSeed" class="badge badge-seed">Custom Seed</span>
            <span v-if="!selectedEndpoint.hasHandler && !selectedEndpoint.hasSeed" class="badge badge-auto">Auto-generated</span>
          </div>
        </section>

        <!-- Presets -->
        <section class="section">
          <h3>⚡ Quick Presets</h3>
          <div class="presets-grid">
            <button
              v-for="preset in BUILT_IN_PRESETS"
              :key="preset.id"
              class="preset-btn"
              :title="preset.description"
              @click="applyPreset(preset)"
            >
              {{ preset.name }}
            </button>
          </div>
        </section>

        <!-- Status Code -->
        <section class="section">
          <h3>📊 HTTP Status Code</h3>
          <div class="control-row">
            <select v-model.number="params.statusCode" class="select-control">
              <option :value="null">Default (from spec)</option>
              <option v-for="code in availableStatusCodes" :key="code" :value="code">
                {{ code }} - {{ getStatusText(code) }}
              </option>
              <optgroup label="Common Error Codes">
                <option :value="400">400 - Bad Request</option>
                <option :value="401">401 - Unauthorized</option>
                <option :value="403">403 - Forbidden</option>
                <option :value="404">404 - Not Found</option>
                <option :value="429">429 - Too Many Requests</option>
                <option :value="500">500 - Internal Server Error</option>
                <option :value="502">502 - Bad Gateway</option>
                <option :value="503">503 - Service Unavailable</option>
              </optgroup>
            </select>
          </div>
        </section>

        <!-- Network Conditions -->
        <section class="section">
          <h3>🌐 Network Conditions</h3>
          <div class="control-group">
            <label>
              <span>Network Preset:</span>
              <select v-model="params.networkPreset" class="select-control">
                <option v-for="preset in NETWORK_PRESETS" :key="preset.value" :value="preset.value">
                  {{ preset.label }}
                </option>
              </select>
            </label>
            <label>
              <span>Custom Delay (ms):</span>
              <input
                type="number"
                v-model.number="params.delay"
                class="input-control"
                min="0"
                step="100"
                placeholder="0"
              />
            </label>
            <label>
              <span>Connection:</span>
              <select v-model="params.connectionType" class="select-control">
                <option v-for="conn in CONNECTION_TYPES" :key="conn.value" :value="conn.value">
                  {{ conn.label }}
                </option>
              </select>
            </label>
          </div>
        </section>

        <!-- Error Simulation -->
        <section class="section">
          <h3>❌ Error Simulation</h3>
          <div class="control-row">
            <select v-model="params.errorType" class="select-control">
              <option v-for="err in ERROR_TYPES" :key="err.value" :value="err.value">
                {{ err.label }}
              </option>
            </select>
          </div>
        </section>

        <!-- Edge Cases -->
        <section class="section">
          <h3>🔬 Edge Cases</h3>
          <div class="control-row">
            <select v-model="params.edgeCase" class="select-control">
              <option v-for="edge in EDGE_CASES" :key="edge.value" :value="edge.value">
                {{ edge.label }}
              </option>
            </select>
          </div>
        </section>

        <!-- Generated URL -->
        <section class="section url-section">
          <h3>🔗 Generated URL</h3>
          <div class="simulation-description">
            <span class="label">Simulating:</span>
            <span class="value">{{ simulationDescription }}</span>
          </div>
          <div class="url-display">
            <code class="url-text">{{ generatedUrl }}</code>
          </div>
          <div class="url-actions">
            <button class="btn btn-primary" @click="copyUrl">
              {{ urlCopied ? '✓ Copied!' : '📋 Copy URL' }}
            </button>
            <button class="btn btn-secondary" @click="openInBrowser">
              🔗 Open in Browser
            </button>
            <button class="btn btn-ghost" @click="resetParams">
              ↺ Reset
            </button>
          </div>
        </section>
      </template>

      <!-- No Endpoint Selected -->
      <div v-else class="empty-state">
        <span class="empty-icon">👆</span>
        <p>Select an endpoint above to configure simulation parameters</p>
      </div>
    </div>

    <!-- Footer -->
    <div class="panel-footer">
      <span class="endpoint-count">{{ endpoints.length }} endpoints available</span>
      <button class="btn btn-ghost btn-sm" @click="fetchEndpoints">
        ↻ Refresh
      </button>
    </div>
  </div>
</template>

<script lang="ts">
// Helper function for status text
function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  }
  return statusTexts[status] || 'Unknown'
}
</script>

<style scoped>
/* ============================================================================
   Base Styles
   ============================================================================ */

.simulation-panel {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: var(--vt-c-text-1, #213547);
  background: var(--vt-c-bg, #ffffff);
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.dark .simulation-panel {
  color: var(--vt-c-text-1-dark, rgba(255, 255, 255, 0.87));
  background: var(--vt-c-bg-dark, #1a1a1a);
}

/* ============================================================================
   Header
   ============================================================================ */

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--vt-c-divider, #e2e2e2);
  background: var(--vt-c-bg-soft, #f6f6f6);
}

.dark .panel-header {
  border-bottom-color: var(--vt-c-divider-dark, #2e2e2e);
  background: var(--vt-c-bg-soft-dark, #222222);
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.panel-header .subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--vt-c-text-2, #666);
  opacity: 0.8;
}

/* ============================================================================
   Content
   ============================================================================ */

.panel-content {
  flex: 1;
  padding: 16px 20px;
  overflow-y: auto;
}

.section {
  margin-bottom: 20px;
}

.section h3 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--vt-c-text-1, #213547);
}

.dark .section h3 {
  color: var(--vt-c-text-1-dark, rgba(255, 255, 255, 0.87));
}

/* ============================================================================
   Form Controls
   ============================================================================ */

.select-endpoint,
.select-control,
.input-control {
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  border: 1px solid var(--vt-c-divider, #ddd);
  border-radius: 6px;
  background: var(--vt-c-bg, #fff);
  color: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.dark .select-endpoint,
.dark .select-control,
.dark .input-control {
  border-color: var(--vt-c-divider-dark, #3e3e3e);
  background: var(--vt-c-bg-dark, #1a1a1a);
}

.select-endpoint:focus,
.select-control:focus,
.input-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.control-row {
  display: flex;
  gap: 12px;
}

.control-group {
  display: grid;
  gap: 12px;
}

.control-group label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control-group label span {
  font-size: 12px;
  color: var(--vt-c-text-2, #666);
}

/* ============================================================================
   Endpoint Info
   ============================================================================ */

.endpoint-info {
  background: var(--vt-c-bg-soft, #f6f6f6);
  padding: 12px;
  border-radius: 8px;
}

.dark .endpoint-info {
  background: var(--vt-c-bg-soft-dark, #222);
}

.endpoint-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.endpoint-badge .method {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  text-transform: uppercase;
}

.endpoint-badge .path {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 13px;
}

.summary {
  margin: 8px 0;
  font-size: 13px;
  color: var(--vt-c-text-2, #666);
}

.badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.badge-handler {
  background: #dbeafe;
  color: #1e40af;
}

.dark .badge-handler {
  background: #1e3a5f;
  color: #93c5fd;
}

.badge-seed {
  background: #dcfce7;
  color: #166534;
}

.dark .badge-seed {
  background: #14532d;
  color: #86efac;
}

.badge-auto {
  background: #f3f4f6;
  color: #4b5563;
}

.dark .badge-auto {
  background: #374151;
  color: #9ca3af;
}

/* ============================================================================
   Presets
   ============================================================================ */

.presets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.preset-btn {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--vt-c-divider, #ddd);
  border-radius: 6px;
  background: var(--vt-c-bg, #fff);
  color: inherit;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.dark .preset-btn {
  border-color: var(--vt-c-divider-dark, #3e3e3e);
  background: var(--vt-c-bg-dark, #1a1a1a);
}

.preset-btn:hover {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

/* ============================================================================
   URL Section
   ============================================================================ */

.url-section {
  background: var(--vt-c-bg-soft, #f6f6f6);
  padding: 16px;
  border-radius: 8px;
  margin-top: 24px;
}

.dark .url-section {
  background: var(--vt-c-bg-soft-dark, #222);
}

.simulation-description {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
}

.simulation-description .label {
  color: var(--vt-c-text-2, #666);
}

.simulation-description .value {
  font-weight: 500;
}

.url-display {
  background: var(--vt-c-bg, #fff);
  border: 1px solid var(--vt-c-divider, #ddd);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  overflow-x: auto;
}

.dark .url-display {
  background: var(--vt-c-bg-dark, #1a1a1a);
  border-color: var(--vt-c-divider-dark, #3e3e3e);
}

.url-text {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 12px;
  word-break: break-all;
  color: #3b82f6;
}

.url-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* ============================================================================
   Buttons
   ============================================================================ */

.btn {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background: #3b82f6;
  color: #fff;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: var(--vt-c-bg, #e5e7eb);
  color: var(--vt-c-text-1, #374151);
}

.dark .btn-secondary {
  background: #374151;
  color: #e5e7eb;
}

.btn-secondary:hover {
  background: #d1d5db;
}

.dark .btn-secondary:hover {
  background: #4b5563;
}

.btn-ghost {
  background: transparent;
  color: var(--vt-c-text-2, #6b7280);
}

.btn-ghost:hover {
  background: var(--vt-c-bg-soft, #f3f4f6);
}

.dark .btn-ghost:hover {
  background: var(--vt-c-bg-soft-dark, #374151);
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

/* ============================================================================
   States
   ============================================================================ */

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  gap: 16px;
  color: var(--vt-c-text-2, #666);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--vt-c-divider, #e5e7eb);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px;
  gap: 12px;
  color: #ef4444;
}

.error-icon {
  font-size: 32px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  gap: 12px;
  color: var(--vt-c-text-2, #666);
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  opacity: 0.5;
}

/* ============================================================================
   Footer
   ============================================================================ */

.panel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid var(--vt-c-divider, #e2e2e2);
  background: var(--vt-c-bg-soft, #f6f6f6);
  font-size: 12px;
  color: var(--vt-c-text-2, #666);
}

.dark .panel-footer {
  border-top-color: var(--vt-c-divider-dark, #2e2e2e);
  background: var(--vt-c-bg-soft-dark, #222);
}
</style>
`;
}

/**
 * Gets the SFC code for the simulation panel with default proxy path.
 *
 * @returns Vue SFC code as a string
 */
export function getSimulationPanelSfc(): string {
  return generateSimulationPanelSfc('/api/v3');
}

export type { SimulationPreset } from './simulation-types.js';
// Re-export types and presets for external use
export { BUILT_IN_PRESETS } from './simulation-types.js';
