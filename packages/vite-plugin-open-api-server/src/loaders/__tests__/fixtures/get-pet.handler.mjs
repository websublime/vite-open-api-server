/**
 * Valid handler fixture for testing.
 * Filename: get-pet.handler.mjs → operationId: getPet
 */
export default async function handler(_context) {
  return {
    status: 200,
    body: { id: 1, name: 'Fluffy', status: 'available' },
  };
}
