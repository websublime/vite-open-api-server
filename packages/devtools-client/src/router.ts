/**
 * Vue Router Configuration
 *
 * What: Defines routing configuration for the DevTools SPA
 * How: Creates routes for each main page/tab in the application
 * Why: Enables navigation between different DevTools features
 */

import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

/**
 * Route definitions for the DevTools SPA
 *
 * Each route corresponds to a tab in the DevTools interface:
 * - Routes: Endpoint listing and details
 * - Timeline: Request/response log with real-time updates
 * - Models: Store data editor for viewing/modifying mock data
 * - Simulator: Error simulation controls
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/routes',
  },
  {
    path: '/routes',
    name: 'routes',
    component: () => import('@/pages/RoutesPage.vue'),
    meta: {
      title: 'Routes',
      icon: 'route',
    },
  },
  {
    path: '/timeline',
    name: 'timeline',
    component: () => import('@/pages/TimelinePage.vue'),
    meta: {
      title: 'Timeline',
      icon: 'clock',
    },
  },
  {
    path: '/models',
    name: 'models',
    component: () => import('@/pages/ModelsPage.vue'),
    meta: {
      title: 'Models',
      icon: 'database',
    },
  },
  {
    path: '/simulator',
    name: 'simulator',
    component: () => import('@/pages/SimulatorPage.vue'),
    meta: {
      title: 'Simulator',
      icon: 'zap',
    },
  },
  // Catch-all route for undefined paths - redirects to routes page
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    redirect: '/routes',
  },
];

/**
 * Create the router instance
 *
 * Uses hash history mode for compatibility when embedded in iframes
 * or served from arbitrary paths in the dev server
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export { routes };
export default router;
