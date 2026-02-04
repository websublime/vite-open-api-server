# @websublime/vite-plugin-open-api-server

Vite plugin for OpenAPI mock server with DevTools integration.

## Features

- 🚀 **Zero-config mock server** - Automatically generates mock endpoints from OpenAPI spec
- 🔄 **Hot reload** - Handlers and seeds reload automatically on file changes
- 🎯 **Type-safe handlers** - Full TypeScript support with `defineHandlers()`
- 🌱 **Seed data** - Define initial data with Faker.js integration
- 🛠️ **DevTools** - Built-in DevTools for inspecting endpoints and data
- ⚡ **Seamless Vite integration** - Works with Vite's proxy system

## Installation

```bash
pnpm add -D @websublime/vite-plugin-open-api-server
```

## Quick Start

### 1. Add the plugin to your Vite config

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { openApiServer } from '@websublime/vite-plugin-open-api-server';

export default defineConfig({
  plugins: [
    vue(),
    openApiServer({
      spec: './openapi/petstore.yaml',
      port: 4000,
      proxyPath: '/api',
    }),
  ],
});
```

### 2. Create handler files (optional)

```typescript
// mocks/handlers/pets.handlers.ts
import { defineHandlers } from '@websublime/vite-plugin-open-api-server';

export default defineHandlers({
  getPetById: async ({ req, store }) => {
    const pet = store.get('Pet', req.params.petId);
    if (!pet) {
      return { status: 404, data: { message: 'Pet not found' } };
    }
    return pet;
  },
  
  createPet: async ({ req, store, faker }) => {
    const newPet = {
      id: faker.number.int({ min: 1000, max: 9999 }),
      ...req.body,
    };
    store.create('Pet', newPet);
    return { status: 201, data: newPet };
  },
});
```

### 3. Create seed files (optional)

```typescript
// mocks/seeds/pets.seeds.ts
import { defineSeeds } from '@websublime/vite-plugin-open-api-server';

export default defineSeeds({
  Pet: ({ seed, faker }) => {
    return seed.count(10, () => ({
      id: faker.number.int({ min: 1, max: 1000 }),
      name: faker.animal.dog(),
      category: {
        id: faker.number.int({ min: 1, max: 5 }),
        name: faker.helpers.arrayElement(['Dogs', 'Cats', 'Birds']),
      },
      status: faker.helpers.arrayElement(['available', 'pending', 'sold']),
    }));
  },
});
```

### 4. Start your Vite dev server

```bash
pnpm dev
```

The mock server will start automatically and you'll see a startup banner:

```text
╭──────────────────────────────────────────────────────╮
│              🚀 OpenAPI Mock Server                  │
╰──────────────────────────────────────────────────────╯

  API:        Swagger Petstore v1.0.0
  Server:     http://localhost:4000
  Proxy:      /api → localhost:4000

  Endpoints: 15  │  Handlers: 2  │  Seeds: 1

  DevTools:   http://localhost:4000/_devtools
  API Info:   http://localhost:4000/_api
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `spec` | `string` | **required** | Path to OpenAPI spec file (YAML or JSON) |
| `port` | `number` | `4000` | Mock server port |
| `proxyPath` | `string` | `'/api'` | Vite proxy path prefix |
| `handlersDir` | `string` | `'./mocks/handlers'` | Directory for handler files |
| `seedsDir` | `string` | `'./mocks/seeds'` | Directory for seed files |
| `enabled` | `boolean` | `true` | Enable/disable the plugin |
| `idFields` | `Record<string, string>` | `{}` | ID field per schema |
| `timelineLimit` | `number` | `500` | Max timeline events |
| `devtools` | `boolean` | `true` | Enable DevTools |
| `cors` | `boolean` | `true` | Enable CORS |
| `corsOrigin` | `string \| string[]` | `'*'` | CORS origin configuration |
| `silent` | `boolean` | `false` | Suppress startup banner |

## Handler Context

Handlers receive a context object with:

```typescript
interface HandlerContext {
  req: {
    method: string;
    path: string;
    params: Record<string, string>;
    query: Record<string, string>;
    body: unknown;
    headers: Record<string, string>;
  };
  store: Store;
  faker: Faker;
  logger: Logger;
}
```

## Response Formats

Handlers can return data in several formats:

```typescript
// Simple data (status 200)
return { id: 1, name: 'Fluffy' };

// With status code
return { status: 201, data: { id: 1, name: 'Fluffy' } };

// With headers
return {
  status: 200,
  data: { id: 1 },
  headers: { 'X-Custom': 'value' },
};
```

## File Naming Conventions

- Handlers: `*.handlers.ts` or `*.handlers.js`
- Seeds: `*.seeds.ts` or `*.seeds.js`

## Response Priority

When a request comes in, the server looks for a response in this order:

1. **Custom Handler** - If defined for the operationId
2. **Seed Data** - If data exists in the store
3. **OpenAPI Example** - If defined in the spec
4. **Generated Data** - Auto-generated from schema using Faker.js

## Vue DevTools Integration

This plugin provides a custom tab integration for Vue DevTools, allowing you to inspect your mock API server directly from the browser DevTools panel.

### Setup

In your Vue application's main entry point:

```typescript
// main.ts
import { createApp } from 'vue';
import { registerDevTools } from '@websublime/vite-plugin-open-api-server';
import App from './App.vue';

const app = createApp(App);

// Register OpenAPI Server DevTools (development only)
if (import.meta.env.DEV) {
  await registerDevTools(app, {
    port: 4000, // Must match your server port
    label: 'OpenAPI Server', // Optional custom label
  });
}

app.mount('#app');
```

### Options

```typescript
interface RegisterDevToolsOptions {
  port?: number;      // Server port (default: 4000)
  host?: string;      // Server host (default: 'localhost' or window.location.hostname)
  protocol?: 'http' | 'https';  // Protocol (default: 'http' or window.location.protocol)
  enabled?: boolean;  // Enable/disable registration (default: true)
  label?: string;     // Custom tab label (default: 'OpenAPI Server')
}
```

### Features

When registered, the DevTools integration provides:

- **Custom Tab** - A dedicated tab in Vue DevTools with the full DevTools SPA embedded via iframe
- **Routes Explorer** - View all registered OpenAPI routes with their handlers and seeds
- **Timeline Viewer** - Track API requests in real-time
- **Store Editor** - Inspect and modify in-memory data
- **Error Simulator** - Test error scenarios and delays

### Accessing DevTools

You can access the DevTools in two ways:

1. **Via Vue DevTools Browser Extension** - After registration, a custom tab named "OpenAPI Server" (or your custom label) will appear in the Vue DevTools panel with the full DevTools SPA embedded via iframe
2. **Standalone URL** - Navigate directly to `http://localhost:4000/_devtools/` (replace 4000 with your configured port)

> **Note:** The standalone DevTools SPA currently serves a placeholder page. The full DevTools SPA client (routes explorer, timeline viewer, store editor, and error simulation controls) will be served from this URL in a future task. The iframe integration will automatically display the full SPA once it's implemented.

## Internal API

The mock server exposes internal endpoints for debugging:

- `/_api` - Server info and stats
- `/_api/registry` - List all endpoints
- `/_api/store` - View store data
- `/_api/timeline` - Request/response history
- `/_api/simulations` - Active error simulations
- `/_devtools` - DevTools SPA

## Requirements

- **Node.js**: ^20.19.0 || >=22.12.0
- **pnpm**: 9.x

## Related Packages

| Package | Description |
|---------|-------------|
| `@websublime/vite-plugin-open-api-core` | Core server, store, router, generator |
| `@websublime/vite-plugin-open-api-devtools` | Vue DevTools SPA |

## License

MIT
