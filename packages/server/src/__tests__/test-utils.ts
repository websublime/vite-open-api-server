/**
 * Shared Test Utilities
 *
 * What: Common mocks and helpers used across test files
 * How: Provides factory functions for creating mock objects
 * Why: Reduces code duplication and ensures consistent test setup
 */

import type { ViteDevServer } from 'vite';
import { vi } from 'vitest';

/**
 * Creates a mock ViteDevServer with ssrLoadModule support
 *
 * @param moduleMap - Map of file paths to their module exports
 * @returns Mock ViteDevServer instance
 *
 * @example
 * ```typescript
 * const moduleMap = new Map<string, Record<string, unknown>>();
 * moduleMap.set('/path/to/file.ts', {
 *   default: { myHandler: () => ({ status: 200 }) }
 * });
 * const mockVite = createMockViteServer(moduleMap);
 * ```
 */
export function createMockViteServer(
  moduleMap: Map<string, Record<string, unknown>> = new Map(),
): ViteDevServer {
  const moduleGraph = {
    getModuleById: vi.fn().mockReturnValue(null),
    invalidateModule: vi.fn(),
  };

  return {
    moduleGraph,
    ssrLoadModule: vi.fn().mockImplementation(async (filePath: string) => {
      const module = moduleMap.get(filePath);
      if (!module) {
        throw new Error(`Module not found: ${filePath}`);
      }
      return module;
    }),
  } as unknown as ViteDevServer;
}

/**
 * Mock logger interface for testing
 */
export interface MockLogger {
  log: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
}

/**
 * Creates a mock logger with all methods as vi.fn() spies
 *
 * @returns Mock logger instance with spy functions
 *
 * @example
 * ```typescript
 * const mockLogger = createMockLogger();
 * await someFunction(mockLogger);
 * expect(mockLogger.warn).toHaveBeenCalledWith('expected warning');
 * ```
 */
export function createMockLogger(): MockLogger {
  return {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}
