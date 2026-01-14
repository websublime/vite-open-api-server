# Petstore Playground Application

This is a Vue 3 application that demonstrates the `@websublime/vite-plugin-open-api-server` plugin in action. It serves as both a development environment for testing plugin changes and a reference implementation for users.

## Purpose

- **Plugin Development**: Test plugin changes in a realistic environment
- **Integration Testing**: Verify plugin behavior with a complete Vite application
- **Documentation**: Provide working examples of custom handlers and seed data
- **Debugging**: Enable verbose logging to troubleshoot issues

> **Note**: This application is NOT published to npm (`private: true`). It exists solely for development and testing purposes.

## Running the Playground

From the repository root:

```bash
# Install dependencies (if not already done)
pnpm install

# Build the plugin first
pnpm build

# Run the playground
pnpm playground
```

The application will start at `http://localhost:5173` with the mock API available at `http://localhost:5173/api/v3/*`.

## Development Workflow

For active plugin development, use a two-terminal workflow:

### Terminal 1: Plugin Watch Mode

```bash
# From repository root
pnpm dev
```

This watches the plugin source files and rebuilds on changes.

### Terminal 2: Playground

```bash
# From repository root
pnpm playground
```

This runs the Vue application with hot module replacement.

When you modify plugin source code, the plugin will rebuild automatically. You may need to restart the playground to pick up plugin changes (Ctrl+C and re-run `pnpm playground`).

## Project Structure

```
petstore-app/
├── src/
│   ├── apis/
│   │   └── petstore/
│   │       ├── petstore.openapi.yaml    # Swagger Petstore OpenAPI spec
│   │       └── open-api-server/
│   │           ├── handlers/            # Custom request handlers
│   │           └── seeds/               # Seed data files
│   ├── App.vue                          # Main Vue component
│   ├── main.ts                          # Application entry point
│   └── vite-env.d.ts                    # Vite type declarations
├── vite.config.ts                       # Vite + plugin configuration
├── index.html                           # HTML entry point
├── package.json                         # Package configuration
└── tsconfig.json                        # TypeScript configuration
```

## OpenAPI Specification

The playground uses the **Swagger Petstore API** specification, a widely-used example API that includes:

- **Pet endpoints**: CRUD operations for pets
- **Store endpoints**: Order management
- **User endpoints**: User authentication and management

Location: `src/apis/petstore/petstore.openapi.yaml`

## Plugin Configuration

The plugin is configured in `vite.config.ts`:

```typescript
openApiServerPlugin({
  openApiPath: './src/apis/petstore/petstore.openapi.yaml',
  port: 3456,
  proxyPath: '/api/v3',
  handlersDir: './src/apis/petstore/open-api-server/handlers',
  seedsDir: './src/apis/petstore/open-api-server/seeds',
  verbose: true,
})
```

| Option | Value | Description |
|--------|-------|-------------|
| `openApiPath` | `./src/apis/petstore/petstore.openapi.yaml` | Petstore OpenAPI spec |
| `port` | `3456` | Mock server port |
| `proxyPath` | `/api/v3` | API proxy prefix |
| `handlersDir` | `./src/apis/petstore/open-api-server/handlers` | Custom handlers directory |
| `seedsDir` | `./src/apis/petstore/open-api-server/seeds` | Seed data directory |
| `verbose` | `true` | Enable detailed logging |

## Custom Handlers

Custom handlers allow you to override the default mock responses. Place handler files in the `handlers/` directory following the naming convention:

```
<method>.<operationId>.mjs
```

Examples:
- `get.getPetById.mjs` - Custom response for GET /pet/{petId}
- `post.addPet.mjs` - Custom response for POST /pet

See the [plugin README](../../packages/vite-plugin-open-api-server/README.md) for handler implementation details.

## Seed Data

Seed files provide consistent test data across handlers. Place seed files in the `seeds/` directory:

```
<name>.seed.mjs
```

Examples:
- `pets.seed.mjs` - Seed data for pet operations
- `orders.seed.mjs` - Seed data for store operations

See the [plugin README](../../packages/vite-plugin-open-api-server/README.md) for seed implementation details.

## Testing API Endpoints

With the playground running, test endpoints using curl or your preferred HTTP client:

```bash
# Get all pets
curl http://localhost:5173/api/v3/pet/findByStatus?status=available

# Get a specific pet
curl http://localhost:5173/api/v3/pet/1

# Create a new pet
curl -X POST http://localhost:5173/api/v3/pet \
  -H "Content-Type: application/json" \
  -d '{"name": "Buddy", "status": "available"}'
```

## Troubleshooting

### Mock server not starting

1. Ensure the plugin is built: `pnpm build`
2. Check the console for error messages
3. Verify the OpenAPI spec path is correct

### Handler changes not reflecting

1. Handlers use dynamic imports - changes should be hot-reloaded
2. If not working, restart the playground: Ctrl+C and `pnpm playground`

### Port already in use

If port 3456 is in use, modify the `port` option in `vite.config.ts`:

```typescript
openApiServerPlugin({
  port: 3457, // Use a different port
  // ... other options
})
```
