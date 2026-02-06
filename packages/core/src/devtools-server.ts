/**
 * DevTools Static File Server
 *
 * What: Serves the DevTools SPA as static files from the Hono server
 * How: Reads files from a provided directory path and serves with correct MIME types
 * Why: The DevTools SPA is embedded in Vue DevTools via iframe pointing to /_devtools/
 *
 * @module devtools-server
 */

import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import type { Hono } from 'hono';

import { generateDevToolsHtml } from './devtools-template.js';

/**
 * MIME type mapping for static assets served by the DevTools SPA
 */
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * Options for mounting DevTools routes
 */
export interface MountDevToolsOptions {
  /**
   * Absolute path to the DevTools SPA build directory
   * Should contain index.html and an assets/ subdirectory
   * When not provided, falls back to a placeholder page
   */
  spaDir?: string;

  /**
   * Logger for warnings and debug messages
   */
  logger?: { warn?: (...args: unknown[]) => void };
}

/**
 * Mount DevTools routes on a Hono app
 *
 * When `spaDir` is provided, serves the built SPA with static file handling:
 * - `/_devtools/assets/*` → static files with immutable cache headers
 * - `/_devtools/*` → SPA fallback (serves index.html for client-side routing)
 *
 * When `spaDir` is not provided, serves a placeholder page with links to the API.
 *
 * @param app - Hono application instance
 * @param options - Mount options
 */
export function mountDevToolsRoutes(app: Hono, options: MountDevToolsOptions): void {
  const { spaDir, logger } = options;

  // Redirect /_devtools to /_devtools/
  app.get('/_devtools', (c) => c.redirect('/_devtools/', 302));

  if (spaDir) {
    const resolvedSpaDir = resolve(spaDir);
    const spaDirPrefix = resolvedSpaDir.endsWith(sep) ? resolvedSpaDir : resolvedSpaDir + sep;

    // Serve static assets with immutable cache headers
    app.get('/_devtools/assets/*', async (c) => {
      const relativePath = c.req.path.replace('/_devtools/', '');
      const filePath = normalize(join(resolvedSpaDir, relativePath));

      // Path traversal protection: ensure resolved file is inside spaDir
      if (!filePath.startsWith(spaDirPrefix) && filePath !== resolvedSpaDir) {
        return c.notFound();
      }

      try {
        const content = await readFile(filePath);
        const ext = extname(filePath);
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        c.header('Content-Type', contentType);
        // Hashed filenames are safe to cache indefinitely
        c.header('Cache-Control', 'public, max-age=31536000, immutable');
        return c.body(content);
      } catch {
        return c.notFound();
      }
    });

    // SPA fallback: serve index.html for all other /_devtools/ routes
    // This supports client-side hash routing within the SPA
    app.get('/_devtools/*', async (c) => {
      try {
        const indexPath = join(resolvedSpaDir, 'index.html');
        const content = await readFile(indexPath, 'utf-8');

        c.header('Content-Type', 'text/html; charset=utf-8');
        // index.html should not be cached to ensure fresh loads
        c.header('Cache-Control', 'no-cache');
        return c.html(content);
      } catch {
        // Fall back to placeholder if index.html is not found
        const html = generateDevToolsHtml();
        return c.html(html);
      }
    });
  } else {
    // No SPA directory provided — serve placeholder
    app.get('/_devtools/', (c) => {
      logger?.warn?.(
        '[DevTools] Serving development placeholder. Install @websublime/vite-plugin-open-api-devtools for the full DevTools SPA.',
      );
      c.header('Cache-Control', 'public, max-age=3600');
      return c.html(generateDevToolsHtml());
    });

    app.get('/_devtools/*', (c) => c.redirect('/_devtools/', 302));
  }
}
