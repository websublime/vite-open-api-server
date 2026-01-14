# @websublime/vite-plugin-open-api-server

Vite plugin for OpenAPI-based mock server with Scalar integration. Enables frontend developers to work independently of backend services during local development, with realistic mock data and customizable response logic.

## Installation

```bash
pnpm add -D @websublime/vite-plugin-open-api-server
```

```bash
npm install -D @websublime/vite-plugin-open-api-server
```

```bash
yarn add -D @websublime/vite-plugin-open-api-server
```

## Usage

Add the plugin to your `vite.config.ts`:

```typescript
import { openApiServerPlugin } from '@websublime/vite-plugin-open-api-server';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    openApiServerPlugin({
      openApiPath: './src/apis/petstore/petstore.openapi.yaml',
      port: 3456,
      proxyPath: '/api',
      handlersDir: './src/apis/petstore/handlers',
      seedsDir: './src/apis/petstore/seeds',
    }),
  ],
});
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `openApiPath` | `string` | - | Path to the OpenAPI specification file (YAML or JSON) |
| `port` | `number` | `3456` | Port number for the mock server |
| `proxyPath` | `string` | `'/api'` | URL path prefix for proxying requests to the mock server |
| `handlersDir` | `string` | - | Directory containing custom handler files (`.mjs`) |
| `seedsDir` | `string` | - | Directory containing seed data files (`.mjs`) |
| `verbose` | `boolean` | `false` | Enable verbose logging for debugging |

### Custom Handlers

Create custom handlers to override default mock responses:

```javascript
// handlers/get.getPetById.mjs
export default function handler(context) {
  const { params, query, operation, seeds } = context;

  return {
    id: Number(params.petId),
    name: 'Custom Pet',
    status: 'available',
  };
}
```

### Seed Data

Create seed files to provide consistent test data:

```javascript
// seeds/pets.seed.mjs
export default function seed(context) {
  const { faker, operationId } = context;

  return {
    pets: Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: faker?.animal?.petName() ?? `Pet ${i + 1}`,
      status: 'available',
    })),
  };
}
```

> **Note:** To use Faker.js in seed files, install it as an optional peer dependency:
> ```bash
> pnpm add -D @faker-js/faker
> ```

### Error Simulation

Custom handlers can check query parameters to simulate error scenarios and response delays. This pattern enables frontend developers to test error handling without modifying backend services.

> **Note:** Error simulation is implemented in your custom handler code, not as a built-in plugin feature. This gives you full control over the simulation behavior.

#### Supported Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `simulateError` | HTTP error code to return | `?simulateError=404` |
| `delay` | Response delay in milliseconds | `?delay=2000` |

#### Supported Error Codes

| Code | Description |
|------|-------------|
| `400` | Bad Request - Invalid input or validation error |
| `401` | Unauthorized - Missing or invalid credentials |
| `403` | Forbidden - Access denied |
| `404` | Not Found - Resource does not exist |
| `500` | Internal Server Error - Unexpected server failure |
| `503` | Service Unavailable - Service temporarily unavailable |

#### Example Handler with Error Simulation

```typescript
import type { HandlerContext, HandlerResponse } from '@websublime/vite-plugin-open-api-server';

export default async function handler(
  context: HandlerContext
): Promise<HandlerResponse | null> {
  // Simulate network delay
  if (context.query.delay) {
    const delayMs = parseInt(context.query.delay as string, 10);
    if (!isNaN(delayMs) && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Simulate error response
  if (context.query.simulateError) {
    const errorCode = parseInt(context.query.simulateError as string, 10);

    switch (errorCode) {
      case 400:
        return { status: 400, body: { error: 'Bad Request', message: 'Invalid input' } };
      case 401:
        return { status: 401, body: { error: 'Unauthorized', message: 'Missing credentials' } };
      case 403:
        return { status: 403, body: { error: 'Forbidden', message: 'Access denied' } };
      case 404:
        return { status: 404, body: { error: 'Not Found', message: 'Resource not found' } };
      case 500:
        return { status: 500, body: { error: 'Internal Server Error', message: 'Something went wrong' } };
      case 503:
        return { status: 503, body: { error: 'Service Unavailable', message: 'Try again later' } };
    }
  }

  // No simulation, use default mock response
  return null;
}
```

#### Usage Examples

```typescript
// Simulate 404 error
fetch('/api/pet/999?simulateError=404')

// Simulate slow network (3 second delay)
fetch('/api/pets?delay=3000')

// Combine error with delay (simulates slow failure)
fetch('/api/pet/1?simulateError=500&delay=2000')
```

#### Best Practices

- **Parse carefully**: Query params are `string | string[]`; always use `parseInt()` with validation
- **Set reasonable limits**: Consider capping delays (e.g., max 10 seconds) to prevent hung requests
- **Consistent error format**: Use a standard error response structure across all handlers
- **Document for your team**: Add comments explaining available simulation options

## Features

- 🚀 **Automatic Mock Server** - Powered by [@scalar/mock-server](https://github.com/scalar/scalar)
- 📄 **OpenAPI Support** - Load specs from YAML or JSON files
- 🔄 **Hot Reload** - Automatically reload handlers and seeds on file changes
- 🎯 **Custom Handlers** - Override mock responses with custom logic
- 🌱 **Seed Data** - Provide consistent test data with optional Faker.js integration
- 🔌 **Vite Integration** - Seamless integration with Vite's dev server
- 📊 **Endpoint Registry** - Track all available endpoints and their customization status
- 🛡️ **TypeScript** - Full TypeScript support with exported types

## Requirements

- **Node.js**: `^20.19.0` or `>=22.12.0`
- **Vite**: `^6.0.0` or `^7.0.0`

## TypeScript

The plugin exports TypeScript types for full type safety:

```typescript
import type {
  OpenApiServerPluginOptions,
  HandlerContext,
  SeedContext,
  OpenApiEndpointRegistry,
} from '@websublime/vite-plugin-open-api-server';
```

## API Reference

### Types

| Type | Description |
|------|-------------|
| `OpenApiServerPluginOptions` | Plugin configuration options |
| `HandlerContext` | Context object passed to custom handlers |
| `SeedContext` | Context object passed to seed functions |
| `OpenApiEndpointRegistry` | Registry of all parsed endpoints |

### Handler Context Properties

| Property | Type | Description |
|----------|------|-------------|
| `params` | `Record<string, string>` | Path parameters (e.g., `{ petId: '123' }`) |
| `query` | `Record<string, string>` | Query string parameters |
| `operation` | `object` | OpenAPI operation definition |
| `seeds` | `Record<string, unknown>` | Loaded seed data |
| `request` | `Request` | Original request object |

### Seed Context Properties

| Property | Type | Description |
|----------|------|-------------|
| `faker` | `Faker \| undefined` | Faker.js instance (if installed) |
| `operationId` | `string` | OpenAPI operation ID |

## License

[MIT](../../LICENSE)