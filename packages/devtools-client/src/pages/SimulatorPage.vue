<!--
  SimulatorPage.vue - Error Simulation Controls Page

  What: Provides controls for simulating various API error conditions
  How: Manages simulation state via simulation store and WebSocket commands
  Why: Allows developers to test error handling without modifying backend code
-->

<script setup lang="ts">
import { AlertTriangle, Clock, Plus, Trash2, Zap } from 'lucide-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useWebSocket } from '../composables/useWebSocket';
import { useRegistryStore } from '../stores/registry';
import { useSimulationStore } from '../stores/simulation';

// ==========================================================================
// Composables
// ==========================================================================

const simulationStore = useSimulationStore();
const registryStore = useRegistryStore();
const { send, on } = useWebSocket();

// ==========================================================================
// State
// ==========================================================================

/** Path input for new simulation */
const newSimulationPath = ref('');

/** Method input for new simulation */
const newSimulationMethod = ref('GET');

/** Selected preset ID */
const selectedPresetId = ref<string | null>(null);

/** Selected endpoint key (for dropdown selection) */
const selectedEndpointKey = ref<string | null>(null);

/** Available HTTP methods */
const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

// ==========================================================================
// Computed
// ==========================================================================

/**
 * Available endpoints for selection
 */
const availableEndpoints = computed(() => {
  return registryStore.endpoints.map((e) => ({
    key: e.key,
    label: `${e.method.toUpperCase()} ${e.path}`,
    method: e.method.toUpperCase(),
    path: e.path,
    operationId: e.operationId,
  }));
});

/**
 * Check if we can add a new simulation
 */
const canAddSimulation = computed(() => {
  const hasPath = newSimulationPath.value.trim() !== '';
  const hasPreset = selectedPresetId.value !== null;
  return hasPath && hasPreset;
});

/**
 * Active simulations for display
 */
const activeSimulations = computed(() => {
  return simulationStore.activeSimulations.map((sim) => {
    const preset = sim.presetId ? simulationStore.getPreset(sim.presetId) : null;
    return {
      ...sim,
      preset,
    };
  });
});

/**
 * Simulation count
 */
const simulationCount = computed(() => simulationStore.count);

// ==========================================================================
// Methods
// ==========================================================================

/**
 * Add a new simulation
 */
function addSimulation(): void {
  if (!canAddSimulation.value || !selectedPresetId.value) return;

  const preset = simulationStore.getPreset(selectedPresetId.value);
  if (!preset) return;

  const path = newSimulationPath.value.trim();
  const simulation = simulationStore.createSimulationFromPreset(
    path,
    selectedPresetId.value,
    undefined,
  );

  if (!simulation) return;

  // Optimistically add to local state
  simulationStore.addSimulationLocal(simulation);
  simulationStore.setLoading(true);

  // Send command to server
  send({
    type: 'set:simulation',
    data: {
      path: simulation.path,
      status: simulation.status,
      delay: simulation.delay,
      body: simulation.body,
    },
  });

  // Reset form
  newSimulationPath.value = '';
  selectedPresetId.value = null;
  selectedEndpointKey.value = null;
}

/**
 * Remove an active simulation
 */
function removeSimulation(path: string): void {
  // Optimistically remove from local state
  simulationStore.removeSimulationLocal(path);
  simulationStore.setLoading(true);

  // Send command to server
  send({
    type: 'clear:simulation',
    data: { path },
  });
}

/**
 * Clear all simulations
 */
function clearAllSimulations(): void {
  if (simulationCount.value === 0) return;

  // Clear all one by one (server doesn't have a clear-all command yet)
  for (const simulation of simulationStore.activeSimulations) {
    send({
      type: 'clear:simulation',
      data: { path: simulation.path },
    });
  }

  // Clear local state
  simulationStore.clearSimulationsLocal();
  simulationStore.setLoading(true);
}

/**
 * Handle endpoint selection from dropdown
 */
function handleEndpointSelect(): void {
  if (!selectedEndpointKey.value) return;

  const endpoint = registryStore.endpoints.find((e) => e.key === selectedEndpointKey.value);
  if (!endpoint) return;

  newSimulationMethod.value = endpoint.method.toUpperCase();
  newSimulationPath.value = endpoint.path;
}

/**
 * Handle manual path/method input
 */
function handleManualInput(): void {
  // Clear endpoint selection when user types manually
  selectedEndpointKey.value = null;
}

// ==========================================================================
// Lifecycle
// ==========================================================================

onMounted(() => {
  // Subscribe to simulation events
  on('simulation:active', (data: any) => {
    simulationStore.setSimulations(data);
  });

  on('simulation:added', (data: any) => {
    simulationStore.handleSimulationAdded(data);
  });

  on('simulation:removed', (data: any) => {
    simulationStore.handleSimulationRemoved(data);
  });

  on('simulations:cleared', (data: any) => {
    simulationStore.handleSimulationsCleared(data);
  });

  on('simulation:set', (data: any) => {
    simulationStore.handleSimulationSet(data);
  });

  on('simulation:cleared', (data: any) => {
    simulationStore.handleSimulationCleared(data);
  });

  // Request current simulations from server
  send({ type: 'get:registry' });
});
</script>

<template>
  <div class="simulator-page">
    <!-- Add Simulation Form -->
    <div class="simulator-form card">
      <div class="simulator-form__header">
        <Zap :size="18" />
        <span>Add Simulation</span>
      </div>

      <div class="simulator-form__body">
        <!-- Endpoint Selector (optional) -->
        <div v-if="availableEndpoints.length > 0" class="simulator-form__row">
          <label class="simulator-form__label">Select Endpoint (optional):</label>
          <select
            v-model="selectedEndpointKey"
            class="input"
            @change="handleEndpointSelect"
          >
            <option :value="null">Manual entry...</option>
            <option
              v-for="endpoint in availableEndpoints"
              :key="endpoint.key"
              :value="endpoint.key"
            >
              {{ endpoint.label }}
            </option>
          </select>
        </div>

        <!-- Method and Path -->
        <div class="simulator-form__row">
          <select
            v-model="newSimulationMethod"
            class="simulator-form__method input"
            @change="handleManualInput"
          >
            <option v-for="method in httpMethods" :key="method" :value="method">
              {{ method }}
            </option>
          </select>
          <input
            v-model="newSimulationPath"
            type="text"
            class="simulator-form__path input"
            placeholder="/api/path"
            @input="handleManualInput"
          />
        </div>

        <!-- Preset Selection -->
        <div class="simulator-presets">
          <button
            v-for="preset in simulationStore.presets"
            :key="preset.id"
            :class="[
              'simulator-preset',
              { 'simulator-preset--selected': selectedPresetId === preset.id },
              `simulator-preset--${preset.type}`,
            ]"
            :title="preset.description"
            @click="selectedPresetId = preset.id"
          >
            <component
              :is="preset.type === 'delay' ? Clock : AlertTriangle"
              :size="14"
            />
            <span class="simulator-preset__label">{{ preset.label }}</span>
          </button>
        </div>

        <!-- Add Button -->
        <button
          class="btn btn--primary"
          :disabled="!canAddSimulation || simulationStore.isLoading"
          @click="addSimulation"
        >
          <Plus :size="16" />
          <span>Add Simulation</span>
        </button>
      </div>
    </div>

    <!-- Active Simulations -->
    <div class="simulator-active">
      <div class="simulator-active__header">
        <span class="simulator-active__title">
          Active Simulations ({{ simulationCount }})
        </span>
        <button
          v-if="simulationCount > 0"
          class="btn btn--ghost"
          :disabled="simulationStore.isLoading"
          @click="clearAllSimulations"
        >
          <Trash2 :size="14" />
          <span>Clear All</span>
        </button>
      </div>

      <div class="simulator-active__list">
        <div
          v-for="simulation in activeSimulations"
          :key="simulation.path"
          class="simulator-simulation card"
        >
          <div class="simulator-simulation__info">
            <span class="simulator-simulation__path font-mono">
              {{ simulation.path }}
            </span>
          </div>
          <div class="simulator-simulation__preset">
            <component
              :is="simulation.preset?.type === 'delay' ? Clock : AlertTriangle"
              :size="14"
              :class="{
                'text-warning': simulation.preset?.type === 'delay',
                'text-error': simulation.preset?.type === 'error',
                'text-muted': simulation.preset?.type === 'empty',
              }"
            />
            <span>
              {{ simulation.preset?.label || `HTTP ${simulation.status}` }}
            </span>
            <span v-if="simulation.delay" class="text-muted">
              ({{ simulation.delay }}ms)
            </span>
          </div>
          <button
            class="btn btn--ghost btn--icon"
            title="Remove simulation"
            :disabled="simulationStore.isLoading"
            @click="removeSimulation(simulation.path)"
          >
            <Trash2 :size="14" />
          </button>
        </div>

        <!-- Empty State -->
        <div v-if="simulationCount === 0" class="empty-state">
          <Zap :size="48" class="empty-state__icon" />
          <h3 class="empty-state__title">No active simulations</h3>
          <p class="empty-state__description">
            Add a simulation above to test error handling and slow responses.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.simulator-page {
  display: flex;
  flex-direction: column;
  gap: var(--devtools-space-lg);
  height: 100%;
  padding: var(--devtools-space-md);
  overflow-y: auto;
}

/* Form */
.simulator-form {
  flex-shrink: 0;
}

.simulator-form__header {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-sm);
  padding-bottom: var(--devtools-space-md);
  margin-bottom: var(--devtools-space-md);
  border-bottom: 1px solid var(--devtools-border);
  font-weight: var(--font-weight-6);
  font-size: var(--font-size-1);
}

.simulator-form__body {
  display: flex;
  flex-direction: column;
  gap: var(--devtools-space-md);
}

.simulator-form__row {
  display: flex;
  flex-direction: column;
  gap: var(--devtools-space-xs);
}

.simulator-form__row:has(.simulator-form__method) {
  flex-direction: row;
  gap: var(--devtools-space-sm);
}

.simulator-form__label {
  font-size: var(--font-size-0);
  font-weight: var(--font-weight-5);
  color: var(--devtools-text);
}

.simulator-form__method {
  width: 100px;
  flex-shrink: 0;
}

.simulator-form__path {
  flex: 1;
}

/* Presets */
.simulator-presets {
  display: flex;
  flex-wrap: wrap;
  gap: var(--devtools-space-xs);
}

.simulator-preset {
  display: inline-flex;
  align-items: center;
  gap: var(--devtools-space-xs);
  padding: var(--devtools-space-xs) var(--devtools-space-sm);
  background-color: var(--devtools-surface-elevated);
  border: 1px solid var(--devtools-border);
  border-radius: var(--devtools-radius-sm);
  font-family: var(--devtools-font-sans);
  font-size: var(--font-size-0);
  cursor: pointer;
  transition: all var(--devtools-transition-fast);
}

.simulator-preset:hover {
  background-color: var(--devtools-border);
}

.simulator-preset--selected {
  border-color: var(--devtools-primary);
  background-color: color-mix(
    in srgb,
    var(--devtools-primary) 15%,
    transparent
  );
}

.simulator-preset--delay {
  color: var(--devtools-warning);
}

.simulator-preset--error {
  color: var(--devtools-error);
}

.simulator-preset--empty {
  color: var(--devtools-text-muted);
}

.simulator-preset__label {
  color: var(--devtools-text);
}

/* Active Simulations */
.simulator-active {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.simulator-active__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--devtools-space-md);
}

.simulator-active__title {
  font-weight: var(--font-weight-6);
  font-size: var(--font-size-1);
}

.simulator-active__list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--devtools-space-xs);
}

/* Simulation Item */
.simulator-simulation {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-md);
  padding: var(--devtools-space-sm) var(--devtools-space-md);
}

.simulator-simulation__info {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-sm);
  flex: 1;
}

.simulator-simulation__path {
  font-size: var(--font-size-1);
  color: var(--devtools-text);
}

.simulator-simulation__preset {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-xs);
  font-size: var(--font-size-0);
  color: var(--devtools-text-muted);
}

/* Color utilities */
.text-warning {
  color: var(--devtools-warning);
}

.text-error {
  color: var(--devtools-error);
}

.text-muted {
  color: var(--devtools-text-muted);
}
</style>
