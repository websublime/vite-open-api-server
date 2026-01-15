/**
 * Client Script Tests
 *
 * Unit tests for the DevTools client script generator.
 *
 * @module
 */

import { describe, expect, it } from 'vitest';

import { generateClientScript, generateClientScriptTag } from '../client-script.js';
import { GLOBAL_STATE_KEY } from '../devtools-plugin.js';

describe('generateClientScript', () => {
  const defaultOptions = {
    proxyPath: '/api',
    version: '1.0.0',
  };

  it('should return a non-empty string', () => {
    const script = generateClientScript(defaultOptions);

    expect(typeof script).toBe('string');
    expect(script.length).toBeGreaterThan(0);
  });

  it('should include GLOBAL_STATE_KEY constant', () => {
    const script = generateClientScript(defaultOptions);

    // Value is now JSON.stringify'd for safe interpolation
    expect(script).toContain(`var GLOBAL_STATE_KEY = ${JSON.stringify(GLOBAL_STATE_KEY)}`);
  });

  it('should not include PLUGIN_ID constant (removed as unused)', () => {
    const script = generateClientScript(defaultOptions);

    // PLUGIN_ID was removed as it was unused in the generated script
    expect(script).not.toContain('var PLUGIN_ID');
  });

  it('should include proxyPath', () => {
    const script = generateClientScript(defaultOptions);

    // Values are now JSON.stringify'd for safe interpolation
    expect(script).toContain(`var PROXY_PATH = ${JSON.stringify(defaultOptions.proxyPath)}`);
  });

  it('should include version', () => {
    const script = generateClientScript(defaultOptions);

    // Values are now JSON.stringify'd for safe interpolation
    expect(script).toContain(`var VERSION = ${JSON.stringify(defaultOptions.version)}`);
  });

  it('should set VERBOSE to false by default', () => {
    const script = generateClientScript(defaultOptions);

    expect(script).toContain('var VERBOSE = false');
  });

  it('should set VERBOSE to true when specified', () => {
    const script = generateClientScript({
      ...defaultOptions,
      verbose: true,
    });

    expect(script).toContain('var VERBOSE = true');
  });

  it('should include fetchRegistry function', () => {
    const script = generateClientScript(defaultOptions);

    expect(script).toContain('function fetchRegistry()');
  });

  it('should use correct registry endpoint', () => {
    const script = generateClientScript(defaultOptions);

    expect(script).toContain("PROXY_PATH + '/_openapiserver/registry'");
  });

  it('should include DOMContentLoaded event listener', () => {
    const script = generateClientScript(defaultOptions);

    expect(script).toContain('DOMContentLoaded');
  });

  it('should check for Vue DevTools hook', () => {
    const script = generateClientScript(defaultOptions);

    expect(script).toContain('__VUE_DEVTOOLS_GLOBAL_HOOK__');
  });

  it('should check for import.meta.env.DEV', () => {
    const script = generateClientScript(defaultOptions);

    expect(script).toContain('import.meta.env.DEV');
  });

  it('should dispatch custom event when ready', () => {
    const script = generateClientScript(defaultOptions);

    expect(script).toContain('openapi-devtools-ready');
    expect(script).toContain('CustomEvent');
  });

  it('should initialize global state object', () => {
    const script = generateClientScript(defaultOptions);

    expect(script).toContain('window[GLOBAL_STATE_KEY]');
    expect(script).toContain('registry: null');
    expect(script).toContain('handlers: new Map()');
    expect(script).toContain('requestLog: []');
  });

  it('should handle different proxyPath values', () => {
    const script = generateClientScript({
      proxyPath: '/api/v3',
      version: '2.0.0',
    });

    // Values are now JSON.stringify'd for safe interpolation
    expect(script).toContain('var PROXY_PATH = "/api/v3"');
    expect(script).toContain('var VERSION = "2.0.0"');
  });

  it('should safely escape values with special characters', () => {
    const script = generateClientScript({
      proxyPath: '/api"with\'quotes',
      version: '1.0.0',
    });

    // JSON.stringify escapes quotes properly
    expect(script).toContain('var PROXY_PATH = "/api\\"with\'quotes"');
  });

  it('should be wrapped in IIFE', () => {
    const script = generateClientScript(defaultOptions);

    expect(script.startsWith('(function()')).toBe(true);
    expect(script.endsWith('})();')).toBe(true);
  });

  it('should use strict mode', () => {
    const script = generateClientScript(defaultOptions);

    expect(script).toContain("'use strict'");
  });
});

describe('generateClientScriptTag', () => {
  const defaultOptions = {
    proxyPath: '/api',
    version: '1.0.0',
  };

  it('should wrap script in script tag', () => {
    const tag = generateClientScriptTag(defaultOptions);

    expect(tag.startsWith('<script type="module">')).toBe(true);
    expect(tag.endsWith('</script>')).toBe(true);
  });

  it('should include the generated script', () => {
    const tag = generateClientScriptTag(defaultOptions);
    const script = generateClientScript(defaultOptions);

    expect(tag).toContain(script);
  });

  it('should use module type for ES modules support', () => {
    const tag = generateClientScriptTag(defaultOptions);

    expect(tag).toContain('type="module"');
  });
});
