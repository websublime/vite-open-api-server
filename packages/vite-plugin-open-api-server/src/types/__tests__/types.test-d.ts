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

import type { OpenAPIV3_1 } from 'openapi-types';
import { describe, expectTypeOf, it } from 'vitest';

import type {
  ApiKeySecurityScheme,
  EndpointRegistryEntry,
  // Handler types (code-based)
  HandlerCodeContext,
  HandlerCodeGeneratorFn,
  HandlerExports,
  HandlerFileExports,
  HandlerLoadResult,
  HandlerValue,
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
  ResolvedHandlers,
  ResolvedPluginOptions,
  ResolvedSeeds,
  SecurityContext,
  SecurityRequirement,
  // Seed types (code-based)
  SeedCodeContext,
  SeedCodeGeneratorFn,
  SeedExports,
  SeedFileExports,
  SeedLoadResult,
  SeedValue,
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

describe('Handler Types (Code-Based)', () => {
  it('HandlerCodeContext should have operation context properties', () => {
    type Context = HandlerCodeContext;

    expectTypeOf<Context['operationId']>().toBeString();
    expectTypeOf<Context['operation']>().toMatchTypeOf<OpenAPIV3_1.OperationObject>();
    expectTypeOf<Context['method']>().toBeString();
    expectTypeOf<Context['path']>().toBeString();
    expectTypeOf<Context['document']>().toMatchTypeOf<OpenAPIV3_1.Document>();
    expectTypeOf<Context['schemas']>().toMatchTypeOf<Record<string, OpenAPIV3_1.SchemaObject>>();
  });

  it('HandlerCodeGeneratorFn should return string or Promise<string>', () => {
    expectTypeOf<HandlerCodeGeneratorFn>().toBeCallableWith({} as HandlerCodeContext);
    expectTypeOf<HandlerCodeGeneratorFn>().returns.toMatchTypeOf<string | Promise<string>>();
  });

  it('HandlerValue should be string or function', () => {
    // Static handler (string code)
    const staticHandler: HandlerValue = `return store.list('Pet');`;
    expectTypeOf(staticHandler).toMatchTypeOf<HandlerValue>();

    // Dynamic handler (function that generates code)
    const dynamicHandler: HandlerValue = (_ctx: HandlerCodeContext) => {
      return `return store.get('Pet', req.params.petId);`;
    };
    expectTypeOf(dynamicHandler).toMatchTypeOf<HandlerValue>();
  });

  it('HandlerExports should be a record of operationId to HandlerValue', () => {
    const exports: HandlerExports = {
      getPetById: `return store.get('Pet', req.params.petId);`,
      listPets: (_ctx) => `return store.list('Pet');`,
    };
    expectTypeOf(exports).toMatchTypeOf<HandlerExports>();
  });

  it('HandlerFileExports should have default export of HandlerExports', () => {
    expectTypeOf<HandlerFileExports['default']>().toMatchTypeOf<HandlerExports>();
  });

  it('ResolvedHandlers should be a Map of operationId to code string', () => {
    expectTypeOf<ResolvedHandlers>().toMatchTypeOf<Map<string, string>>();
  });

  it('HandlerLoadResult should have handlers map and metadata', () => {
    expectTypeOf<HandlerLoadResult['handlers']>().toMatchTypeOf<Map<string, HandlerValue>>();
    expectTypeOf<HandlerLoadResult['loadedFiles']>().toMatchTypeOf<string[]>();
    expectTypeOf<HandlerLoadResult['warnings']>().toMatchTypeOf<string[]>();
    expectTypeOf<HandlerLoadResult['errors']>().toMatchTypeOf<string[]>();
  });
});

describe('Seed Types (Code-Based)', () => {
  it('SeedCodeContext should have schema context properties', () => {
    type Context = SeedCodeContext;

    expectTypeOf<Context['schemaName']>().toBeString();
    expectTypeOf<Context['schema']>().toMatchTypeOf<OpenAPIV3_1.SchemaObject>();
    expectTypeOf<Context['document']>().toMatchTypeOf<OpenAPIV3_1.Document>();
    expectTypeOf<Context['schemas']>().toMatchTypeOf<Record<string, OpenAPIV3_1.SchemaObject>>();
  });

  it('SeedCodeGeneratorFn should return string or Promise<string>', () => {
    expectTypeOf<SeedCodeGeneratorFn>().toBeCallableWith({} as SeedCodeContext);
    expectTypeOf<SeedCodeGeneratorFn>().returns.toMatchTypeOf<string | Promise<string>>();
  });

  it('SeedValue should be string or function', () => {
    // Static seed (string code)
    const staticSeed: SeedValue = `seed.count(10, () => ({ id: faker.string.uuid() }))`;
    expectTypeOf(staticSeed).toMatchTypeOf<SeedValue>();

    // Dynamic seed (function that generates code)
    const dynamicSeed: SeedValue = (_ctx: SeedCodeContext) => {
      return `seed.count(15, () => ({ name: faker.animal.dog() }))`;
    };
    expectTypeOf(dynamicSeed).toMatchTypeOf<SeedValue>();
  });

  it('SeedExports should be a record of schemaName to SeedValue', () => {
    const exports: SeedExports = {
      Pet: `seed.count(15, () => ({ name: faker.animal.dog() }))`,
      Order: (_ctx) => `seed.count(20, () => ({ status: 'placed' }))`,
    };
    expectTypeOf(exports).toMatchTypeOf<SeedExports>();
  });

  it('SeedFileExports should have default export of SeedExports', () => {
    expectTypeOf<SeedFileExports['default']>().toMatchTypeOf<SeedExports>();
  });

  it('ResolvedSeeds should be a Map of schemaName to code string', () => {
    expectTypeOf<ResolvedSeeds>().toMatchTypeOf<Map<string, string>>();
  });

  it('SeedLoadResult should have seeds map and metadata', () => {
    expectTypeOf<SeedLoadResult['seeds']>().toMatchTypeOf<Map<string, SeedValue>>();
    expectTypeOf<SeedLoadResult['loadedFiles']>().toMatchTypeOf<string[]>();
    expectTypeOf<SeedLoadResult['warnings']>().toMatchTypeOf<string[]>();
    expectTypeOf<SeedLoadResult['errors']>().toMatchTypeOf<string[]>();
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
  it('HandlerValue static should be a string', () => {
    const staticHandler: HandlerValue = `return store.get('Pet', req.params.petId);`;
    expectTypeOf(staticHandler).toMatchTypeOf<HandlerValue>();
  });

  it('HandlerValue dynamic should accept context and return string', () => {
    const dynamicHandler: HandlerValue = ({ operation, operationId: _operationId }) => {
      const has404 = operation.responses && '404' in operation.responses;
      return `
        const pet = store.get('Pet', req.params.petId);
        ${has404 ? "if (!pet) return res['404'];" : ''}
        return pet;
      `;
    };
    expectTypeOf(dynamicHandler).toMatchTypeOf<HandlerValue>();
  });

  it('SeedValue static should be a string', () => {
    const staticSeed: SeedValue = `
      seed.count(15, () => ({
        id: faker.number.int(),
        name: faker.animal.dog()
      }))
    `;
    expectTypeOf(staticSeed).toMatchTypeOf<SeedValue>();
  });

  it('SeedValue dynamic should accept context and return string', () => {
    const dynamicSeed: SeedValue = ({ schemas, schemaName: _schemaName }) => {
      const hasPet = 'Pet' in schemas;
      return `
        seed.count(20, (index) => ({
          id: faker.number.int(),
          petId: ${hasPet ? 'store.list("Pet")[index % 15]?.id' : 'faker.number.int()'}
        }))
      `;
    };
    expectTypeOf(dynamicSeed).toMatchTypeOf<SeedValue>();
  });

  it('HandlerExports should accept mixed static and dynamic handlers', () => {
    const handlers: HandlerExports = {
      getInventory: `
        const pets = store.list('Pet');
        return pets.reduce((acc, pet) => {
          acc[pet.status] = (acc[pet.status] || 0) + 1;
          return acc;
        }, {});
      `,
      findPetsByStatus: ({ operation }) => {
        const hasStatusParam = operation.parameters?.some(
          (p) => 'name' in p && p.name === 'status',
        );
        return hasStatusParam
          ? `return store.list('Pet').filter(p => p.status === req.query.status);`
          : `return store.list('Pet');`;
      },
      getPetById: `return store.get('Pet', req.params.petId);`,
      addPet: `return store.create('Pet', { id: faker.string.uuid(), ...req.body });`,
    };
    expectTypeOf(handlers).toMatchTypeOf<HandlerExports>();
  });

  it('SeedExports should accept mixed static and dynamic seeds', () => {
    const seeds: SeedExports = {
      Pet: `
        seed.count(15, () => ({
          id: faker.number.int({ min: 1, max: 10000 }),
          name: faker.animal.dog(),
          status: faker.helpers.arrayElement(['available', 'pending', 'sold'])
        }))
      `,
      Category: `
        seed([
          { id: 1, name: 'Dogs' },
          { id: 2, name: 'Cats' },
          { id: 3, name: 'Birds' }
        ])
      `,
      Order: ({ schemas }) => {
        const hasPet = 'Pet' in schemas;
        return `
          seed.count(20, (index) => ({
            id: faker.number.int(),
            petId: ${hasPet ? 'store.list("Pet")[index % 15]?.id' : 'faker.number.int()'},
            status: faker.helpers.arrayElement(['placed', 'approved', 'delivered'])
          }))
        `;
      },
    };
    expectTypeOf(seeds).toMatchTypeOf<SeedExports>();
  });
});
