/**
 * Spec ID Derivation Tests
 *
 * What: Unit tests for slugify(), deriveSpecId(), and validateUniqueIds()
 * How: Tests each function with edge cases, happy paths, and error scenarios
 * Why: Ensures spec IDs are stable, URL-safe, and unique across all specs
 */

import type { OpenAPIV3_1 } from '@scalar/openapi-types';
import { describe, expect, it } from 'vitest';

import { deriveSpecId, slugify, validateUniqueIds } from '../spec-id.js';
import type { ValidationErrorCode } from '../types.js';
import { ValidationError } from '../types.js';

/**
 * Assert that `fn` throws a ValidationError with the expected code.
 */
function expectValidationError(fn: () => unknown, expectedCode: ValidationErrorCode): void {
  expect(fn).toThrow(
    expect.objectContaining({
      name: 'ValidationError',
      code: expectedCode,
    }),
  );
}

/**
 * Create a minimal OpenAPI 3.1 document for testing
 */
function makeDocument(title?: string): OpenAPIV3_1.Document {
  return {
    openapi: '3.1.0',
    info: {
      title: title ?? '',
      version: '1.0.0',
    },
    paths: {},
  };
}

// =============================================================================
// slugify()
// =============================================================================

describe('slugify', () => {
  // ---------------------------------------------------------------------------
  // Basic transformations
  // ---------------------------------------------------------------------------

  describe('basic transformations', () => {
    it('should lowercase the input', () => {
      expect(slugify('HELLO')).toBe('hello');
    });

    it('should replace spaces with hyphens', () => {
      expect(slugify('Swagger Petstore')).toBe('swagger-petstore');
    });

    it('should handle mixed case with spaces', () => {
      expect(slugify('Billing API v2')).toBe('billing-api-v2');
    });

    it('should handle simple two-word strings', () => {
      expect(slugify('User Service')).toBe('user-service');
    });
  });

  // ---------------------------------------------------------------------------
  // Special characters
  // ---------------------------------------------------------------------------

  describe('special characters', () => {
    it('should replace dots with hyphens', () => {
      expect(slugify('api.v3.service')).toBe('api-v3-service');
    });

    it('should replace underscores with hyphens', () => {
      expect(slugify('my_api_service')).toBe('my-api-service');
    });

    it('should replace slashes with hyphens', () => {
      expect(slugify('api/v3/service')).toBe('api-v3-service');
    });

    it('should replace colons with hyphens', () => {
      expect(slugify('api:v3')).toBe('api-v3');
    });

    it('should replace @ symbol', () => {
      expect(slugify('@scope/package')).toBe('scope-package');
    });

    it('should replace parentheses', () => {
      expect(slugify('API (Internal)')).toBe('api-internal');
    });

    it('should replace brackets', () => {
      expect(slugify('API [Beta]')).toBe('api-beta');
    });

    it('should handle mixed special characters', () => {
      expect(slugify('My API (v2.1) - Internal')).toBe('my-api-v2-1-internal');
    });
  });

  // ---------------------------------------------------------------------------
  // Unicode handling
  // ---------------------------------------------------------------------------

  describe('unicode handling', () => {
    it('should preserve base letters after NFD decomposition', () => {
      expect(slugify('café')).toBe('cafe');
    });

    it('should handle accented characters', () => {
      expect(slugify('Ünit Tëst')).toBe('unit-test');
    });

    it('should handle CJK characters', () => {
      const result = slugify('テスト API');
      expect(result).toBe('api');
    });

    it('should handle emoji', () => {
      const result = slugify('🚀 API');
      expect(result).toBe('api');
    });
  });

  // ---------------------------------------------------------------------------
  // Consecutive hyphens
  // ---------------------------------------------------------------------------

  describe('consecutive hyphens', () => {
    it('should collapse consecutive hyphens from special chars', () => {
      expect(slugify('api---service')).toBe('api-service');
    });

    it('should collapse hyphens from multiple special chars', () => {
      expect(slugify('api   service')).toBe('api-service');
    });

    it('should collapse hyphens from mixed separators', () => {
      expect(slugify('api - _ . service')).toBe('api-service');
    });
  });

  // ---------------------------------------------------------------------------
  // Leading/trailing hyphens
  // ---------------------------------------------------------------------------

  describe('leading and trailing hyphens', () => {
    it('should trim leading hyphens', () => {
      expect(slugify('-api')).toBe('api');
    });

    it('should trim trailing hyphens', () => {
      expect(slugify('api-')).toBe('api');
    });

    it('should trim both leading and trailing hyphens', () => {
      expect(slugify('-api-')).toBe('api');
    });

    it('should trim leading special chars that become hyphens', () => {
      expect(slugify('  api')).toBe('api');
    });

    it('should trim trailing special chars that become hyphens', () => {
      expect(slugify('api  ')).toBe('api');
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should return empty string for empty input', () => {
      expect(slugify('')).toBe('');
    });

    it('should return empty string for whitespace-only input', () => {
      expect(slugify('   ')).toBe('');
    });

    it('should return empty string for special-chars-only input', () => {
      expect(slugify('---')).toBe('');
    });

    it('should handle single character', () => {
      expect(slugify('A')).toBe('a');
    });

    it('should handle numbers only', () => {
      expect(slugify('123')).toBe('123');
    });

    it('should handle already-slugified input', () => {
      expect(slugify('already-slugified')).toBe('already-slugified');
    });

    it('should preserve numbers in text', () => {
      expect(slugify('API v2.0')).toBe('api-v2-0');
    });
  });
});

// =============================================================================
// deriveSpecId()
// =============================================================================

describe('deriveSpecId', () => {
  // ---------------------------------------------------------------------------
  // Explicit ID priority
  // ---------------------------------------------------------------------------

  describe('explicit ID', () => {
    it('should use explicit id when provided', () => {
      const result = deriveSpecId('petstore', makeDocument('Some Title'));
      expect(result).toBe('petstore');
    });

    it('should slugify the explicit id', () => {
      const result = deriveSpecId('My Custom API', makeDocument('Some Title'));
      expect(result).toBe('my-custom-api');
    });

    it('should prioritize explicit id over info.title', () => {
      const result = deriveSpecId('custom-id', makeDocument('Swagger Petstore'));
      expect(result).toBe('custom-id');
    });

    it('should trim whitespace from explicit id before checking', () => {
      const result = deriveSpecId('  petstore  ', makeDocument('Some Title'));
      expect(result).toBe('petstore');
    });
  });

  // ---------------------------------------------------------------------------
  // Auto-derived from info.title
  // ---------------------------------------------------------------------------

  describe('auto-derived from info.title', () => {
    it('should derive from info.title when no explicit id', () => {
      const result = deriveSpecId('', makeDocument('Swagger Petstore'));
      expect(result).toBe('swagger-petstore');
    });

    it('should slugify the title', () => {
      const result = deriveSpecId('', makeDocument('Billing API v2'));
      expect(result).toBe('billing-api-v2');
    });

    it('should handle complex titles', () => {
      const result = deriveSpecId('', makeDocument('My Company - Internal API (v3.1)'));
      expect(result).toBe('my-company-internal-api-v3-1');
    });
  });

  // ---------------------------------------------------------------------------
  // Missing title error
  // ---------------------------------------------------------------------------

  describe('missing title error', () => {
    it('should throw SPEC_ID_MISSING when no explicit id and no title', () => {
      expectValidationError(() => deriveSpecId('', makeDocument('')), 'SPEC_ID_MISSING');
    });

    it('should throw SPEC_ID_MISSING when no explicit id and title is whitespace', () => {
      expectValidationError(() => deriveSpecId('', makeDocument('   ')), 'SPEC_ID_MISSING');
    });

    it('should throw SPEC_ID_MISSING when no explicit id and info is missing title', () => {
      const doc = {
        openapi: '3.1.0',
        info: { version: '1.0.0' },
        paths: {},
      } as OpenAPIV3_1.Document;
      expectValidationError(() => deriveSpecId('', doc), 'SPEC_ID_MISSING');
    });

    it('should include guidance in the error message', () => {
      expect(() => deriveSpecId('', makeDocument(''))).toThrow(/explicit id/);
    });

    it('should throw when explicit id is whitespace-only', () => {
      expectValidationError(() => deriveSpecId('   ', makeDocument('')), 'SPEC_ID_MISSING');
    });
  });
});

// =============================================================================
// validateUniqueIds()
// =============================================================================

describe('validateUniqueIds', () => {
  // ---------------------------------------------------------------------------
  // Valid (unique) IDs
  // ---------------------------------------------------------------------------

  describe('unique IDs', () => {
    it('should not throw for unique IDs', () => {
      expect(() => validateUniqueIds(['petstore', 'inventory', 'billing'])).not.toThrow();
    });

    it('should not throw for single ID', () => {
      expect(() => validateUniqueIds(['petstore'])).not.toThrow();
    });

    it('should not throw for empty array', () => {
      expect(() => validateUniqueIds([])).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Duplicate detection
  // ---------------------------------------------------------------------------

  describe('duplicate detection', () => {
    it('should throw SPEC_ID_DUPLICATE for duplicate IDs', () => {
      expectValidationError(
        () => validateUniqueIds(['petstore', 'inventory', 'petstore']),
        'SPEC_ID_DUPLICATE',
      );
    });

    it('should throw SPEC_ID_DUPLICATE for consecutive duplicates', () => {
      expectValidationError(() => validateUniqueIds(['petstore', 'petstore']), 'SPEC_ID_DUPLICATE');
    });

    it('should include the duplicate ID in the error message', () => {
      expect(() => validateUniqueIds(['petstore', 'inventory', 'petstore'])).toThrow(/petstore/);
    });

    it('should collect all duplicates in a single error', () => {
      expect(() => validateUniqueIds(['a', 'b', 'a', 'b'])).toThrow(/a, b/);
    });

    it('should report each duplicate only once', () => {
      let caught: unknown;
      try {
        validateUniqueIds(['x', 'x', 'x']);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(ValidationError);
      // "x" should appear once in the list, not multiple times
      const msg = (caught as ValidationError).message;
      const matches = msg.match(/\bx\b/g);
      expect(matches).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Case sensitivity
  // ---------------------------------------------------------------------------

  describe('case sensitivity', () => {
    it('should treat IDs as case-sensitive (different case = different ID)', () => {
      // IDs should already be slugified (lowercase) by this point,
      // but the function itself does exact comparison
      expect(() => validateUniqueIds(['Petstore', 'petstore'])).not.toThrow();
    });
  });
});
