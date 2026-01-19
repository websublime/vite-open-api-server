# TECHNICAL SPECIFICATION

## vite-plugin-open-api-server v2.0

**Version:** 2.0.0  
**Date:** January 2026  
**Status:** Draft  
**Based on:** PRODUCT-REQUIREMENTS-DOC.md

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [Package Design](#3-package-design)
4. [Core Package](#4-core-package)
5. [DevTools Client Package](#5-devtools-client-package)
6. [Vite Plugin Package](#6-vite-plugin-package)
7. [Data Models](#7-data-models)
8. [Communication Protocol](#8-communication-protocol)
9. [Implementation Phases](#9-implementation-phases)

---

## 1. Overview

### 1.1 Purpose

This document provides the technical specification for implementing `vite-plugin-open-api-server` v2.0 as defined in PRODUCT-REQUIREMENTS-DOC.md. It details the architecture, component design, interfaces, and implementation approach.

### 1.2 Technology Stack

| Component | Technology | Version | Rationale |
|-----------|------------|---------|-----------|
| **Runtime** | Node.js | >=18.0.0 | LTS support |
| **Build Tool** | Vite | >=5.0.0 | Target ecosystem |
| **HTTP Server** | Hono | ^4.x | Lightweight, fast, native WebSocket |
| **OpenAPI Bundler** | @scalar/json-magic | latest | External ref resolution |
| **OpenAPI Upgrader** | @scalar/openapi-upgrader | latest | OAS 2.0/3.0 → 3.1 |
| **OpenAPI Parser** | @scalar/openapi-parser | latest | Dereference, validation |
| **Fake Data** | @faker-js/faker | ^8.x | Mature, varied formats |
| **DevTools UI** | Vue 3 | ^3.4.0 | Vue DevTools integration |
| **CSS** | OpenProps | latest | Design system |
| **Icons** | Lucide | latest | Tree-shakeable |
| **State** | Pinia | ^2.x | Vue 3 standard |
| **Build (libs)** | tsup | latest | Fast, simple |

### 1.3 Key Decisions (from PRD)

| Category | Decision |
|----------|----------|
| Base Architecture | Custom Hono Server |
| DevTools | Vue SPA via iframe in Vue DevTools |
| Communication | Persistent bidirectional WebSocket |
| Store | In-memory, non-persistent, configurable ID fields |
| Response Priority | Handler > Seed > Example > Auto-generated |
| Hot Reload | Handlers/seeds only (not OpenAPI spec) |
| Naming | `openApiServer()` (no "mock" in names) |

---

## 2. System Architecture

### 2.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              VITE DEV SERVER                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────┐     ┌───────────────────────────────────────────┐   │
│  │  vite-plugin       │────▶│           HONO OPENAPI SERVER             │   │
│  │  (proxy config)    │     │                                           │   │
│  └────────────────────┘     │  ┌──────────┐ ┌──────────┐ ┌───────────┐  │   │
│                             │  │  Router  │─│  Store   │─│ Generator │  │   │
│  ┌────────────────────┐     │  └────┬─────┘ └──────────┘ └───────────┘  │   │
│  │  Vue App           │────▶│       │                                   │   │
│  │  (fetch /api/*)    │     │  ┌────▼─────┐ ┌───────────────────────┐   │   │
│  └────────────────────┘     │  │ Handlers │ │   WebSocket Hub       │◀──┼───┤
│                             │  └──────────┘ └───────────┬───────────┘   │   │
│                             │                           │               │   │
│                             │  /_devtools/* (SPA)       │               │   │
│                             │  /_api/* (internal API)   │               │   │
│                             │  /_ws (WebSocket)         │               │   │
│                             └───────────────────────────┼───────────────┘   │
│                                                         │                   │
└─────────────────────────────────────────────────────────┼───────────────────┘
                                                          │
                      ┌───────────────────────────────────┼───────────────┐
                      │              VUE DEVTOOLS                          │
                      │  ┌──────────────────────────────────────────────┐  │
                      │  │         DevTools Client (iframe)             │  │
                      │  │                                              │  │
                      │  │  ┌──────────┐ ┌──────────┐ ┌───────────────┐ │  │
                      │  │  │  Routes  │ │ Timeline │ │ Models│Simul. │ │  │
                      │  │  └──────────┘ └──────────┘ └───────────────┘ │  │
                      │  │         ▲                                    │  │
                      │  │         │ WebSocket Connection               │  │
                      │  │         └────────────────────────────────────│  │
                      │  └──────────────────────────────────────────────┘  │
                      └────────────────────────────────────────────────────┘
```

### 2.2 Request Flow

```
Browser Request                Vite Proxy              Hono Server
     │                            │                         │
     │  GET /api/v3/pet/1         │                         │
     ├───────────────────────────►│                         │
     │                            │  GET /pet/1             │
     │                            ├────────────────────────►│
     │                            │                         │
     │                            │         ┌───────────────┴───────────────┐
     │                            │         │ 1. Route match (/pet/{petId}) │
     │                            │         │ 2. Check simulations          │
     │                            │         │ 3. Execute handler OR         │
     │                            │         │    Return seed data OR        │
     │                            │         │    Return example OR          │
     │                            │         │    Generate with Faker        │
     │                            │         │ 4. Emit WebSocket event       │
     │                            │         └───────────────┬───────────────┘
     │                            │                         │
     │                            │  200 { id: 1, ... }     │
     │                            │◄────────────────────────┤
     │  200 { id: 1, ... }        │                         │
     │◄───────────────────────────┤                         │
```

---

## 3. Package Design

### 3.1 Monorepo Structure

```
packages/
├── core/                      # Core server logic (no Vite dependency)
│   ├── src/
│   │   ├── index.ts           # Public exports
│   │   ├── server.ts          # createOpenApiServer()
│   │   ├── parser/            # OpenAPI processing
│   │   │   ├── index.ts
│   │   │   ├── processor.ts   # bundle → upgrade → dereference
│   │   │   └── types.ts
│   │   ├── router/            # Hono routing
│   │   │   ├── index.ts
│   │   │   ├── route-builder.ts
│   │   │   └── path-converter.ts
│   │   ├── store/             # In-memory data store
│   │   │   ├── index.ts
│   │   │   ├── store.ts
│   │   │   └── types.ts
│   │   ├── generator/         # Fake data generation
│   │   │   ├── index.ts
│   │   │   ├── schema-generator.ts
│   │   │   └── field-mapping.ts
│   │   ├── handlers/          # Handler execution
│   │   │   ├── index.ts
│   │   │   ├── context.ts
│   │   │   └── executor.ts
│   │   ├── websocket/         # WebSocket hub
│   │   │   ├── index.ts
│   │   │   ├── hub.ts
│   │   │   └── protocol.ts
│   │   └── simulation/        # Error simulation
│   │       ├── index.ts
│   │       └── simulator.ts
│   ├── package.json
│   └── tsconfig.json
│
├── devtools-client/           # Vue SPA for DevTools
│   ├── src/
│   │   ├── App.vue
│   │   ├── main.ts
│   │   ├── router.ts
│   │   ├── pages/
│   │   │   ├── RoutesPage.vue
│   │   │   ├── TimelinePage.vue
│   │   │   ├── ModelsPage.vue
│   │   │   └── SimulatorPage.vue
│   │   ├── components/
│   │   │   ├── EndpointList.vue
│   │   │   ├── EndpointDetail.vue
│   │   │   ├── TimelineEntry.vue
│   │   │   ├── JsonEditor.vue
│   │   │   └── SimulationPreset.vue
│   │   ├── composables/
│   │   │   ├── useWebSocket.ts
│   │   │   └── useRegistry.ts
│   │   └── stores/
│   │       ├── registry.ts
│   │       ├── timeline.ts
│   │       ├── models.ts
│   │       └── simulation.ts
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── vite-plugin/               # Vite plugin wrapper
│   ├── src/
│   │   ├── index.ts           # Public exports
│   │   ├── plugin.ts          # openApiServer() plugin
│   │   ├── proxy.ts           # Vite proxy configuration
│   │   ├── devtools.ts        # Vue DevTools registration
│   │   ├── hot-reload.ts      # Handler/seed file watching
│   │   └── types.ts           # Plugin options
│   ├── package.json
│   └── tsconfig.json
│
└── playground/                # Demo application
    ├── src/
    │   ├── App.vue
    │   └── main.ts
    ├── openapi/
    │   └── petstore.yaml
    ├── mocks/
    │   ├── handlers/
    │   │   └── pets.handler.ts
    │   └── seeds/
    │       └── pets.seed.ts
    ├── package.json
    └── vite.config.ts
```

### 3.2 Package Dependencies

```
┌─────────────────┐
│  vite-plugin    │ ─────────────────────┐
│                 │                      │
│  peerDeps:      │                      │
│  - vite >=5     │                      ▼
│  - vue >=3.4    │            ┌─────────────────┐
└─────────────────┘            │     core        │
         │                     │                 │
         │ depends on          │  deps:          │
         └────────────────────►│  - hono         │
                               │  - @scalar/*    │
┌─────────────────┐            │  - @faker-js    │
│ devtools-client │            │  - chokidar     │
│                 │            └─────────────────┘
│  deps:          │
│  - vue          │
│  - pinia        │
│  - open-props   │
│  - lucide-vue   │
└─────────────────┘

┌─────────────────┐
│   playground    │
│                 │
│  devDeps:       │
│  - vite-plugin  │
│  - vue          │
└─────────────────┘
```

---

## 4. Core Package

### 4.1 OpenAPI Processor

**File:** `packages/core/src/parser/processor.ts`

```typescript
import { bundle } from '@scalar/json-magic/bundle';
import { parseJson, parseYaml, readFiles, fetchUrls } from '@scalar/json-magic/bundle/plugins/node';
import { dereference } from '@scalar/openapi-parser';
import { upgrade } from '@scalar/openapi-upgrader';
import type { OpenAPIV3_1 } from '@scalar/openapi-types';

export interface ProcessorOptions {
  /** Base directory for relative file resolution */
  basePath?: string;
}

/**
 * Process an OpenAPI document through the full pipeline:
 * 1. Bundle - resolve external $ref references
 * 2. Upgrade - convert to OpenAPI 3.1
 * 3. Dereference - inline all $ref pointers
 */
export async function processOpenApiDocument(
  input: string | Record<string, unknown>,
  options?: ProcessorOptions
): Promise<OpenAPIV3_1.Document> {
  // Handle empty input
  if (!input || (typeof input === 'object' && Object.keys(input).length === 0)) {
    return createEmptyDocument();
  }

  // Step 1: Bundle external references
  const bundled = await bundle(input, {
    plugins: [parseJson(), parseYaml(), readFiles(), fetchUrls()],
    treeShake: false,
  });

  if (!bundled || typeof bundled !== 'object') {
    throw new ProcessorError('Bundle returned invalid result');
  }

  // Step 2: Upgrade to OpenAPI 3.1
  const upgraded = upgrade(bundled, '3.1');
  
  if (!upgraded) {
    throw new ProcessorError('Upgrade to OpenAPI 3.1 failed');
  }

  // Step 3: Dereference all $ref pointers
  const { schema, errors } = dereference(upgraded);

  if (errors?.length > 0) {
    throw new ProcessorError(
      `Dereference failed: ${errors.map(e => e.message).join(', ')}`
    );
  }

  return schema as OpenAPIV3_1.Document;
}

function createEmptyDocument(): OpenAPIV3_1.Document {
  return {
    openapi: '3.1.0',
    info: { title: 'OpenAPI Server', version: '1.0.0' },
    paths: {},
  };
}

export class ProcessorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProcessorError';
  }
}
```

### 4.2 Store

**File:** `packages/core/src/store/store.ts`

```typescript
export interface StoreOptions {
  /** ID field configuration per schema */
  idFields?: Record<string, string>;
}

export interface Store {
  list(schema: string): unknown[];
  get(schema: string, id: string | number): unknown | null;
  create(schema: string, data: unknown): unknown;
  update(schema: string, id: string | number, data: Partial<unknown>): unknown | null;
  delete(schema: string, id: string | number): boolean;
  clear(schema: string): void;
  clearAll(): void;
  setIdField(schema: string, field: string): void;
  getSchemas(): string[];
  getCount(schema: string): number;
}

export function createStore(options?: StoreOptions): Store {
  const data = new Map<string, Map<string | number, unknown>>();
  const idFields = new Map<string, string>(
    Object.entries(options?.idFields ?? {})
  );

  function getIdField(schema: string): string {
    return idFields.get(schema) ?? 'id';
  }

  function getId(schema: string, item: unknown): string | number {
    const field = getIdField(schema);
    const id = (item as Record<string, unknown>)?.[field];
    if (id === undefined || id === null) {
      throw new StoreError(`Item missing ID field '${field}'`);
    }
    return id as string | number;
  }

  function ensureSchema(schema: string): Map<string | number, unknown> {
    if (!data.has(schema)) {
      data.set(schema, new Map());
    }
    return data.get(schema)!;
  }

  return {
    list(schema: string): unknown[] {
      const schemaData = data.get(schema);
      return schemaData ? Array.from(schemaData.values()) : [];
    },

    get(schema: string, id: string | number): unknown | null {
      return data.get(schema)?.get(id) ?? null;
    },

    create(schema: string, item: unknown): unknown {
      const schemaData = ensureSchema(schema);
      const id = getId(schema, item);
      schemaData.set(id, item);
      return item;
    },

    update(schema: string, id: string | number, updates: Partial<unknown>): unknown | null {
      const schemaData = data.get(schema);
      const existing = schemaData?.get(id);
      if (!existing) return null;
      
      const updated = { ...(existing as object), ...(updates as object) };
      schemaData!.set(id, updated);
      return updated;
    },

    delete(schema: string, id: string | number): boolean {
      return data.get(schema)?.delete(id) ?? false;
    },

    clear(schema: string): void {
      data.get(schema)?.clear();
    },

    clearAll(): void {
      data.clear();
    },

    setIdField(schema: string, field: string): void {
      idFields.set(schema, field);
    },

    getSchemas(): string[] {
      return Array.from(data.keys());
    },

    getCount(schema: string): number {
      return data.get(schema)?.size ?? 0;
    },
  };
}

export class StoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoreError';
  }
}
```

### 4.3 Router

**File:** `packages/core/src/router/route-builder.ts`

```typescript
import { Hono } from 'hono';
import type { OpenAPIV3_1 } from '@scalar/openapi-types';
import type { Store } from '../store';
import type { EndpointRegistry, EndpointEntry } from './types';

export interface RouteBuilderOptions {
  store: Store;
  handlers: Map<string, HandlerFn>;
  seeds: Map<string, unknown[]>;
  simulationManager: SimulationManager;
  onRequest?: (entry: RequestLogEntry) => void;
  onResponse?: (entry: ResponseLogEntry) => void;
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;
type HttpMethod = typeof HTTP_METHODS[number];

/**
 * Build Hono routes from OpenAPI document
 */
export function buildRoutes(
  document: OpenAPIV3_1.Document,
  options: RouteBuilderOptions
): Hono {
  const app = new Hono();
  const registry = buildRegistry(document);

  for (const endpoint of registry.endpoints.values()) {
    const method = endpoint.method as HttpMethod;
    const honoPath = convertOpenApiPath(endpoint.path);

    app[method](honoPath, async (c) => {
      const startTime = Date.now();
      
      // Log request
      options.onRequest?.({
        id: crypto.randomUUID(),
        method: endpoint.method.toUpperCase(),
        path: c.req.path,
        operationId: endpoint.operationId,
        timestamp: startTime,
        headers: Object.fromEntries(c.req.raw.headers),
        query: Object.fromEntries(new URL(c.req.url).searchParams),
      });

      // Check for active simulation
      const simulation = options.simulationManager.get(endpoint.path);
      if (simulation) {
        await delay(simulation.delay ?? 0);
        return c.json(simulation.body ?? {}, simulation.status);
      }

      // Build handler context
      const context: HandlerContext = {
        req: {
          method: c.req.method,
          path: c.req.path,
          params: c.req.param(),
          query: Object.fromEntries(new URL(c.req.url).searchParams),
          body: await safeParseBody(c),
          headers: Object.fromEntries(c.req.raw.headers),
        },
        res: { status: 200, headers: {} },
        store: options.store,
        faker: (await import('@faker-js/faker')).faker,
        logger: console,
      };

      let response: HandlerResponse;

      // Priority: Handler > Seed > Example > Generated
      const handler = options.handlers.get(endpoint.operationId);
      if (handler) {
        response = await executeHandler(handler, context);
      } else if (options.seeds.has(endpoint.responseSchema ?? '')) {
        response = getSeedResponse(endpoint, options.seeds, context);
      } else if (endpoint.example) {
        response = { status: 200, data: endpoint.example };
      } else {
        response = generateResponse(endpoint, context.faker);
      }

      // Log response
      const duration = Date.now() - startTime;
      options.onResponse?.({
        id: crypto.randomUUID(),
        status: response.status,
        duration,
        headers: response.headers ?? {},
        body: response.data,
      });

      return c.json(response.data, response.status);
    });
  }

  return app;
}

/**
 * Convert OpenAPI path to Hono path format
 * /pet/{petId} → /pet/:petId
 */
function convertOpenApiPath(openApiPath: string): string {
  return openApiPath.replace(/\{([^}]+)\}/g, ':$1');
}
```

### 4.4 Handler Context & Execution

**File:** `packages/core/src/handlers/context.ts`

```typescript
import type { Store } from '../store';
import type { Faker } from '@faker-js/faker';

export interface HandlerContext {
  req: {
    method: string;
    path: string;
    params: Record<string, string>;
    query: Record<string, string | string[]>;
    body: unknown;
    headers: Record<string, string>;
  };
  res: {
    status: number;
    headers: Record<string, string>;
  };
  store: Store;
  faker: Faker;
  logger: Console;
}

export type HandlerReturn =
  | unknown                                      // Direct data (status 200)
  | { status: number; data: unknown }            // With custom status
  | { status: number; data: unknown; headers: Record<string, string> };

export type HandlerFn = (context: HandlerContext) => HandlerReturn | Promise<HandlerReturn>;
```

**File:** `packages/core/src/handlers/executor.ts`

```typescript
import type { HandlerContext, HandlerFn, HandlerReturn } from './context';

export interface HandlerResponse {
  status: number;
  data: unknown;
  headers?: Record<string, string>;
}

export async function executeHandler(
  handler: HandlerFn,
  context: HandlerContext
): Promise<HandlerResponse> {
  try {
    const result = await handler(context);
    return normalizeResponse(result);
  } catch (error) {
    return {
      status: 500,
      data: {
        error: 'Handler execution failed',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function normalizeResponse(result: HandlerReturn): HandlerResponse {
  // Already has status
  if (result && typeof result === 'object' && 'status' in result) {
    return {
      status: (result as { status: number }).status,
      data: (result as { data: unknown }).data,
      headers: (result as { headers?: Record<string, string> }).headers,
    };
  }
  
  // Direct data
  return { status: 200, data: result };
}
```

### 4.5 WebSocket Hub

**File:** `packages/core/src/websocket/hub.ts`

```typescript
import type { WSContext } from 'hono/ws';

export interface WebSocketHub {
  addClient(ws: WSContext): void;
  removeClient(ws: WSContext): void;
  broadcast(event: ServerEvent): void;
  handleMessage(ws: WSContext, message: ClientCommand): void;
}

// Server → Client Events
export type ServerEvent =
  | { type: 'connected'; data: { serverVersion: string } }
  | { type: 'request'; data: RequestLogEntry }
  | { type: 'response'; data: ResponseLogEntry }
  | { type: 'store:updated'; data: { schema: string; action: string } }
  | { type: 'handler:reloaded'; data: { file: string } }
  | { type: 'simulation:active'; data: SimulationState };

// Client → Server Commands
export type ClientCommand =
  | { type: 'get:registry' }
  | { type: 'get:timeline'; data?: { limit?: number } }
  | { type: 'get:store'; data: { schema: string } }
  | { type: 'set:store'; data: { schema: string; items: unknown[] } }
  | { type: 'clear:store'; data: { schema: string } }
  | { type: 'set:simulation'; data: SimulationConfig }
  | { type: 'clear:simulation'; data: { path: string } }
  | { type: 'clear:timeline' }
  | { type: 'reseed' };

export function createWebSocketHub(): WebSocketHub {
  const clients = new Set<WSContext>();

  return {
    addClient(ws: WSContext): void {
      clients.add(ws);
      ws.send(JSON.stringify({
        type: 'connected',
        data: { serverVersion: '2.0.0' },
      }));
    },

    removeClient(ws: WSContext): void {
      clients.delete(ws);
    },

    broadcast(event: ServerEvent): void {
      const message = JSON.stringify(event);
      for (const client of clients) {
        client.send(message);
      }
    },

    handleMessage(ws: WSContext, command: ClientCommand): void {
      // Implement command handlers
      switch (command.type) {
        case 'get:registry':
          // Send registry to this client
          break;
        case 'get:timeline':
          // Send timeline to this client
          break;
        // ... other commands
      }
    },
  };
}
```

### 4.6 Data Generator

**File:** `packages/core/src/generator/schema-generator.ts`

```typescript
import type { Faker } from '@faker-js/faker';
import type { OpenAPIV3_1 } from '@scalar/openapi-types';

/**
 * Generate fake data from OpenAPI schema
 */
export function generateFromSchema(
  schema: OpenAPIV3_1.SchemaObject,
  faker: Faker,
  propertyName?: string
): unknown {
  // Try field name mapping first
  if (propertyName) {
    const fieldValue = generateFromFieldName(propertyName, faker);
    if (fieldValue !== undefined) return fieldValue;
  }

  // Enum values
  if (schema.enum) {
    return faker.helpers.arrayElement(schema.enum);
  }

  // Type + format mapping
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  const format = schema.format;
  
  switch (type) {
    case 'string':
      return generateString(format, faker);
    case 'integer':
    case 'number':
      return generateNumber(type, format, schema, faker);
    case 'boolean':
      return faker.datatype.boolean();
    case 'array':
      return generateArray(schema, faker);
    case 'object':
      return generateObject(schema, faker);
    default:
      return faker.lorem.word();
  }
}

function generateString(format: string | undefined, faker: Faker): string {
  switch (format) {
    case 'email': return faker.internet.email();
    case 'uri':
    case 'url': return faker.internet.url();
    case 'uuid': return faker.string.uuid();
    case 'date': return faker.date.recent().toISOString().split('T')[0];
    case 'date-time': return faker.date.recent().toISOString();
    case 'password': return faker.internet.password();
    case 'hostname': return faker.internet.domainName();
    case 'ipv4': return faker.internet.ipv4();
    case 'ipv6': return faker.internet.ipv6();
    default: return faker.lorem.words(3);
  }
}

function generateNumber(
  type: string,
  format: string | undefined,
  schema: OpenAPIV3_1.SchemaObject,
  faker: Faker
): number {
  const min = schema.minimum ?? 1;
  const max = schema.maximum ?? 10000;
  
  if (type === 'integer') {
    return faker.number.int({ min, max });
  }
  return faker.number.float({ min, max, fractionDigits: 2 });
}

function generateArray(schema: OpenAPIV3_1.SchemaObject, faker: Faker): unknown[] {
  const items = schema.items as OpenAPIV3_1.SchemaObject | undefined;
  const minItems = schema.minItems ?? 1;
  const maxItems = schema.maxItems ?? 5;
  const count = faker.number.int({ min: minItems, max: maxItems });
  
  if (!items) return [];
  
  return Array.from({ length: count }, () => generateFromSchema(items, faker));
}

function generateObject(schema: OpenAPIV3_1.SchemaObject, faker: Faker): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  
  for (const [key, propSchema] of Object.entries(properties)) {
    // Generate required fields, and optionally others
    if (required.has(key) || faker.datatype.boolean()) {
      result[key] = generateFromSchema(propSchema as OpenAPIV3_1.SchemaObject, faker, key);
    }
  }
  
  return result;
}

/**
 * Smart field name detection
 */
function generateFromFieldName(name: string, faker: Faker): unknown | undefined {
  const normalized = name.toLowerCase();
  
  const mapping: Record<string, () => unknown> = {
    name: () => faker.person.fullName(),
    firstname: () => faker.person.firstName(),
    lastname: () => faker.person.lastName(),
    email: () => faker.internet.email(),
    phone: () => faker.phone.number(),
    address: () => faker.location.streetAddress(),
    city: () => faker.location.city(),
    country: () => faker.location.country(),
    zipcode: () => faker.location.zipCode(),
    description: () => faker.lorem.paragraph(),
    title: () => faker.lorem.sentence(),
    price: () => faker.commerce.price(),
    quantity: () => faker.number.int({ min: 1, max: 100 }),
    createdat: () => faker.date.past().toISOString(),
    updatedat: () => faker.date.recent().toISOString(),
    avatar: () => faker.image.avatar(),
    image: () => faker.image.url(),
    url: () => faker.internet.url(),
    username: () => faker.internet.username(),
  };
  
  return mapping[normalized]?.();
}
```

### 4.7 Server Factory

**File:** `packages/core/src/server.ts`

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { upgradeWebSocket } from 'hono/node-ws';
import type { OpenAPIV3_1 } from '@scalar/openapi-types';

import { processOpenApiDocument } from './parser';
import { createStore, type Store } from './store';
import { buildRoutes } from './router';
import { createWebSocketHub } from './websocket';
import type { HandlerFn } from './handlers';

export interface OpenApiServerConfig {
  /** OpenAPI document (string path, URL, or object) */
  spec: string | Record<string, unknown>;
  /** Server port */
  port?: number;
  /** ID field configuration per schema */
  idFields?: Record<string, string>;
  /** Loaded handlers */
  handlers?: Map<string, HandlerFn>;
  /** Seed data per schema */
  seeds?: Map<string, unknown[]>;
  /** Maximum timeline events */
  timelineLimit?: number;
}

export interface OpenApiServer {
  app: Hono;
  store: Store;
  registry: EndpointRegistry;
  document: OpenAPIV3_1.Document;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export async function createOpenApiServer(
  config: OpenApiServerConfig
): Promise<OpenApiServer> {
  // Process OpenAPI document
  const document = await processOpenApiDocument(config.spec);
  
  // Create store
  const store = createStore({ idFields: config.idFields });
  
  // Create WebSocket hub
  const wsHub = createWebSocketHub();
  
  // Build registry
  const registry = buildRegistry(document);
  
  // Create Hono app
  const app = new Hono();
  
  // CORS
  app.use('*', cors());
  
  // DevTools SPA (will be served from built assets)
  app.get('/_devtools/*', serveDevToolsApp);
  
  // Internal API
  app.get('/_api/registry', (c) => c.json(serializeRegistry(registry)));
  app.get('/_api/store/:schema', (c) => {
    const schema = c.req.param('schema');
    return c.json(store.list(schema));
  });
  app.post('/_api/store/:schema', async (c) => {
    const schema = c.req.param('schema');
    const data = await c.req.json();
    store.clear(schema);
    for (const item of data) {
      store.create(schema, item);
    }
    wsHub.broadcast({ type: 'store:updated', data: { schema, action: 'bulk' } });
    return c.json({ success: true });
  });
  
  // WebSocket
  app.get('/_ws', upgradeWebSocket((c) => ({
    onOpen(event, ws) {
      wsHub.addClient(ws);
    },
    onMessage(event, ws) {
      const command = JSON.parse(event.data as string);
      wsHub.handleMessage(ws, command);
    },
    onClose(event, ws) {
      wsHub.removeClient(ws);
    },
  })));
  
  // API routes from OpenAPI
  const apiRouter = buildRoutes(document, {
    store,
    handlers: config.handlers ?? new Map(),
    seeds: config.seeds ?? new Map(),
    simulationManager: createSimulationManager(),
    onRequest: (entry) => wsHub.broadcast({ type: 'request', data: entry }),
    onResponse: (entry) => wsHub.broadcast({ type: 'response', data: entry }),
  });
  
  app.route('/', apiRouter);
  
  return {
    app,
    store,
    registry,
    document,
    async start() {
      // Start with @hono/node-server
    },
    async stop() {
      // Graceful shutdown
    },
  };
}
```

---

## 5. DevTools Client Package

### 5.1 Application Structure

```
devtools-client/
├── src/
│   ├── App.vue              # Main layout with tabs
│   ├── main.ts              # Entry point
│   ├── router.ts            # Vue Router setup
│   │
│   ├── pages/
│   │   ├── RoutesPage.vue   # Endpoint listing
│   │   ├── TimelinePage.vue # Request/response log
│   │   ├── ModelsPage.vue   # Store data editor
│   │   └── SimulatorPage.vue# Error simulation
│   │
│   ├── components/
│   │   ├── AppHeader.vue    # Header with tabs
│   │   ├── ConnectionStatus.vue
│   │   ├── EndpointList.vue
│   │   ├── EndpointDetail.vue
│   │   ├── TimelineEntry.vue
│   │   ├── JsonEditor.vue
│   │   └── SimulationPreset.vue
│   │
│   ├── composables/
│   │   ├── useWebSocket.ts  # WebSocket connection
│   │   └── useTheme.ts      # Dark/light mode
│   │
│   └── stores/
│       ├── registry.ts      # Endpoint registry
│       ├── timeline.ts      # Request timeline
│       ├── models.ts        # Store data
│       └── simulation.ts    # Active simulations
```

### 5.2 WebSocket Composable

**File:** `packages/devtools-client/src/composables/useWebSocket.ts`

```typescript
import { ref, onMounted, onUnmounted } from 'vue';
import type { ServerEvent, ClientCommand } from '@websublime/openapi-server-core';

export function useWebSocket() {
  const connected = ref(false);
  const serverVersion = ref<string | null>(null);
  let ws: WebSocket | null = null;
  let reconnectTimer: number | null = null;

  const eventHandlers = new Map<string, Set<(data: unknown) => void>>();

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/_ws`;
    
    ws = new WebSocket(url);
    
    ws.onopen = () => {
      connected.value = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };
    
    ws.onmessage = (event) => {
      const message: ServerEvent = JSON.parse(event.data);
      
      if (message.type === 'connected') {
        serverVersion.value = message.data.serverVersion;
      }
      
      // Dispatch to handlers
      const handlers = eventHandlers.get(message.type);
      if (handlers) {
        for (const handler of handlers) {
          handler(message.data);
        }
      }
    };
    
    ws.onclose = () => {
      connected.value = false;
      // Reconnect after 2 seconds
      reconnectTimer = window.setTimeout(connect, 2000);
    };
  }

  function send(command: ClientCommand) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(command));
    }
  }

  function on<T>(event: string, handler: (data: T) => void) {
    if (!eventHandlers.has(event)) {
      eventHandlers.set(event, new Set());
    }
    eventHandlers.get(event)!.add(handler as (data: unknown) => void);
  }

  function off(event: string, handler: (data: unknown) => void) {
    eventHandlers.get(event)?.delete(handler);
  }

  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  });

  return {
    connected,
    serverVersion,
    send,
    on,
    off,
  };
}
```

### 5.3 Simulation Store

**File:** `packages/devtools-client/src/stores/simulation.ts`

```typescript
import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface SimulationConfig {
  path: string;
  operationId: string;
  preset: SimulationPreset;
}

export type SimulationPreset =
  | { type: 'slow-network'; delay: number }
  | { type: 'server-error'; status: 500; message?: string }
  | { type: 'rate-limit'; status: 429 }
  | { type: 'not-found'; status: 404 }
  | { type: 'timeout'; delay: 30000 }
  | { type: 'empty-response'; status: 200 }
  | { type: 'unauthorized'; status: 401 };

export const PRESET_OPTIONS: { label: string; preset: SimulationPreset }[] = [
  { label: 'Slow Network (3s)', preset: { type: 'slow-network', delay: 3000 } },
  { label: 'Server Error (500)', preset: { type: 'server-error', status: 500 } },
  { label: 'Rate Limit (429)', preset: { type: 'rate-limit', status: 429 } },
  { label: 'Not Found (404)', preset: { type: 'not-found', status: 404 } },
  { label: 'Request Timeout', preset: { type: 'timeout', delay: 30000 } },
  { label: 'Empty Response', preset: { type: 'empty-response', status: 200 } },
  { label: 'Unauthorized (401)', preset: { type: 'unauthorized', status: 401 } },
];

export const useSimulationStore = defineStore('simulation', () => {
  const simulations = ref<Map<string, SimulationConfig>>(new Map());

  function add(config: SimulationConfig) {
    simulations.value.set(config.path, config);
  }

  function remove(path: string) {
    simulations.value.delete(path);
  }

  function clearAll() {
    simulations.value.clear();
  }

  function get(path: string): SimulationConfig | undefined {
    return simulations.value.get(path);
  }

  function list(): SimulationConfig[] {
    return Array.from(simulations.value.values());
  }

  return {
    simulations,
    add,
    remove,
    clearAll,
    get,
    list,
  };
});
```

---

## 6. Vite Plugin Package

### 6.1 Plugin Implementation

**File:** `packages/vite-plugin/src/plugin.ts`

```typescript
import type { Plugin, ViteDevServer } from 'vite';
import { createOpenApiServer, type OpenApiServer } from '@websublime/openapi-server-core';
import { loadHandlers } from './handlers';
import { loadSeeds, executeSeeds } from './seeds';
import { createFileWatcher } from './hot-reload';
import { registerDevTools } from './devtools';
import type { OpenApiServerOptions } from './types';

export function openApiServer(options: OpenApiServerOptions): Plugin {
  let server: OpenApiServer | null = null;
  let viteServer: ViteDevServer | null = null;

  return {
    name: 'vite-plugin-open-api-server',
    
    apply: 'serve', // Only in dev mode
    
    async configureServer(vite) {
      viteServer = vite;
      
      if (options.enabled === false) {
        return;
      }

      // Load handlers
      const handlers = await loadHandlers(options.handlersDir ?? './mocks/handlers');
      
      // Load and execute seeds
      const seedFns = await loadSeeds(options.seedsDir ?? './mocks/seeds');
      
      // Create server
      server = await createOpenApiServer({
        spec: options.spec,
        port: options.port,
        idFields: options.idFields,
        handlers,
        timelineLimit: options.timelineLimit,
      });

      // Execute seeds to populate store
      await executeSeeds(seedFns, server.store, server.document);

      // Start server
      await server.start();

      // Configure proxy
      const proxyPath = options.proxyPath ?? '/api';
      vite.config.server = vite.config.server ?? {};
      vite.config.server.proxy = {
        ...vite.config.server.proxy,
        [proxyPath]: {
          target: `http://localhost:${options.port ?? 4000}`,
          changeOrigin: true,
          rewrite: (path) => path.replace(new RegExp(`^${proxyPath}`), ''),
        },
      };

      // File watching for hot reload
      if (options.handlersDir || options.seedsDir) {
        createFileWatcher({
          handlersDir: options.handlersDir,
          seedsDir: options.seedsDir,
          onHandlerChange: async (file) => {
            const newHandlers = await loadHandlers(options.handlersDir!);
            // Update server handlers
            server!.updateHandlers(newHandlers);
          },
          onSeedChange: async (file) => {
            const newSeeds = await loadSeeds(options.seedsDir!);
            await executeSeeds(newSeeds, server!.store, server!.document);
          },
        });
      }

      // DevTools integration
      if (options.devtools !== false) {
        registerDevTools(vite, server);
      }

      // Print startup banner
      printStartupBanner(server, options);
    },

    async closeBundle() {
      await server?.stop();
    },
  };
}
```

### 6.2 Handler Loading

**File:** `packages/vite-plugin/src/handlers.ts`

```typescript
import { glob } from 'fast-glob';
import path from 'path';
import type { HandlerFn, HandlerContext } from '@websublime/openapi-server-core';

export interface HandlerDefinition {
  [operationId: string]: (context: HandlerContext) => unknown | Promise<unknown>;
}

/**
 * Load handler files from directory
 */
export async function loadHandlers(
  dir: string
): Promise<Map<string, HandlerFn>> {
  const handlers = new Map<string, HandlerFn>();
  
  const pattern = path.join(dir, '**/*.handler.{ts,mts,js,mjs}');
  const files = await glob(pattern);
  
  for (const file of files) {
    // Cache-bust for hot reload
    const modulePath = `${file}?t=${Date.now()}`;
    const module = await import(modulePath);
    
    if (!module.default || typeof module.default !== 'object') {
      console.warn(`[OpenAPI Server] Handler file ${file} has no default export`);
      continue;
    }
    
    for (const [operationId, handler] of Object.entries(module.default)) {
      if (typeof handler === 'function') {
        handlers.set(operationId, handler as HandlerFn);
      }
    }
  }
  
  return handlers;
}

/**
 * Helper for defining handlers with type safety
 */
export function defineHandlers<T extends HandlerDefinition>(handlers: T): T {
  return handlers;
}
```

### 6.3 Seed Loading

**File:** `packages/vite-plugin/src/seeds.ts`

```typescript
import { glob } from 'fast-glob';
import path from 'path';
import type { Store } from '@websublime/openapi-server-core';
import type { OpenAPIV3_1 } from '@scalar/openapi-types';
import { faker } from '@faker-js/faker';

export interface SeedContext {
  seed: SeedHelper;
  store: Store;
  faker: typeof faker;
  schema: OpenAPIV3_1.SchemaObject;
}

export interface SeedHelper {
  (data: unknown[]): unknown[];
  (factory: () => unknown): unknown[];
  count: (n: number, factory: (index: number) => unknown) => unknown[];
}

export interface SeedDefinition {
  [schemaName: string]: (context: SeedContext) => unknown[];
}

/**
 * Load seed files from directory
 */
export async function loadSeeds(
  dir: string
): Promise<Map<string, (context: SeedContext) => unknown[]>> {
  const seeds = new Map<string, (context: SeedContext) => unknown[]>();
  
  const pattern = path.join(dir, '**/*.seed.{ts,mts,js,mjs}');
  const files = await glob(pattern);
  
  for (const file of files) {
    const modulePath = `${file}?t=${Date.now()}`;
    const module = await import(modulePath);
    
    if (!module.default || typeof module.default !== 'object') {
      console.warn(`[OpenAPI Server] Seed file ${file} has no default export`);
      continue;
    }
    
    for (const [schemaName, seedFn] of Object.entries(module.default)) {
      if (typeof seedFn === 'function') {
        seeds.set(schemaName, seedFn as (context: SeedContext) => unknown[]);
      }
    }
  }
  
  return seeds;
}

/**
 * Execute seeds to populate store
 */
export async function executeSeeds(
  seeds: Map<string, (context: SeedContext) => unknown[]>,
  store: Store,
  document: OpenAPIV3_1.Document
): Promise<void> {
  const schemas = document.components?.schemas ?? {};
  
  for (const [schemaName, seedFn] of seeds) {
    const schema = schemas[schemaName] as OpenAPIV3_1.SchemaObject | undefined;
    
    const seedHelper: SeedHelper = Object.assign(
      (dataOrFactory: unknown[] | (() => unknown)) => {
        if (Array.isArray(dataOrFactory)) return dataOrFactory;
        return [dataOrFactory()];
      },
      {
        count: (n: number, factory: (index: number) => unknown) => {
          return Array.from({ length: n }, (_, i) => factory(i));
        },
      }
    );
    
    const context: SeedContext = {
      seed: seedHelper,
      store,
      faker,
      schema: schema ?? { type: 'object' },
    };
    
    const items = seedFn(context);
    
    for (const item of items) {
      store.create(schemaName, item);
    }
  }
}

/**
 * Helper for defining seeds with type safety
 */
export function defineSeeds<T extends SeedDefinition>(seeds: T): T {
  return seeds;
}
```

### 6.4 Plugin Options

**File:** `packages/vite-plugin/src/types.ts`

```typescript
export interface OpenApiServerOptions {
  /**
   * Path to OpenAPI spec file (required)
   * Supports: file paths, URLs, YAML, JSON
   */
  spec: string;

  /**
   * Server port
   * @default 4000
   */
  port?: number;

  /**
   * Base path for request proxy
   * @example '/api/v3'
   * @default '/api'
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

---

## 7. Data Models

### 7.1 Endpoint Registry

```typescript
interface EndpointRegistry {
  endpoints: Map<string, EndpointEntry>;  // key: operationId
  byTag: Map<string, EndpointEntry[]>;    // grouped by tag
  byPath: Map<string, EndpointEntry[]>;   // grouped by path pattern
  stats: RegistryStats;
}

interface EndpointEntry {
  operationId: string;
  method: HttpMethod;
  path: string;
  summary?: string;
  description?: string;
  tags: string[];
  responseSchema?: string;
  hasHandler: boolean;
  hasSeed: boolean;
  security: SecurityRequirement[];
}

interface RegistryStats {
  totalEndpoints: number;
  withCustomHandler: number;
  totalSchemas: number;
  withCustomSeed: number;
}
```

### 7.2 Timeline Events

```typescript
interface RequestLogEntry {
  id: string;
  method: string;
  path: string;
  operationId: string;
  timestamp: number;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: unknown;
}

interface ResponseLogEntry {
  id: string;
  requestId: string;
  status: number;
  duration: number;
  headers: Record<string, string>;
  body: unknown;
  simulated: boolean;
}
```

### 7.3 Simulation

```typescript
interface Simulation {
  path: string;           // OpenAPI path pattern
  operationId: string;
  status: number;
  delay?: number;         // ms
  body?: unknown;
  headers?: Record<string, string>;
}
```

---

## 8. Communication Protocol

### 8.1 WebSocket Messages

**Server → Client:**

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ serverVersion: string }` | Connection established |
| `request` | `RequestLogEntry` | New request received |
| `response` | `ResponseLogEntry` | Response sent |
| `store:updated` | `{ schema: string, action: string }` | Store data changed |
| `handler:reloaded` | `{ file: string }` | Handler hot-reloaded |
| `seed:reloaded` | `{ file: string }` | Seed hot-reloaded |
| `simulation:active` | `{ simulations: Simulation[] }` | Active simulations changed |

**Client → Server:**

| Command | Payload | Description |
|---------|---------|-------------|
| `get:registry` | - | Request endpoint registry |
| `get:timeline` | `{ limit?: number }` | Request timeline entries |
| `get:store` | `{ schema: string }` | Request store data |
| `set:store` | `{ schema: string, items: unknown[] }` | Replace store data |
| `clear:store` | `{ schema: string }` | Clear schema data |
| `set:simulation` | `Simulation` | Add/update simulation |
| `clear:simulation` | `{ path: string }` | Remove simulation |
| `clear:timeline` | - | Clear all timeline |
| `reseed` | - | Re-execute all seeds |

---

## 9. Implementation Phases

### Phase 1: Core Foundation

**Duration:** 2-3 weeks

**Deliverables:**
- `packages/core/` package structure
- OpenAPI processor (bundle → upgrade → dereference)
- In-memory store with CRUD API
- Hono router from OpenAPI paths
- Basic data generator

**Exit Criteria:**
- [ ] Load petstore.yaml and create routes
- [ ] Store CRUD operations work
- [ ] Requests return generated data

### Phase 2: Handlers & Seeds

**Duration:** 1-2 weeks

**Deliverables:**
- Handler loading and execution
- Seed loading and execution
- Handler context (req, res, store, faker)
- `defineHandlers()` and `defineSeeds()` helpers

**Exit Criteria:**
- [ ] Custom handlers override default responses
- [ ] Seeds populate store on startup
- [ ] Handler has access to store and faker

### Phase 3: Vite Integration

**Duration:** 1 week

**Deliverables:**
- `packages/vite-plugin/` package
- Vite proxy configuration
- Hot reload for handlers/seeds
- Startup banner

**Exit Criteria:**
- [ ] Plugin works in Vite dev server
- [ ] Requests proxied correctly
- [ ] Handler changes hot-reload

### Phase 4: WebSocket & DevTools SPA

**Duration:** 2-3 weeks

**Deliverables:**
- WebSocket hub in core
- `packages/devtools-client/` Vue SPA
- Routes page
- Timeline page
- Vue DevTools iframe integration

**Exit Criteria:**
- [ ] DevTools shows endpoint list
- [ ] Timeline shows real-time requests
- [ ] WebSocket connection stable

### Phase 5: Advanced Features

**Duration:** 2 weeks

**Deliverables:**
- Models page (JSON editor)
- Simulator page (presets)
- Security scheme handling
- Full documentation

**Exit Criteria:**
- [ ] Can edit store data in DevTools
- [ ] Can add/remove simulations
- [ ] Security schemes validated

### Phase 6: Playground & Release

**Duration:** 1 week

**Deliverables:**
- `packages/playground/` demo app
- README and documentation
- npm package publishing

**Exit Criteria:**
- [ ] Playground demonstrates all features
- [ ] Packages published to npm
- [ ] Documentation complete

---

## Appendix A: File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Handler | `*.handler.{ts,mts,js,mjs}` | `pets.handler.ts` |
| Seed | `*.seed.{ts,mts,js,mjs}` | `pets.seed.ts` |
| OpenAPI | `*.{yaml,yml,json}` | `petstore.yaml` |

---

## Appendix B: Error Codes

| Code | Description |
|------|-------------|
| `PROCESSOR_BUNDLE_FAILED` | Failed to bundle OpenAPI document |
| `PROCESSOR_UPGRADE_FAILED` | Failed to upgrade to OpenAPI 3.1 |
| `PROCESSOR_DEREFERENCE_FAILED` | Failed to dereference $refs |
| `STORE_MISSING_ID` | Item missing required ID field |
| `HANDLER_EXECUTION_FAILED` | Handler threw an error |
| `WEBSOCKET_INVALID_COMMAND` | Unknown WebSocket command |

---

*Document generated: January 2026*
