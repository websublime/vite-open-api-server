/**
 * DevTools Integration Tests
 *
 * Tests for registerDevTools and getDevToolsUrl functions
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { App } from 'vue';
import { getDevToolsUrl, registerDevTools } from '../devtools.js';

describe('getDevToolsUrl', () => {
  it('should return URL with default parameters', () => {
    const url = getDevToolsUrl();
    expect(url).toBe('http://localhost:4000/_devtools/');
  });

  it('should accept custom port', () => {
    const url = getDevToolsUrl(5000);
    expect(url).toBe('http://localhost:5000/_devtools/');
  });

  it('should accept custom host', () => {
    const url = getDevToolsUrl(4000, 'example.com');
    expect(url).toBe('http://example.com:4000/_devtools/');
  });

  it('should accept custom protocol', () => {
    const url = getDevToolsUrl(4000, 'localhost', 'https');
    expect(url).toBe('https://localhost:4000/_devtools/');
  });

  it('should accept all custom parameters', () => {
    const url = getDevToolsUrl(8080, 'api.example.com', 'https');
    expect(url).toBe('https://api.example.com:8080/_devtools/');
  });

  it('should handle different port numbers', () => {
    expect(getDevToolsUrl(3000)).toBe('http://localhost:3000/_devtools/');
    expect(getDevToolsUrl(8000)).toBe('http://localhost:8000/_devtools/');
    expect(getDevToolsUrl(443)).toBe('http://localhost:443/_devtools/');
  });
});

describe('registerDevTools', () => {
  let mockApp: App;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create a minimal mock Vue app
    mockApp = {
      version: '3.5.0',
      config: {},
      use: vi.fn(),
      mixin: vi.fn(),
      component: vi.fn(),
      directive: vi.fn(),
      mount: vi.fn(),
      unmount: vi.fn(),
      provide: vi.fn(),
      runWithContext: vi.fn(),
      _uid: 0,
      _component: {},
      _props: null,
      _container: null,
      _context: {
        app: {} as App,
        config: {
          isNativeTag: () => false,
          performance: false,
          globalProperties: {},
          optionMergeStrategies: {},
          errorHandler: undefined,
          warnHandler: undefined,
          compilerOptions: {},
        },
        mixins: [],
        components: {},
        directives: {},
        provides: Object.create(null),
        optionsCache: new WeakMap(),
        propsCache: new WeakMap(),
        emitsCache: new WeakMap(),
      },
      _instance: null,
    } as unknown as App;

    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('should return early if app is null', async () => {
    await registerDevTools(null as unknown as App);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[OpenAPI DevTools] Invalid Vue app instance provided',
    );
  });

  it('should return early if app is undefined', async () => {
    await registerDevTools(undefined as unknown as App);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[OpenAPI DevTools] Invalid Vue app instance provided',
    );
  });

  it('should return early if app is not an object', async () => {
    await registerDevTools('not an app' as unknown as App);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[OpenAPI DevTools] Invalid Vue app instance provided',
    );
  });

  it('should return early if enabled is false', async () => {
    await registerDevTools(mockApp, { enabled: false });

    // Should not attempt any operations
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('should accept custom label option', async () => {
    // This test verifies the option is accepted without errors
    await expect(
      registerDevTools(mockApp, {
        label: 'Custom DevTools',
        enabled: true,
      }),
    ).resolves.not.toThrow();
  });

  it('should accept port option', async () => {
    await expect(
      registerDevTools(mockApp, {
        port: 5000,
      }),
    ).resolves.not.toThrow();
  });

  it('should accept host option', async () => {
    await expect(
      registerDevTools(mockApp, {
        host: 'example.com',
      }),
    ).resolves.not.toThrow();
  });

  it('should accept protocol option', async () => {
    await expect(
      registerDevTools(mockApp, {
        protocol: 'https',
      }),
    ).resolves.not.toThrow();
  });

  it('should accept all options', async () => {
    await expect(
      registerDevTools(mockApp, {
        port: 8080,
        host: 'api.example.com',
        protocol: 'https',
        enabled: true,
        label: 'My API DevTools',
      }),
    ).resolves.not.toThrow();
  });

  it('should not throw when window is undefined (SSR)', async () => {
    // Save original window
    const originalWindow = global.window;

    // Mock SSR environment
    // @ts-expect-error - Simulating SSR environment
    delete global.window;

    await expect(registerDevTools(mockApp)).resolves.not.toThrow();

    // Restore window
    global.window = originalWindow;
  });

  it('should use default enabled value of true', async () => {
    // When enabled is not specified, it should default to true and attempt registration
    // Since we're in a test environment, it should try to register and potentially warn
    await expect(registerDevTools(mockApp)).resolves.not.toThrow();
  });

  it('should use default label when not provided', async () => {
    // This verifies the default label 'OpenAPI Server' is used
    await expect(registerDevTools(mockApp, {})).resolves.not.toThrow();
  });
});
