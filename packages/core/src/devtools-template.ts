/**
 * DevTools HTML Template
 *
 * What: Generates the HTML template for the DevTools SPA placeholder
 * How: Template function that produces a static HTML page (no external dependencies)
 * Why: Separates HTML generation from routing logic for better maintainability
 *
 * @module devtools-template
 */

/**
 * Generate the DevTools HTML page
 *
 * This generates a static HTML page that serves as a placeholder when the
 * built DevTools SPA is not available. It does not load any external
 * resources (no CDN imports) to avoid supply-chain risk and work in
 * air-gapped environments.
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
      .container {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        flex-direction: column;
        gap: 1.5rem;
        padding: 2rem;
        text-align: center;
      }
      .icon {
        width: 64px;
        height: 64px;
        opacity: 0.6;
      }
      h1 {
        color: #4f46e5;
        margin: 0;
        font-size: 1.5rem;
      }
      p {
        margin: 0;
        color: #94a3b8;
        font-size: 0.875rem;
        line-height: 1.6;
        max-width: 480px;
      }
      code {
        background: rgba(255, 255, 255, 0.1);
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.8125rem;
      }
      a {
        color: #4f46e5;
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
      .links {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        justify-content: center;
      }
      .build-hint {
        color: #ef4444;
        font-size: 0.75rem;
        padding: 0.5rem 1rem;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 0.25rem;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
      <h1>OpenAPI DevTools</h1>
      <p class="build-hint">
        The DevTools SPA is not built yet. Run <code>pnpm build</code> to enable the full DevTools UI.
      </p>
      <p>In the meantime, you can access the API endpoints directly:</p>
      <div class="links">
        <a href="/_api/registry">Registry</a>
        <a href="/_api/timeline">Timeline</a>
        <a href="/_api/store">Store</a>
        <a href="/_api/health">Health</a>
        <a href="/_api/document">Document</a>
      </div>
    </div>
  </body>
</html>`;
}
