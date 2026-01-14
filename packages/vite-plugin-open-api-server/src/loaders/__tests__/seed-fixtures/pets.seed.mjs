/**
 * Valid Pet Seed Fixture
 *
 * Example seed file for testing the seed loader.
 * Exports a valid async function matching SeedCodeGenerator signature.
 */

export default async function petSeed(context) {
  const { faker } = context;

  return Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    name: faker?.animal?.dog?.() ?? `Pet ${i + 1}`,
    status: 'available',
    category: {
      id: 1,
      name: 'Dogs',
    },
  }));
}
