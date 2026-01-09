<script setup lang="ts">
/**
 * Root Application Component
 *
 * This is the root Vue 3 Single File Component (SFC) for the Petstore playground
 * application. It serves as the main container for demonstrating the OpenAPI mock
 * server plugin integration.
 *
 * Uses Vue 3's Composition API with `script setup` for a clean, concise component
 * definition. The template displays placeholder content indicating the plugin status
 * and mock server availability.
 *
 * Provides visual confirmation that:
 * - The Vue application is running correctly
 * - The Vite development server is operational
 * - The OpenAPI mock server plugin is configured
 * - The workspace:* dependency linking is working
 *
 * @remarks
 * Currently empty as this is a placeholder component.
 * Future implementations will add:
 * - API fetch demonstrations
 * - Mock server status indicators
 * - Interactive API testing UI
 */
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>🐾 Petstore API Mock Server</h1>
      <p class="subtitle">Powered by @websublime/vite-plugin-open-api-server</p>
    </header>

    <main class="main">
      <section class="status-card">
        <h2>✅ Plugin Loaded</h2>
        <p>The OpenAPI mock server plugin is configured and ready.</p>
        <p class="mock-url">
          Mock server will be available at:
          <code>http://localhost:3456</code>
        </p>
      </section>

      <section class="info-card">
        <h2>📖 OpenAPI Specification</h2>
        <p>Using the Swagger Petstore API specification to generate mock responses.</p>
        <ul>
          <li><strong>Spec Path:</strong> <code>./src/apis/petstore/petstore.openapi.yaml</code></li>
          <li><strong>API Prefix:</strong> <code>/api/v3</code></li>
          <li><strong>Handlers Dir:</strong> <code>./src/apis/petstore/open-api-server/handlers</code></li>
          <li><strong>Seeds Dir:</strong> <code>./src/apis/petstore/open-api-server/seeds</code></li>
        </ul>
      </section>

      <section class="dev-card">
        <h2>🔧 Development</h2>
        <p>Edit <code>src/App.vue</code> to start building your API testing interface.</p>
      </section>
    </main>

    <footer class="footer">
      <p>Built with Vue 3 + Vite + OpenAPI Mock Server</p>
    </footer>
  </div>
</template>

<style scoped>
/**
 * Scoped styles for the root App component.
 * Uses modern CSS features with a clean, minimal design.
 * Scoped styles ensure these rules only apply to this component.
 */

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif;
  color: #1a1a1a;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
}

.header {
  text-align: center;
  padding: 2rem;
  background: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header h1 {
  margin: 0;
  font-size: 2rem;
  color: #2c3e50;
}

.subtitle {
  margin: 0.5rem 0 0;
  color: #6c757d;
  font-size: 0.9rem;
}

.main {
  flex: 1;
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.status-card,
.info-card,
.dev-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.status-card {
  border-left: 4px solid #28a745;
}

.info-card {
  border-left: 4px solid #007bff;
}

.dev-card {
  border-left: 4px solid #ffc107;
}

h2 {
  margin: 0 0 1rem;
  font-size: 1.25rem;
  color: #2c3e50;
}

p {
  margin: 0.5rem 0;
  line-height: 1.6;
}

.mock-url {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 4px;
}

code {
  background: #e9ecef;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: "SF Mono", Monaco, "Courier New", monospace;
  font-size: 0.875rem;
  color: #d63384;
}

ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

li {
  margin: 0.5rem 0;
  line-height: 1.6;
}

.footer {
  text-align: center;
  padding: 1rem;
  background: #ffffff;
  border-top: 1px solid #e9ecef;
  color: #6c757d;
  font-size: 0.875rem;
}
</style>
