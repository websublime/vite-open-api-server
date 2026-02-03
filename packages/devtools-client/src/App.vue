<!--
  App.vue - Main Application Component

  What: Root component for the DevTools SPA
  How: Provides the main layout with header, tab navigation, and router view
  Why: Acts as the entry point for the Vue application and defines the overall structure
-->

<script setup lang="ts">
import { Clock, Database, Route, Wifi, WifiOff, Zap } from 'lucide-vue-next';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { routes } from '@/router';

const route = useRoute();
const router = useRouter();

// Navigation tabs derived from routes
const tabs = computed(() =>
  routes
    .filter((r) => r.name && r.meta?.title)
    .map((r) => ({
      name: r.name as string,
      path: r.path,
      title: r.meta?.title as string,
      icon: r.meta?.icon as string,
    })),
);

// Current active tab
const activeTab = computed(() => route.name as string);

// Navigate to a tab
function navigateTo(path: string) {
  router.push(path);
}

// Icon component map
const iconMap: Record<string, typeof Route> = {
  route: Route,
  clock: Clock,
  database: Database,
  zap: Zap,
};

// TODO: Connection status will be provided by WebSocket composable
const isConnected = computed(() => false);
</script>

<template>
  <div class="app">
    <!-- Header with branding and connection status -->
    <header class="app-header">
      <div class="app-header__brand">
        <Zap class="app-header__logo" :size="20" />
        <span class="app-header__title">OpenAPI DevTools</span>
      </div>

      <!-- Tab Navigation -->
      <nav class="app-nav">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          :class="[
            'app-nav__tab',
            { 'app-nav__tab--active': activeTab === tab.name },
          ]"
          @click="navigateTo(tab.path)"
        >
          <component
            :is="iconMap[tab.icon]"
            :size="16"
            class="app-nav__icon"
          />
          <span class="app-nav__label">{{ tab.title }}</span>
        </button>
      </nav>

      <!-- Connection Status -->
      <div class="app-header__status">
        <div class="connection-status">
          <span
            :class="[
              'connection-status__dot',
              isConnected
                ? 'connection-status__dot--connected'
                : 'connection-status__dot--disconnected',
            ]"
          />
          <span class="connection-status__text">
            {{ isConnected ? 'Connected' : 'Disconnected' }}
          </span>
          <component
            :is="isConnected ? Wifi : WifiOff"
            :size="14"
            class="connection-status__icon"
          />
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--devtools-bg);
}

/* Header styles */
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--devtools-header-height);
  padding: 0 var(--devtools-space-md);
  background-color: var(--devtools-surface);
  border-bottom: 1px solid var(--devtools-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.app-header__brand {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-sm);
}

.app-header__logo {
  color: var(--devtools-primary);
}

.app-header__title {
  font-weight: var(--font-weight-6);
  font-size: var(--font-size-1);
  color: var(--devtools-text);
}

.app-header__status {
  display: flex;
  align-items: center;
}

/* Navigation styles */
.app-nav {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-xs);
  height: 100%;
}

.app-nav__tab {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-xs);
  height: 100%;
  padding: 0 var(--devtools-space-md);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--devtools-text-muted);
  font-family: var(--devtools-font-sans);
  font-size: var(--font-size-0);
  font-weight: var(--font-weight-5);
  cursor: pointer;
  transition: all var(--devtools-transition-fast);
}

.app-nav__tab:hover {
  color: var(--devtools-text);
  background-color: var(--devtools-surface-elevated);
}

.app-nav__tab--active {
  color: var(--devtools-primary);
  border-bottom-color: var(--devtools-primary);
}

.app-nav__icon {
  flex-shrink: 0;
}

.app-nav__label {
  white-space: nowrap;
}

/* Connection status styles */
.connection-status {
  display: flex;
  align-items: center;
  gap: var(--devtools-space-xs);
  font-size: var(--font-size-0);
  color: var(--devtools-text-muted);
}

.connection-status__icon {
  opacity: 0.7;
}

/* Main content styles */
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Page transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--devtools-transition-normal);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
