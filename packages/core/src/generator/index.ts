/**
 * Generator Module
 *
 * What: Fake data generation from OpenAPI schemas
 * How: Uses Faker.js with type and field name mapping
 * Why: Automatically generates realistic mock data when no handler/seed exists
 *
 * @module generator
 */

// Mapping constants
export {
  DATE_FORMAT_POST_PROCESSING,
  FIELD_NAME_MAPPING,
  TYPE_FORMAT_MAPPING,
} from './field-mapping.js';

// Public API - main generator functions
export { generateFromFieldName, generateFromSchema } from './schema-generator.js';
