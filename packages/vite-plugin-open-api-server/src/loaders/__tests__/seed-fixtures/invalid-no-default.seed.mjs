/**
 * Invalid Seed Fixture - No Default Export
 *
 * This seed file is intentionally invalid because it does not
 * export a default function. Used for testing error handling.
 */

export const namedExport = async (_context) => [{ id: 1, name: 'Test' }];

export function anotherNamedExport() {
  return [];
}
