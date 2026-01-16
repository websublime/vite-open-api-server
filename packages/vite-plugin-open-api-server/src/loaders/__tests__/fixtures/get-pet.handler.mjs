/**
 * Valid handler fixture for testing.
 * Exports an object mapping operationId → handler code.
 */
export default {
  // Static handler - code as string
  getPet: `
    const pet = store.get('Pet', req.params.petId);
    if (!pet) {
      return res['404'];
    }
    return pet;
  `,

  // Another static handler in the same file
  getPetById: `return store.get('Pet', req.params.petId);`,
};
