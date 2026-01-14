/**
 * Duplicate handler fixture for testing.
 * This file has the same operationId as the parent get-pet.handler.mjs
 * Filename: get-pet.handler.mjs → operationId: getPet
 *
 * Used to test that duplicate operationIds are detected and warned about.
 */
export default async function handler(_context) {
  return {
    status: 200,
    body: { id: 2, name: 'Duplicate Fluffy', status: 'pending' },
  };
}
