/**
 * Invalid Seed Fixture - Function Export (Not Object)
 *
 * This seed file exports a function as default export, which is invalid.
 * Seed files must export a plain object mapping schemaName to seed values.
 * Used to test that the seed loader properly validates exports.
 */

// Invalid: default export is a function, not an object
export default async function invalidSeed(_context) {
  return [
    { id: 1, name: 'Invalid Seed 1' },
    { id: 2, name: 'Invalid Seed 2' },
  ];
}
