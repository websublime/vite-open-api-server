/**
 * Main Entry Point for DevTools SPA
 *
 * What: Initializes and mounts the Vue application
 * How: Creates Vue app instance with Pinia and Vue Router
 * Why: Required entry point for the DevTools SPA
 */

import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from '@/App.vue';
import router from '@/router';
import { initializeStores } from '@/stores';

// Import global styles
import '@/assets/main.css';

/**
 * Create and configure the Vue application
 */
function bootstrap() {
  // Create Vue app instance
  const app = createApp(App);

  // Create Pinia store instance
  const pinia = createPinia();

  // Install plugins
  app.use(pinia);
  app.use(router);

  // Initialize stores after Pinia is installed
  initializeStores();

  // Mount the app to the DOM
  app.mount('#app');

  // Log startup info in development
  if (import.meta.env.DEV) {
    console.log('[OpenAPI DevTools] Application initialized');
  }
}

// Bootstrap the application
bootstrap();

/**
 * Export the bootstrap function for library consumers
 * who may want to manually initialize the DevTools
 */
export { bootstrap };
