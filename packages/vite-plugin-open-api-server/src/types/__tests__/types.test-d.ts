/**
 * Type Tests for Plugin Types
 *
 * ## What
 * This file contains type-level tests for all public plugin types using
 * Vitest's typecheck feature. These tests verify that types behave correctly
 * at compile time, catching type regressions and ensuring type inference works.
 *
 * ## How
 * Uses `expectTypeOf` from vitest to assert type relationships:
 * - `.toMatchTypeOf<T>()` - verifies a type is assignable to T
 * - `.toEqualTypeOf<T>()` - verifies types are exactly equal
 * - `.toBeNullable()` - verifies a type can be null/undefined
 * - `.toBeCallableWith()` - verifies function can be called with args
 *
 * ## Why
 * Type tests ensure the public API surface remains stable and type inference
 * works correctly. They catch breaking changes to type definitions before
 * they reach consumers.
 *
 * @module
 */

import { describe, expectTypeOf, it } from 'vitest';

import type {
  ApiKeySecurityScheme,
  EndpointRegistryEntry,
  HandlerCodeGenerator,
  // Handler types
  HandlerContext,
  HandlerFileExports,
  HandlerResponse,
  HttpSecurityScheme,
  InputPluginOptions,
  // Security types
  NormalizedSecurityScheme,
  OAuth2SecurityScheme,
  OpenApiEndpointEntry,
  // Registry types
  OpenApiEndpointRegistry,
  OpenApiSecuritySchemeEntry,
  // Plugin options
  OpenApiServerPluginOptions,
  OpenApiServerSchemaEntry,
  OpenIdConnectSecurityScheme,
  RegistryStats,
  ResolvedPluginOptions,
  SecurityContext,
  SecurityRequirement,
  SeedCodeGenerator,
  // Seed types
  SeedContext,
  SeedData,
  SeedFileExports,
} from '../index.js';

describe('Plugin Options Types', () => {
  it('OpenApiServerPluginOptions should have required openApiPath', () => {
    expectTypeOf<OpenApiServerPluginOptions>().toHaveProperty('openApiPath');
    expectTypeOf<OpenApiServerPluginOptions['openApiPath']>().toBeString();
  });

  it('OpenApiServerPluginOptions should have optional properties', () => {
    expectTypeOf<OpenApiServerPluginOptions['port']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<OpenApiServerPluginOptions['proxyPath']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<OpenApiServerPluginOptions['seedsDir']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<OpenApiServerPluginOptions['handlersDir']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<OpenApiServerPluginOptions['enabled']>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<OpenApiServerPluginOptions['startupTimeout']>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<OpenApiServerPluginOptions['verbose']>().toEqualTypeOf<boolean | undefined>();
  });

  it('InputPluginOptions should have all optional properties', () => {
    expectTypeOf<InputPluginOptions['openApiPath']>().toEqualTypeOf<string | undefined>();
  });

  it('ResolvedPluginOptions should have required defaults', () => {
    expectTypeOf<ResolvedPluginOptions['port']>().toBeNumber();
    expectTypeOf<ResolvedPluginOptions['proxyPath']>().toBeString();
    expectTypeOf<ResolvedPluginOptions['enabled']>().toBeBoolean();
    expectTypeOf<ResolvedPluginOptions['startupTimeout']>().toBeNumber();
    expectTypeOf<ResolvedPluginOptions['verbose']>().toBeBoolean();
  });
});

describe('Handler Types', () => {
  it('HandlerContext should have all request properties', () => {
    type Context = HandlerContext<{ name: string }>;

    expectTypeOf<Context['method']>().toBeString();
    expectTypeOf<Context['path']>().toBeString();
    expectTypeOf<Context['params']>().toEqualTypeOf<Record<string, string>>();
    expectTypeOf<Context['query']>().toEqualTypeOf<Record<string, string | string[]>>();
    expectTypeOf<Context['body']>().toEqualTypeOf<{ name: string }>();
    expectTypeOf<Context['headers']>().toMatchTypeOf<
      Record<string, string | string[] | undefined>
    >();
    expectTypeOf<Context['operationId']>().toBeString();
  });

  it('HandlerContext should have tools and utilities', () => {
    type Context = HandlerContext;

    expectTypeOf<Context['logger']>().toHaveProperty('info');
    expectTypeOf<Context['registry']>().toMatchTypeOf<Readonly<OpenApiEndpointRegistry>>();
    expectTypeOf<Context['security']>().toMatchTypeOf<SecurityContext>();
  });

  it('HandlerContext body should default to unknown', () => {
    type Context = HandlerContext;
    expectTypeOf<Context['body']>().toBeUnknown();
  });

  it('HandlerResponse should have status, body, and optional headers', () => {
    expectTypeOf<HandlerResponse['status']>().toBeNumber();
    expectTypeOf<HandlerResponse['body']>().toBeUnknown();
    expectTypeOf<HandlerResponse['headers']>().toEqualTypeOf<Record<string, string> | undefined>();
  });

  it('HandlerCodeGenerator should be an async function returning response or null', () => {
    expectTypeOf<HandlerCodeGenerator>().toBeCallableWith({} as HandlerContext);
    expectTypeOf<HandlerCodeGenerator>().returns.toMatchTypeOf<Promise<HandlerResponse | null>>();
  });

  it('HandlerFileExports should require default export', () => {
    expectTypeOf<HandlerFileExports['default']>().toMatchTypeOf<HandlerCodeGenerator>();
  });
});

describe('Seed Types', () => {
  it('SeedContext should have faker and registry', () => {
    type Context = SeedContext;

    expectTypeOf<Context['faker']>().toHaveProperty('person');
    expectTypeOf<Context['logger']>().toHaveProperty('info');
    expectTypeOf<Context['registry']>().toMatchTypeOf<Readonly<OpenApiEndpointRegistry>>();
    expectTypeOf<Context['schemaName']>().toBeString();
  });

  it('SeedContext should have optional properties', () => {
    type Context = SeedContext;

    expectTypeOf<Context['operationId']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<Context['count']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<Context['env']>().toEqualTypeOf<Record<string, string | undefined>>();
  });

  it('SeedData should be an array', () => {
    expectTypeOf<SeedData>().toMatchTypeOf<unknown[]>();
  });

  it('SeedCodeGenerator should be an async function returning SeedData', () => {
    expectTypeOf<SeedCodeGenerator>().toBeCallableWith({} as SeedContext);
    expectTypeOf<SeedCodeGenerator>().returns.toMatchTypeOf<Promise<SeedData>>();
  });

  it('SeedFileExports should require default export', () => {
    expectTypeOf<SeedFileExports['default']>().toMatchTypeOf<SeedCodeGenerator>();
  });
});

describe('Security Types', () => {
  it('ApiKeySecurityScheme should have correct discriminator', () => {
    expectTypeOf<ApiKeySecurityScheme['type']>().toEqualTypeOf<'apiKey'>();
    expectTypeOf<ApiKeySecurityScheme['name']>().toBeString();
    expectTypeOf<ApiKeySecurityScheme['in']>().toEqualTypeOf<'query' | 'header' | 'cookie'>();
  });

  it('HttpSecurityScheme should have correct discriminator', () => {
    expectTypeOf<HttpSecurityScheme['type']>().toEqualTypeOf<'http'>();
    expectTypeOf<HttpSecurityScheme['scheme']>().toMatchTypeOf<string>();
    expectTypeOf<HttpSecurityScheme['bearerFormat']>().toEqualTypeOf<string | undefined>();
  });

  it('OAuth2SecurityScheme should have correct discriminator', () => {
    expectTypeOf<OAuth2SecurityScheme['type']>().toEqualTypeOf<'oauth2'>();
    expectTypeOf<OAuth2SecurityScheme['flows']>().toMatchTypeOf<Record<string, unknown>>();
  });

  it('OpenIdConnectSecurityScheme should have correct discriminator', () => {
    expectTypeOf<OpenIdConnectSecurityScheme['type']>().toEqualTypeOf<'openIdConnect'>();
    expectTypeOf<OpenIdConnectSecurityScheme['openIdConnectUrl']>().toBeString();
  });

  it('NormalizedSecurityScheme should be a union of all security schemes', () => {
    expectTypeOf<ApiKeySecurityScheme>().toMatchTypeOf<NormalizedSecurityScheme>();
    expectTypeOf<HttpSecurityScheme>().toMatchTypeOf<NormalizedSecurityScheme>();
    expectTypeOf<OAuth2SecurityScheme>().toMatchTypeOf<NormalizedSecurityScheme>();
    expectTypeOf<OpenIdConnectSecurityScheme>().toMatchTypeOf<NormalizedSecurityScheme>();
  });

  it('NormalizedSecurityScheme should narrow based on type discriminator', () => {
    const narrowByType = (scheme: NormalizedSecurityScheme): string => {
      switch (scheme.type) {
        case 'apiKey':
          // TypeScript should narrow to ApiKeySecurityScheme
          return scheme.name;
        case 'http':
          // TypeScript should narrow to HttpSecurityScheme
          return scheme.scheme;
        case 'oauth2':
          // TypeScript should narrow to OAuth2SecurityScheme
          return Object.keys(scheme.flows).join(',');
        case 'openIdConnect':
          // TypeScript should narrow to OpenIdConnectSecurityScheme
          return scheme.openIdConnectUrl;
      }
    };

    expectTypeOf(narrowByType).toBeFunction();
  });

  it('SecurityRequirement should have schemeName and scopes', () => {
    expectTypeOf<SecurityRequirement['schemeName']>().toBeString();
    expectTypeOf<SecurityRequirement['scopes']>().toEqualTypeOf<string[]>();
  });

  it('SecurityContext should have all auth state properties', () => {
    expectTypeOf<SecurityContext['requirements']>().toEqualTypeOf<SecurityRequirement[]>();
    expectTypeOf<SecurityContext['scheme']>().toEqualTypeOf<NormalizedSecurityScheme | null>();
    expectTypeOf<SecurityContext['credentials']>().toEqualTypeOf<string | null>();
    expectTypeOf<SecurityContext['scopes']>().toEqualTypeOf<string[]>();
  });
});

describe('Registry Types', () => {
  it('OpenApiEndpointRegistry should have Map-based collections', () => {
    expectTypeOf<OpenApiEndpointRegistry['endpoints']>().toMatchTypeOf<
      Map<string, OpenApiEndpointEntry>
    >();
    expectTypeOf<OpenApiEndpointRegistry['schemas']>().toMatchTypeOf<
      Map<string, OpenApiServerSchemaEntry>
    >();
    expectTypeOf<OpenApiEndpointRegistry['securitySchemes']>().toMatchTypeOf<
      Map<string, OpenApiSecuritySchemeEntry>
    >();
  });

  it('OpenApiEndpointEntry should have all operation properties', () => {
    expectTypeOf<OpenApiEndpointEntry['method']>().toBeString();
    expectTypeOf<OpenApiEndpointEntry['path']>().toBeString();
    expectTypeOf<OpenApiEndpointEntry['operationId']>().toBeString();
    expectTypeOf<OpenApiEndpointEntry['summary']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<OpenApiEndpointEntry['description']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<OpenApiEndpointEntry['tags']>().toEqualTypeOf<string[] | undefined>();
  });

  it('OpenApiEndpointEntry should have OpenAPI-typed properties', () => {
    expectTypeOf<OpenApiEndpointEntry['parameters']>().toBeArray();
    expectTypeOf<OpenApiEndpointEntry['responses']>().toMatchTypeOf<Record<string, unknown>>();
  });

  it('OpenApiServerSchemaEntry should have name and schema', () => {
    expectTypeOf<OpenApiServerSchemaEntry['name']>().toBeString();
    expectTypeOf<OpenApiServerSchemaEntry['schema']>().toMatchTypeOf<object>();
  });

  it('OpenApiSecuritySchemeEntry should have type discriminator', () => {
    expectTypeOf<OpenApiSecuritySchemeEntry['name']>().toBeString();
    expectTypeOf<OpenApiSecuritySchemeEntry['type']>().toEqualTypeOf<
      'apiKey' | 'http' | 'oauth2' | 'openIdConnect'
    >();
  });

  it('EndpointRegistryEntry should extend OpenApiEndpointEntry with status flags', () => {
    expectTypeOf<EndpointRegistryEntry>().toMatchTypeOf<OpenApiEndpointEntry>();
    expectTypeOf<EndpointRegistryEntry['hasHandler']>().toBeBoolean();
    expectTypeOf<EndpointRegistryEntry['hasSeed']>().toBeBoolean();
  });

  it('RegistryStats should have all count properties', () => {
    expectTypeOf<RegistryStats['total']>().toBeNumber();
    expectTypeOf<RegistryStats['withHandlers']>().toBeNumber();
    expectTypeOf<RegistryStats['withSeeds']>().toBeNumber();
    expectTypeOf<RegistryStats['schemaCount']>().toBeNumber();
    expectTypeOf<RegistryStats['securitySchemeCount']>().toBeNumber();
  });
});

describe('Type Inference', () => {
  it('HandlerContext generic should correctly type body', () => {
    interface PetBody {
      name: string;
      status: 'available' | 'pending' | 'sold';
    }

    type PetHandlerContext = HandlerContext<PetBody>;

    expectTypeOf<PetHandlerContext['body']>().toEqualTypeOf<PetBody>();
    expectTypeOf<PetHandlerContext['body']['name']>().toBeString();
    expectTypeOf<PetHandlerContext['body']['status']>().toEqualTypeOf<
      'available' | 'pending' | 'sold'
    >();
  });

  it('HandlerCodeGenerator generic should correctly type context body', () => {
    interface CreatePetBody {
      name: string;
      category: { id: number; name: string };
    }

    type CreatePetHandler = HandlerCodeGenerator<CreatePetBody>;

    // The handler should accept a context with typed body
    const handler: CreatePetHandler = async (context) => {
      // context.body should be typed as CreatePetBody
      const name: string = context.body.name;
      const categoryId: number = context.body.category.id;
      return { status: 200, body: { name, categoryId } };
    };

    expectTypeOf(handler).toMatchTypeOf<CreatePetHandler>();
  });
});
