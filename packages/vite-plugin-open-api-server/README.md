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

## License

[MIT](../../LICENSE)