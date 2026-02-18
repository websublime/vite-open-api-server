/**
 * Proxy Path Auto-Detection Tests
 *
 * What: Unit tests for deriveProxyPath(), normalizeProxyPath(), and validateUniqueProxyPaths()
 * How: Tests each function with edge cases, happy paths, and error scenarios
 * Why: Ensures proxy paths are correctly derived, normalized, and validated for uniqueness
 */

import type { OpenAPIV3_1 } from '@scalar/openapi-types';
import { describe, expect, it } from 'vitest';

import { deriveProxyPath, normalizeProxyPath, validateUniqueProxyPaths } from '../proxy-path.js';
import { expectValidationError } from './test-utils.js';

/**
 * Create a minimal OpenAPI 3.1 document with optional servers
 */
function makeDocument(serverUrl?: string): OpenAPIV3_1.Document {
  const doc: OpenAPIV3_1.Document = {
    openapi: '3.1.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
    },
    paths: {},
  };

  if (serverUrl !== undefined) {
    doc.servers = [{ url: serverUrl }];
  }

  return doc;
}

// =============================================================================
// deriveProxyPath()
// =============================================================================

describe('deriveProxyPath', () => {
  // ---------------------------------------------------------------------------
  // Explicit path priority
  // ---------------------------------------------------------------------------

  describe('explicit path', () => {
    it('should use explicit path when provided', () => {
      const result = deriveProxyPath(
        '/api/v3',
        makeDocument('https://example.com/other'),
        'petstore',
      );
      expect(result.proxyPath).toBe('/api/v3');
      expect(result.proxyPathSource).toBe('explicit');
    });

    it('should normalize the explicit path', () => {
      const result = deriveProxyPath('api/v3/', makeDocument(), 'petstore');
      expect(result.proxyPath).toBe('/api/v3');
      expect(result.proxyPathSource).toBe('explicit');
    });

    it('should prioritize explicit path over servers[0].url', () => {
      const result = deriveProxyPath(
        '/custom',
        makeDocument('https://example.com/from-server'),
        'petstore',
      );
      expect(result.proxyPath).toBe('/custom');
      expect(result.proxyPathSource).toBe('explicit');
    });

    it('should trim whitespace from explicit path before checking', () => {
      const result = deriveProxyPath('  /api/v3  ', makeDocument(), 'petstore');
      expect(result.proxyPath).toBe('/api/v3');
      expect(result.proxyPathSource).toBe('explicit');
    });

    it('should throw PROXY_PATH_TOO_BROAD when explicit path is "/"', () => {
      expectValidationError(
        () => deriveProxyPath('/', makeDocument(), 'petstore'),
        'PROXY_PATH_TOO_BROAD',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Auto-derived from servers[0].url — full URLs
  // ---------------------------------------------------------------------------

  describe('auto-derived from full URLs', () => {
    it('should extract path from full URL', () => {
      const result = deriveProxyPath(
        '',
        makeDocument('https://api.example.com/api/v3'),
        'petstore',
      );
      expect(result.proxyPath).toBe('/api/v3');
      expect(result.proxyPathSource).toBe('auto');
    });

    it('should extract path from URL with port', () => {
      const result = deriveProxyPath('', makeDocument('http://localhost:8080/api/v1'), 'petstore');
      expect(result.proxyPath).toBe('/api/v1');
      expect(result.proxyPathSource).toBe('auto');
    });

    it('should extract deeply nested path from URL', () => {
      const result = deriveProxyPath(
        '',
        makeDocument('https://example.com/services/billing/api/v2'),
        'billing',
      );
      expect(result.proxyPath).toBe('/services/billing/api/v2');
      expect(result.proxyPathSource).toBe('auto');
    });

    it('should throw PROXY_PATH_TOO_BROAD when URL has root path only', () => {
      expectValidationError(
        () => deriveProxyPath('', makeDocument('https://api.example.com/'), 'petstore'),
        'PROXY_PATH_TOO_BROAD',
      );
    });

    it('should throw PROXY_PATH_TOO_BROAD when URL has no path', () => {
      expectValidationError(
        () => deriveProxyPath('', makeDocument('https://api.example.com'), 'petstore'),
        'PROXY_PATH_TOO_BROAD',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Auto-derived from servers[0].url — relative paths
  // ---------------------------------------------------------------------------

  describe('auto-derived from relative paths', () => {
    it('should use relative path directly', () => {
      const result = deriveProxyPath('', makeDocument('/api/v3'), 'petstore');
      expect(result.proxyPath).toBe('/api/v3');
      expect(result.proxyPathSource).toBe('auto');
    });

    it('should normalize relative path without leading slash', () => {
      const result = deriveProxyPath('', makeDocument('api/v3'), 'petstore');
      expect(result.proxyPath).toBe('/api/v3');
      expect(result.proxyPathSource).toBe('auto');
    });

    it('should normalize relative path with trailing slash', () => {
      const result = deriveProxyPath('', makeDocument('/api/v3/'), 'petstore');
      expect(result.proxyPath).toBe('/api/v3');
      expect(result.proxyPathSource).toBe('auto');
    });

    it('should throw PROXY_PATH_TOO_BROAD for relative root path "/"', () => {
      expectValidationError(
        () => deriveProxyPath('', makeDocument('/'), 'petstore'),
        'PROXY_PATH_TOO_BROAD',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Missing servers
  // ---------------------------------------------------------------------------

  describe('missing servers', () => {
    it('should throw PROXY_PATH_MISSING when no servers defined', () => {
      expectValidationError(
        () => deriveProxyPath('', makeDocument(), 'petstore'),
        'PROXY_PATH_MISSING',
      );
    });

    it('should throw PROXY_PATH_MISSING when servers array is empty', () => {
      const doc = makeDocument();
      doc.servers = [];
      expectValidationError(() => deriveProxyPath('', doc, 'petstore'), 'PROXY_PATH_MISSING');
    });

    it('should throw PROXY_PATH_MISSING when servers[0].url is empty', () => {
      const doc = makeDocument();
      doc.servers = [{ url: '' }];
      expectValidationError(() => deriveProxyPath('', doc, 'petstore'), 'PROXY_PATH_MISSING');
    });

    it('should include spec ID in error message', () => {
      expect(() => deriveProxyPath('', makeDocument(), 'my-spec')).toThrow(/\[my-spec\]/);
    });

    it('should include guidance to set explicit proxyPath', () => {
      expect(() => deriveProxyPath('', makeDocument(), 'petstore')).toThrow(/explicit proxyPath/);
    });
  });

  // ---------------------------------------------------------------------------
  // Whitespace-only explicit path falls through to auto
  // ---------------------------------------------------------------------------

  describe('whitespace-only explicit path', () => {
    it('should fall through to auto-derive when explicit path is whitespace', () => {
      const result = deriveProxyPath('   ', makeDocument('/api/v3'), 'petstore');
      expect(result.proxyPath).toBe('/api/v3');
      expect(result.proxyPathSource).toBe('auto');
    });

    it('should throw PROXY_PATH_MISSING when explicit is whitespace and no servers', () => {
      expectValidationError(
        () => deriveProxyPath('   ', makeDocument(), 'petstore'),
        'PROXY_PATH_MISSING',
      );
    });
  });
});

// =============================================================================
// normalizeProxyPath()
// =============================================================================

describe('normalizeProxyPath', () => {
  // ---------------------------------------------------------------------------
  // Leading slash
  // ---------------------------------------------------------------------------

  describe('leading slash', () => {
    it('should add leading slash when missing', () => {
      expect(normalizeProxyPath('api/v3', 'test')).toBe('/api/v3');
    });

    it('should keep existing leading slash', () => {
      expect(normalizeProxyPath('/api/v3', 'test')).toBe('/api/v3');
    });
  });

  // ---------------------------------------------------------------------------
  // Trailing slash
  // ---------------------------------------------------------------------------

  describe('trailing slash', () => {
    it('should remove trailing slash', () => {
      expect(normalizeProxyPath('/api/v3/', 'test')).toBe('/api/v3');
    });

    it('should not remove slash if path is just "/"', () => {
      // "/" stays as "/" (then gets rejected by the root check)
      expect(() => normalizeProxyPath('/', 'test')).toThrow();
    });

    it('should handle path without trailing slash', () => {
      expect(normalizeProxyPath('/api/v3', 'test')).toBe('/api/v3');
    });
  });

  // ---------------------------------------------------------------------------
  // Root path rejection
  // ---------------------------------------------------------------------------

  describe('root path rejection', () => {
    it('should throw PROXY_PATH_TOO_BROAD for "/"', () => {
      expectValidationError(() => normalizeProxyPath('/', 'test'), 'PROXY_PATH_TOO_BROAD');
    });

    it('should throw PROXY_PATH_TOO_BROAD for bare slash with no other content', () => {
      expectValidationError(() => normalizeProxyPath('/', 'my-spec'), 'PROXY_PATH_TOO_BROAD');
    });

    it('should include spec ID in error message', () => {
      expect(() => normalizeProxyPath('/', 'my-spec')).toThrow(/\[my-spec\]/);
    });

    it('should include guidance in error message', () => {
      expect(() => normalizeProxyPath('/', 'test')).toThrow(/more specific proxyPath/);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle deeply nested path', () => {
      expect(normalizeProxyPath('/a/b/c/d/e', 'test')).toBe('/a/b/c/d/e');
    });

    it('should handle single segment', () => {
      expect(normalizeProxyPath('/api', 'test')).toBe('/api');
    });

    it('should handle path without leading slash and with trailing slash', () => {
      expect(normalizeProxyPath('api/', 'test')).toBe('/api');
    });

    it('should handle path with multiple segments', () => {
      expect(normalizeProxyPath('services/billing/api/v2', 'test')).toBe(
        '/services/billing/api/v2',
      );
    });
  });
});

// =============================================================================
// validateUniqueProxyPaths()
// =============================================================================

describe('validateUniqueProxyPaths', () => {
  // ---------------------------------------------------------------------------
  // Valid (unique, non-overlapping) paths
  // ---------------------------------------------------------------------------

  describe('unique paths', () => {
    it('should not throw for unique, non-overlapping paths', () => {
      expect(() =>
        validateUniqueProxyPaths([
          { id: 'petstore', proxyPath: '/api/v3' },
          { id: 'inventory', proxyPath: '/inventory/v1' },
          { id: 'billing', proxyPath: '/billing/v2' },
        ]),
      ).not.toThrow();
    });

    it('should not throw for a single spec', () => {
      expect(() =>
        validateUniqueProxyPaths([{ id: 'petstore', proxyPath: '/api/v3' }]),
      ).not.toThrow();
    });

    it('should not throw for empty array', () => {
      expect(() => validateUniqueProxyPaths([])).not.toThrow();
    });

    it('should not throw for sibling paths with shared prefix segment', () => {
      // "/api/v1" and "/api/v2" are NOT overlapping — "/api/v1" is not a prefix of "/api/v2"
      expect(() =>
        validateUniqueProxyPaths([
          { id: 'v1', proxyPath: '/api/v1' },
          { id: 'v2', proxyPath: '/api/v2' },
        ]),
      ).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // Duplicate detection
  // ---------------------------------------------------------------------------

  describe('duplicate detection', () => {
    it('should throw PROXY_PATH_DUPLICATE for duplicate paths', () => {
      expectValidationError(
        () =>
          validateUniqueProxyPaths([
            { id: 'petstore', proxyPath: '/api/v3' },
            { id: 'inventory', proxyPath: '/api/v3' },
          ]),
        'PROXY_PATH_DUPLICATE',
      );
    });

    it('should include both spec IDs in the error message', () => {
      expect(() =>
        validateUniqueProxyPaths([
          { id: 'petstore', proxyPath: '/api/v3' },
          { id: 'inventory', proxyPath: '/api/v3' },
        ]),
      ).toThrow(/petstore.*inventory|inventory.*petstore/);
    });

    it('should include the duplicate path in the error message', () => {
      expect(() =>
        validateUniqueProxyPaths([
          { id: 'petstore', proxyPath: '/api/v3' },
          { id: 'inventory', proxyPath: '/api/v3' },
        ]),
      ).toThrow(/\/api\/v3/);
    });
  });

  // ---------------------------------------------------------------------------
  // Overlap detection (prefix nesting)
  // ---------------------------------------------------------------------------

  describe('overlap detection', () => {
    it('should throw PROXY_PATH_OVERLAP when one path is a prefix of another', () => {
      expectValidationError(
        () =>
          validateUniqueProxyPaths([
            { id: 'broad', proxyPath: '/api' },
            { id: 'specific', proxyPath: '/api/v1' },
          ]),
        'PROXY_PATH_OVERLAP',
      );
    });

    it('should throw PROXY_PATH_OVERLAP regardless of input order', () => {
      expectValidationError(
        () =>
          validateUniqueProxyPaths([
            { id: 'specific', proxyPath: '/api/v1' },
            { id: 'broad', proxyPath: '/api' },
          ]),
        'PROXY_PATH_OVERLAP',
      );
    });

    it('should detect deep nesting overlap', () => {
      expectValidationError(
        () =>
          validateUniqueProxyPaths([
            { id: 'parent', proxyPath: '/services' },
            { id: 'child', proxyPath: '/services/billing/api' },
          ]),
        'PROXY_PATH_OVERLAP',
      );
    });

    it('should include both spec IDs in overlap error', () => {
      expect(() =>
        validateUniqueProxyPaths([
          { id: 'broad', proxyPath: '/api' },
          { id: 'specific', proxyPath: '/api/v1' },
        ]),
      ).toThrow(/broad.*specific|specific.*broad/);
    });

    it('should include both paths in overlap error', () => {
      expect(() =>
        validateUniqueProxyPaths([
          { id: 'broad', proxyPath: '/api' },
          { id: 'specific', proxyPath: '/api/v1' },
        ]),
      ).toThrow(/\/api.*\/api\/v1/);
    });

    it('should not false-positive on similar but non-overlapping prefixes', () => {
      // "/api-v1" does NOT start with "/api/" — the slash boundary matters
      expect(() =>
        validateUniqueProxyPaths([
          { id: 'a', proxyPath: '/api' },
          { id: 'b', proxyPath: '/api-v1' },
        ]),
      ).not.toThrow();
    });
  });
});
