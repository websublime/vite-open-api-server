/**
 * Generator Module
 *
 * What: Fake data generation from OpenAPI schemas
 * How: Uses Faker.js with type and field name mapping
 * Why: Automatically generates realistic mock data when no handler/seed exists
 *
 * @module generator
 */

export { FIELD_NAME_MAPPING, TYPE_FORMAT_MAPPING } from './field-mapping.js';
// TODO: Will be implemented in Task 1.5
export { generateFromFieldName, generateFromSchema } from './schema-generator.js';
