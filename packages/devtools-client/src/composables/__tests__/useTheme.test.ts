/**
 * Unit tests for useTheme composable
 *
 * What: Tests theme management functionality
 * How: Uses Vitest with Vue test utilities
 * Why: Ensures theme switching, persistence, and system preference detection work correctly
 *
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

// Mock matchMedia
const matchMediaMock = vi.fn((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// Setup global mocks before importing the composable
vi.stubGlobal('localStorage', localStorageMock);
vi.stubGlobal('matchMedia', matchMediaMock);

// Import after mocks are set up
import { type ThemeMode, useTheme } from '../useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    localStorageMock.clear();
    document.documentElement.classList.remove('dark', 'light');

    // Reset matchMedia to default (light mode)
    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // Reset singleton state using the dedicated reset function
    const { resetState } = useTheme();
    resetState();
  });

  describe('initialization', () => {
    it('should default to system mode', () => {
      const { themeMode } = useTheme();
      expect(themeMode.value).toBe('system');
    });

    it('should have effectiveTheme as light when system prefers light', () => {
      const { effectiveTheme, isDark } = useTheme();
      expect(effectiveTheme.value).toBe('light');
      expect(isDark.value).toBe(false);
    });
  });

  describe('setTheme', () => {
    it('should set theme to dark', () => {
      const { themeMode, setTheme } = useTheme();
      setTheme('dark');
      expect(themeMode.value).toBe('dark');
    });

    it('should set theme to light', () => {
      const { themeMode, setTheme } = useTheme();
      setTheme('dark');
      setTheme('light');
      expect(themeMode.value).toBe('light');
    });

    it('should set theme to system', () => {
      const { themeMode, setTheme } = useTheme();
      setTheme('dark');
      setTheme('system');
      expect(themeMode.value).toBe('system');
    });

    it('should persist theme to localStorage', () => {
      const { setTheme } = useTheme();
      setTheme('dark');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('openapi-devtools-theme', 'dark');
    });

    it('should warn and ignore invalid theme mode', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { themeMode, setTheme } = useTheme();

      // Type assertion to test invalid input
      setTheme('invalid' as ThemeMode);

      expect(warnSpy).toHaveBeenCalledWith('[DevTools] Invalid theme mode: invalid');
      expect(themeMode.value).toBe('system');

      warnSpy.mockRestore();
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from light to dark', () => {
      const { themeMode, setTheme, toggleTheme } = useTheme();
      setTheme('light');
      toggleTheme();
      expect(themeMode.value).toBe('dark');
    });

    it('should toggle from dark to light', () => {
      const { themeMode, setTheme, toggleTheme } = useTheme();
      setTheme('dark');
      toggleTheme();
      expect(themeMode.value).toBe('light');
    });

    it('should toggle from system to opposite of system preference', () => {
      const { themeMode, toggleTheme } = useTheme();
      // System prefers light (default mock), so toggle should go to dark
      toggleTheme();
      expect(themeMode.value).toBe('dark');
    });
  });

  describe('resetToSystem', () => {
    it('should reset theme to system mode', () => {
      const { themeMode, setTheme, resetToSystem } = useTheme();
      setTheme('dark');
      expect(themeMode.value).toBe('dark');

      resetToSystem();
      expect(themeMode.value).toBe('system');
    });
  });

  describe('resetState', () => {
    it('should reset theme state to defaults', () => {
      const { themeMode, setTheme, resetState } = useTheme();
      setTheme('dark');
      expect(themeMode.value).toBe('dark');

      resetState();
      expect(themeMode.value).toBe('system');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });

    it('should remove theme from localStorage', () => {
      const { setTheme, resetState } = useTheme();
      setTheme('dark');
      resetState();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('openapi-devtools-theme');
    });
  });

  describe('effectiveTheme', () => {
    it('should return dark when mode is dark', () => {
      const { effectiveTheme, setTheme } = useTheme();
      setTheme('dark');
      expect(effectiveTheme.value).toBe('dark');
    });

    it('should return light when mode is light', () => {
      const { effectiveTheme, setTheme } = useTheme();
      setTheme('light');
      expect(effectiveTheme.value).toBe('light');
    });

    it('should return light when mode is system and system prefers light', () => {
      const { effectiveTheme, setTheme } = useTheme();
      setTheme('system');
      expect(effectiveTheme.value).toBe('light');
    });
  });

  describe('isDark', () => {
    it('should be true when effectiveTheme is dark', () => {
      const { isDark, setTheme } = useTheme();
      setTheme('dark');
      expect(isDark.value).toBe(true);
    });

    it('should be false when effectiveTheme is light', () => {
      const { isDark, setTheme } = useTheme();
      setTheme('light');
      expect(isDark.value).toBe(false);
    });
  });

  describe('localStorage error handling', () => {
    it('should handle localStorage.setItem throwing error', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      const { setTheme } = useTheme();
      // Should not throw
      expect(() => setTheme('dark')).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith('[DevTools] Unable to persist theme preference');

      warnSpy.mockRestore();
    });

    it('should handle localStorage.getItem throwing error during initialize', () => {
      // Setup: make getItem throw
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('SecurityError');
      });

      // Call initialize directly to test the code path
      const { initialize } = useTheme();

      // Should not throw when initializing
      expect(() => initialize()).not.toThrow();
    });
  });

  describe('initialize', () => {
    it('should load saved theme from localStorage', () => {
      // Set up localStorage to return a saved theme
      localStorageMock.getItem.mockReturnValueOnce('dark');

      const { initialize, themeMode } = useTheme();
      initialize();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('openapi-devtools-theme');
      expect(themeMode.value).toBe('dark');
    });

    it('should detect system dark mode preference', () => {
      // Mock matchMedia to return dark mode preference
      matchMediaMock.mockImplementation((query: string) => ({
        matches: true, // System prefers dark
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { initialize, systemPrefersDark } = useTheme();
      initialize();

      expect(systemPrefersDark.value).toBe(true);
    });

    it('should register event listener for system preference changes', () => {
      const addEventListenerMock = vi.fn();
      matchMediaMock.mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: addEventListenerMock,
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { initialize } = useTheme();
      initialize();

      expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should clean up previous listener before adding new one', () => {
      const removeEventListenerMock = vi.fn();
      const addEventListenerMock = vi.fn();
      matchMediaMock.mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: addEventListenerMock,
        removeEventListener: removeEventListenerMock,
        dispatchEvent: vi.fn(),
      }));

      const { initialize } = useTheme();

      // First initialize
      initialize();
      expect(addEventListenerMock).toHaveBeenCalledTimes(1);

      // Second initialize should clean up first
      initialize();
      expect(removeEventListenerMock).toHaveBeenCalled();
      expect(addEventListenerMock).toHaveBeenCalledTimes(2);
    });

    it('should apply theme classes to document root', () => {
      const { initialize, setTheme } = useTheme();
      setTheme('dark');
      initialize();

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.classList.contains('light')).toBe(false);
    });

    it('should apply light class when theme is light', () => {
      const { initialize, setTheme } = useTheme();
      setTheme('light');
      initialize();

      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('singleton state', () => {
    it('should share state between multiple useTheme calls', () => {
      const theme1 = useTheme();
      const theme2 = useTheme();

      theme1.setTheme('dark');
      expect(theme2.themeMode.value).toBe('dark');
    });
  });
});
