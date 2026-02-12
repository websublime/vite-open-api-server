/**
 * Spec ID Derivation
 *
 * What: Functions to derive and validate spec identifiers
 * How: Slugifies explicit IDs or auto-derives from OpenAPI info.title
 * Why: Each spec instance needs a unique, URL-safe identifier for routing,
 *      DevTools grouping, logging, and default directory names
 *
 * @module spec-id
 */

import type { OpenAPIV3_1 } from '@scalar/openapi-types';

import { ValidationError } from './types.js';

/**
 * Slugify a string for use as a spec identifier
 *
 * Rules:
 * - Lowercase
 * - Replace spaces and special chars with hyphens
 * - Remove consecutive hyphens
 * - Trim leading/trailing hyphens
 *
 * @example
 * slugify("Swagger Petstore") → "swagger-petstore"
 * slugify("Billing API v2")   → "billing-api-v2"
 * slugify("café")             → "cafe"
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Derive a spec ID from the processed OpenAPI document
 *
 * Priority:
 * 1. Explicit id from config (if non-empty)
 * 2. Slugified info.title from the processed document
 *
 * @param explicitId - ID from SpecConfig.id (may be empty)
 * @param document - Processed OpenAPI document
 * @returns Stable, URL-safe spec identifier
 * @throws {ValidationError} SPEC_ID_MISSING if no ID can be derived (missing title and no explicit id)
 */
export function deriveSpecId(explicitId: string, document: OpenAPIV3_1.Document): string {
  if (explicitId.trim()) {
    return slugify(explicitId);
  }

  const title = document.info?.title;
  if (!title || !title.trim()) {
    throw new ValidationError(
      'SPEC_ID_MISSING',
      'Cannot derive spec ID: info.title is missing from the OpenAPI document. ' +
        'Please set an explicit id in the spec configuration.',
    );
  }

  return slugify(title);
}

/**
 * Validate spec IDs are unique across all specs
 *
 * Collects all duplicated IDs and reports them in a single error.
 *
 * @param ids - Array of resolved spec IDs
 * @throws {ValidationError} SPEC_ID_DUPLICATE if duplicate IDs found
 */
export function validateUniqueIds(ids: string[]): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
    }
    seen.add(id);
  }
  if (duplicates.size > 0) {
    const list = [...duplicates].join(', ');
    throw new ValidationError(
      'SPEC_ID_DUPLICATE',
      `Duplicate spec IDs: ${list}. Each spec must have a unique ID. ` +
        'Set explicit ids in spec configuration to resolve.',
    );
  }
}
