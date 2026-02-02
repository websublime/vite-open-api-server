/**
 * Data Generator Tests
 *
 * Tests for the generateFromSchema and generateFromFieldName functions
 * which provide fake data generation from OpenAPI schemas.
 */

import { faker } from '@faker-js/faker';
import type { OpenAPIV3_1 } from '@scalar/openapi-types';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  FIELD_NAME_MAPPING,
  generateFromFieldName,
  generateFromSchema,
  TYPE_FORMAT_MAPPING,
} from '../index.js';

describe('generateFromSchema', () => {
  beforeEach(() => {
    // Reset faker seed for reproducibility in some tests
    faker.seed(12345);
  });

  describe('basic types', () => {
    it('should generate a string for type "string"', () => {
      const schema: OpenAPIV3_1.SchemaObject = { type: 'string' };
      const result = generateFromSchema(schema, faker);

      expect(typeof result).toBe('string');
      expect((result as string).length).toBeGreaterThan(0);
    });

    it('should generate an integer for type "integer"', () => {
      const schema: OpenAPIV3_1.SchemaObject = { type: 'integer' };
      const result = generateFromSchema(schema, faker);

      expect(typeof result).toBe('number');
      expect(Number.isInteger(result)).toBe(true);
    });

    it('should generate a number for type "number"', () => {
      const schema: OpenAPIV3_1.SchemaObject = { type: 'number' };
      const result = generateFromSchema(schema, faker);

      expect(typeof result).toBe('number');
    });

    it('should generate a boolean for type "boolean"', () => {
      const schema: OpenAPIV3_1.SchemaObject = { type: 'boolean' };
      const result = generateFromSchema(schema, faker);

      expect(typeof result).toBe('boolean');
    });

    it('should generate null for type "null"', () => {
      const schema: OpenAPIV3_1.SchemaObject = { type: 'null' };
      const result = generateFromSchema(schema, faker);

      expect(result).toBeNull();
    });

    it('should generate an array for type "array"', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'array',
        items: { type: 'string' },
      };
      const result = generateFromSchema(schema, faker);

      expect(Array.isArray(result)).toBe(true);
      expect((result as unknown[]).length).toBeGreaterThan(0);
      for (const item of result as unknown[]) {
        expect(typeof item).toBe('string');
      }
    });

    it('should generate an object for type "object"', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
        },
        required: ['name'],
      };
      const result = generateFromSchema(schema, faker);

      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
      // Required field should always be present
      expect((result as Record<string, unknown>).name).toBeDefined();
      expect(typeof (result as Record<string, unknown>).name).toBe('string');
    });
  });

  describe('string formats', () => {
    it('should generate email for format "email"', () => {
      const schema: OpenAPIV3_1.SchemaObject = { type: 'string', format: 'email' };
      const result = generateFromSchema(schema, faker) as string;

      expect(result).toMatch(/@/);
    });

    it('should generate UUID for format "uuid"', () => {
      const schema: OpenAPIV3_1.SchemaObject = { type: 'string', format: 'uuid' };
      const result = generateFromSchema(schema, faker) as string;

      expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should generate date for format "date"', () => {
      const schema: OpenAPIV3_1.SchemaObject = { type: 'string', format: 'date' };
      const result = generateFromSchema(schema, faker) as string;

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should generate date-time for format "date-time"', () => {
      const schema: OpenAPIV3_1.SchemaObject = { type: 'string', format: 'date-time' };
      const result = generateFromSchema(schema, faker) as string;

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should generate URL for format "uri"', () => {
      const schema: OpenAPIV3_1.SchemaObject = { type: 'string', format: 'uri' };
      const result = generateFromSchema(schema, faker) as string;

      expect(result).toMatch(/^https?:\/\//);
    });

    it('should generate IPv4 for format "ipv4"', () => {
      const schema: OpenAPIV3_1.SchemaObject = { type: 'string', format: 'ipv4' };
      const result = generateFromSchema(schema, faker) as string;

      expect(result).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
    });

    it('should generate hostname for format "hostname"', () => {
      const schema: OpenAPIV3_1.SchemaObject = { type: 'string', format: 'hostname' };
      const result = generateFromSchema(schema, faker) as string;

      expect(result.length).toBeGreaterThan(0);
      expect(result).toMatch(/\./);
    });
  });

  describe('string constraints', () => {
    it('should respect minLength constraint', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'string',
        minLength: 20,
      };
      const result = generateFromSchema(schema, faker) as string;

      expect(result.length).toBeGreaterThanOrEqual(20);
    });

    it('should respect maxLength constraint', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'string',
        maxLength: 10,
      };
      const result = generateFromSchema(schema, faker) as string;

      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe('number constraints', () => {
    it('should respect minimum constraint', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'integer',
        minimum: 100,
      };
      const result = generateFromSchema(schema, faker) as number;

      expect(result).toBeGreaterThanOrEqual(100);
    });

    it('should respect maximum constraint', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'integer',
        maximum: 10,
      };
      const result = generateFromSchema(schema, faker) as number;

      expect(result).toBeLessThanOrEqual(10);
    });

    it('should respect exclusiveMinimum constraint', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'integer',
        exclusiveMinimum: 10,
      };
      const result = generateFromSchema(schema, faker) as number;

      expect(result).toBeGreaterThan(10);
    });

    it('should respect exclusiveMaximum constraint', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'integer',
        exclusiveMaximum: 100,
      };
      const result = generateFromSchema(schema, faker) as number;

      expect(result).toBeLessThan(100);
    });

    it('should respect multipleOf constraint', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'integer',
        minimum: 0,
        maximum: 100,
        multipleOf: 5,
      };
      const result = generateFromSchema(schema, faker) as number;

      expect(result % 5).toBe(0);
    });
  });

  describe('enum values', () => {
    it('should pick a value from enum', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'string',
        enum: ['active', 'inactive', 'pending'],
      };
      const result = generateFromSchema(schema, faker);

      expect(['active', 'inactive', 'pending']).toContain(result);
    });

    it('should work with numeric enums', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'integer',
        enum: [1, 2, 3, 5, 8],
      };
      const result = generateFromSchema(schema, faker);

      expect([1, 2, 3, 5, 8]).toContain(result);
    });
  });

  describe('const value', () => {
    it('should return const value', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'string',
        const: 'fixed-value',
      };
      const result = generateFromSchema(schema, faker);

      expect(result).toBe('fixed-value');
    });
  });

  describe('array constraints', () => {
    it('should respect minItems constraint', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'array',
        items: { type: 'string' },
        minItems: 5,
      };
      const result = generateFromSchema(schema, faker) as unknown[];

      expect(result.length).toBeGreaterThanOrEqual(5);
    });

    it('should respect maxItems constraint', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'array',
        items: { type: 'string' },
        maxItems: 2,
      };
      const result = generateFromSchema(schema, faker) as unknown[];

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array when no items schema', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'array',
      };
      const result = generateFromSchema(schema, faker) as unknown[];

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle uniqueItems constraint', () => {
      faker.seed(42); // Ensure reproducibility
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'array',
        items: { type: 'string', enum: ['a', 'b', 'c'] },
        minItems: 3,
        uniqueItems: true,
      };
      const result = generateFromSchema(schema, faker) as unknown[];

      const uniqueItems = new Set(result.map((i) => JSON.stringify(i)));
      expect(uniqueItems.size).toBe(result.length);
    });
  });

  describe('object constraints', () => {
    it('should generate required properties', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          optional: { type: 'string' },
        },
        required: ['id', 'name'],
      };
      const result = generateFromSchema(schema, faker) as Record<string, unknown>;

      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
    });

    it('should handle additionalProperties as boolean', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'object',
        properties: {
          id: { type: 'integer' },
        },
        required: ['id'],
        additionalProperties: true,
      };
      const result = generateFromSchema(schema, faker) as Record<string, unknown>;

      expect(result.id).toBeDefined();
      // May have additional properties
    });

    it('should handle additionalProperties with schema', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'object',
        properties: {
          id: { type: 'integer' },
        },
        required: ['id'],
        additionalProperties: { type: 'string' },
      };
      const result = generateFromSchema(schema, faker) as Record<string, unknown>;

      expect(result.id).toBeDefined();
      // Additional properties should be strings
      for (const [key, value] of Object.entries(result)) {
        if (key !== 'id') {
          expect(typeof value).toBe('string');
        }
      }
    });
  });

  describe('composite schemas', () => {
    it('should handle oneOf by picking one schema', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        oneOf: [{ type: 'string' }, { type: 'integer' }],
      };
      const result = generateFromSchema(schema, faker);

      expect(typeof result === 'string' || typeof result === 'number').toBe(true);
    });

    it('should handle anyOf by picking one schema', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        anyOf: [{ type: 'boolean' }, { type: 'integer' }],
      };
      const result = generateFromSchema(schema, faker);

      expect(typeof result === 'boolean' || typeof result === 'number').toBe(true);
    });

    it('should handle allOf by merging schemas', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        allOf: [
          {
            type: 'object',
            properties: { id: { type: 'integer' } },
            required: ['id'],
          },
          {
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name'],
          },
        ],
      };
      const result = generateFromSchema(schema, faker) as Record<string, unknown>;

      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
    });
  });

  describe('nested structures', () => {
    it('should handle deeply nested objects', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              profile: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                },
                required: ['name'],
              },
            },
            required: ['profile'],
          },
        },
        required: ['user'],
      };
      const result = generateFromSchema(schema, faker) as Record<string, unknown>;

      expect(result.user).toBeDefined();
      expect((result.user as Record<string, unknown>).profile).toBeDefined();
      expect(
        ((result.user as Record<string, unknown>).profile as Record<string, unknown>).name,
      ).toBeDefined();
    });

    it('should handle array of objects', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
          },
          required: ['id', 'name'],
        },
        minItems: 2,
      };
      const result = generateFromSchema(schema, faker) as Array<Record<string, unknown>>;

      expect(result.length).toBeGreaterThanOrEqual(2);
      for (const item of result) {
        expect(item.id).toBeDefined();
        expect(item.name).toBeDefined();
      }
    });
  });

  describe('field name detection', () => {
    it('should use field name for email property', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'object',
        properties: {
          email: { type: 'string' },
        },
        required: ['email'],
      };
      const result = generateFromSchema(schema, faker) as Record<string, unknown>;

      expect(result.email).toBeDefined();
      expect(result.email as string).toMatch(/@/);
    });

    it('should use field name for price property', () => {
      const schema: OpenAPIV3_1.SchemaObject = {
        type: 'object',
        properties: {
          price: { type: 'number' },
        },
        required: ['price'],
      };
      const result = generateFromSchema(schema, faker) as Record<string, unknown>;

      expect(result.price).toBeDefined();
      expect(typeof result.price).toBe('number');
    });
  });
});

describe('generateFromFieldName', () => {
  beforeEach(() => {
    faker.seed(12345);
  });

  describe('exact matches', () => {
    it('should generate email for "email" field', () => {
      const result = generateFromFieldName('email', faker);

      expect(result).toBeDefined();
      expect(result as string).toMatch(/@/);
    });

    it('should generate full name for "name" field', () => {
      const result = generateFromFieldName('name', faker);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect((result as string).length).toBeGreaterThan(0);
    });

    it('should generate phone for "phone" field', () => {
      const result = generateFromFieldName('phone', faker);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should generate URL for "url" field', () => {
      const result = generateFromFieldName('url', faker);

      expect(result).toBeDefined();
      expect(result as string).toMatch(/^https?:\/\//);
    });

    it('should generate datetime for "createdAt" field', () => {
      const result = generateFromFieldName('createdAt', faker);

      expect(result).toBeDefined();
      expect(result as string).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('case insensitivity', () => {
    it('should match "EMAIL" case-insensitively', () => {
      const result = generateFromFieldName('EMAIL', faker);

      expect(result).toBeDefined();
      expect(result as string).toMatch(/@/);
    });

    it('should match "FirstName" case-insensitively', () => {
      const result = generateFromFieldName('FirstName', faker);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('underscore and hyphen handling', () => {
    it('should match "first_name" with underscores', () => {
      const result = generateFromFieldName('first_name', faker);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should match "created-at" with hyphens', () => {
      const result = generateFromFieldName('created-at', faker);

      expect(result).toBeDefined();
      expect(result as string).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('suffix matching', () => {
    it('should match fields ending with "email"', () => {
      const result = generateFromFieldName('userEmail', faker);

      expect(result).toBeDefined();
      expect(result as string).toMatch(/@/);
    });

    it('should match fields ending with "url"', () => {
      const result = generateFromFieldName('profileUrl', faker);

      expect(result).toBeDefined();
      expect(result as string).toMatch(/^https?:\/\//);
    });

    it('should match fields ending with "id" (but not just "id")', () => {
      const result = generateFromFieldName('userId', faker);

      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
    });

    it('should match "id" field differently', () => {
      const result = generateFromFieldName('id', faker);

      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
    });

    it('should match fields ending with "price"', () => {
      const result = generateFromFieldName('totalPrice', faker);

      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
    });
  });

  describe('no match', () => {
    it('should return undefined for unknown field names', () => {
      const result = generateFromFieldName('xyzabc123', faker);

      expect(result).toBeUndefined();
    });
  });
});

describe('FIELD_NAME_MAPPING', () => {
  it('should have mappings for common personal fields', () => {
    expect(FIELD_NAME_MAPPING.email).toBeDefined();
    expect(FIELD_NAME_MAPPING.firstname).toBeDefined();
    expect(FIELD_NAME_MAPPING.lastname).toBeDefined();
    expect(FIELD_NAME_MAPPING.phone).toBeDefined();
    expect(FIELD_NAME_MAPPING.username).toBeDefined();
  });

  it('should have mappings for location fields', () => {
    expect(FIELD_NAME_MAPPING.address).toBeDefined();
    expect(FIELD_NAME_MAPPING.city).toBeDefined();
    expect(FIELD_NAME_MAPPING.country).toBeDefined();
    expect(FIELD_NAME_MAPPING.zipcode).toBeDefined();
  });

  it('should have mappings for date fields', () => {
    expect(FIELD_NAME_MAPPING.createdat).toBeDefined();
    expect(FIELD_NAME_MAPPING.updatedat).toBeDefined();
  });

  it('should have mappings for commerce fields', () => {
    expect(FIELD_NAME_MAPPING.price).toBeDefined();
    expect(FIELD_NAME_MAPPING.quantity).toBeDefined();
  });

  it('should return functions', () => {
    for (const [_key, value] of Object.entries(FIELD_NAME_MAPPING)) {
      expect(typeof value).toBe('function');
    }
  });
});

describe('TYPE_FORMAT_MAPPING', () => {
  it('should have mappings for string formats', () => {
    expect(TYPE_FORMAT_MAPPING['string:email']).toBeDefined();
    expect(TYPE_FORMAT_MAPPING['string:uuid']).toBeDefined();
    expect(TYPE_FORMAT_MAPPING['string:date']).toBeDefined();
    expect(TYPE_FORMAT_MAPPING['string:date-time']).toBeDefined();
    expect(TYPE_FORMAT_MAPPING['string:uri']).toBeDefined();
    expect(TYPE_FORMAT_MAPPING['string:ipv4']).toBeDefined();
  });

  it('should have mappings for basic types', () => {
    expect(TYPE_FORMAT_MAPPING.string).toBeDefined();
    expect(TYPE_FORMAT_MAPPING.integer).toBeDefined();
    expect(TYPE_FORMAT_MAPPING.number).toBeDefined();
    expect(TYPE_FORMAT_MAPPING.boolean).toBeDefined();
  });

  it('should have mappings for number formats', () => {
    expect(TYPE_FORMAT_MAPPING['integer:int32']).toBeDefined();
    expect(TYPE_FORMAT_MAPPING['integer:int64']).toBeDefined();
    expect(TYPE_FORMAT_MAPPING['number:float']).toBeDefined();
    expect(TYPE_FORMAT_MAPPING['number:double']).toBeDefined();
  });

  it('should return functions', () => {
    for (const [_key, value] of Object.entries(TYPE_FORMAT_MAPPING)) {
      expect(typeof value).toBe('function');
    }
  });
});
