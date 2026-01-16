/**
 * Pet Seeds - Code-based seeds for Pet schema
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
 * Custom seeds enable realistic mock data that better represents production
 * scenarios, allowing frontend development with populated data stores.
 *
 * @see https://scalar.com/products/mock-server/data-seeding
 * @module seeds/pets
 */

import type { SeedExports } from '@websublime/vite-plugin-open-api-server';

/**
 * Pet schema seeds.
 *
 * Available Scalar runtime context:
 * - `seed` - Seeding utilities (count, etc.)
 * - `faker` - Faker.js instance for generating fake data
 * - `store` - In-memory data store (for referencing other seeded data)
 */
const seeds: SeedExports = {
  /**
   * Pet - Generates 15 sample pets with realistic data
   */
  Pet: `
    seed.count(15, (index) => ({
      id: index + 1,
      name: faker.animal.petName(),
      category: {
        id: faker.number.int({ min: 1, max: 5 }),
        name: faker.helpers.arrayElement(['Dogs', 'Cats', 'Birds', 'Fish', 'Reptiles'])
      },
      photoUrls: [
        faker.image.url({ width: 640, height: 480 }),
        faker.image.url({ width: 640, height: 480 })
      ],
      tags: faker.helpers.arrayElements(
        [
          { id: 1, name: 'friendly' },
          { id: 2, name: 'playful' },
          { id: 3, name: 'trained' },
          { id: 4, name: 'vaccinated' },
          { id: 5, name: 'neutered' },
          { id: 6, name: 'young' },
          { id: 7, name: 'senior' },
          { id: 8, name: 'rescue' }
        ],
        { min: 1, max: 3 }
      ),
      status: faker.helpers.arrayElement(['available', 'pending', 'sold'])
    }))
  `,

  /**
   * Category - Generates pet categories
   */
  Category: `
    seed.count(5, (index) => ({
      id: index + 1,
      name: ['Dogs', 'Cats', 'Birds', 'Fish', 'Reptiles'][index]
    }))
  `,

  /**
   * Tag - Generates pet tags
   */
  Tag: `
    seed.count(8, (index) => ({
      id: index + 1,
      name: ['friendly', 'playful', 'trained', 'vaccinated', 'neutered', 'young', 'senior', 'rescue'][index]
    }))
  `,
};

export default seeds;
