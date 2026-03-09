/**
 * Shared test helper for creating mock SpecInfo entries
 *
 * @module components/__tests__/helpers/mockSpec
 */

import type { SpecInfo } from '../../../stores/specs';

/**
 * Create a mock SpecInfo entry
 */
export function createMockSpec(overrides: Partial<SpecInfo> = {}): SpecInfo {
  return {
    id: 'petstore',
    title: 'Petstore API',
    version: '1.0.0',
    proxyPath: '/api/petstore',
    color: '#4ade80',
    endpointCount: 10,
    schemaCount: 5,
    ...overrides,
  };
}
