/**
 * OpenAPI Processor Tests
 *
 * Tests for the processOpenApiDocument function which processes OpenAPI documents
 * through the bundle -> upgrade -> dereference pipeline.
 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ProcessorError, processOpenApiDocument } from '../processor.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = resolve(__dirname, 'fixtures');

describe('processOpenApiDocument', () => {
  describe('empty input handling', () => {
    it('should return minimal document for undefined input', async () => {
      const result = await processOpenApiDocument(undefined as unknown as string);

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

    it('should return minimal document for empty object', async () => {
      const result = await processOpenApiDocument({});

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
      const petSchema = result.components?.schemas?.Pet;
      expect(petSchema).toBeDefined();
      expect(petSchema?.type).toBe('object');
      expect(petSchema?.properties?.name?.type).toBe('string');

      // Check that the Category reference within Pet was dereferenced
      const categoryInPet = petSchema?.properties?.category;
      expect(categoryInPet).toBeDefined();
      expect(categoryInPet?.type).toBe('object');
      expect(categoryInPet?.properties?.name?.type).toBe('string');
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
  });
});
