/**
 * Duplicate handler fixture for testing.
 * This file exports a handler with the same operationId as the parent get-pet.handler.mjs
 *
 * Used to test that duplicate operationIds are detected and warned about.
 */
export default {
  // Same operationId as parent directory's get-pet.handler.mjs
  getPet: `
    // This is the subdirectory version
    const pet = store.get('Pet', req.params.petId);
    return pet || { id: 2, name: 'Duplicate Fluffy', status: 'pending' };
  `,
};
