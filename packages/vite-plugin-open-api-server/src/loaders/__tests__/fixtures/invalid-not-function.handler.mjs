/**
 * Invalid handler fixture for testing.
 * Default export is not a function (it's an object).
 */
export default {
  handler: async (_context) => {
    return {
      status: 200,
      body: { error: 'This should not work' },
    };
  },
  name: 'invalidHandler',
};
