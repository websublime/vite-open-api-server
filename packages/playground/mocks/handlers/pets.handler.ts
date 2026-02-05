/**
 * Pet Handlers
 *
 * What: Custom handler functions for Pet endpoints
 * How: Implements business logic for pet operations
 * Why: Demonstrates custom handler capabilities
 */

import { defineHandlers } from '@websublime/vite-plugin-open-api-server';

export default defineHandlers({
  /**
   * Get pet by ID
   * Custom logic: Returns 404 if pet not found
   */
  getPetById: ({ req, store, logger }) => {
    const petId = Number.parseInt(req.params.petId as string, 10);

    logger.info(`Fetching pet with ID: ${petId}`);

    const pet = store.get('Pet', petId);

    if (!pet) {
      logger.warn(`Pet with ID ${petId} not found`);
      return {
        type: 'status',
        status: 404,
        data: { message: `Pet with ID ${petId} not found` },
      };
    }

    return { type: 'raw', data: pet };
  },

  /**
   * Find pets by status
   * Custom logic: Filters pets by status with case-insensitive matching
   */
  findPetsByStatus: ({ req, store, logger }) => {
    const status = (req.query.status as string)?.toLowerCase() || 'available';

    logger.info(`Finding pets with status: ${status}`);

    const allPets = store.list('Pet');
    const filteredPets = allPets.filter(
      (pet: any) => pet.status?.toLowerCase() === status,
    );

    logger.info(`Found ${filteredPets.length} pets with status ${status}`);

    return { type: 'raw', data: filteredPets };
  },

  /**
   * Add a new pet
   * Custom logic: Validates required fields and generates ID
   */
  addPet: ({ req, store, faker, logger }) => {
    const body = req.body as any;

    // Validate required fields
    if (!body.name || !body.photoUrls) {
      logger.error('Missing required fields: name and photoUrls');
      return {
        type: 'status',
        status: 400,
        data: { message: 'Missing required fields: name and photoUrls' },
      };
    }

    // Create new pet with generated ID
    const newPet = {
      id: faker.number.int({ min: 1000, max: 9999 }),
      name: body.name,
      category: body.category || { id: 1, name: 'Unknown' },
      photoUrls: body.photoUrls,
      tags: body.tags || [],
      status: body.status || 'available',
    };

    store.create('Pet', newPet);

    logger.info(`Created new pet: ${newPet.name} (ID: ${newPet.id})`);

    return {
      type: 'status',
      status: 201,
      data: newPet,
    };
  },

  /**
   * Update an existing pet
   * Custom logic: Validates pet exists before update
   */
  updatePet: ({ req, store, logger }) => {
    const body = req.body as any;

    if (!body.id) {
      logger.error('Missing pet ID in request body');
      return {
        type: 'status',
        status: 400,
        data: { message: 'Pet ID is required' },
      };
    }

    const existingPet = store.get('Pet', body.id);

    if (!existingPet) {
      logger.warn(`Pet with ID ${body.id} not found for update`);
      return {
        type: 'status',
        status: 404,
        data: { message: `Pet with ID ${body.id} not found` },
      };
    }

    const updatedPet = store.update('Pet', body.id, body);

    logger.info(`Updated pet: ${updatedPet.name} (ID: ${updatedPet.id})`);

    return {
      type: 'full',
      status: 200,
      data: updatedPet,
      headers: {
        'X-Updated-At': new Date().toISOString(),
      },
    };
  },

  /**
   * Delete a pet
   * Custom logic: Returns 404 if pet doesn't exist
   */
  deletePet: ({ req, store, logger }) => {
    const petId = Number.parseInt(req.params.petId as string, 10);

    logger.info(`Attempting to delete pet with ID: ${petId}`);

    const pet = store.get('Pet', petId);

    if (!pet) {
      logger.warn(`Pet with ID ${petId} not found for deletion`);
      return {
        type: 'status',
        status: 404,
        data: { message: `Pet with ID ${petId} not found` },
      };
    }

    store.delete('Pet', petId);

    logger.info(`Deleted pet with ID: ${petId}`);

    return {
      type: 'status',
      status: 200,
      data: { message: 'Pet deleted successfully' },
    };
  },
});
