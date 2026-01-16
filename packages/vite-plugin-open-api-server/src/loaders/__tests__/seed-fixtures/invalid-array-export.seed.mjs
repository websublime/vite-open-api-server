/**
 * Invalid Seed Fixture - Array Export
 *
 * This seed file exports an array as default export, which is invalid.
 * Seed files must export a plain object mapping schemaName to seed values.
 * Used to test that the seed loader properly validates exports.
 */

// Invalid: default export is an array, not an object
export default [
  { schemaName: 'Pet', code: 'seed([{ id: 1, name: "Test Pet" }])' },
  { schemaName: 'Order', code: 'seed([{ id: 1, petId: 1 }])' },
];
