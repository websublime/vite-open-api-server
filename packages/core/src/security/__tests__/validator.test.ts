/**
 * Security Validator Tests
 *
 * @see Task 5.4: Security Handling
 */

import { describe, expect, it, vi } from 'vitest';

import type { SecurityRequirement } from '../../router/types.js';
import type { ResolvedSecurityScheme } from '../types.js';
import { validateSecurity } from '../validator.js';

/**
 * Helper to create a resolved schemes map
 */
function createSchemes(...schemes: ResolvedSecurityScheme[]): Map<string, ResolvedSecurityScheme> {
  const map = new Map<string, ResolvedSecurityScheme>();
  for (const scheme of schemes) {
    map.set(scheme.name, scheme);
  }
  return map;
}

const bearerScheme: ResolvedSecurityScheme = {
  name: 'bearerAuth',
  type: 'http',
  in: 'header',
  paramName: 'authorization',
  scheme: 'bearer',
};

const basicScheme: ResolvedSecurityScheme = {
  name: 'basicAuth',
  type: 'http',
  in: 'header',
  paramName: 'authorization',
  scheme: 'basic',
};

const apiKeyHeaderScheme: ResolvedSecurityScheme = {
  name: 'api_key',
  type: 'apiKey',
  in: 'header',
  paramName: 'X-API-Key',
};

const apiKeyQueryScheme: ResolvedSecurityScheme = {
  name: 'api_key_query',
  type: 'apiKey',
  in: 'query',
  paramName: 'api_key',
};

const apiKeyCookieScheme: ResolvedSecurityScheme = {
  name: 'session',
  type: 'apiKey',
  in: 'cookie',
  paramName: 'session_id',
};

const oauth2Scheme: ResolvedSecurityScheme = {
  name: 'oauth2',
  type: 'oauth2',
  in: 'header',
  paramName: 'authorization',
  scheme: 'bearer',
};

describe('validateSecurity', () => {
  describe('public endpoints (no requirements)', () => {
    it('should pass when no security requirements', () => {
      const result = validateSecurity([], new Map(), { headers: {}, query: {} });

      expect(result.ok).toBe(true);
      expect(result.context.authenticated).toBe(false);
      expect(result.context.scopes).toEqual([]);
    });
  });

  describe('HTTP Bearer authentication', () => {
    const requirements: SecurityRequirement[] = [{ name: 'bearerAuth', scopes: [] }];
    const schemes = createSchemes(bearerScheme);

    it('should pass with valid Bearer token', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { authorization: 'Bearer my-token-123' },
        query: {},
      });

      expect(result.ok).toBe(true);
      expect(result.context.authenticated).toBe(true);
      expect(result.context.scheme).toBe('bearerAuth');
      expect(result.context.credentials).toBe('my-token-123');
    });

    it('should pass with any non-empty Bearer token', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { authorization: 'Bearer x' },
        query: {},
      });

      expect(result.ok).toBe(true);
      expect(result.context.credentials).toBe('x');
    });

    it('should fail when Authorization header is missing', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: {},
        query: {},
      });

      expect(result.ok).toBe(false);
      expect(result.context.authenticated).toBe(false);
      expect(result.error).toContain('bearerAuth');
    });

    it('should fail when Authorization header is empty', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { authorization: '' },
        query: {},
      });

      expect(result.ok).toBe(false);
    });

    it('should fail when Bearer prefix is missing', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { authorization: 'my-token-123' },
        query: {},
      });

      expect(result.ok).toBe(false);
    });

    it('should fail when wrong scheme prefix (Basic instead of Bearer)', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { authorization: 'Basic dXNlcjpwYXNz' },
        query: {},
      });

      expect(result.ok).toBe(false);
    });

    it('should fail when Bearer token is empty after prefix', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { authorization: 'Bearer ' },
        query: {},
      });

      expect(result.ok).toBe(false);
    });

    it('should reject Bearer token with spaces (must be single token)', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { authorization: 'Bearer token with spaces' },
        query: {},
      });

      expect(result.ok).toBe(false);
    });

    it('should be case-insensitive for header name', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { Authorization: 'Bearer my-token' },
        query: {},
      });

      expect(result.ok).toBe(true);
    });

    it('should preserve scopes from requirements', () => {
      const scopedReqs: SecurityRequirement[] = [
        { name: 'bearerAuth', scopes: ['read:pets', 'write:pets'] },
      ];

      const result = validateSecurity(scopedReqs, schemes, {
        headers: { authorization: 'Bearer token' },
        query: {},
      });

      expect(result.ok).toBe(true);
      expect(result.context.scopes).toEqual(['read:pets', 'write:pets']);
    });
  });

  describe('HTTP Basic authentication', () => {
    const requirements: SecurityRequirement[] = [{ name: 'basicAuth', scopes: [] }];
    const schemes = createSchemes(basicScheme);

    it('should pass with valid Basic credentials', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { authorization: 'Basic dXNlcjpwYXNz' },
        query: {},
      });

      expect(result.ok).toBe(true);
      expect(result.context.scheme).toBe('basicAuth');
      expect(result.context.credentials).toBe('dXNlcjpwYXNz');
    });

    it('should fail when Basic prefix is missing', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { authorization: 'dXNlcjpwYXNz' },
        query: {},
      });

      expect(result.ok).toBe(false);
    });

    it('should fail when using Bearer prefix instead of Basic', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { authorization: 'Bearer some-token' },
        query: {},
      });

      expect(result.ok).toBe(false);
    });
  });

  describe('API Key in header', () => {
    const requirements: SecurityRequirement[] = [{ name: 'api_key', scopes: [] }];
    const schemes = createSchemes(apiKeyHeaderScheme);

    it('should pass with non-empty API key header', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { 'X-API-Key': 'my-api-key' },
        query: {},
      });

      expect(result.ok).toBe(true);
      expect(result.context.scheme).toBe('api_key');
      expect(result.context.credentials).toBe('my-api-key');
    });

    it('should be case-insensitive for API key header name', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { 'x-api-key': 'my-api-key' },
        query: {},
      });

      expect(result.ok).toBe(true);
    });

    it('should fail when API key header is missing', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: {},
        query: {},
      });

      expect(result.ok).toBe(false);
    });

    it('should fail when API key header is empty', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { 'X-API-Key': '' },
        query: {},
      });

      expect(result.ok).toBe(false);
    });

    it('should fail when API key header is whitespace only', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { 'X-API-Key': '   ' },
        query: {},
      });

      expect(result.ok).toBe(false);
    });
  });

  describe('API Key in query', () => {
    const requirements: SecurityRequirement[] = [{ name: 'api_key_query', scopes: [] }];
    const schemes = createSchemes(apiKeyQueryScheme);

    it('should pass with non-empty query parameter', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: {},
        query: { api_key: 'my-key' },
      });

      expect(result.ok).toBe(true);
      expect(result.context.credentials).toBe('my-key');
    });

    it('should fail when query parameter is missing', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: {},
        query: {},
      });

      expect(result.ok).toBe(false);
    });

    it('should fail when query parameter is empty', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: {},
        query: { api_key: '' },
      });

      expect(result.ok).toBe(false);
    });

    it('should handle multi-value query parameter (use first)', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: {},
        query: { api_key: ['key1', 'key2'] },
      });

      expect(result.ok).toBe(true);
      expect(result.context.credentials).toBe('key1');
    });
  });

  describe('API Key in cookie', () => {
    const requirements: SecurityRequirement[] = [{ name: 'session', scopes: [] }];
    const schemes = createSchemes(apiKeyCookieScheme);

    it('should pass with cookie present', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { cookie: 'session_id=abc123; other=value' },
        query: {},
      });

      expect(result.ok).toBe(true);
      expect(result.context.credentials).toBe('abc123');
    });

    it('should fail when cookie header is missing', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: {},
        query: {},
      });

      expect(result.ok).toBe(false);
    });

    it('should fail when specific cookie is not in cookie header', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { cookie: 'other=value; another=thing' },
        query: {},
      });

      expect(result.ok).toBe(false);
    });

    it('should handle cookie values with equals signs', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { cookie: 'session_id=abc=def=ghi' },
        query: {},
      });

      expect(result.ok).toBe(true);
      expect(result.context.credentials).toBe('abc=def=ghi');
    });

    it('should fail when cookie value is empty', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { cookie: 'session_id=' },
        query: {},
      });

      expect(result.ok).toBe(false);
      expect(result.context.credentials).toBeUndefined();
    });
  });

  describe('OAuth2 (treated as Bearer)', () => {
    const requirements: SecurityRequirement[] = [{ name: 'oauth2', scopes: ['read:pets'] }];
    const schemes = createSchemes(oauth2Scheme);

    it('should pass with Bearer token', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { authorization: 'Bearer oauth-token' },
        query: {},
      });

      expect(result.ok).toBe(true);
      expect(result.context.scheme).toBe('oauth2');
      expect(result.context.credentials).toBe('oauth-token');
      expect(result.context.scopes).toEqual(['read:pets']);
    });

    it('should fail without Bearer token', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: {},
        query: {},
      });

      expect(result.ok).toBe(false);
    });
  });

  describe('OR logic (multiple requirements)', () => {
    const requirements: SecurityRequirement[] = [
      { name: 'bearerAuth', scopes: [] },
      { name: 'api_key', scopes: [] },
    ];
    const schemes = createSchemes(bearerScheme, apiKeyHeaderScheme);

    it('should pass when first requirement is satisfied', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { authorization: 'Bearer token' },
        query: {},
      });

      expect(result.ok).toBe(true);
      expect(result.context.scheme).toBe('bearerAuth');
    });

    it('should pass when second requirement is satisfied', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { 'X-API-Key': 'my-key' },
        query: {},
      });

      expect(result.ok).toBe(true);
      expect(result.context.scheme).toBe('api_key');
    });

    it('should pass when both requirements are satisfied (first wins)', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: {
          authorization: 'Bearer token',
          'X-API-Key': 'my-key',
        },
        query: {},
      });

      expect(result.ok).toBe(true);
      expect(result.context.scheme).toBe('bearerAuth');
    });

    it('should fail when no requirements are satisfied', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: {},
        query: {},
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('bearerAuth');
      expect(result.error).toContain('api_key');
    });
  });

  describe('unknown scheme references', () => {
    it('should skip unknown scheme and try next', () => {
      const requirements: SecurityRequirement[] = [
        { name: 'unknown_scheme', scopes: [] },
        { name: 'api_key', scopes: [] },
      ];
      const schemes = createSchemes(apiKeyHeaderScheme);

      const result = validateSecurity(requirements, schemes, {
        headers: { 'X-API-Key': 'my-key' },
        query: {},
      });

      expect(result.ok).toBe(true);
      expect(result.context.scheme).toBe('api_key');
    });

    it('should fail when all schemes are unknown', () => {
      const requirements: SecurityRequirement[] = [
        { name: 'unknown1', scopes: [] },
        { name: 'unknown2', scopes: [] },
      ];

      const result = validateSecurity(requirements, new Map(), {
        headers: {},
        query: {},
      });

      expect(result.ok).toBe(false);
    });

    it('should warn via logger when scheme is unknown', () => {
      const requirements: SecurityRequirement[] = [{ name: 'nonexistent_scheme', scopes: [] }];

      const mockLogger = {
        log: () => {},
        info: () => {},
        warn: vi.fn(),
        error: () => {},
        debug: () => {},
      };

      validateSecurity(requirements, new Map(), { headers: {}, query: {} }, { logger: mockLogger });

      expect(mockLogger.warn).toHaveBeenCalledOnce();
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('nonexistent_scheme'));
    });

    it('should not warn when no logger is provided', () => {
      const requirements: SecurityRequirement[] = [{ name: 'nonexistent_scheme', scopes: [] }];

      // Should not throw even without logger
      expect(() => {
        validateSecurity(requirements, new Map(), { headers: {}, query: {} });
      }).not.toThrow();
    });
  });

  describe('HTTP Basic pass-through behavior', () => {
    const requirements: SecurityRequirement[] = [{ name: 'basicAuth', scopes: [] }];
    const schemes = createSchemes(basicScheme);

    it('should accept malformed base64 as credential (presence-only check)', () => {
      // The mock validator only checks presence, not validity of base64
      const result = validateSecurity(requirements, schemes, {
        headers: { authorization: 'Basic not-valid-base64!!!' },
        query: {},
      });

      expect(result.ok).toBe(true);
      expect(result.context.credentials).toBe('not-valid-base64!!!');
    });

    it('should accept any non-empty string after Basic prefix', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { authorization: 'Basic x' },
        query: {},
      });

      expect(result.ok).toBe(true);
      expect(result.context.credentials).toBe('x');
    });

    it('should reject token with spaces (must be single token)', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { authorization: 'Basic part1 part2' },
        query: {},
      });

      expect(result.ok).toBe(false);
    });
  });

  describe('API key special characters and edge cases', () => {
    const requirements: SecurityRequirement[] = [{ name: 'api_key', scopes: [] }];
    const schemes = createSchemes(apiKeyHeaderScheme);

    it('should accept API key with special characters', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { 'x-api-key': 'sk-abc123!@#$%^&*()' },
        query: {},
      });

      expect(result.ok).toBe(true);
      expect(result.context.credentials).toBe('sk-abc123!@#$%^&*()');
    });

    it('should accept API key with unicode characters', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { 'x-api-key': 'key-日本語-中文' },
        query: {},
      });

      expect(result.ok).toBe(true);
      expect(result.context.credentials).toBe('key-日本語-中文');
    });

    it('should accept very long API key values', () => {
      const longKey = 'k'.repeat(1000);
      const result = validateSecurity(requirements, schemes, {
        headers: { 'x-api-key': longKey },
        query: {},
      });

      expect(result.ok).toBe(true);
      expect(result.context.credentials).toBe(longKey);
    });

    it('should reject API key that is only whitespace', () => {
      const result = validateSecurity(requirements, schemes, {
        headers: { 'x-api-key': '  \t\n  ' },
        query: {},
      });

      expect(result.ok).toBe(false);
    });
  });

  describe('public endpoint singleton context', () => {
    it('should return frozen context for public endpoints', () => {
      const result = validateSecurity([], new Map(), { headers: {}, query: {} });

      expect(result.ok).toBe(true);
      expect(result.context.authenticated).toBe(false);
      expect(result.context.scopes).toEqual([]);
      expect(Object.isFrozen(result.context)).toBe(true);
    });

    it('should return the same context object reference for multiple public calls', () => {
      const result1 = validateSecurity([], new Map(), { headers: {}, query: {} });
      const result2 = validateSecurity([], new Map(), { headers: {}, query: {} });

      expect(result1.context).toBe(result2.context);
    });
  });
});
