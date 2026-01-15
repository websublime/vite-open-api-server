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
 * Includes API fetch demonstrations to test proxy configuration.
 * The fetch requests are proxied through Vite to the mock server.
 */

import { ref } from 'vue';

/** State for API test results */
const apiResponse = ref<string | null>(null);
const apiError = ref<string | null>(null);
const isLoading = ref(false);
const lastRequestInfo = ref<{ url: string; timestamp: string } | null>(null);

/**
 * Fetches a pet by ID from the mock API.
 *
 * This demonstrates the Vite proxy configuration:
 * - Request goes to /api/v3/pet/1 (same origin)
 * - Vite proxies to http://localhost:3456/pet/1
 * - Path rewriting strips /api/v3 prefix
 *
 * @param petId - The pet ID to fetch
 */
async function fetchPet(petId: number = 1): Promise<void> {
  isLoading.value = true;
  apiResponse.value = null;
  apiError.value = null;

  const url = `/api/v3/pet/${petId}`;
  lastRequestInfo.value = {
    url,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: 'Bearer test-token',
        api_key: 'test-api-key',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    apiResponse.value = JSON.stringify(data, null, 2);
  } catch (error) {
    apiError.value = error instanceof Error ? error.message : 'Unknown error occurred';
  } finally {
    isLoading.value = false;
  }
}

/**
 * Fetches all pets (list endpoint).
 * Demonstrates proxy working with different endpoints.
 */
async function fetchPets(): Promise<void> {
  isLoading.value = true;
  apiResponse.value = null;
  apiError.value = null;

  const url = '/api/v3/pet/findByStatus?status=available';
  lastRequestInfo.value = {
    url,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: 'Bearer test-token',
        api_key: 'test-api-key',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    apiResponse.value = JSON.stringify(data, null, 2);
  } catch (error) {
    apiError.value = error instanceof Error ? error.message : 'Unknown error occurred';
  } finally {
    isLoading.value = false;
  }
}

/**
 * Makes a request with error simulation query parameters.
 * Used to test error handling in the frontend.
 *
 * @param endpoint - API endpoint path
 * @param params - Query parameters for simulation
 */
async function fetchWithSimulation(
  endpoint: string,
  params: { simulateError?: number; delay?: number },
): Promise<void> {
  isLoading.value = true;
  apiResponse.value = null;
  apiError.value = null;

  const queryParams = new URLSearchParams();
  if (params.simulateError) {
    queryParams.set('simulateError', params.simulateError.toString());
  }
  if (params.delay) {
    queryParams.set('delay', params.delay.toString());
  }

  const url = `${endpoint}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  lastRequestInfo.value = {
    url,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: 'Bearer test-token',
        api_key: 'test-api-key',
      },
    });
    const data = await response.json();

    if (!response.ok) {
      // Show the error response body for simulation testing
      apiError.value = `HTTP ${response.status}: ${JSON.stringify(data, null, 2)}`;
    } else {
      apiResponse.value = JSON.stringify(data, null, 2);
    }
  } catch (error) {
    apiError.value = error instanceof Error ? error.message : 'Unknown error occurred';
  } finally {
    isLoading.value = false;
  }
}

/**
 * Test 404 Not Found error simulation.
 */
function test404Error(): void {
  fetchWithSimulation('/api/v3/pet/999', { simulateError: 404 });
}

/**
 * Test 500 Internal Server Error simulation.
 */
function test500Error(): void {
  fetchWithSimulation('/api/v3/pet', { simulateError: 500 });
}

/**
 * Test 401 Unauthorized error simulation.
 */
function test401Error(): void {
  fetchWithSimulation('/api/v3/pet/1', { simulateError: 401 });
}

/**
 * Test slow response (3 second delay) simulation.
 */
function testSlowResponse(): void {
  fetchWithSimulation('/api/v3/pet/1', { delay: 3000 });
}

/**
 * Test combined error with delay (slow failure).
 */
function testSlowFailure(): void {
  fetchWithSimulation('/api/v3/pet/1', { simulateError: 500, delay: 2000 });
}
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

      <section class="test-card">
        <h2>🧪 API Proxy Test</h2>
        <p>Test the Vite proxy configuration by making requests to the mock server.</p>

        <div class="button-group">
          <button class="test-button" :disabled="isLoading" @click="fetchPet(1)">
            {{ isLoading ? "Loading..." : "Fetch Pet #1" }}
          </button>
          <button class="test-button secondary" :disabled="isLoading" @click="fetchPets()">
            {{ isLoading ? "Loading..." : "Fetch Available Pets" }}
          </button>
        </div>

        <div v-if="lastRequestInfo" class="request-info">
          <strong>Last Request:</strong>
          <code>{{ lastRequestInfo.url }}</code>
          <span class="timestamp">{{ lastRequestInfo.timestamp }}</span>
        </div>

        <div v-if="apiResponse" class="response-card success">
          <h3>✅ Response</h3>
          <pre>{{ apiResponse }}</pre>
        </div>

        <div v-if="apiError" class="response-card error">
          <h3>❌ Error</h3>
          <pre class="error-pre">{{ apiError }}</pre>
          <p class="hint">
            <strong>Note:</strong> If you see a connection error, the mock server may not be running yet. The mock
            server is implemented in Phase 4. The proxy configuration is working correctly - Vite is attempting to
            forward requests to <code>http://localhost:3456</code>.
          </p>
        </div>
      </section>

      <section class="simulation-card">
        <h2>⚠️ Error Simulation</h2>
        <p>
          Test error handling by triggering simulated errors. These use query parameters (<code>simulateError</code>,
          <code>delay</code>) to simulate various failure scenarios.
        </p>

        <div class="button-grid">
          <button class="test-button error-btn" :disabled="isLoading" @click="test404Error()">
            {{ isLoading ? "Loading..." : "Test 404 Not Found" }}
          </button>
          <button class="test-button error-btn" :disabled="isLoading" @click="test401Error()">
            {{ isLoading ? "Loading..." : "Test 401 Unauthorized" }}
          </button>
          <button class="test-button error-btn" :disabled="isLoading" @click="test500Error()">
            {{ isLoading ? "Loading..." : "Test 500 Server Error" }}
          </button>
          <button class="test-button delay-btn" :disabled="isLoading" @click="testSlowResponse()">
            {{ isLoading ? "Loading..." : "Test Slow Response (3s)" }}
          </button>
          <button class="test-button combined-btn" :disabled="isLoading" @click="testSlowFailure()">
            {{ isLoading ? "Loading..." : "Test Slow Failure (2s + 500)" }}
          </button>
        </div>

        <div class="simulation-info">
          <h4>How it works</h4>
          <ul>
            <li><code>?simulateError=404</code> - Returns a 404 Not Found response</li>
            <li><code>?simulateError=401</code> - Returns a 401 Unauthorized response</li>
            <li><code>?simulateError=500</code> - Returns a 500 Server Error response</li>
            <li><code>?delay=3000</code> - Delays response by 3 seconds</li>
            <li>Combine both: <code>?simulateError=500&delay=2000</code></li>
          </ul>
        </div>
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

/* API Test Section Styles */
.test-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-left: 4px solid #17a2b8;
}

.button-group {
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
}

.test-button {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: #007bff;
  color: #ffffff;
  font-weight: 500;
  transition: background 0.2s ease;
}

.test-button:hover:not(:disabled) {
  background: #0056b3;
}

.test-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.test-button.secondary {
  background: #6c757d;
}

.test-button.secondary:hover:not(:disabled) {
  background: #545b62;
}

.request-info {
  margin: 1rem 0;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.request-info .timestamp {
  color: #6c757d;
  font-size: 0.85rem;
  margin-left: auto;
}

.response-card {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 6px;
}

.response-card.success {
  background: #d4edda;
  border: 1px solid #c3e6cb;
}

.response-card.error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
}

.response-card h3 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.response-card pre {
  margin: 0;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.85rem;
  max-height: 300px;
}

.response-card .hint {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  font-size: 0.9rem;
}

.response-card .error-pre {
  margin: 0;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  overflow-x: auto;
  font-size: 0.85rem;
  max-height: 300px;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Error Simulation Section Styles */
.simulation-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-left: 4px solid #dc3545;
}

.button-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  margin: 1rem 0;
}

.test-button.error-btn {
  background: #dc3545;
}

.test-button.error-btn:hover:not(:disabled) {
  background: #c82333;
}

.test-button.delay-btn {
  background: #fd7e14;
}

.test-button.delay-btn:hover:not(:disabled) {
  background: #e96b02;
}

.test-button.combined-btn {
  background: #6f42c1;
}

.test-button.combined-btn:hover:not(:disabled) {
  background: #5a32a3;
}

.simulation-info {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.simulation-info h4 {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
  color: #495057;
}

.simulation-info ul {
  margin: 0;
  padding-left: 1.25rem;
}

.simulation-info li {
  margin: 0.35rem 0;
  font-size: 0.9rem;
}
</style>
