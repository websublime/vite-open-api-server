/**
 * Types Tests
 *
 * What: Unit tests for type utilities and option resolution
 * How: Tests resolveOptions function with various inputs
 * Why: Ensures configuration defaults and validation work correctly
 */

import { describe, expect, it } from 'vitest';
import { resolveOptions } from '../types.js';

describe('resolveOptions', () => {
  describe('required options', () => {
    it('should throw for missing spec', () => {
      expect(() => resolveOptions({} as { spec: string })).toThrow('spec is required');
    });

    it('should throw for empty spec string', () => {
      expect(() => resolveOptions({ spec: '' })).toThrow('spec is required');
    });

    it('should throw for whitespace-only spec', () => {
      expect(() => resolveOptions({ spec: '   ' })).toThrow('spec is required');
    });

    it('should throw for null spec', () => {
      expect(() => resolveOptions({ spec: null as unknown as string })).toThrow('spec is required');
    });

    it('should throw for undefined spec', () => {
      expect(() => resolveOptions({ spec: undefined as unknown as string })).toThrow(
        'spec is required',
      );
    });

    it('should throw for non-string spec', () => {
      expect(() => resolveOptions({ spec: 123 as unknown as string })).toThrow('spec is required');
    });
  });

  describe('default values', () => {
    it('should apply all defaults for minimal config', () => {
      const result = resolveOptions({ spec: './api.yaml' });

      expect(result.spec).toBe('./api.yaml');
      expect(result.port).toBe(4000);
      expect(result.proxyPath).toBe('/api');
      expect(result.handlersDir).toBe('./mocks/handlers');
      expect(result.seedsDir).toBe('./mocks/seeds');
      expect(result.enabled).toBe(true);
      expect(result.idFields).toEqual({});
      expect(result.timelineLimit).toBe(500);
      expect(result.devtools).toBe(true);
      expect(result.cors).toBe(true);
      expect(result.corsOrigin).toBe('*');
      expect(result.silent).toBe(false);
      expect(result.logger).toBeUndefined();
    });
  });

  describe('custom values', () => {
    it('should accept custom port', () => {
      const result = resolveOptions({ spec: './api.yaml', port: 8080 });
      expect(result.port).toBe(8080);
    });

    it('should accept custom proxyPath', () => {
      const result = resolveOptions({ spec: './api.yaml', proxyPath: '/api/v2' });
      expect(result.proxyPath).toBe('/api/v2');
    });

    it('should accept custom handlersDir', () => {
      const result = resolveOptions({ spec: './api.yaml', handlersDir: './src/mocks/handlers' });
      expect(result.handlersDir).toBe('./src/mocks/handlers');
    });

    it('should accept custom seedsDir', () => {
      const result = resolveOptions({ spec: './api.yaml', seedsDir: './src/mocks/seeds' });
      expect(result.seedsDir).toBe('./src/mocks/seeds');
    });

    it('should accept enabled: false', () => {
      const result = resolveOptions({ spec: './api.yaml', enabled: false });
      expect(result.enabled).toBe(false);
    });

    it('should accept custom idFields', () => {
      const idFields = { User: 'userId', Order: 'orderId' };
      const result = resolveOptions({ spec: './api.yaml', idFields });
      expect(result.idFields).toEqual(idFields);
    });

    it('should accept custom timelineLimit', () => {
      const result = resolveOptions({ spec: './api.yaml', timelineLimit: 1000 });
      expect(result.timelineLimit).toBe(1000);
    });

    it('should accept devtools: false', () => {
      const result = resolveOptions({ spec: './api.yaml', devtools: false });
      expect(result.devtools).toBe(false);
    });

    it('should accept cors: false', () => {
      const result = resolveOptions({ spec: './api.yaml', cors: false });
      expect(result.cors).toBe(false);
    });

    it('should accept custom corsOrigin string', () => {
      const result = resolveOptions({ spec: './api.yaml', corsOrigin: 'http://localhost:3000' });
      expect(result.corsOrigin).toBe('http://localhost:3000');
    });

    it('should accept corsOrigin array', () => {
      const origins = ['http://localhost:3000', 'http://localhost:5173'];
      const result = resolveOptions({ spec: './api.yaml', corsOrigin: origins });
      expect(result.corsOrigin).toEqual(origins);
    });

    it('should accept silent: true', () => {
      const result = resolveOptions({ spec: './api.yaml', silent: true });
      expect(result.silent).toBe(true);
    });

    it('should accept custom logger', () => {
      const customLogger = {
        info: () => {},
        warn: () => {},
        error: () => {},
      };
      const result = resolveOptions({ spec: './api.yaml', logger: customLogger });
      expect(result.logger).toBe(customLogger);
    });
  });

  describe('spec formats', () => {
    it('should accept local file path', () => {
      const result = resolveOptions({ spec: './openapi/petstore.yaml' });
      expect(result.spec).toBe('./openapi/petstore.yaml');
    });

    it('should accept absolute file path', () => {
      const result = resolveOptions({ spec: '/usr/local/api/openapi.json' });
      expect(result.spec).toBe('/usr/local/api/openapi.json');
    });

    it('should accept HTTP URL', () => {
      const result = resolveOptions({ spec: 'http://example.com/api.yaml' });
      expect(result.spec).toBe('http://example.com/api.yaml');
    });

    it('should accept HTTPS URL', () => {
      const result = resolveOptions({ spec: 'https://petstore.swagger.io/v2/swagger.json' });
      expect(result.spec).toBe('https://petstore.swagger.io/v2/swagger.json');
    });
  });

  describe('combined options', () => {
    it('should handle full configuration', () => {
      const options = {
        spec: './api.yaml',
        port: 5000,
        proxyPath: '/v3',
        handlersDir: './handlers',
        seedsDir: './seeds',
        enabled: true,
        idFields: { Pet: 'petId' },
        timelineLimit: 200,
        devtools: false,
        cors: true,
        corsOrigin: 'http://localhost:3000',
        silent: true,
      };

      const result = resolveOptions(options);

      expect(result.spec).toBe('./api.yaml');
      expect(result.port).toBe(5000);
      expect(result.proxyPath).toBe('/v3');
      expect(result.handlersDir).toBe('./handlers');
      expect(result.seedsDir).toBe('./seeds');
      expect(result.enabled).toBe(true);
      expect(result.idFields).toEqual({ Pet: 'petId' });
      expect(result.timelineLimit).toBe(200);
      expect(result.devtools).toBe(false);
      expect(result.cors).toBe(true);
      expect(result.corsOrigin).toBe('http://localhost:3000');
      expect(result.silent).toBe(true);
    });
  });
});
