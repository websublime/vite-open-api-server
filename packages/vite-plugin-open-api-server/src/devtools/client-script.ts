/**
 * DevTools Client Script Generator
 *
 * ## What
 * This module generates the client-side script that is injected into the browser
 * to enable Vue DevTools integration for the OpenAPI mock server.
 *
 * ## How
 * Exports a function that generates the JavaScript code to be injected into
 * the browser. The script is inlined into the HTML by the Vite plugin's
 * `transformIndexHtml` hook.
 *
 * ## Why
 * The DevTools integration runs in the browser and needs to interact with
 * Vue DevTools. This client script fetches the endpoint registry from the
 * mock server and registers the custom DevTools inspector.
 *
 * @module
 * @internal
 */

import { GLOBAL_STATE_KEY } from './devtools-plugin.js';

/**
 * Options for generating the client script
 */
export interface ClientScriptOptions {
  /** The base path for the mock server API (e.g., '/api') */
  proxyPath: string;
  /** Plugin version for display in DevTools */
  version: string;
  /** Whether to enable verbose logging */
  verbose?: boolean;
}

/**
 * Generates the inline client script for DevTools integration.
 *
 * This script is injected into the browser and:
 * 1. Checks if Vue DevTools is available
 * 2. Fetches the endpoint registry from the mock server
 * 3. Sets up the global state for DevTools
 * 4. Registers the custom inspector
 *
 * @param options - Configuration options for the script
 * @returns The JavaScript code to inject
 */
export function generateClientScript(options: ClientScriptOptions): string {
  const { proxyPath, version, verbose = false } = options;

  // Escape values for safe interpolation into JavaScript string literals
  const safeProxyPath = JSON.stringify(proxyPath);
  const safeVersion = JSON.stringify(version);
  const safeGlobalStateKey = JSON.stringify(GLOBAL_STATE_KEY);

  // The script that will be injected into the browser
  // This is written as a template string to be inlined
  return `
(function() {
  'use strict';

  // Constants
  var GLOBAL_STATE_KEY = ${safeGlobalStateKey};
  var PROXY_PATH = ${safeProxyPath};
  var VERSION = ${safeVersion};
  var VERBOSE = ${verbose};

  function log(message) {
    if (VERBOSE) {
      console.log('[OpenAPI DevTools]', message);
    }
  }

  function warn(message) {
    console.warn('[OpenAPI DevTools]', message);
  }

  // Check if we're in development mode
  if (typeof import.meta === 'undefined' || !import.meta.env || !import.meta.env.DEV) {
    return;
  }

  // Check if Vue DevTools is available
  if (typeof window.__VUE_DEVTOOLS_GLOBAL_HOOK__ === 'undefined') {
    log('Vue DevTools not detected, skipping setup');
    return;
  }

  log('Initializing DevTools integration');

  // Initialize global state
  if (!window[GLOBAL_STATE_KEY]) {
    window[GLOBAL_STATE_KEY] = {
      registry: null,
      handlers: new Map(),
      requestLog: [],
      maxLogEntries: 100,
      version: VERSION
    };
  }

  var state = window[GLOBAL_STATE_KEY];

  // Function to fetch registry from mock server
  function fetchRegistry() {
    var registryUrl = PROXY_PATH + '/_openapiserver/registry';

    log('Fetching registry from: ' + registryUrl);

    return fetch(registryUrl)
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Failed to fetch registry: ' + response.status);
        }
        return response.json();
      })
      .then(function(data) {
        log('Registry fetched successfully');

        // Convert endpoints array to Map
        var endpoints = new Map();
        if (data.endpoints && Array.isArray(data.endpoints)) {
          data.endpoints.forEach(function(ep) {
            endpoints.set(ep.operationId, ep);
          });
        }

        // Convert schemas array to Map
        var schemas = new Map();
        if (data.schemas && Array.isArray(data.schemas)) {
          data.schemas.forEach(function(schema) {
            schemas.set(schema.name, schema);
          });
        }

        // Convert security schemes to Map
        var securitySchemes = new Map();
        if (data.securitySchemes && Array.isArray(data.securitySchemes)) {
          data.securitySchemes.forEach(function(scheme) {
            securitySchemes.set(scheme.name, scheme);
          });
        }

        // Update global state
        state.registry = {
          endpoints: endpoints,
          schemas: schemas,
          securitySchemes: securitySchemes
        };

        // Update handlers map
        if (data.handlers && Array.isArray(data.handlers)) {
          data.handlers.forEach(function(h) {
            state.handlers.set(h.operationId, h.hasHandler);
          });
        }

        return state.registry;
      })
      .catch(function(error) {
        warn('Failed to fetch registry: ' + error.message);
        return null;
      });
  }

  // Function to setup DevTools after Vue app is mounted
  function setupDevToolsWhenReady() {
    // Wait for Vue apps to be registered
    var hook = window.__VUE_DEVTOOLS_GLOBAL_HOOK__;

    if (!hook) {
      log('DevTools hook not found');
      return;
    }

    // Check if any Vue apps are registered
    var apps = hook.apps || [];

    if (apps.size > 0 || (Array.isArray(apps) && apps.length > 0)) {
      log('Vue app detected, setting up DevTools');
      initDevTools();
    } else {
      // Wait for app to be registered
      log('Waiting for Vue app to be mounted...');

      var originalEmit = hook.emit;
      var initCalled = false;
      hook.emit = function(event) {
        if ((event === 'app:init' || event === 'init') && !initCalled) {
          initCalled = true;
          log('Vue app initialized, setting up DevTools');
          // Restore original emit before calling initDevTools
          hook.emit = originalEmit;
          setTimeout(initDevTools, 100);
        }
        if (originalEmit) {
          return originalEmit.apply(hook, arguments);
        }
      };
    }
  }

  function initDevTools() {
    // Fetch registry first
    fetchRegistry().then(function(registry) {
      if (!registry) {
        log('No registry available, DevTools setup skipped');
        return;
      }

      log('DevTools setup complete with ' + registry.endpoints.size + ' endpoints');

      // Dispatch custom event to notify that DevTools is ready
      window.dispatchEvent(new CustomEvent('openapi-devtools-ready', {
        detail: { registry: registry, version: VERSION }
      }));
    });
  }

  // Start initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupDevToolsWhenReady);
  } else {
    setupDevToolsWhenReady();
  }
})();
`.trim();
}

/**
 * Generates the script tag HTML for injection
 *
 * @param options - Configuration options for the script
 * @returns HTML script tag with inline JavaScript
 */
export function generateClientScriptTag(options: ClientScriptOptions): string {
  const script = generateClientScript(options);
  return `<script type="module">${script}</script>`;
}
