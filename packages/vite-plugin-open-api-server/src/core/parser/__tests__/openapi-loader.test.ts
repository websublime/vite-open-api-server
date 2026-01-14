/**
 * Unit tests for OpenAPI Loader Module
 *
 * Tests the loadOpenApiSpec function and related utilities for:
 * - Valid YAML spec parsing
 * - Valid JSON spec parsing
 * - Invalid YAML syntax error handling
 * - Invalid OpenAPI schema error handling
 * - File not found error handling
 * - $ref dereferencing
 * - Caching mechanism
 */

import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  clearCache,
  loadOpenApiSpec,
  OpenApiFileNotFoundError,
  OpenApiParseError,
  OpenApiValidationError,
} from '../index';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

describe('OpenAPI Loader', () => {
  beforeEach(() => {
    // Clear cache before each test to ensure isolation
    clearCache();
  });

  afterEach(() => {
    clearCache();
  });

  describe('loadOpenApiSpec', () => {
    describe('valid specs', () => {
      it('should parse a valid YAML spec successfully', async () => {
        const specPath = path.join(FIXTURES_DIR, 'valid-minimal.yaml');
        const spec = await loadOpenApiSpec(specPath);

        expect(spec).toBeDefined();
        expect(spec.openapi).toBe('3.0.3');
        expect(spec.info).toBeDefined();
        expect(spec.info.title).toBe('Minimal Test API');
        expect(spec.info.version).toBe('1.0.0');
        expect(spec.paths).toBeDefined();
      });

      it('should parse a valid JSON spec successfully', async () => {
        const specPath = path.join(FIXTURES_DIR, 'valid-minimal.json');
        const spec = await loadOpenApiSpec(specPath);

        expect(spec).toBeDefined();
        expect(spec.openapi).toBe('3.0.3');
        expect(spec.info).toBeDefined();
        expect(spec.info.title).toBe('Minimal Test API');
        expect(spec.info.version).toBe('1.0.0');
        expect(spec.paths).toBeDefined();
      });

      it('should correctly dereference $ref references', async () => {
        const specPath = path.join(FIXTURES_DIR, 'valid-with-refs.yaml');
        const spec = await loadOpenApiSpec(specPath);

        expect(spec).toBeDefined();
        expect(spec.openapi).toBe('3.0.3');
        expect(spec.info.title).toBe('Valid API with Refs');

        // Check that paths exist
        expect(spec.paths).toBeDefined();
        expect(spec.paths?.['/users']).toBeDefined();
        expect(spec.paths?.['/users/{userId}']).toBeDefined();

        // Check that components are dereferenced
        expect(spec.components?.schemas?.User).toBeDefined();
        expect(spec.components?.schemas?.Address).toBeDefined();
        expect(spec.components?.schemas?.Post).toBeDefined();
        expect(spec.components?.schemas?.Error).toBeDefined();

        // Verify User schema structure is dereferenced
        const userSchema = spec.components?.schemas?.User;
        expect(userSchema?.type).toBe('object');
        expect(userSchema?.properties?.id).toBeDefined();
        expect(userSchema?.properties?.name).toBeDefined();
        expect(userSchema?.properties?.email).toBeDefined();

        // Check that the address property in User has been dereferenced
        // (should have the Address schema inline, not a $ref)
        const addressProperty = userSchema?.properties?.address;
        expect(addressProperty).toBeDefined();
        // After dereferencing, it should have the Address schema properties
        expect(addressProperty?.type).toBe('object');
        expect(addressProperty?.properties?.street).toBeDefined();
        expect(addressProperty?.properties?.city).toBeDefined();

        // Verify responses are dereferenced
        expect(spec.components?.responses?.BadRequest).toBeDefined();
        expect(spec.components?.responses?.NotFound).toBeDefined();

        // Check that the POST /users response references are resolved
        const postResponse = spec.paths?.['/users']?.post?.responses?.['201'];
        expect(postResponse).toBeDefined();
        expect(postResponse?.description).toBe('User created');
      });

      it('should parse a larger spec with multiple endpoints', async () => {
        // Use the valid-with-refs spec which has multiple endpoints
        const specPath = path.join(FIXTURES_DIR, 'valid-with-refs.yaml');
        const spec = await loadOpenApiSpec(specPath);

        expect(spec).toBeDefined();
        expect(spec.openapi).toMatch(/^3\./);
        expect(spec.info.title).toBe('Valid API with Refs');
        expect(spec.paths).toBeDefined();

        // Check for known endpoints from the fixture
        expect(spec.paths?.['/users']).toBeDefined();
        expect(spec.paths?.['/users/{userId}']).toBeDefined();
        expect(spec.paths?.['/users/{userId}/posts']).toBeDefined();

        // Check that components exist
        expect(spec.components?.schemas?.User).toBeDefined();
        expect(spec.components?.schemas?.Post).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should throw OpenApiFileNotFoundError for non-existent file', async () => {
        const specPath = path.join(FIXTURES_DIR, 'non-existent-spec.yaml');

        await expect(loadOpenApiSpec(specPath)).rejects.toThrow(OpenApiFileNotFoundError);

        try {
          await loadOpenApiSpec(specPath);
        } catch (error) {
          expect(error).toBeInstanceOf(OpenApiFileNotFoundError);
          const fileError = error as OpenApiFileNotFoundError;
          expect(fileError.originalPath).toBe(specPath);
          expect(fileError.absolutePath).toBe(specPath);
          expect(fileError.workingDirectory).toBe(process.cwd());
          expect(fileError.message).toContain('OpenAPI spec not found');
        }
      });

      it('should throw OpenApiParseError for invalid YAML syntax', async () => {
        const specPath = path.join(FIXTURES_DIR, 'invalid-yaml.yaml');

        await expect(loadOpenApiSpec(specPath)).rejects.toThrow(OpenApiParseError);

        try {
          await loadOpenApiSpec(specPath);
        } catch (error) {
          expect(error).toBeInstanceOf(OpenApiParseError);
          const parseError = error as OpenApiParseError;
          expect(parseError.filePath).toContain('invalid-yaml.yaml');
          expect(parseError.message).toContain('Failed to parse file');
        }
      });

      it('should throw OpenApiValidationError for invalid OpenAPI schema', async () => {
        const specPath = path.join(FIXTURES_DIR, 'invalid-schema.yaml');

        await expect(loadOpenApiSpec(specPath)).rejects.toThrow(OpenApiValidationError);

        try {
          await loadOpenApiSpec(specPath);
        } catch (error) {
          expect(error).toBeInstanceOf(OpenApiValidationError);
          const validationError = error as OpenApiValidationError;
          expect(validationError.filePath).toContain('invalid-schema.yaml');
          expect(validationError.message).toContain('Invalid OpenAPI specification');
          expect(validationError.validationErrors).toBeDefined();
          expect(validationError.validationErrors.length).toBeGreaterThan(0);
        }
      });
    });

    describe('caching', () => {
      it('should return cached spec on second call', async () => {
        const specPath = path.join(FIXTURES_DIR, 'valid-minimal.yaml');

        // First call - should parse
        const spec1 = await loadOpenApiSpec(specPath);

        // Second call - should return cached version
        const spec2 = await loadOpenApiSpec(specPath);

        // Both should be the same object reference (cached)
        expect(spec1).toBe(spec2);
      });

      it('should clear cache when clearCache is called', async () => {
        const specPath = path.join(FIXTURES_DIR, 'valid-minimal.yaml');

        // First call - should parse
        const spec1 = await loadOpenApiSpec(specPath);

        // Clear cache
        clearCache();

        // Third call - should parse again (new object)
        const spec2 = await loadOpenApiSpec(specPath);

        // Should be equal in content but different object references
        expect(spec1).not.toBe(spec2);
        expect(spec1.info.title).toBe(spec2.info.title);
      });

      it('should cache specs by absolute path', async () => {
        const yamlSpec = path.join(FIXTURES_DIR, 'valid-minimal.yaml');
        const jsonSpec = path.join(FIXTURES_DIR, 'valid-minimal.json');

        // Load both specs
        const yaml = await loadOpenApiSpec(yamlSpec);
        const json = await loadOpenApiSpec(jsonSpec);

        // They should be different objects (different files)
        expect(yaml).not.toBe(json);

        // Loading the same file again should return the same cached object
        const yaml2 = await loadOpenApiSpec(yamlSpec);
        expect(yaml).toBe(yaml2);
      });
    });

    describe('path resolution', () => {
      it('should resolve relative paths correctly', async () => {
        // Test with a relative path from the test file location
        const relativePath = path.relative(
          process.cwd(),
          path.join(FIXTURES_DIR, 'valid-minimal.yaml'),
        );
        const spec = await loadOpenApiSpec(relativePath);

        expect(spec).toBeDefined();
        expect(spec.info.title).toBe('Minimal Test API');
      });

      it('should handle absolute paths correctly', async () => {
        const absolutePath = path.resolve(FIXTURES_DIR, 'valid-minimal.yaml');
        const spec = await loadOpenApiSpec(absolutePath);

        expect(spec).toBeDefined();
        expect(spec.info.title).toBe('Minimal Test API');
      });

      it('should resolve paths relative to cwd', async () => {
        // Test loading from a path that's relative to the fixtures directory
        // Use path.relative to get a relative path from cwd to the fixture
        const absoluteFixturePath = path.join(FIXTURES_DIR, 'valid-minimal.json');
        const relativePath = path.relative(process.cwd(), absoluteFixturePath);
        const spec = await loadOpenApiSpec(relativePath);

        expect(spec).toBeDefined();
        expect(spec.info.title).toBe('Minimal Test API');
      });
    });
  });
});
