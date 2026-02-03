<!--
  SimulatorPage.vue - Error Simulation Controls Page

  What: Provides controls for simulating various API error conditions
  How: Will manage simulation state via simulation store and WebSocket commands
  Why: Allows developers to test error handling without modifying backend code
-->

<script setup lang="ts">
import { AlertTriangle, Clock, Plus, Trash2, Zap } from 'lucide-vue-next';
import { computed, ref } from 'vue';

/**
 * Simulation preset type definition
 */
interface SimulationPreset {
  id: string;
  label: string;
  description: string;
  type: 'delay' | 'error';
  delay?: number;
  status?: number;
}

/**
 * Active simulation type definition
 */
interface ActiveSimulation {
  id: string;
  path: string;
  method: string;
  preset: SimulationPreset;
}

// Available simulation presets
const presets: SimulationPreset[] = [
  {
    id: 'slow',
    label: 'Slow Response',
    description: 'Add 2 second delay',
    type: 'delay',
    delay: 2000,
  },
  {
    id: 'very-slow',
    label: 'Very Slow',
    description: 'Add 5 second delay',
    type: 'delay',
    delay: 5000,
  },
  {
    id: 'timeout',
    label: 'Timeout',
    description: 'Simulate request timeout (30s)',
    type: 'delay',
    delay: 30000,
  },
  {
    id: 'error-400',
    label: 'Bad Request',
    description: 'Return 400 status',
    type: 'error',
    status: 400,
  },
  {
    id: 'error-401',
    label: 'Unauthorized',
    description: 'Return 401 status',
    type: 'error',
    status: 401,
  },
  {
    id: 'error-403',
    label: 'Forbidden',
    description: 'Return 403 status',
    type: 'error',
    status: 403,
  },
  {
    id: 'error-404',
    label: 'Not Found',
    description: 'Return 404 status',
    type: 'error',
    status: 404,
  },
  {
    id: 'error-429',
    label: 'Rate Limited',
    description: 'Return 429 status',
    type: 'error',
    status: 429,
  },
  {
    id: 'error-500',
    label: 'Server Error',
    description: 'Return 500 status',
    type: 'error',
    status: 500,
  },
  {
    id: 'error-503',
    label: 'Unavailable',
    description: 'Return 503 status',
    type: 'error',
    status: 503,
  },
];

// TODO: Will be replaced with data from simulation store
const activeSimulations = ref<ActiveSimulation[]>([
  {
    id: '1',
    path: '/pets',
    method: 'GET',
    preset: presets[0],
  },
  {
    id: '2',
    path: '/pets/{petId}',
    method: 'GET',
    preset: presets[6],
  },
]);

// Path input for new simulation
const newSimulationPath = ref('');
const newSimulationMethod = ref('GET');
const selectedPresetId = ref<string | null>(null);

// Available HTTP methods
const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Get preset by ID
 */
function getPreset(id: string): SimulationPreset | undefined {
  return presets.find((p) => p.id === id);
}

/**
 * Check if we can add a new simulation
 */
const canAddSimulation = computed(() => {
  return newSimulationPath.value.trim() !== '' && selectedPresetId.value !== null;
});

/**
 * Add a new simulation
 */
function addSimulation() {
  if (!canAddSimulation.value || !selectedPresetId.value) return;

  const preset = getPreset(selectedPresetId.value);
  if (!preset) return;

  // TODO: Will send WebSocket command to add simulation
  activeSimulations.value.push({
    id: Date.now().toString(),
    path: newSimulationPath.value.trim(),
    method: newSimulationMethod.value,
    preset,
  });

  // Reset form
  newSimulationPath.value = '';
  selectedPresetId.value = null;
}

/**
 * Remove an active simulation
 */
function removeSimulation(id: string) {
  // TODO: Will send WebSocket command to remove simulation
  activeSimulations.value = activeSimulations.value.filter((s) => s.id !== id);
}

/**
 * Clear all simulations
 */
function clearAllSimulations() {
  // TODO: Will send WebSocket command to clear all simulations
  activeSimulations.value = [];
}
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
        <!-- Method and Path -->
        <div class="simulator-form__row">
          <select
            v-model="newSimulationMethod"
            class="simulator-form__method input"
          >
            <option v-for="method in httpMethods" :key="method" :value="method">
              {{ method }}
            </option>
          </select>
          <input
            v-model="newSimulationPath"
            type="text"
            class="simulator-form__path input"
            placeholder="/api/path or * for all"
          />
        </div>

        <!-- Preset Selection -->
        <div class="simulator-presets">
          <button
            v-for="preset in presets"
            :key="preset.id"
            :class="[
              'simulator-preset',
              { 'simulator-preset--selected': selectedPresetId === preset.id },
              preset.type === 'delay'
                ? 'simulator-preset--delay'
                : 'simulator-preset--error',
            ]"
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
          :disabled="!canAddSimulation"
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
          Active Simulations ({{ activeSimulations.length }})
        </span>
        <button
          v-if="activeSimulations.length > 0"
          class="btn btn--ghost"
          @click="clearAllSimulations"
        >
          <Trash2 :size="14" />
          <span>Clear All</span>
        </button>
      </div>

      <div class="simulator-active__list">
        <div
          v-for="simulation in activeSimulations"
          :key="simulation.id"
          class="simulator-simulation card"
        >
          <div class="simulator-simulation__info">
            <span
              :class="[
                'method-badge',
                `method-badge--${simulation.method.toLowerCase()}`,
              ]"
            >
              {{ simulation.method }}
            </span>
            <span class="simulator-simulation__path font-mono">
              {{ simulation.path }}
            </span>
          </div>
          <div class="simulator-simulation__preset">
            <component
              :is="simulation.preset.type === 'delay' ? Clock : AlertTriangle"
              :size="14"
              :class="
                simulation.preset.type === 'delay'
                  ? 'text-warning'
                  : 'text-error'
              "
            />
            <span>{{ simulation.preset.label }}</span>
          </div>
          <button
            class="btn btn--ghost btn--icon"
            title="Remove simulation"
            @click="removeSimulation(simulation.id)"
          >
            <Trash2 :size="14" />
          </button>
        </div>

        <!-- Empty State -->
        <div v-if="activeSimulations.length === 0" class="empty-state">
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
  gap: var(--devtools-space-sm);
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
</style>
