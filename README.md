# vite-plugin-open-api-server

[![npm version](https://img.shields.io/npm/v/@websublime/vite-plugin-open-api-server.svg)](https://www.npmjs.com/package/@websublime/vite-plugin-open-api-server)
[![license](https://img.shields.io/npm/l/@websublime/vite-plugin-open-api-server.svg)](./LICENSE)
[![node version](https://img.shields.io/node/v/@websublime/vite-plugin-open-api-server.svg)](https://nodejs.org/)

Vite plugin that provides a local OpenAPI server for frontend development. Enables frontend developers to work independently of backend services, with realistic data generation, custom handlers, and integrated DevTools.

## Features

- **OpenAPI-First** - Automatic endpoint generation from OpenAPI 2.0/3.x specifications
- **Custom Hono Server** - Lightweight, fast HTTP server with native WebSocket support
- **Realistic Data** - Automatic fake data generation based on schemas using Faker.js
- **Custom Handlers** - Override responses with custom logic per endpoint
- **Seed Data** - Populate the store with consistent test data
- **In-Memory Store** - Full CRUD operations per schema with configurable ID fields
- **Hot Reload** - Automatically reload handlers and seeds on file changes
- **Vue DevTools** - Integrated SPA with Routes, Timeline, Models, and Simulator views
- **Error Simulation** - Simulate network delays, errors, and edge cases
- **TypeScript** - Full TypeScript support with exported types

## Quick Start

### Installation

```bash
pnpm add -D @websublime/vite-plugin-open-api-server
```

### Basic Usage

Add the plugin to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { openApiServer } from '@websublime/vite-plugin-open-api-server';

export default defineConfig({
  plugins: [
    vue(),
    openApiServer({
      spec: './openapi/petstore.yaml',
      port: 4000,
      proxyPath: '/api/v3',
    }),
  ],
});
```

The plugin will:

1. Parse and process your OpenAPI specification
2. Start a Hono server with auto-generated routes
3. Proxy requests from `/api/v3/*` to the server
4. Generate realistic responses based on your schemas
5. Register a custom tab in Vue DevTools

### Configuration Options

```typescript
openApiServer({
  // Required
  spec: './openapi/petstore.yaml',  // Path to OpenAPI spec (YAML/JSON)

  // Server
  port: 4000,                        // Server port (default: auto-detect)
  proxyPath: '/api/v3',              // Vite proxy path (default: '/api')

  // Customization
  handlersDir: './mocks/handlers',   // Custom handlers directory
  seedsDir: './mocks/seeds',         // Seed data directory
  idFields: {                        // ID field per schema
    User: 'username',
    Order: 'orderId',
  },

  // Features
  enabled: true,                     // Enable/disable plugin
  devtools: true,                    // Enable Vue DevTools integration
  timelineLimit: 500,                // Max timeline events
});
```

## Custom Handlers

Create handlers to override default responses:

```typescript
// mocks/handlers/pets.handler.ts
import { defineHandlers } from '@websublime/vite-plugin-open-api-server';

export default defineHandlers({
  getPetById: ({ req, store }) => {
    const pet = store.get('Pet', req.params.petId);
    if (!pet) {
      return { status: 404, data: { message: 'Pet not found' } };
    }
    return pet;
  },

  findPetsByStatus: ({ req, store }) => {
    const status = req.query.status || 'available';
    return store.list('Pet').filter(p => p.status === status);
  },

  addPet: ({ req, store, faker }) => {
    const newPet = store.create('Pet', {
      ...req.body,
      id: faker.number.int({ min: 1000, max: 9999 }),
    });
    return { status: 201, data: newPet };
  },
});
```

### Handler Context

Handlers receive a context object with:

| Property | Description |
|----------|-------------|
| `req.method` | HTTP method |
| `req.path` | Request path |
| `req.params` | Path parameters |
| `req.query` | Query parameters |
| `req.body` | Parsed request body |
| `req.headers` | Request headers |
| `store` | In-memory data store |
| `faker` | Faker.js instance |
| `logger` | Console logger |

## Seed Data

Populate the store with initial data:

```typescript
// mocks/seeds/pets.seed.ts
import { defineSeeds } from '@websublime/vite-plugin-open-api-server';

export default defineSeeds({
  Pet: ({ seed, faker }) => seed.count(15, (index) => ({
    id: index + 1,
    name: faker.animal.dog(),
    category: {
      id: faker.number.int({ min: 1, max: 5 }),
      name: faker.helpers.arrayElement(['Dogs', 'Cats', 'Birds']),
    },
    photoUrls: [faker.image.url()],
    status: faker.helpers.arrayElement(['available', 'pending', 'sold']),
  })),

  Category: ({ seed }) => seed([
    { id: 1, name: 'Dogs' },
    { id: 2, name: 'Cats' },
    { id: 3, name: 'Birds' },
  ]),
});
```

### Seed Context

Seeds receive a context object with:

| Property | Description |
|----------|-------------|
| `seed(data[])` | Seed with static array |
| `seed.count(n, factory)` | Generate n items with factory |
| `store` | Access already-seeded data (for relationships) |
| `faker` | Faker.js instance |
| `schema` | OpenAPI schema definition |

## Store API

The in-memory store provides CRUD operations:

```typescript
store.list('Pet');                           // Get all pets
store.get('Pet', 123);                       // Get pet by ID
store.create('Pet', { name: 'Buddy', ... }); // Create pet
store.update('Pet', 123, { status: 'sold' });// Update pet
store.delete('Pet', 123);                    // Delete pet
store.clear('Pet');                          // Clear all pets
```

## Vue DevTools Integration

The plugin adds a custom tab to Vue DevTools with:

| Page | Description |
|------|-------------|
| **Routes** | List of all endpoints grouped by tags/schema |
| **Timeline** | Real-time request/response log |
| **Models** | JSON editor for store data |
| **Simulator** | Error simulation with presets |

### Simulation Presets

| Preset | Effect |
|--------|--------|
| Slow Network (3G) | 3000ms delay |
| Server Error (500) | HTTP 500 response |
| Rate Limit (429) | HTTP 429 response |
| Not Found (404) | HTTP 404 response |
| Request Timeout | 30000ms delay |
| Empty Response | HTTP 200 with empty body |
| Unauthorized (401) | HTTP 401 response |

## Response Priority

Responses are determined in this order:

1. **Active Simulation** - If a simulation is active for the endpoint
2. **Custom Handler** - If a handler is defined for the operationId
3. **Seed Data** - If seed data exists for the response schema
4. **Spec Example** - If an example is defined in the OpenAPI spec
5. **Auto-Generated** - Generated using Faker.js based on schema

## Monorepo Structure

```
vite-open-api-server/
├── packages/
│   ├── core/                  # Core server logic (Hono, store, generator)
│   ├── devtools-client/       # Vue SPA for DevTools
│   ├── playground/            # Demo application (coming soon, private)
│   └── server/                # Vite plugin wrapper (main package)
└── history/                   # Planning and architecture docs
```

| Package | Description |
|---------|-------------|
| `@websublime/vite-plugin-open-api-core` | Core server, store, router, generator |
| `@websublime/vite-plugin-open-api-devtools` | Vue DevTools SPA |
| `@websublime/vite-plugin-open-api-server` | Vite plugin (main package) |

## Development

### Prerequisites

- **Node.js**: ^20.19.0 || >=22.12.0
- **pnpm**: 9.x

### Getting Started

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the playground
pnpm playground

# Run tests
pnpm test

# Lint and format
pnpm lint
pnpm format
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm dev` | Start packages in watch mode |
| `pnpm build` | Build all packages |
| `pnpm test` | Run tests with Vitest |
| `pnpm lint` | Check code with Biome |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm playground` | Start the playground application |

## Documentation

- [Product Requirements](./history/PRODUCT-REQUIREMENTS-DOC.md) - Product vision and features
- [Technical Specification](./history/TECHNICAL-SPECIFICATION.md) - Architecture and implementation details

## Contributing

Contributions are welcome! This project uses:

- **Beads** for issue tracking (`bd ready` to find work)
- **Biome** for linting and formatting
- **Conventional commits** for commit messages

## License

[MIT](./LICENSE) © WebSublime
