/**
 * Order Seeds - Code-based seeds for Order schema
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
 * Custom seeds enable realistic mock data for order-related endpoints,
 * allowing order workflow testing (placed → approved → delivered).
 *
 * @see https://scalar.com/products/mock-server/data-seeding
 * @module seeds/orders
 */

import type { SeedExports } from '@websublime/vite-plugin-open-api-server';

/**
 * Order schema seeds.
 *
 * Available Scalar runtime context:
 * - `seed` - Seeding utilities (count, etc.)
 * - `faker` - Faker.js instance for generating fake data
 * - `store` - In-memory data store (for referencing other seeded data)
 */
const seeds: SeedExports = {
  /**
   * Order - Generates 10 sample orders with realistic data
   */
  Order: `
    seed.count(10, (index) => ({
      id: index + 1,
      petId: faker.number.int({ min: 1, max: 15 }),
      quantity: faker.number.int({ min: 1, max: 5 }),
      shipDate: faker.date.future().toISOString(),
      status: faker.helpers.arrayElement(['placed', 'approved', 'delivered']),
      complete: faker.datatype.boolean()
    }))
  `,
};

export default seeds;
