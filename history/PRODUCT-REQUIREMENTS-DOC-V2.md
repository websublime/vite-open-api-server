# PRODUCT REQUIREMENTS DOCUMENT (PRD) — V2

## vite-plugin-open-api-server v1.0.0

**Version:** 1.0.0
**Date:** March 2026
**Status:** APPROVED
**Authors:** Product Team
**Based on:** PRD v1 (v2.0 pre-stable), Architecture Analysis, Design Iteration Sessions
**Updated:** March 2026 — Incorporated behavioral fixes from PR #89 (directory resolution defaults, x-schema-id extension) and PR #90 (seeds map synchronization)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Background & Motivation](#2-background--motivation)
3. [System Architecture](#3-system-architecture)
4. [Core Features (Plugin)](#4-core-features-plugin)
5. [DevTools Client Features](#5-devtools-client-features)
6. [Plugin Configuration](#6-plugin-configuration)
7. [Startup Banner & Logging](#7-startup-banner--logging)
8. [Migration Guide (0.x → 1.0)](#8-migration-guide-0x--10)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Out of Scope (v1.0)](#10-out-of-scope-v10)
11. [Milestones & Phases](#11-milestones--phases)
12. [Decision Summary](#12-decision-summary)

---

## 1. Executive Summary

### 1.1 Product Vision

**vite-plugin-open-api-server** is a Vite plugin that provides a local server based on OpenAPI specifications, freeing frontend developers from backend dependencies. The server interprets OpenAPI specs, automatically generates endpoints with realistic data, and offers a visual interface integrated into Vue DevTools for monitoring and scenario simulation.

**v1.0.0** marks the first stable release. It introduces **multi-spec support** — the ability to serve multiple OpenAPI specifications simultaneously from a single plugin instance — reflecting the reality of modern frontend applications that consume multiple backend services.

### 1.2 What Changed from 0.x

| Aspect | 0.x (Pre-stable) | 1.0.0 (Stable) |
|--------|-------------------|-----------------|
| **Spec support** | Single spec (`spec: string`) | Multiple specs (`specs: SpecConfig[]`) |
| **Proxy paths** | Single manual `proxyPath` | Multiple, auto-derived from spec `servers` field |
| **ID fields** | Flat `idFields` object | Organized per spec |
| **Server architecture** | Single Hono app | Orchestrator + N spec sub-apps on single port |
| **DevTools** | Single-context views | Multi-spec aware with global dashboard + spec filtering |
| **Hot reload** | All-or-nothing | Per-spec instance reload |
| **Configuration** | `spec: string` | `specs: SpecConfig[]` (breaking change) |

### 1.3 Value Proposition

| Benefit | Description |
|---------|-------------|
| **Zero Backend Dependency** | Frontend development without online services |
| **Multi-Service Support** | Mock multiple backend services simultaneously |
| **OpenAPI-First** | Automatic sync with specs — changes reflected instantly |
| **Realistic Data** | Automatic fake data generation based on schemas |
| **Scenario Simulation** | Dedicated UI to simulate errors, delays, and edge cases |
| **Integrated DevTools** | Request timeline and simulation management in Vue DevTools |
| **Hot Reload** | Handlers and seeds reloaded without server restart, per spec |
| **Isolated Specs** | Each spec operates independently — no clash resolution needed |

### 1.4 Target Users

| Persona | Role | Key Needs |
|---------|------|-----------|
| **Frontend Developer** | Builds UI components and features | Quick startup, realistic data, error simulation, multi-API support |
| **Full-Stack Developer** | Works on both frontend and backend | Toggle between mock and real backend per service |
| **QA Engineer** | Tests application functionality | Simulate edge cases across multiple services |
| **Tech Lead** | Defines team standards | Centralized multi-service configuration, consistent DX |

### 1.5 User Stories

**US-001:** As a frontend developer, I want to start development without waiting for backend services so that I can be productive immediately.

**US-002:** As a frontend developer, I want consistent data between sessions so that I can reproduce and debug issues reliably.

**US-003:** As a QA engineer, I want to simulate error responses (401, 500, etc.) so that I can verify error handling flows.

**US-004:** As a developer, I want network delay simulation so that I can test loading states and timeout handling.

**US-005:** As a team lead, I want centralized configuration so that all team members have the same development experience.

**US-006:** As a frontend developer, I want to mock multiple backend APIs simultaneously so that I can develop features that depend on multiple services (e.g., user service + billing service + inventory service).

**US-007:** As a frontend developer, I want the proxy paths to be auto-derived from the OpenAPI spec so that I don't have to manually configure them when the spec already declares its server URL.

**US-008:** As a developer, I want the DevTools to show a unified timeline across all specs so that I can see the full picture of my application's API interactions.

**US-009:** As a developer, I want to filter DevTools views by spec so that I can focus on a specific service when debugging.

**US-010:** As a QA engineer, I want to see all active simulations across all specs at a glance so that I know which services have error scenarios configured.

---

## 2. Background & Motivation

### 2.1 Problem Statement

Modern frontend applications rarely consume a single API. A typical e-commerce frontend might interact with:

- **User Service** (`/api/users/v1`) — authentication, profiles
- **Product Catalog** (`/api/catalog/v2`) — products, categories, search
- **Cart Service** (`/api/cart/v1`) — shopping cart operations
- **Billing Service** (`/api/billing/v1`) — invoices, payments
- **Notification Service** (`/api/notifications/v1`) — alerts, messages

Each of these services has its own OpenAPI specification. With v0.x, developers had two unacceptable options:

1. **Run one spec** and manually mock the rest — defeats the purpose of the tool.
2. **Run multiple Vite dev servers** — impractical, resource-heavy, fragmented DX.

### 2.2 Design Decision: Isolated Specs (Multi-Instance)

Three approaches were evaluated:

| Approach | Description | Verdict |
|----------|-------------|---------|
| **A: Isolated Specs** | Each spec runs as an independent sub-app with its own store, registry, and handlers | **Selected** |
| **B: Virtual Merge** | Merge all specs into a single virtual OpenAPI document with prefixed schemas | Rejected — fragile merge logic, prefixed names confuse developers, hard to debug |
| **C: Hybrid** | Isolated specs with shared namespaced store | Rejected for v1.0 — over-engineered, cross-spec seeds are a rare need |

**Rationale for Approach A:**

1. **Zero clash by design** — each spec lives in its own namespace. Two specs with a `User` schema coexist without conflict.
2. **Mirrors reality** — in microservices, each service has its own API contract. The dev tool should reflect this.
3. **Minimal core changes** — the core `createOpenApiServer()` continues to work with a single spec. The new orchestrator creates N instances.
4. **Natural DevTools grouping** — data is already tagged by spec, the UI groups naturally.
5. **Independent hot reload** — changing `petstore.yaml` reloads only the petstore instance.
6. **Future-proof** — if cross-spec seeds are needed later, a shared context can be added without redesigning the architecture (evolution to Approach C).

### 2.3 Versioning Rationale

The 0.x series was pre-stable — the API was evolving and breaking changes were expected between minor versions. Multi-spec support is the maturity milestone that warrants declaring the API as **stable**.

- **0.x → 1.0.0** is the first stable release declaration, not a breaking change from a prior stable API.
- The `spec: string` → `specs: SpecConfig[]` change is a breaking change from 0.x, which is acceptable in pre-stable software.
- All packages (`core`, `server`, `devtools-client`) will be bumped to `1.0.0` in sync.

---

## 3. System Architecture

### 3.1 Monorepo Structure (Updated)

```
packages/
├── core/                      # Core server logic (unchanged package)
│   ├── src/
│   │   ├── parser/           # OpenAPI parsing & validation
│   │   ├── router/           # Hono routing engine
│   │   ├── store/            # In-memory data store
│   │   ├── generator/        # Fake data generation
│   │   ├── handlers/         # Handler execution context
│   │   ├── seeds/            # Seed execution
│   │   ├── security/         # Security scheme handling
│   │   ├── simulation/       # Error simulation
│   │   ├── websocket/        # WebSocket server
│   │   ├── server.ts         # createOpenApiServer() — single spec
│   │   ├── internal-api.ts   # Internal API routes
│   │   └── devtools-server.ts# DevTools SPA serving
│   └── package.json
│
├── devtools-client/          # Vue SPA for DevTools (multi-spec aware)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── RoutesPage.vue    # Endpoint listing (grouped by spec)
│   │   │   ├── TimelinePage.vue  # Request/response log (global + filterable)
│   │   │   ├── ModelsPage.vue    # Store data management (per spec)
│   │   │   └── SimulatorPage.vue # Error simulation (global overview)
│   │   ├── components/
│   │   ├── composables/
│   │   └── stores/
│   └── package.json
│
├── server/                   # Vite plugin wrapper (orchestrator)
│   ├── src/
│   │   ├── plugin.ts         # openApiServer() — multi-spec orchestrator
│   │   ├── orchestrator.ts   # NEW: manages N spec instances
│   │   ├── multi-proxy.ts     # Request proxying (multiple proxy paths)
│   │   ├── multi-internal-api.ts # Aggregated internal API for multi-spec
│   │   ├── multi-ws.ts       # Multi-spec WebSocket hub
│   │   ├── multi-command.ts  # Multi-spec command handler
│   │   ├── devtools.ts       # DevTools integration
│   │   ├── hot-reload.ts     # Handler/seed file watching (per spec)
│   │   ├── handlers.ts       # Handler file loading
│   │   ├── seeds.ts          # Seed file loading
│   │   ├── banner.ts         # Startup banner formatting
│   │   ├── spec-id.ts        # NEW: spec ID derivation
│   │   ├── proxy-path.ts     # NEW: proxy path auto-detection
│   │   ├── utils.ts          # Shared utilities
│   │   └── types.ts          # Plugin options (updated)
│   └── package.json
│
└── playground/               # Demo app (multi-spec)
    ├── src/
    ├── openapi/
    │   ├── petstore.yaml     # Pet store API spec
    │   └── billing.yaml      # Billing API spec (NEW)
    ├── mocks/
    │   ├── petstore/         # Organized by spec
    │   │   ├── handlers/
    │   │   └── seeds/
    │   └── billing/          # Organized by spec
    │       ├── handlers/
    │       └── seeds/
    └── package.json
```

### 3.2 Technology Stack

One planned addition to the technology stack from v0.x: NanoJSON will replace the custom JSON editor in DevTools.

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Server** | Hono | Lightweight, fast, modern API, native WebSocket |
| **Parser** | @scalar/openapi-parser | OAS 3.0/3.1 support, dereference, validation |
| **Bundler** | @scalar/json-magic | External reference resolution, YAML/JSON parsing |
| **Upgrader** | @scalar/openapi-upgrader | Convert OAS 2.0/3.0 to 3.1 |
| **Fake Data** | @faker-js/faker | Mature library, varied formats |
| **DevTools UI** | Vue 3 + OpenProps | Consistent with Vue DevTools, CSS design system |
| **JSON Editor** | @pardnchiu/nanojson | Lightweight (~23 KB), zero-dependency, tree-view editor |
| **Icons** | Lucide | Tree-shakeable, lightweight, consistent |
| **State** | Pinia | Vue 3 standard |
| **Build** | Vite + tsup | Ecosystem consistency |

### 3.3 Architecture Diagram (Multi-Spec)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              VITE DEV SERVER                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌────────────────────┐     ┌──────────────────────────────────────────────┐ │
│  │  vite-plugin       │────▶│         HONO MAIN APP (single port)          │ │
│  │  (multi-proxy)     │     │                                              │ │
│  │                    │     │  ┌────────────────────────────────────────┐  │ │
│  │  /api/pets/v1/* ──────────▶│  Spec Instance: petstore               │  │ │
│  │                    │     │  │  ┌────────┐ ┌───────┐ ┌───────────┐   │  │ │
│  │  /api/billing/* ──────────▶│  │ Router │ │ Store │ │ Generator │   │  │ │
│  │                    │     │  │  └────────┘ └───────┘ └───────────┘   │  │ │
│  └────────────────────┘     │  │  ┌──────────┐ ┌──────────────────┐    │  │ │
│                             │  │  │ Handlers │ │SimulationManager │    │  │ │
│  ┌────────────────────┐     │  │  └──────────┘ └──────────────────┘    │  │ │
│  │  Vue App           │     │  └────────────────────────────────────────┘  │ │
│  │  fetch /api/pets/* │────▶│                                              │ │
│  │  fetch /api/bill/* │     │  ┌────────────────────────────────────────┐  │ │
│  └────────────────────┘     │  │  Spec Instance: billing               │  │ │
│                             │  │  ┌────────┐ ┌───────┐ ┌───────────┐   │  │ │
│                             │  │  │ Router │ │ Store │ │ Generator │   │  │ │
│                             │  │  └────────┘ └───────┘ └───────────┘   │  │ │
│                             │  │  ┌──────────┐ ┌──────────────────┐    │  │ │
│                             │  │  │ Handlers │ │SimulationManager │    │  │ │
│                             │  │  └──────────┘ └──────────────────┘    │  │ │
│                             │  └────────────────────────────────────────┘  │ │
│                             │                                              │ │
│                             │  ┌────────────────────────────────────────┐  │ │
│                             │  │  Shared Services                       │  │ │
│                             │  │  ┌──────────────┐ ┌────────────────┐   │  │ │
│                             │  │  │ WebSocket Hub│ │ Internal API   │   │  │ │
│                             │  │  │ (multi-spec) │ │ (aggregated)   │   │  │ │
│                             │  │  └──────────────┘ └────────────────┘   │  │ │
│                             │  │  ┌──────────────┐                      │  │ │
│                             │  │  │ DevTools SPA │                      │  │ │
│                             │  │  │ /_devtools/* │                      │  │ │
│                             │  │  └──────────────┘                      │  │ │
│                             │  └────────────────────────────────────────┘  │ │
│                             └──────────────────────────────────────────────┘ │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────────────────────────────────────────┐
                    │              VUE DEVTOOLS                              │
                    │  ┌─────────────────────────────────────────────────┐  │
                    │  │         DevTools Client (iframe)                │  │
                    │  │                                                 │  │
                    │  │  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌─────┐  │  │
                    │  │  │  Routes  │ │ Timeline │ │ Models │ │ Sim │  │  │
                    │  │  │(by spec)│ │ (global) │ │(by sp.)│ │(glb)│  │  │
                    │  │  └──────────┘ └──────────┘ └────────┘ └─────┘  │  │
                    │  │         ▲                                       │  │
                    │  │         │ WebSocket (spec-tagged events)        │  │
                    │  │         └───────────────────────────────────────│  │
                    │  └─────────────────────────────────────────────────┘  │
                    └───────────────────────────────────────────────────────┘
```

### 3.4 Request Flow (Multi-Spec)

```
Browser Request                Vite Proxy                Hono Main App
     │                            │                           │
     │  GET /api/pets/v1/pet/1    │                           │
     ├───────────────────────────►│                           │
     │                            │  GET /pet/1               │
     │                            ├──────────────────────────►│
     │                            │                           │
     │                            │    ┌──────────────────────┴────────────────┐
     │                            │    │ Route to spec instance: petstore      │
     │                            │    │ (matched by mount path /api/pets/v1)  │
     │                            │    │                                       │
     │                            │    │ 1. Route match (/pet/{petId})         │
     │                            │    │ 2. Check simulations                  │
     │                            │    │ 3. Execute handler/seed/example/faker │
     │                            │    │ 4. Emit WebSocket event               │
     │                            │    │    (tagged with specId: "petstore")   │
     │                            │    └──────────────────────┬────────────────┘
     │                            │                           │
     │                            │  200 { id: 1, ... }       │
     │                            │◄──────────────────────────┤
     │  200 { id: 1, ... }        │                           │
     │◄───────────────────────────┤                           │
```

---

## 4. Core Features (Plugin)

### 4.1 FR-001: Multi-Spec Orchestration (NEW)

**Priority:** P0 (Critical)

**Description:** The plugin MUST support multiple OpenAPI specifications simultaneously. Each spec is an isolated instance with its own store, registry, handlers, seeds, and simulation manager. All instances are served from a single Hono application on a single port.

**Orchestrator Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR                                 │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Hono Main App (single port)                               │ │
│  │                                                            │ │
│  │  Shared:                                                   │ │
│  │  ├── /_devtools/* → DevTools SPA                           │ │
│  │  ├── /_ws → WebSocket Hub (multi-spec aware)               │ │
│  │  └── /_api/* → Internal API (aggregated across specs)      │ │
│  │                                                            │ │
│  │  Per-Spec (mounted as sub-apps):                           │ │
│  │  ├── /* (petstore routes, stripped of proxy prefix)         │ │
│  │  └── /* (billing routes, stripped of proxy prefix)          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Spec Instances:                                                │
│  ┌──────────────────────────┐ ┌──────────────────────────┐     │
│  │ SpecInstance "petstore"  │ │ SpecInstance "billing"   │     │
│  │ ├── document             │ │ ├── document             │     │
│  │ ├── store                │ │ ├── store                │     │
│  │ ├── registry             │ │ ├── registry             │     │
│  │ ├── simulationManager    │ │ ├── simulationManager    │     │
│  │ ├── handlers             │ │ ├── handlers             │     │
│  │ ├── seeds                │ │ ├── seeds                │     │
│  │ ├── timeline[]           │ │ ├── timeline[]           │     │
│  │ └── proxyPath            │ │ └── proxyPath            │     │
│  └──────────────────────────┘ └──────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

**Spec Instance Lifecycle:**

```
For each spec in config.specs:
  ┌─────────────────┐
  │ 1. Derive ID    │  → from config.id or slugified info.title
  ├─────────────────┤
  │ 2. Process Spec │  → bundle → upgrade → inject schema IDs → dereference
  ├─────────────────┤
  │ 3. Derive Proxy │  → from config.proxyPath or spec servers[0].url
  ├─────────────────┤
  │ 4. Create Store │  → with spec-specific idFields
  ├─────────────────┤
  │ 5. Load Handlers│  → from spec-specific handlersDir (skipped if null)
  ├─────────────────┤
  │ 6. Load Seeds   │  → from spec-specific seedsDir (skipped if null)
  ├─────────────────┤
  │ 7. Build Routes │  → Hono sub-app with all endpoints
  ├─────────────────┤
  │ 8. Mount        │  → on main app, routed by proxy path
  └─────────────────┘
```

**Acceptance Criteria:**
- [ ] Support 1 to N spec configurations in `specs` array
- [ ] Each spec instance is fully isolated (store, registry, handlers, seeds, simulations)
- [ ] All spec instances share a single Hono app on a single port
- [ ] Each spec instance has a unique ID
- [ ] Validate that no two specs share the same proxy path (throw error)
- [ ] Validate that no two specs share the same ID (throw error)
- [ ] Spec processing failures are reported per-spec with clear identification
- [ ] Startup banner shows all specs with their details

---

### 4.2 FR-002: Spec ID Derivation (NEW)

**Priority:** P0 (Critical)

**Description:** Each spec MUST have a unique, stable identifier used throughout the system for routing, DevTools grouping, and developer reference.

**Derivation Logic:**

```
1. If config.id is explicitly set → use it directly
2. Otherwise → process the spec, read info.title, slugify it

Slugification rules:
  - Lowercase
  - Replace spaces/special chars with hyphens
  - Remove consecutive hyphens
  - Trim leading/trailing hyphens

Examples:
  "Swagger Petstore" → "swagger-petstore"
  "Billing API v2"   → "billing-api-v2"
  "User Service"     → "user-service"
```

**Usage Throughout System:**

| Context | Usage |
|---------|-------|
| **Configuration** | `config.id` for explicit naming |
| **WebSocket events** | `specId` field on every event |
| **DevTools** | Spec filter chips, grouping labels, color assignment |
| **Internal API** | `/_api/specs/:specId/registry`, `/_api/specs/:specId/store/:schema` |
| **Logging** | `[OpenAPI:petstore]` prefix per spec |
| **Handlers/Seeds dirs** | Used as subdirectory name when `handlersDir`/`seedsDir` are explicitly configured (e.g., `./mocks/{specId}/handlers`). No default directory derivation — dirs default to `null` when unconfigured |

**Acceptance Criteria:**
- [ ] Explicit `id` in config takes priority
- [ ] Auto-derived ID from `info.title` is stable and deterministic
- [ ] IDs are validated for uniqueness across all specs
- [ ] IDs are used consistently across all system components
- [ ] ID derivation handles edge cases (missing title, empty string, special characters)

---

### 4.3 FR-003: Proxy Path Auto-Detection (NEW)

**Priority:** P1 (High)

**Description:** When `proxyPath` is not explicitly configured for a spec, the system SHOULD auto-derive it from the OpenAPI spec's `servers` field.

**Detection Logic:**

```
1. If config.proxyPath is explicitly set → use it
2. Read spec document.servers[0].url
3. Parse the URL:
   a. If it's a full URL (https://api.example.com/v3) → extract path portion (/v3)
   b. If it's a relative path (/api/v3) → use directly
   c. If servers is empty or missing → throw error, proxyPath is required
4. Validate the derived path is not "/" (too broad)
```

**Examples:**

| `servers[0].url` | Derived `proxyPath` |
|-------------------|---------------------|
| `https://petstore3.swagger.io/api/v3` | `/api/v3` |
| `/api/v3` | `/api/v3` |
| `https://api.billing.com/v1` | `/v1` |
| `/billing/api` | `/billing/api` |
| (missing) | Error: proxyPath required |
| `/` | Error: proxyPath too broad |

**Acceptance Criteria:**
- [ ] Auto-derive proxy path from `servers[0].url`
- [ ] Support full URLs (extract path portion)
- [ ] Support relative paths (use directly)
- [ ] Explicit `proxyPath` overrides auto-detection
- [ ] Error when path cannot be derived and `proxyPath` not set
- [ ] Error when derived path is `/` (too broad, would capture all requests)
- [ ] Log the derived path in startup banner with source indication (explicit vs. auto)

---

### 4.4 FR-004: OpenAPI Document Processing

**Priority:** P0 (Critical)

**Description:** The plugin MUST process OpenAPI documents following the Scalar pipeline: bundle external references, upgrade to OpenAPI 3.1, and dereference all `$ref` pointers. This is unchanged from v0.x — it runs once per spec instance.

**Processing Pipeline:**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────┐
│   Input         │───▶│   Bundle        │───▶│   Upgrade       │───▶│  Inject Schema IDs  │───▶│  Dereference    │
│ (string/object) │    │ (resolve refs)  │    │ (to OAS 3.1)    │    │ (x-schema-id ext.)  │    │ (inline $refs)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────────┘    └─────────────────┘
```

**Inject Schema IDs Step:** Before dereferencing, the system injects an `x-schema-id` extension property into every schema defined in `components.schemas`. The value is the schema's component key name (e.g., for `components.schemas.Pet`, the injected property is `x-schema-id: "Pet"`). This step is necessary because `@scalar/openapi-parser`'s dereference operation inlines all `$ref` pointers, which causes schema names (the component keys) to be lost. The `x-schema-id` extension propagates through all inlined references after dereferencing, preserving schema identity for downstream consumers such as `extractSchemaName()` and seed data matching.

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
- [ ] Inject `x-schema-id` extension into every `components.schemas` entry before dereferencing
- [ ] `x-schema-id` value equals the schema's component key name (e.g., `"Pet"` for `components.schemas.Pet`)
- [ ] `x-schema-id` is preserved in all inlined schemas after dereferencing
- [ ] Dereference all $ref pointers inline
- [ ] Report validation errors with spec ID context
- [ ] Return minimal valid document for empty input

---

### 4.5 FR-005: Endpoint Registry (Per Spec)

**Priority:** P0 (Critical)

**Description:** Each spec instance maintains its own centralized registry of endpoints. The orchestrator provides an aggregated view for DevTools.

**Schema Name Resolution:** The `responseSchema` field in each registry entry is populated by `extractSchemaName()`, which identifies the schema name from the response schema object. This function prioritizes the `x-schema-id` extension property (injected during document processing, see FR-004) over other heuristics. This ensures reliable schema identification even after `$ref` dereferencing has removed the original component key names.

**Registry Entry (unchanged):**

```typescript
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
```

**Aggregated Registry (NEW):**

```typescript
interface AggregatedRegistry {
  specs: Map<string, {
    id: string;
    title: string;          // from spec info.title
    version: string;        // from spec info.version
    proxyPath: string;
    color: string;          // assigned color for UI
    registry: EndpointRegistry;
  }>;
  totalEndpoints: number;
  totalSpecs: number;
}
```

**Acceptance Criteria:**
- [ ] Each spec instance builds its own registry (existing logic)
- [ ] Orchestrator provides aggregated registry across all specs
- [ ] Each registry entry is tagged with its spec ID
- [ ] Internal API exposes both per-spec and aggregated views
- [ ] Stats are computed per-spec and globally

---

### 4.6 FR-006: Hono Server (Port Sharing with Sub-Routing)

**Priority:** P0 (Critical)

**Description:** A single Hono application serves all spec instances on a single port. Each spec's routes are mounted as sub-apps. Shared services (DevTools, WebSocket, Internal API) are mounted at the top level.

**Mount Structure:**

```typescript
// Main app — single port
const mainApp = new Hono();

// Shared services
mainApp.use('*', cors());
mainApp.get('/_devtools/*', serveDevToolsApp);
mainApp.get('/_ws', upgradeWebSocket(handleWebSocket));
mainApp.get('/_api/*', internalApiHandler);

// Per-spec sub-apps
// The Vite proxy strips the proxyPath prefix before forwarding,
// so each sub-app receives requests with the prefix already stripped.
// The orchestrator routes to the correct sub-app based on which
// proxy path the request was originally sent to.
for (const instance of specInstances) {
  mainApp.route('/', instance.app);  // Routes are already path-matched
}
```

**Proxy Configuration (Vite side):**

```typescript
// For each spec, configure Vite to proxy its path
for (const instance of specInstances) {
  viteServer.config.server.proxy[instance.proxyPath] = {
    target: `http://localhost:${port}`,
    changeOrigin: true,
    rewrite: (path) => path.replace(
      new RegExp(`^${escapeRegex(instance.proxyPath)}`), ''
    ),
    // Custom header to identify which spec instance should handle
    headers: { 'x-spec-id': instance.id },
  };
}
```

**Acceptance Criteria:**
- [ ] Single port serves all spec instances
- [ ] Each spec's routes are isolated in sub-apps
- [ ] Shared services are accessible regardless of spec
- [ ] Vite proxy configured per spec with correct path rewriting
- [ ] No route conflicts between specs (different proxy paths guarantee isolation)
- [ ] Requests are routed to the correct spec instance

---

### 4.7 FR-007: In-Memory Store (Per Spec)

**Priority:** P0 (Critical)

**Description:** Each spec instance has its own independent in-memory store. The store API is unchanged from v0.x. There is no cross-spec data sharing in v1.0.

**Store Isolation:**

```
Spec "petstore":
  store.list('Pet')     → [{ id: 1, name: "Buddy" }, ...]
  store.list('User')    → [{ username: "john" }, ...]

Spec "billing":
  store.list('User')    → [{ id: 1, email: "john@..." }, ...]  // Different User!
  store.list('Invoice') → [{ invoiceId: "INV-001" }, ...]
```

Two specs can have schemas with the same name (e.g., `User`) without any conflict. Each store is completely independent.

**ID Field Configuration:**

ID fields are now configured per spec:

```typescript
specs: [
  {
    id: 'petstore',
    spec: './openapi/petstore.yaml',
    idFields: { Pet: 'id', User: 'username' }
  },
  {
    id: 'billing',
    spec: './openapi/billing.yaml',
    idFields: { User: 'id', Invoice: 'invoiceId' }
  }
]
```

**Acceptance Criteria:**
- [ ] Each spec instance has its own store (existing logic)
- [ ] ID fields are configured per spec
- [ ] Same schema names in different specs do not conflict
- [ ] Store operations are scoped to the spec instance
- [ ] DevTools can query stores per spec via WebSocket

---

### 4.8 FR-008: Custom Handlers (Per Spec)

**Priority:** P0 (Critical)

**Description:** Each spec has its own handlers directory. Handler files and the `defineHandlers()` API are unchanged from v0.x.

**Directory Organization:**

```
mocks/
├── petstore/
│   ├── handlers/
│   │   └── pets.handlers.ts      # Handlers for petstore operations
│   └── seeds/
│       └── pets.seeds.ts
└── billing/
    ├── handlers/
    │   └── invoices.handlers.ts  # Handlers for billing operations
    └── seeds/
        └── invoices.seeds.ts
```

**Directory Resolution:**

```
If handlersDir is explicitly set   → use the provided path
If handlersDir is not set or null  → no handler loading (handlers feature disabled for this spec)
Empty or whitespace-only strings   → normalized to null (no handler loading)
```

**Acceptance Criteria:**
- [ ] Each spec loads handlers from its configured directory
- [ ] Handler API (`defineHandlers`, `HandlerContext`) is unchanged
- [ ] When `handlersDir` is not configured, defaults to `null` — no handler file crawling occurs
- [ ] Empty or whitespace-only `handlersDir` values are normalized to `null`
- [ ] Explicit `handlersDir` path enables handler loading from that directory
- [ ] Handler hot reload is per-spec (only active when `handlersDir` is configured)

---

### 4.9 FR-009: Seed Data System (Per Spec)

**Priority:** P0 (Critical)

**Description:** Each spec has its own seeds directory. Seeds populate the spec's own store. The `defineSeeds()` API is unchanged from v0.x.

**Directory Resolution:**

```
If seedsDir is explicitly set   → use the provided path
If seedsDir is not set or null  → no seed loading (seeds feature disabled for this spec)
Empty or whitespace-only strings → normalized to null (no seed loading)
```

**Seed Execution Context:**

Seeds receive `store` access scoped to their own spec. A petstore seed can reference `store.list('Pet')` but has no access to the billing store.

**Two-Phase Seed Population:** Seed population involves two distinct phases:
1. **Execute seeds** — `executeSeeds()` runs seed functions which populate the Store with data.
2. **Sync seed map to route builder** — After seed execution, a `Map<string, unknown[]>` must be built from the store's populated data and passed to `server.updateSeeds()` to sync the route builder's internal seed map. This sync step is required because the route builder captures its `seeds` map via closure at build time; the map must be mutated in place (`.clear()` + `.set()`) rather than reassigned. This two-phase process applies to both initial load and hot reload.

**Acceptance Criteria:**
- [ ] Each spec loads seeds from its configured directory
- [ ] Seeds populate the spec's own store only
- [ ] Seed API (`defineSeeds`, `SeedContext`) is unchanged
- [ ] When `seedsDir` is not configured, defaults to `null` — no seed file crawling occurs
- [ ] Empty or whitespace-only `seedsDir` values are normalized to `null`
- [ ] Explicit `seedsDir` path enables seed loading from that directory
- [ ] After seed execution, the route builder's seed map is explicitly synced via `updateSeeds()`
- [ ] Seed hot reload is per-spec (only active when `seedsDir` is configured)
- [ ] Reseed command in DevTools specifies target spec

---

### 4.10 FR-010: Data Generator

**Priority:** P1 (High)

**Description:** Unchanged from v0.x. Automatic fake data generation based on schema when no seed/example exists. Each spec instance uses the generator independently.

**Acceptance Criteria:**
- [ ] Generate data based on OpenAPI type + format
- [ ] Detect common field names for smarter generation
- [ ] Support nested objects and arrays
- [ ] Respect enum values when defined
- [ ] Handle required vs optional fields

---

### 4.11 FR-011: Security Scheme Handling

**Priority:** P1 (High)

**Description:** Unchanged from v0.x. Each spec instance resolves and validates its own security schemes. Validate presence of credentials, accept any non-empty value.

**Response Priority Integration:** Security validation runs **before all response paths**, including simulations. Even endpoints with active simulations return 401 if required credentials are missing. The full response priority chain is: Security Validation → Simulation → Handler → Seed → Example → Auto-generated.

**Acceptance Criteria:**
- [ ] Parse security schemes from each spec independently
- [ ] Validate presence of required credentials
- [ ] Accept any non-empty value as valid
- [ ] Return 401 when credentials are missing
- [ ] Security validation runs before simulation — simulated endpoints also require valid credentials
- [ ] Log security scheme usage per spec in startup banner

---

### 4.12 FR-012: Hot Reload (Per Spec)

**Priority:** P1 (High)

**Description:** Each spec instance has independent file watchers for its handlers and seeds directories. Changes to one spec's files only reload that spec instance. File watching is only active for directories that are explicitly configured (not `null`). If `handlersDir` or `seedsDir` is `null` (the default when unconfigured), no watcher is set up for that directory.

**Hot Reload Scope:**

| File Changed | Reload Scope |
|-------------|--------------|
| `mocks/petstore/handlers/pets.handlers.ts` | Petstore handlers only |
| `mocks/billing/seeds/invoices.seeds.ts` | Billing seeds only |
| `openapi/petstore.yaml` | **No hot reload** — requires full restart |

**Acceptance Criteria:**
- [ ] Watch handlers directory per spec for changes (only when `handlersDir` is configured, not `null`)
- [ ] Watch seeds directory per spec for changes (only when `seedsDir` is configured, not `null`)
- [ ] No watcher is created when `handlersDir` or `seedsDir` is `null`
- [ ] Reload only the affected spec instance
- [ ] Notify DevTools via WebSocket with spec ID context
- [ ] Maintain other spec instances' state during reload
- [ ] Log reloaded files with spec ID prefix

---

### 4.13 FR-013: Request Proxying (Multi-Path)

**Priority:** P0 (Critical)

**Description:** Configure Vite to proxy requests to the correct spec instance based on proxy path.

**Multi-Proxy Configuration:**

```typescript
// Generated Vite proxy config
{
  '/api/pets/v1': {
    target: 'http://localhost:4000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/pets\/v1/, ''),
  },
  '/api/billing/v2': {
    target: 'http://localhost:4000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api\/billing\/v2/, ''),
  }
}
```

**Acceptance Criteria:**
- [ ] Configure one Vite proxy entry per spec
- [ ] Each proxy rewrites the path correctly
- [ ] All proxies target the same port
- [ ] Requests are routed to the correct spec instance
- [ ] Proxy paths do not overlap (validated at startup)

---

### 4.14 FR-014: WebSocket Server (Multi-Spec Aware)

**Priority:** P0 (Critical)

**Description:** A single WebSocket hub serves all spec instances. All events are tagged with the originating spec ID. Clients can subscribe to all events or filter by spec.

**Server → Client Events (Updated):**

```typescript
type ServerEvent =
  | { type: 'connected'; data: { serverVersion: string; specs: SpecInfo[] } }
  | { type: 'request'; data: RequestLogEntry & { specId: string } }
  | { type: 'response'; data: ResponseLogEntry & { specId: string } }
  | { type: 'store:updated'; data: { specId: string; schema: string; action: string } }
  | { type: 'handlers:updated'; data: { specId: string; count: number } }
  | { type: 'seeds:updated'; data: { specId: string; count: number } }
  | { type: 'simulation:added'; data: { specId: string; path: string } }
  | { type: 'simulation:removed'; data: { specId: string; path: string } }
  | { type: 'registry'; data: { specId: string; registry: RegistryData } }
  | { type: 'timeline'; data: { specId: string; entries: unknown[]; count: number } }
  | { type: 'store'; data: { specId: string; schema: string; items: unknown[] } }
  | { type: 'error'; data: { specId?: string; command: string; message: string } };

interface SpecInfo {
  id: string;
  title: string;
  version: string;
  proxyPath: string;
  color: string;
  endpointCount: number;
  schemaCount: number;
}
```

**Client → Server Commands (Updated):**

```typescript
type ClientCommand =
  // Global commands
  | { type: 'get:specs' }
  | { type: 'get:registry'; data?: { specId?: string } }           // specId optional = all
  | { type: 'get:timeline'; data?: { specId?: string; limit?: number } }
  | { type: 'clear:timeline'; data?: { specId?: string } }         // specId optional = all

  // Spec-scoped commands (specId required)
  | { type: 'get:store'; data: { specId: string; schema: string } }
  | { type: 'set:store'; data: { specId: string; schema: string; items: unknown[] } }
  | { type: 'clear:store'; data: { specId: string; schema: string } }
  | { type: 'set:simulation'; data: { specId: string } & SimulationConfig }
  | { type: 'clear:simulation'; data: { specId: string; path: string } }
  | { type: 'reseed'; data: { specId: string } };
```

**Key Design Decision:** The `connected` event now includes a `specs` array with all spec metadata. This allows the DevTools client to immediately render the spec filter and color-code elements without an additional round-trip.

**Acceptance Criteria:**
- [ ] Single WebSocket endpoint serves all specs
- [ ] All events include `specId` field
- [ ] `connected` event includes full spec metadata
- [ ] Commands support optional `specId` for global vs scoped operations
- [ ] Spec-scoped commands validate the specId exists
- [ ] Broadcast reaches all connected clients regardless of spec context

---

## 5. DevTools Client Features

### 5.1 FR-100: Vue DevTools Integration

**Description:** Custom tab in Vue DevTools with embedded application. Unchanged from v0.x.

**Acceptance Criteria:**
- [ ] Register custom tab in Vue DevTools
- [ ] Serve SPA via Hono server at `/_devtools/`
- [ ] Embed SPA in iframe
- [ ] Establish WebSocket connection on load

---

### 5.2 FR-101: Spec-Aware Global Dashboard (NEW)

**Priority:** P0 (Critical)

**Description:** All DevTools pages default to a **global view** showing data from all specs. A spec filter allows narrowing to a specific spec. Each spec is assigned a consistent color for visual distinction.

**Spec Color Assignment:**

Colors are assigned deterministically based on spec order in configuration:

```typescript
const SPEC_COLORS = [
  '#4ade80',  // green
  '#60a5fa',  // blue
  '#f472b6',  // pink
  '#facc15',  // yellow
  '#a78bfa',  // purple
  '#fb923c',  // orange
  '#2dd4bf',  // teal
  '#f87171',  // red
];
// Color index = spec order in config % SPEC_COLORS.length
```

**Connected Event → Spec Initialization:**

When the DevTools connects via WebSocket, the `connected` event includes all spec metadata. The client uses this to:
1. Populate the spec filter chips
2. Assign colors
3. Initialize per-spec stores
4. Request initial data (registries, timelines, etc.)

**Acceptance Criteria:**
- [ ] Consistent color per spec across all pages
- [ ] Color derived from configuration order (stable)
- [ ] Spec metadata available immediately on connection
- [ ] All pages support global (all specs) and filtered (single spec) views
- [ ] Spec filter state is shared across pages (filtering in Routes persists when switching to Timeline)

---

### 5.3 FR-102: Routes Page (Multi-Spec)

**Description:** Endpoint listing grouped by spec, then by tags/schema.

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Routes] [Timeline] [Models] [Simulator]                           │
├─────────────────────────────────────────────────────────────────────┤
│  🔍 Search endpoints...    🔽 Filters ^    35 endpoints | 2 specs   │
├─────────────────────────────────────────────────────────────────────┤
│  SPECS                                                              │
│  [🟢 petstore] [🔵 billing]                                        │
│                                                                     │
│  METHODS                                                            │
│  [GET] [POST] [PUT] [PATCH] [DELETE] [OPTIONS] [HEAD] [TRACE]      │
│                                                                     │
│  STATUS                                                             │
│  [<> Has Handler] [🌱 Has Seed]                                     │
├─────────────────────┬───────────────────────────────────────────────┤
│                     │                                               │
│  ▼ 🟢 petstore (19) │  GET /pet/{petId}                            │
│    ▸ Pet (8)        │  ──────────────────────────────────────────  │
│    ▸ Store (4)      │  Spec: petstore                              │
│    ▸ User (7)       │  Operation: getPetById                        │
│                     │  Tags: pet                                    │
│  ▼ 🔵 billing (16)  │                                               │
│    ▸ Invoices (8)   │  Response Schema: Pet                         │
│    ▸ Payments (5)   │  Handler: ✓ (pets.handlers.ts)                │
│    ▸ Accounts (3)   │  Seed: ✓ (15 items)                          │
│                     │                                               │
└─────────────────────┴───────────────────────────────────────────────┘
```

**Grouping Hierarchy:**
1. **Level 0:** Spec (with color indicator and endpoint count)
2. **Level 1:** Tag (existing grouping logic per spec)
3. **Level 2:** Endpoint (existing)

When a single spec is selected in the filter, Level 0 collapses and the view matches the current v0.x layout (tags → endpoints).

**Filter Composition:**

All filters compose with AND logic:
- **SPECS** + **METHODS** + **STATUS** + **Search** = final result
- Example: `[petstore] + [GET] + [Has Handler] + "find"` → shows only petstore GET endpoints with handlers matching "find"

**Counter Update:**

The top-right counter reflects applied filters: `12 endpoints | 1 spec` when filtered.

**Acceptance Criteria:**
- [ ] Endpoints grouped by spec at top level
- [ ] Spec color indicator in group header
- [ ] Existing tag grouping preserved within each spec
- [ ] SPECS filter chips added to filter panel
- [ ] Existing METHODS and STATUS filters preserved
- [ ] Search works across all specs (or filtered spec)
- [ ] Counter reflects filtered state
- [ ] Single-spec filter collapses spec grouping level
- [ ] Endpoint detail shows spec context

---

### 5.4 FR-103: Timeline Page (Multi-Spec)

**Description:** Real-time request/response log across all specs, with spec identification and filtering.

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Routes] [Timeline] [Models] [Simulator]                           │
├─────────────────────────────────────────────────────────────────────┤
│  🔍 Search by path or operation...  🔽 Filters ^  [🗑] 14 req | avg 28ms│
├─────────────────────────────────────────────────────────────────────┤
│  SPECS                                                              │
│  [🟢 petstore] [🔵 billing]                                        │
│                                                                     │
│  METHODS                                                            │
│  [GET] [POST] [PUT] [PATCH] [DELETE] [OPTIONS] [HEAD] [TRACE]      │
│                                                                     │
│  STATUS                                                             │
│  [2xx (8)] [3xx (0)] [4xx (2)] [5xx (4)]                           │
│                                                                     │
│  TYPE                                                               │
│  [Simulated only]                                                   │
├─────────────────────┬───────────────────────────────────────────────┤
│                     │                                               │
│  🟢 14:32:45.123    │  REQUEST                                     │
│  GET /pet/1  200    │  ──────────────────────────────────────────  │
│  (23ms) petstore    │  Spec: petstore                              │
│                     │  Method: GET                                  │
│  🔵 14:32:44.891    │  Path: /pet/1                                │
│  POST /invoices     │  Operation: getPetById                        │
│  201 (45ms) billing │                                               │
│                     │  Headers:                                     │
│  🟢 14:32:44.102    │  Authorization: Bearer eyJ...                 │
│  GET /pet/find...   │                                               │
│  200 (18ms) petst.  │  ──────────────────────────────────────────  │
│                     │  RESPONSE                                     │
│  🔵 14:32:43.567    │  Status: 200 OK                              │
│  GET /invoices/1    │  Duration: 23ms                               │
│  500 (89ms) ⚡sim   │                                               │
│  billing            │  Body:                                        │
│                     │  { "id": 1, "name": "Buddy" }                │
│                     │                                               │
└─────────────────────┴───────────────────────────────────────────────┘
```

**Key Changes from v0.x:**
- Each timeline entry shows its spec color indicator (dot) and spec name
- SPECS filter chips added to filter panel alongside existing METHODS, STATUS, TYPE
- Timeline is **global by default** — interleaved across all specs, ordered by timestamp
- Search searches across all specs (or filtered spec)

**Acceptance Criteria:**
- [ ] Timeline shows entries from all specs interleaved by timestamp
- [ ] Each entry shows spec color indicator and spec name
- [ ] SPECS filter chips added to filter panel
- [ ] Existing METHODS, STATUS (2xx/3xx/4xx/5xx), and TYPE filters preserved
- [ ] Search works across all specs
- [ ] Clear button respects spec filter (clear all vs clear one spec)
- [ ] Counter reflects filtered state
- [ ] Entry detail panel shows spec context

---

### 5.5 FR-104: Models Page (Multi-Spec)

**Description:** Store data management per schema, organized by spec.

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Routes] [Timeline] [Models] [Simulator]                           │
├─────────────────────────────────────────────────────────────────────┤
│  Spec: [🟢 petstore ▼]  Schema: [Pet ▼]    [Clear] [Reseed] [Save] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  [                                                             ] │
│  │  [  // JSON Editor with syntax highlighting                    ] │
│  │  [  [                                                          ] │
│  │  [    { "id": 1, "name": "Buddy", "status": "available" },    ] │
│  │  [    { "id": 2, "name": "Max", "status": "pending" },        ] │
│  │  [    ...                                                      ] │
│  │  [  ]                                                          ] │
│  │  [                                                             ] │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Items: 15 | Valid JSON ✓                                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Changes from v0.x:**
- **Spec dropdown** added before the Schema dropdown
- Schema dropdown shows only schemas for the selected spec
- Reseed applies to the selected spec only
- Clear applies to the selected schema within the selected spec
- **JSON editor will be replaced** with NanoJSON (`@pardnchiu/nanojson`) — a lightweight (~23 KB), zero-dependency, tree-view JSON editor. The existing `DataTable.vue` component remains for tabular data display

**JSON Editor Integration (NanoJSON):**

NanoJSON is loaded at runtime via dynamic import from jsDelivr CDN. It is **not bundled** with the devtools-client — this keeps the bundle size small and avoids adding a build dependency.

```typescript
// Runtime dynamic import — not resolved by Vite/tsup at build time
const { JSONEditor } = await import(
  'https://cdn.jsdelivr.net/npm/@pardnchiu/nanojson@1.1.7/dist/NanoJSON.esm.js'
);

const editor = new JSONEditor({
  id: 'json-editor-container',
  fill: true,
  json: store.list(selectedSchema),
  button: {
    import: false,          // We handle import via Reseed
    export: true,           // Allow JSON download
    reset: false,           // We handle reset via Clear/Reseed buttons
  },
  when: {
    updated: () => {
      // Sync editor state back to store
    },
  },
});

// Read current data
const data = JSON.parse(editor.json);

// Update editor with new data
editor.import(newData);
```

NanoJSON provides:
- Tree-view editor with collapsible nodes
- Inline editing of all JSON types (string, number, boolean, array, object)
- Add/remove nodes in the tree
- Export as JSON file
- Lifecycle hooks (`beforeUpdate`, `updated`) for integration with Vue reactivity
- `readonly` mode (can be toggled via `enable()`/`disable()`)

CSS is auto-loaded from CDN by NanoJSON. Custom CSS overrides may be needed for theme consistency with OpenProps dark/light mode.

**Investigation Required (Phase 4):** Before integrating NanoJSON, verify how it applies CSS — whether it uses Shadow DOM (which prevents external CSS overrides) or injects global styles (which may conflict with OpenProps variables). If Shadow DOM is used, the `::part()` CSS pseudo-element or CSS custom properties must be used instead. This investigation should be done at the start of Phase 4 to determine the integration approach before building the `NanoJsonEditor.vue` component.

**Existing Components:**
- `DataTable.vue` — Tabular data display component with sorting and pagination. Remains in use for structured data presentation alongside the JSON editor.

**Acceptance Criteria:**
- [ ] Spec dropdown to select active spec
- [ ] Schema dropdown filtered to selected spec's schemas
- [ ] NanoJSON editor loaded via dynamic import from jsDelivr CDN
- [ ] NanoJSON not included in devtools-client bundle
- [ ] Tree-view JSON editing with collapsible nodes
- [ ] Real-time JSON validation via NanoJSON
- [ ] Export button (NanoJSON built-in) for JSON download
- [ ] Save, Clear, Reseed buttons scoped to selected spec
- [ ] Item counter
- [ ] Switching spec resets schema selection
- [ ] CSS theme overrides for dark/light mode consistency
- [ ] `DataTable.vue` retained for tabular data views

---

### 5.6 FR-105: Simulator Page (Multi-Spec)

**Description:** Configure error simulations for endpoints across all specs, with global overview.

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Routes] [Timeline] [Models] [Simulator]                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Active Simulations (3)                                [Clear All]  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ 🟢 petstore  GET /pet/{petId}    Server Error 500      [×]    │ │
│  │ 🟢 petstore  POST /pet           Slow Network (3s)     [×]    │ │
│  │ 🔵 billing   POST /invoices      Rate Limit 429        [×]    │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Add Simulation                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Spec:     [🟢 petstore                                   ▼]   │ │
│  │ Endpoint: [GET /pet/{petId}                               ▼]   │ │
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

**Key Changes from v0.x:**
- Active simulations list shows spec color + spec name for each entry — **global overview** of all simulations across all specs
- **Spec dropdown** added in the "Add Simulation" form before endpoint selection
- Endpoint dropdown filtered to selected spec's endpoints
- Clear All removes simulations across all specs
- Individual remove (×) is scoped to the specific spec+endpoint

**Acceptance Criteria:**
- [ ] Active simulations list shows entries from all specs
- [ ] Each entry shows spec color indicator and spec name
- [ ] Spec dropdown in the add form
- [ ] Endpoint dropdown filtered to selected spec
- [ ] Existing quick presets preserved
- [ ] Clear All removes all simulations across all specs
- [ ] Individual remove is spec-scoped
- [ ] Timeline entries for simulated responses show spec context

---

## 6. Plugin Configuration

### 6.1 Options Interface (v1.0)

```typescript
interface OpenApiServerOptions {
  /**
   * Array of OpenAPI spec configurations (required)
   *
   * Each entry defines one API spec to serve. At least one spec
   * is required. Each spec runs as an isolated instance with its
   * own store, handlers, seeds, and simulations.
   *
   * @example
   * specs: [
   *   { spec: './openapi/petstore.yaml' },
   *   { spec: './openapi/billing.yaml', id: 'billing' }
   * ]
   */
  specs: SpecConfig[];

  /**
   * Server port for the mock server
   *
   * All spec instances share this single port.
   *
   * @default 4000
   */
  port?: number;

  /**
   * Enable/disable plugin
   * @default true
   */
  enabled?: boolean;

  /**
   * Maximum timeline events per spec
   * @default 500
   */
  timelineLimit?: number;

  /**
   * Enable DevTools integration
   * @default true
   */
  devtools?: boolean;

  /**
   * Enable CORS on the mock server
   * @default true
   */
  cors?: boolean;

  /**
   * CORS origin configuration
   * @default '*'
   */
  corsOrigin?: string | string[];

  /**
   * Custom logger instance
   */
  logger?: Logger;

  /**
   * Suppress startup banner
   * @default false
   */
  silent?: boolean;
}

interface SpecConfig {
  /**
   * Path to OpenAPI spec file (required)
   *
   * Supports: file paths, URLs, YAML, JSON
   *
   * @example './openapi/petstore.yaml'
   * @example 'https://petstore3.swagger.io/api/v3/openapi.json'
   */
  spec: string;

  /**
   * Unique identifier for this spec instance
   *
   * Used throughout the system for routing, DevTools grouping,
   * logging, and developer reference.
   *
   * If omitted, auto-derived from spec's info.title (slugified).
   *
   * @example 'petstore'
   * @example 'billing-api'
   */
  id?: string;

  /**
   * Base path for request proxy
   *
   * If omitted, auto-derived from spec's servers[0].url.
   * Must be unique across all specs.
   *
   * @example '/api/v3'
   * @example '/api/billing/v1'
   */
  proxyPath?: string;

  /**
   * Directory containing handler files for this spec
   *
   * When null (the default), no handler file crawling occurs.
   * Empty or whitespace-only strings are normalized to null.
   *
   * @default null
   */
  handlersDir?: string | null;

  /**
   * Directory containing seed files for this spec
   *
   * When null (the default), no seed file crawling occurs.
   * Empty or whitespace-only strings are normalized to null.
   *
   * @default null
   */
  seedsDir?: string | null;

  /**
   * ID field configuration per schema for this spec
   *
   * @example { Pet: 'id', User: 'username' }
   * @default {} (uses 'id' for all schemas)
   */
  idFields?: Record<string, string>;
}
```

### 6.2 Configuration Examples

**Single spec (simplest):**

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { openApiServer } from '@websublime/vite-plugin-open-api-server';

export default defineConfig({
  plugins: [
    vue(),
    openApiServer({
      specs: [{
        spec: './openapi/petstore.yaml',
        // id: auto-derived from info.title → "swagger-petstore"
        // proxyPath: auto-derived from servers[0].url → "/api/v3"
      }],
    }),
  ],
});
```

**Multiple specs (typical):**

```typescript
export default defineConfig({
  plugins: [
    vue(),
    openApiServer({
      port: 4000,
      specs: [
        {
          id: 'petstore',
          spec: './openapi/petstore.yaml',
          proxyPath: '/api/pets/v1',
          handlersDir: './mocks/petstore/handlers',
          seedsDir: './mocks/petstore/seeds',
          idFields: { Pet: 'id', User: 'username' },
        },
        {
          id: 'billing',
          spec: './openapi/billing.yaml',
          proxyPath: '/api/billing/v2',
          handlersDir: './mocks/billing/handlers',
          seedsDir: './mocks/billing/seeds',
          idFields: { Invoice: 'invoiceId' },
        },
      ],
      timelineLimit: 500,
      devtools: true,
    }),
  ],
});
```

**Multiple specs (auto-derived):**

```typescript
export default defineConfig({
  plugins: [
    vue(),
    openApiServer({
      specs: [
        { spec: './openapi/petstore.yaml' },      // All auto-derived
        { spec: './openapi/billing.yaml' },
        { spec: 'https://api.example.com/v1/openapi.json' },
      ],
    }),
  ],
});
```

---

## 7. Startup Banner & Logging

### 7.1 Startup Output (Multi-Spec)

```
═══════════════════════════════════════════════════════════════════════════════
                     OPEN API SERVER v1.0.0
═══════════════════════════════════════════════════════════════════════════════

  ┌─ 🟢 petstore ────────────────────────────────────────────────────────────
  │
  │  ✓ Spec: petstore.yaml
  │  ✓ API: Swagger Petstore v1.0.0
  │  ✓ Endpoints: 19 operations
  │  ✓ Schemas: 6 definitions
  │  ✓ Proxy: /api/v3/* (auto-detected from spec)
  │
  │  HANDLERS:
  │  ✓ pets.handlers.ts: 4 handlers (getPetById, findPetsByStatus, addPet, updatePet)
  │  ✓ store.handlers.ts: 2 handlers (placeOrder, getOrderById)
  │
  │  SEEDS:
  │  ✓ Pet: 15 items | Category: 5 items | Order: 10 items | User: 5 items
  │
  │  SECURITY:
  │  ✓ petstore_auth (OAuth2) - 12 endpoints
  │  ✓ api_key (API Key in header) - 2 endpoints
  │
  └──────────────────────────────────────────────────────────────────────────

  ┌─ 🔵 billing ─────────────────────────────────────────────────────────────
  │
  │  ✓ Spec: billing.yaml
  │  ✓ API: Billing Service v2.1.0
  │  ✓ Endpoints: 16 operations
  │  ✓ Schemas: 8 definitions
  │  ✓ Proxy: /api/billing/v2/* (explicit)
  │
  │  HANDLERS:
  │  ✓ invoices.handlers.ts: 3 handlers (createInvoice, getInvoice, listInvoices)
  │
  │  SEEDS:
  │  ✓ Invoice: 20 items | Payment: 12 items | Account: 5 items
  │
  │  SECURITY:
  │  ✓ bearer_auth (HTTP Bearer) - 16 endpoints
  │
  └──────────────────────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════════════════════════════
  Server:       http://localhost:4000
  DevTools:     http://localhost:4000/_devtools/
  WebSocket:    ws://localhost:4000/_ws
  Specs:        2 specs | 35 endpoints | 14 schemas
  Proxies:
    /api/v3/*          → petstore
    /api/billing/v2/*  → billing
═══════════════════════════════════════════════════════════════════════════════
```

### 7.2 Request Logging (Multi-Spec)

```
[OpenAPI:petstore] → GET  /pet/1 [getPetById]
[OpenAPI:petstore] ✓ 200 GET /pet/1 (23ms)
[OpenAPI:billing]  → POST /invoices [createInvoice]
[OpenAPI:billing]  ✓ 201 POST /invoices (45ms)
[OpenAPI:petstore] → GET  /pet/999 [getPetById]
[OpenAPI:petstore] ✗ 404 GET /pet/999 (12ms)
[OpenAPI:billing]  → GET  /invoices/1 [getInvoice] [SIMULATION: 500]
[OpenAPI:billing]  ✗ 500 GET /invoices/1 (3ms) [Simulated]
```

---

## 8. Migration Guide (0.x → 1.0)

### 8.1 Configuration Changes

**Before (0.x):**

```typescript
openApiServer({
  spec: './openapi/petstore.yaml',
  port: 4000,
  proxyPath: '/api/v3',
  handlersDir: './mocks/handlers',
  seedsDir: './mocks/seeds',
  idFields: { Pet: 'id', User: 'username' },
  timelineLimit: 500,
  devtools: true,
})
```

**After (1.0):**

```typescript
openApiServer({
  port: 4000,
  timelineLimit: 500,
  devtools: true,
  specs: [{
    spec: './openapi/petstore.yaml',
    proxyPath: '/api/v3',
    handlersDir: './mocks/handlers',
    seedsDir: './mocks/seeds',
    idFields: { Pet: 'id', User: 'username' },
  }],
})
```

### 8.2 What Moved

| Option | 0.x Location | 1.0 Location |
|--------|-------------|-------------|
| `spec` | Top-level | `specs[].spec` |
| `proxyPath` | Top-level | `specs[].proxyPath` |
| `handlersDir` | Top-level | `specs[].handlersDir` |
| `seedsDir` | Top-level | `specs[].seedsDir` |
| `idFields` | Top-level | `specs[].idFields` |
| `port` | Top-level | Top-level (unchanged) |
| `enabled` | Top-level | Top-level (unchanged) |
| `timelineLimit` | Top-level | Top-level (unchanged) |
| `devtools` | Top-level | Top-level (unchanged) |
| `cors` | Top-level | Top-level (unchanged) |
| `silent` | Top-level | Top-level (unchanged) |

### 8.3 What's New

| Feature | Description |
|---------|-------------|
| `specs[]` | Array of spec configurations (replaces single `spec`) |
| `specs[].id` | Explicit spec identifier (optional, auto-derived) |
| Proxy auto-detection | `proxyPath` derived from spec's `servers[0].url` if omitted |
| Explicit handlers/seeds dirs | `handlersDir` and `seedsDir` default to `null` (no file crawling when unconfigured); must be explicitly set to enable handler/seed loading |

### 8.4 Directory Structure Migration

**Before (0.x):**

```
mocks/
├── handlers/
│   └── pets.handlers.ts
└── seeds/
    └── pets.seeds.ts
```

**After (1.0) — single spec with explicit dirs:**

No change needed if `handlersDir` and `seedsDir` are set explicitly.

**After (1.0) — without explicit dirs:**

When `handlersDir` and `seedsDir` are not configured, they default to `null` and no handler/seed file crawling occurs. To enable handler and seed loading, you must explicitly set these directories in each spec's configuration:

```typescript
specs: [
  {
    spec: './openapi/petstore.yaml',
    handlersDir: './mocks/petstore/handlers',  // explicitly set
    seedsDir: './mocks/petstore/seeds',        // explicitly set
  },
  {
    spec: './openapi/billing.yaml',
    handlersDir: './mocks/billing/handlers',   // explicitly set
    seedsDir: './mocks/billing/seeds',         // explicitly set
  },
]
```

---

## 9. Non-Functional Requirements

### 9.1 Performance

| Metric | Target |
|--------|--------|
| Startup time (single spec) | < 3 seconds |
| Startup time (5 specs) | < 10 seconds |
| Request latency (no simulation delay) | < 50ms |
| Memory usage (base, single spec) | < 100MB |
| Memory usage (per additional spec) | < 50MB |
| Hot reload time (single spec) | < 500ms |

### 9.2 Compatibility

| Environment | Versions |
|-------------|----------|
| Node.js | ^20.19.0 or >=22.12.0 |
| Vite | ^5.0.0 or ^6.0.0 or ^7.0.0 |
| Vue | >= 3.5.0 |
| Browsers | Chrome, Firefox, Safari (last 2 versions) |

### 9.3 Developer Experience

- Clear and actionable error messages with spec context
- TypeScript types for handlers and seeds (unchanged)
- Auto-complete for store API (unchanged)
- Hot reload without state loss, per spec
- DevTools always available with global overview
- System theme preference support (light/dark)
- Startup banner clearly identifies each spec
- Request logs prefixed with spec ID

---

## 10. Out of Scope (v1.0)

| Feature | Reason |
|---------|--------|
| Cross-spec seed dependencies | Complexity vs benefit; each spec is isolated |
| Data persistence | Complexity vs benefit for dev tool |
| Request body validation | Out of scope for mock server |
| Real rate limiting | Simulation only |
| GraphQL | Out of OpenAPI scope |
| gRPC | Out of OpenAPI scope |
| OpenAPI spec hot-reload | Requires full restart |
| Shared store across specs | May be added in future version (Approach C) |
| Spec-level enable/disable at runtime | May be added in future version |

---

## 11. Milestones & Phases

### Phase 1: Multi-Spec Core Infrastructure

**Scope:** Orchestrator, spec ID derivation, proxy path auto-detection, multi-proxy setup.

**Deliverables:**
- Orchestrator that creates N spec instances
- Spec ID derivation logic (explicit or from `info.title`)
- Proxy path auto-detection from `servers[0].url`
- Single Hono app with sub-app mounting
- Multi-proxy Vite configuration
- Updated plugin configuration types (`specs: SpecConfig[]`)

**Exit Criteria:**
- [ ] Multiple specs can be configured and served from single port
- [ ] Each spec's endpoints are reachable via its proxy path
- [ ] Spec IDs are unique and stable
- [ ] Proxy paths are correctly derived or explicitly set
- [ ] Startup validation catches duplicate IDs and overlapping proxy paths

### Phase 2: Per-Spec Isolation

**Scope:** Ensure all existing features work correctly in multi-spec context.

**Deliverables:**
- Per-spec stores with independent ID field configuration
- Per-spec handler loading from spec-specific directories
- Per-spec seed loading and execution
- Per-spec simulation managers
- Per-spec hot reload (handlers + seeds)

**Exit Criteria:**
- [ ] Same schema name in different specs does not conflict
- [ ] Handlers for one spec don't affect another
- [ ] Seeds for one spec populate only its store
- [ ] Hot reload of one spec doesn't affect others
- [ ] Simulations are scoped to their spec instance

### Phase 3: WebSocket & Internal API (Multi-Spec)

**Scope:** Update WebSocket protocol and internal API for multi-spec awareness.

**Deliverables:**
- `specId` field on all WebSocket events
- Updated `connected` event with specs metadata
- Spec-scoped WebSocket commands
- Aggregated and per-spec internal API endpoints
- Updated command handler for multi-spec context

**Exit Criteria:**
- [ ] WebSocket events include specId
- [ ] DevTools receives all spec metadata on connection
- [ ] Commands can target specific specs or all specs
- [ ] Internal API serves per-spec and aggregated data

### Phase 4: DevTools Multi-Spec UI

**Scope:** Update all DevTools pages for multi-spec awareness.

**Deliverables:**
- Spec filter chips in filter panel (all pages)
- Spec color system (consistent assignment)
- Routes page: spec grouping hierarchy
- Timeline page: spec indicators and interleaved entries
- Models page: spec dropdown
- Simulator page: global simulation overview, spec dropdown in add form

**Exit Criteria:**
- [ ] All pages show spec context
- [ ] Spec filter works consistently across all pages
- [ ] Filter state persists when switching pages
- [ ] Colors are consistent and deterministic
- [ ] Single-spec filtering matches v0.x experience

### Phase 5: Startup Banner, Logging & Migration

**Scope:** Updated startup output, logging, and migration support.

**Deliverables:**
- Multi-spec startup banner
- Spec-prefixed request logging
- Migration documentation
- Updated README

**Exit Criteria:**
- [ ] Banner clearly shows each spec's configuration
- [ ] Logs identify which spec handled each request
- [ ] Migration guide is clear and complete

### Phase 6: Testing, Playground & Release

**Scope:** Comprehensive testing, playground update, and version bump to 1.0.0.

**Deliverables:**
- Updated test suite for multi-spec scenarios
- Playground with multiple specs (petstore + billing)
- Version bump: all packages to 1.0.0
- npm publishing

**Exit Criteria:**
- [ ] All existing tests pass with multi-spec architecture
- [ ] New tests cover multi-spec specific scenarios
- [ ] Playground demonstrates multi-spec features
- [ ] All packages published at 1.0.0

---

## 12. Decision Summary

| Category | Decision |
|----------|----------|
| **Multi-Spec Approach** | Isolated Specs (Approach A) — each spec is an independent instance |
| **Port Strategy** | Single port, sub-routing via Hono mount |
| **Spec ID** | Explicit `id` in config or auto-derived from `info.title` (slugified) |
| **Proxy Path** | Explicit `proxyPath` or auto-derived from `servers[0].url` |
| **Store Isolation** | Full isolation per spec — no cross-spec data sharing |
| **DevTools Strategy** | Global dashboard with spec filter (Option 3A) |
| **Existing Filters** | Preserved — spec filter is additive, not replacing |
| **Versioning** | 0.x → 1.0.0 (first stable release, not a 2.0 breaking change) |
| **Config Shape** | `spec: string` → `specs: SpecConfig[]` (breaking change from 0.x) |
| **Default Directories** | `null` — `handlersDir` and `seedsDir` default to `null` when unconfigured; no file crawling occurs unless explicitly set |
| **Hot Reload** | Per-spec — changes to one spec don't affect others |
| **WebSocket** | Single hub, all events tagged with `specId` |
| **Base Architecture** | Hono Server (unchanged) |
| **Schema Identification** | `x-schema-id` extension injected into `components.schemas` before dereference to preserve schema names through inlining |
| **Seeds Map Synchronization** | Two-phase seed population: execute seeds to populate store, then sync seed map to route builder via in-place mutation (`.clear()` + `.set()`) |
| **Document Processing** | @scalar pipeline (extended with schema ID injection step before dereference) |
| **Fake Data** | Faker.js (unchanged) |
| **Communication** | Persistent bidirectional WebSocket (extended with specId) |
| **Response Priority** | Simulation > Handler > Seed > Example > Auto-generated. Security validation runs before all response paths (including simulations) |
| **Config Location** | Inline in vite.config.ts (unchanged) |
| **Structure** | Monorepo: core, devtools-client, server, playground (unchanged) |
| **JSON Editor** | NanoJSON (`@pardnchiu/nanojson`) via CDN dynamic import — not bundled |
| **Theme** | System preference (light/dark) (unchanged) |
| **Naming** | `openApiServer()` (unchanged) |

---

## Appendix A: Links & References

- [OpenProps](https://open-props.style/) — CSS design system
- [Vue DevTools Plugin API](https://devtools.vuejs.org/plugins/api) — DevTools integration
- [@scalar/openapi-parser](https://github.com/scalar/scalar/tree/main/packages/openapi-parser) — OpenAPI parsing
- [@scalar/json-magic](https://github.com/scalar/scalar/tree/main/packages/json-magic) — JSON/YAML bundling
- [@scalar/openapi-upgrader](https://github.com/scalar/scalar/tree/main/packages/openapi-upgrader) — OpenAPI version upgrade
- [Hono](https://hono.dev/docs/getting-started/nodejs) — Web framework
- [Vite Plugin API](https://vite.dev/guide/api-plugin) — Plugin development
- [Faker.js](https://fakerjs.dev/) — Fake data generation
- [Lucide Icons](https://lucide.dev/) — Icon library
- [NanoJSON](https://nanojson.pardn.io/) — Lightweight JSON tree-view editor ([npm](https://www.npmjs.com/package/@pardnchiu/nanojson), [GitHub](https://github.com/pardnchiu/NanoJSON), [jsDelivr CDN](https://cdn.jsdelivr.net/npm/@pardnchiu/nanojson@1.1.7/dist/NanoJSON.esm.js))

## Appendix B: Previous PRD

The original PRD (pre-stable, v0.x) is preserved at `history/PRODUCT-REQUIREMENTS-DOC.md` for historical reference. All features defined there are considered implemented and stable. This document (V2) builds upon that foundation.

---

*Document generated: February 2026*
*Last updated: March 2026 — PR #89 (null default dirs, x-schema-id injection), PR #90 (seeds map synchronization)*
