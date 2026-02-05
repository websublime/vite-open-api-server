/**
 * Pet Seeds
 *
 * What: Seed data for Pet-related schemas
 * How: Generates realistic test data using Faker
 * Why: Populates the store with initial data for testing
 */

import { defineSeeds } from '@websublime/vite-plugin-open-api-server';

export default defineSeeds({
  /**
   * Category seed
   * Fixed categories for pets
   */
  Category: ({ seed }) =>
    seed([
      { id: 1, name: 'Dogs' },
      { id: 2, name: 'Cats' },
      { id: 3, name: 'Birds' },
      { id: 4, name: 'Fish' },
      { id: 5, name: 'Reptiles' },
      { id: 6, name: 'Small Animals' },
    ]),

  /**
   * Tag seed
   * Common tags for pets
   */
  Tag: ({ seed }) =>
    seed([
      { id: 1, name: 'friendly' },
      { id: 2, name: 'playful' },
      { id: 3, name: 'energetic' },
      { id: 4, name: 'calm' },
      { id: 5, name: 'trained' },
      { id: 6, name: 'vaccinated' },
      { id: 7, name: 'neutered' },
      { id: 8, name: 'puppy' },
      { id: 9, name: 'senior' },
      { id: 10, name: 'rescue' },
    ]),

  /**
   * Pet seed
   * Generates 20 random pets with realistic data
   */
  Pet: ({ seed, faker }) =>
    seed.count(20, (index) => {
      const petTypes = [
        { type: 'dog', category: 1, names: ['Max', 'Bella', 'Charlie', 'Luna', 'Cooper'] },
        { type: 'cat', category: 2, names: ['Whiskers', 'Mittens', 'Shadow', 'Simba', 'Luna'] },
        { type: 'bird', category: 3, names: ['Tweety', 'Polly', 'Rio', 'Sky', 'Blue'] },
        { type: 'fish', category: 4, names: ['Nemo', 'Dory', 'Goldie', 'Bubbles', 'Finn'] },
        {
          type: 'reptile',
          category: 5,
          names: ['Rex', 'Spike', 'Scales', 'Slither', 'Godzilla'],
        },
      ];

      const selectedType = faker.helpers.arrayElement(petTypes);
      const petName = faker.helpers.arrayElement(selectedType.names);

      return {
        id: index + 1,
        name: `${petName} ${faker.number.int({ min: 1, max: 999 })}`,
        category: {
          id: selectedType.category,
          name: faker.helpers.arrayElement(['Dogs', 'Cats', 'Birds', 'Fish', 'Reptiles']),
        },
        photoUrls: [
          faker.image.urlLoremFlickr({ category: 'animals' }),
          faker.image.urlLoremFlickr({ category: 'pets' }),
        ],
        tags: faker.helpers
          .arrayElements(
            [
              { id: 1, name: 'friendly' },
              { id: 2, name: 'playful' },
              { id: 3, name: 'energetic' },
              { id: 4, name: 'calm' },
              { id: 5, name: 'trained' },
              { id: 6, name: 'vaccinated' },
            ],
            { min: 1, max: 3 },
          ),
        status: faker.helpers.arrayElement(['available', 'pending', 'sold']),
      };
    }),

  /**
   * Order seed
   * Generates 10 orders referencing existing pets
   */
  Order: ({ seed, store, faker }) =>
    seed.count(10, (index) => {
      const pets = store.list('Pet');
      const randomPet = faker.helpers.arrayElement(pets) as { id: number };

      return {
        id: index + 1,
        petId: randomPet?.id || 1,
        quantity: faker.number.int({ min: 1, max: 3 }),
        shipDate: faker.date.future().toISOString(),
        status: faker.helpers.arrayElement(['placed', 'approved', 'delivered']),
        complete: faker.datatype.boolean(),
      };
    }),

  /**
   * User seed
   * Generates 5 sample users
   */
  User: ({ seed, faker }) =>
    seed.count(5, (index) => ({
      id: index + 1,
      username: faker.internet.username(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      password: 'password123', // Demo password
      phone: faker.phone.number(),
      userStatus: faker.number.int({ min: 0, max: 2 }),
    })),
});
