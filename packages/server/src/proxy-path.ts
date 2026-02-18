/**
 * Proxy Path Auto-Detection
 *
 * What: Functions to derive and validate proxy paths for spec instances
 * How: Extracts path from explicit config or auto-derives from servers[0].url
 * Why: Each spec instance needs a unique, non-overlapping proxy path for
 *      Vite proxy configuration and request routing
 *
 * @module proxy-path
 */

import type { OpenAPIV3_1 } from '@scalar/openapi-types';

import type { ProxyPathSource } from './types.js';
import { ValidationError } from './types.js';

// =============================================================================
// Result Types
// =============================================================================

/**
 * Result of proxy path derivation
 *
 * Includes the normalized path and how it was determined,
 * so the startup banner can display "(auto-derived)" vs "(explicit)".
 */
export interface DeriveProxyPathResult {
  /** Normalized proxy path (e.g., "/api/v3") */
  proxyPath: string;
  /** How the path was determined */
  proxyPathSource: ProxyPathSource;
}

// =============================================================================
// deriveProxyPath()
// =============================================================================

/**
 * Derive the proxy path from config or OpenAPI document's servers field
 *
 * Priority:
 * 1. Explicit proxyPath from config (if non-empty after trimming)
 * 2. Path portion of servers[0].url
 *
 * Full URLs (e.g., "https://api.example.com/api/v3") have their path
 * extracted via the URL constructor. Relative paths (e.g., "/api/v3")
 * are used directly.
 *
 * @param explicitPath - proxyPath from SpecConfig (may be empty)
 * @param document - Processed OpenAPI document
 * @param specId - Spec ID for error messages
 * @returns Normalized proxy path with source indication
 * @throws {ValidationError} PROXY_PATH_MISSING if path cannot be derived
 * @throws {ValidationError} PROXY_PATH_TOO_BROAD if path resolves to "/" (e.g., "/", ".", "..")
 *
 * @example
 * // Explicit path
 * deriveProxyPath('/api/v3', document, 'petstore')
 * // → { proxyPath: '/api/v3', proxyPathSource: 'explicit' }
 *
 * @example
 * // Auto-derived from servers[0].url = "https://api.example.com/api/v3"
 * deriveProxyPath('', document, 'petstore')
 * // → { proxyPath: '/api/v3', proxyPathSource: 'auto' }
 */
export function deriveProxyPath(
  explicitPath: string,
  document: OpenAPIV3_1.Document,
  specId: string,
): DeriveProxyPathResult {
  if (explicitPath.trim()) {
    return {
      proxyPath: normalizeProxyPath(explicitPath.trim(), specId),
      proxyPathSource: 'explicit',
    };
  }

  const servers = document.servers;
  const serverUrl = servers?.[0]?.url?.trim();
  if (!serverUrl) {
    throw new ValidationError(
      'PROXY_PATH_MISSING',
      `[${specId}] Cannot derive proxyPath: no servers defined in the OpenAPI document. ` +
        'Set an explicit proxyPath in the spec configuration.',
    );
  }

  let path: string;
  let parsedUrl: URL | undefined;

  try {
    parsedUrl = new URL(serverUrl);
  } catch {
    // Not a full URL — treat as relative path
  }

  if (parsedUrl) {
    try {
      // Decode percent-encoded characters (e.g., URL constructor encodes
      // OpenAPI template variable braces: /{version} → /%7Bversion%7D)
      path = decodeURIComponent(parsedUrl.pathname);
    } catch {
      // Malformed percent-encoding — fall back to the raw pathname
      path = parsedUrl.pathname;
    }
  } else {
    path = serverUrl;
  }

  return {
    proxyPath: normalizeProxyPath(path, specId),
    proxyPathSource: 'auto',
  };
}

// =============================================================================
// normalizeProxyPath()
// =============================================================================

/**
 * Normalize and validate a proxy path
 *
 * Rules:
 * - Strip query strings and fragments
 * - Ensure leading slash
 * - Collapse consecutive slashes
 * - Resolve dot segments ("." and ".." per RFC 3986 §5.2.4)
 * - Remove trailing slash
 * - Reject "/" as too broad (would capture all requests)
 * - Reject bare dot-segments ("/." and "/..") as syntactically invalid
 *
 * @param path - Raw path string to normalize
 * @param specId - Spec ID for error messages
 * @returns Normalized path (e.g., "/api/v3")
 * @throws {ValidationError} PROXY_PATH_TOO_BROAD if path resolves to "/" (e.g., "/", ".", "..")
 *
 * @example
 * normalizeProxyPath('api/v3', 'petstore')   → '/api/v3'
 * normalizeProxyPath('/api/v3/', 'petstore') → '/api/v3'
 */
export function normalizeProxyPath(path: string, specId: string): string {
  // Trim leading/trailing whitespace (e.g., "  /api/v3  " → "/api/v3")
  path = path.trim();

  // Strip query string and fragment (e.g., "/api/v3?debug=true#section" → "/api/v3")
  const queryIdx = path.indexOf('?');
  const hashIdx = path.indexOf('#');
  const cutIdx = Math.min(
    queryIdx >= 0 ? queryIdx : path.length,
    hashIdx >= 0 ? hashIdx : path.length,
  );
  let normalized = path.slice(0, cutIdx);

  // Ensure leading slash
  normalized = normalized.startsWith('/') ? normalized : `/${normalized}`;

  // Collapse consecutive slashes (e.g., "//api//v3" → "/api/v3")
  normalized = normalized.replace(/\/{2,}/g, '/');

  // Resolve dot segments per RFC 3986 §5.2.4 (e.g., "/api/../v3" → "/v3")
  // HTTP clients canonicalize these, so proxy paths must match the resolved form
  const segments = normalized.split('/');
  const resolved: string[] = [];
  for (const segment of segments) {
    if (segment === '.') {
      continue;
    }
    if (segment === '..') {
      // Don't pop beyond root
      if (resolved.length > 1) {
        resolved.pop();
      }
      continue;
    }
    resolved.push(segment);
  }
  normalized = resolved.join('/') || '/';

  // Remove trailing slash (but not if path is just "/")
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  if (normalized === '/') {
    throw new ValidationError(
      'PROXY_PATH_TOO_BROAD',
      `[${specId}] proxyPath "/" is too broad — it would capture all requests. ` +
        'Set a more specific proxyPath (e.g., "/api/v1").',
    );
  }

  return normalized;
}

// =============================================================================
// validateUniqueProxyPaths()
// =============================================================================

/**
 * Validate proxy paths are unique and non-overlapping
 *
 * Checks for:
 * 1. Duplicate paths — two specs with the same proxyPath
 * 2. Overlapping paths — one path is a prefix of another (e.g., "/api" and "/api/v1")
 *    which would cause routing ambiguity
 *
 * @remarks
 * Entries with an empty or falsy `proxyPath` are silently skipped. These
 * represent specs whose proxy path has not yet been resolved (e.g., during
 * early option resolution before the OpenAPI document is processed). Callers
 * should expect unresolved entries to be excluded from uniqueness checks
 * rather than triggering false-positive PROXY_PATH_DUPLICATE or
 * PROXY_PATH_OVERLAP errors.
 *
 * @param specs - Array of spec entries with id and proxyPath.
 *   Entries with empty/falsy proxyPath are skipped (unresolved).
 * @throws {ValidationError} PROXY_PATH_DUPLICATE if duplicate paths found
 * @throws {ValidationError} PROXY_PATH_OVERLAP if overlapping paths found
 *
 * @example
 * // Throws PROXY_PATH_DUPLICATE
 * validateUniqueProxyPaths([
 *   { id: 'petstore', proxyPath: '/api/v3' },
 *   { id: 'inventory', proxyPath: '/api/v3' },
 * ]);
 *
 * @example
 * // Throws PROXY_PATH_OVERLAP
 * validateUniqueProxyPaths([
 *   { id: 'petstore', proxyPath: '/api' },
 *   { id: 'inventory', proxyPath: '/api/v1' },
 * ]);
 */
export function validateUniqueProxyPaths(specs: Array<{ id: string; proxyPath: string }>): void {
  const paths = new Map<string, string>();

  for (const spec of specs) {
    // Skip entries with empty proxyPath — they haven't been resolved yet
    if (!spec.proxyPath) {
      continue;
    }

    if (paths.has(spec.proxyPath)) {
      throw new ValidationError(
        'PROXY_PATH_DUPLICATE',
        `Duplicate proxyPath "${spec.proxyPath}" used by specs "${paths.get(spec.proxyPath)}" ` +
          `and "${spec.id}". Each spec must have a unique proxyPath.`,
      );
    }
    paths.set(spec.proxyPath, spec.id);
  }

  const sortedPaths = Array.from(paths.entries()).sort(([a], [b]) => a.length - b.length);
  for (let i = 0; i < sortedPaths.length; i++) {
    for (let j = i + 1; j < sortedPaths.length; j++) {
      const [shorter, shorterId] = sortedPaths[i];
      const [longer, longerId] = sortedPaths[j];
      if (longer.startsWith(`${shorter}/`)) {
        throw new ValidationError(
          'PROXY_PATH_OVERLAP',
          `Overlapping proxyPaths: "${shorter}" (${shorterId}) is a prefix of ` +
            `"${longer}" (${longerId}). This would cause routing ambiguity.`,
        );
      }
    }
  }
}
