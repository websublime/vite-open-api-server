/**
 * Security Scheme Resolver Tests
 *
 * @see Task 5.4: Security Handling
 */

import type { OpenAPIV3_1 } from '@scalar/openapi-types';
import { describe, expect, it } from 'vitest';

import { resolveSecuritySchemes } from '../resolver.js';

describe('resolveSecuritySchemes', () => {
  it('should return empty map when no securitySchemes defined', () => {
    const doc: OpenAPIV3_1.Document = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    };

    const schemes = resolveSecuritySchemes(doc);
    expect(schemes.size).toBe(0);
  });

  it('should return empty map when components exists but no securitySchemes', () => {
    const doc: OpenAPIV3_1.Document = {
      openapi: '3.1.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: {},
    };

    const schemes = resolveSecuritySchemes(doc);
    expect(schemes.size).toBe(0);
  });

  describe('API Key schemes', () => {
    it('should resolve API key in header', () => {
      const doc: OpenAPIV3_1.Document = {
        openapi: '3.1.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
        components: {
          securitySchemes: {
            api_key: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key',
            },
          },
        },
      };

      const schemes = resolveSecuritySchemes(doc);
      expect(schemes.size).toBe(1);

      const scheme = schemes.get('api_key');
      expect(scheme).toEqual({
        name: 'api_key',
        type: 'apiKey',
        in: 'header',
        paramName: 'X-API-Key',
      });
    });

    it('should resolve API key in query', () => {
      const doc: OpenAPIV3_1.Document = {
        openapi: '3.1.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
        components: {
          securitySchemes: {
            api_key: {
              type: 'apiKey',
              in: 'query',
              name: 'api_key',
            },
          },
        },
      };

      const schemes = resolveSecuritySchemes(doc);
      const scheme = schemes.get('api_key');
      expect(scheme).toEqual({
        name: 'api_key',
        type: 'apiKey',
        in: 'query',
        paramName: 'api_key',
      });
    });

    it('should resolve API key in cookie', () => {
      const doc: OpenAPIV3_1.Document = {
        openapi: '3.1.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
        components: {
          securitySchemes: {
            session: {
              type: 'apiKey',
              in: 'cookie',
              name: 'session_id',
            },
          },
        },
      };

      const schemes = resolveSecuritySchemes(doc);
      const scheme = schemes.get('session');
      expect(scheme).toEqual({
        name: 'session',
        type: 'apiKey',
        in: 'cookie',
        paramName: 'session_id',
      });
    });
  });

  describe('HTTP schemes', () => {
    it('should resolve HTTP Bearer scheme', () => {
      const doc: OpenAPIV3_1.Document = {
        openapi: '3.1.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
            },
          },
        },
      };

      const schemes = resolveSecuritySchemes(doc);
      const scheme = schemes.get('bearerAuth');
      expect(scheme).toEqual({
        name: 'bearerAuth',
        type: 'http',
        in: 'header',
        paramName: 'authorization',
        scheme: 'bearer',
      });
    });

    it('should resolve HTTP Basic scheme', () => {
      const doc: OpenAPIV3_1.Document = {
        openapi: '3.1.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
        components: {
          securitySchemes: {
            basicAuth: {
              type: 'http',
              scheme: 'basic',
            },
          },
        },
      };

      const schemes = resolveSecuritySchemes(doc);
      const scheme = schemes.get('basicAuth');
      expect(scheme).toEqual({
        name: 'basicAuth',
        type: 'http',
        in: 'header',
        paramName: 'authorization',
        scheme: 'basic',
      });
    });
  });

  describe('OAuth2 schemes', () => {
    it('should resolve OAuth2 as Bearer token', () => {
      const doc: OpenAPIV3_1.Document = {
        openapi: '3.1.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
        components: {
          securitySchemes: {
            oauth2: {
              type: 'oauth2',
              flows: {
                implicit: {
                  authorizationUrl: 'https://auth.example.com',
                  scopes: { 'read:pets': 'Read pets' },
                },
              },
            },
          },
        },
      };

      const schemes = resolveSecuritySchemes(doc);
      const scheme = schemes.get('oauth2');
      expect(scheme).toEqual({
        name: 'oauth2',
        type: 'oauth2',
        in: 'header',
        paramName: 'authorization',
        scheme: 'bearer',
      });
    });
  });

  describe('multiple schemes', () => {
    it('should resolve multiple security schemes', () => {
      const doc: OpenAPIV3_1.Document = {
        openapi: '3.1.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
        components: {
          securitySchemes: {
            api_key: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key',
            },
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
            },
            oauth2: {
              type: 'oauth2',
              flows: {
                implicit: {
                  authorizationUrl: 'https://auth.example.com',
                  scopes: {},
                },
              },
            },
          },
        },
      };

      const schemes = resolveSecuritySchemes(doc);
      expect(schemes.size).toBe(3);
      expect(schemes.has('api_key')).toBe(true);
      expect(schemes.has('bearerAuth')).toBe(true);
      expect(schemes.has('oauth2')).toBe(true);
    });
  });

  describe('unsupported schemes', () => {
    it('should skip openIdConnect schemes', () => {
      const doc: OpenAPIV3_1.Document = {
        openapi: '3.1.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
        components: {
          securitySchemes: {
            oidc: {
              type: 'openIdConnect',
              openIdConnectUrl: 'https://auth.example.com/.well-known/openid-configuration',
            },
          },
        },
      };

      const schemes = resolveSecuritySchemes(doc);
      expect(schemes.size).toBe(0);
    });
  });
});
