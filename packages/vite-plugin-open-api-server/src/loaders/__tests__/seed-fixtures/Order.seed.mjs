/**
 * Valid Order Seed Fixture
 *
 * Example seed file for testing the seed loader.
 * Exports an object mapping schemaName to seed values.
 * Uses dynamic seed that generates code based on available schemas.
 */

export default {
  // Dynamic seed - function that generates code based on schema context
  Order: ({ schemas }) => {
    const hasPet = 'Pet' in schemas;

    return `
      seed.count(20, (index) => ({
        id: faker.number.int({ min: 1, max: 10000 }),
        petId: ${hasPet ? 'store.list("Pet")[index % 15]?.id' : 'faker.number.int({ min: 1, max: 100 })'},
        quantity: faker.number.int({ min: 1, max: 5 }),
        shipDate: faker.date.future().toISOString(),
        status: faker.helpers.arrayElement(['placed', 'approved', 'delivered']),
        complete: faker.datatype.boolean()
      }))
    `;
  },
};
