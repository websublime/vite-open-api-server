/**
 * Shared Test Utilities
 *
 * What: Common mocks and helpers used across test files
 * How: Provides factory functions for creating mock objects
 * Why: Reduces code duplication and ensures consistent test setup
 */

import type { Logger } from '@websublime/vite-open-api-core';
import type { ViteDevServer } from 'vite';
import type { Mock } from 'vitest';
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
 *
 * Extends the Logger interface to add mock-specific properties
 * while maintaining compatibility with functions expecting Logger
 */
export interface MockLogger extends Logger {
  log: Mock<(...args: unknown[]) => void>;
  info: Mock<(...args: unknown[]) => void>;
  warn: Mock<(...args: unknown[]) => void>;
  error: Mock<(...args: unknown[]) => void>;
  debug: Mock<(...args: unknown[]) => void>;
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
