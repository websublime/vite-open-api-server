/**
 * useTheme Composable
 *
 * What: Provides reactive theme management for the DevTools SPA
 * How: Uses CSS class on document root and localStorage for persistence
 * Why: Allows users to switch between dark and light mode, respecting system preference
 */

import { computed, getCurrentInstance, onMounted, onUnmounted, ref, watch } from 'vue';

/**
 * Theme mode type
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Storage key for persisting theme preference
 */
const STORAGE_KEY = 'openapi-devtools-theme';

/**
 * Singleton state for theme - shared across all component instances
 */
const themeMode = ref<ThemeMode>('system');
const systemPrefersDark = ref(false);

/**
 * Track the current mediaQuery and handler for cleanup
 */
let currentMediaQuery: MediaQueryList | null = null;
let currentMediaHandler: ((e: MediaQueryListEvent) => void) | null = null;

/**
 * Check if we're running in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Check if we're inside a Vue component context
 * This allows the composable to work both inside and outside components
 */
function hasComponentContext(): boolean {
  return getCurrentInstance() !== null;
}

/**
 * useTheme composable
 *
 * Provides theme management functionality including:
 * - Reactive theme state
 * - System preference detection
 * - Theme toggling
 * - LocalStorage persistence
 *
 * @returns Theme management utilities
 */
export function useTheme() {
  /**
   * Computed property for the effective theme (resolved from system if needed)
   */
  const effectiveTheme = computed<'light' | 'dark'>(() => {
    if (themeMode.value === 'system') {
      return systemPrefersDark.value ? 'dark' : 'light';
    }
    return themeMode.value;
  });

  /**
   * Computed property indicating if dark mode is active
   */
  const isDark = computed(() => effectiveTheme.value === 'dark');

  /**
   * Apply the current theme to the document
   */
  function applyTheme(): void {
    if (!isBrowser()) return;

    const root = document.documentElement;

    if (effectiveTheme.value === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }

  /**
   * Set the theme mode
   */
  function setTheme(mode: ThemeMode): void {
    const validModes: ThemeMode[] = ['light', 'dark', 'system'];
    if (!validModes.includes(mode)) {
      console.warn(`[DevTools] Invalid theme mode: ${mode}`);
      return;
    }

    themeMode.value = mode;

    if (isBrowser()) {
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // Storage unavailable (private browsing, quota exceeded, etc.)
        console.warn('[DevTools] Unable to persist theme preference');
      }
    }
  }

  /**
   * Toggle between light and dark mode
   * If currently in system mode, switch to the opposite of system preference
   */
  function toggleTheme(): void {
    if (themeMode.value === 'system') {
      // Switch to explicit mode opposite of system preference
      setTheme(systemPrefersDark.value ? 'light' : 'dark');
    } else {
      // Toggle between light and dark
      setTheme(themeMode.value === 'dark' ? 'light' : 'dark');
    }
  }

  /**
   * Reset to system preference
   */
  function resetToSystem(): void {
    setTheme('system');
  }

  /**
   * Clean up the media query listener
   */
  function cleanupMediaQuery(): void {
    if (currentMediaQuery && currentMediaHandler) {
      currentMediaQuery.removeEventListener('change', currentMediaHandler);
      currentMediaQuery = null;
      currentMediaHandler = null;
    }
  }

  /**
   * Initialize theme from storage and system preference
   */
  function initialize(): void {
    if (!isBrowser()) return;

    // Clean up any existing media query listener before adding a new one
    cleanupMediaQuery();

    // Check system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemPrefersDark.value = mediaQuery.matches;

    // Create and store the handler for cleanup
    const handler = (e: MediaQueryListEvent): void => {
      systemPrefersDark.value = e.matches;
    };

    // Listen for system preference changes
    mediaQuery.addEventListener('change', handler);

    // Store references for cleanup
    currentMediaQuery = mediaQuery;
    currentMediaHandler = handler;

    // Load saved preference from localStorage
    let saved: ThemeMode | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    } catch {
      // Storage unavailable (private browsing, etc.)
    }
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      themeMode.value = saved;
    }

    // Apply initial theme
    applyTheme();
  }

  /**
   * Reset theme state to defaults (useful for testing)
   * This resets the singleton state and cleans up listeners
   */
  function resetState(): void {
    cleanupMediaQuery();
    themeMode.value = 'system';
    systemPrefersDark.value = false;

    if (isBrowser()) {
      const root = document.documentElement;
      root.classList.remove('dark', 'light');

      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Storage unavailable
      }
    }
  }

  // Watch for theme changes and apply them
  watch([themeMode, systemPrefersDark], () => {
    applyTheme();
  });

  // Only register lifecycle hooks when inside a Vue component context
  // This allows the composable to be used in tests without Vue warnings
  if (hasComponentContext()) {
    // Initialize on mount
    onMounted(() => {
      initialize();
    });

    // Clean up on unmount
    onUnmounted(() => {
      cleanupMediaQuery();
    });
  }

  return {
    /**
     * Current theme mode setting ('light', 'dark', or 'system')
     */
    themeMode: computed(() => themeMode.value),

    /**
     * The effective theme after resolving 'system' mode
     */
    effectiveTheme,

    /**
     * Whether dark mode is currently active
     */
    isDark,

    /**
     * Whether the system prefers dark mode
     */
    systemPrefersDark: computed(() => systemPrefersDark.value),

    /**
     * Set the theme mode
     */
    setTheme,

    /**
     * Toggle between light and dark mode
     */
    toggleTheme,

    /**
     * Reset to system preference
     */
    resetToSystem,

    /**
     * Manually initialize theme (useful for SSR hydration)
     */
    initialize,

    /**
     * Reset theme state to defaults (useful for testing)
     */
    resetState,
  };
}
