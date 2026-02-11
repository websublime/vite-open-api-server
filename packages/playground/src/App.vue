<!--
  App.vue - Playground Demo Application

  What: Demo interface for testing vite-open-api-server with Petstore API
  How: Provides UI to interact with all Petstore endpoints
  Why: Showcases plugin features and provides a working example
-->

<script setup lang="ts">
import { computed, ref } from 'vue';

// API base path (proxied by Vite to the mock server)
const API_BASE = '/api/v3';

// Mock auth credentials for secured endpoints (any non-empty value is accepted)
const MOCK_BEARER_TOKEN = 'dev-playground-token';
const MOCK_API_KEY = 'dev-playground-key';

// State
const activeTab = ref<'pets' | 'store' | 'user'>('pets');
const loading = ref(false);
const error = ref<string | null>(null);
const response = ref<any>(null);

// Pet state
const petStatus = ref<'available' | 'pending' | 'sold'>('available');
const pets = ref<any[]>([]);
const selectedPet = ref<any>(null);
const newPetName = ref('');
const newPetStatus = ref<'available' | 'pending' | 'sold'>('available');

// Store state
const orders = ref<any[]>([]);
const selectedOrder = ref<any>(null);

// User state
const users = ref<any[]>([]);
const selectedUser = ref<any>(null);
const loginUsername = ref('');
const loginPassword = ref('');

// Helper function to make API calls
async function apiCall(url: string, options: RequestInit = {}) {
  loading.value = true;
  error.value = null;
  response.value = null;

  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${MOCK_BEARER_TOKEN}`,
        api_key: MOCK_API_KEY,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Read response as text first to handle empty bodies
    const text = await res.text();
    let data = null;

    // Parse JSON if body is not empty
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    // Check if response is OK
    if (!res.ok) {
      const errorMessage = data?.message || `Request failed with status ${res.status}`;
      error.value = `Error ${res.status}: ${errorMessage}`;
      throw new Error(errorMessage);
    }

    response.value = { status: res.status, data };
    return data;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error occurred';
    throw err;
  } finally {
    loading.value = false;
  }
}

// Pet operations
async function findPetsByStatus() {
  try {
    const data = await apiCall(`/pet/findByStatus?status=${petStatus.value}`);
    pets.value = data;
  } catch {
    // Error already set by apiCall
  }
}

async function getPetById(id: number) {
  try {
    const data = await apiCall(`/pet/${id}`);
    selectedPet.value = data;
  } catch {
    // Error already set by apiCall
  }
}

async function addPet() {
  if (!newPetName.value.trim()) {
    error.value = 'Pet name is required';
    return;
  }

  try {
    const pet = {
      name: newPetName.value,
      status: newPetStatus.value,
      photoUrls: ['https://example.com/photo.jpg'],
    };

    const data = await apiCall('/pet', {
      method: 'POST',
      body: JSON.stringify(pet),
    });

    newPetName.value = '';
    pets.value = [data, ...pets.value];
  } catch {
    // Error already set by apiCall
  }
}

async function deletePet(id: number) {
  try {
    await apiCall(`/pet/${id}`, { method: 'DELETE' });
    pets.value = pets.value.filter((p) => p.id !== id);
    if (selectedPet.value?.id === id) {
      selectedPet.value = null;
    }
  } catch {
    // Error already set by apiCall
  }
}

// Store operations
async function getInventory() {
  try {
    const data = await apiCall('/store/inventory');
    response.value = { status: 200, data };
  } catch {
    // Error already set by apiCall
  }
}

async function placeOrder() {
  try {
    const order = {
      petId: pets.value[0]?.id || 1,
      quantity: 1,
      status: 'placed',
      complete: false,
    };

    const data = await apiCall('/store/order', {
      method: 'POST',
      body: JSON.stringify(order),
    });

    orders.value = [data, ...orders.value];
  } catch {
    // Error already set by apiCall
  }
}

async function getOrderById(id: number) {
  try {
    const data = await apiCall(`/store/order/${id}`);
    selectedOrder.value = data;
  } catch {
    // Error already set by apiCall
  }
}

// User operations
async function loginUser() {
  if (!loginUsername.value || !loginPassword.value) {
    error.value = 'Username and password are required';
    return;
  }

  try {
    const encodedUsername = encodeURIComponent(loginUsername.value);
    const encodedPassword = encodeURIComponent(loginPassword.value);
    await apiCall(`/user/login?username=${encodedUsername}&password=${encodedPassword}`);
  } catch {
    // Error already set by apiCall
  }
}

async function logoutUser() {
  try {
    await apiCall('/user/logout');
    loginUsername.value = '';
    loginPassword.value = '';
  } catch {
    // Error already set by apiCall
  }
}

async function createUser() {
  try {
    const user = {
      username: `user_${Date.now()}`,
      firstName: 'Demo',
      lastName: 'User',
      email: 'demo@example.com',
      password: 'password123',
      phone: '1234567890',
    };

    const data = await apiCall('/user', {
      method: 'POST',
      body: JSON.stringify(user),
    });

    users.value = [data, ...users.value];
  } catch {
    // Error already set by apiCall
  }
}

async function getUserByName(username: string) {
  try {
    const data = await apiCall(`/user/${username}`);
    selectedUser.value = data;
  } catch {
    // Error already set by apiCall
  }
}

// Format JSON for display
const formattedResponse = computed(() => {
  if (!response.value) return '';
  return JSON.stringify(response.value, null, 2);
});
</script>

<template>
  <div class="playground">
    <!-- Header -->
    <header class="header">
      <h1 class="title">🐾 Petstore API Playground</h1>
      <p class="subtitle">Demo application for vite-open-api-server</p>
      <div class="links">
        <a href="/_devtools" target="_blank" class="link">Open DevTools →</a>
        <a href="http://localhost:4000/_api/docs" target="_blank" class="link">API Docs →</a>
      </div>
    </header>

    <!-- Tab Navigation -->
    <nav class="tabs">
      <button
        :class="['tab', { active: activeTab === 'pets' }]"
        @click="activeTab = 'pets'"
      >
        🐶 Pets
      </button>
      <button
        :class="['tab', { active: activeTab === 'store' }]"
        @click="activeTab = 'store'"
      >
        🛒 Store
      </button>
      <button
        :class="['tab', { active: activeTab === 'user' }]"
        @click="activeTab = 'user'"
      >
        👤 User
      </button>
    </nav>

    <div class="content">
      <!-- Pet Operations -->
      <section v-show="activeTab === 'pets'" class="panel">
        <div class="actions">
          <div class="action-group">
            <h3>Find Pets by Status</h3>
            <div class="input-group">
              <select v-model="petStatus">
                <option value="available">Available</option>
                <option value="pending">Pending</option>
                <option value="sold">Sold</option>
              </select>
              <button @click="findPetsByStatus" :disabled="loading">
                Find Pets
              </button>
            </div>
          </div>

          <div class="action-group">
            <h3>Add New Pet</h3>
            <div class="input-group">
              <input
                v-model="newPetName"
                placeholder="Pet name"
                @keyup.enter="addPet"
              />
              <select v-model="newPetStatus">
                <option value="available">Available</option>
                <option value="pending">Pending</option>
                <option value="sold">Sold</option>
              </select>
              <button @click="addPet" :disabled="loading || !newPetName.trim()">
                Add Pet
              </button>
            </div>
          </div>
        </div>

        <div v-if="pets.length" class="results">
          <h3>Pets ({{ pets.length }})</h3>
          <div class="items">
            <div
              v-for="pet in pets"
              :key="pet.id"
              class="item"
              @click="getPetById(pet.id)"
            >
              <div class="item-content">
                <strong>{{ pet.name }}</strong>
                <span :class="['badge', pet.status]">{{ pet.status }}</span>
              </div>
              <button @click.stop="deletePet(pet.id)" class="btn-delete">
                Delete
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Store Operations -->
      <section v-show="activeTab === 'store'" class="panel">
        <div class="actions">
          <div class="action-group">
            <h3>Store Operations</h3>
            <div class="button-group">
              <button @click="getInventory" :disabled="loading">
                Get Inventory
              </button>
              <button @click="placeOrder" :disabled="loading">
                Place Order
              </button>
            </div>
          </div>
        </div>

        <div v-if="orders.length" class="results">
          <h3>Orders ({{ orders.length }})</h3>
          <div class="items">
            <div
              v-for="order in orders"
              :key="order.id"
              class="item"
              @click="getOrderById(order.id)"
            >
              <div class="item-content">
                <strong>Order #{{ order.id }}</strong>
                <span :class="['badge', order.status]">{{ order.status }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- User Operations -->
      <section v-show="activeTab === 'user'" class="panel">
        <div class="actions">
          <div class="action-group">
            <h3>User Login</h3>
            <div class="input-group">
              <input
                v-model="loginUsername"
                placeholder="Username"
                @keyup.enter="loginUser"
              />
              <input
                v-model="loginPassword"
                type="password"
                placeholder="Password"
                @keyup.enter="loginUser"
              />
              <button @click="loginUser" :disabled="loading">Login</button>
              <button @click="logoutUser" :disabled="loading">Logout</button>
            </div>
          </div>

          <div class="action-group">
            <h3>User Management</h3>
            <div class="button-group">
              <button @click="createUser" :disabled="loading">
                Create User
              </button>
            </div>
          </div>
        </div>

        <div v-if="users.length" class="results">
          <h3>Users ({{ users.length }})</h3>
          <div class="items">
            <div
              v-for="user in users"
              :key="user.id"
              class="item"
              @click="getUserByName(user.username)"
            >
              <div class="item-content">
                <strong>{{ user.username }}</strong>
                <span>{{ user.email }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Response Panel -->
      <aside class="response-panel">
        <h3>Response</h3>
        <div v-if="loading" class="loading">Loading...</div>
        <div v-else-if="error" class="error">{{ error }}</div>
        <pre v-else-if="response" class="response">{{ formattedResponse }}</pre>
        <div v-else class="placeholder">Make a request to see the response</div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.playground {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

.header {
  padding: 2rem;
  text-align: center;
  color: white;
}

.title {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 700;
}

.subtitle {
  margin: 0.5rem 0 1rem;
  opacity: 0.9;
  font-size: 1.1rem;
}

.links {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.link {
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  transition: background 0.2s;
}

.link:hover {
  background: rgba(255, 255, 255, 0.3);
}

.tabs {
  display: flex;
  gap: 0.5rem;
  padding: 0 2rem;
  background: rgba(255, 255, 255, 0.1);
}

.tab {
  padding: 1rem 2rem;
  background: transparent;
  border: none;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
}

.tab:hover {
  background: rgba(255, 255, 255, 0.1);
}

.tab.active {
  border-bottom-color: white;
  font-weight: 600;
}

.content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.panel {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.action-group h3 {
  margin: 0 0 1rem;
  color: #333;
  font-size: 1.1rem;
}

.input-group,
.button-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

input,
select {
  flex: 1;
  min-width: 150px;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 0.5rem;
  font-size: 0.95rem;
}

input:focus,
select:focus {
  outline: none;
  border-color: #667eea;
}

button {
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

button:hover:not(:disabled) {
  background: #5568d3;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.results {
  margin-top: 2rem;
}

.results h3 {
  margin: 0 0 1rem;
  color: #333;
  font-size: 1.1rem;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 400px;
  overflow-y: auto;
}

.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background 0.2s;
}

.item:hover {
  background: #ebebeb;
}

.item-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  border-radius: 0.25rem;
  background: #e0e0e0;
  color: #666;
}

.badge.available {
  background: #4caf50;
  color: white;
}

.badge.pending {
  background: #ff9800;
  color: white;
}

.badge.sold {
  background: #f44336;
  color: white;
}

.badge.placed {
  background: #2196f3;
  color: white;
}

.badge.approved {
  background: #4caf50;
  color: white;
}

.btn-delete {
  padding: 0.5rem 1rem;
  background: #f44336;
  font-size: 0.85rem;
}

.btn-delete:hover {
  background: #d32f2f;
}

.response-panel {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  max-height: 600px;
  overflow: auto;
}

.response-panel h3 {
  margin: 0 0 1rem;
  color: #333;
  font-size: 1.1rem;
}

.loading,
.placeholder {
  padding: 2rem;
  text-align: center;
  color: #999;
}

.error {
  padding: 1rem;
  background: #ffebee;
  color: #c62828;
  border-radius: 0.5rem;
  font-weight: 500;
}

.response {
  margin: 0;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 0.5rem;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.85rem;
  overflow-x: auto;
}

@media (max-width: 1024px) {
  .content {
    grid-template-columns: 1fr;
  }
}
</style>
