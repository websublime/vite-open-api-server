/**
 * User Seeds - Code-based seeds for User schema
 *
 * ## What
 * This file exports an object mapping schemaName to JavaScript code strings
 * that will be injected as `x-seed` extensions into the OpenAPI spec.
 *
 * ## How
 * Each key is a schema name from the OpenAPI spec (components.schemas), and
 * each value is a JavaScript code string that Scalar Mock Server will execute
 * to populate the in-memory store with initial data.
 *
 * ## Why
 * Custom seeds enable realistic mock data for user-related endpoints,
 * allowing authentication flow testing with predefined credentials.
 *
 * @see https://scalar.com/products/mock-server/data-seeding
 * @module seeds/users
 */

/**
 * User schema seeds.
 *
 * Available Scalar runtime context:
 * - `seed` - Seeding utilities (count, etc.)
 * - `faker` - Faker.js instance for generating fake data
 * - `store` - In-memory data store (for referencing other seeded data)
 */
const seeds = {
  /**
   * User - Generates 10 sample users with realistic data
   *
   * Includes a test user with known credentials (user1/password123)
   * for easy testing of authentication flows.
   */
  User: `
    seed.count(10, (index) => {
      // First user is a test user with known credentials
      if (index === 0) {
        return {
          id: 1,
          username: 'user1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'user1@example.com',
          password: 'password123',
          phone: '555-0100',
          userStatus: 1
        };
      }

      return {
        id: index + 1,
        username: faker.internet.username(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
        phone: faker.phone.number(),
        userStatus: faker.helpers.arrayElement([0, 1, 2])
      };
    })
  `,
};

export default seeds;
