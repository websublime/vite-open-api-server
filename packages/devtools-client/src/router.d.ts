/**
 * TypeScript augmentation for vue-router's RouteMeta
 *
 * What: Extends the RouteMeta interface to include custom fields
 * How: Uses TypeScript module augmentation
 * Why: Provides strong typing for route.meta.title and route.meta.icon
 */

import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    /**
     * Display title for the route (shown in navigation tabs)
     */
    title?: string;

    /**
     * Icon name for the route (from lucide-vue-next)
     */
    icon?: string;
  }
}
