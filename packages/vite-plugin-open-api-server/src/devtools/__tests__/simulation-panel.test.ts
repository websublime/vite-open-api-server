/**
 * Simulation Panel Tests
 *
 * Tests for the simulation panel SFC generator.
 */

import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_PRESETS,
  generateSimulationPanelSfc,
  getSimulationPanelSfc,
} from '../simulation-panel.js';

// ============================================================================
// generateSimulationPanelSfc Tests
// ============================================================================

describe('generateSimulationPanelSfc', () => {
  it('should return a string', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(typeof sfc).toBe('string');
  });

  it('should include Vue SFC structure', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');

    // Check for script setup
    expect(sfc).toContain('<script setup lang="ts">');

    // Check for template
    expect(sfc).toContain('<template>');
    expect(sfc).toContain('</template>');

    // Check for style
    expect(sfc).toContain('<style scoped>');
    expect(sfc).toContain('</style>');
  });

  it('should include the proxy path constant', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain("const PROXY_PATH = '/api/v3'");
  });

  it('should use custom proxy path', () => {
    const sfc = generateSimulationPanelSfc('/custom/api');
    expect(sfc).toContain("const PROXY_PATH = '/custom/api'");
  });

  it('should include simulation panel class', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('class="simulation-panel"');
  });

  it('should include endpoint selector', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('Select Endpoint');
    expect(sfc).toContain('class="select-endpoint"');
  });

  it('should include status code section', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('HTTP Status Code');
    expect(sfc).toContain('simulateStatus');
  });

  it('should include network conditions section', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('Network Conditions');
    expect(sfc).toContain('Network Preset');
    expect(sfc).toContain('Custom Delay');
  });

  it('should include error simulation section', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('Error Simulation');
    expect(sfc).toContain('ERROR_TYPES');
  });

  it('should include edge cases section', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('Edge Cases');
    expect(sfc).toContain('EDGE_CASES');
  });

  it('should include URL generation section', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('Generated URL');
    expect(sfc).toContain('generatedUrl');
    expect(sfc).toContain('Copy URL');
  });

  it('should include presets section', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('Quick Presets');
    expect(sfc).toContain('BUILT_IN_PRESETS');
  });

  it('should include built-in presets JSON', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');

    // Check that some preset IDs are included
    expect(sfc).toContain('slow-network');
    expect(sfc).toContain('server-error');
    expect(sfc).toContain('not-found');
    expect(sfc).toContain('timeout');
  });

  it('should include computed generatedUrl', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('const generatedUrl = computed');
  });

  it('should include copy URL function', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('async function copyUrl()');
  });

  it('should include apply preset function', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('function applyPreset(preset');
  });

  it('should include reset params function', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('function resetParams()');
  });

  it('should include fetch endpoints function', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('async function fetchEndpoints()');
  });

  it('should include endpoint info display', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('endpoint-info');
    expect(sfc).toContain('endpoint-badge');
  });

  it('should include handler/seed badges', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('Custom Handler');
    expect(sfc).toContain('Custom Seed');
    expect(sfc).toContain('Auto-generated');
  });

  it('should include loading state', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('isLoading');
    expect(sfc).toContain('Loading endpoints');
    expect(sfc).toContain('class="spinner"');
  });

  it('should include error state', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('error-state');
    expect(sfc).toContain('Retry');
  });

  it('should include empty state', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('empty-state');
    expect(sfc).toContain('Select an endpoint');
  });

  it('should include footer with endpoint count', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('endpoint-count');
    expect(sfc).toContain('endpoints available');
  });

  it('should include dark mode styles', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('.dark ');
  });

  it('should include CSS variables for theming', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');
    expect(sfc).toContain('var(--vt-c-');
  });
});

// ============================================================================
// getSimulationPanelSfc Tests
// ============================================================================

describe('getSimulationPanelSfc', () => {
  it('should return a string', () => {
    const sfc = getSimulationPanelSfc();
    expect(typeof sfc).toBe('string');
  });

  it('should use default proxy path /api/v3', () => {
    const sfc = getSimulationPanelSfc();
    expect(sfc).toContain("const PROXY_PATH = '/api/v3'");
  });

  it('should return same structure as generateSimulationPanelSfc', () => {
    const sfcDefault = getSimulationPanelSfc();
    const sfcGenerated = generateSimulationPanelSfc('/api/v3');

    expect(sfcDefault).toBe(sfcGenerated);
  });
});

// ============================================================================
// BUILT_IN_PRESETS Export Tests
// ============================================================================

describe('BUILT_IN_PRESETS export from simulation-panel', () => {
  it('should export BUILT_IN_PRESETS', () => {
    expect(BUILT_IN_PRESETS).toBeDefined();
    expect(Array.isArray(BUILT_IN_PRESETS)).toBe(true);
  });

  it('should have presets with required fields', () => {
    for (const preset of BUILT_IN_PRESETS) {
      expect(preset.id).toBeDefined();
      expect(preset.name).toBeDefined();
      expect(preset.description).toBeDefined();
      expect(preset.isBuiltIn).toBe(true);
      expect(preset.params).toBeDefined();
    }
  });
});

// ============================================================================
// SFC Content Validation Tests
// ============================================================================

describe('SFC content validation', () => {
  it('should have valid Vue imports', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');

    // Check for Vue imports
    expect(sfc).toContain("import { ref, computed, onMounted, watch, reactive } from 'vue'");
  });

  it('should have reactive state variables', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');

    expect(sfc).toContain('const endpoints = ref<EndpointData[]>([])');
    expect(sfc).toContain('const selectedOperationId = ref<string | null>(null)');
    expect(sfc).toContain('const isLoading = ref(true)');
    expect(sfc).toContain('const error = ref<string | null>(null)');
    expect(sfc).toContain('const urlCopied = ref(false)');
  });

  it('should have params reactive object', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');

    expect(sfc).toContain('const params = reactive<SimulationParams>');
    expect(sfc).toContain('statusCode: null');
    expect(sfc).toContain('delay: 0');
    expect(sfc).toContain("errorType: 'none'");
    expect(sfc).toContain("edgeCase: 'normal'");
  });

  it('should have computed properties', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');

    expect(sfc).toContain('const selectedEndpoint = computed');
    expect(sfc).toContain('const availableStatusCodes = computed');
    expect(sfc).toContain('const generatedUrl = computed');
    expect(sfc).toContain('const simulationDescription = computed');
    expect(sfc).toContain('const endpointsByTag = computed');
  });

  it('should have lifecycle hooks', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');

    expect(sfc).toContain('onMounted');
    expect(sfc).toContain('fetchEndpoints()');
  });

  it('should have watchers', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');

    expect(sfc).toContain('watch(() => params.networkPreset');
  });

  it('should access global state correctly', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');

    expect(sfc).toContain('GLOBAL_STATE_KEY');
    expect(sfc).toContain("'__VITE_OPENAPI_SERVER__'");
    expect(sfc).toContain('(window as any)[GLOBAL_STATE_KEY]');
  });

  it('should have fallback fetch for registry', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');

    expect(sfc).toContain('/__registry__');
    expect(sfc).toContain('fetch(');
  });

  it('should include method color helper', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');

    expect(sfc).toContain('function getMethodColor(method');
    expect(sfc).toContain("GET: '#22c55e'");
    expect(sfc).toContain("POST: '#3b82f6'");
    expect(sfc).toContain("DELETE: '#ef4444'");
  });

  it('should include status text helper', () => {
    const sfc = generateSimulationPanelSfc('/api/v3');

    expect(sfc).toContain('function getStatusText(status');
    expect(sfc).toContain("200: 'OK'");
    expect(sfc).toContain("404: 'Not Found'");
    expect(sfc).toContain("500: 'Internal Server Error'");
  });
});
