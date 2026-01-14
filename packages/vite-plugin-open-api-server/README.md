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

#### Delay Simulation Patterns

The `delay` parameter enables testing of loading states, timeouts, and slow network conditions:

```typescript
// Basic delay pattern
if (context.query.delay) {
  const delayMs = parseInt(context.query.delay as string, 10);
  if (!isNaN(delayMs) && delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
```

**Common Use Cases:**

| Scenario | Example | Purpose |
|----------|---------|---------|
| Loading spinner | `?delay=1000` | Verify loading UI displays correctly |
| Timeout testing | `?delay=31000` | Test client-side timeout handling (e.g., 30s limit) |
| Slow network | `?delay=5000` | Simulate poor connection quality |
| Race condition | `?delay=100` | Test concurrent request handling |

**Testing Network Timeouts:**

```typescript
// Frontend code with timeout handling
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch('/api/pets?delay=10000', {
    signal: controller.signal,
  });
  // Handle success
} catch (error) {
  if (error.name === 'AbortError') {
    // Handle timeout - show retry option
  }
} finally {
  clearTimeout(timeoutId);
}
```

**Handler with Capped Delay:**

```typescript
const MAX_DELAY_MS = 10000; // 10 second cap

if (context.query.delay) {
  const requestedDelay = parseInt(context.query.delay as string, 10);
  const actualDelay = Math.min(Math.max(0, requestedDelay), MAX_DELAY_MS);
  await new Promise((resolve) => setTimeout(resolve, actualDelay));
}
```

#### Error Response Bodies

Use a consistent error response format across all handlers. The recommended structure includes:

| Field | Type | Description |
|-------|------|-------------|
| `error` | `string` | Short error type (e.g., "Not Found", "Bad Request") |
| `message` | `string` | Human-readable description of the error |
| `code` | `string` | Machine-readable error code (e.g., "NOT_FOUND", "VALIDATION_ERROR") |
| `details` | `array` | Optional field-level errors for validation failures |

**Standard Error Response Examples:**

```typescript
// 400 Bad Request - Validation Error
{
  status: 400,
  body: {
    error: 'Bad Request',
    message: 'Invalid pet data: name is required',
    code: 'VALIDATION_ERROR',
    details: [
      { field: 'name', message: 'Name is required' },
      { field: 'photoUrls', message: 'At least one photo URL is required' }
    ]
  }
}

// 401 Unauthorized
{
  status: 401,
  body: {
    error: 'Unauthorized',
    message: 'Authentication required',
    code: 'AUTH_REQUIRED'
  },
  headers: {
    'WWW-Authenticate': 'Bearer realm="api"'
  }
}

// 404 Not Found
{
  status: 404,
  body: {
    error: 'Not Found',
    message: 'Pet with ID 999 not found',
    code: 'PET_NOT_FOUND'
  }
}

// 500 Internal Server Error
{
  status: 500,
  body: {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR'
  }
}
```

**RFC 7807 Problem Details (Optional)**

For APIs following [RFC 7807](https://tools.ietf.org/html/rfc7807), use this format:

```typescript
{
  status: 404,
  body: {
    type: 'https://api.example.com/problems/pet-not-found',
    title: 'Pet Not Found',
    status: 404,
    detail: 'Pet with ID 999 does not exist in the database',
    instance: '/pet/999'
  },
  headers: {
    'Content-Type': 'application/problem+json'
  }
}
```

#### Best Practices

- **Parse carefully**: Query params are `string | string[]`; always use `parseInt()` with validation
- **Set reasonable limits**: Consider capping delays (e.g., max 10 seconds) to prevent hung requests
- **Consistent error format**: Use a standard error response structure across all handlers
- **Document for your team**: Add comments explaining available simulation options
- **Include error codes**: Machine-readable codes help frontend handle errors programmatically
- **Use appropriate headers**: Set `WWW-Authenticate` for 401, `Content-Type` for RFC 7807

### Security Schemes

The mock server validates the **presence** of authentication credentials, not their validity. Any non-empty credential value is accepted in development mode. This simplifies local development while still testing that your frontend sends the correct authentication headers.

#### Supported Authentication Types

| Type | OpenAPI Type | Header/Location |
|------|--------------|-----------------|
| API Key | `apiKey` | Custom header, query param, or cookie |
| Bearer Token | `http` (bearer) | `Authorization: Bearer <token>` |
| Basic Auth | `http` (basic) | `Authorization: Basic <base64>` |
| OAuth2 | `oauth2` | `Authorization: Bearer <token>` |
| OpenID Connect | `openIdConnect` | `Authorization: Bearer <token>` |

#### API Key Authentication

When your OpenAPI spec defines an API key security scheme:

```yaml
components:
  securitySchemes:
    api_key:
      type: apiKey
      name: api_key
      in: header
```

**Usage:**

```bash
# Without API key (returns 401 Unauthorized)
curl http://localhost:3456/pet/1
# Response: {"error":"Unauthorized","message":"Authentication is required..."}

# With API key (returns 200 OK)
curl -H "api_key: any-value-here" http://localhost:3456/pet/1
# Response: {"id":1,"name":"doggie","status":"available"}
```

```typescript
// Frontend example
const response = await fetch('/api/pet/1', {
  headers: {
    'api_key': 'my-development-key'
  }
});
```

#### Bearer Token Authentication

For OAuth2 or HTTP Bearer authentication:

```yaml
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

**Usage:**

```bash
# Without token (returns 401)
curl http://localhost:3456/store/inventory

# With Bearer token (returns 200)
curl -H "Authorization: Bearer my-test-token" http://localhost:3456/store/inventory
```

```typescript
// Frontend example with token
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const response = await fetch('/api/store/inventory', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

#### Basic Authentication

For HTTP Basic authentication:

```yaml
components:
  securitySchemes:
    basicAuth:
      type: http
      scheme: basic
```

**Usage:**

```bash
# With Basic auth (any credentials accepted)
curl -H "Authorization: Basic dXNlcjpwYXNzd29yZA==" http://localhost:3456/user/john

# Using curl's built-in Basic auth
curl -u "user:password" http://localhost:3456/user/john
```

```typescript
// Frontend example
const credentials = btoa('username:password');
const response = await fetch('/api/user/john', {
  headers: {
    'Authorization': `Basic ${credentials}`
  }
});
```

#### Multiple Security Schemes (OR Logic)

When an endpoint accepts multiple security schemes, **any one** of them is sufficient:

```yaml
paths:
  /pet/{petId}:
    get:
      security:
        - api_key: []
        - petstore_auth:
            - read:pets
```

This means the request succeeds if **either** the `api_key` header **or** a Bearer token is provided:

```bash
# Option 1: Use API key
curl -H "api_key: test123" http://localhost:3456/pet/1

# Option 2: Use Bearer token (OAuth2)
curl -H "Authorization: Bearer my-token" http://localhost:3456/pet/1

# Both return 200 OK - either authentication method works
```

#### Security Context in Handlers

Custom handlers receive security information via `context.security`:

```typescript
import type { HandlerContext, HandlerResponse } from '@websublime/vite-plugin-open-api-server';

export default async function handler(
  context: HandlerContext
): Promise<HandlerResponse | null> {
  const { security } = context;

  // Check if authentication is required
  if (security.requirements.length > 0 && !security.credentials) {
    return {
      status: 401,
      body: { error: 'Unauthorized', message: 'Authentication required' }
    };
  }

  // Access the matched scheme
  if (security.scheme?.type === 'apiKey') {
    console.log(`API key provided in ${security.scheme.in}: ${security.scheme.name}`);
  }

  // Check OAuth2 scopes
  if (!security.scopes.includes('write:pets')) {
    return {
      status: 403,
      body: { error: 'Forbidden', message: 'Insufficient permissions' }
    };
  }

  // Proceed with authenticated request
  return null; // Use default mock response
}
```

**SecurityContext Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `requirements` | `SecurityRequirement[]` | Security requirements from the spec |
| `scheme` | `NormalizedSecurityScheme \| null` | Matched security scheme |
| `credentials` | `string \| null` | Extracted credentials (API key, token, etc.) |
| `scopes` | `string[]` | OAuth2/OIDC scopes from the request |

#### Dev Mode Simplification

In development mode, the mock server:

- ✅ Validates that required credentials are **present** (non-empty)
- ✅ Returns `401 Unauthorized` when credentials are missing
- ✅ Accepts **any** non-empty credential value
- ❌ Does **not** validate token signatures (JWT, OAuth2)
- ❌ Does **not** check credential correctness
- ❌ Does **not** verify OAuth2 scopes from tokens

This approach lets you test that your frontend sends authentication correctly without setting up a real auth provider.

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