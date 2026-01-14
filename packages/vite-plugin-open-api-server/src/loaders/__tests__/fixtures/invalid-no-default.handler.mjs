/**
 * Invalid handler fixture for testing.
 * This file is missing the required default export.
 */
export function namedHandler(_context) {
  return {
    status: 200,
    body: { error: 'This should not work' },
  };
}

export const anotherExport = 'test';
