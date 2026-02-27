/**
 * OpenAPI Processor Tests
 *
 * Tests for the processOpenApiDocument function which processes OpenAPI documents
 * through the bundle -> upgrade -> dereference pipeline.
 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ProcessorError, type ProcessorStep, processOpenApiDocument } from '../processor.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = resolve(__dirname, 'fixtures');

describe('processOpenApiDocument', () => {
  describe('empty input handling', () => {
    it('should return minimal document for undefined input', async () => {
      const result = await processOpenApiDocument(undefined);

      expect(result).toEqual({
        openapi: '3.1.0',
        info: { title: 'OpenAPI Server', version: '1.0.0' },
        paths: {},
      });
    });

    it('should return minimal document for null input', async () => {
      const result = await processOpenApiDocument(null);

      expect(result).toEqual({
        openapi: '3.1.0',
        info: { title: 'OpenAPI Server', version: '1.0.0' },
        paths: {},
      });
    });

    it('should return minimal document for empty string', async () => {
      const result = await processOpenApiDocument('');

      expect(result).toEqual({
        openapi: '3.1.0',
        info: { title: 'OpenAPI Server', version: '1.0.0' },
        paths: {},
      });
    });

    it('should return minimal document for empty object string "{}"', async () => {
      const result = await processOpenApiDocument('{}');

      expect(result).toEqual({
        openapi: '3.1.0',
        info: { title: 'OpenAPI Server', version: '1.0.0' },
        paths: {},
      });
    });

    it('should throw ProcessorError for array literal string "[]"', async () => {
      await expect(processOpenApiDocument('[]')).rejects.toThrow(ProcessorError);

      try {
        await processOpenApiDocument('[]');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ProcessorError);
        expect((error as ProcessorError).step).toBe('validation');
        expect((error as ProcessorError).message).toContain('array literal');
      }
    });

    it('should return minimal document for empty object', async () => {
      const result = await processOpenApiDocument({});

      expect(result).toEqual({
        openapi: '3.1.0',
        info: { title: 'OpenAPI Server', version: '1.0.0' },
        paths: {},
      });
    });

    it('should return minimal document for whitespace-only string', async () => {
      const result = await processOpenApiDocument('   \n\t  ');

      expect(result).toEqual({
        openapi: '3.1.0',
        info: { title: 'OpenAPI Server', version: '1.0.0' },
        paths: {},
      });
    });
  });

  describe('object input', () => {
    it('should process a valid OpenAPI 3.0 object', async () => {
      const input = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      };

      const result = await processOpenApiDocument(input);

      // Should be upgraded to 3.1
      expect(result.openapi).toMatch(/^3\.1\./);
      expect(result.info?.title).toBe('Test API');
      expect(result.info?.version).toBe('1.0.0');
      expect(result.paths).toEqual({});
    });

    it('should upgrade Swagger 2.0 to OpenAPI 3.1', async () => {
      const input = {
        swagger: '2.0',
        info: { title: 'Swagger API', version: '2.0.0' },
        paths: {},
      };

      const result = await processOpenApiDocument(input);

      // Should be upgraded to 3.1
      expect(result.openapi).toMatch(/^3\.1\./);
      expect(result.info?.title).toBe('Swagger API');
    });

    it('should dereference internal $ref pointers', async () => {
      const input = {
        openapi: '3.0.0',
        info: { title: 'Ref API', version: '1.0.0' },
        paths: {
          '/pets': {
            get: {
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        $ref: '#/components/schemas/Pet',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Pet: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
              },
            },
          },
        },
      };

      const result = await processOpenApiDocument(input);

      // The $ref should be dereferenced - the schema should be inlined
      const responseSchema =
        result.paths?.['/pets']?.get?.responses?.['200']?.content?.['application/json']?.schema;

      expect(responseSchema).toBeDefined();
      // After dereferencing, the schema should have the properties directly
      expect(responseSchema?.type).toBe('object');
      expect(responseSchema?.properties?.id?.type).toBe('integer');
      expect(responseSchema?.properties?.name?.type).toBe('string');
    });

    it('should inject x-schema-id on component schemas after dereferencing', async () => {
      const input = {
        openapi: '3.0.0',
        info: { title: 'Schema ID API', version: '1.0.0' },
        paths: {
          '/carts': {
            get: {
              responses: {
                '200': {
                  description: 'OK',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Cart' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Cart: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                total: { type: 'number' },
              },
            },
            CartEntry: {
              type: 'object',
              properties: {
                entryNumber: { type: 'integer' },
              },
            },
          },
        },
      };

      const result = await processOpenApiDocument(input);

      // Component schemas should have x-schema-id injected
      const cartSchema = result.components?.schemas?.Cart as Record<string, unknown>;
      expect(cartSchema?.['x-schema-id']).toBe('Cart');

      const cartEntrySchema = result.components?.schemas?.CartEntry as Record<string, unknown>;
      expect(cartEntrySchema?.['x-schema-id']).toBe('CartEntry');

      // Dereferenced inline schema should also have x-schema-id (shared reference)
      const responseItems = (
        result.paths?.['/carts']?.get?.responses?.['200']?.content?.['application/json']
          ?.schema as Record<string, unknown>
      )?.items as Record<string, unknown>;
      expect(responseItems?.['x-schema-id']).toBe('Cart');
    });

    it('should not overwrite user-defined x-schema-id', async () => {
      const input = {
        openapi: '3.0.0',
        info: { title: 'Custom ID API', version: '1.0.0' },
        paths: {},
        components: {
          schemas: {
            MySchema: {
              type: 'object',
              'x-schema-id': 'CustomName',
              properties: {
                id: { type: 'string' },
              },
            },
          },
        },
      };

      const result = await processOpenApiDocument(input);

      const schema = result.components?.schemas?.MySchema as Record<string, unknown>;
      expect(schema?.['x-schema-id']).toBe('CustomName');
    });
  });

  describe('file input', () => {
    it('should process a minimal YAML file', async () => {
      const filePath = resolve(fixturesDir, 'minimal.yaml');

      const result = await processOpenApiDocument(filePath);

      expect(result.openapi).toMatch(/^3\.1\./);
      expect(result.info?.title).toBe('Minimal API');
      expect(result.info?.version).toBe('1.0.0');
    });

    it('should process Swagger 2.0 JSON file and upgrade', async () => {
      const filePath = resolve(fixturesDir, 'swagger2.json');

      const result = await processOpenApiDocument(filePath);

      // Should be upgraded from 2.0 to 3.1
      expect(result.openapi).toMatch(/^3\.1\./);
      expect(result.info?.title).toBe('Swagger 2.0 API');
      expect(result.paths?.['/pets']?.get?.operationId).toBe('listPets');
    });

    it('should process YAML file with internal $refs', async () => {
      const filePath = resolve(fixturesDir, 'with-refs.yaml');

      const result = await processOpenApiDocument(filePath);

      expect(result.openapi).toMatch(/^3\.1\./);
      expect(result.info?.title).toBe('API with References');

      // Check that Pet schema was dereferenced
      const petSchema = result.components?.schemas?.Pet as Record<string, unknown>;
      expect(petSchema).toBeDefined();
      expect(petSchema?.type).toBe('object');

      // Check x-schema-id injection
      expect(petSchema?.['x-schema-id']).toBe('Pet');

      const categorySchema = result.components?.schemas?.Category as Record<string, unknown>;
      expect(categorySchema?.['x-schema-id']).toBe('Category');

      const petSchemaTyped = petSchema as { properties?: Record<string, Record<string, unknown>> };
      expect(petSchemaTyped?.properties?.name?.type).toBe('string');

      // Check that the Category reference within Pet was dereferenced
      const categoryInPet = petSchemaTyped?.properties?.category;
      expect(categoryInPet).toBeDefined();
      expect(categoryInPet?.type).toBe('object');
    });
  });

  describe('error handling', () => {
    it('should throw ProcessorError for non-existent file', async () => {
      const filePath = resolve(fixturesDir, 'non-existent.yaml');

      await expect(processOpenApiDocument(filePath)).rejects.toThrow(ProcessorError);
    });

    it('should throw ProcessorError with step information', async () => {
      const filePath = resolve(fixturesDir, 'non-existent.yaml');

      try {
        await processOpenApiDocument(filePath);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ProcessorError);
        expect((error as ProcessorError).step).toBe('bundle');
      }
    });

    it('should throw ProcessorError with bundle step for invalid file path', async () => {
      const invalidPath = '/this/path/definitely/does/not/exist/openapi.yaml';

      try {
        await processOpenApiDocument(invalidPath);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ProcessorError);
        expect((error as ProcessorError).step).toBe('bundle');
        expect((error as ProcessorError).message).toContain('Failed to bundle');
      }
    });

    it('should include original error message in ProcessorError', async () => {
      const filePath = resolve(fixturesDir, 'non-existent.yaml');

      try {
        await processOpenApiDocument(filePath);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ProcessorError);
        // The error message should be descriptive
        expect((error as ProcessorError).message.length).toBeGreaterThan(20);
      }
    });
  });

  describe('ProcessorError', () => {
    it('should have correct name', () => {
      const error = new ProcessorError('Test error');
      expect(error.name).toBe('ProcessorError');
    });

    it('should have correct step', () => {
      const bundleError = new ProcessorError('Bundle failed', 'bundle');
      expect(bundleError.step).toBe('bundle');

      const upgradeError = new ProcessorError('Upgrade failed', 'upgrade');
      expect(upgradeError.step).toBe('upgrade');

      const derefError = new ProcessorError('Dereference failed', 'dereference');
      expect(derefError.step).toBe('dereference');
    });

    it('should default to validation step', () => {
      const error = new ProcessorError('Validation failed');
      expect(error.step).toBe('validation');
    });

    it('should accept all valid ProcessorStep values', () => {
      const steps: ProcessorStep[] = ['bundle', 'upgrade', 'dereference', 'validation'];

      for (const step of steps) {
        const error = new ProcessorError(`Error at ${step}`, step);
        expect(error.step).toBe(step);
      }
    });

    it('should be instanceof Error', () => {
      const error = new ProcessorError('Test');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ProcessorError);
    });
  });
});
