/**
 * Field Mapping
 *
 * What: Mappings from field names and type+format to Faker generators
 * How: Defines lookup tables for common patterns
 * Why: Enables smart data generation based on semantic meaning
 *
 * @module generator/field-mapping
 */

import type { Faker } from '@faker-js/faker';

/**
 * Mapping of common field names to Faker generator functions.
 * Keys are normalized to lowercase for case-insensitive matching.
 *
 * @example
 * // Field "firstName" or "firstname" will both match
 * const value = FIELD_NAME_MAPPING.firstname?.(faker);
 */
export const FIELD_NAME_MAPPING: Record<string, (faker: Faker) => unknown> = {
  // Personal information
  name: (faker) => faker.person.fullName(),
  fullname: (faker) => faker.person.fullName(),
  firstname: (faker) => faker.person.firstName(),
  first_name: (faker) => faker.person.firstName(),
  lastname: (faker) => faker.person.lastName(),
  last_name: (faker) => faker.person.lastName(),
  middlename: (faker) => faker.person.middleName(),
  middle_name: (faker) => faker.person.middleName(),
  email: (faker) => faker.internet.email(),
  emailaddress: (faker) => faker.internet.email(),
  email_address: (faker) => faker.internet.email(),
  phone: (faker) => faker.phone.number(),
  phonenumber: (faker) => faker.phone.number(),
  phone_number: (faker) => faker.phone.number(),
  username: (faker) => faker.internet.username(),
  user_name: (faker) => faker.internet.username(),
  avatar: (faker) => faker.image.avatar(),
  avatarurl: (faker) => faker.image.avatar(),
  avatar_url: (faker) => faker.image.avatar(),
  bio: (faker) => faker.lorem.paragraph(),
  biography: (faker) => faker.lorem.paragraph(),

  // Location
  address: (faker) => faker.location.streetAddress(),
  streetaddress: (faker) => faker.location.streetAddress(),
  street_address: (faker) => faker.location.streetAddress(),
  street: (faker) => faker.location.street(),
  city: (faker) => faker.location.city(),
  state: (faker) => faker.location.state(),
  country: (faker) => faker.location.country(),
  countrycode: (faker) => faker.location.countryCode(),
  country_code: (faker) => faker.location.countryCode(),
  zipcode: (faker) => faker.location.zipCode(),
  zip_code: (faker) => faker.location.zipCode(),
  zip: (faker) => faker.location.zipCode(),
  postalcode: (faker) => faker.location.zipCode(),
  postal_code: (faker) => faker.location.zipCode(),
  latitude: (faker) => faker.location.latitude(),
  lat: (faker) => faker.location.latitude(),
  longitude: (faker) => faker.location.longitude(),
  lng: (faker) => faker.location.longitude(),
  lon: (faker) => faker.location.longitude(),

  // Content
  title: (faker) => faker.lorem.sentence(),
  headline: (faker) => faker.lorem.sentence(),
  description: (faker) => faker.lorem.paragraph(),
  summary: (faker) => faker.lorem.paragraph(),
  content: (faker) => faker.lorem.paragraphs(3),
  body: (faker) => faker.lorem.paragraphs(3),
  text: (faker) => faker.lorem.paragraph(),
  comment: (faker) => faker.lorem.sentence(),
  message: (faker) => faker.lorem.sentence(),
  note: (faker) => faker.lorem.sentence(),
  notes: (faker) => faker.lorem.paragraph(),

  // Media
  image: (faker) => faker.image.url(),
  imageurl: (faker) => faker.image.url(),
  image_url: (faker) => faker.image.url(),
  photo: (faker) => faker.image.url(),
  photourl: (faker) => faker.image.url(),
  photo_url: (faker) => faker.image.url(),
  picture: (faker) => faker.image.url(),
  thumbnail: (faker) => faker.image.url(),
  thumbnailurl: (faker) => faker.image.url(),
  thumbnail_url: (faker) => faker.image.url(),
  cover: (faker) => faker.image.url(),
  coverimage: (faker) => faker.image.url(),
  cover_image: (faker) => faker.image.url(),
  url: (faker) => faker.internet.url(),
  website: (faker) => faker.internet.url(),
  websiteurl: (faker) => faker.internet.url(),
  website_url: (faker) => faker.internet.url(),
  link: (faker) => faker.internet.url(),
  href: (faker) => faker.internet.url(),

  // Commerce
  price: (faker) => Number.parseFloat(faker.commerce.price()),
  amount: (faker) => Number.parseFloat(faker.commerce.price()),
  cost: (faker) => Number.parseFloat(faker.commerce.price()),
  total: (faker) => Number.parseFloat(faker.commerce.price()),
  subtotal: (faker) => Number.parseFloat(faker.commerce.price()),
  quantity: (faker) => faker.number.int({ min: 1, max: 100 }),
  qty: (faker) => faker.number.int({ min: 1, max: 100 }),
  count: (faker) => faker.number.int({ min: 1, max: 100 }),
  product: (faker) => faker.commerce.productName(),
  productname: (faker) => faker.commerce.productName(),
  product_name: (faker) => faker.commerce.productName(),
  category: (faker) => faker.commerce.department(),
  department: (faker) => faker.commerce.department(),
  sku: (faker) => faker.string.alphanumeric(8).toUpperCase(),
  barcode: (faker) => faker.commerce.isbn(),

  // Dates and times
  date: (faker) => faker.date.recent().toISOString().split('T')[0],
  datetime: (faker) => faker.date.recent().toISOString(),
  createdat: (faker) => faker.date.past().toISOString(),
  created_at: (faker) => faker.date.past().toISOString(),
  createddate: (faker) => faker.date.past().toISOString(),
  created_date: (faker) => faker.date.past().toISOString(),
  updatedat: (faker) => faker.date.recent().toISOString(),
  updated_at: (faker) => faker.date.recent().toISOString(),
  updateddate: (faker) => faker.date.recent().toISOString(),
  updated_date: (faker) => faker.date.recent().toISOString(),
  modifiedat: (faker) => faker.date.recent().toISOString(),
  modified_at: (faker) => faker.date.recent().toISOString(),
  deletedat: (faker) => faker.date.recent().toISOString(),
  deleted_at: (faker) => faker.date.recent().toISOString(),
  publishedat: (faker) => faker.date.past().toISOString(),
  published_at: (faker) => faker.date.past().toISOString(),
  expiresat: (faker) => faker.date.future().toISOString(),
  expires_at: (faker) => faker.date.future().toISOString(),
  startdate: (faker) => faker.date.past().toISOString().split('T')[0],
  start_date: (faker) => faker.date.past().toISOString().split('T')[0],
  enddate: (faker) => faker.date.future().toISOString().split('T')[0],
  end_date: (faker) => faker.date.future().toISOString().split('T')[0],
  birthdate: (faker) => faker.date.birthdate().toISOString().split('T')[0],
  birth_date: (faker) => faker.date.birthdate().toISOString().split('T')[0],
  birthday: (faker) => faker.date.birthdate().toISOString().split('T')[0],
  dob: (faker) => faker.date.birthdate().toISOString().split('T')[0],

  // Identifiers
  id: (faker) => faker.number.int({ min: 1, max: 10000 }),
  uuid: (faker) => faker.string.uuid(),
  guid: (faker) => faker.string.uuid(),
  slug: (faker) => faker.helpers.slugify(faker.lorem.words(3)).toLowerCase(),
  token: (faker) => faker.string.alphanumeric(32),
  code: (faker) => faker.string.alphanumeric(6).toUpperCase(),
  key: (faker) => faker.string.alphanumeric(16),
  secret: (faker) => faker.string.alphanumeric(32),
  hash: (faker) => faker.string.hexadecimal({ length: 40, casing: 'lower', prefix: '' }),
  password: (faker) => faker.internet.password(),

  // Network
  ip: (faker) => faker.internet.ipv4(),
  ipaddress: (faker) => faker.internet.ipv4(),
  ip_address: (faker) => faker.internet.ipv4(),
  ipv4: (faker) => faker.internet.ipv4(),
  ipv6: (faker) => faker.internet.ipv6(),
  mac: (faker) => faker.internet.mac(),
  macaddress: (faker) => faker.internet.mac(),
  mac_address: (faker) => faker.internet.mac(),
  hostname: (faker) => faker.internet.domainName(),
  domain: (faker) => faker.internet.domainName(),
  domainname: (faker) => faker.internet.domainName(),
  domain_name: (faker) => faker.internet.domainName(),
  port: (faker) => faker.internet.port(),
  useragent: (faker) => faker.internet.userAgent(),
  user_agent: (faker) => faker.internet.userAgent(),

  // Company
  company: (faker) => faker.company.name(),
  companyname: (faker) => faker.company.name(),
  company_name: (faker) => faker.company.name(),
  organization: (faker) => faker.company.name(),
  jobtitle: (faker) => faker.person.jobTitle(),
  job_title: (faker) => faker.person.jobTitle(),
  job: (faker) => faker.person.jobTitle(),
  position: (faker) => faker.person.jobTitle(),
  role: (faker) => faker.person.jobType(),

  // Misc
  color: (faker) => faker.color.human(),
  colour: (faker) => faker.color.human(),
  hexcolor: (faker) => faker.color.rgb({ format: 'hex' }),
  hex_color: (faker) => faker.color.rgb({ format: 'hex' }),
  version: (faker) => faker.system.semver(),
  language: (faker) => faker.helpers.arrayElement(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh']),
  locale: (faker) => faker.helpers.arrayElement(['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE']),
  currency: (faker) => faker.finance.currencyCode(),
  currencycode: (faker) => faker.finance.currencyCode(),
  currency_code: (faker) => faker.finance.currencyCode(),
  rating: (faker) => faker.number.float({ min: 0, max: 5, fractionDigits: 1 }),
  score: (faker) => faker.number.int({ min: 0, max: 100 }),
  percentage: (faker) => faker.number.int({ min: 0, max: 100 }),
  percent: (faker) => faker.number.int({ min: 0, max: 100 }),
  age: (faker) => faker.number.int({ min: 18, max: 80 }),
  weight: (faker) => faker.number.float({ min: 40, max: 120, fractionDigits: 1 }),
  height: (faker) => faker.number.float({ min: 150, max: 200, fractionDigits: 1 }),
  order: (faker) => faker.number.int({ min: 0, max: 100 }),
  priority: (faker) => faker.number.int({ min: 0, max: 5 }),
  rank: (faker) => faker.number.int({ min: 1, max: 100 }),
  level: (faker) => faker.number.int({ min: 1, max: 10 }),
  index: (faker) => faker.number.int({ min: 0, max: 100 }),
  status: (faker) => faker.helpers.arrayElement(['active', 'inactive', 'pending', 'completed']),
  type: (faker) => faker.helpers.arrayElement(['default', 'primary', 'secondary', 'custom']),
  active: () => true,
  enabled: () => true,
  disabled: () => false,
  visible: () => true,
  hidden: () => false,
  published: () => true,
  verified: () => true,
  confirmed: () => true,
};

/**
 * Post-processing functions for date formats per RFC3339.
 *
 * When generating values for these keys, the faker Date result must be
 * formatted according to OpenAPI/RFC3339 specifications:
 * - 'string:date' → format as YYYY-MM-DD (full-date per RFC3339 section 5.6)
 * - 'string:date-time' → format as YYYY-MM-DDTHH:mm:ssZ (date-time per RFC3339)
 *
 * @see https://datatracker.ietf.org/doc/html/rfc3339#section-5.6
 */
export const DATE_FORMAT_POST_PROCESSING = {
  'string:date': (date: Date): string => date.toISOString().split('T')[0],
  'string:date-time': (date: Date): string => date.toISOString(),
} as const;

/**
 * Mapping of type:format combinations to Faker generator functions.
 *
 * The key format is `type` or `type:format` where:
 * - `type` is the OpenAPI schema type (string, integer, number, boolean)
 * - `format` is the optional OpenAPI format (email, uuid, date-time, etc.)
 *
 * @example
 * // Get generator for email format
 * const gen = TYPE_FORMAT_MAPPING['string:email'];
 * const email = gen(faker); // "john.doe@example.com"
 */
export const TYPE_FORMAT_MAPPING: Record<string, (faker: Faker) => unknown> = {
  // String formats
  'string:email': (faker) => faker.internet.email(),
  'string:uri': (faker) => faker.internet.url(),
  'string:url': (faker) => faker.internet.url(),
  'string:uuid': (faker) => faker.string.uuid(),
  'string:date': (faker) => faker.date.recent().toISOString().split('T')[0],
  'string:date-time': (faker) => faker.date.recent().toISOString(),
  'string:time': (faker) => faker.date.recent().toISOString().split('T')[1].split('.')[0],
  'string:password': (faker) => faker.internet.password(),
  'string:byte': (faker) => Buffer.from(faker.lorem.words(3)).toString('base64'),
  'string:binary': (faker) => faker.string.hexadecimal({ length: 32, casing: 'lower', prefix: '' }),
  'string:hostname': (faker) => faker.internet.domainName(),
  'string:ipv4': (faker) => faker.internet.ipv4(),
  'string:ipv6': (faker) => faker.internet.ipv6(),
  'string:phone': (faker) => faker.phone.number(),

  // Generic string (no format)
  string: (faker) => faker.lorem.words(3),

  // Integer formats
  integer: (faker) => faker.number.int({ min: 1, max: 1000 }),
  'integer:int32': (faker) => faker.number.int({ min: 1, max: 2147483647 }),
  'integer:int64': (faker) => faker.number.int({ min: 1, max: Number.MAX_SAFE_INTEGER }),

  // Number formats
  number: (faker) => faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
  'number:float': (faker) => faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
  'number:double': (faker) => faker.number.float({ min: 0, max: 1000, fractionDigits: 6 }),

  // Boolean
  boolean: (faker) => faker.datatype.boolean(),
};
