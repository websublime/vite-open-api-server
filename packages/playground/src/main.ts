/**
 * Main Entry Point for Playground App
 *
 * What: Initializes and mounts the Vue application
 * How: Creates Vue app instance and mounts to DOM
 * Why: Required entry point for the Playground app
 */

import { createApp } from 'vue';

import App from './App.vue';

// Create and mount the Vue app
createApp(App).mount('#app');
