/**
 * Duplicate Pet Seed Fixture (subdirectory)
 *
 * This seed file has the same schema name (Pet) as pets.seed.mjs in the parent directory.
 * Used to test duplicate seed detection and overwriting behavior.
 * Exports an object mapping schemaName to seed values.
 */

export default {
  // Static seed - will override the Pet seed from parent directory
  Pet: `
    seed.count(3, () => ({
      id: faker.number.int({ min: 100, max: 200 }),
      name: faker.animal.cat(),
      status: 'pending',
      category: {
        id: 2,
        name: 'Cats'
      },
      photoUrls: [faker.image.url()],
      tags: []
    }))
  `,
};
