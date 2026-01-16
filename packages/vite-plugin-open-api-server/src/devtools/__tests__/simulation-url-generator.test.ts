/**
 * Simulation URL Generator Tests
 *
 * Tests for the URL generation functions used in the simulation panel.
 */

import { describe, expect, it } from 'vitest';
import {
  buildQueryParams,
  buildQueryString,
  generateDescription,
  generateQuickUrls,
  generateSimulationUrl,
  generateStatusCodeUrls,
  parseSimulationParams,
  SIMULATION_QUERY_PARAMS,
} from '../simulation-url-generator.js';

// ============================================================================
// buildQueryParams Tests
// ============================================================================

describe('buildQueryParams', () => {
  it('should return empty object for empty params', () => {
    expect(buildQueryParams({})).toEqual({});
  });

  it('should add simulateStatus for status code', () => {
    const params = buildQueryParams({ statusCode: 404 });
    expect(params[SIMULATION_QUERY_PARAMS.STATUS]).toBe('404');
  });

  it('should not add status code when null or 0', () => {
    expect(buildQueryParams({ statusCode: null })).toEqual({});
    expect(buildQueryParams({ statusCode: 0 })).toEqual({});
  });

  it('should add simulateDelay for delay', () => {
    const params = buildQueryParams({ delay: 1000 });
    expect(params[SIMULATION_QUERY_PARAMS.DELAY]).toBe('1000');
  });

  it('should not add delay when 0', () => {
    expect(buildQueryParams({ delay: 0 })).toEqual({});
  });

  it('should add simulateTimeout for timeout error type', () => {
    const params = buildQueryParams({ errorType: 'timeout' });
    expect(params[SIMULATION_QUERY_PARAMS.TIMEOUT]).toBe('true');
  });

  it('should add simulateTimeout with delay for timeout with timeoutMs', () => {
    const params = buildQueryParams({ errorType: 'timeout', timeoutMs: 5000 });
    expect(params[SIMULATION_QUERY_PARAMS.TIMEOUT]).toBe('true');
    expect(params[SIMULATION_QUERY_PARAMS.DELAY]).toBe('5000');
  });

  it('should add simulateError for non-timeout error types', () => {
    const params = buildQueryParams({ errorType: 'network-error' });
    expect(params[SIMULATION_QUERY_PARAMS.ERROR]).toBe('network-error');
  });

  it('should not add error for none', () => {
    expect(buildQueryParams({ errorType: 'none' })).toEqual({});
  });

  it('should add simulateConnection for non-normal connection types', () => {
    const params = buildQueryParams({ connectionType: 'drop' });
    expect(params[SIMULATION_QUERY_PARAMS.CONNECTION]).toBe('drop');
  });

  it('should not add connection for normal', () => {
    expect(buildQueryParams({ connectionType: 'normal' })).toEqual({});
  });

  it('should add simulateEdgeCase for non-normal edge cases', () => {
    const params = buildQueryParams({ edgeCase: 'empty-response' });
    expect(params[SIMULATION_QUERY_PARAMS.EDGE_CASE]).toBe('empty-response');
  });

  it('should not add edge case for normal', () => {
    expect(buildQueryParams({ edgeCase: 'normal' })).toEqual({});
  });

  it('should combine multiple params', () => {
    const params = buildQueryParams({
      statusCode: 500,
      delay: 2000,
      connectionType: 'drop',
    });

    expect(params[SIMULATION_QUERY_PARAMS.STATUS]).toBe('500');
    expect(params[SIMULATION_QUERY_PARAMS.DELAY]).toBe('2000');
    expect(params[SIMULATION_QUERY_PARAMS.CONNECTION]).toBe('drop');
  });
});

// ============================================================================
// buildQueryString Tests
// ============================================================================

describe('buildQueryString', () => {
  it('should return empty string for empty params', () => {
    expect(buildQueryString({})).toBe('');
  });

  it('should build query string from single param', () => {
    const result = buildQueryString({ foo: 'bar' });
    expect(result).toBe('foo=bar');
  });

  it('should build query string from multiple params', () => {
    const result = buildQueryString({ foo: 'bar', baz: 'qux' });
    expect(result).toContain('foo=bar');
    expect(result).toContain('baz=qux');
    expect(result).toContain('&');
  });

  it('should URL-encode special characters', () => {
    const result = buildQueryString({ key: 'value with spaces' });
    expect(result).toBe('key=value%20with%20spaces');
  });
});

// ============================================================================
// generateSimulationUrl Tests
// ============================================================================

describe('generateSimulationUrl', () => {
  const baseOptions = {
    baseUrl: 'http://localhost:5173',
    proxyPath: '/api/v3',
    endpointPath: '/pet/1',
  };

  it('should generate base URL without params', () => {
    const result = generateSimulationUrl({
      ...baseOptions,
      params: {},
    });

    expect(result.url).toBe('http://localhost:5173/api/v3/pet/1');
    expect(result.baseUrl).toBe('http://localhost:5173/api/v3/pet/1');
    expect(result.queryParams).toEqual({});
  });

  it('should generate URL with status code', () => {
    const result = generateSimulationUrl({
      ...baseOptions,
      params: { statusCode: 404 },
    });

    expect(result.url).toBe('http://localhost:5173/api/v3/pet/1?simulateStatus=404');
    expect(result.queryParams[SIMULATION_QUERY_PARAMS.STATUS]).toBe('404');
  });

  it('should generate URL with delay', () => {
    const result = generateSimulationUrl({
      ...baseOptions,
      params: { delay: 2000 },
    });

    expect(result.url).toContain('simulateDelay=2000');
  });

  it('should generate URL with multiple params', () => {
    const result = generateSimulationUrl({
      ...baseOptions,
      params: {
        statusCode: 500,
        delay: 1000,
        edgeCase: 'empty-response',
      },
    });

    expect(result.url).toContain('simulateStatus=500');
    expect(result.url).toContain('simulateDelay=1000');
    expect(result.url).toContain('simulateEdgeCase=empty-response');
  });

  it('should handle trailing slashes correctly', () => {
    const result = generateSimulationUrl({
      baseUrl: 'http://localhost:5173/',
      proxyPath: '/api/v3/',
      endpointPath: '/pet/1',
      params: {},
    });

    expect(result.url).toBe('http://localhost:5173/api/v3/pet/1');
  });

  it('should handle missing leading slashes', () => {
    const result = generateSimulationUrl({
      baseUrl: 'http://localhost:5173',
      proxyPath: 'api/v3',
      endpointPath: 'pet/1',
      params: {},
    });

    expect(result.url).toBe('http://localhost:5173/api/v3/pet/1');
  });

  it('should include description', () => {
    const result = generateSimulationUrl({
      ...baseOptions,
      params: { statusCode: 404 },
    });

    expect(result.description).toContain('404');
  });
});

// ============================================================================
// parseSimulationParams Tests
// ============================================================================

describe('parseSimulationParams', () => {
  it('should parse status code', () => {
    const result = parseSimulationParams('http://localhost/api?simulateStatus=404');
    expect(result.statusCode).toBe(404);
  });

  it('should parse delay', () => {
    const result = parseSimulationParams('http://localhost/api?simulateDelay=2000');
    expect(result.delay).toBe(2000);
  });

  it('should parse legacy delay parameter', () => {
    const result = parseSimulationParams('http://localhost/api?delay=1000');
    expect(result.delay).toBe(1000);
  });

  it('should parse timeout', () => {
    const result = parseSimulationParams('http://localhost/api?simulateTimeout=true');
    expect(result.errorType).toBe('timeout');
  });

  it('should parse connection type', () => {
    const result = parseSimulationParams('http://localhost/api?simulateConnection=drop');
    expect(result.connectionType).toBe('drop');
  });

  it('should parse error type', () => {
    const result = parseSimulationParams('http://localhost/api?simulateError=network-error');
    expect(result.errorType).toBe('network-error');
  });

  it('should parse edge case', () => {
    const result = parseSimulationParams('http://localhost/api?simulateEdgeCase=empty-response');
    expect(result.edgeCase).toBe('empty-response');
  });

  it('should parse multiple params', () => {
    const url =
      'http://localhost/api?simulateStatus=500&simulateDelay=1000&simulateConnection=drop';
    const result = parseSimulationParams(url);

    expect(result.statusCode).toBe(500);
    expect(result.delay).toBe(1000);
    expect(result.connectionType).toBe('drop');
  });

  it('should handle invalid URL gracefully', () => {
    const result = parseSimulationParams('not a valid url');
    expect(result).toEqual({});
  });

  it('should handle URL without params', () => {
    const result = parseSimulationParams('http://localhost/api/pet/1');
    expect(result).toEqual({});
  });
});

// ============================================================================
// generateDescription Tests
// ============================================================================

describe('generateDescription', () => {
  it('should return normal response for empty params', () => {
    expect(generateDescription({})).toBe('Normal response (no simulation)');
  });

  it('should describe status code', () => {
    expect(generateDescription({ statusCode: 404 })).toContain('HTTP 404');
  });

  it('should describe delay in ms', () => {
    expect(generateDescription({ delay: 500 })).toContain('500ms');
  });

  it('should describe delay in seconds', () => {
    expect(generateDescription({ delay: 2000 })).toContain('2s');
  });

  it('should describe timeout', () => {
    expect(generateDescription({ errorType: 'timeout' })).toContain('timeout');
  });

  it('should describe connection drop', () => {
    expect(generateDescription({ connectionType: 'drop' })).toContain('Drops connection');
  });

  it('should describe connection reset', () => {
    expect(generateDescription({ connectionType: 'reset' })).toContain('Resets connection');
  });

  it('should describe partial response', () => {
    expect(generateDescription({ connectionType: 'partial' })).toContain('partial');
  });

  it('should describe network error', () => {
    expect(generateDescription({ errorType: 'network-error' })).toContain('network error');
  });

  it('should describe empty response', () => {
    expect(generateDescription({ edgeCase: 'empty-response' })).toContain('empty body');
  });

  it('should combine multiple descriptions', () => {
    const desc = generateDescription({
      statusCode: 500,
      delay: 2000,
    });

    expect(desc).toContain('HTTP 500');
    expect(desc).toContain('2s delay');
  });
});

// ============================================================================
// generateQuickUrls Tests
// ============================================================================

describe('generateQuickUrls', () => {
  it('should generate all quick URLs', () => {
    const urls = generateQuickUrls('http://localhost:5173', '/api/v3', '/pet/1');

    expect(urls.normal).toBeDefined();
    expect(urls.notFound).toBeDefined();
    expect(urls.serverError).toBeDefined();
    expect(urls.slow).toBeDefined();
    expect(urls.timeout).toBeDefined();
    expect(urls.empty).toBeDefined();
  });

  it('should generate normal URL without params', () => {
    const urls = generateQuickUrls('http://localhost:5173', '/api/v3', '/pet/1');

    expect(urls.normal.url).toBe('http://localhost:5173/api/v3/pet/1');
    expect(urls.normal.queryParams).toEqual({});
  });

  it('should generate 404 URL', () => {
    const urls = generateQuickUrls('http://localhost:5173', '/api/v3', '/pet/1');

    expect(urls.notFound.url).toContain('simulateStatus=404');
  });

  it('should generate 500 URL', () => {
    const urls = generateQuickUrls('http://localhost:5173', '/api/v3', '/pet/1');

    expect(urls.serverError.url).toContain('simulateStatus=500');
  });

  it('should generate slow URL with 2s delay', () => {
    const urls = generateQuickUrls('http://localhost:5173', '/api/v3', '/pet/1');

    expect(urls.slow.url).toContain('simulateDelay=2000');
  });

  it('should generate timeout URL', () => {
    const urls = generateQuickUrls('http://localhost:5173', '/api/v3', '/pet/1');

    expect(urls.timeout.url).toContain('simulateTimeout=true');
  });

  it('should generate empty response URL', () => {
    const urls = generateQuickUrls('http://localhost:5173', '/api/v3', '/pet/1');

    expect(urls.empty.url).toContain('simulateEdgeCase=empty-response');
  });
});

// ============================================================================
// generateStatusCodeUrls Tests
// ============================================================================

describe('generateStatusCodeUrls', () => {
  it('should generate URLs for each status code', () => {
    const statusCodes = [200, 400, 404, 500];
    const urls = generateStatusCodeUrls('http://localhost:5173', '/api/v3', '/pet/1', statusCodes);

    expect(urls).toHaveLength(4);
  });

  it('should include correct status code in each URL', () => {
    const statusCodes = [200, 404, 500];
    const urls = generateStatusCodeUrls('http://localhost:5173', '/api/v3', '/pet/1', statusCodes);

    expect(urls[0].url).toContain('simulateStatus=200');
    expect(urls[1].url).toContain('simulateStatus=404');
    expect(urls[2].url).toContain('simulateStatus=500');
  });

  it('should return empty array for empty status codes', () => {
    const urls = generateStatusCodeUrls('http://localhost:5173', '/api/v3', '/pet/1', []);

    expect(urls).toEqual([]);
  });
});
