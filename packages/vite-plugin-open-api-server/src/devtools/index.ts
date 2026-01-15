/**
 * DevTools Module Exports
 *
 * ## What
 * This module exports the Vue DevTools integration for the OpenAPI mock server.
 *
 * ## How
 * Re-exports the main plugin factory and types for consumers who want
 * to integrate with Vue DevTools following the Pinia pattern.
 *
 * ## Why
 * Provides a clean public API surface for DevTools integration where users
 * install the plugin via `app.use()` for automatic registration.
 *
 * @example
 * ```ts
 * import { createApp } from 'vue'
 * import { createOpenApiDevTools } from '@websublime/vite-plugin-open-api-server/devtools'
 * import App from './App.vue'
 *
 * const app = createApp(App)
 *
 * // Install the DevTools plugin (only in development)
 * if (import.meta.env.DEV) {
 *   app.use(createOpenApiDevTools({ proxyPath: '/api/v3' }))
 * }
 *
 * app.mount('#app')
 * ```
 *
 * @module
 */

// Types
export type {
  EndpointData,
  GlobalState,
  OpenApiDevToolsOptions,
  RegistryData,
  RequestLogEntry,
} from './browser-client.js';
// Main plugin factory for Vue DevTools integration (recommended)
// Constants for external use
/**
 * @deprecated Use `createOpenApiDevTools()` instead.
 * This export is kept for backwards compatibility but will be removed in a future version.
 * @see createOpenApiDevTools
 */
export {
  createOpenApiDevTools,
  DEVTOOLS_INSPECTOR_ID,
  DEVTOOLS_PLUGIN_ID,
  GLOBAL_STATE_KEY,
  registerOpenApiDevTools,
} from './browser-client.js';
// Fetch interceptor for request logging
export type { FetchInterceptorConfig } from './fetch-interceptor.js';
export {
  getInterceptorProxyPath,
  installFetchInterceptor,
  isFetchInterceptorActive,
  uninstallFetchInterceptor,
} from './fetch-interceptor.js';
// Timeline types and functions
export type { TimelineRequestEvent } from './request-timeline.js';
export {
  addTimelineRequestEvent,
  isTimelineReady,
  TIMELINE_LAYER_COLOR,
  TIMELINE_LAYER_ID,
  TIMELINE_LAYER_LABEL,
} from './request-timeline.js';
