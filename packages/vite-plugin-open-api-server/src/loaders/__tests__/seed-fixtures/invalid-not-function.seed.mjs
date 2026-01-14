/**
 * Invalid Seed Fixture - Not a Function
 *
 * This seed file exports a non-function default export.
 * Used to test that the seed loader properly validates exports.
 */

// Invalid: default export is not a function
export default {
  id: 1,
  name: 'Invalid Seed',
  data: 'This is not a function',
};
