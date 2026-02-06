/**
 * Copy DevTools SPA Build
 *
 * What: Copies the devtools-client SPA build into the server package dist
 * How: Uses Node.js fs.cpSync to recursively copy dist/spa/ → dist/devtools-spa/
 * Why: The SPA must be shipped inside the server package for npm publishing
 *      so consumers don't need to install the devtools-client separately
 */

import { cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const source = join(__dirname, '..', '..', 'devtools-client', 'dist', 'spa');
const destination = join(__dirname, '..', 'dist', 'devtools-spa');

if (!existsSync(source)) {
  // biome-ignore lint/suspicious/noConsole: Build script needs console output
  console.warn(
    '[copy-devtools-spa] Source not found:',
    source,
    '\nSkipping SPA copy. Build devtools-client first: pnpm --filter @websublime/vite-plugin-open-api-devtools build',
  );
  process.exit(0);
}

cpSync(source, destination, { recursive: true });
// biome-ignore lint/suspicious/noConsole: Build script needs console output
console.log('[copy-devtools-spa] Copied DevTools SPA to dist/devtools-spa/');
