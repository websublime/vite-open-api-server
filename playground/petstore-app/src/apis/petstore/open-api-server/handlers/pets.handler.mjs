/**
 * Pet Handlers - Code-based handlers for Pet operations
 *
 * ## What
 * This file exports an object mapping operationId to JavaScript code strings
 * that will be injected as `x-handler` extensions into the OpenAPI spec.
 *
 * ## How
 * Each key is an operationId from the OpenAPI spec, and each value is a
 * JavaScript code string that Scalar Mock Server will execute. The code
 * has access to runtime helpers: `store`, `faker`, `req`, `res`, `seed`.
 *
 * ## Why
 * Custom handlers enable realistic mock responses that go beyond static
 * OpenAPI examples, allowing CRUD operations with an in-memory store.
 *
 * @see https://scalar.com/products/mock-server/custom-request-handler
 * @module handlers/pets
 */

/**
 * Pet operation handlers.
 *
 * Available Scalar runtime context:
 * - `store` - In-memory data store (list, get, create, update, delete)
 * - `faker` - Faker.js instance for generating fake data
 * - `req` - Request object (body, params, query, headers)
 * - `res` - Response helpers keyed by status code
 */
const handlers = {
  /**
   * GET /pet/findByStatus - Find pets by status
   */
  findPetsByStatus: `
    const status = req.query.status || 'available';
    const pets = store.list('Pet');
    return pets.filter(pet => pet.status === status);
  `,

  /**
   * GET /pet/findByTags - Find pets by tags
   */
  findPetsByTags: `
    const tags = req.query.tags || [];
    const tagArray = Array.isArray(tags) ? tags : [tags];
    const pets = store.list('Pet');

    if (tagArray.length === 0) {
      return pets;
    }

    return pets.filter(pet => {
      if (!pet.tags || !Array.isArray(pet.tags)) return false;
      return pet.tags.some(tag => tagArray.includes(tag.name));
    });
  `,

  /**
   * GET /pet/{petId} - Find pet by ID
   */
  getPetById: `
    const petId = parseInt(req.params.petId, 10);
    const pet = store.get('Pet', petId);

    if (!pet) {
      return res['404'];
    }

    return pet;
  `,

  /**
   * POST /pet - Add a new pet to the store
   */
  addPet: `
    const newPet = {
      id: faker.number.int({ min: 100, max: 99999 }),
      ...req.body,
      status: req.body.status || 'available'
    };

    store.create('Pet', newPet);
    return newPet;
  `,

  /**
   * PUT /pet - Update an existing pet
   */
  updatePet: `
    const petData = req.body;

    if (!petData.id) {
      return res['400'];
    }

    const existingPet = store.get('Pet', petData.id);

    if (!existingPet) {
      return res['404'];
    }

    const updatedPet = store.update('Pet', petData.id, petData);
    return updatedPet;
  `,

  /**
   * POST /pet/{petId} - Updates a pet with form data
   */
  updatePetWithForm: `
    const petId = parseInt(req.params.petId, 10);
    const pet = store.get('Pet', petId);

    if (!pet) {
      return res['404'];
    }

    const updates = {};
    if (req.query.name) updates.name = req.query.name;
    if (req.query.status) updates.status = req.query.status;

    const updatedPet = store.update('Pet', petId, { ...pet, ...updates });
    return updatedPet;
  `,

  /**
   * DELETE /pet/{petId} - Deletes a pet
   */
  deletePet: `
    const petId = parseInt(req.params.petId, 10);
    const pet = store.get('Pet', petId);

    if (!pet) {
      return res['404'];
    }

    store.delete('Pet', petId);
    return res['200'];
  `,

  /**
   * POST /pet/{petId}/uploadImage - Uploads an image
   */
  uploadFile: `
    const petId = parseInt(req.params.petId, 10);
    const pet = store.get('Pet', petId);

    if (!pet) {
      return res['404'];
    }

    return {
      code: 200,
      type: 'application/json',
      message: 'Image uploaded successfully for pet ' + petId
    };
  `,
};

export default handlers;
