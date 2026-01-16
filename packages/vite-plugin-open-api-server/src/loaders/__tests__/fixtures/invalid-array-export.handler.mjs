/**
 * Invalid handler fixture for testing.
 * Default export is an array, which is not a valid handler exports format.
 * Handler files must export a plain object mapping operationId → handler value.
 */
export default [
  { operationId: 'getPet', code: 'return store.get("Pet", req.params.petId);' },
  { operationId: 'addPet', code: 'return store.create("Pet", req.body);' },
];
