# @websublime/vite-plugin-open-api-core

Core server logic for vite-open-api-server - OpenAPI processing, routing, store, and data generation.

## Features

- **OpenAPI Processing** - Bundle, upgrade, and dereference OpenAPI 2.0/3.x specs to 3.1
- **In-Memory Store** - Full CRUD operations per schema with configurable ID fields
- **Hono Router** - Dynamic route generation from OpenAPI path definitions
- **Data Generator** - Fake data generation using Faker.js with smart field detection
- **Handler System** - Custom handler execution with context injection
- **Seed System** - Seed data loading and execution with Faker.js integration
- **WebSocket Hub** - Real-time communication for DevTools
- **Simulation Manager** - Error and delay simulation for testing

## Installation

```bash
pnpm add @websublime/vite-plugin-open-api-core
```

> **Note:** This package is typically used internally by `@websublime/vite-plugin-open-api-server`. You only need to install it directly if building custom integrations.

## Usage

### Server Factory

```typescript
import { createOpenApiServer } from '@websublime/vite-plugin-open-api-core';

const server = await createOpenApiServer({
  spec: './openapi/petstore.yaml',
  port: 4000,
  cors: true,
});

await server.start();
```

### OpenAPI Document Processing

```typescript
import { processOpenApiDocument, ProcessorError } from '@websublime/vite-plugin-open-api-core';

try {
  const { document, registry } = await processOpenApiDocument({
    spec: './openapi/petstore.yaml',
  });
  
  console.log(`Processed: ${document.info.title} v${document.info.version}`);
  console.log(`Endpoints: ${registry.size}`);
} catch (error) {
  if (error instanceof ProcessorError) {
    console.error('OpenAPI processing failed:', error.message);
  }
}
```

### In-Memory Store

```typescript
import { createStore } from '@websublime/vite-plugin-open-api-core';

const store = createStore({
  idFields: {
    User: 'username',
    Order: 'orderId',
  },
});

// CRUD operations
store.create('Pet', { id: 1, name: 'Fluffy', status: 'available' });
store.list('Pet');                    // Get all pets
store.get('Pet', 1);                  // Get pet by ID
store.update('Pet', 1, { status: 'sold' });
store.delete('Pet', 1);
store.clear('Pet');                   // Clear all pets
store.clearAll();                     // Clear entire store

// Utilities
store.getSchemas();                   // ['Pet', 'Order', ...]
store.getCount('Pet');                // Number of pets
```

### Data Generator

```typescript
import { generateFromSchema, generateFromFieldName } from '@websublime/vite-plugin-open-api-core';
import { faker } from '@faker-js/faker';

// Generate from OpenAPI schema
const petData = generateFromSchema(
  {
    type: 'object',
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
    },
  },
  faker
);

// Smart field name detection
const email = generateFromFieldName('userEmail', faker);  // Returns realistic email
const date = generateFromFieldName('createdAt', faker);   // Returns ISO date
```

### Custom Handlers

```typescript
import { defineHandlers, executeHandler } from '@websublime/vite-plugin-open-api-core';

const handlers = defineHandlers({
  getPetById: async ({ req, store }) => {
    const pet = store.get('Pet', req.params.petId);
    if (!pet) {
      return { status: 404, data: { message: 'Pet not found' } };
    }
    return pet;
  },
});

// Execute a handler
const response = await executeHandler(handlers.getPetById, context);
```

### Seed Data

```typescript
import { defineSeeds, executeSeeds } from '@websublime/vite-plugin-open-api-core';

const seeds = defineSeeds({
  Pet: ({ seed, faker }) => {
    return seed.count(10, () => ({
      id: faker.number.int({ min: 1, max: 1000 }),
      name: faker.animal.dog(),
      status: faker.helpers.arrayElement(['available', 'pending', 'sold']),
    }));
  },
});

// Execute seeds to populate store
await executeSeeds(seeds, { store, faker, schemas });
```

### WebSocket Hub

```typescript
import { createWebSocketHub } from '@websublime/vite-plugin-open-api-core';

const hub = createWebSocketHub({
  path: '/_ws',
  logger: console,
});

// Broadcast events to all clients
hub.broadcast({
  type: 'request',
  data: { method: 'GET', path: '/pet/1', timestamp: Date.now() },
});

// Handle client commands
hub.onCommand('ping', (client, data) => {
  client.send({ type: 'pong', data: {} });
});
```

### Simulation Manager

```typescript
import { createSimulationManager } from '@websublime/vite-plugin-open-api-core';

const simulations = createSimulationManager();

// Add a simulation
simulations.set('/pet/{petId}', 'GET', {
  type: 'error',
  statusCode: 500,
  message: 'Internal Server Error',
});

// Check for active simulation
const sim = simulations.get('/pet/123', 'GET');
if (sim) {
  // Apply simulation (delay, error, etc.)
}

// Remove simulation
simulations.remove('/pet/{petId}', 'GET');
```

## API Reference

### Server Factory

| Export | Type | Description |
|--------|------|-------------|
| `createOpenApiServer` | `function` | Create and configure the OpenAPI server |
| `OpenApiServer` | `type` | Server instance type |
| `OpenApiServerConfig` | `type` | Server configuration options |

### Parser Module

| Export | Type | Description |
|--------|------|-------------|
| `processOpenApiDocument` | `function` | Process OpenAPI spec (bundle, upgrade, dereference) |
| `ProcessorError` | `class` | Error thrown during processing |
| `ProcessorOptions` | `type` | Processing options |

### Store Module

| Export | Type | Description |
|--------|------|-------------|
| `createStore` | `function` | Create in-memory store instance |
| `StoreError` | `class` | Error thrown during store operations |
| `Store` | `type` | Store instance type |
| `StoreOptions` | `type` | Store configuration options |

### Router Module

| Export | Type | Description |
|--------|------|-------------|
| `buildRegistry` | `function` | Build endpoint registry from OpenAPI document |
| `buildRoutes` | `function` | Build Hono routes from registry |
| `convertOpenApiPath` | `function` | Convert OpenAPI path to Hono format |
| `createEndpointKey` | `function` | Create unique endpoint key |
| `parseEndpointKey` | `function` | Parse endpoint key to method/path |
| `updateRegistryHandlers` | `function` | Update registry with loaded handlers |
| `updateRegistrySeeds` | `function` | Update registry with loaded seeds |

### Generator Module

| Export | Type | Description |
|--------|------|-------------|
| `generateFromSchema` | `function` | Generate fake data from OpenAPI schema |
| `generateFromFieldName` | `function` | Generate data based on field name |
| `TYPE_FORMAT_MAPPING` | `const` | Mapping of type+format to generators |
| `FIELD_NAME_MAPPING` | `const` | Mapping of field names to generators |
| `DATE_FORMAT_POST_PROCESSING` | `const` | Date format post-processors |

### Handlers Module

| Export | Type | Description |
|--------|------|-------------|
| `defineHandlers` | `function` | Type helper for defining handlers |
| `executeHandler` | `function` | Execute a handler with context |
| `normalizeResponse` | `function` | Normalize handler response |
| `ExecutorError` | `class` | Error thrown during execution |
| `HandlerContext` | `type` | Context passed to handlers |
| `HandlerFn` | `type` | Handler function type |

### Seeds Module

| Export | Type | Description |
|--------|------|-------------|
| `defineSeeds` | `function` | Type helper for defining seeds |
| `executeSeeds` | `function` | Execute all seeds |
| `executeSeedDefinition` | `function` | Execute a single seed |
| `createSeedContext` | `function` | Create seed execution context |
| `createSeedHelper` | `function` | Create seed helper with count() |
| `SeedExecutorError` | `class` | Error thrown during seed execution |

### WebSocket Module

| Export | Type | Description |
|--------|------|-------------|
| `createWebSocketHub` | `function` | Create WebSocket hub instance |
| `CLIENT_COMMAND_TYPES` | `const` | Valid client command types |
| `WebSocketHub` | `type` | Hub instance type |
| `ServerEvent` | `type` | Server-sent event type |
| `ClientCommand` | `type` | Client command type |

### Simulation Module

| Export | Type | Description |
|--------|------|-------------|
| `createSimulationManager` | `function` | Create simulation manager |
| `SimulationManager` | `type` | Manager instance type |
| `Simulation` | `type` | Simulation configuration |

### Internal API Module

| Export | Type | Description |
|--------|------|-------------|
| `mountInternalApi` | `function` | Mount internal API routes on Hono app |
| `InternalApiDeps` | `type` | Dependencies for internal API |
| `TimelineEntry` | `type` | Timeline entry type |

## Requirements

- **Node.js**: ^20.19.0 || >=22.12.0
- **pnpm**: 9.x

## Related Packages

| Package | Description |
|---------|-------------|
| `@websublime/vite-plugin-open-api-server` | Vite plugin (main package) |
| `@websublime/vite-plugin-open-api-devtools` | Vue DevTools SPA |

## License

MIT
