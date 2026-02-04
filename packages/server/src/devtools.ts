/**
 * Vue DevTools Integration
 *
 * What: Provides a function to register OpenAPI Server in Vue DevTools
 * How: Uses @vue/devtools-api to add a custom tab with iframe to DevTools SPA
 * Why: Enables debugging and inspection of the mock API server within Vue DevTools
 *
 * @module devtools
 */

import type { App } from 'vue';

/**
 * Options for registering the DevTools plugin
 */
export interface RegisterDevToolsOptions {
  /**
   * The port where the OpenAPI server is running
   * @default 4000
   */
  port?: number;

  /**
   * The host where the OpenAPI server is running
   * @default 'localhost' (or derived from window.location.hostname if in browser)
   */
  host?: string;

  /**
   * The protocol to use for the DevTools URL
   * @default 'http' (or derived from window.location.protocol if in browser)
   */
  protocol?: 'http' | 'https';

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
 *   await registerDevTools(app, { port: 4000 });
 * }
 *
 * app.mount('#app');
 * ```
 *
 * @param app - Vue application instance
 * @param options - Configuration options
 */
export async function registerDevTools(
  app: App,
  options: RegisterDevToolsOptions = {},
): Promise<void> {
  const { enabled = true, label = 'OpenAPI Server', port, host, protocol } = options;

  // Validate app parameter
  if (!app || typeof app !== 'object') {
    // biome-ignore lint/suspicious/noConsole: Intentional warning for invalid app instance
    console.warn('[OpenAPI DevTools] Invalid Vue app instance provided');
    return;
  }

  // Only register if enabled
  if (!enabled) {
    return;
  }

  // Check if running in browser environment
  if (typeof window === 'undefined') {
    return;
  }

  // Lazy import to avoid SSR issues
  try {
    const { addCustomTab } = await import('@vue/devtools-api');

    // Get the DevTools URL
    const devtoolsUrl = getDevToolsUrl(port, host, protocol);

    // Add custom tab with iframe to Vue DevTools
    addCustomTab({
      name: 'vite-plugin-open-api-server',
      title: label,
      icon: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%234f46e5%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z%22/%3E%3Cpolyline points=%223.29 7 12 12 20.71 7%22/%3E%3Cline x1=%2212%22 y1=%2222%22 x2=%2212%22 y2=%2212%22/%3E%3C/svg%3E',
      view: {
        type: 'iframe',
        src: devtoolsUrl,
      },
      category: 'app',
    });
  } catch (error) {
    // Log warning but don't crash the app
    // DevTools integration is optional, so the app should continue working
    // biome-ignore lint/suspicious/noConsole: Intentional warning for registration failure
    console.warn('[OpenAPI DevTools] Failed to register with Vue DevTools:', error);
  }
}

/**
 * Get the DevTools URL for the given configuration
 *
 * When running in a browser, protocol and host are automatically derived from
 * window.location if not explicitly provided.
 *
 * @param port - Server port (default: 4000)
 * @param host - Server host (default: 'localhost' or window.location.hostname)
 * @param protocol - Protocol to use (default: 'http' or window.location.protocol)
 * @returns DevTools SPA URL
 */
export function getDevToolsUrl(port = 4000, host?: string, protocol?: 'http' | 'https'): string {
  // Derive defaults from browser environment if available
  const actualProtocol =
    protocol ||
    (typeof window !== 'undefined'
      ? (window.location.protocol.replace(':', '') as 'http' | 'https')
      : 'http');
  const actualHost =
    host || (typeof window !== 'undefined' ? window.location.hostname : 'localhost');

  return `${actualProtocol}://${actualHost}:${port}/_devtools/`;
}
