/**
 * Duplicate Pet Seed Fixture (subdirectory)
 *
 * This seed file has the same schema name as pets.seed.mjs in the parent directory.
 * Used to test duplicate seed detection and overwriting behavior.
 */

export default async function petSeedDuplicate(context) {
  const { faker } = context;

  return Array.from({ length: 3 }, (_, i) => ({
    id: i + 100,
    name: faker?.animal?.cat?.() ?? `Subdirectory Pet ${i + 1}`,
    status: 'pending',
    category: {
      id: 2,
      name: 'Cats',
    },
  }));
}
