# Swagger Petstore API

Official OpenAPI 3.0 example specification from the [OpenAPI Initiative](https://swagger.io/).

## Overview

The Swagger Petstore is a canonical example API used to demonstrate OpenAPI specification features.
It provides a complete REST API for managing a virtual pet store, including pet management,
store orders, and user accounts.

- **OpenAPI Version**: 3.0.4
- **API Version**: 1.0.27
- **Source**: [https://petstore3.swagger.io/api/v3/openapi.yaml](https://petstore3.swagger.io/api/v3/openapi.yaml)
- **Base Path**: `/api/v3`

## Endpoints (19 operations)

### Pet Operations

| Method | Path | Operation ID | Description |
|--------|------|--------------|-------------|
| POST | `/pet` | `addPet` | Add a new pet to the store |
| PUT | `/pet` | `updatePet` | Update an existing pet |
| GET | `/pet/findByStatus` | `findPetsByStatus` | Find pets by status (available, pending, sold) |
| GET | `/pet/findByTags` | `findPetsByTags` | Find pets by tags |
| GET | `/pet/{petId}` | `getPetById` | Find pet by ID |
| POST | `/pet/{petId}` | `updatePetWithForm` | Update a pet with form data |
| DELETE | `/pet/{petId}` | `deletePet` | Delete a pet |
| POST | `/pet/{petId}/uploadImage` | `uploadFile` | Upload an image for a pet |

### Store Operations

| Method | Path | Operation ID | Description |
|--------|------|--------------|-------------|
| GET | `/store/inventory` | `getInventory` | Returns pet inventories by status |
| POST | `/store/order` | `placeOrder` | Place an order for a pet |
| GET | `/store/order/{orderId}` | `getOrderById` | Find purchase order by ID |
| DELETE | `/store/order/{orderId}` | `deleteOrder` | Delete purchase order by ID |

### User Operations

| Method | Path | Operation ID | Description |
|--------|------|--------------|-------------|
| POST | `/user` | `createUser` | Create user |
| POST | `/user/createWithList` | `createUsersWithListInput` | Create users from list |
| GET | `/user/login` | `loginUser` | Log user into the system |
| GET | `/user/logout` | `logoutUser` | Log out current user session |
| GET | `/user/{username}` | `getUserByName` | Get user by username |
| PUT | `/user/{username}` | `updateUser` | Update user |
| DELETE | `/user/{username}` | `deleteUser` | Delete user |

## Schemas

The API defines the following data models in `components/schemas`:

| Schema | Type | Description |
|--------|------|-------------|
| `Pet` | object | Pet entity with id, name, category, photoUrls, tags, status |
| `Category` | object | Pet category with id and name |
| `Tag` | object | Pet tag with id and name |
| `Order` | object | Store order with id, petId, quantity, shipDate, status, complete |
| `User` | object | User account with id, username, firstName, lastName, email, password, phone, userStatus |
| `ApiResponse` | object | Generic API response with code, type, message |

### Pet Status Values

- `available` - Pet is available for purchase
- `pending` - Pet is reserved/pending
- `sold` - Pet has been sold

### Order Status Values

- `placed` - Order has been placed
- `approved` - Order has been approved
- `delivered` - Order has been delivered

## Authentication

The API uses two security schemes:

### API Key (`api_key`)

- **Type**: apiKey
- **Location**: header
- **Header Name**: `api_key`

Used for endpoints like `getPetById` and `getInventory`.

### OAuth 2.0 (`petstore_auth`)

- **Type**: oauth2
- **Flow**: implicit
- **Authorization URL**: `https://petstore3.swagger.io/oauth/authorize`

**Scopes**:
- `write:pets` - Modify pets in your account
- `read:pets` - Read your pets

Used for most pet modification endpoints.

## Custom Handlers

The following custom handlers are available to override default mock behavior:

| File | Endpoint | Description |
|------|----------|-------------|
| `add-pet.handler.ts` | POST `/pet` | Handle pet creation with custom logic |
| `get-pet-by-id.handler.ts` | GET `/pet/{petId}` | Handle pet retrieval with database lookup |
| `update-pet.handler.ts` | PUT `/pet` | Handle pet updates with validation |
| `delete-pet.handler.ts` | DELETE `/pet/{petId}` | Handle pet deletion with authorization |

### Handler Structure

Each handler exports a default async function:

```typescript
import type { HandlerContext } from '@websublime/vite-plugin-open-api-server';

export default async function handler(context: HandlerContext) {
  // Return null to use default mock behavior
  // Return { status: number, body: any } for custom response
  return null;
}
```

## Seeds

The following seed files populate the mock server with initial data:

| File | Schema | Description |
|------|--------|-------------|
| `pets.seed.ts` | Pet | Sample pet data with various statuses |
| `users.seed.ts` | User | Sample user accounts for testing |
| `orders.seed.ts` | Order | Sample orders with different statuses |

### Seed Structure

Each seed exports a default async function:

```typescript
import type { SeedContext } from '@websublime/vite-plugin-open-api-server';

export default async function seed(context: SeedContext) {
  // Return array of entities to seed
  // Return empty array for no seed data
  return [];
}
```

## Directory Structure

```
petstore/
├── README.md                          # This file
├── petstore.openapi.yaml              # OpenAPI 3.0 specification
└── open-api-server/
    ├── handlers/                      # Custom request handlers
    │   ├── add-pet.handler.ts
    │   ├── delete-pet.handler.ts
    │   ├── get-pet-by-id.handler.ts
    │   └── update-pet.handler.ts
    └── seeds/                         # Data seed generators
        ├── orders.seed.ts
        ├── pets.seed.ts
        └── users.seed.ts
```

## Usage

The Petstore API is configured in `vite.config.ts`:

```typescript
import { openApiServerPlugin } from '@websublime/vite-plugin-open-api-server';

export default defineConfig({
  plugins: [
    openApiServerPlugin({
      openApiPath: './src/apis/petstore/petstore.openapi.yaml',
      port: 3456,
      proxyPath: '/api/v3',
      handlersDir: './src/apis/petstore/open-api-server/handlers',
      seedsDir: './src/apis/petstore/open-api-server/seeds',
      verbose: true,
    }),
  ],
});
```

## API Examples

### Create a Pet

```bash
curl -X POST http://localhost:3456/api/v3/pet \
  -H "Content-Type: application/json" \
  -d '{
    "name": "doggie",
    "photoUrls": ["https://example.com/photo.jpg"],
    "status": "available"
  }'
```

### Get a Pet by ID

```bash
curl http://localhost:3456/api/v3/pet/1
```

### Find Pets by Status

```bash
curl "http://localhost:3456/api/v3/pet/findByStatus?status=available"
```

### Place an Order

```bash
curl -X POST http://localhost:3456/api/v3/store/order \
  -H "Content-Type: application/json" \
  -d '{
    "petId": 1,
    "quantity": 1,
    "status": "placed"
  }'
```

## References

- [Swagger Petstore Live Demo](https://petstore3.swagger.io/)
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.0.4.html)
- [Swagger Editor](https://editor.swagger.io/)
- [vite-plugin-open-api-server](https://github.com/websublime/vite-open-api-server)