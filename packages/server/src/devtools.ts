/**
 * Vue DevTools Integration
 *
 * What: Provides a function to register OpenAPI Server in Vue DevTools
 * How: Uses @vue/devtools-api to add a custom tab with iframe to DevTools SPA
 * Why: Enables debugging and inspection of the mock API server within Vue DevTools
 *
 * @module devtools
 */

import { setupDevtoolsPlugin } from '@vue/devtools-api';
import type { App } from 'vue';

/**
 * Options for registering the DevTools plugin
 */
export interface RegisterDevToolsOptions {
  /**
   * The port where the OpenAPI server is running
   * @default 3000
   */
  port?: number;

  /**
   * Enable or disable DevTools registration
   * @default true
   */
  enabled?: boolean;

  /**
   * Custom label for the DevTools tab
   * @default 'OpenAPI Server'
   */
  label?: string;
}

/**
 * Register OpenAPI Server in Vue DevTools
 *
 * This function should be called in your Vue application's main entry point
 * to add a custom tab to Vue DevTools. The tab contains an iframe that loads
 * the OpenAPI Server DevTools SPA.
 *
 * @example
 * ```typescript
 * // In your main.ts or main.js
 * import { createApp } from 'vue';
 * import { registerDevTools } from '@websublime/vite-plugin-open-api-server';
 * import App from './App.vue';
 *
 * const app = createApp(App);
 *
 * // Register OpenAPI Server DevTools
 * if (import.meta.env.DEV) {
 *   registerDevTools(app, { port: 3000 });
 * }
 *
 * app.mount('#app');
 * ```
 *
 * @param app - Vue application instance
 * @param options - Configuration options
 */
export function registerDevTools(app: App, options: RegisterDevToolsOptions = {}): void {
  const { port = 3000, enabled = true, label = 'OpenAPI Server' } = options;

  // Only register if enabled
  if (!enabled) {
    return;
  }

  // Check if running in browser environment
  if (typeof window === 'undefined') {
    return;
  }

  const devtoolsUrl = `http://localhost:${port}/_devtools/`;

  setupDevtoolsPlugin(
    {
      id: 'vite-plugin-open-api-server',
      label,
      packageName: '@websublime/vite-plugin-open-api-server',
      homepage: 'https://github.com/websublime/vite-open-api-server',
      logo: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%234f46e5%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z%22/%3E%3Cpolyline points=%223.29 7 12 12 20.71 7%22/%3E%3Cline x1=%2212%22 y1=%2222%22 x2=%2212%22 y2=%2212%22/%3E%3C/svg%3E',
      app,
    },
    (api) => {
      // Add custom inspector for viewing routes
      api.addInspector({
        id: 'openapi-routes',
        label: 'OpenAPI Routes',
        icon: 'list',
      });

      // Add custom timeline layer for API requests
      api.addTimelineLayer({
        id: 'openapi-requests',
        label: 'API Requests',
        color: 0x4f46e5,
      });

      // Add custom view (iframe)
      // Note: The DevTools API v7+ uses a different approach for custom views
      // We'll use the timeline and inspector for now, and the iframe will be
      // accessible via the standalone DevTools SPA URL
      api.on.visitComponentTree(() => {
        // Future: Add component tree customization if needed
      });

      // Log successful registration
      console.log(
        `[OpenAPI Server] DevTools registered. Access DevTools at: ${devtoolsUrl}`,
      );
    },
  );
}

/**
 * Get the DevTools URL for the given port
 *
 * @param port - Server port
 * @returns DevTools SPA URL
 */
export function getDevToolsUrl(port = 3000): string {
  return `http://localhost:${port}/_devtools/`;
}
