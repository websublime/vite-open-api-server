/**
 * Valid Pet Seed Fixture
 *
 * Example seed file for testing the seed loader.
 * Exports an object mapping schemaName to seed values.
 */

export default {
  // Static seed - code as string
  Pet: `
    seed.count(15, () => ({
      id: faker.number.int({ min: 1, max: 10000 }),
      name: faker.animal.dog(),
      status: faker.helpers.arrayElement(['available', 'pending', 'sold']),
      category: {
        id: faker.number.int({ min: 1, max: 5 }),
        name: faker.helpers.arrayElement(['Dogs', 'Cats', 'Birds'])
      },
      photoUrls: [faker.image.url()],
      tags: [{ id: faker.number.int({ min: 1, max: 100 }), name: faker.word.adjective() }]
    }))
  `,

  // Dynamic seed - function that generates code based on schema context
  Category: ({ schema }) => {
    const hasDescription = schema?.properties?.description;

    const code = `
    seed([
      { id: 1, name: 'Dogs'${hasDescription ? ", description: 'Man\\'s best friend'" : ''} },
      { id: 2, name: 'Cats'${hasDescription ? ", description: 'Independent companions'" : ''} },
      { id: 3, name: 'Birds'${hasDescription ? ", description: 'Feathered friends'" : ''} },
      { id: 4, name: 'Fish'${hasDescription ? ", description: 'Aquatic pets'" : ''} },
      { id: 5, name: 'Reptiles'${hasDescription ? ", description: 'Cold-blooded companions'" : ''} }
    ])
    `;

    return code;
  },
};
