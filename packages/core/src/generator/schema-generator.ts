/**
 * Schema Generator
 *
 * What: Generates fake data from OpenAPI schema definitions
 * How: Matches types, formats, and field names to Faker.js generators
 * Why: Provides intelligent mock data generation for API responses
 *
 * @module generator/schema-generator
 */

import type { Faker } from '@faker-js/faker';
import type { OpenAPIV3_1 } from '@scalar/openapi-types';
import { FIELD_NAME_MAPPING, TYPE_FORMAT_MAPPING } from './field-mapping.js';

/**
 * Generate fake data from an OpenAPI schema.
 *
 * The generation follows this priority:
 * 1. Enum values - if schema has enum, pick a random value
 * 2. Field name detection - smart generation based on property name
 * 3. Type + format mapping - use OpenAPI type and format
 * 4. Fallback - generate based on type only
 *
 * @param schema - OpenAPI schema object defining the data structure
 * @param faker - Faker instance for generating fake data
 * @param propertyName - Optional property name for smart field detection
 * @returns Generated fake data matching the schema
 */
export function generateFromSchema(
  schema: OpenAPIV3_1.SchemaObject,
  faker: Faker,
  propertyName?: string,
): unknown {
  // Defensive check for invalid schema input
  if (!schema || typeof schema !== 'object') {
    return undefined;
  }

  // Handle nullable schemas
  if (schema.nullable && faker.datatype.boolean({ probability: 0.1 })) {
    return null;
  }

  // Handle composite schemas (oneOf, anyOf, allOf)
  const compositeResult = handleCompositeSchema(schema, faker, propertyName);
  if (compositeResult !== undefined) {
    return compositeResult;
  }

  // Handle special values (enum, const, default)
  const specialResult = handleSpecialValues(schema, faker);
  if (specialResult !== undefined) {
    return specialResult;
  }

  // Try field name mapping first (e.g., "email" field → email generator)
  // Only use field name shortcut if the generated value is compatible with schema constraints
  if (propertyName) {
    const fieldValue = generateFromFieldName(propertyName, faker);
    if (fieldValue !== undefined && isValueCompatibleWithSchema(fieldValue, schema)) {
      return fieldValue;
    }
  }

  // Generate based on type
  return generateByType(schema, faker);
}

/**
 * Generate a value based on field name using smart detection.
 *
 * @param fieldName - The property name to match against known patterns
 * @param faker - Faker instance
 * @returns Generated value or undefined if no match found
 */
export function generateFromFieldName(fieldName: string, faker: Faker): unknown | undefined {
  // Normalize the field name: lowercase and remove common separators
  const normalized = fieldName.toLowerCase().replace(/[-_]/g, '');

  // Look up in field name mapping
  const generator = FIELD_NAME_MAPPING[normalized];
  if (generator) {
    return generator(faker);
  }

  // Try partial matches for common suffixes
  return matchFieldNameSuffix(normalized, faker);
}

// =============================================================================
// Internal Helper Functions

/**
 * Check if a generated value is compatible with schema constraints.
 * Used to validate field-name shortcut results against declared schema.
 * @internal
 */
function isValueCompatibleWithSchema(value: unknown, schema: OpenAPIV3_1.SchemaObject): boolean {
  // If schema has enum, value must be in enum
  if (schema.enum && !schema.enum.includes(value)) {
    return false;
  }

  // Check type compatibility
  if (!isTypeCompatible(value, schema.type)) {
    return false;
  }

  // Check string constraints
  if (typeof value === 'string' && !isStringConstraintsSatisfied(value, schema)) {
    return false;
  }

  // Check number/integer constraints
  if (typeof value === 'number' && !isNumberConstraintsSatisfied(value, schema)) {
    return false;
  }

  return true;
}

/**
 * Check if a value's type matches the schema type.
 * @internal
 */
function isTypeCompatible(value: unknown, schemaType: OpenAPIV3_1.SchemaObject['type']): boolean {
  if (!schemaType) {
    return true;
  }

  const valueType = typeof value;

  switch (schemaType) {
    case 'string':
      return valueType === 'string';
    case 'integer':
      return valueType === 'number' && Number.isInteger(value);
    case 'number':
      return valueType === 'number';
    case 'boolean':
      return valueType === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return valueType === 'object' && value !== null && !Array.isArray(value);
    default:
      return true;
  }
}

/**
 * Check if a string value satisfies schema constraints.
 * @internal
 */
function isStringConstraintsSatisfied(value: string, schema: OpenAPIV3_1.SchemaObject): boolean {
  if (schema.minLength !== undefined && value.length < schema.minLength) {
    return false;
  }
  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    return false;
  }
  if (schema.pattern) {
    try {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        return false;
      }
    } catch {
      // Invalid pattern, skip check
    }
  }
  return true;
}

/**
 * Check if a number value satisfies schema constraints.
 * @internal
 */
function isNumberConstraintsSatisfied(value: number, schema: OpenAPIV3_1.SchemaObject): boolean {
  if (schema.minimum !== undefined && value < schema.minimum) {
    return false;
  }
  if (schema.maximum !== undefined && value > schema.maximum) {
    return false;
  }
  if (typeof schema.exclusiveMinimum === 'number' && value <= schema.exclusiveMinimum) {
    return false;
  }
  if (typeof schema.exclusiveMaximum === 'number' && value >= schema.exclusiveMaximum) {
    return false;
  }
  if (schema.multipleOf !== undefined) {
    const remainder = Math.abs(value % schema.multipleOf);
    const epsilon = 1e-10;
    // Check if remainder is effectively zero (accounting for floating-point precision)
    if (remainder > epsilon && Math.abs(remainder - schema.multipleOf) > epsilon) {
      return false;
    }
  }
  return true;
}
// =============================================================================

/**
 * Handle composite schemas (oneOf, anyOf, allOf).
 * @internal
 */
function handleCompositeSchema(
  schema: OpenAPIV3_1.SchemaObject,
  faker: Faker,
  propertyName?: string,
): unknown | undefined {
  // Handle oneOf - pick a random schema
  if (schema.oneOf && Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    const selectedSchema = faker.helpers.arrayElement(schema.oneOf as OpenAPIV3_1.SchemaObject[]);
    return generateFromSchema(selectedSchema, faker, propertyName);
  }

  // Handle anyOf - pick a random schema
  if (schema.anyOf && Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    const selectedSchema = faker.helpers.arrayElement(schema.anyOf as OpenAPIV3_1.SchemaObject[]);
    return generateFromSchema(selectedSchema, faker, propertyName);
  }

  // Handle allOf - merge schemas and generate
  if (schema.allOf && Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    const mergedSchema = mergeAllOfSchemas(schema.allOf as OpenAPIV3_1.SchemaObject[]);
    return generateFromSchema(mergedSchema, faker, propertyName);
  }

  return undefined;
}

/**
 * Handle special schema values (enum, const, default).
 * @internal
 */
function handleSpecialValues(schema: OpenAPIV3_1.SchemaObject, faker: Faker): unknown | undefined {
  // Handle enum values - pick a random value from the enum
  if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
    return faker.helpers.arrayElement(schema.enum);
  }

  // Handle const value
  if (schema.const !== undefined) {
    return schema.const;
  }

  // Handle default value (with some probability to use it)
  if (schema.default !== undefined && faker.datatype.boolean({ probability: 0.3 })) {
    return schema.default;
  }

  return undefined;
}

/**
 * Generate value based on schema type.
 * @internal
 */
function generateByType(schema: OpenAPIV3_1.SchemaObject, faker: Faker): unknown {
  // Get type (handle array type for OpenAPI 3.1 union types)
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  const format = schema.format;

  switch (type) {
    case 'string':
      return generateString(format, schema, faker);
    case 'integer':
      return generateInteger(format, schema, faker);
    case 'number':
      return generateNumber(format, schema, faker);
    case 'boolean':
      return faker.datatype.boolean();
    case 'array':
      return generateArray(schema, faker);
    case 'object':
      return generateObject(schema, faker);
    case 'null':
      return null;
    default:
      return generateFallback(schema, faker);
  }
}

/**
 * Fallback generation for unknown types.
 * @internal
 */
function generateFallback(schema: OpenAPIV3_1.SchemaObject, faker: Faker): unknown {
  // Try to infer from other schema properties
  if (schema.properties) {
    return generateObject(schema, faker);
  }
  if (schema.items) {
    return generateArray(schema, faker);
  }
  // Last resort: return a random word
  return faker.lorem.word();
}

/**
 * Suffix patterns for field name matching.
 * Defined at module level for performance (avoid recreating on each call).
 * @internal
 */
const SUFFIX_PATTERNS: ReadonlyArray<{
  suffixes: readonly string[];
  generate: (faker: Faker) => unknown;
}> = [
  { suffixes: ['email', 'mail'], generate: (f) => f.internet.email() },
  { suffixes: ['url', 'uri', 'link'], generate: (f) => f.internet.url() },
  { suffixes: ['phone', 'mobile', 'tel'], generate: (f) => f.phone.number() },
  { suffixes: ['time', 'datetime'], generate: (f) => f.date.recent().toISOString() },
  { suffixes: ['date'], generate: (f) => f.date.recent().toISOString().split('T')[0] },
  { suffixes: ['name'], generate: (f) => f.person.fullName() },
  { suffixes: ['description', 'desc'], generate: (f) => f.lorem.paragraph() },
  { suffixes: ['image', 'img', 'photo'], generate: (f) => f.image.url() },
  { suffixes: ['address'], generate: (f) => f.location.streetAddress() },
  { suffixes: ['price', 'cost', 'amount'], generate: (f) => Number.parseFloat(f.commerce.price()) },
] as const;

/**
 * Match field name by common suffixes.
 * @internal
 */
function matchFieldNameSuffix(normalized: string, faker: Faker): unknown | undefined {
  for (const pattern of SUFFIX_PATTERNS) {
    if (pattern.suffixes.some((suffix) => normalized.endsWith(suffix))) {
      return pattern.generate(faker);
    }
  }

  // Special case: ends with 'id' but is not just 'id'
  if (normalized.endsWith('id') && normalized !== 'id') {
    return faker.number.int({ min: 1, max: 10000 });
  }

  return undefined;
}

/**
 * Generate a string value based on format.
 * @internal
 */
function generateString(
  format: string | undefined,
  schema: OpenAPIV3_1.SchemaObject,
  faker: Faker,
): string {
  // Check for pattern - try to generate matching string
  if (schema.pattern) {
    return generateStringWithPattern(schema, faker);
  }

  // Use type:format mapping
  if (format) {
    const key = `string:${format}`;
    const generator = TYPE_FORMAT_MAPPING[key];
    if (generator) {
      return String(generator(faker));
    }
  }

  // Generate with length constraints
  return generateStringWithLength(schema, faker);
}

/**
 * Generate string matching a regex pattern.
 * Attempts bounded sampling, falls back to best candidate if no match found.
 *
 * Includes ReDoS protection by skipping overly complex patterns.
 *
 * @internal
 */
function generateStringWithPattern(schema: OpenAPIV3_1.SchemaObject, faker: Faker): string {
  const pattern = schema.pattern;
  if (!pattern) {
    return generateStringWithLength(schema, faker);
  }

  // ReDoS protection: skip overly complex patterns that could cause exponential backtracking
  // - Patterns longer than 200 chars are likely complex
  // - Nested quantifiers like (a+)+ or (a*)*b are classic ReDoS patterns
  // - Lookbehind assertions (?<) can be expensive in some engines
  if (pattern.length > 200 || /(\.\*){3,}|([+*])\)\2|\(\?</.test(pattern)) {
    return generateStringWithLength(schema, faker);
  }

  let regex: RegExp;
  try {
    regex = new RegExp(pattern);
  } catch {
    // Invalid regex pattern, fall back to length-based generation
    return generateStringWithLength(schema, faker);
  }

  // Try bounded number of attempts to generate a matching string
  const maxAttempts = 20;
  let bestCandidate = '';

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateStringWithLength(schema, faker);
    if (regex.test(candidate)) {
      return candidate;
    }
    // Keep the first candidate as fallback
    if (attempt === 0) {
      bestCandidate = candidate;
    }
  }

  // No match found after attempts, return best candidate
  // (This is a controlled fallback - pattern matching with random generation
  // is inherently probabilistic)
  return bestCandidate;
}

/**
 * Generate string respecting length constraints.
 * @internal
 */
function generateStringWithLength(schema: OpenAPIV3_1.SchemaObject, faker: Faker): string {
  const minLength = schema.minLength ?? 0;
  const maxLength = schema.maxLength ?? 100;

  let result = faker.lorem.words(3);

  // Adjust to meet length constraints
  while (result.length < minLength) {
    result += ` ${faker.lorem.word()}`;
  }
  if (result.length > maxLength) {
    result = result.substring(0, maxLength).trim();
  }

  return result;
}

/**
 * Generate an integer value based on format and constraints.
 * @internal
 */
function generateInteger(
  format: string | undefined,
  schema: OpenAPIV3_1.SchemaObject,
  faker: Faker,
): number {
  const { min, max } = getIntegerBounds(format, schema);

  // Handle multipleOf constraint
  if (schema.multipleOf !== undefined && schema.multipleOf > 0) {
    const multipleResult = generateMultipleOf(min, max, schema.multipleOf, faker);
    if (multipleResult !== undefined) {
      return multipleResult;
    }
    // No valid multiple in range, fall back to unconstrained generation
  }

  return faker.number.int({ min, max });
}

/**
 * Get integer bounds from schema and format.
 * @internal
 */
function getIntegerBounds(
  format: string | undefined,
  schema: OpenAPIV3_1.SchemaObject,
): { min: number; max: number } {
  let min = schema.minimum ?? 1;
  let max = schema.maximum ?? 1000;

  // Handle exclusiveMinimum/exclusiveMaximum
  if (typeof schema.exclusiveMinimum === 'number') {
    min = schema.exclusiveMinimum + 1;
  } else if (schema.exclusiveMinimum === true && schema.minimum !== undefined) {
    min = schema.minimum + 1;
  }

  if (typeof schema.exclusiveMaximum === 'number') {
    max = schema.exclusiveMaximum - 1;
  } else if (schema.exclusiveMaximum === true && schema.maximum !== undefined) {
    max = schema.maximum - 1;
  }

  // Apply format-specific limits
  if (format === 'int32') {
    max = Math.min(max, 2147483647);
    min = Math.max(min, -2147483648);
  } else if (format === 'int64') {
    max = Math.min(max, Number.MAX_SAFE_INTEGER);
    min = Math.max(min, Number.MIN_SAFE_INTEGER);
  }

  return { min, max };
}

/**
 * Generate a number that is a multiple of the given value.
 * @internal
 */
function generateMultipleOf(
  min: number,
  max: number,
  multiple: number,
  faker: Faker,
): number | undefined {
  const minMultiple = Math.ceil(min / multiple) * multiple;
  const maxMultiple = Math.floor(max / multiple) * multiple;

  // Check if any valid multiple exists in the range
  if (minMultiple > maxMultiple) {
    return undefined;
  }

  const count = Math.floor((maxMultiple - minMultiple) / multiple) + 1;
  if (count <= 0) {
    return undefined;
  }

  const randomIndex = faker.number.int({ min: 0, max: count - 1 });
  return minMultiple + randomIndex * multiple;
}

/**
 * Generate a number (float/double) value based on format and constraints.
 * @internal
 */
function generateNumber(
  format: string | undefined,
  schema: OpenAPIV3_1.SchemaObject,
  faker: Faker,
): number {
  let min = schema.minimum ?? 0;
  let max = schema.maximum ?? 1000;

  // Handle exclusiveMinimum/exclusiveMaximum
  if (typeof schema.exclusiveMinimum === 'number') {
    min = schema.exclusiveMinimum + 0.01;
  } else if (schema.exclusiveMinimum === true && schema.minimum !== undefined) {
    min = schema.minimum + 0.01;
  }

  if (typeof schema.exclusiveMaximum === 'number') {
    max = schema.exclusiveMaximum - 0.01;
  } else if (schema.exclusiveMaximum === true && schema.maximum !== undefined) {
    max = schema.maximum - 0.01;
  }

  // Determine precision based on format
  const fractionDigits = format === 'double' ? 6 : 2;

  // Handle multipleOf constraint
  if (schema.multipleOf !== undefined && schema.multipleOf > 0) {
    const multipleResult = generateMultipleOf(min, max, schema.multipleOf, faker);
    if (multipleResult !== undefined) {
      return multipleResult;
    }
    // No valid multiple in range, fall back to unconstrained generation
  }

  return faker.number.float({ min, max, fractionDigits });
}

/**
 * Generate an array value based on schema items.
 *
 * Note: maxItems is capped at 10 to prevent excessive data generation.
 * This is an intentional safeguard for mock data scenarios.
 *
 * @internal
 */
function generateArray(schema: OpenAPIV3_1.SchemaObject, faker: Faker): unknown[] {
  const items = schema.items as OpenAPIV3_1.SchemaObject | undefined;
  const minItems = schema.minItems ?? 1;
  const rawMax = schema.maxItems ?? 5;
  // Cap maxItems at 10 to prevent excessive data generation in mock scenarios
  const capMax = Math.min(rawMax, 10);
  // Ensure min ≤ max to avoid invalid range errors
  const finalMax = Math.max(minItems, capMax);
  const finalMin = Math.min(minItems, finalMax);

  // Determine array length
  const count = faker.number.int({ min: finalMin, max: finalMax });

  // If no items schema, return empty array
  if (!items) {
    return [];
  }

  // Generate array elements
  const result: unknown[] = [];
  for (let i = 0; i < count; i++) {
    result.push(generateFromSchema(items, faker));
  }

  // Handle uniqueItems constraint
  if (schema.uniqueItems) {
    return deduplicateArray(result);
  }

  return result;
}

/**
 * Remove duplicate items from array.
 * @internal
 */
function deduplicateArray(items: unknown[]): unknown[] {
  const seen = new Set<string>();
  const uniqueResult: unknown[] = [];
  for (const item of items) {
    const key = JSON.stringify(item);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResult.push(item);
    }
  }
  return uniqueResult;
}

/**
 * Generate an object value based on schema properties.
 * @internal
 */
function generateObject(schema: OpenAPIV3_1.SchemaObject, faker: Faker): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const properties = schema.properties ?? {};
  const required = new Set<string>((schema.required as string[]) ?? []);

  // Generate defined properties
  for (const [key, propSchema] of Object.entries(properties)) {
    const shouldGenerate = required.has(key) || faker.datatype.boolean({ probability: 0.7 });
    if (shouldGenerate) {
      result[key] = generateFromSchema(propSchema as OpenAPIV3_1.SchemaObject, faker, key);
    }
  }

  // Handle additionalProperties
  handleAdditionalProperties(result, schema, faker);

  // Apply property count constraints
  applyPropertyConstraints(result, schema, required, faker);

  return result;
}

/**
 * Handle additionalProperties in object schema.
 * @internal
 */
function handleAdditionalProperties(
  result: Record<string, unknown>,
  schema: OpenAPIV3_1.SchemaObject,
  faker: Faker,
): void {
  if (schema.additionalProperties === true) {
    const extraCount = faker.number.int({ min: 0, max: 2 });
    for (let i = 0; i < extraCount; i++) {
      const key = faker.lorem.word();
      if (!(key in result)) {
        result[key] = faker.lorem.word();
      }
    }
  } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    const extraCount = faker.number.int({ min: 1, max: 3 });
    for (let i = 0; i < extraCount; i++) {
      const key = faker.lorem.word();
      if (!(key in result)) {
        result[key] = generateFromSchema(
          schema.additionalProperties as OpenAPIV3_1.SchemaObject,
          faker,
          key,
        );
      }
    }
  }
}

/**
 * Apply minProperties/maxProperties constraints.
 * @internal
 */
function applyPropertyConstraints(
  result: Record<string, unknown>,
  schema: OpenAPIV3_1.SchemaObject,
  required: Set<string>,
  faker: Faker,
): void {
  const minProperties = schema.minProperties ?? 0;
  const maxProperties = schema.maxProperties ?? Number.POSITIVE_INFINITY;

  // First, fill any missing defined properties from the schema
  fillMissingDefinedProperties(result, schema, minProperties, faker);

  // Only add random keys if additionalProperties is not false and we still need more
  fillWithAdditionalProperties(result, schema, minProperties, faker);

  // Remove optional properties if needed
  trimExcessProperties(result, maxProperties, required);
}

/**
 * Fill missing defined properties to meet minProperties requirement.
 * @internal
 */
function fillMissingDefinedProperties(
  result: Record<string, unknown>,
  schema: OpenAPIV3_1.SchemaObject,
  minProperties: number,
  faker: Faker,
): void {
  const properties = schema.properties ?? {};

  if (Object.keys(result).length >= minProperties) {
    return;
  }

  for (const [key, propSchema] of Object.entries(properties)) {
    if (!(key in result)) {
      result[key] = generateFromSchema(propSchema as OpenAPIV3_1.SchemaObject, faker, key);
      if (Object.keys(result).length >= minProperties) {
        break;
      }
    }
  }
}

/**
 * Fill with additional properties to meet minProperties requirement.
 * @internal
 */
function fillWithAdditionalProperties(
  result: Record<string, unknown>,
  schema: OpenAPIV3_1.SchemaObject,
  minProperties: number,
  faker: Faker,
): void {
  const additionalPropsAllowed = schema.additionalProperties !== false;
  const properties = schema.properties ?? {};

  if (!additionalPropsAllowed) {
    return;
  }

  while (Object.keys(result).length < minProperties) {
    const key = faker.lorem.word();
    if (!(key in result) && !(key in properties)) {
      result[key] = generateAdditionalPropertyValue(schema, key, faker);
    }
  }
}

/**
 * Generate a value for an additional property based on additionalProperties schema.
 * @internal
 */
function generateAdditionalPropertyValue(
  schema: OpenAPIV3_1.SchemaObject,
  key: string,
  faker: Faker,
): unknown {
  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    return generateFromSchema(schema.additionalProperties as OpenAPIV3_1.SchemaObject, faker, key);
  }
  // additionalProperties is true or absent, allow free values
  return faker.lorem.word();
}

/**
 * Remove optional properties to meet maxProperties requirement.
 * @internal
 */
function trimExcessProperties(
  result: Record<string, unknown>,
  maxProperties: number,
  required: Set<string>,
): void {
  const keys = Object.keys(result);
  if (keys.length <= maxProperties) {
    return;
  }

  const optionalKeys = keys.filter((k) => !required.has(k));
  const keysToRemove = optionalKeys.slice(0, keys.length - maxProperties);
  for (const key of keysToRemove) {
    delete result[key];
  }
}

/**
 * Merge multiple schemas from allOf into a single schema.
 * @internal
 */
function mergeAllOfSchemas(schemas: OpenAPIV3_1.SchemaObject[]): OpenAPIV3_1.SchemaObject {
  const merged: OpenAPIV3_1.SchemaObject = {
    type: 'object',
    properties: {},
    required: [],
  };

  for (const schema of schemas) {
    mergeSchemaInto(merged, schema);
  }

  return merged;
}

/**
 * Merge a single schema into the target merged schema.
 * @internal
 */
function mergeSchemaInto(merged: OpenAPIV3_1.SchemaObject, schema: OpenAPIV3_1.SchemaObject): void {
  // Merge type (last one wins)
  if (schema.type) {
    merged.type = schema.type;
  }

  // Merge properties
  if (schema.properties) {
    merged.properties = { ...merged.properties, ...schema.properties };
  }

  // Merge required arrays
  if (schema.required && Array.isArray(schema.required)) {
    const currentRequired = merged.required as string[];
    merged.required = [...new Set([...currentRequired, ...schema.required])];
  }

  // Merge property count constraints
  mergePropertyConstraints(merged, schema);
}

/**
 * Merge property count constraints.
 * @internal
 */
function mergePropertyConstraints(
  merged: OpenAPIV3_1.SchemaObject,
  schema: OpenAPIV3_1.SchemaObject,
): void {
  if (schema.minProperties !== undefined) {
    merged.minProperties = Math.max(merged.minProperties ?? 0, schema.minProperties);
  }
  if (schema.maxProperties !== undefined) {
    merged.maxProperties = Math.min(
      merged.maxProperties ?? Number.POSITIVE_INFINITY,
      schema.maxProperties,
    );
  }
  if (schema.additionalProperties !== undefined) {
    merged.additionalProperties = schema.additionalProperties;
  }
}

// Re-export for backward compatibility with internal API
export {
  generateFromFieldName as _generateFromFieldName,
  generateFromSchema as _generateFromSchema,
};
