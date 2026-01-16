/**
 * Store Handlers - Code-based handlers for Store operations
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
 * Custom handlers enable realistic mock responses for store/order operations,
 * allowing order management with an in-memory store.
 *
 * @see https://scalar.com/products/mock-server/custom-request-handler
 * @module handlers/store
 */

/**
 * Store operation handlers.
 *
 * Available Scalar runtime context:
 * - `store` - In-memory data store (list, get, create, update, delete)
 * - `faker` - Faker.js instance for generating fake data
 * - `req` - Request object (body, params, query, headers)
 * - `res` - Response helpers keyed by status code
 */
const handlers = {
  /**
   * GET /store/inventory - Returns pet inventories by status
   */
  getInventory: `
    const pets = store.list('Pet');
    const inventory = {
      available: 0,
      pending: 0,
      sold: 0
    };

    for (const pet of pets) {
      if (pet.status && inventory.hasOwnProperty(pet.status)) {
        inventory[pet.status]++;
      }
    }

    return inventory;
  `,

  /**
   * POST /store/order - Place an order for a pet
   */
  placeOrder: `
    const orderData = req.body;

    const newOrder = {
      id: faker.number.int({ min: 1, max: 99999 }),
      petId: orderData.petId || faker.number.int({ min: 1, max: 100 }),
      quantity: orderData.quantity || 1,
      shipDate: orderData.shipDate || new Date().toISOString(),
      status: orderData.status || 'placed',
      complete: orderData.complete || false
    };

    store.create('Order', newOrder);
    return newOrder;
  `,

  /**
   * GET /store/order/{orderId} - Find purchase order by ID
   */
  getOrderById: `
    const orderId = parseInt(req.params.orderId, 10);
    const order = store.get('Order', orderId);

    if (!order) {
      return res['404'];
    }

    return order;
  `,

  /**
   * DELETE /store/order/{orderId} - Delete purchase order by ID
   */
  deleteOrder: `
    const orderId = parseInt(req.params.orderId, 10);
    const order = store.get('Order', orderId);

    if (!order) {
      return res['404'];
    }

    store.delete('Order', orderId);
    return res['200'];
  `,
};

export default handlers;
