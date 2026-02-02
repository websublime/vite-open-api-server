/**
 * Handler Executor Tests
 *
 * What: Unit tests for executeHandler and normalizeResponse
 * How: Tests various handler return types and error scenarios
 * Why: Ensures handler execution is robust and predictable
 */

import { faker } from '@faker-js/faker';
import { describe, expect, it, vi } from 'vitest';

import { createStore } from '../../store/index.js';
import type {
  HandlerContext,
  HandlerFn,
  HandlerReturnRaw,
  HandlerReturnWithHeaders,
  HandlerReturnWithStatus,
} from '../context.js';
import { ExecutorError, executeHandler, normalizeResponse } from '../executor.js';

/**
 * Create a mock logger for testing
 */
function createMockLogger() {
  return {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

/**
 * Create a mock handler context for testing
 */
function createMockContext(overrides: Partial<HandlerContext> = {}): HandlerContext {
  return {
    req: {
      method: 'GET',
      path: '/test',
      params: {},
      query: {},
      body: undefined,
      headers: {},
    },
    res: {
      status: 200,
      headers: {},
    },
    store: createStore(),
    faker,
    logger: {
      log: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    ...overrides,
  };
}

describe('normalizeResponse', () => {
  describe('raw type', () => {
    it('should normalize raw data to 200 response', () => {
      const result: HandlerReturnRaw = {
        type: 'raw',
        data: { id: 1, name: 'Test' },
      };

      const response = normalizeResponse(result);

      expect(response).toEqual({
        status: 200,
        data: { id: 1, name: 'Test' },
      });
    });

    it('should handle null data', () => {
      const result: HandlerReturnRaw = {
        type: 'raw',
        data: null,
      };

      const response = normalizeResponse(result);

      expect(response).toEqual({
        status: 200,
        data: null,
      });
    });

    it('should handle undefined data', () => {
      const result: HandlerReturnRaw = {
        type: 'raw',
        data: undefined,
      };

      const response = normalizeResponse(result);

      expect(response).toEqual({
        status: 200,
        data: undefined,
      });
    });

    it('should handle array data', () => {
      const result: HandlerReturnRaw = {
        type: 'raw',
        data: [{ id: 1 }, { id: 2 }],
      };

      const response = normalizeResponse(result);

      expect(response).toEqual({
        status: 200,
        data: [{ id: 1 }, { id: 2 }],
      });
    });

    it('should handle primitive data', () => {
      const result: HandlerReturnRaw = {
        type: 'raw',
        data: 'hello',
      };

      const response = normalizeResponse(result);

      expect(response).toEqual({
        status: 200,
        data: 'hello',
      });
    });
  });

  describe('status type', () => {
    it('should normalize status response', () => {
      const result: HandlerReturnWithStatus = {
        type: 'status',
        status: 201,
        data: { id: 1, created: true },
      };

      const response = normalizeResponse(result);

      expect(response).toEqual({
        status: 201,
        data: { id: 1, created: true },
      });
    });

    it('should handle 404 status', () => {
      const result: HandlerReturnWithStatus = {
        type: 'status',
        status: 404,
        data: { error: 'Not found', message: 'Pet not found' },
      };

      const response = normalizeResponse(result);

      expect(response).toEqual({
        status: 404,
        data: { error: 'Not found', message: 'Pet not found' },
      });
    });

    it('should handle 500 status', () => {
      const result: HandlerReturnWithStatus = {
        type: 'status',
        status: 500,
        data: { error: 'Internal server error' },
      };

      const response = normalizeResponse(result);

      expect(response).toEqual({
        status: 500,
        data: { error: 'Internal server error' },
      });
    });
  });

  describe('full type', () => {
    it('should normalize full response with headers', () => {
      const result: HandlerReturnWithHeaders = {
        type: 'full',
        status: 200,
        data: { id: 1 },
        headers: { 'X-Custom': 'value' },
      };

      const response = normalizeResponse(result);

      expect(response).toEqual({
        status: 200,
        data: { id: 1 },
        headers: { 'X-Custom': 'value' },
      });
    });

    it('should handle multiple headers', () => {
      const result: HandlerReturnWithHeaders = {
        type: 'full',
        status: 201,
        data: { created: true },
        headers: {
          'X-Request-Id': 'abc123',
          'X-Rate-Limit': '100',
          'X-Rate-Remaining': '99',
        },
      };

      const response = normalizeResponse(result);

      expect(response).toEqual({
        status: 201,
        data: { created: true },
        headers: {
          'X-Request-Id': 'abc123',
          'X-Rate-Limit': '100',
          'X-Rate-Remaining': '99',
        },
      });
    });

    it('should handle empty headers object', () => {
      const result: HandlerReturnWithHeaders = {
        type: 'full',
        status: 200,
        data: { id: 1 },
        headers: {},
      };

      const response = normalizeResponse(result);

      expect(response).toEqual({
        status: 200,
        data: { id: 1 },
        headers: {},
      });
    });
  });

  describe('status code validation', () => {
    it('should accept valid status codes (100-599)', () => {
      const validCodes = [100, 200, 201, 204, 301, 400, 404, 500, 503, 599];

      for (const status of validCodes) {
        const result: HandlerReturnWithStatus = {
          type: 'status',
          status,
          data: { test: true },
        };

        const response = normalizeResponse(result);

        expect(response.status).toBe(status);
      }
    });

    it('should default to 500 for negative status codes', () => {
      const mockLogger = createMockLogger();

      const result: HandlerReturnWithStatus = {
        type: 'status',
        status: -1,
        data: { error: 'test' },
      };

      const response = normalizeResponse(result, { logger: mockLogger });

      expect(response.status).toBe(500);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid HTTP status code: -1'),
      );
    });

    it('should default to 500 for status code 0', () => {
      const mockLogger = createMockLogger();

      const result: HandlerReturnWithStatus = {
        type: 'status',
        status: 0,
        data: { error: 'test' },
      };

      const response = normalizeResponse(result, { logger: mockLogger });

      expect(response.status).toBe(500);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should default to 500 for status codes below 100', () => {
      const mockLogger = createMockLogger();

      const result: HandlerReturnWithStatus = {
        type: 'status',
        status: 99,
        data: { error: 'test' },
      };

      const response = normalizeResponse(result, { logger: mockLogger });

      expect(response.status).toBe(500);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should default to 500 for status codes above 599', () => {
      const mockLogger = createMockLogger();

      const result: HandlerReturnWithStatus = {
        type: 'status',
        status: 600,
        data: { error: 'test' },
      };

      const response = normalizeResponse(result, { logger: mockLogger });

      expect(response.status).toBe(500);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should default to 500 for non-integer status codes', () => {
      const mockLogger = createMockLogger();

      const result: HandlerReturnWithStatus = {
        type: 'status',
        status: 200.5,
        data: { error: 'test' },
      };

      const response = normalizeResponse(result, { logger: mockLogger });

      expect(response.status).toBe(500);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should validate status codes in full type responses', () => {
      const mockLogger = createMockLogger();

      const result: HandlerReturnWithHeaders = {
        type: 'full',
        status: 9999,
        data: { error: 'test' },
        headers: { 'X-Custom': 'value' },
      };

      const response = normalizeResponse(result, { logger: mockLogger });

      expect(response.status).toBe(500);
      expect(response.headers).toEqual({ 'X-Custom': 'value' });
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should not warn when no logger is provided', () => {
      const result: HandlerReturnWithStatus = {
        type: 'status',
        status: -1,
        data: { error: 'test' },
      };

      // Should not throw when logger is not provided
      const response = normalizeResponse(result);

      expect(response.status).toBe(500);
    });
  });
});

describe('executeHandler', () => {
  describe('successful execution', () => {
    it('should execute handler returning raw data', async () => {
      const handler: HandlerFn = () => ({
        type: 'raw',
        data: { id: 1, name: 'Test' },
      });
      const context = createMockContext();

      const response = await executeHandler(handler, context);

      expect(response).toEqual({
        status: 200,
        data: { id: 1, name: 'Test' },
      });
    });

    it('should execute async handler', async () => {
      const handler: HandlerFn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { type: 'raw', data: { async: true } };
      };
      const context = createMockContext();

      const response = await executeHandler(handler, context);

      expect(response).toEqual({
        status: 200,
        data: { async: true },
      });
    });

    it('should execute handler with status', async () => {
      const handler: HandlerFn = () => ({
        type: 'status',
        status: 201,
        data: { created: true },
      });
      const context = createMockContext();

      const response = await executeHandler(handler, context);

      expect(response).toEqual({
        status: 201,
        data: { created: true },
      });
    });

    it('should execute handler with full response', async () => {
      const handler: HandlerFn = () => ({
        type: 'full',
        status: 200,
        data: { id: 1 },
        headers: { 'X-Custom': 'header' },
      });
      const context = createMockContext();

      const response = await executeHandler(handler, context);

      expect(response).toEqual({
        status: 200,
        data: { id: 1 },
        headers: { 'X-Custom': 'header' },
      });
    });
  });

  describe('context usage', () => {
    it('should provide request data to handler', async () => {
      const handler: HandlerFn = (ctx) => ({
        type: 'raw',
        data: {
          method: ctx.req.method,
          path: ctx.req.path,
          params: ctx.req.params,
        },
      });
      const context = createMockContext({
        req: {
          method: 'POST',
          path: '/pets/123',
          params: { petId: '123' },
          query: {},
          body: { name: 'Fluffy' },
          headers: {},
        },
      });

      const response = await executeHandler(handler, context);

      expect(response.data).toEqual({
        method: 'POST',
        path: '/pets/123',
        params: { petId: '123' },
      });
    });

    it('should provide store to handler', async () => {
      const store = createStore();
      store.create('Pet', { id: '1', name: 'Fluffy' });

      const handler: HandlerFn = (ctx) => ({
        type: 'raw',
        data: ctx.store.list('Pet'),
      });
      const context = createMockContext({ store });

      const response = await executeHandler(handler, context);

      expect(response.data).toEqual([{ id: '1', name: 'Fluffy' }]);
    });

    it('should provide faker to handler', async () => {
      const handler: HandlerFn = (ctx) => ({
        type: 'raw',
        data: {
          uuid: ctx.faker.string.uuid(),
        },
      });
      const context = createMockContext();

      const response = await executeHandler(handler, context);

      expect((response.data as { uuid: string }).uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('should provide logger to handler', async () => {
      const mockLogger = {
        log: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const handler: HandlerFn = (ctx) => {
        ctx.logger.info('Handler executed');
        return { type: 'raw', data: { logged: true } };
      };
      const context = createMockContext({ logger: mockLogger });

      await executeHandler(handler, context);

      expect(mockLogger.info).toHaveBeenCalledWith('Handler executed');
    });
  });

  describe('error handling', () => {
    it('should catch sync errors and return 500', async () => {
      const handler: HandlerFn = () => {
        throw new Error('Handler exploded');
      };
      const context = createMockContext();

      const response = await executeHandler(handler, context);

      expect(response.status).toBe(500);
      expect(response.data).toEqual({
        error: 'Handler execution failed',
        message: 'Handler exploded',
      });
    });

    it('should catch async errors and return 500', async () => {
      const handler: HandlerFn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error('Async handler exploded');
      };
      const context = createMockContext();

      const response = await executeHandler(handler, context);

      expect(response.status).toBe(500);
      expect(response.data).toEqual({
        error: 'Handler execution failed',
        message: 'Async handler exploded',
      });
    });

    it('should handle non-Error throws', async () => {
      const handler: HandlerFn = () => {
        throw 'string error';
      };
      const context = createMockContext();

      const response = await executeHandler(handler, context);

      expect(response.status).toBe(500);
      expect(response.data).toEqual({
        error: 'Handler execution failed',
        message: 'string error',
      });
    });

    it('should log errors to context logger', async () => {
      const mockLogger = {
        log: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const handler: HandlerFn = () => {
        throw new Error('Test error');
      };
      const context = createMockContext({ logger: mockLogger });

      await executeHandler(handler, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[Handler Executor] Handler execution failed:',
        expect.any(Error),
      );
    });
  });
});

describe('ExecutorError', () => {
  it('should create error with message', () => {
    const error = new ExecutorError('Test error');

    expect(error.message).toBe('Test error');
    expect(error.name).toBe('ExecutorError');
  });

  it('should store cause if provided', () => {
    const cause = new Error('Original error');
    const error = new ExecutorError('Wrapper error', cause);

    expect(error.message).toBe('Wrapper error');
    expect(error.cause).toBe(cause);
  });

  it('should have proper stack trace', () => {
    const error = new ExecutorError('Test error');

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('ExecutorError');
  });

  it('should be instanceof Error', () => {
    const error = new ExecutorError('Test error');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ExecutorError);
  });

  it('should be usable for catching handler-specific errors', () => {
    // Demonstrates the intended use case for ExecutorError
    function simulateErrorHandling(): string {
      try {
        throw new ExecutorError('Handler failed', new Error('Original'));
      } catch (error) {
        if (error instanceof ExecutorError) {
          return 'handled-executor-error';
        }
        return 'handled-generic-error';
      }
    }

    expect(simulateErrorHandling()).toBe('handled-executor-error');
  });
});
