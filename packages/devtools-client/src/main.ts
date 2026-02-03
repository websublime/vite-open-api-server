/**
 * Main Entry Point for DevTools SPA
 *
 * What: Initializes and mounts the Vue application
 * How: Creates Vue app instance with Pinia and Vue Router
 * Why: Required entry point for the DevTools SPA
 */

import { createPinia } from 'pinia';
import type { App } from 'vue';
import { createApp } from 'vue';

import AppComponent from '@/App.vue';
import router from '@/router';
import { initializeStores } from '@/stores';

// Import global styles
import '@/assets/main.css';

/**
 * Module-scoped guard to ensure bootstrap only runs once
 */
let isBootstrapped = false;
let appInstance: App | null = null;

/**
 * Create and configure the Vue application
 * This function is idempotent - calling it multiple times has no effect
 * after the first successful call.
 *
 * @returns The Vue app instance, or null if already bootstrapped
 */
function bootstrap(): App | null {
  // Guard against multiple bootstrap calls
  if (isBootstrapped) {
    if (import.meta.env.DEV) {
      console.warn('[OpenAPI DevTools] Application already initialized, skipping bootstrap');
    }
    return appInstance;
  }

  // Create Vue app instance
  const app = createApp(AppComponent);

  // Create Pinia store instance
  const pinia = createPinia();

  // Install plugins
  app.use(pinia);
  app.use(router);

  // Initialize stores after Pinia is installed
  initializeStores();

  // Mount the app to the DOM
  app.mount('#app');

  // Mark as bootstrapped and store the instance
  isBootstrapped = true;
  appInstance = app;

  // Log startup info in development
  if (import.meta.env.DEV) {
    console.log('[OpenAPI DevTools] Application initialized');
  }

  return app;
}

// Only auto-bootstrap when running as standalone app (index.html entry)
// When imported as a library, consumers should call bootstrap() manually
if (typeof window !== 'undefined' && document.getElementById('app')) {
  bootstrap();
}

/**
 * Export the bootstrap function for library consumers
 * who may want to manually initialize the DevTools
 */
export { bootstrap };

export type { ThemeMode } from '@/composables';
// Re-export composables for library consumers
export { useTheme } from '@/composables';
