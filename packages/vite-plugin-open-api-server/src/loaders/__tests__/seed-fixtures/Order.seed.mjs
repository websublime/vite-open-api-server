/**
 * Valid Order Seed Fixture
 *
 * Example seed file for testing the seed loader.
 * Uses PascalCase filename to match schema name directly.
 * Exports a valid async function matching SeedCodeGenerator signature.
 */

export default async function orderSeed(context) {
  const { faker } = context;

  return Array.from({ length: 3 }, (_, i) => ({
    id: i + 1,
    petId: i + 100,
    quantity: (i + 1) * 2,
    shipDate: faker?.date?.future?.()?.toISOString() ?? '2026-01-15T00:00:00.000Z',
    status: 'placed',
    complete: false,
  }));
}
