/**
 * Shared Test Utilities
 *
 * What: Common mocks and helpers used across test files
 * How: Provides factory functions for creating mock objects
 * Why: Reduces code duplication and ensures consistent test setup
 */

import type {
  CommandHandler,
  Logger,
  ServerEvent,
  WebSocketClient,
  WebSocketHub,
} from '@websublime/vite-plugin-open-api-core';
import type { ViteDevServer } from 'vite';
import type { Mock } from 'vitest';
import { expect, vi } from 'vitest';
import { ValidationError, type ValidationErrorCode } from '../types.js';

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

/**
 * Mock WebSocket hub interface for testing
 *
 * Extends the WebSocketHub interface to add mock-specific properties
 * while maintaining compatibility with functions expecting WebSocketHub
 */
export interface MockWebSocketHub extends WebSocketHub {
  addClient: Mock<(client: WebSocketClient) => void>;
  removeClient: Mock<(client: WebSocketClient) => void>;
  broadcast: Mock<(event: ServerEvent) => void>;
  handleMessage: Mock<(client: WebSocketClient, message: string | unknown) => void>;
  setCommandHandler: Mock<(handler: CommandHandler) => void>;
  getClientCount: Mock<() => number>;
  sendTo: Mock<(client: WebSocketClient, event: ServerEvent) => boolean>;
  hasClient: Mock<(client: WebSocketClient) => boolean>;
  clear: Mock<() => void>;
  /** Get all broadcast calls for assertions */
  getBroadcastCalls: () => unknown[];
  /** Clear all mock call history */
  clearMocks: () => void;
}

/**
 * Creates a mock WebSocket hub with all methods as vi.fn() spies
 *
 * Useful for testing hot reload WebSocket event broadcasts
 * and other WebSocket-related functionality.
 *
 * @returns Mock WebSocket hub instance with spy functions
 *
 * @example
 * ```typescript
 * const mockWsHub = createMockWebSocketHub();
 *
 * // Simulate broadcast
 * mockWsHub.broadcast({ type: 'handlers:updated', data: { count: 5 } });
 *
 * // Assert broadcast was called correctly
 * expect(mockWsHub.broadcast).toHaveBeenCalledWith({
 *   type: 'handlers:updated',
 *   data: { count: 5 }
 * });
 *
 * // Get all broadcast events
 * const events = mockWsHub.getBroadcastCalls();
 * expect(events).toHaveLength(1);
 * ```
 */
export function createMockWebSocketHub(): MockWebSocketHub {
  const broadcastMock = vi.fn();
  const addClientMock = vi.fn();
  const removeClientMock = vi.fn();
  const handleMessageMock = vi.fn();
  const setCommandHandlerMock = vi.fn();
  const getClientCountMock = vi.fn().mockReturnValue(0);
  const sendToMock = vi.fn().mockReturnValue(true);
  const hasClientMock = vi.fn().mockReturnValue(false);
  const clearMock = vi.fn();

  return {
    addClient: addClientMock,
    removeClient: removeClientMock,
    broadcast: broadcastMock,
    handleMessage: handleMessageMock,
    setCommandHandler: setCommandHandlerMock,
    getClientCount: getClientCountMock,
    sendTo: sendToMock,
    hasClient: hasClientMock,
    clear: clearMock,
    getBroadcastCalls(): unknown[] {
      return broadcastMock.mock.calls.map((call) => call[0]);
    },
    clearMocks(): void {
      broadcastMock.mockClear();
      addClientMock.mockClear();
      removeClientMock.mockClear();
      handleMessageMock.mockClear();
      setCommandHandlerMock.mockClear();
      getClientCountMock.mockClear();
      sendToMock.mockClear();
      hasClientMock.mockClear();
      clearMock.mockClear();
    },
  };
}

/**
 * Create a minimal OpenAPI 3.1 document for testing.
 *
 * Canonical factory shared across test files. Supports optional
 * title and serverUrl to cover both spec-id and proxy-path test scenarios.
 *
 * @param options - Optional overrides for title and serverUrl
 * @returns Minimal OpenAPI 3.1 document
 */
export function makeDocument(options?: {
  title?: string;
  serverUrl?: string;
}): import('@scalar/openapi-types').OpenAPIV3_1.Document {
  const doc: import('@scalar/openapi-types').OpenAPIV3_1.Document = {
    openapi: '3.1.0',
    info: {
      title: options?.title ?? '',
      version: '1.0.0',
    },
    paths: {},
  };
  if (options?.serverUrl !== undefined) {
    doc.servers = [{ url: options.serverUrl }];
  }
  return doc;
}

/**
 * Assert that `fn` throws a ValidationError with the expected code.
 * Calls `fn` exactly once.
 *
 * @param fn - Function expected to throw ValidationError
 * @param expectedCode - Expected ValidationErrorCode
 *
 * @example
 * ```typescript
 * expectValidationError(
 *   () => deriveSpecId('', makeDocument('')),
 *   'SPEC_ID_MISSING',
 * );
 * ```
 */
export function expectValidationError(fn: () => unknown, expectedCode: ValidationErrorCode): void {
  let caught: unknown;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(ValidationError);
  expect((caught as ValidationError).code).toBe(expectedCode);
}
