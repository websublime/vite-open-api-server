/**
 * Registry Module Exports
 *
 * Re-exports all public APIs from the registry builder and serializer modules.
 *
 * @module
 */

export {
  type BuildRegistryResult,
  buildRegistry,
  generateEndpointKey,
  type RegistryBuildStats,
} from './registry-builder.js';

export {
  type RegistryMeta,
  type RegistryStatistics,
  type SerializedEndpoint,
  type SerializedRegistry,
  type SerializedSchema,
  type SerializedSecurityScheme,
  type SerializeRegistryOptions,
  serializeRegistry,
} from './registry-serializer.js';
