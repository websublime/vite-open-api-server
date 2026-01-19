/**
 * Field Mapping
 *
 * What: Mappings from field names and type+format to Faker generators
 * How: Defines lookup tables for common patterns
 * Why: Enables smart data generation based on semantic meaning
 */

// TODO: Will be implemented in Task 1.5: Data Generator

/**
 * Mapping of common field names to Faker generator functions
 */
export const FIELD_NAME_MAPPING: Record<string, string> = {
  // Personal
  name: 'person.fullName',
  firstName: 'person.firstName',
  lastName: 'person.lastName',
  email: 'internet.email',
  phone: 'phone.number',
  username: 'internet.username',
  avatar: 'image.avatar',

  // Location
  address: 'location.streetAddress',
  city: 'location.city',
  country: 'location.country',
  zipCode: 'location.zipCode',

  // Content
  title: 'lorem.sentence',
  description: 'lorem.paragraph',
  image: 'image.url',
  url: 'internet.url',

  // Commerce
  price: 'commerce.price',
  quantity: 'number.int',

  // Dates
  createdAt: 'date.past',
  updatedAt: 'date.recent',
};

/**
 * Mapping of type:format combinations to Faker generators
 *
 * Note: For 'string:date' and 'string:date-time', the generator logic must
 * post-format the faker result:
 * - 'string:date' → ISO date only (YYYY-MM-DD) per RFC3339 full-date
 * - 'string:date-time' → ISO date-time (YYYY-MM-DDTHH:mm:ssZ) per RFC3339
 */
export const TYPE_FORMAT_MAPPING: Record<string, string> = {
  'string:email': 'internet.email',
  'string:uri': 'internet.url',
  'string:url': 'internet.url',
  'string:uuid': 'string.uuid',
  'string:date': 'date.recent',
  'string:date-time': 'date.recent',
  'string:password': 'internet.password',
  'string:hostname': 'internet.domainName',
  'string:ipv4': 'internet.ipv4',
  'string:ipv6': 'internet.ipv6',
  string: 'lorem.words',
  integer: 'number.int',
  'integer:int32': 'number.int',
  'integer:int64': 'number.int',
  number: 'number.float',
  'number:float': 'number.float',
  'number:double': 'number.float',
  boolean: 'datatype.boolean',
};
