/**
 * Unit tests for Security Normalizer Module
 *
 * Tests the normalizeSecuritySchemes function and related utilities for:
 * - Specs with no security requirements
 * - Specs with all schemes defined
 * - Specs with missing schemes that need generation
 * - Pattern-based scheme generation (apiKey, oauth, bearer, basic)
 * - Preservation of existing schemes
 * - Valid OpenAPI SecurityScheme object generation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectMissingSchemes,
  extractSecurityRequirements,
  generateDefaultSecurityScheme,
  normalizeSecuritySchemes,
} from '../security-normalizer';
import type { OpenApiDocument, OpenApiSecurityScheme } from '../types';

describe('Security Normalizer', () => {
  beforeEach(() => {
    // Suppress console output during tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  describe('extractSecurityRequirements', () => {
    it('should return empty set for spec with no security', () => {
      const spec: OpenApiDocument = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      };

      const result = extractSecurityRequirements(spec);

      expect(result.size).toBe(0);
    });

    it('should extract global security requirements', () => {
      const spec: OpenApiDocument = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
        security: [{ api_key: [] }, { oauth2: ['read', 'write'] }],
        paths: {},
      };

      const result = extractSecurityRequirements(spec);

      expect(result.size).toBe(2);
      expect(result.has('api_key')).toBe(true);
      expect(result.has('oauth2')).toBe(true);
    });

    it('should extract operation-level security requirements', () => {
      const spec: OpenApiDocument = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              security: [{ bearer_auth: [] }],
              responses: { '200': { description: 'OK' } },
            },
            post: {
              security: [{ api_key: [] }],
              responses: { '201': { description: 'Created' } },
            },
          },
          '/admin': {
            delete: {
              security: [{ basic_auth: [] }],
              responses: { '204': { description: 'Deleted' } },
            },
          },
        },
      };

      const result = extractSecurityRequirements(spec);

      expect(result.size).toBe(3);
      expect(result.has('bearer_auth')).toBe(true);
      expect(result.has('api_key')).toBe(true);
      expect(result.has('basic_auth')).toBe(true);
    });

    it('should combine global and operation-level security requirements', () => {
      const spec: OpenApiDocument = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
        security: [{ global_key: [] }],
        paths: {
          '/users': {
            get: {
              security: [{ operation_key: [] }],
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      };

      const result = extractSecurityRequirements(spec);

      expect(result.size).toBe(2);
      expect(result.has('global_key')).toBe(true);
      expect(result.has('operation_key')).toBe(true);
    });

    it('should handle spec with undefined paths', () => {
      const spec: OpenApiDocument = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
        security: [{ api_key: [] }],
      };

      const result = extractSecurityRequirements(spec);

      expect(result.size).toBe(1);
      expect(result.has('api_key')).toBe(true);
    });

    it('should deduplicate scheme names', () => {
      const spec: OpenApiDocument = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
        security: [{ api_key: [] }],
        paths: {
          '/users': {
            get: {
              security: [{ api_key: [] }],
              responses: { '200': { description: 'OK' } },
            },
            post: {
              security: [{ api_key: [] }],
              responses: { '201': { description: 'Created' } },
            },
          },
        },
      };

      const result = extractSecurityRequirements(spec);

      expect(result.size).toBe(1);
      expect(result.has('api_key')).toBe(true);
    });
  });

  describe('detectMissingSchemes', () => {
    it('should return empty array when all schemes are defined', () => {
      const referencedSchemes = new Set(['api_key', 'bearer_auth']);
      const spec: OpenApiDocument = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            api_key: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
            bearer_auth: { type: 'http', scheme: 'bearer' },
          },
        },
      };

      const result = detectMissingSchemes(referencedSchemes, spec);

      expect(result).toHaveLength(0);
    });

    it('should detect missing schemes', () => {
      const referencedSchemes = new Set(['api_key', 'bearer_auth', 'oauth2']);
      const spec: OpenApiDocument = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {
            api_key: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
          },
        },
      };

      const result = detectMissingSchemes(referencedSchemes, spec);

      expect(result).toHaveLength(2);
      expect(result).toContain('bearer_auth');
      expect(result).toContain('oauth2');
    });

    it('should detect all schemes as missing when no components defined', () => {
      const referencedSchemes = new Set(['api_key', 'bearer_auth']);
      const spec: OpenApiDocument = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
      };

      const result = detectMissingSchemes(referencedSchemes, spec);

      expect(result).toHaveLength(2);
      expect(result).toContain('api_key');
      expect(result).toContain('bearer_auth');
    });

    it('should detect all schemes as missing when securitySchemes is empty', () => {
      const referencedSchemes = new Set(['api_key']);
      const spec: OpenApiDocument = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          securitySchemes: {},
        },
      };

      const result = detectMissingSchemes(referencedSchemes, spec);

      expect(result).toHaveLength(1);
      expect(result).toContain('api_key');
    });

    it('should log warning for each missing scheme', () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const referencedSchemes = new Set(['missing_scheme']);
      const spec: OpenApiDocument = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
      };

      detectMissingSchemes(referencedSchemes, spec);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Security scheme 'missing_scheme' referenced but not defined"),
      );
    });
  });

  describe('generateDefaultSecurityScheme', () => {
    describe('OAuth2 pattern', () => {
      it('should generate oauth2 scheme for names containing "oauth"', () => {
        const result = generateDefaultSecurityScheme('petstore_oauth');

        expect(result.type).toBe('oauth2');
        expect(result.flows).toBeDefined();
        expect(result.flows?.authorizationCode).toBeDefined();
        expect(result.flows?.authorizationCode?.authorizationUrl).toBe(
          'https://example.com/oauth/authorize',
        );
        expect(result.flows?.authorizationCode?.tokenUrl).toBe('https://example.com/oauth/token');
        expect(result.description).toContain('Auto-generated');
      });

      it('should generate oauth2 scheme for "oauth2" name', () => {
        const result = generateDefaultSecurityScheme('oauth2');

        expect(result.type).toBe('oauth2');
      });

      it('should generate oauth2 scheme for "OAuth" (case insensitive)', () => {
        const result = generateDefaultSecurityScheme('OAuth_Security');

        expect(result.type).toBe('oauth2');
      });
    });

    describe('Bearer token pattern', () => {
      it('should generate bearer scheme for names containing "bearer"', () => {
        const result = generateDefaultSecurityScheme('bearer_auth');

        expect(result.type).toBe('http');
        expect(result.scheme).toBe('bearer');
        expect(result.bearerFormat).toBe('JWT');
        expect(result.description).toContain('Auto-generated');
      });

      it('should generate bearer scheme for names containing "token"', () => {
        const result = generateDefaultSecurityScheme('access_token');

        expect(result.type).toBe('http');
        expect(result.scheme).toBe('bearer');
      });

      it('should generate bearer scheme for "BearerToken" (case insensitive)', () => {
        const result = generateDefaultSecurityScheme('BearerToken');

        expect(result.type).toBe('http');
        expect(result.scheme).toBe('bearer');
      });
    });

    describe('Basic auth pattern', () => {
      it('should generate basic scheme for names containing "basic"', () => {
        const result = generateDefaultSecurityScheme('basic_auth');

        expect(result.type).toBe('http');
        expect(result.scheme).toBe('basic');
        expect(result.description).toContain('Auto-generated');
      });

      it('should generate basic scheme for "BasicAuth" (case insensitive)', () => {
        const result = generateDefaultSecurityScheme('BasicAuth');

        expect(result.type).toBe('http');
        expect(result.scheme).toBe('basic');
      });
    });

    describe('API Key pattern (default fallback)', () => {
      it('should generate apiKey scheme for names containing "api"', () => {
        const result = generateDefaultSecurityScheme('api_key');

        expect(result.type).toBe('apiKey');
        expect(result.in).toBe('header');
        expect(result.name).toBe('X-API-Key');
        expect(result.description).toContain('Auto-generated');
      });

      it('should generate apiKey scheme for names containing "key"', () => {
        const result = generateDefaultSecurityScheme('my_key');

        expect(result.type).toBe('apiKey');
        expect(result.in).toBe('header');
      });

      it('should generate apiKey scheme as default fallback', () => {
        const result = generateDefaultSecurityScheme('unknown_scheme');

        expect(result.type).toBe('apiKey');
        expect(result.in).toBe('header');
        expect(result.name).toBe('X-API-Key');
      });

      it('should generate apiKey for random names', () => {
        const result = generateDefaultSecurityScheme('xyz123');

        expect(result.type).toBe('apiKey');
      });
    });

    describe('generated schemes are valid', () => {
      it('should generate valid apiKey SecurityScheme', () => {
        const result = generateDefaultSecurityScheme('api_key');

        assertValidSecurityScheme(result);
        expect(result.type).toBe('apiKey');
        expect(result.in).toBeDefined();
        expect(result.name).toBeDefined();
      });

      it('should generate valid http bearer SecurityScheme', () => {
        const result = generateDefaultSecurityScheme('bearer_token');

        assertValidSecurityScheme(result);
        expect(result.type).toBe('http');
        expect(result.scheme).toBe('bearer');
      });

      it('should generate valid http basic SecurityScheme', () => {
        const result = generateDefaultSecurityScheme('basic_auth');

        assertValidSecurityScheme(result);
        expect(result.type).toBe('http');
        expect(result.scheme).toBe('basic');
      });

      it('should generate valid oauth2 SecurityScheme', () => {
        const result = generateDefaultSecurityScheme('oauth_scheme');

        assertValidSecurityScheme(result);
        expect(result.type).toBe('oauth2');
        expect(result.flows).toBeDefined();
        expect(result.flows?.authorizationCode?.scopes).toBeDefined();
      });
    });

    it('should log info for each generated scheme', () => {
      const infoSpy = vi.spyOn(console, 'info');

      generateDefaultSecurityScheme('api_key');

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining("Generated 'api_key' scheme: apiKey"),
      );
    });
  });

  describe('normalizeSecuritySchemes', () => {
    it('should return unchanged spec when no security requirements exist', () => {
      const spec: OpenApiDocument = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: { '200': { description: 'OK' } },
            },
          },
        },
      };

      const result = normalizeSecuritySchemes(spec);

      expect(result).toBe(spec);
      expect(result.components?.securitySchemes).toBeUndefined();
    });

    it('should return unchanged spec when all schemes are defined', () => {
      const spec: OpenApiDocument = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
        security: [{ api_key: [] }],
        components: {
          securitySchemes: {
            api_key: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
          },
        },
      };

      const result = normalizeSecuritySchemes(spec);

      expect(result).toBe(spec);
      expect(Object.keys(result.components?.securitySchemes || {})).toHaveLength(1);
    });

    it('should generate missing scheme and add to spec', () => {
      const spec: OpenApiDocument = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
        security: [{ api_key: [] }],
      };

      const result = normalizeSecuritySchemes(spec);

      expect(result.components).toBeDefined();
      expect(result.components?.securitySchemes).toBeDefined();
      expect(result.components?.securitySchemes?.api_key).toBeDefined();
      expect((result.components?.securitySchemes?.api_key as OpenApiSecurityScheme).type).toBe(
        'apiKey',
      );
    });

    it('should generate multiple missing schemes', () => {
      const spec: OpenApiDocument = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              security: [{ bearer_token: [] }],
              responses: { '200': { description: 'OK' } },
            },
            post: {
              security: [{ oauth_auth: [] }],
              responses: { '201': { description: 'Created' } },
            },
          },
        },
      };

      const result = normalizeSecuritySchemes(spec);

      expect(result.components?.securitySchemes).toBeDefined();
      const schemes = result.components?.securitySchemes || {};
      expect(Object.keys(schemes)).toHaveLength(2);
      expect((schemes.bearer_token as OpenApiSecurityScheme).type).toBe('http');
      expect((schemes.bearer_token as OpenApiSecurityScheme).scheme).toBe('bearer');
      expect((schemes.oauth_auth as OpenApiSecurityScheme).type).toBe('oauth2');
    });

    it('should preserve existing schemes and not override them', () => {
      const existingScheme: OpenApiSecurityScheme = {
        type: 'apiKey',
        in: 'query',
        name: 'custom_key',
        description: 'Custom API key',
      };

      const spec: OpenApiDocument = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
        security: [{ api_key: [] }, { missing_scheme: [] }],
        components: {
          securitySchemes: {
            api_key: existingScheme,
          },
        },
      };

      const result = normalizeSecuritySchemes(spec);

      // Existing scheme should be preserved exactly
      expect(result.components?.securitySchemes?.api_key).toBe(existingScheme);
      expect((result.components?.securitySchemes?.api_key as OpenApiSecurityScheme).in).toBe(
        'query',
      );
      expect((result.components?.securitySchemes?.api_key as OpenApiSecurityScheme).name).toBe(
        'custom_key',
      );

      // Missing scheme should be generated
      expect(result.components?.securitySchemes?.missing_scheme).toBeDefined();
    });

    it('should create components object if it does not exist', () => {
      const spec: OpenApiDocument = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
        security: [{ api_key: [] }],
      };

      expect(spec.components).toBeUndefined();

      const result = normalizeSecuritySchemes(spec);

      expect(result.components).toBeDefined();
      expect(result.components?.securitySchemes).toBeDefined();
    });

    it('should create securitySchemes object if components exists but securitySchemes does not', () => {
      const spec: OpenApiDocument = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
        security: [{ api_key: [] }],
        components: {
          schemas: {
            User: { type: 'object' },
          },
        },
      };

      expect(spec.components?.securitySchemes).toBeUndefined();

      const result = normalizeSecuritySchemes(spec);

      expect(result.components?.securitySchemes).toBeDefined();
      expect(result.components?.schemas).toBeDefined(); // Should preserve existing schemas
    });

    it('should handle spec with empty security array', () => {
      const spec: OpenApiDocument = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
        security: [],
        paths: {},
      };

      const result = normalizeSecuritySchemes(spec);

      expect(result).toBe(spec);
    });

    it('should handle complex spec with mixed security configurations', () => {
      const spec: OpenApiDocument = {
        openapi: '3.0.3',
        info: { title: 'Test API', version: '1.0.0' },
        security: [{ global_oauth: [] }],
        paths: {
          '/public': {
            get: {
              security: [], // Explicitly public (no auth required)
              responses: { '200': { description: 'OK' } },
            },
          },
          '/users': {
            get: {
              security: [{ user_token: [] }],
              responses: { '200': { description: 'OK' } },
            },
          },
          '/admin': {
            delete: {
              security: [{ admin_basic: [] }],
              responses: { '204': { description: 'Deleted' } },
            },
          },
        },
        components: {
          securitySchemes: {
            global_oauth: {
              type: 'oauth2',
              flows: {
                authorizationCode: {
                  authorizationUrl: 'https://auth.example.com/authorize',
                  tokenUrl: 'https://auth.example.com/token',
                  scopes: { read: 'Read access' },
                },
              },
            },
          },
        },
      };

      const result = normalizeSecuritySchemes(spec);

      // Existing oauth should be preserved
      expect(
        (result.components?.securitySchemes?.global_oauth as OpenApiSecurityScheme).flows
          ?.authorizationCode?.authorizationUrl,
      ).toBe('https://auth.example.com/authorize');

      // Missing schemes should be generated
      expect(result.components?.securitySchemes?.user_token).toBeDefined();
      expect((result.components?.securitySchemes?.user_token as OpenApiSecurityScheme).type).toBe(
        'http',
      );
      expect((result.components?.securitySchemes?.user_token as OpenApiSecurityScheme).scheme).toBe(
        'bearer',
      );

      expect(result.components?.securitySchemes?.admin_basic).toBeDefined();
      expect((result.components?.securitySchemes?.admin_basic as OpenApiSecurityScheme).type).toBe(
        'http',
      );
      expect(
        (result.components?.securitySchemes?.admin_basic as OpenApiSecurityScheme).scheme,
      ).toBe('basic');
    });
  });
});

/**
 * Helper function to assert that a security scheme is valid.
 * Checks for required fields based on OpenAPI specification.
 */
function assertValidSecurityScheme(scheme: OpenApiSecurityScheme): void {
  expect(scheme).toBeDefined();
  expect(scheme.type).toBeDefined();
  expect(['apiKey', 'http', 'oauth2', 'openIdConnect', 'mutualTLS']).toContain(scheme.type);
  expect(scheme.description).toBeDefined();

  if (scheme.type === 'apiKey') {
    expect(scheme.in).toBeDefined();
    expect(['query', 'header', 'cookie']).toContain(scheme.in);
    expect(scheme.name).toBeDefined();
  }

  if (scheme.type === 'http') {
    expect(scheme.scheme).toBeDefined();
  }

  if (scheme.type === 'oauth2') {
    expect(scheme.flows).toBeDefined();
  }
}
