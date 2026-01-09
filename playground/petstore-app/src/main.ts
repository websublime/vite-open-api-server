/**
 * Vue Application Entry Point
 *
 * ## What
 * This module serves as the entry point for the Vue 3 application, responsible
 * for creating and mounting the root application component to the DOM.
 *
 * ## How
 * Uses Vue 3's Composition API `createApp` function to instantiate the application
 * with the root `App.vue` component, then mounts it to the DOM element with id "app"
 * defined in `index.html`.
 *
 * ## Why
 * This is the standard Vue 3 application bootstrap pattern that:
 * - Creates a reactive Vue application instance
 * - Attaches the root component tree to the DOM
 * - Enables Vue's reactivity system and component lifecycle
 * - Provides the foundation for the entire application's component hierarchy
 *
 * @module main
 */

import { createApp } from 'vue';
import App from './App.vue';

/**
 * Create and mount the Vue application.
 *
 * @remarks
 * The application is mounted to the `#app` element defined in `index.html`.
 * This element serves as the root container for the entire Vue component tree.
 */
createApp(App).mount('#app');
