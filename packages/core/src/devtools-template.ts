/**
 * DevTools HTML Template
 *
 * What: Generates the HTML template for the DevTools SPA placeholder
 * How: Template function that injects the server port into the HTML
 * Why: Separates HTML generation from routing logic for better maintainability
 *
 * @module devtools-template
 */

/**
 * Generate the DevTools HTML page
 *
 * This generates a minimal HTML page that will eventually serve the full
 * DevTools SPA. Currently serves a placeholder with links to the API endpoints.
 * The WebSocket URL is dynamically constructed from window.location at runtime.
 *
 * @returns Complete HTML document as string
 */
export function generateDevToolsHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="OpenAPI DevTools - Debug and inspect your mock API server" />
    <title>OpenAPI DevTools</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234f46e5' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'/></svg>" />
    <style>
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        background: #0f172a;
        color: #e2e8f0;
      }
      #app {
        min-height: 100vh;
      }
      .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        flex-direction: column;
        gap: 1rem;
      }
      .spinner {
        width: 48px;
        height: 48px;
        border: 3px solid rgba(79, 70, 229, 0.2);
        border-radius: 50%;
        border-top-color: #4f46e5;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <div id="app">
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading OpenAPI DevTools...</p>
      </div>
    </div>
    <script type="module">
      // Import Vue and other dependencies from CDN
      // NOTE: These CDN version pins are intentionally aligned with packages/devtools-client/package.json
      // and must be updated in tandem. When upgrading Vue, Pinia, or Vue Router in devtools-client,
      // update these URLs to match the same versions to ensure compatibility.
      import { createApp } from 'https://unpkg.com/vue@3.5.17/dist/vue.esm-browser.prod.js';
      import { createPinia } from 'https://unpkg.com/pinia@3.0.3/dist/pinia.esm-browser.js';
      import { createRouter, createWebHistory } from 'https://unpkg.com/vue-router@4.5.1/dist/vue-router.esm-browser.js';

      // Note: This is a minimal bootstrap for development
      // In production, we would serve the full built SPA with all dependencies bundled

      const app = createApp({
        template: \`
          <div style="padding: 2rem; text-align: center;">
            <h1 style="color: #4f46e5; margin-bottom: 1rem;">OpenAPI DevTools</h1>
            <p style="margin-bottom: 2rem;">The full DevTools SPA will be served here.</p>
            <p style="color: #94a3b8; font-size: 0.875rem;">
              For now, access the DevTools pages directly:<br/>
              <a href="/_api/registry" style="color: #4f46e5; text-decoration: none;">Registry</a> |
              <a href="/_api/timeline" style="color: #4f46e5; text-decoration: none;">Timeline</a> |
              <a href="/_api/store" style="color: #4f46e5; text-decoration: none;">Store</a>
            </p>
            <p style="color: #94a3b8; font-size: 0.875rem; margin-top: 2rem;">
              WebSocket: <code style="background: rgba(255,255,255,0.1); padding: 0.25rem 0.5rem; border-radius: 0.25rem;">\${window.location.protocol === 'https:' ? 'wss' : 'ws'}://\${window.location.host}/_ws</code>
            </p>
          </div>
        \`
      });

      const pinia = createPinia();
      const router = createRouter({
        history: createWebHistory('/_devtools/'),
        routes: []
      });

      app.use(pinia);
      app.use(router);
      app.mount('#app');
    </script>
  </body>
</html>`;
}
