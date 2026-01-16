/**
 * User Handlers - Code-based handlers for User operations
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
 * Custom handlers enable realistic mock responses for user operations,
 * allowing user management with an in-memory store.
 *
 * @see https://scalar.com/products/mock-server/custom-request-handler
 * @module handlers/users
 */

/**
 * User operation handlers.
 *
 * Available Scalar runtime context:
 * - `store` - In-memory data store (list, get, create, update, delete)
 * - `faker` - Faker.js instance for generating fake data
 * - `req` - Request object (body, params, query, headers)
 * - `res` - Response helpers keyed by status code
 */
const handlers = {
  /**
   * POST /user - Create user
   */
  createUser: `
    const userData = req.body;

    const newUser = {
      id: faker.number.int({ min: 1, max: 99999 }),
      username: userData.username || faker.internet.username(),
      firstName: userData.firstName || faker.person.firstName(),
      lastName: userData.lastName || faker.person.lastName(),
      email: userData.email || faker.internet.email(),
      password: userData.password || faker.internet.password(),
      phone: userData.phone || faker.phone.number(),
      userStatus: userData.userStatus || 1
    };

    store.create('User', newUser);
    return newUser;
  `,

  /**
   * POST /user/createWithList - Creates list of users with given input array
   */
  createUsersWithListInput: `
    const users = req.body || [];
    const createdUsers = [];

    for (const userData of users) {
      const newUser = {
        id: faker.number.int({ min: 1, max: 99999 }),
        ...userData
      };
      store.create('User', newUser);
      createdUsers.push(newUser);
    }

    return createdUsers.length > 0 ? createdUsers[createdUsers.length - 1] : null;
  `,

  /**
   * GET /user/login - Logs user into the system
   */
  loginUser: `
    const username = req.query.username;
    const password = req.query.password;

    if (!username || !password) {
      return res['400'];
    }

    const users = store.list('User');
    const user = users.find(u => u.username === username);

    if (!user) {
      return res['400'];
    }

    // Generate session token
    const token = 'session-' + faker.string.alphanumeric(32);

    return token;
  `,

  /**
   * GET /user/logout - Logs out current logged in user session
   */
  logoutUser: `
    return res['200'];
  `,

  /**
   * GET /user/{username} - Get user by username
   */
  getUserByName: `
    const username = req.params.username;
    const users = store.list('User');
    const user = users.find(u => u.username === username);

    if (!user) {
      return res['404'];
    }

    return user;
  `,

  /**
   * PUT /user/{username} - Update user
   */
  updateUser: `
    const username = req.params.username;
    const userData = req.body;
    const users = store.list('User');
    const user = users.find(u => u.username === username);

    if (!user) {
      return res['404'];
    }

    const updatedUser = store.update('User', user.id, { ...user, ...userData });
    return updatedUser;
  `,

  /**
   * DELETE /user/{username} - Delete user
   */
  deleteUser: `
    const username = req.params.username;
    const users = store.list('User');
    const user = users.find(u => u.username === username);

    if (!user) {
      return res['404'];
    }

    store.delete('User', user.id);
    return res['200'];
  `,
};

export default handlers;
