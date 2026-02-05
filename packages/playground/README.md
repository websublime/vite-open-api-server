# Petstore Playground

Demo application for **vite-open-api-server** showcasing all features with the Swagger Petstore API.

## 📋 Overview

This playground demonstrates:

- ✅ OpenAPI 3.0 spec parsing and validation
- ✅ Auto-generated mock endpoints from OpenAPI spec
- ✅ Custom handlers for business logic
- ✅ Seed data population with Faker.js
- ✅ In-memory data store with CRUD operations
- ✅ DevTools integration for debugging
- ✅ Hot reload for handlers and seeds
- ✅ Request/response logging

## 🚀 Quick Start

### Install Dependencies

```bash
# From monorepo root
pnpm install
```

### Run the Playground

```bash
# From monorepo root
pnpm playground

# Or from this directory
pnpm dev
```

The app will start at **http://localhost:5173**

The mock API server runs at **http://localhost:4000**

## 🎯 Features

### 📁 Project Structure

```
playground/
├── openapi/
│   └── petstore.yaml       # OpenAPI 3.0 specification
├── mocks/
│   ├── handlers/           # Custom handler functions
│   │   └── pets.handler.ts
│   └── seeds/              # Seed data generators
│       └── pets.seed.ts
├── src/
│   ├── App.vue             # Demo UI
│   └── main.ts             # App entry point
├── vite.config.ts          # Vite + plugin configuration
└── package.json
```

### 🔧 Custom Handlers

Located in `mocks/handlers/pets.handler.ts`:

- **getPetById** - Custom 404 handling
- **findPetsByStatus** - Case-insensitive filtering
- **addPet** - Field validation and ID generation
- **updatePet** - Existence check before update
- **deletePet** - Custom deletion logic

### 🌱 Seed Data

Located in `mocks/seeds/pets.seed.ts`:

- **Category** - 6 fixed categories
- **Tag** - 10 common pet tags
- **Pet** - 20 random pets with realistic data
- **Order** - 10 orders referencing pets
- **User** - 5 sample users

## 🛠️ Available Endpoints

### Pets

- `GET /api/v3/pet/findByStatus?status=available`
- `GET /api/v3/pet/{petId}`
- `POST /api/v3/pet`
- `PUT /api/v3/pet`
- `DELETE /api/v3/pet/{petId}`

### Store

- `GET /api/v3/store/inventory`
- `POST /api/v3/store/order`
- `GET /api/v3/store/order/{orderId}`
- `DELETE /api/v3/store/order/{orderId}`

### Users

- `GET /api/v3/user/login?username=user&password=pass`
- `GET /api/v3/user/logout`
- `POST /api/v3/user`
- `GET /api/v3/user/{username}`
- `PUT /api/v3/user/{username}`
- `DELETE /api/v3/user/{username}`

## 🔍 DevTools

Access the DevTools at **http://localhost:5173/_devtools**

Features:
- 📍 **Routes** - Browse all endpoints and their details
- ⏱️ **Timeline** - View request/response history
- 💾 **Models** - Inspect and edit store data
- ⚡ **Simulator** - Simulate errors and delays

## 📚 Learn More

### Modifying Handlers

Edit `mocks/handlers/pets.handler.ts`:

```typescript
import { defineHandlers } from '@websublime/vite-plugin-open-api-server';

export default defineHandlers({
  getPetById: ({ req, store, logger }) => {
    const petId = parseInt(req.params.petId, 10);
    const pet = store.get('Pet', petId);
    
    if (!pet) {
      return { type: 'status', status: 404, data: { message: 'Not found' } };
    }
    
    return { type: 'raw', data: pet };
  },
});
```

### Modifying Seeds

Edit `mocks/seeds/pets.seed.ts`:

```typescript
import { defineSeeds } from '@websublime/vite-plugin-open-api-server';

export default defineSeeds({
  Pet: ({ seed, faker }) => seed.count(10, (index) => ({
    id: index + 1,
    name: faker.animal.dog(),
    status: 'available',
  })),
});
```

### Plugin Configuration

Edit `vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [
    vue(),
    openApiServer({
      spec: './openapi/petstore.yaml',
      port: 4000,
      proxyPath: '/api/v3',
      handlersDir: './mocks/handlers',
      seedsDir: './mocks/seeds',
      devtools: true,
    }),
  ],
});
```

## 🔥 Hot Reload

Changes to handlers and seeds are automatically reloaded:

1. Edit a handler or seed file
2. Save the file
3. The mock server reloads automatically
4. No need to restart the dev server

## 📖 Documentation

For full documentation, see the main repository README.

## 📝 License

MIT
