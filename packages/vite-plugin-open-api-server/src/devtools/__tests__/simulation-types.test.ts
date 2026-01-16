/**
 * Simulation Types Tests
 *
 * Tests for the simulation types, constants, and helper functions.
 */

import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_PRESETS,
  DEFAULT_PANEL_STATE,
  DEFAULT_SIMULATION_PARAMS,
  getEdgeCaseDescription,
  getErrorTypeDescription,
  getNetworkPresetDelay,
  getStatusDescription,
  isClientError,
  isServerError,
  isSuccessStatus,
  type NetworkConditionPreset,
  type SimulationEdgeCase,
  type SimulationErrorType,
} from '../simulation-types.js';

// ============================================================================
// Default Values Tests
// ============================================================================

describe('DEFAULT_SIMULATION_PARAMS', () => {
  it('should have correct default values', () => {
    expect(DEFAULT_SIMULATION_PARAMS).toEqual({
      operationId: null,
      statusCode: null,
      delay: 0,
      errorType: 'none',
      edgeCase: 'normal',
      networkPreset: 'none',
      connectionType: 'normal',
      timeoutMs: 30000,
    });
  });
});

describe('DEFAULT_PANEL_STATE', () => {
  it('should have correct default state', () => {
    expect(DEFAULT_PANEL_STATE.endpoints).toEqual([]);
    expect(DEFAULT_PANEL_STATE.selectedEndpoint).toBeNull();
    expect(DEFAULT_PANEL_STATE.generatedUrl).toBeNull();
    expect(DEFAULT_PANEL_STATE.urlCopied).toBe(false);
    expect(DEFAULT_PANEL_STATE.isLoading).toBe(true);
    expect(DEFAULT_PANEL_STATE.error).toBeNull();
  });

  it('should include built-in presets', () => {
    expect(DEFAULT_PANEL_STATE.presets).toEqual(BUILT_IN_PRESETS);
  });
});

// ============================================================================
// Built-in Presets Tests
// ============================================================================

describe('BUILT_IN_PRESETS', () => {
  it('should have at least one preset', () => {
    expect(BUILT_IN_PRESETS.length).toBeGreaterThan(0);
  });

  it('should have required fields for each preset', () => {
    for (const preset of BUILT_IN_PRESETS) {
      expect(preset.id).toBeDefined();
      expect(typeof preset.id).toBe('string');
      expect(preset.name).toBeDefined();
      expect(typeof preset.name).toBe('string');
      expect(preset.description).toBeDefined();
      expect(typeof preset.description).toBe('string');
      expect(preset.isBuiltIn).toBe(true);
      expect(preset.params).toBeDefined();
    }
  });

  it('should include common presets', () => {
    const presetIds = BUILT_IN_PRESETS.map((p) => p.id);

    expect(presetIds).toContain('slow-network');
    expect(presetIds).toContain('server-error');
    expect(presetIds).toContain('not-found');
    expect(presetIds).toContain('timeout');
  });

  it('should have valid params for each preset', () => {
    for (const preset of BUILT_IN_PRESETS) {
      expect(typeof preset.params.delay).toBe('number');
      expect(preset.params.errorType).toBeDefined();
      expect(preset.params.edgeCase).toBeDefined();
      expect(preset.params.connectionType).toBeDefined();
    }
  });
});

// ============================================================================
// Status Code Helper Tests
// ============================================================================

describe('isSuccessStatus', () => {
  it('should return true for 2xx status codes', () => {
    expect(isSuccessStatus(200)).toBe(true);
    expect(isSuccessStatus(201)).toBe(true);
    expect(isSuccessStatus(204)).toBe(true);
    expect(isSuccessStatus(299)).toBe(true);
  });

  it('should return false for non-2xx status codes', () => {
    expect(isSuccessStatus(199)).toBe(false);
    expect(isSuccessStatus(300)).toBe(false);
    expect(isSuccessStatus(400)).toBe(false);
    expect(isSuccessStatus(500)).toBe(false);
  });
});

describe('isClientError', () => {
  it('should return true for 4xx status codes', () => {
    expect(isClientError(400)).toBe(true);
    expect(isClientError(401)).toBe(true);
    expect(isClientError(404)).toBe(true);
    expect(isClientError(429)).toBe(true);
    expect(isClientError(499)).toBe(true);
  });

  it('should return false for non-4xx status codes', () => {
    expect(isClientError(200)).toBe(false);
    expect(isClientError(399)).toBe(false);
    expect(isClientError(500)).toBe(false);
  });
});

describe('isServerError', () => {
  it('should return true for 5xx status codes', () => {
    expect(isServerError(500)).toBe(true);
    expect(isServerError(502)).toBe(true);
    expect(isServerError(503)).toBe(true);
    expect(isServerError(599)).toBe(true);
  });

  it('should return false for non-5xx status codes', () => {
    expect(isServerError(200)).toBe(false);
    expect(isServerError(400)).toBe(false);
    expect(isServerError(499)).toBe(false);
  });
});

describe('getStatusDescription', () => {
  it('should return known status descriptions', () => {
    expect(getStatusDescription(200)).toBe('OK');
    expect(getStatusDescription(201)).toBe('Created');
    expect(getStatusDescription(204)).toBe('No Content');
    expect(getStatusDescription(400)).toBe('Bad Request');
    expect(getStatusDescription(401)).toBe('Unauthorized');
    expect(getStatusDescription(403)).toBe('Forbidden');
    expect(getStatusDescription(404)).toBe('Not Found');
    expect(getStatusDescription(500)).toBe('Internal Server Error');
    expect(getStatusDescription(502)).toBe('Bad Gateway');
    expect(getStatusDescription(503)).toBe('Service Unavailable');
  });

  it('should return fallback for unknown status codes', () => {
    expect(getStatusDescription(999)).toBe('Status 999');
    expect(getStatusDescription(418)).toBe('Status 418');
  });
});

// ============================================================================
// Error Type Helper Tests
// ============================================================================

describe('getErrorTypeDescription', () => {
  it('should return descriptions for all error types', () => {
    const errorTypes: SimulationErrorType[] = [
      'none',
      'timeout',
      'network-error',
      'server-error',
      'rate-limit',
      'service-unavailable',
    ];

    for (const errorType of errorTypes) {
      const description = getErrorTypeDescription(errorType);
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    }
  });

  it('should return specific descriptions', () => {
    expect(getErrorTypeDescription('none')).toBe('No error simulation');
    expect(getErrorTypeDescription('timeout')).toContain('timeout');
    expect(getErrorTypeDescription('network-error')).toContain('Network');
    expect(getErrorTypeDescription('rate-limit')).toContain('429');
  });
});

// ============================================================================
// Edge Case Helper Tests
// ============================================================================

describe('getEdgeCaseDescription', () => {
  it('should return descriptions for all edge cases', () => {
    const edgeCases: SimulationEdgeCase[] = [
      'normal',
      'empty-response',
      'empty-array',
      'null-values',
      'malformed-json',
      'large-response',
    ];

    for (const edgeCase of edgeCases) {
      const description = getEdgeCaseDescription(edgeCase);
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    }
  });

  it('should return specific descriptions', () => {
    expect(getEdgeCaseDescription('normal')).toBe('Normal response');
    expect(getEdgeCaseDescription('empty-response')).toContain('Empty');
    expect(getEdgeCaseDescription('malformed-json')).toContain('Malformed');
  });
});

// ============================================================================
// Network Preset Helper Tests
// ============================================================================

describe('getNetworkPresetDelay', () => {
  it('should return correct delays for presets', () => {
    expect(getNetworkPresetDelay('none')).toBe(0);
    expect(getNetworkPresetDelay('3g-slow')).toBe(2000);
    expect(getNetworkPresetDelay('3g-fast')).toBe(750);
    expect(getNetworkPresetDelay('4g')).toBe(100);
    expect(getNetworkPresetDelay('slow-connection')).toBe(5000);
    expect(getNetworkPresetDelay('offline')).toBe(-1);
  });

  it('should return delays as numbers', () => {
    const presets: NetworkConditionPreset[] = [
      'none',
      '3g-slow',
      '3g-fast',
      '4g',
      'slow-connection',
      'offline',
    ];

    for (const preset of presets) {
      expect(typeof getNetworkPresetDelay(preset)).toBe('number');
    }
  });
});
