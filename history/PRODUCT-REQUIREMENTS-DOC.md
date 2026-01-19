# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## vite-plugin-open-api-server v2.0

**Version:** 2.0.0  
**Date:** January 2026  
**Status:** Approved - Ready for Technical Specification  
**Authors:** Product Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Core Features (Plugin)](#3-core-features-plugin)
4. [DevTools Client Features](#4-devtools-client-features)
5. [Plugin Configuration](#5-plugin-configuration)
6. [Startup Banner & Logging](#6-startup-banner--logging)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Out of Scope](#8-out-of-scope-v20)
9. [Milestones & Phases](#9-milestones--phases)
10. [Decision Summary](#10-decision-summary)

---

## 1. Executive Summary

### 1.1 Product Vision

**vite-plugin-open-api-server** is a Vite plugin that provides a local server based on OpenAPI specifications, freeing frontend developers from backend dependencies. The server interprets the OpenAPI spec, automatically generates endpoints with realistic data, and offers a visual interface integrated into Vue DevTools for monitoring and scenario simulation.

### 1.2 Value Proposition

| Benefit | Description |
|---------|-------------|
| **Zero Backend Dependency** | Frontend development without online services |
| **OpenAPI-First** | Automatic sync with spec - changes reflected instantly |
| **Realistic Data** | Automatic fake data generation based on schemas |
| **Scenario Simulation** | Dedicated UI to simulate errors, delays, and edge cases |
| **Integrated DevTools** | Request timeline and simulation management in Vue DevTools |
| **Hot Reload** | Handlers and seeds reloaded without server restart |

### 1.3 Target Users

| Persona | Role | Key Needs |
|---------|------|-----------|
| **Frontend Developer** | Builds UI components and features | Quick startup, realistic data, error simulation |
| **Full-Stack Developer** | Works on both frontend and backend | Toggle between mock and real backend |
| **QA Engineer** | Tests application functionality | Simulate edge cases and error scenarios |

### 1.4 User Stories

**US-001:** As a frontend developer, I want to start development without waiting for backend services so that I can be productive immediately.

**US-002:** As a frontend developer, I want consistent data between sessions so that I can reproduce and debug issues reliably.

**US-003:** As a QA engineer, I want to simulate error responses (401, 500, etc.) so that I can verify error handling flows.

**US-004:** As a developer, I want network delay simulation so that I can test loading states and timeout handling.

**US-005:** As a team lead, I want centralized configuration so that all team members have the same development experience.

---

## 2. System Architecture

### 2.1 Monorepo Structure

```
packages/
├── core/                      # Core server logic
│   ├── src/
│   │   ├── parser/           # OpenAPI parsing & validation
│   │   ├── router/           # Hono routing engine
│   │   ├── store/            # In-memory data store
│   │   ├── generator/        # Fake data generation
│   │   ├── handlers/         # Handler execution context
│   │   └── websocket/        # WebSocket server
│   └── package.json
│
├── devtools-client/          # Vue SPA for DevTools
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Routes.vue    # Endpoint listing
│   │   │   ├── Timeline.vue  # Request/response log
│   │   │   ├── Models.vue    # Store data management
│   │   │   └── Simulator.vue # Error simulation
│   │   ├── components/
│   │   ├── composables/
│   │   └── stores/
│   └── package.json
│
├── vite-plugin/              # Vite plugin wrapper
│   ├── src/
│   │   ├── plugin.ts         # Main plugin
│   │   ├── proxy.ts          # Request proxying
│   │   └── devtools.ts       # DevTools integration
│   └── package.json
│
└── playground/               # Demo app (Petstore)
    ├── src/
    ├── openapi/
    │   └── petstore.yaml
    ├── mocks/
    │   ├── handlers/
    │   └── seeds/
    └── package.json
```

### 2.2 Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Server** | Hono | Lightweight, fast, modern API, native WebSocket |
| **Parser** | @scalar/openapi-parser | OAS 3.0/3.1 support, dereference, validation |
| **Bundler** | @scalar/json-magic | External reference resolution, YAML/JSON parsing |
| **Upgrader** | @scalar/openapi-upgrader | Convert OAS 2.0/3.0 to 3.1 |
| **Fake Data** | Faker.js | Mature library, varied formats |
| **DevTools UI** | Vue 3 + OpenProps | Consistent with Vue DevTools, CSS design system |
| **Icons** | Lucide | Tree-shakeable, lightweight, consistent |
| **State** | Pinia | Vue 3 standard |
| **Build** | Vite + tsup | Ecosystem consistency |

### 2.3 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              VITE DEV SERVER                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐     ┌─────────────────────────────────────────┐   │
│  │  vite-plugin     │────▶│           HONO OPENAPI SERVER           │   │
│  │  (proxy config)  │     │                                          │   │
│  └──────────────────┘     │  ┌─────────┐  ┌─────────┐  ┌─────────┐  │   │
│                           │  │ Router  │──│  Store  │──│Generator│  │   │
│  ┌──────────────────┐     │  └────┬────┘  └─────────┘  └─────────┘  │   │
│  │  Vue App         │────▶│       │                                  │   │
│  │  (fetch /api/*)  │     │  ┌────▼────┐  ┌─────────────────────┐   │   │
│  └──────────────────┘     │  │Handlers │  │    WebSocket Hub    │◀──┼───┤
│                           │  └─────────┘  └──────────┬──────────┘   │   │
│                           └──────────────────────────┼──────────────┘   │
│                                                      │                   │
└──────────────────────────────────────────────────────┼───────────────────┘
                                                       │
                    ┌──────────────────────────────────┼───────────────┐
                    │              VUE DEVTOOLS                         │
                    │  ┌────────────────────────────────────────────┐  │
                    │  │         DevTools Client (iframe)           │  │
                    │  │                                            │  │
                    │  │  ┌─────────┐ ┌─────────┐ ┌────────────────┐│  │
                    │  │  │ Routes  │ │Timeline │ │Models│Simulator││  │
                    │  │  └─────────┘ └─────────┘ └────────────────┘│  │
                    │  │         ▲                                   │  │
                    │  │         │ WebSocket Connection              │  │
                    │  │         └───────────────────────────────────│  │
                    │  └────────────────────────────────────────────┘  │
                    └──────────────────────────────────────────────────┘
```

---

## 3. Core Features (Plugin)

### 3.1 FR-001: OpenAPI Document Processing

**Priority:** P0 (Critical)

**Description:** The plugin MUST process OpenAPI documents following the Scalar pipeline: bundle external references, upgrade to OpenAPI 3.1, and dereference all `$ref` pointers.

**Processing Pipeline:**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Input         │───▶│   Bundle        │───▶│   Upgrade       │───▶│  Dereference    │
│ (string/object) │    │ (resolve refs)  │    │ (to OAS 3.1)    │    │ (inline $refs)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Dependencies:**

```typescript
import { bundle } from '@scalar/json-magic/bundle';
import { parseJson, parseYaml, readFiles, fetchUrls } from '@scalar/json-magic/bundle/plugins/node';
import { dereference } from '@scalar/openapi-parser';
import { upgrade } from '@scalar/openapi-upgrader';
import type { OpenAPIV3_1 } from '@scalar/openapi-types';
```

**Implementation:**

```typescript
/**
 * Processes an OpenAPI document by bundling external references, 
 * upgrading to OpenAPI 3.1, and dereferencing the document.
 *
 * @param document - The OpenAPI document to process. Can be:
 *   - File path (string): './openapi/petstore.yaml'
 *   - URL (string): 'https://example.com/api.json'
 *   - Object: Already parsed OpenAPI document
 * @returns Fully dereferenced OpenAPI 3.1 document
 * @throws Error if document cannot be processed or is invalid
 */
export async function processOpenApiDocument(
  document: string | Record<string, any> | undefined,
): Promise<OpenAPIV3_1.Document> {
  // 1. Handle empty/undefined input
  if (!document || (typeof document === 'object' && Object.keys(document).length === 0)) {
    return {
      openapi: '3.1.0',
      info: { title: 'OpenAPI Server', version: '1.0.0' },
      paths: {},
    };
  }

  let bundled: Record<string, any>;

  try {
    // 2. Bundle external references with Node.js plugins
    bundled = await bundle(document, {
      plugins: [parseJson(), parseYaml(), readFiles(), fetchUrls()],
      treeShake: false,
    });
  } catch (error) {
    throw new Error(`Failed to bundle OpenAPI document: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!bundled || typeof bundled !== 'object') {
    throw new Error('Bundled document is invalid: expected an object');
  }

  let upgraded: OpenAPIV3_1.Document;

  try {
    // 3. Upgrade to OpenAPI 3.1
    upgraded = upgrade(bundled, '3.1');
  } catch (error) {
    throw new Error(`Failed to upgrade to OpenAPI 3.1: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!upgraded) {
    throw new Error('Upgraded document is invalid: upgrade returned null or undefined');
  }

  // 4. Dereference the document (inline all $refs)
  const { schema, errors } = dereference(upgraded);

  if (errors?.length > 0) {
    const errorMessages = errors.map(e => e.message).join(', ');
    throw new Error(`Failed to dereference OpenAPI document: ${errorMessages}`);
  }

  if (!schema || typeof schema !== 'object') {
    throw new Error('Dereferenced schema is invalid: expected an object');
  }

  return schema as OpenAPIV3_1.Document;
}
```

**Processing Steps:**

| Step | Purpose | Library |
|------|---------|---------|
| **Bundle** | Resolve external file/URL references, parse YAML/JSON | `@scalar/json-magic/bundle` |
| **Upgrade** | Convert OAS 2.0/3.0 → 3.1 for consistency | `@scalar/openapi-upgrader` |
| **Dereference** | Inline all `$ref` pointers for easy traversal | `@scalar/openapi-parser` |

**Input Types Supported:**

| Input | Example | Handling |
|-------|---------|----------|
| Local file path | `'./openapi/petstore.yaml'` | `readFiles()` plugin |
| Remote URL | `'https://api.example.com/spec.json'` | `fetchUrls()` plugin |
| YAML string | `'openapi: 3.0.0\ninfo: ...'` | `parseYaml()` plugin |
| JSON string | `'{"openapi": "3.0.0"}'` | `parseJson()` plugin |
| Object | `{ openapi: '3.0.0', ... }` | Direct processing |

**Acceptance Criteria:**
- [ ] Support OpenAPI 2.0 (Swagger), 3.0.x and 3.1.x
- [ ] Support YAML (.yaml, .yml) and JSON (.json) formats
- [ ] Support file paths, URLs, and inline objects
- [ ] Resolve all external $ref references (files, URLs)
- [ ] Upgrade all documents to OpenAPI 3.1.0
- [ ] Dereference all $ref pointers inline
- [ ] Report validation errors with context
- [ ] Return minimal valid document for empty input

---

### 3.2 FR-002: Endpoint Registry

**Priority:** P0 (Critical)

**Description:** Maintain a centralized registry of all endpoints, identified by operationId, with associated metadata.

**Registry Entry:**

```typescript
interface EndpointEntry {
  operationId: string;
  method: HttpMethod;
  path: string;                    // OpenAPI path pattern
  summary?: string;
  description?: string;
  tags: string[];
  responseSchema?: string;         // Schema name for 200/201 response
  hasHandler: boolean;             // Custom handler defined
  hasSeed: boolean;                // Schema has seed defined
  security: SecurityRequirement[]; // Security schemes
}

interface EndpointRegistry {
  endpoints: Map<string, EndpointEntry>;  // key: operationId
  byTag: Map<string, EndpointEntry[]>;    // Grouped by tag
  byPath: Map<string, EndpointEntry[]>;   // Grouped by path pattern
  stats: RegistryStats;
}

interface RegistryStats {
  totalEndpoints: number;
  withCustomHandler: number;
  totalSchemas: number;
  withCustomSeed: number;
  autoGenerated: number;
}
```

**Acceptance Criteria:**
- [ ] Extract all operations from processed OpenAPI document
- [ ] Map each operation by operationId
- [ ] Group operations by tags (primary) and response schema (fallback)
- [ ] Track which endpoints have custom handlers
- [ ] Track which schemas have custom seeds
- [ ] Provide runtime API endpoint for registry access

---

### 3.3 FR-003: Hono OpenAPI Server

**Priority:** P0 (Critical)

**Description:** HTTP server based on Hono that serves endpoints based on the OpenAPI spec.

**Acceptance Criteria:**
- [ ] Support all HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)
- [ ] Support path parameters (`:id`, `:petId`)
- [ ] Support query parameters
- [ ] Support request bodies (JSON, form-data)
- [ ] Respect response content-types defined in spec
- [ ] Generate responses based on priority order:
  1. Custom handler (if exists)
  2. Seed data (if exists)
  3. Spec examples (if exist)
  4. Automatically generated data via Faker
- [ ] Configurable port (default: auto-detect available)
- [ ] Serve DevTools SPA at `/_devtools/`
- [ ] Registry endpoint: `/_api/registry`
- [ ] WebSocket endpoint: `/_ws`

**Server Structure:**

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';

function createOpenApiServer(config: OpenApiServerConfig): Hono {
  const app = new Hono();
  
  // CORS for development
  app.use('*', cors());
  
  // DevTools SPA
  app.get('/_devtools/*', serveDevToolsApp);
  
  // Internal API
  app.get('/_api/registry', getRegistry);
  app.get('/_api/store/:schema', getStoreData);
  app.post('/_api/store/:schema', setStoreData);
  app.post('/_api/simulations', setSimulation);
  app.delete('/_api/simulations/:path', clearSimulation);
  
  // WebSocket
  app.get('/_ws', upgradeWebSocket(handleWebSocket));
  
  // API endpoints (dynamically generated from OpenAPI spec)
  for (const endpoint of registry.endpoints) {
    app[endpoint.method](endpoint.path, createHandler(endpoint));
  }
  
  return app;
}
```

---

### 3.4 FR-004: In-Memory Store

**Priority:** P0 (Critical)

**Description:** In-memory store for data with CRUD operations per schema.

**Store API:**

```typescript
interface Store {
  // List all items of a schema
  list(schema: string): any[];
  
  // Get item by ID
  get(schema: string, id: string | number): any | null;
  
  // Create new item
  create(schema: string, data: any): any;
  
  // Update existing item
  update(schema: string, id: string | number, data: Partial<any>): any | null;
  
  // Delete item
  delete(schema: string, id: string | number): boolean;
  
  // Clear all items of a schema
  clear(schema: string): void;
  
  // Configure identifier field per schema
  setIdField(schema: string, field: string): void;
}
```

**ID Field Configuration:**

```typescript
// By default uses 'id'
store.setIdField('Pet', 'id');
store.setIdField('User', 'username');  // Alternative field
store.setIdField('Order', 'orderId');

// In handlers:
const pet = store.get('Pet', req.params.petId);
const user = store.get('User', req.params.username);
```

**Acceptance Criteria:**
- [ ] CRUD operations per schema (list, get, create, update, delete, clear)
- [ ] Configurable ID field per schema
- [ ] Non-persistent (data lost on restart)
- [ ] Accessible from handlers via context
- [ ] Accessible from DevTools via WebSocket commands

---

### 3.5 FR-005: Custom Handlers

**Priority:** P0 (Critical)

**Description:** System for developers to define custom handlers for endpoints.

**Handler File Format:**

```typescript
// mocks/handlers/pets.handler.ts
import { defineHandlers } from '@websublime/vite-plugin-open-api-server';

export default defineHandlers({
  // Simple handler - returns data
  getPetById: ({ req, store }) => {
    const pet = store.get('Pet', req.params.petId);
    if (!pet) {
      return { status: 404, data: { message: 'Pet not found' } };
    }
    return pet;
  },
  
  // Handler with complex logic
  findPetsByStatus: ({ req, store, faker }) => {
    let pets = store.list('Pet');
    
    if (req.query.status) {
      const statuses = Array.isArray(req.query.status) 
        ? req.query.status 
        : [req.query.status];
      pets = pets.filter(p => statuses.includes(p.status));
    }
    
    return pets;
  },
  
  // Handler that modifies store
  addPet: ({ req, store, faker }) => {
    const newPet = store.create('Pet', {
      ...req.body,
      id: faker.number.int({ min: 1000, max: 9999 }),
    });
    return { status: 201, data: newPet };
  },
});
```

**Handler Context:**

```typescript
interface HandlerContext {
  req: {
    method: string;
    path: string;
    params: Record<string, string>;           // Path params
    query: Record<string, string | string[]>; // Query params
    body: any;                                 // Parsed body
    headers: Record<string, string>;
  };
  res: {
    status: number;                            // Settable
    headers: Record<string, string>;           // Settable
  };
  store: Store;
  faker: typeof Faker;
  logger: Logger;
}

// Return types
type HandlerReturn = 
  | any                                        // Direct data (status 200)
  | { status: number; data: any }              // With custom status
  | { status: number; data: any; headers: Record<string, string> };
```

**Acceptance Criteria:**
- [ ] Load handlers from configurable directory
- [ ] Support `.ts`, `.mts`, `.js`, `.mjs` extensions
- [ ] Validate operationId exists in OpenAPI spec
- [ ] Provide full context (req, res, store, faker, logger)
- [ ] Support async handlers
- [ ] Priority over seeds and examples

---

### 3.6 FR-006: Seed Data System

**Priority:** P0 (Critical)

**Description:** System to populate the store with initial data per schema.

**Seed File Format:**

```typescript
// mocks/seeds/pets.seed.ts
import { defineSeeds } from '@websublime/vite-plugin-open-api-server';

export default defineSeeds({
  // Using seed.count to generate N items
  Pet: ({ seed, faker }) => seed.count(15, (index) => ({
    id: index + 1,
    name: faker.animal.dog(),
    category: {
      id: faker.number.int({ min: 1, max: 5 }),
      name: faker.helpers.arrayElement(['Dogs', 'Cats', 'Birds']),
    },
    photoUrls: [faker.image.url()],
    tags: [{ id: index, name: faker.word.adjective() }],
    status: faker.helpers.arrayElement(['available', 'pending', 'sold']),
  })),
  
  // Using seed with direct array
  Category: ({ seed }) => seed([
    { id: 1, name: 'Dogs' },
    { id: 2, name: 'Cats' },
    { id: 3, name: 'Birds' },
    { id: 4, name: 'Fish' },
    { id: 5, name: 'Reptiles' },
  ]),
  
  // Seed with dependency on another schema
  Order: ({ seed, store, faker }) => seed.count(10, () => {
    const pets = store.list('Pet');
    const randomPet = faker.helpers.arrayElement(pets);
    return {
      id: faker.number.int({ min: 1, max: 10000 }),
      petId: randomPet?.id,
      quantity: faker.number.int({ min: 1, max: 5 }),
      shipDate: faker.date.future().toISOString(),
      status: faker.helpers.arrayElement(['placed', 'approved', 'delivered']),
      complete: faker.datatype.boolean(),
    };
  }),
});
```

**Seed Context:**

```typescript
interface SeedContext {
  seed: {
    // Generate N items using factory
    count: <T>(n: number, factory: (index: number) => T) => T[];
    // Seed with direct array
    (data: any[]): any[];
  };
  store: Store;  // Access to already seeded data (for relationships)
  faker: typeof Faker;
  schema: SchemaObject;  // OpenAPI schema definition
}
```

**Execution Order:**
1. Seeds are executed in the order defined in the file
2. Multiple seed files are processed alphabetically
3. Use `store.list()` to access already populated schemas

**Acceptance Criteria:**
- [ ] Load seeds from configurable directory
- [ ] Support `seed.count(n, factory)` and `seed([array])` formats
- [ ] Validate schema name exists in OpenAPI spec
- [ ] Execute seeds on server startup
- [ ] Provide store access for cross-schema relationships
- [ ] Support re-seeding via DevTools command

---

### 3.7 FR-007: Data Generator

**Priority:** P1 (High)

**Description:** Automatic fake data generation based on schema when no seed/example exists.

**Type → Faker Mapping:**

```typescript
const typeMapping = {
  // Strings with format
  'string:email': () => faker.internet.email(),
  'string:uri': () => faker.internet.url(),
  'string:url': () => faker.internet.url(),
  'string:uuid': () => faker.string.uuid(),
  'string:date': () => faker.date.recent().toISOString().split('T')[0],
  'string:date-time': () => faker.date.recent().toISOString(),
  'string:password': () => faker.internet.password(),
  'string:phone': () => faker.phone.number(),
  'string:hostname': () => faker.internet.domainName(),
  'string:ipv4': () => faker.internet.ipv4(),
  'string:ipv6': () => faker.internet.ipv6(),
  
  // Generic strings
  'string': () => faker.lorem.words(3),
  
  // Numbers
  'integer': () => faker.number.int({ min: 1, max: 1000 }),
  'integer:int32': () => faker.number.int({ min: 1, max: 2147483647 }),
  'integer:int64': () => faker.number.int({ min: 1, max: Number.MAX_SAFE_INTEGER }),
  'number': () => faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
  'number:float': () => faker.number.float({ fractionDigits: 2 }),
  'number:double': () => faker.number.float({ fractionDigits: 6 }),
  
  // Other
  'boolean': () => faker.datatype.boolean(),
  'array': (schema) => generateArray(schema.items),
  'object': (schema) => generateObject(schema.properties),
};
```

**Field Name Detection:**

```typescript
const fieldNameMapping = {
  // Common names
  'name': () => faker.person.fullName(),
  'firstName': () => faker.person.firstName(),
  'lastName': () => faker.person.lastName(),
  'email': () => faker.internet.email(),
  'phone': () => faker.phone.number(),
  'address': () => faker.location.streetAddress(),
  'city': () => faker.location.city(),
  'country': () => faker.location.country(),
  'zipCode': () => faker.location.zipCode(),
  'description': () => faker.lorem.paragraph(),
  'title': () => faker.lorem.sentence(),
  'price': () => faker.commerce.price(),
  'quantity': () => faker.number.int({ min: 1, max: 100 }),
  'createdAt': () => faker.date.past().toISOString(),
  'updatedAt': () => faker.date.recent().toISOString(),
  'avatar': () => faker.image.avatar(),
  'image': () => faker.image.url(),
  'url': () => faker.internet.url(),
  'username': () => faker.internet.username(),
};
```

**Acceptance Criteria:**
- [ ] Generate data based on OpenAPI type + format
- [ ] Detect common field names for smarter generation
- [ ] Support nested objects and arrays
- [ ] Respect enum values when defined
- [ ] Handle required vs optional fields

---

### 3.8 FR-008: Security Scheme Handling

**Priority:** P1 (High)

**Description:** Simulate OpenAPI security schemes without real validation.

**Behavior:**
- **Validate presence** of credentials (header, query, cookie)
- **Accept any value** as valid
- **Return 401** only when credentials are missing

**Supported Schemes:**

| Scheme | Location | Validation |
|--------|----------|-----------|
| HTTP Bearer | `Authorization: Bearer <token>` | Non-empty token |
| HTTP Basic | `Authorization: Basic <base64>` | Non-empty string |
| API Key (header) | Custom header | Non-empty value |
| API Key (query) | Query param | Non-empty value |
| API Key (cookie) | Cookie | Non-empty value |
| OAuth2 | `Authorization: Bearer <token>` | Non-empty token |

**Acceptance Criteria:**
- [ ] Parse security schemes from OpenAPI spec
- [ ] Validate presence of required credentials
- [ ] Accept any non-empty value as valid
- [ ] Return 401 when credentials are missing
- [ ] Log security scheme usage on startup

---

### 3.9 FR-009: Hot Reload

**Priority:** P1 (High)

**Description:** Reload handlers and seeds when files are modified.

**Acceptance Criteria:**
- [ ] Watch handlers directory for changes
- [ ] Watch seeds directory for changes
- [ ] Reload modified files without server restart
- [ ] Notify DevTools via WebSocket
- [ ] Maintain store data (seeds not re-executed automatically)
- [ ] Log reloaded files

**Note:** OpenAPI spec does NOT hot-reload (requires full restart).

---

### 3.10 FR-010: Request Proxying

**Priority:** P0 (Critical)

**Description:** Configure Vite to proxy requests to the OpenAPI server.

**Acceptance Criteria:**
- [ ] Configure Vite proxy during plugin setup
- [ ] Support configurable proxy path
- [ ] Forward all methods (GET, POST, etc.)
- [ ] Preserve headers and body
- [ ] Handle CORS appropriately

---

### 3.11 FR-011: WebSocket Server

**Priority:** P0 (Critical)

**Description:** Bidirectional communication channel for DevTools and real-time events.

**Server → Client Events:**

```typescript
type ServerEvent = 
  | { type: 'request'; data: RequestLogEntry }
  | { type: 'response'; data: ResponseLogEntry }
  | { type: 'store:updated'; data: { schema: string; action: string } }
  | { type: 'handler:reloaded'; data: { file: string } }
  | { type: 'simulation:active'; data: SimulationState }
  | { type: 'connected'; data: { serverVersion: string } };
```

**Client → Server Commands:**

```typescript
type ClientCommand =
  | { type: 'get:registry' }
  | { type: 'get:timeline'; data: { limit?: number } }
  | { type: 'get:store'; data: { schema: string } }
  | { type: 'set:store'; data: { schema: string; items: any[] } }
  | { type: 'clear:store'; data: { schema: string } }
  | { type: 'set:simulation'; data: SimulationConfig }
  | { type: 'clear:simulation'; data: { path: string } }
  | { type: 'clear:timeline' };
```

**Acceptance Criteria:**
- [ ] Persistent WebSocket connection
- [ ] Broadcast events to all connected clients
- [ ] Handle client commands and respond
- [ ] Auto-reconnect on connection loss
- [ ] Connection status indicator in DevTools

---

## 4. DevTools Client Features

### 4.1 FR-100: Vue DevTools Integration

**Description:** Custom tab in Vue DevTools with embedded application.

**Implementation:**

```typescript
import { addCustomTab } from '@vue/devtools-api';

addCustomTab({
  name: 'openapi-server',
  title: 'OpenAPI Server',
  icon: 'https://path-to-icon.svg',  // or Lucide icon name
  view: {
    type: 'iframe',
    src: 'http://localhost:4000/_devtools/',
  },
  category: 'app',
});
```

**Acceptance Criteria:**
- [ ] Register custom tab in Vue DevTools
- [ ] Serve SPA via Hono server
- [ ] Embed SPA in iframe
- [ ] Establish WebSocket connection on load

---

### 4.2 FR-101: Routes Page

**Description:** List of all available endpoints grouped by tags/schema.

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Routes] [Timeline] [Models] [Simulator]                           │
├─────────────────────────────────────────────────────────────────────┤
│  Search endpoints...                       47 endpoints | 6 schemas │
├─────────────────────┬───────────────────────────────────────────────┤
│                     │                                               │
│  ▼ Pet (12)         │  GET /pet/{petId}                            │
│    GET /pet/{petId} │  ──────────────────────────────────────────  │
│    GET /pet/findBy..│  Operation: getPetById                        │
│    POST /pet        │  Method: GET                                  │
│    PUT /pet         │  Path: /pet/{petId}                          │
│    DELETE /pet/{..} │  Tags: pet                                    │
│                     │                                               │
│  ▼ Store (4)        │  Summary:                                     │
│    GET /store/inven │  Find pet by ID                              │
│    POST /store/order│                                               │
│    GET /store/order │  Description:                                 │
│    DELETE /store/.. │  Returns a single pet by its ID              │
│                     │                                               │
│  ▼ User (8)         │  Response Schema: Pet                         │
│    POST /user       │  Handler: ✓ (pets.handler.ts)                │
│    GET /user/{user..│  Seed: ✓ (15 items)                          │
│    ...              │                                               │
│                     │                                               │
└─────────────────────┴───────────────────────────────────────────────┘
```

**Grouping Logic:**
1. By tags (if they exist in spec)
2. Fallback: By response schema
3. Final fallback: By first path segment

**Acceptance Criteria:**
- [ ] Display all endpoints from registry
- [ ] Group by tags or response schema
- [ ] Search/filter functionality
- [ ] Show endpoint details on selection
- [ ] Indicate handler/seed status
- [ ] Display total counts

---

### 4.3 FR-102: Timeline Page

**Description:** Real-time request/response log with details panel.

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Routes] [Timeline] [Models] [Simulator]                           │
├─────────────────────────────────────────────────────────────────────┤
│  Filter...                                 [Clear] 127 events       │
├─────────────────────┬───────────────────────────────────────────────┤
│                     │                                               │
│  ● 14:32:45.123     │  REQUEST                                     │
│  GET /pet/1  200    │  ──────────────────────────────────────────  │
│  (23ms)             │  Method: GET                                  │
│                     │  Path: /pet/1                                 │
│  ● 14:32:44.891     │  Operation: getPetById                        │
│  POST /pet  201     │  URL: http://localhost:4000/pet/1            │
│  (45ms)             │                                               │
│                     │  Headers:                                     │
│  ● 14:32:44.102     │  Authorization: Bearer eyJ...                 │
│  GET /pet/find...   │  Accept: application/json                     │
│  200 (18ms)         │                                               │
│                     │  ──────────────────────────────────────────  │
│  ● 14:32:43.567     │  RESPONSE                                     │
│  DELETE /pet/5      │  ──────────────────────────────────────────  │
│  204 (12ms)         │  Status: 200 OK                              │
│                     │  Duration: 23ms                               │
│  ● 14:32:42.234     │                                               │
│  GET /store/inv...  │  Headers:                                     │
│  500 (ERROR)        │  Content-Type: application/json               │
│                     │  X-Request-Id: abc123                         │
│                     │                                               │
│                     │  Body:                                        │
│                     │  {                                            │
│                     │    "id": 1,                                   │
│                     │    "name": "Buddy",                           │
│                     │    "status": "available"                      │
│                     │  }                                            │
│                     │                                               │
└─────────────────────┴───────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Real-time event stream via WebSocket
- [ ] List view with method, path, status, duration
- [ ] Detail panel with full request/response
- [ ] Filter by path, method, status
- [ ] Status color coding (green: 2xx, yellow: 4xx, red: 5xx)
- [ ] Clear button to reset timeline
- [ ] Maximum 500 events (configurable)

---

### 4.4 FR-103: Models Page

**Description:** Store data management per schema with JSON editor.

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Routes] [Timeline] [Models] [Simulator]                           │
├─────────────────────────────────────────────────────────────────────┤
│  Schema: [Pet ▼]                    [Clear] [Reset to Seed] [Save]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ [                                                              ] │ │
│  │ [  // JSON Editor with syntax highlighting                     ] │ │
│  │ [  [                                                           ] │ │
│  │ [    {                                                         ] │ │
│  │ [      "id": 1,                                                ] │ │
│  │ [      "name": "Buddy",                                        ] │ │
│  │ [      "category": { "id": 1, "name": "Dogs" },                ] │ │
│  │ [      "status": "available"                                   ] │ │
│  │ [    },                                                        ] │ │
│  │ [    ...                                                       ] │ │
│  │ [  ]                                                           ] │ │
│  │ [                                                              ] │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Items: 15 | Valid JSON ✓                                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] Dropdown to select schema
- [ ] JSON editor with syntax highlighting
- [ ] Real-time JSON validation
- [ ] Save button to apply changes
- [ ] Clear button to empty store for schema
- [ ] Reset to Seed button to reload initial data
- [ ] Item counter

---

### 4.5 FR-104: Simulator Page

**Description:** Configure error simulations for endpoints.

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Routes] [Timeline] [Models] [Simulator]                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Active Simulations (2)                                [Clear All]  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ GET /pet/{petId}     Server Error 500            [×]           │ │
│  │ POST /store/order    Slow Network (3s delay)    [×]           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Add Simulation                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Endpoint: [GET /pet/{petId}                              ▼]   │ │
│  │                                                                │ │
│  │ Quick Presets:                                                 │ │
│  │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │ │
│  │ │ Slow        │ │ Server      │ │ Rate        │               │ │
│  │ │ Network     │ │ Error 500   │ │ Limit 429   │               │ │
│  │ └─────────────┘ └─────────────┘ └─────────────┘               │ │
│  │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │ │
│  │ │ Not         │ │ Request     │ │ Empty       │               │ │
│  │ │ Found 404   │ │ Timeout     │ │ Response    │               │ │
│  │ └─────────────┘ └─────────────┘ └─────────────┘               │ │
│  │ ┌─────────────┐                                               │ │
│  │ │ Unauth      │                                               │ │
│  │ │ 401         │                                               │ │
│  │ └─────────────┘                                               │ │
│  │                                                                │ │
│  │                                        [Apply Simulation]      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Available Presets:**

| Preset | Effect |
|--------|--------|
| Slow Network (3G) | 3000ms delay before response |
| Server Error (500) | Returns HTTP 500 with error body |
| Rate Limit (429) | Returns HTTP 429 Too Many Requests |
| Not Found (404) | Returns HTTP 404 Not Found |
| Request Timeout | 30000ms delay (simulates timeout) |
| Empty Response | Returns HTTP 200 with empty body |
| Unauthorized (401) | Returns HTTP 401 Unauthorized |

**Simulation Behavior:**
- Simulations are **persistent** until manually removed
- **One simulation per path** (path pattern, not operationId)
- Simulations **override** handlers, seeds, and examples
- DevTools shows visual indicator when simulation is active

**Acceptance Criteria:**
- [ ] Display active simulations
- [ ] Endpoint selector dropdown
- [ ] Quick preset buttons
- [ ] Apply simulation button
- [ ] Remove individual simulations
- [ ] Clear all simulations
- [ ] Visual indicator in timeline for simulated responses

---

## 5. Plugin Configuration

### 5.1 Options Interface

```typescript
interface OpenApiServerOptions {
  /**
   * Path to OpenAPI spec file (required)
   * Supports: file paths, URLs, YAML, JSON
   */
  spec: string;
  
  /**
   * Server port
   * @default auto-detect available port
   */
  port?: number;
  
  /**
   * Base path for request proxy
   * Requests to this path will be forwarded to the server
   * @example '/api/v3'
   */
  proxyPath?: string;
  
  /**
   * Directory with handler files
   * @default './mocks/handlers'
   */
  handlersDir?: string;
  
  /**
   * Directory with seed files
   * @default './mocks/seeds'
   */
  seedsDir?: string;
  
  /**
   * Enable/disable plugin
   * @default true
   */
  enabled?: boolean;
  
  /**
   * ID field configuration per schema
   * @default {} (uses 'id' for all schemas)
   */
  idFields?: Record<string, string>;
  
  /**
   * Maximum timeline events
   * @default 500
   */
  timelineLimit?: number;
  
  /**
   * Enable DevTools integration
   * @default true
   */
  devtools?: boolean;
}
```

### 5.2 Configuration Example

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
      proxyPath: '/api/v3',
      handlersDir: './mocks/handlers',
      seedsDir: './mocks/seeds',
      idFields: {
        User: 'username',
        Order: 'orderId',
      },
      timelineLimit: 500,
      devtools: true,
    }),
  ],
});
```

---

## 6. Startup Banner & Logging

### 6.1 Startup Output

```
═══════════════════════════════════════════════════════════════════════════════
                     OPEN API SERVER v2.0.0
═══════════════════════════════════════════════════════════════════════════════

  ✓ OpenAPI Spec: petstore.yaml
  ✓ API: Swagger Petstore v1.0.0
  ✓ Endpoints: 19 operations
  ✓ Schemas: 6 definitions

  HANDLERS LOADED:
  ────────────────────────────────────────────────────────────────────────────
  ✓ pets.handler.ts: 4 handlers (getPetById, findPetsByStatus, addPet, updatePet)
  ✓ store.handler.ts: 2 handlers (placeOrder, getOrderById)

  SEEDS LOADED:
  ────────────────────────────────────────────────────────────────────────────
  ✓ Pet: 15 items
  ✓ Category: 5 items
  ✓ Order: 10 items
  ✓ User: 5 items

  SECURITY SCHEMES:
  ────────────────────────────────────────────────────────────────────────────
  ✓ petstore_auth (OAuth2) - 12 endpoints
  ✓ api_key (API Key in header) - 2 endpoints

═══════════════════════════════════════════════════════════════════════════════
  Server:       http://localhost:4000
  DevTools:     http://localhost:4000/_devtools/
  WebSocket:    ws://localhost:4000/_ws
  Proxy:        /api/v3/* → http://localhost:4000/*
═══════════════════════════════════════════════════════════════════════════════
```

### 6.2 Request Logging

```
[OpenAPI] → GET  /pet/1 [getPetById]
[OpenAPI] ✓ 200 GET /pet/1 (23ms)
[OpenAPI] → POST /pet [addPet]
[OpenAPI] ✓ 201 POST /pet (45ms)
[OpenAPI] → GET  /pet/999 [getPetById]
[OpenAPI] ✗ 404 GET /pet/999 (12ms)
[OpenAPI] → GET  /store/inventory [getInventory] [SIMULATION: 500]
[OpenAPI] ✗ 500 GET /store/inventory (3ms) [Simulated]
```

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Metric | Target |
|--------|--------|
| Startup time | < 3 seconds |
| Request latency (no simulation delay) | < 50ms |
| Memory usage (base) | < 100MB |
| Hot reload time | < 500ms |

### 7.2 Compatibility

| Environment | Versions |
|-------------|----------|
| Node.js | >= 18.0.0 |
| Vite | >= 5.0.0 |
| Vue | >= 3.3.0 |
| Browsers | Chrome, Firefox, Safari (last 2 versions) |

### 7.3 Developer Experience

- Clear and actionable error messages
- TypeScript types for handlers and seeds
- Auto-complete for store API
- Hot reload without state loss
- DevTools always available
- System theme preference support (light/dark)

---

## 8. Out of Scope (v2.0)

| Feature | Reason |
|---------|--------|
| Data persistence | Complexity vs benefit for dev tool |
| Request body validation | Out of scope for server |
| Real rate limiting | Simulation only |
| Multi-spec support | One spec per plugin instance |
| GraphQL | Out of OpenAPI scope |
| gRPC | Out of OpenAPI scope |
| OpenAPI spec hot-reload | Requires full restart |

---

## 9. Milestones & Phases

### Phase 1: Core Foundation
- OpenAPI document processing (bundle, upgrade, dereference)
- Hono server setup
- Basic routing from OpenAPI paths
- In-memory store implementation

### Phase 2: Handlers & Seeds
- Handler loading and execution
- Seed loading and execution
- Faker.js data generator
- Hot reload for handlers/seeds

### Phase 3: DevTools Client
- Vue SPA project structure
- Routes page
- Timeline page
- WebSocket integration

### Phase 4: Advanced Features
- Models page (JSON editor)
- Simulator page (error presets)
- Security scheme handling
- Polish & testing

### Phase 5: Playground & Documentation
- Petstore demo application
- Documentation
- Examples
- Release preparation

---

## 10. Decision Summary

| Category | Decision |
|----------|----------|
| **Base Architecture** | Hono Server (custom implementation) |
| **Document Processing** | @scalar/json-magic + @scalar/openapi-parser + @scalar/openapi-upgrader |
| **Fake Data** | Faker.js with auto-generation based on schema |
| **DevTools** | Vue SPA via iframe, served by Hono |
| **Communication** | Persistent bidirectional WebSocket |
| **Store** | In-memory, non-persistent, explicit API with configurable ID fields |
| **Response Priority** | Handler > Seed > Example > Auto-generated |
| **Hot Reload** | Handlers/seeds only (not OpenAPI spec) |
| **Config** | Inline in vite.config.ts |
| **Structure** | Monorepo: core, devtools-client, vite-plugin, playground |
| **Routes Grouping** | Tags if exist, otherwise response schema |
| **Simulations** | By path, persistent until removed, one per endpoint |
| **Theme** | System preference (light/dark) |
| **Naming** | `openApiServer()` (no "mock" in function names) |

---

## Appendix A: Links & References

- [OpenProps](https://open-props.style/) - CSS design system
- [Vue DevTools Plugin API](https://devtools.vuejs.org/plugins/api) - DevTools integration
- [@scalar/openapi-parser](https://github.com/scalar/scalar/tree/main/packages/openapi-parser) - OpenAPI parsing
- [@scalar/json-magic](https://github.com/scalar/scalar/tree/main/packages/json-magic) - JSON/YAML bundling
- [@scalar/openapi-upgrader](https://github.com/scalar/scalar/tree/main/packages/openapi-upgrader) - OpenAPI version upgrade
- [Hono](https://hono.dev/docs/getting-started/nodejs) - Web framework
- [Vite Plugin API](https://vite.dev/guide/api-plugin) - Plugin development
- [Faker.js](https://fakerjs.dev/) - Fake data generation
- [Lucide Icons](https://lucide.dev/) - Icon library

---

*Document generated: January 2026*
