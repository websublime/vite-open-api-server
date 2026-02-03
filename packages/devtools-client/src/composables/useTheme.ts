/**
 * useTheme Composable
 *
 * What: Provides reactive theme management for the DevTools SPA
 * How: Uses CSS class on document root and localStorage for persistence
 * Why: Allows users to switch between dark and light mode, respecting system preference
 */

import { computed, onMounted, ref, watch } from 'vue';

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
 * Check if we're running in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
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
  function applyTheme() {
    if (!isBrowser()) return;

    const root = document.documentElement;

    if (effectiveTheme.value === 'dark') {
      root.classList.add('dark');
    } else {
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
  function toggleTheme() {
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
  function resetToSystem() {
    setTheme('system');
  }

  /**
   * Initialize theme from storage and system preference
   */
  function initialize() {
    if (!isBrowser()) return;

    // Check system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemPrefersDark.value = mediaQuery.matches;

    // Listen for system preference changes
    mediaQuery.addEventListener('change', (e) => {
      systemPrefersDark.value = e.matches;
    });

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

  // Watch for theme changes and apply them
  watch([themeMode, systemPrefersDark], () => {
    applyTheme();
  });

  // Initialize on mount
  onMounted(() => {
    initialize();
  });

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
  };
}
