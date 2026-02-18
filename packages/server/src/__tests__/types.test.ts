/**
 * Types Tests
 *
 * What: Unit tests for type utilities, option resolution, and ValidationError
 * How: Tests resolveOptions function with various inputs including multi-spec config
 * Why: Ensures configuration defaults, validation, and error codes work correctly
 */

import { describe, expect, it } from 'vitest';
import {
  type OpenApiServerOptions,
  type ResolvedOptions,
  resolveOptions,
  type SpecConfig,
  ValidationError,
} from '../types.js';
import { expectValidationError } from './test-utils.js';

// =============================================================================
// ValidationError
// =============================================================================

describe('ValidationError', () => {
  it('should be an instance of Error', () => {
    const error = new ValidationError('SPECS_EMPTY', 'No specs');
    expect(error).toBeInstanceOf(Error);
  });

  it('should have name set to ValidationError', () => {
    const error = new ValidationError('SPECS_EMPTY', 'No specs');
    expect(error.name).toBe('ValidationError');
  });

  it('should store the error code', () => {
    const error = new ValidationError('SPEC_ID_MISSING', 'Cannot derive spec ID');
    expect(error.code).toBe('SPEC_ID_MISSING');
  });

  it('should store the message', () => {
    const error = new ValidationError('SPECS_EMPTY', 'No specs configured');
    expect(error.message).toBe('No specs configured');
  });

  it('should enforce ValidationErrorCode type at compile time', () => {
    // Valid code compiles fine
    const valid = new ValidationError('SPECS_EMPTY', 'test');
    expect(valid.code).toBe('SPECS_EMPTY');

    // @ts-expect-error - Invalid error code should not compile
    const invalid = new ValidationError('INVALID_CODE', 'test');
    expect(invalid.code).toBe('INVALID_CODE');
  });

  it('should support all Appendix B error codes', () => {
    const codes = [
      'SPEC_ID_MISSING',
      'SPEC_ID_DUPLICATE',
      'PROXY_PATH_MISSING',
      'PROXY_PATH_TOO_BROAD',
      'PROXY_PATH_INVALID',
      'PROXY_PATH_DUPLICATE',
      'PROXY_PATH_OVERLAP',
      'SPEC_NOT_FOUND',
      'SPECS_EMPTY',
    ] as const;

    for (const code of codes) {
      const error = new ValidationError(code, `Test: ${code}`);
      expect(error.code).toBe(code);
      expect(error.name).toBe('ValidationError');
    }
  });
});

// =============================================================================
// resolveOptions
// =============================================================================

describe('resolveOptions', () => {
  // ---------------------------------------------------------------------------
  // Validation: specs array
  // ---------------------------------------------------------------------------

  describe('specs validation', () => {
    it('should throw SPECS_EMPTY for missing specs', () => {
      expectValidationError(() => resolveOptions({} as OpenApiServerOptions), 'SPECS_EMPTY');
    });

    it('should throw SPECS_EMPTY for empty specs array', () => {
      expectValidationError(() => resolveOptions({ specs: [] }), 'SPECS_EMPTY');
    });

    it('should throw SPECS_EMPTY for null specs', () => {
      expectValidationError(
        () => resolveOptions({ specs: null as unknown as OpenApiServerOptions['specs'] }),
        'SPECS_EMPTY',
      );
    });

    it('should throw SPECS_EMPTY for undefined specs', () => {
      expectValidationError(
        () => resolveOptions({ specs: undefined as unknown as OpenApiServerOptions['specs'] }),
        'SPECS_EMPTY',
      );
    });

    it('should throw SPECS_EMPTY for non-array specs', () => {
      expectValidationError(
        () => resolveOptions({ specs: 'not-an-array' as unknown as OpenApiServerOptions['specs'] }),
        'SPECS_EMPTY',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Validation: individual spec entries
  // ---------------------------------------------------------------------------

  describe('spec entry validation', () => {
    it('should throw SPEC_NOT_FOUND for empty spec string', () => {
      expectValidationError(() => resolveOptions({ specs: [{ spec: '' }] }), 'SPEC_NOT_FOUND');
    });

    it('should throw SPEC_NOT_FOUND for whitespace-only spec', () => {
      expectValidationError(() => resolveOptions({ specs: [{ spec: '   ' }] }), 'SPEC_NOT_FOUND');
    });

    it('should throw SPEC_NOT_FOUND for null spec field', () => {
      expectValidationError(
        () => resolveOptions({ specs: [{ spec: null as unknown as string }] }),
        'SPEC_NOT_FOUND',
      );
    });

    it('should throw SPEC_NOT_FOUND for undefined spec field', () => {
      expectValidationError(
        () => resolveOptions({ specs: [{ spec: undefined as unknown as string }] }),
        'SPEC_NOT_FOUND',
      );
    });

    it('should throw SPEC_NOT_FOUND for non-string spec field', () => {
      expectValidationError(
        () => resolveOptions({ specs: [{ spec: 123 as unknown as string }] }),
        'SPEC_NOT_FOUND',
      );
    });

    it('should validate all spec entries, not just the first', () => {
      expectValidationError(
        () => resolveOptions({ specs: [{ spec: './valid.yaml' }, { spec: '' }] }),
        'SPEC_NOT_FOUND',
      );
    });

    it('should include the failing spec index in the error message', () => {
      let caught: unknown;
      try {
        resolveOptions({ specs: [{ spec: './valid.yaml' }, { spec: '' }] });
      } catch (error) {
        caught = error;
      }
      expect((caught as ValidationError).message).toContain('specs[1]');
    });

    it('should include the spec id in the error message when available', () => {
      let caught: unknown;
      try {
        resolveOptions({ specs: [{ spec: '', id: 'broken-api' }] });
      } catch (error) {
        caught = error;
      }
      expect((caught as ValidationError).message).toContain('specs[0]');
      expect((caught as ValidationError).message).toContain('broken-api');
    });

    it('should throw SPEC_NOT_FOUND for non-object spec entry', () => {
      expectValidationError(
        () => resolveOptions({ specs: ['./api.yaml' as unknown as SpecConfig] }),
        'SPEC_NOT_FOUND',
      );
    });

    it('should report first validation error when multiple specs are invalid', () => {
      let caught: unknown;
      try {
        resolveOptions({
          specs: [{ spec: '' }, { spec: '   ' }, { spec: null as unknown as string }],
        });
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(ValidationError);
      expect((caught as ValidationError).code).toBe('SPEC_NOT_FOUND');
      expect((caught as ValidationError).message).toContain('specs[0]');
    });
  });

  // ---------------------------------------------------------------------------
  // Default values
  // ---------------------------------------------------------------------------

  describe('default values', () => {
    it('should apply all defaults for minimal config', () => {
      const result = resolveOptions({ specs: [{ spec: './api.yaml' }] });

      expect(result.port).toBe(4000);
      expect(result.enabled).toBe(true);
      expect(result.timelineLimit).toBe(500);
      expect(result.devtools).toBe(true);
      expect(result.cors).toBe(true);
      expect(result.corsOrigin).toBe('*');
      expect(result.silent).toBe(false);
      expect(result.logger).toBeUndefined();
    });

    it('should resolve spec entries with empty placeholders for deferred fields', () => {
      const result = resolveOptions({ specs: [{ spec: './api.yaml' }] });

      expect(result.specs).toHaveLength(1);
      expect(result.specs[0].spec).toBe('./api.yaml');
      expect(result.specs[0].id).toBe('');
      expect(result.specs[0].proxyPath).toBe('');
      expect(result.specs[0].handlersDir).toBe('');
      expect(result.specs[0].seedsDir).toBe('');
      expect(result.specs[0].idFields).toEqual({});
    });

    it('should set proxyPathSource to auto when proxyPath is not provided', () => {
      const result = resolveOptions({ specs: [{ spec: './api.yaml' }] });
      expect(result.specs[0].proxyPathSource).toBe('auto');
    });

    it('should set proxyPathSource to explicit when proxyPath is provided', () => {
      const result = resolveOptions({
        specs: [{ spec: './api.yaml', proxyPath: '/api/v3' }],
      });
      expect(result.specs[0].proxyPathSource).toBe('explicit');
    });
  });

  // ---------------------------------------------------------------------------
  // Custom values
  // ---------------------------------------------------------------------------

  describe('custom values', () => {
    it('should accept custom port', () => {
      const result = resolveOptions({ specs: [{ spec: './api.yaml' }], port: 8080 });
      expect(result.port).toBe(8080);
    });

    it('should accept enabled: false', () => {
      const result = resolveOptions({ specs: [{ spec: './api.yaml' }], enabled: false });
      expect(result.enabled).toBe(false);
    });

    it('should accept custom timelineLimit', () => {
      const result = resolveOptions({ specs: [{ spec: './api.yaml' }], timelineLimit: 1000 });
      expect(result.timelineLimit).toBe(1000);
    });

    it('should accept devtools: false', () => {
      const result = resolveOptions({ specs: [{ spec: './api.yaml' }], devtools: false });
      expect(result.devtools).toBe(false);
    });

    it('should accept cors: false', () => {
      const result = resolveOptions({ specs: [{ spec: './api.yaml' }], cors: false });
      expect(result.cors).toBe(false);
    });

    it('should accept custom corsOrigin string', () => {
      const result = resolveOptions({
        specs: [{ spec: './api.yaml' }],
        corsOrigin: 'http://localhost:3000',
      });
      expect(result.corsOrigin).toBe('http://localhost:3000');
    });

    it('should accept corsOrigin array', () => {
      const origins = ['http://localhost:3000', 'http://localhost:5173'];
      const result = resolveOptions({ specs: [{ spec: './api.yaml' }], corsOrigin: origins });
      expect(result.corsOrigin).toEqual(origins);
    });

    it('should accept silent: true', () => {
      const result = resolveOptions({ specs: [{ spec: './api.yaml' }], silent: true });
      expect(result.silent).toBe(true);
    });

    it('should accept custom logger', () => {
      const customLogger = {
        log: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      };
      const result = resolveOptions({ specs: [{ spec: './api.yaml' }], logger: customLogger });
      expect(result.logger).toBe(customLogger);
    });
  });

  // ---------------------------------------------------------------------------
  // Per-spec configuration
  // ---------------------------------------------------------------------------

  describe('per-spec configuration', () => {
    it('should preserve explicit id', () => {
      const result = resolveOptions({
        specs: [{ spec: './api.yaml', id: 'my-api' }],
      });
      expect(result.specs[0].id).toBe('my-api');
    });

    it('should preserve explicit proxyPath', () => {
      const result = resolveOptions({
        specs: [{ spec: './api.yaml', proxyPath: '/api/v3' }],
      });
      expect(result.specs[0].proxyPath).toBe('/api/v3');
    });

    it('should preserve explicit handlersDir', () => {
      const result = resolveOptions({
        specs: [{ spec: './api.yaml', handlersDir: './custom/handlers' }],
      });
      expect(result.specs[0].handlersDir).toBe('./custom/handlers');
    });

    it('should preserve explicit seedsDir', () => {
      const result = resolveOptions({
        specs: [{ spec: './api.yaml', seedsDir: './custom/seeds' }],
      });
      expect(result.specs[0].seedsDir).toBe('./custom/seeds');
    });

    it('should preserve explicit idFields', () => {
      const idFields = { User: 'userId', Order: 'orderId' };
      const result = resolveOptions({
        specs: [{ spec: './api.yaml', idFields }],
      });
      expect(result.specs[0].idFields).toEqual(idFields);
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple specs
  // ---------------------------------------------------------------------------

  describe('multiple specs', () => {
    it('should handle multiple spec entries', () => {
      const result = resolveOptions({
        specs: [
          { spec: './petstore.yaml', id: 'petstore' },
          { spec: './inventory.yaml', id: 'inventory' },
        ],
      });

      expect(result.specs).toHaveLength(2);
      expect(result.specs[0].spec).toBe('./petstore.yaml');
      expect(result.specs[0].id).toBe('petstore');
      expect(result.specs[1].spec).toBe('./inventory.yaml');
      expect(result.specs[1].id).toBe('inventory');
    });

    it('should track proxyPathSource independently per spec', () => {
      const result = resolveOptions({
        specs: [{ spec: './petstore.yaml', proxyPath: '/api/v3' }, { spec: './inventory.yaml' }],
      });

      expect(result.specs[0].proxyPathSource).toBe('explicit');
      expect(result.specs[1].proxyPathSource).toBe('auto');
    });

    it('should resolve each spec independently', () => {
      const result = resolveOptions({
        specs: [
          {
            spec: './petstore.yaml',
            id: 'petstore',
            proxyPath: '/api/v3',
            handlersDir: './mocks/petstore/handlers',
            seedsDir: './mocks/petstore/seeds',
            idFields: { Pet: 'petId' },
          },
          { spec: './inventory.yaml' },
        ],
      });

      // First spec: all explicit
      expect(result.specs[0].spec).toBe('./petstore.yaml');
      expect(result.specs[0].id).toBe('petstore');
      expect(result.specs[0].proxyPath).toBe('/api/v3');
      expect(result.specs[0].handlersDir).toBe('./mocks/petstore/handlers');
      expect(result.specs[0].seedsDir).toBe('./mocks/petstore/seeds');
      expect(result.specs[0].idFields).toEqual({ Pet: 'petId' });

      // Second spec: all defaults (empty placeholders)
      expect(result.specs[1].spec).toBe('./inventory.yaml');
      expect(result.specs[1].id).toBe('');
      expect(result.specs[1].proxyPath).toBe('');
      expect(result.specs[1].handlersDir).toBe('');
      expect(result.specs[1].seedsDir).toBe('');
      expect(result.specs[1].idFields).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // Spec formats
  // ---------------------------------------------------------------------------

  describe('spec formats', () => {
    it('should accept local file path', () => {
      const result = resolveOptions({ specs: [{ spec: './openapi/petstore.yaml' }] });
      expect(result.specs[0].spec).toBe('./openapi/petstore.yaml');
    });

    it('should accept absolute file path', () => {
      const result = resolveOptions({ specs: [{ spec: '/usr/local/api/openapi.json' }] });
      expect(result.specs[0].spec).toBe('/usr/local/api/openapi.json');
    });

    it('should accept HTTP URL', () => {
      const result = resolveOptions({ specs: [{ spec: 'http://example.com/api.yaml' }] });
      expect(result.specs[0].spec).toBe('http://example.com/api.yaml');
    });

    it('should accept HTTPS URL', () => {
      const result = resolveOptions({
        specs: [{ spec: 'https://petstore.swagger.io/v2/swagger.json' }],
      });
      expect(result.specs[0].spec).toBe('https://petstore.swagger.io/v2/swagger.json');
    });
  });

  // ---------------------------------------------------------------------------
  // Combined options
  // ---------------------------------------------------------------------------

  describe('combined options', () => {
    it('should handle full configuration with multiple specs', () => {
      const customLogger = {
        log: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      };

      const result = resolveOptions({
        specs: [
          {
            spec: './petstore.yaml',
            id: 'petstore',
            proxyPath: '/api/v3',
            handlersDir: './mocks/petstore/handlers',
            seedsDir: './mocks/petstore/seeds',
            idFields: { Pet: 'petId' },
          },
          {
            spec: './inventory.yaml',
            id: 'inventory',
            proxyPath: '/inventory',
          },
        ],
        port: 5000,
        enabled: true,
        timelineLimit: 200,
        devtools: false,
        cors: true,
        corsOrigin: 'http://localhost:3000',
        silent: true,
        logger: customLogger,
      });

      expect(result.specs).toHaveLength(2);
      expect(result.port).toBe(5000);
      expect(result.enabled).toBe(true);
      expect(result.timelineLimit).toBe(200);
      expect(result.devtools).toBe(false);
      expect(result.cors).toBe(true);
      expect(result.corsOrigin).toBe('http://localhost:3000');
      expect(result.silent).toBe(true);
      expect(result.logger).toBe(customLogger);
    });
  });

  // ---------------------------------------------------------------------------
  // Return type structure
  // ---------------------------------------------------------------------------

  describe('return type structure', () => {
    it('should return ResolvedOptions with correct shape', () => {
      const result: ResolvedOptions = resolveOptions({
        specs: [{ spec: './api.yaml' }],
      });

      // All required fields should be present
      expect(result).toHaveProperty('specs');
      expect(result).toHaveProperty('port');
      expect(result).toHaveProperty('enabled');
      expect(result).toHaveProperty('timelineLimit');
      expect(result).toHaveProperty('devtools');
      expect(result).toHaveProperty('cors');
      expect(result).toHaveProperty('corsOrigin');
      expect(result).toHaveProperty('silent');
    });

    it('should return ResolvedSpecConfig entries with correct shape', () => {
      const result = resolveOptions({
        specs: [{ spec: './api.yaml' }],
      });

      const specConfig = result.specs[0];
      expect(specConfig).toHaveProperty('spec');
      expect(specConfig).toHaveProperty('id');
      expect(specConfig).toHaveProperty('proxyPath');
      expect(specConfig).toHaveProperty('proxyPathSource');
      expect(specConfig).toHaveProperty('handlersDir');
      expect(specConfig).toHaveProperty('seedsDir');
      expect(specConfig).toHaveProperty('idFields');
    });
  });
});
