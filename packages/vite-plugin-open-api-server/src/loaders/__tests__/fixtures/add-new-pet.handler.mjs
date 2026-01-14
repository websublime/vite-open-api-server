/**
 * Valid handler fixture for testing kebab-case to camelCase conversion.
 * Filename: add-new-pet.handler.mjs → operationId: addNewPet
 */
export default async function handler(context) {
  const { body, logger } = context;

  logger.info(`Creating new pet: ${body?.name}`);

  return {
    status: 201,
    body: {
      id: Date.now(),
      name: body?.name || 'Unknown',
      status: body?.status || 'available',
    },
    headers: {
      'X-Created-At': new Date().toISOString(),
    },
  };
}
