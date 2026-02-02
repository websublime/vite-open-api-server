/**
 * Define Handlers Tests
 *
 * What: Unit tests for defineHandlers type helper
 * How: Tests that the helper correctly returns handlers with preserved types
 * Why: Ensures type helper works as expected for handler definitions
 */

import { describe, expect, it } from 'vitest';

import type { HandlerContext, HandlerReturn } from '../context.js';
import { defineHandlers, type HandlerDefinition } from '../define-handlers.js';

describe('defineHandlers', () => {
  describe('basic functionality', () => {
    it('should return the same handlers object', () => {
      const handlers = {
        testHandler: (): HandlerReturn => ({
          type: 'raw',
          data: { test: true },
        }),
      };

      const result = defineHandlers(handlers);

      expect(result).toBe(handlers);
    });

    it('should preserve handler functions', () => {
      const handlers = defineHandlers({
        getItem: (): HandlerReturn => ({
          type: 'raw',
          data: { id: 1 },
        }),
        createItem: (): HandlerReturn => ({
          type: 'status',
          status: 201,
          data: { created: true },
        }),
      });

      expect(typeof handlers.getItem).toBe('function');
      expect(typeof handlers.createItem).toBe('function');
    });

    it('should allow calling handler functions', () => {
      const handlers = defineHandlers({
        echo: (ctx: HandlerContext): HandlerReturn => ({
          type: 'raw',
          data: { path: ctx.req.path },
        }),
      });

      const mockContext = {
        req: {
          method: 'GET',
          path: '/test',
          params: {},
          query: {},
          body: undefined,
          headers: {},
        },
        res: { status: 200, headers: {} },
        store: {} as HandlerContext['store'],
        faker: {} as HandlerContext['faker'],
        logger: console,
      };

      const result = handlers.echo(mockContext);

      expect(result).toEqual({
        type: 'raw',
        data: { path: '/test' },
      });
    });
  });

  describe('handler return types', () => {
    it('should support raw return type', () => {
      const handlers = defineHandlers({
        rawHandler: (): HandlerReturn => ({
          type: 'raw',
          data: { message: 'hello' },
        }),
      });

      const mockContext = createMinimalContext();
      const result = handlers.rawHandler(mockContext);

      expect(result).toEqual({
        type: 'raw',
        data: { message: 'hello' },
      });
    });

    it('should support status return type', () => {
      const handlers = defineHandlers({
        notFoundHandler: (): HandlerReturn => ({
          type: 'status',
          status: 404,
          data: { error: 'Not found' },
        }),
      });

      const mockContext = createMinimalContext();
      const result = handlers.notFoundHandler(mockContext);

      expect(result).toEqual({
        type: 'status',
        status: 404,
        data: { error: 'Not found' },
      });
    });

    it('should support full return type with headers', () => {
      const handlers = defineHandlers({
        fullHandler: (): HandlerReturn => ({
          type: 'full',
          status: 200,
          data: { id: 1 },
          headers: { 'X-Custom': 'value' },
        }),
      });

      const mockContext = createMinimalContext();
      const result = handlers.fullHandler(mockContext);

      expect(result).toEqual({
        type: 'full',
        status: 200,
        data: { id: 1 },
        headers: { 'X-Custom': 'value' },
      });
    });
  });

  describe('async handlers', () => {
    it('should support async handlers', async () => {
      const handlers = defineHandlers({
        asyncHandler: async (): Promise<HandlerReturn> => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return { type: 'raw', data: { async: true } };
        },
      });

      const mockContext = createMinimalContext();
      const result = await handlers.asyncHandler(mockContext);

      expect(result).toEqual({
        type: 'raw',
        data: { async: true },
      });
    });
  });

  describe('multiple handlers', () => {
    it('should support multiple handler definitions', () => {
      const handlers = defineHandlers({
        listPets: (): HandlerReturn => ({
          type: 'raw',
          data: [],
        }),
        getPet: (): HandlerReturn => ({
          type: 'raw',
          data: { id: 1 },
        }),
        createPet: (): HandlerReturn => ({
          type: 'status',
          status: 201,
          data: { id: 2 },
        }),
        deletePet: (): HandlerReturn => ({
          type: 'status',
          status: 204,
          data: null,
        }),
      });

      expect(Object.keys(handlers)).toHaveLength(4);
      expect(handlers.listPets).toBeDefined();
      expect(handlers.getPet).toBeDefined();
      expect(handlers.createPet).toBeDefined();
      expect(handlers.deletePet).toBeDefined();
    });
  });

  describe('context access', () => {
    it('should allow access to request params', () => {
      const handlers = defineHandlers({
        getById: (ctx: HandlerContext): HandlerReturn => ({
          type: 'raw',
          data: { id: ctx.req.params.id },
        }),
      });

      const mockContext = createMinimalContext();
      mockContext.req.params = { id: '123' };

      const result = handlers.getById(mockContext);

      expect(result).toEqual({
        type: 'raw',
        data: { id: '123' },
      });
    });

    it('should allow access to query params', () => {
      const handlers = defineHandlers({
        search: (ctx: HandlerContext): HandlerReturn => ({
          type: 'raw',
          data: { query: ctx.req.query.q },
        }),
      });

      const mockContext = createMinimalContext();
      mockContext.req.query = { q: 'test' };

      const result = handlers.search(mockContext);

      expect(result).toEqual({
        type: 'raw',
        data: { query: 'test' },
      });
    });

    it('should allow access to request body', () => {
      const handlers = defineHandlers({
        create: (ctx: HandlerContext): HandlerReturn => ({
          type: 'status',
          status: 201,
          data: ctx.req.body,
        }),
      });

      const mockContext = createMinimalContext();
      mockContext.req.body = { name: 'Test' };

      const result = handlers.create(mockContext);

      expect(result).toEqual({
        type: 'status',
        status: 201,
        data: { name: 'Test' },
      });
    });
  });

  describe('type safety', () => {
    it('should accept valid HandlerDefinition', () => {
      const handlerDef: HandlerDefinition = {
        test: (): HandlerReturn => ({ type: 'raw', data: null }),
      };

      const result = defineHandlers(handlerDef);

      expect(result).toBe(handlerDef);
    });

    it('should preserve operationId keys', () => {
      const handlers = defineHandlers({
        getUsers: (): HandlerReturn => ({ type: 'raw', data: [] }),
        getUserById: (): HandlerReturn => ({ type: 'raw', data: {} }),
        createUser: (): HandlerReturn => ({ type: 'status', status: 201, data: {} }),
      });

      expect('getUsers' in handlers).toBe(true);
      expect('getUserById' in handlers).toBe(true);
      expect('createUser' in handlers).toBe(true);
    });
  });
});

/**
 * Helper to create a minimal mock context for testing
 */
function createMinimalContext(): HandlerContext {
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
    store: {} as HandlerContext['store'],
    faker: {} as HandlerContext['faker'],
    logger: {
      log: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    },
  };
}
