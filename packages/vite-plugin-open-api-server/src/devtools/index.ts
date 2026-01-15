/**
 * DevTools Module Exports
 *
 * ## What
 * This module exports the Vue DevTools integration for the OpenAPI mock server.
 *
 * ## How
 * Re-exports all public APIs from the devtools-plugin module for use by
 * consumers who want to integrate with Vue DevTools.
 *
 * ## Why
 * Provides a clean public API surface for DevTools integration while keeping
 * internal implementation details in separate files.
 *
 * @module
 */

// Types
export type {
  OpenApiServerGlobalState,
  RequestLogEntry,
  SetupDevToolsOptions,
} from './devtools-plugin.js';
// Main setup function and utilities
// Constants
export {
  buildInspectorState,
  buildInspectorTree,
  checkDevToolsSupport,
  clearRequestLog,
  DEVTOOLS_INSPECTOR_ID,
  DEVTOOLS_INSPECTOR_LABEL,
  DEVTOOLS_PLUGIN_ID,
  DEVTOOLS_PLUGIN_LABEL,
  GLOBAL_STATE_KEY,
  getGlobalState,
  logRequest,
  setupOpenApiDevTools,
  updateGlobalState,
} from './devtools-plugin.js';
