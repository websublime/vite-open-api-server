/**
 * Seed Data Generator for Pet Entities
 *
 * ## What
 * This seed file provides initial data for the Pet schema, populating the mock server
 * with sample pet records when the application starts.
 *
 * ## How
 * When the mock server initializes, it scans the seeds directory and invokes each seed
 * file's default export function. The function receives a `SeedContext` with utilities
 * for generating fake data and accessing schema definitions.
 *
 * ## Why
 * Seed data enables:
 * - Realistic mock responses without manual data entry
 * - Consistent test data across development sessions
 * - Demonstration of API capabilities with meaningful examples
 * - Frontend development with populated data stores
 *
 * @module seeds/pets
 * @see {@link https://github.com/websublime/vite-open-api-server} Plugin documentation
 */

import type { SeedContext } from '@websublime/vite-plugin-open-api-server';

/**
 * Pet seed data generator.
 *
 * Generates a collection of sample pets with realistic data for testing
 * and development purposes.
 *
 * @param context - The seed context containing faker instance and schema utilities
 * @returns An array of Pet objects
 */
export default async function seed(context: SeedContext): Promise<unknown[]> {
  const { faker } = context;

  // Categories for pets
  const categories = [
    { id: 1, name: 'Dogs' },
    { id: 2, name: 'Cats' },
    { id: 3, name: 'Birds' },
    { id: 4, name: 'Fish' },
    { id: 5, name: 'Reptiles' },
  ];

  // Sample tags
  const tagOptions = [
    { id: 1, name: 'friendly' },
    { id: 2, name: 'playful' },
    { id: 3, name: 'trained' },
    { id: 4, name: 'vaccinated' },
    { id: 5, name: 'neutered' },
    { id: 6, name: 'young' },
    { id: 7, name: 'senior' },
    { id: 8, name: 'rescue' },
  ];

  // Pet statuses
  const statuses = ['available', 'pending', 'sold'] as const;

  // Generate 15 sample pets
  return Array.from({ length: 15 }, (_, index) => {
    const category = faker.helpers.arrayElement(categories);
    const numTags = faker.number.int({ min: 1, max: 3 });
    const tags = faker.helpers.arrayElements(tagOptions, numTags);

    return {
      id: index + 1,
      name: faker.animal.petName(),
      category: category,
      photoUrls: [
        faker.image.url({ width: 640, height: 480 }),
        faker.image.url({ width: 640, height: 480 }),
      ],
      tags: tags,
      status: faker.helpers.arrayElement(statuses),
    };
  });
}
