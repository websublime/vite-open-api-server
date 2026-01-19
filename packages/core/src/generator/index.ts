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

// Internal/experimental exports - these throw until Task 1.5 is implemented
// Consumers should not call these directly until they are fully implemented
export {
  _generateFromFieldName,
  _generateFromSchema,
} from './schema-generator.js';
