# TECHNICAL SPECIFICATION — V2

## vite-plugin-open-api-server v1.0.0

**Version:** 1.0.0  
**Date:** February 2026  
**Status:** Draft  
**Based on:** PRODUCT-REQUIREMENTS-DOC-V2.md

---

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [Package Design](#3-package-design)
4. [Core Package](#4-core-package)
5. [Server Package (Vite Plugin)](#5-server-package-vite-plugin)
6. [DevTools Client Package](#6-devtools-client-package)
7. [Data Models](#7-data-models)
8. [Communication Protocol](#8-communication-protocol)
9. [Implementation Phases](#9-implementation-phases)

---

## 1. Overview

### 1.1 Purpose

This document provides the technical specification for implementing `vite-plugin-open-api-server` v1.0.0 as defined in PRODUCT-REQUIREMENTS-DOC-V2.md. It details the architecture, component design, interfaces, and implementation approach for multi-spec support — the primary new capability in v1.0.0.

### 1.2 Scope of Changes

The v1.0.0 release introduces multi-spec orchestration while preserving the existing single-spec core logic. The changes are layered:

| Layer | Change Type | Description |
|-------|-------------|-------------|
| **Core package** | Minimal | Existing `createOpenApiServer()` unchanged. New shared types for `SpecInfo`. |
| **Server package** | Major | New orchestrator, multi-proxy, per-spec file watching, updated config types. |
| **DevTools client** | Major | Spec-aware stores, spec filter system, NanoJSON editor, updated all pages. |
| **Communication** | Extended | All events gain `specId` field. New commands for spec-scoped operations. |

### 1.3 Technology Stack

| Component | Technology | Version | Rationale |
|-----------|------------|---------|-----------|
| **Runtime** | Node.js | >=20.19.0 | LTS support (updated from 18) |
| **Build Tool** | Vite | >=5.0.0 | Target ecosystem |
| **HTTP Server** | Hono | ^4.x | Lightweight, fast, native WebSocket |
| **OpenAPI Bundler** | @scalar/json-magic | latest | External ref resolution |
| **OpenAPI Upgrader** | @scalar/openapi-upgrader | latest | OAS 2.0/3.0 → 3.1 |
| **OpenAPI Parser** | @scalar/openapi-parser | latest | Dereference, validation |
| **Fake Data** | @faker-js/faker | ^8.x | Mature, varied formats |
| **DevTools UI** | Vue 3 | ^3.4.0 | Vue DevTools integration |
| **JSON Editor** | @pardnchiu/nanojson | ^1.1.7 | CDN-loaded, zero-dependency tree-view editor |
| **CSS** | OpenProps | latest | Design system |
| **Icons** | Lucide | latest | Tree-shakeable |
| **State** | Pinia | ^2.x | Vue 3 standard |
| **Build (libs)** | tsup | latest | Fast, simple |

### 1.4 Key Decisions (from PRD V2)

| Category | Decision |
|----------|----------|
| Multi-Spec Approach | Isolated Specs (Approach A) — each spec is independent |
| Port Strategy | Single port, sub-routing via Hono mount |
| Spec ID | Explicit `id` in config or auto-derived from `info.title` (slugified) |
| Proxy Path | Explicit `proxyPath` or auto-derived from `servers[0].url` |
| Store Isolation | Full isolation per spec — no cross-spec sharing |
| DevTools Strategy | Global dashboard with spec filter (Option 3A) |
| Versioning | 0.x → 1.0.0 (first stable release) |
| Config Shape | `spec: string` → `specs: SpecConfig[]` (breaking) |
| JSON Editor | NanoJSON via CDN dynamic import — not bundled |
| Base Architecture | Hono Server (unchanged) |
| Response Priority | Handler > Seed > Example > Auto-generated (unchanged) |

---

## 2. System Architecture

### 2.1 High-Level Diagram (Multi-Spec)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              VITE DEV SERVER                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌────────────────────┐     ┌──────────────────────────────────────────────┐ │
│  │  vite-plugin       │────▶│         HONO MAIN APP (single port)          │ │
│  │  (multi-proxy)     │     │                                              │ │
│  │                    │     │  Shared Services:                            │ │
│  │  /api/pets/v1/* ──────────▶  /_devtools/* → DevTools SPA               │ │
│  │  /api/billing/* ──────────▶  /_ws         → WebSocket Hub (multi-spec) │ │
│  │  /_devtools/* ────────────▶  /_api/*      → Internal API (aggregated)  │ │
│  │  /_ws ────────────────────▶                                             │ │
│  │  /_api/* ─────────────────▶                                             │ │
│  └────────────────────┘     │                                              │ │
│                             │  Spec Instances (mounted as sub-apps):       │ │
│  ┌────────────────────┐     │  ┌────────────────────────────────────────┐  │ │
│  │  Vue App           │     │  │  petstore                             │  │ │
│  │  fetch /api/pets/* │────▶│  │  ├── Router (Hono sub-app)            │  │ │
│  │  fetch /api/bill/* │     │  │  ├── Store (isolated)                 │  │ │
│  └────────────────────┘     │  │  ├── SimulationManager                │  │ │
│                             │  │  ├── Handlers                         │  │ │
│                             │  │  ├── Seeds                            │  │ │
│                             │  │  └── Timeline[]                       │  │ │
│                             │  └────────────────────────────────────────┘  │ │
│                             │  ┌────────────────────────────────────────┐  │ │
│                             │  │  billing                              │  │ │
│                             │  │  ├── Router (Hono sub-app)            │  │ │
│                             │  │  ├── Store (isolated)                 │  │ │
│                             │  │  ├── SimulationManager                │  │ │
│                             │  │  ├── Handlers                         │  │ │
│                             │  │  ├── Seeds                            │  │ │
│                             │  │  └── Timeline[]                       │  │ │
│                             │  └────────────────────────────────────────┘  │ │
│                             └──────────────────────────────────────────────┘ │
│                                         │                                    │
└─────────────────────────────────────────┼────────────────────────────────────┘
                                          │
                      ┌───────────────────┼────────────────────────────────┐
                      │              VUE DEVTOOLS                           │
                      │  ┌────────────────┼─────────────────────────────┐  │
                      │  │         DevTools Client (iframe)             │  │
                      │  │                │                             │  │
                      │  │  ┌──────────┐ ┌──────────┐ ┌──────┐ ┌─────┐│  │
                      │  │  │  Routes  │ │ Timeline │ │Models│ │ Sim ││  │
                      │  │  │(by spec)│ │ (global) │ │(spec)│ │(glb)││  │
                      │  │  └──────────┘ └──────────┘ └──────┘ └─────┘│  │
                      │  │         ▲                                   │  │
                      │  │         │ WebSocket (spec-tagged events)    │  │
                      │  │         └───────────────────────────────────│  │
                      │  └─────────────────────────────────────────────┘  │
                      └──────────────────────────────────────────────────┘
```

### 2.2 Request Flow (Multi-Spec)

```
Browser                    Vite Proxy               Hono Main App        Spec Instance
   │                          │                          │                    │
   │ GET /api/pets/v1/pet/1   │                          │                    │
   ├─────────────────────────►│                          │                    │
   │                          │ GET /pet/1               │                    │
   │                          │ X-Spec-Id: petstore      │                    │
   │                          ├─────────────────────────►│                    │
   │                          │                          │                    │
   │                          │                          │ Route by x-spec-id │
   │                          │                          ├───────────────────►│
   │                          │                          │                    │
   │                          │                          │    ┌───────────────┤
   │                          │                          │    │ 1. Match route│
   │                          │                          │    │ 2. Simulation?│
   │                          │                          │    │ 3. Handler?   │
   │                          │                          │    │ 4. Seed?      │
   │                          │                          │    │ 5. Generate   │
   │                          │                          │    │ 6. WS event   │
   │                          │                          │    │   (+ specId)  │
   │                          │                          │    └───────────────┤
   │                          │                          │                    │
   │                          │  200 { id: 1, ... }      │◄───────────────────┤
   │                          │◄─────────────────────────┤                    │
   │ 200 { id: 1, ... }       │                          │                    │
   │◄─────────────────────────┤                          │                    │
```

### 2.3 Component Ownership

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR (server package)                     │
│                                                                     │
│  Owns:                                                              │
│  ├── Hono main app (single port)                                    │
│  ├── Vite proxy config (N entries)                                  │
│  ├── Spec ID derivation                                             │
│  ├── Proxy path auto-detection                                      │
│  ├── Per-spec file watchers                                         │
│  ├── Startup banner                                                 │
│  └── Lifecycle (start/stop all instances)                           │
│                                                                     │
│  Delegates to core:                                                 │
│  ├── createOpenApiServer() per spec (unchanged)                     │
│  └── All per-spec logic (store, router, generator, etc.)            │
│                                                                     │
│  Wraps for multi-spec:                                              │
│  ├── WebSocket hub (single, multi-spec aware)                       │
│  ├── Internal API (aggregated + per-spec)                           │
│  └── Command handler (spec-scoped commands)                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Package Design

### 3.1 Monorepo Structure (Changes Highlighted)

```
packages/
├── core/                      # Core server logic — MINIMAL CHANGES
│   ├── src/
│   │   ├── index.ts           # Public exports (add SpecInfo type)
│   │   ├── server.ts          # createOpenApiServer() — MINOR (add getTimeline/clearTimeline)
│   │   ├── parser/            # UNCHANGED
│   │   ├── router/            # UNCHANGED
│   │   ├── store/             # UNCHANGED
│   │   ├── generator/         # UNCHANGED
│   │   ├── handlers/          # UNCHANGED
│   │   ├── seeds/             # UNCHANGED
│   │   ├── security/          # UNCHANGED
│   │   ├── simulation/        # UNCHANGED
│   │   ├── websocket/
│   │   │   ├── hub.ts         # MINOR (add autoConnect option)
│   │   │   ├── command-handler.ts  # UNCHANGED
│   │   │   └── protocol.ts    # EXTENDED (specId on events/commands)
│   │   ├── internal-api.ts    # UNCHANGED
│   │   └── devtools-server.ts # UNCHANGED
│   └── package.json
│
├── server/                    # Vite plugin — MAJOR CHANGES
│   ├── src/
│   │   ├── index.ts           # Public exports
│   │   ├── plugin.ts          # openApiServer() — REWRITTEN for multi-spec
│   │   ├── orchestrator.ts    # NEW: multi-spec orchestrator
│   │   ├── spec-id.ts         # NEW: spec ID derivation
│   │   ├── proxy-path.ts     # NEW: proxy path auto-detection
│   │   ├── multi-proxy.ts     # NEW: multi-path proxy configuration
│   │   ├── multi-ws.ts        # NEW: multi-spec WebSocket wrapper
│   │   ├── multi-command.ts   # NEW: multi-spec command handler wrapper
│   │   ├── multi-internal-api.ts  # NEW: aggregated internal API
│   │   ├── banner.ts          # UPDATED for multi-spec output
│   │   ├── hot-reload.ts      # UPDATED for per-spec watching
│   │   ├── handlers.ts        # UNCHANGED
│   │   ├── seeds.ts           # UNCHANGED
│   │   ├── devtools.ts        # UNCHANGED
│   │   ├── utils.ts           # UNCHANGED
│   │   └── types.ts           # REWRITTEN (SpecConfig[], removed spec:string)
│   └── package.json
│
├── devtools-client/           # Vue SPA — MAJOR CHANGES
│   ├── src/
│   │   ├── App.vue            # UPDATED (spec context provider)
│   │   ├── pages/
│   │   │   ├── RoutesPage.vue    # UPDATED (spec grouping, spec filter)
│   │   │   ├── TimelinePage.vue  # UPDATED (spec indicators, spec filter)
│   │   │   ├── ModelsPage.vue    # UPDATED (spec dropdown, NanoJSON)
│   │   │   └── SimulatorPage.vue # UPDATED (spec dropdown, global overview)
│   │   ├── components/
│   │   │   ├── SpecFilter.vue    # NEW: reusable spec filter chips
│   │   │   ├── SpecBadge.vue     # NEW: colored spec indicator
│   │   │   ├── NanoJsonEditor.vue # NEW: NanoJSON wrapper component
│   │   │   ├── EndpointList.vue  # UPDATED (spec grouping level)
│   │   │   ├── EndpointDetail.vue # UPDATED (spec context)
│   │   │   ├── TimelineEntry.vue # UPDATED (spec indicator)
│   │   │   ├── TimelineDetail.vue # UPDATED (spec context)
│   │   │   └── ... (existing)
│   │   ├── composables/
│   │   │   ├── useWebSocket.ts   # UPDATED (spec-aware events)
│   │   │   ├── useSpecs.ts       # NEW: spec metadata & colors
│   │   │   └── useTheme.ts       # UNCHANGED
│   │   └── stores/
│   │       ├── specs.ts          # NEW: spec metadata store
│   │       ├── registry.ts       # UPDATED (per-spec + aggregated)
│   │       ├── timeline.ts       # UPDATED (specId on entries)
│   │       ├── models.ts         # UPDATED (spec-scoped)
│   │       └── simulation.ts     # UPDATED (spec-scoped)
│   └── package.json
│
└── playground/                # Demo app — UPDATED
    ├── openapi/
    │   ├── petstore.yaml      # Existing
    │   └── billing.yaml       # NEW: second spec for demo
    ├── mocks/
    │   ├── petstore/          # REORGANIZED from flat structure
    │   │   ├── handlers/
    │   │   └── seeds/
    │   └── billing/           # NEW
    │       ├── handlers/
    │       └── seeds/
    └── vite.config.ts         # UPDATED for multi-spec config
```

### 3.2 Package Dependencies (Updated)

```
┌─────────────────┐
│  server         │ ─────────────────────┐
│                 │                      │
│  peerDeps:      │                      │
│  - vite >=5     │                      ▼
│  - vue >=3.4    │            ┌─────────────────┐
└─────────────────┘            │     core        │
         │                     │                 │
         │ depends on          │  deps:          │
         └────────────────────►│  - hono         │
                               │  - @scalar/*    │
                               │  - @faker-js    │
┌─────────────────┐            └─────────────────┘
│ devtools-client │
│                 │            ┌─────────────────┐
│  deps:          │            │  CDN (runtime)  │
│  - vue          │            │                 │
│  - pinia        │            │  @pardnchiu/    │
│  - open-props   │ ·········>│  nanojson       │
│  - lucide-vue   │  dynamic   │  (not bundled)  │
└─────────────────┘  import    └─────────────────┘
```

---

## 4. Core Package

### 4.1 Changes Summary

The core package requires **minimal changes**. The `createOpenApiServer()` factory remains unchanged — it continues to process a single spec and return a single server instance. The orchestrator in the server package creates N core instances.

**New exports:**

```typescript
// packages/core/src/index.ts — additions only

/** Spec metadata for DevTools and WebSocket protocol */
export interface SpecInfo {
  id: string;
  title: string;
  version: string;
  proxyPath: string;
  color: string;
  endpointCount: number;
  schemaCount: number;
}
```

**Extended interface — `OpenApiServer`:**

The `OpenApiServer` interface gains a `getTimeline()` method. The timeline array is currently internal to `server.ts` — it is passed by reference to `mountInternalApi` and `createCommandHandler` but not exposed on the return object. The orchestrator needs per-spec timeline access for the aggregated `/_api/specs/:specId/timeline` route and for `get:timeline` WebSocket commands.

```typescript
// packages/core/src/server.ts — addition to OpenApiServer interface

export interface OpenApiServer {
  // ... existing members unchanged ...

  /**
   * Get the request/response timeline for this server instance
   *
   * Returns the internal timeline array. The orchestrator uses this
   * to serve per-spec timeline data via the aggregated internal API
   * and multi-spec WebSocket commands.
   *
   * @returns Timeline entries array (most recent last)
   */
  getTimeline(): TimelineEntry[];

  /**
   * Clear the timeline for this server instance
   *
   * Used by the orchestrator for spec-scoped `clear:timeline` commands.
   *
   * @returns Number of entries cleared
   */
  clearTimeline(): number;
}
```

Implementation in `createOpenApiServer()` return object:

```typescript
// Add to the returned server object:
getTimeline(): TimelineEntry[] {
  return timeline;
},

clearTimeline(): number {
  const count = timeline.length;
  timeline.length = 0;
  return count;
},
```

This is a backward-compatible addition — existing consumers are not affected.

### 4.2 WebSocket Protocol Extensions

**File:** `packages/core/src/websocket/protocol.ts`

The protocol types are **extended** (not replaced) to support `specId` on events. The existing types remain valid for single-spec use by the core. The server package wraps events to add `specId` before broadcasting.

```typescript
// NEW: Spec-aware variants of server events
// These are used by the orchestrator's multi-spec WebSocket wrapper.
// The core protocol.ts remains unchanged — the wrapper adds specId at the
// orchestrator level before broadcasting.

/**
 * Server event with spec context
 * The orchestrator wraps core ServerEvent with specId before broadcasting
 */
export type MultiSpecServerEvent =
  | { type: 'connected'; data: { serverVersion: string; specs: SpecInfo[] } }
  | { type: 'request'; data: RequestLogEntry & { specId: string } }
  | { type: 'response'; data: ResponseLogEntry & { specId: string } }
  | { type: 'store:updated'; data: { specId: string; schema: string; action: string; count?: number } }
  | { type: 'handlers:updated'; data: { specId: string; count: number } }
  | { type: 'seeds:updated'; data: { specId: string; count: number } }
  | { type: 'simulation:added'; data: { specId: string; path: string } }
  | { type: 'simulation:removed'; data: { specId: string; path: string } }
  | { type: 'simulations:cleared'; data: { specId: string; count: number } }
  | { type: 'registry'; data: { specId: string; registry: unknown } }
  | { type: 'timeline'; data: { specId: string; entries: unknown[]; count: number; total: number } }
  | { type: 'store'; data: { specId: string; schema: string; items: unknown[]; count: number } }
  | { type: 'store:set'; data: { specId: string; schema: string; success: boolean; count: number } }
  | { type: 'store:cleared'; data: { specId: string; schema: string; success: boolean } }
  | { type: 'simulation:set'; data: { specId: string; path: string; success: boolean } }
  | { type: 'simulation:cleared'; data: { specId: string; path: string; success: boolean } }
  | { type: 'reseeded'; data: { specId: string; success: boolean; schemas: string[] } }
  | { type: 'timeline:cleared'; data: { specId: string; count: number } }
  | { type: 'error'; data: { specId?: string; command: string; message: string } };

/**
 * Client commands with spec context
 */
export type MultiSpecClientCommand =
  // Global commands (no specId required)
  | { type: 'get:specs' }
  | { type: 'get:registry'; data?: { specId?: string } }
  | { type: 'get:timeline'; data?: { specId?: string; limit?: number } }
  | { type: 'clear:timeline'; data?: { specId?: string } }

  // Spec-scoped commands (specId required)
  | { type: 'get:store'; data: { specId: string; schema: string } }
  | { type: 'set:store'; data: { specId: string; schema: string; items: unknown[] } }
  | { type: 'clear:store'; data: { specId: string; schema: string } }
  | { type: 'set:simulation'; data: { specId: string } & SimulationConfig }
  | { type: 'clear:simulation'; data: { specId: string; path: string } }
  | { type: 'reseed'; data: { specId: string } };
```

### 4.3 Existing Modules — No Changes

The following core modules require **no modifications**:

| Module | Reason |
|--------|--------|
| `parser/processor.ts` | Processes one spec at a time. Called N times by orchestrator. |
| `store/store.ts` | One store per spec instance. Factory unchanged. |
| `router/route-builder.ts` | Builds routes for one spec. Called N times. |
| `router/registry-builder.ts` | Builds registry for one spec. Called N times. |
| `generator/schema-generator.ts` | Generates data per schema. Unchanged. |
| `handlers/executor.ts` | Executes handlers per request. Unchanged. |
| `handlers/context.ts` | Handler context types. Unchanged. |
| `seeds/executor.ts` | Executes seeds for one store. Called N times. |
| `seeds/define-seeds.ts` | `defineSeeds()` helper. Unchanged. |
| `security/validator.ts` | Validates per request. Unchanged. |
| `simulation/simulator.ts` | Per-spec instance. Unchanged. |
| `websocket/hub.ts` | **Minor addition**: `autoConnect?: boolean` option to `WebSocketHubOptions`. When `false`, `addClient()` skips sending the automatic `connected` event. Default `true` (backward-compatible). Used by multi-spec wrapper. |
| `websocket/command-handler.ts` | Per-spec handler. Orchestrator routes commands. |
| `internal-api.ts` | Per-spec routes. Orchestrator aggregates. |
| `devtools-server.ts` | Serves SPA. Unchanged. |
| `server.ts` | `createOpenApiServer()` factory. **Minor addition**: `getTimeline()` and `clearTimeline()` added to `OpenApiServer` interface. |

---

## 5. Server Package (Vite Plugin)

### 5.1 Plugin Configuration Types

**File:** `packages/server/src/types.ts` — **Rewritten**

```typescript
import type { Logger } from '@websublime/vite-plugin-open-api-core';

/**
 * Configuration for a single OpenAPI spec instance
 */
export interface SpecConfig {
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
   * Used for routing, DevTools grouping, logging, default directory names.
   * If omitted, auto-derived from spec's info.title (slugified).
   *
   * @example 'petstore'
   */
  id?: string;

  /**
   * Base path for request proxy
   *
   * If omitted, auto-derived from spec's servers[0].url.
   * Must be unique across all specs.
   *
   * @example '/api/v3'
   */
  proxyPath?: string;

  /**
   * Directory containing handler files for this spec
   * @default './mocks/{specId}/handlers'
   */
  handlersDir?: string;

  /**
   * Directory containing seed files for this spec
   * @default './mocks/{specId}/seeds'
   */
  seedsDir?: string;

  /**
   * ID field configuration per schema for this spec
   * @default {} (uses 'id' for all schemas)
   */
  idFields?: Record<string, string>;
}

/**
 * Plugin configuration options
 */
export interface OpenApiServerOptions {
  /**
   * Array of OpenAPI spec configurations (required)
   * Each entry runs as an isolated instance.
   */
  specs: SpecConfig[];

  /**
   * Server port — all spec instances share this port
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
   * Enable CORS
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

/**
 * Resolved spec config with all defaults applied
 * @internal
 */
export interface ResolvedSpecConfig {
  spec: string;
  id: string;             // guaranteed to be set after resolution
  proxyPath: string;      // guaranteed to be set after resolution
  handlersDir: string;
  seedsDir: string;
  idFields: Record<string, string>;
}

/**
 * Resolved options with defaults applied
 * @internal
 */
export interface ResolvedOptions {
  specs: ResolvedSpecConfig[];
  port: number;
  enabled: boolean;
  timelineLimit: number;
  devtools: boolean;
  cors: boolean;
  corsOrigin: string | string[];
  silent: boolean;
  logger?: Logger;
}

/**
 * Resolve options with defaults
 *
 * Note: spec ID and proxyPath resolution requires processing the OpenAPI document
 * first, so they are resolved later in the orchestrator.
 * This function only resolves static defaults.
 */
export function resolveOptions(options: OpenApiServerOptions): ResolvedOptions {
  if (!options.specs || !Array.isArray(options.specs) || options.specs.length === 0) {
    throw new Error('specs is required and must be a non-empty array of SpecConfig');
  }

  for (const spec of options.specs) {
    if (!spec.spec || typeof spec.spec !== 'string' || spec.spec.trim() === '') {
      throw new Error(
        'Each spec entry must have a non-empty spec field (path or URL to OpenAPI spec)',
      );
    }
  }

  return {
    specs: options.specs.map((s) => ({
      spec: s.spec,
      id: s.id ?? '',             // resolved later from info.title
      proxyPath: s.proxyPath ?? '',  // resolved later from servers[0].url
      handlersDir: s.handlersDir ?? '',  // resolved later from specId
      seedsDir: s.seedsDir ?? '',        // resolved later from specId
      idFields: s.idFields ?? {},
    })),
    port: options.port ?? 4000,
    enabled: options.enabled ?? true,
    timelineLimit: options.timelineLimit ?? 500,
    devtools: options.devtools ?? true,
    cors: options.cors ?? true,
    corsOrigin: options.corsOrigin ?? '*',
    silent: options.silent ?? false,
    logger: options.logger,
  };
}
```

### 5.2 Spec ID Derivation

**File:** `packages/server/src/spec-id.ts` — **New**

```typescript
import type { OpenAPIV3_1 } from '@scalar/openapi-types';

/**
 * Derive a spec ID from the processed OpenAPI document
 *
 * Priority:
 * 1. Explicit id from config (if non-empty)
 * 2. Slugified info.title from the processed document
 *
 * @param explicitId - ID from SpecConfig.id (may be empty)
 * @param document - Processed OpenAPI document
 * @returns Stable, URL-safe spec identifier
 * @throws Error if no ID can be derived (missing title and no explicit id)
 */
export function deriveSpecId(
  explicitId: string,
  document: OpenAPIV3_1.Document,
): string {
  if (explicitId.trim()) {
    return slugify(explicitId);
  }

  const title = document.info?.title;
  if (!title || !title.trim()) {
    throw new Error(
      'Cannot derive spec ID: info.title is missing from the OpenAPI document. ' +
      'Please set an explicit id in the spec configuration.',
    );
  }

  return slugify(title);
}

/**
 * Slugify a string for use as a spec identifier
 *
 * Rules:
 * - Lowercase
 * - Replace spaces and special chars with hyphens
 * - Remove consecutive hyphens
 * - Trim leading/trailing hyphens
 *
 * @example
 * slugify("Swagger Petstore") → "swagger-petstore"
 * slugify("Billing API v2")   → "billing-api-v2"
 * slugify("User Service")     → "user-service"
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Validate spec IDs are unique across all specs
 *
 * @throws Error if duplicate IDs found
 */
export function validateUniqueIds(ids: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new Error(
        `Duplicate spec ID "${id}". Each spec must have a unique ID. ` +
        'Set explicit ids in spec configuration to resolve.',
      );
    }
    seen.add(id);
  }
}
```

### 5.3 Proxy Path Auto-Detection

**File:** `packages/server/src/proxy-path.ts` — **New**

```typescript
import type { OpenAPIV3_1 } from '@scalar/openapi-types';

/**
 * Derive the proxy path from the OpenAPI document's servers field
 *
 * Priority:
 * 1. Explicit proxyPath from config (if non-empty)
 * 2. Path portion of servers[0].url
 *
 * @param explicitPath - proxyPath from SpecConfig (may be empty)
 * @param document - Processed OpenAPI document
 * @param specId - Spec ID for error messages
 * @returns Proxy path string (e.g., "/api/v3")
 * @throws Error if path cannot be derived or is "/" (too broad)
 */
export function deriveProxyPath(
  explicitPath: string,
  document: OpenAPIV3_1.Document,
  specId: string,
): string {
  if (explicitPath.trim()) {
    return normalizeProxyPath(explicitPath, specId);
  }

  const servers = document.servers;
  if (!servers || servers.length === 0 || !servers[0].url) {
    throw new Error(
      `[${specId}] Cannot derive proxyPath: no servers defined in the OpenAPI document. ` +
      'Set an explicit proxyPath in the spec configuration.',
    );
  }

  const serverUrl = servers[0].url;
  let path: string;

  try {
    // Full URL: extract path portion
    const url = new URL(serverUrl);
    path = url.pathname;
  } catch {
    // Relative path: use directly
    path = serverUrl;
  }

  return normalizeProxyPath(path, specId);
}

/**
 * Normalize and validate a proxy path
 *
 * - Ensure leading slash
 * - Remove trailing slash
 * - Reject "/" as too broad
 */
function normalizeProxyPath(path: string, specId: string): string {
  // Ensure leading slash
  let normalized = path.startsWith('/') ? path : `/${path}`;

  // Remove trailing slash (unless it's just "/")
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  // Reject root path
  if (normalized === '/') {
    throw new Error(
      `[${specId}] proxyPath "/" is too broad — it would capture all requests. ` +
      'Set a more specific proxyPath (e.g., "/api/v1").',
    );
  }

  return normalized;
}

/**
 * Validate proxy paths are unique and non-overlapping
 *
 * @throws Error if duplicate or overlapping paths found
 */
export function validateUniqueProxyPaths(
  specs: Array<{ id: string; proxyPath: string }>,
): void {
  const paths = new Map<string, string>(); // path → specId

  for (const spec of specs) {
    if (paths.has(spec.proxyPath)) {
      throw new Error(
        `Duplicate proxyPath "${spec.proxyPath}" used by specs "${paths.get(spec.proxyPath)}" ` +
        `and "${spec.id}". Each spec must have a unique proxyPath.`,
      );
    }
    paths.set(spec.proxyPath, spec.id);
  }

  // Check for nesting (e.g., "/api" and "/api/v1" would conflict)
  const sortedPaths = Array.from(paths.entries()).sort(([a], [b]) => a.length - b.length);
  for (let i = 0; i < sortedPaths.length; i++) {
    for (let j = i + 1; j < sortedPaths.length; j++) {
      const [shorter, shorterId] = sortedPaths[i];
      const [longer, longerId] = sortedPaths[j];
      if (longer.startsWith(`${shorter}/`)) {
        throw new Error(
          `Overlapping proxyPaths: "${shorter}" (${shorterId}) is a prefix of ` +
          `"${longer}" (${longerId}). This would cause routing ambiguity.`,
        );
      }
    }
  }
}
```

### 5.4 Orchestrator

**File:** `packages/server/src/orchestrator.ts` — **New**

This is the central new component. It creates N `OpenApiServer` instances from core and wires them together on a single Hono app.

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  createOpenApiServer,
  executeSeeds,
  type OpenApiServer,
  type SpecInfo,
} from '@websublime/vite-plugin-open-api-core';
import type { ViteDevServer } from 'vite';

import { deriveSpecId, validateUniqueIds } from './spec-id.js';
import { deriveProxyPath, validateUniqueProxyPaths } from './proxy-path.js';
import { loadHandlers } from './handlers.js';
import { loadSeeds } from './seeds.js';
import type { ResolvedOptions, ResolvedSpecConfig } from './types.js';

/**
 * Deterministic color palette for spec identification
 */
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

/**
 * Resolved spec instance with all runtime data
 */
export interface SpecInstance {
  /** Unique spec identifier */
  id: string;

  /** Spec metadata for DevTools */
  info: SpecInfo;

  /** Core server instance */
  server: OpenApiServer;

  /** Resolved configuration */
  config: ResolvedSpecConfig;
}

/**
 * Orchestrator result
 */
export interface OrchestratorResult {
  /** Main Hono app with all specs mounted */
  app: Hono;

  /** All spec instances */
  instances: SpecInstance[];

  /** Spec metadata for WebSocket connected event */
  specsInfo: SpecInfo[];

  /** Start all instances */
  start(): Promise<void>;

  /** Stop all instances */
  stop(): Promise<void>;
}

/**
 * Create the multi-spec orchestrator
 *
 * Flow:
 * 1. Process each spec document (to derive ID and proxyPath)
 * 2. Resolve all IDs and proxy paths
 * 3. Validate uniqueness
 * 4. Create N core server instances
 * 5. Mount all on a single Hono app
 * 6. Wire shared services (WebSocket, Internal API, DevTools)
 */
export async function createOrchestrator(
  options: ResolvedOptions,
  vite: ViteDevServer,
  cwd: string,
): Promise<OrchestratorResult> {
  const instances: SpecInstance[] = [];
  const logger = options.logger ?? console;

  // ========================================================================
  // Phase 1: Process specs and resolve IDs/paths
  // ========================================================================

  for (let i = 0; i < options.specs.length; i++) {
    const specConfig = options.specs[i];

    // Load handlers
    const handlersDir = specConfig.handlersDir || `./mocks/${specConfig.id || 'spec'}/handlers`;
    const handlersResult = await loadHandlers(handlersDir, vite, cwd);

    // Load seeds
    const seedsDir = specConfig.seedsDir || `./mocks/${specConfig.id || 'spec'}/seeds`;
    const seedsResult = await loadSeeds(seedsDir, vite, cwd);

    // Create core server instance (processes the document internally)
    const server = await createOpenApiServer({
      spec: specConfig.spec,
      port: options.port,
      idFields: specConfig.idFields,
      handlers: handlersResult.handlers,
      // NOTE: Pass empty Map here, NOT the seed functions from loadSeeds().
      // createOpenApiServer.seeds expects Map<string, unknown[]> (static data),
      // while loadSeeds() returns Map<string, AnySeedFn> (functions).
      // Seeds are executed separately via executeSeeds() after server creation.
      // This matches the existing pattern in the v0.x plugin.ts.
      seeds: new Map(),
      timelineLimit: options.timelineLimit,
      cors: false,        // CORS handled at main app level
      devtools: false,    // DevTools mounted at main app level
      logger,
    });

    // Execute seeds
    if (seedsResult.seeds.size > 0) {
      await executeSeeds(seedsResult.seeds, server.store, server.document);
    }

    // Derive ID (now that document is processed)
    const id = deriveSpecId(specConfig.id, server.document);

    // Update config with resolved values
    specConfig.id = id;
    specConfig.handlersDir = handlersDir.replace(
      `${specConfig.id || 'spec'}`,
      id,
    );
    specConfig.seedsDir = seedsDir.replace(
      `${specConfig.id || 'spec'}`,
      id,
    );

    // Derive proxy path
    const proxyPath = deriveProxyPath(specConfig.proxyPath, server.document, id);
    specConfig.proxyPath = proxyPath;

    // Build SpecInfo
    const info: SpecInfo = {
      id,
      title: server.document.info?.title ?? id,
      version: server.document.info?.version ?? 'unknown',
      proxyPath,
      color: SPEC_COLORS[i % SPEC_COLORS.length],
      endpointCount: server.registry.endpoints.size,
      schemaCount: server.store.getSchemas().length,
    };

    instances.push({ id, info, server, config: specConfig });
  }

  // ========================================================================
  // Phase 2: Validate uniqueness
  // ========================================================================

  validateUniqueIds(instances.map((i) => i.id));
  validateUniqueProxyPaths(instances.map((i) => ({
    id: i.id,
    proxyPath: i.config.proxyPath,
  })));

  // ========================================================================
  // Phase 3: Build main Hono app
  // ========================================================================

  const mainApp = new Hono();

  // CORS at top level
  if (options.cors) {
    mainApp.use(
      '*',
      cors({
        origin: options.corsOrigin,
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Spec-Id'],
        exposeHeaders: ['Content-Length', 'X-Request-Id'],
        maxAge: 86400,
        credentials: options.corsOrigin !== '*',
      }),
    );
  }

  // DevTools SPA at top level (single SPA for all specs)
  if (options.devtools) {
    // Mount DevTools routes (reuse core's mountDevToolsRoutes)
    // The SPA is spec-aware via WebSocket
  }

  // Internal API — aggregated across specs
  // See section 5.6 for multi-spec internal API

  // WebSocket — single hub, multi-spec aware
  // See section 5.5 for multi-spec WebSocket

  // Per-spec API routes — routed by X-Spec-Id header
  // The Vite proxy adds X-Spec-Id header, the main app routes accordingly.
  //
  // Strategy: A single top-level middleware reads the X-Spec-Id header and
  // dispatches to the correct spec's Hono sub-app via app.fetch().
  // This avoids the Hono middleware fall-through ambiguity where mounting
  // N sub-apps with conditional middleware can leave requests hanging
  // (not calling next() in Hono middleware without returning a response
  // results in undefined behavior).
  const instanceMap = new Map(instances.map((i) => [i.id, i]));

  mainApp.use('*', async (c, next) => {
    const specId = c.req.header('x-spec-id');
    if (!specId) {
      // No spec header — this is a shared service request
      // (/_devtools, /_api, /_ws) handled by earlier routes
      await next();
      return;
    }

    const instance = instanceMap.get(specId);
    if (!instance) {
      return c.json({ error: `Unknown spec: ${specId}` }, 404);
    }

    // Dispatch to the spec's Hono app directly
    return instance.server.app.fetch(c.req.raw);
  });

  // ========================================================================
  // Lifecycle
  // ========================================================================

  const specsInfo = instances.map((i) => i.info);

  return {
    app: mainApp,
    instances,
    specsInfo,

    async start(): Promise<void> {
      // Start the main app on the shared port
      // Only one HTTP server, not N
      let serve: typeof import('@hono/node-server').serve;
      try {
        const nodeServer = await import('@hono/node-server');
        serve = nodeServer.serve;
      } catch {
        throw new Error(
          '@hono/node-server is required. Install with: npm install @hono/node-server',
        );
      }

      const serverInstance = serve({
        fetch: mainApp.fetch,
        port: options.port,
      });

      // Inject WebSocket into the HTTP server
      // (setup happens in multi-ws.ts)
    },

    async stop(): Promise<void> {
      // Stop the single HTTP server
      // Clean up all file watchers
    },
  };
}
```

### 5.5 Multi-Spec WebSocket Wrapper

**File:** `packages/server/src/multi-ws.ts` — **New**

```typescript
import {
  createWebSocketHub,
  type WebSocketHub,
  type WebSocketClient,
  type SpecInfo,
} from '@websublime/vite-plugin-open-api-core';
import type { SpecInstance } from './orchestrator.js';
import { createMultiSpecCommandHandler } from './multi-command.js';
import packageJson from '../package.json' with { type: 'json' };

/**
 * Package version from package.json
 */
const PACKAGE_VERSION = packageJson.version;

/**
 * Create a multi-spec aware WebSocket hub
 *
 * Strategy:
 * - Single WebSocket hub for all connections
 * - Each core server's wsHub.broadcast() is intercepted to add specId
 * - Client commands are routed to the correct spec instance
 * - The 'connected' event includes all specs metadata
 *
 * IMPORTANT: The hub is created with `autoConnect: false` to suppress
 * the default 'connected' event sent by addClient(). This is a MINOR
 * addition to WebSocketHubOptions in the core package — add:
 *
 *   autoConnect?: boolean; // @default true — send connected event on addClient
 *
 * Without this, addClient() sends { type: 'connected', data: { serverVersion } }
 * automatically, and then the override below sends a second enhanced event
 * with specs metadata — resulting in duplicate 'connected' events.
 */
export function createMultiSpecWebSocketHub(
  instances: SpecInstance[],
  specsInfo: SpecInfo[],
): WebSocketHub {
  // autoConnect: false prevents the hub from sending its own 'connected'
  // event in addClient(). We send an enhanced version instead.
  const hub = createWebSocketHub({ autoConnect: false });
  const instanceMap = new Map(instances.map((i) => [i.id, i]));

  // Override addClient to send enhanced connected event with specs metadata
  const originalAddClient = hub.addClient.bind(hub);
  hub.addClient = (ws: WebSocketClient) => {
    // Register the client (no auto-sent connected event due to autoConnect: false)
    originalAddClient(ws);

    // Send multi-spec enhanced connected event
    hub.sendTo(ws, {
      type: 'connected',
      data: {
        serverVersion: PACKAGE_VERSION,
        specs: specsInfo,
      },
    });
  };

  // Wire each core server's broadcasts to add specId
  for (const instance of instances) {
    const originalBroadcast = instance.server.wsHub.broadcast.bind(instance.server.wsHub);
    instance.server.wsHub.broadcast = (event) => {
      // Add specId to the event data
      const enrichedEvent = {
        type: event.type,
        data: { ...event.data, specId: instance.id },
      };
      hub.broadcast(enrichedEvent);
    };
  }

  // Set up command handler (extracted to multi-command.ts for separation of concerns)
  const commandHandler = createMultiSpecCommandHandler({
    hub,
    instances,
    specsInfo,
    serverVersion: PACKAGE_VERSION,
  });

  hub.setCommandHandler(commandHandler);

  return hub;
}
```

### 5.5.1 Multi-Spec Command Handler

**File:** `packages/server/src/multi-command.ts` — **New**

The command handler is extracted from `multi-ws.ts` into its own module. This separates the WebSocket hub wiring (broadcast interception, client management) from command routing logic.

```typescript
import type {
  WebSocketHub,
  WebSocketClient,
  SpecInfo,
} from '@websublime/vite-plugin-open-api-core';
import type { SpecInstance } from './orchestrator.js';

export interface MultiCommandHandlerDeps {
  hub: WebSocketHub;
  instances: SpecInstance[];
  specsInfo: SpecInfo[];
  serverVersion: string;
}

/**
 * Create a command handler that routes commands to the correct spec instance
 *
 * Command routing:
 * - Global commands (get:specs, get:registry without specId, get:timeline without specId)
 *   aggregate data across all spec instances
 * - Spec-scoped commands (get:store, set:store, set:simulation, reseed, etc.)
 *   are delegated to the target spec's existing command handler
 */
export function createMultiSpecCommandHandler(
  deps: MultiCommandHandlerDeps,
): (client: WebSocketClient, command: unknown) => void {
  const { hub, instances, specsInfo, serverVersion } = deps;
  const instanceMap = new Map(instances.map((i) => [i.id, i]));

  return (client: WebSocketClient, command: unknown) => {
    const cmd = command as { type: string; data?: { specId?: string; [key: string]: unknown } };

    switch (cmd.type) {
      case 'get:specs':
        hub.sendTo(client, {
          type: 'connected',
          data: { serverVersion, specs: specsInfo },
        });
        break;

      case 'get:registry': {
        const specId = cmd.data?.specId;
        if (specId) {
          // Single spec registry — delegate to instance's command handler
          const instance = instanceMap.get(specId);
          if (instance) {
            // The broadcast wrapper in multi-ws.ts automatically adds specId
            instance.server.wsHub.handleMessage(client, JSON.stringify({
              type: 'get:registry',
            }));
          } else {
            sendError(hub, client, cmd.type, `Unknown spec: ${specId}`);
          }
        } else {
          // All specs registries — send each spec's registry
          for (const instance of instances) {
            instance.server.wsHub.handleMessage(client, JSON.stringify({
              type: 'get:registry',
            }));
          }
        }
        break;
      }

      // Spec-scoped commands: route to the correct instance
      case 'get:store':
      case 'set:store':
      case 'clear:store':
      case 'set:simulation':
      case 'clear:simulation':
      case 'reseed': {
        const specId = cmd.data?.specId;
        if (!specId) {
          sendError(hub, client, cmd.type, 'specId is required for this command');
          return;
        }
        const instance = instanceMap.get(specId);
        if (!instance) {
          sendError(hub, client, cmd.type, `Unknown spec: ${specId}`);
          return;
        }
        // Forward to the instance's command handler, stripping specId
        // (core command handler doesn't know about specId)
        const { specId: _, ...coreData } = cmd.data;
        instance.server.wsHub.handleMessage(client, JSON.stringify({
          type: cmd.type,
          data: coreData,
        }));
        break;
      }

      // Global/spec-scoped timeline commands
      case 'get:timeline': {
        const specId = cmd.data?.specId;
        const limit = (cmd.data?.limit as number) ?? 100;
        if (specId) {
          const instance = instanceMap.get(specId);
          if (instance) {
            const entries = instance.server.getTimeline().slice(-limit);
            hub.sendTo(client, {
              type: 'timeline',
              data: {
                specId,
                entries,
                count: entries.length,
                total: instance.server.getTimeline().length,
              },
            });
          } else {
            sendError(hub, client, cmd.type, `Unknown spec: ${specId}`);
          }
        } else {
          // Send each spec's timeline separately (tagged with specId)
          for (const instance of instances) {
            const entries = instance.server.getTimeline().slice(-limit);
            hub.sendTo(client, {
              type: 'timeline',
              data: {
                specId: instance.id,
                entries,
                count: entries.length,
                total: instance.server.getTimeline().length,
              },
            });
          }
        }
        break;
      }

      case 'clear:timeline': {
        const specId = cmd.data?.specId;
        if (specId) {
          const instance = instanceMap.get(specId);
          if (instance) {
            const count = instance.server.clearTimeline();
            hub.sendTo(client, {
              type: 'timeline:cleared',
              data: { specId, count },
            });
          } else {
            sendError(hub, client, cmd.type, `Unknown spec: ${specId}`);
          }
        } else {
          // Clear all specs' timelines
          for (const instance of instances) {
            const count = instance.server.clearTimeline();
            hub.sendTo(client, {
              type: 'timeline:cleared',
              data: { specId: instance.id, count },
            });
          }
        }
        break;
      }
    }
  };
}

/**
 * Send an error response to the client
 */
function sendError(
  hub: WebSocketHub,
  client: WebSocketClient,
  command: string,
  message: string,
): void {
  hub.sendTo(client, {
    type: 'error',
    data: { command, message },
  });
}
```

### 5.6 Multi-Spec Internal API

**File:** `packages/server/src/multi-internal-api.ts` — **New**

```typescript
import type { Hono } from 'hono';
import type { SpecInstance } from './orchestrator.js';
import packageJson from '../package.json' with { type: 'json' };

/**
 * Package version from package.json
 */
const PACKAGE_VERSION = packageJson.version;

/**
 * Mount aggregated internal API routes
 *
 * Adds spec-aware routes alongside the existing per-spec routes:
 *
 * Aggregated:
 *   GET /_api/specs                    - List all specs with metadata
 *   GET /_api/registry                 - Aggregated registry across all specs
 *   GET /_api/health                   - Aggregated health check
 *
 * Per-spec:
 *   GET /_api/specs/:specId/registry   - Registry for one spec
 *   GET /_api/specs/:specId/store      - List schemas for one spec
 *   GET /_api/specs/:specId/store/:schema  - Store data for one spec
 *   POST /_api/specs/:specId/store/:schema - Bulk replace for one spec
 *   DELETE /_api/specs/:specId/store/:schema - Clear for one spec
 *   GET /_api/specs/:specId/timeline   - Timeline for one spec
 *   GET /_api/specs/:specId/simulations - Simulations for one spec
 *   POST /_api/specs/:specId/simulations - Add simulation for one spec
 *   GET /_api/specs/:specId/document   - OpenAPI document for one spec
 */
export function mountMultiSpecInternalApi(
  app: Hono,
  instances: SpecInstance[],
): void {
  const instanceMap = new Map(instances.map((i) => [i.id, i]));

  // ========================================================================
  // Aggregated Routes
  // ========================================================================

  /**
   * GET /_api/specs
   * List all spec instances with metadata
   */
  app.get('/_api/specs', (c) => {
    const specs = instances.map((i) => ({
      id: i.id,
      title: i.info.title,
      version: i.info.version,
      proxyPath: i.config.proxyPath,
      color: i.info.color,
      endpoints: i.server.registry.endpoints.size,
      schemas: i.server.store.getSchemas().length,
      simulations: i.server.simulationManager.count(),
    }));
    return c.json({ specs, count: specs.length });
  });

  /**
   * GET /_api/registry
   * Aggregated registry across all specs
   */
  app.get('/_api/registry', (c) => {
    const registries = instances.map((i) => ({
      specId: i.id,
      specTitle: i.info.title,
      specColor: i.info.color,
      endpoints: Array.from(i.server.registry.endpoints.entries()).map(
        ([key, entry]) => ({ key, ...entry }),
      ),
      stats: i.server.registry.stats,
    }));

    const totalEndpoints = registries.reduce(
      (sum, r) => sum + r.endpoints.length, 0,
    );

    return c.json({
      specs: registries,
      totalEndpoints,
      totalSpecs: registries.length,
    });
  });

  /**
   * GET /_api/health
   * Aggregated health check
   */
  app.get('/_api/health', (c) => {
    const specs = instances.map((i) => ({
      id: i.id,
      endpoints: i.server.registry.endpoints.size,
      schemas: i.server.store.getSchemas().length,
      simulations: i.server.simulationManager.count(),
    }));

    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: PACKAGE_VERSION,
      totalSpecs: instances.length,
      totalEndpoints: specs.reduce((s, i) => s + i.endpoints, 0),
      specs,
    });
  });

  // ========================================================================
  // Per-Spec Routes
  // ========================================================================

  /**
   * Middleware: resolve spec instance from :specId param
   */
  app.use('/_api/specs/:specId/*', async (c, next) => {
    const specId = c.req.param('specId');
    const instance = instanceMap.get(specId);
    if (!instance) {
      return c.json({ error: `Unknown spec: ${specId}` }, 404);
    }
    c.set('specInstance', instance);
    await next();
  });

  app.get('/_api/specs/:specId/registry', (c) => {
    const instance = c.get('specInstance') as SpecInstance;
    const registryData = {
      specId: instance.id,
      endpoints: Array.from(instance.server.registry.endpoints.entries()).map(
        ([key, entry]) => ({ key, ...entry }),
      ),
      stats: instance.server.registry.stats,
    };
    return c.json(registryData);
  });

  app.get('/_api/specs/:specId/store', (c) => {
    const instance = c.get('specInstance') as SpecInstance;
    const schemas = instance.server.store.getSchemas().map((schema) => ({
      name: schema,
      count: instance.server.store.getCount(schema),
      idField: instance.server.store.getIdField(schema),
    }));
    return c.json({ schemas });
  });

  app.get('/_api/specs/:specId/store/:schema', (c) => {
    const instance = c.get('specInstance') as SpecInstance;
    const schema = c.req.param('schema');
    const items = instance.server.store.list(schema);
    return c.json({ schema, count: items.length, items });
  });

  app.get('/_api/specs/:specId/document', (c) => {
    const instance = c.get('specInstance') as SpecInstance;
    return c.json(instance.server.document);
  });

  app.get('/_api/specs/:specId/simulations', (c) => {
    const instance = c.get('specInstance') as SpecInstance;
    return c.json({
      simulations: instance.server.simulationManager.list(),
      count: instance.server.simulationManager.count(),
    });
  });
}
```

### 5.7 Multi-Proxy Configuration

**File:** `packages/server/src/multi-proxy.ts` — **New**

```typescript
import type { ViteDevServer } from 'vite';
import type { SpecInstance } from './orchestrator.js';

/**
 * Configure Vite proxy for multiple spec instances
 *
 * Each spec gets its own proxy entry that:
 * 1. Matches requests by proxy path prefix
 * 2. Rewrites the path to strip the prefix
 * 3. Adds X-Spec-Id header for routing
 * 4. Forwards to the shared server port
 */
export function configureMultiProxy(
  vite: ViteDevServer,
  instances: SpecInstance[],
  port: number,
): void {
  const serverConfig = vite.config.server ?? {};
  const proxyConfig = serverConfig.proxy ?? {};

  // Per-spec proxy entries
  for (const instance of instances) {
    const escapedPath = instance.config.proxyPath.replace(
      /[.*+?^${}()|[\]\\]/g, '\\$&',
    );
    const pathPrefixRegex = new RegExp(`^${escapedPath}`);

    proxyConfig[instance.config.proxyPath] = {
      target: `http://localhost:${port}`,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(pathPrefixRegex, ''),
      headers: { 'x-spec-id': instance.id },
    };
  }

  // Shared service proxies (same as v0.x)
  proxyConfig['/_devtools'] = {
    target: `http://localhost:${port}`,
    changeOrigin: true,
  };
  proxyConfig['/_api'] = {
    target: `http://localhost:${port}`,
    changeOrigin: true,
  };
  proxyConfig['/_ws'] = {
    target: `http://localhost:${port}`,
    changeOrigin: true,
    ws: true,
  };

  if (vite.config.server) {
    vite.config.server.proxy = proxyConfig;
  }
}
```

### 5.8 Per-Spec Hot Reload

**File:** `packages/server/src/hot-reload.ts` — **Updated**

The existing `createFileWatcher` function is extended to support per-spec watching:

```typescript
/**
 * Create file watchers for all spec instances
 *
 * Each spec gets independent watchers for its handlers and seeds directories.
 * Changes to one spec's files only trigger reload for that spec instance.
 */
export async function createPerSpecFileWatchers(
  instances: SpecInstance[],
  vite: ViteDevServer,
  cwd: string,
  options: ResolvedOptions,
): Promise<FileWatcher[]> {
  const watchers: FileWatcher[] = [];

  for (const instance of instances) {
    const debouncedHandlerReload = debounce(
      () => reloadSpecHandlers(instance, vite, cwd, options),
      100,
    );
    const debouncedSeedReload = debounce(
      () => reloadSpecSeeds(instance, vite, cwd, options),
      100,
    );

    const watcher = await createFileWatcher({
      handlersDir: instance.config.handlersDir,
      seedsDir: instance.config.seedsDir,
      cwd,
      onHandlerChange: debouncedHandlerReload,
      onSeedChange: debouncedSeedReload,
    });

    watchers.push(watcher);
  }

  return watchers;
}

/**
 * Reload handlers for a specific spec instance
 */
async function reloadSpecHandlers(
  instance: SpecInstance,
  vite: ViteDevServer,
  cwd: string,
  options: ResolvedOptions,
): Promise<void> {
  const handlersResult = await loadHandlers(instance.config.handlersDir, vite, cwd);
  instance.server.updateHandlers(handlersResult.handlers);

  // The broadcast wrapper automatically adds specId
  // (wired in multi-ws.ts)

  const logger = options.logger ?? console;
  logger.info(
    `[OpenAPI:${instance.id}] Handlers reloaded: ${handlersResult.handlers.size} handlers`,
  );
}

/**
 * Reload seeds for a specific spec instance
 */
async function reloadSpecSeeds(
  instance: SpecInstance,
  vite: ViteDevServer,
  cwd: string,
  options: ResolvedOptions,
): Promise<void> {
  const seedsResult = await loadSeeds(instance.config.seedsDir, vite, cwd);

  if (seedsResult.seeds.size > 0) {
    instance.server.store.clearAll();
    await executeSeeds(seedsResult.seeds, instance.server.store, instance.server.document);
  } else {
    instance.server.store.clearAll();
  }

  // The broadcast wrapper automatically adds specId

  const logger = options.logger ?? console;
  logger.info(
    `[OpenAPI:${instance.id}] Seeds reloaded: ${seedsResult.seeds.size} schemas`,
  );
}
```

### 5.9 Plugin Entry Point

**File:** `packages/server/src/plugin.ts` — **Rewritten**

```typescript
import type { Plugin, ViteDevServer } from 'vite';
import { createOrchestrator, type OrchestratorResult } from './orchestrator.js';
import { createPerSpecFileWatchers, type FileWatcher } from './hot-reload.js';
import { configureMultiProxy } from './multi-proxy.js';
import { printMultiSpecBanner, printError } from './banner.js';
import { type OpenApiServerOptions, resolveOptions } from './types.js';

const VIRTUAL_DEVTOOLS_TAB_ID = 'virtual:open-api-devtools-tab';
const RESOLVED_VIRTUAL_DEVTOOLS_TAB_ID = `\0${VIRTUAL_DEVTOOLS_TAB_ID}`;

export function openApiServer(options: OpenApiServerOptions): Plugin {
  const resolvedOptions = resolveOptions(options);

  let orchestrator: OrchestratorResult | null = null;
  let vite: ViteDevServer | null = null;
  let fileWatchers: FileWatcher[] = [];
  let cwd: string = process.cwd();

  return {
    name: 'vite-plugin-open-api-server',
    apply: 'serve',

    config() {
      // Same as v0.x: ensure @vue/devtools-api is pre-bundled
      if (!resolvedOptions.devtools || !resolvedOptions.enabled) return;
      // ... (same implementation as v0.x)
    },

    resolveId(id: string) {
      if (id === VIRTUAL_DEVTOOLS_TAB_ID) return RESOLVED_VIRTUAL_DEVTOOLS_TAB_ID;
    },

    load(id: string) {
      if (id === RESOLVED_VIRTUAL_DEVTOOLS_TAB_ID) {
        // Same virtual module as v0.x — no changes needed
        // The DevTools tab iframe URL doesn't change
        return `/* same as v0.x */`;
      }
    },

    async configureServer(viteServer: ViteDevServer): Promise<void> {
      vite = viteServer;
      cwd = viteServer.config.root;

      if (!resolvedOptions.enabled) return;

      try {
        // Create multi-spec orchestrator
        orchestrator = await createOrchestrator(resolvedOptions, viteServer, cwd);

        // Start the server
        await orchestrator.start();

        // Configure Vite proxies for all specs
        configureMultiProxy(viteServer, orchestrator.instances, resolvedOptions.port);

        // Set up per-spec file watchers
        fileWatchers = await createPerSpecFileWatchers(
          orchestrator.instances,
          viteServer,
          cwd,
          resolvedOptions,
        );

        // Print multi-spec startup banner
        if (!resolvedOptions.silent) {
          printMultiSpecBanner(orchestrator.instances, resolvedOptions);
        }
      } catch (error) {
        printError('Failed to start OpenAPI mock server', error, resolvedOptions);
        throw error;
      }
    },

    transformIndexHtml() {
      // Same as v0.x — inject DevTools tab script
      if (!resolvedOptions.devtools || !resolvedOptions.enabled) return;
      return [{
        tag: 'script',
        attrs: { type: 'module', src: `/@id/${VIRTUAL_DEVTOOLS_TAB_ID}` },
        injectTo: 'head' as const,
      }];
    },

    /**
     * Clean up when Vite server closes
     *
     * NOTE: closeBundle() is called by Vite when the dev server shuts down
     * (e.g., Ctrl+C). This is the same lifecycle hook used in v0.x.
     * While configureServer's viteServer.httpServer?.on('close', ...) is
     * an alternative, closeBundle() is more reliable across Vite versions
     * and is the established pattern in this codebase.
     */
    async closeBundle(): Promise<void> {
      for (const watcher of fileWatchers) await watcher.close();
      fileWatchers = [];
      await orchestrator?.stop();
      orchestrator = null;
      vite = null;
    },
  };
}
```

---

## 6. DevTools Client Package

### 6.1 New: Specs Store

**File:** `packages/devtools-client/src/stores/specs.ts` — **New**

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { SpecInfo } from '@websublime/vite-plugin-open-api-core';

export const useSpecsStore = defineStore('specs', () => {
  // State
  const specs = ref<SpecInfo[]>([]);
  const activeSpecFilter = ref<string | null>(null); // null = all specs

  // Computed
  const specMap = computed(() =>
    new Map(specs.value.map((s) => [s.id, s])),
  );

  const specIds = computed(() => specs.value.map((s) => s.id));

  const activeSpec = computed(() =>
    activeSpecFilter.value ? specMap.value.get(activeSpecFilter.value) : null,
  );

  const isFiltered = computed(() => activeSpecFilter.value !== null);

  // Actions
  function setSpecs(newSpecs: SpecInfo[]) {
    specs.value = newSpecs;
  }

  function setFilter(specId: string | null) {
    activeSpecFilter.value = specId;
  }

  function toggleFilter(specId: string) {
    activeSpecFilter.value =
      activeSpecFilter.value === specId ? null : specId;
  }

  function getColor(specId: string): string {
    return specMap.value.get(specId)?.color ?? '#94a3b8';
  }

  return {
    specs,
    activeSpecFilter,
    specMap,
    specIds,
    activeSpec,
    isFiltered,
    setSpecs,
    setFilter,
    toggleFilter,
    getColor,
  };
});
```

### 6.2 Updated: Registry Store

**File:** `packages/devtools-client/src/stores/registry.ts` — **Updated**

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useSpecsStore } from './specs';

interface EndpointEntry {
  key: string;
  operationId: string;
  method: string;
  path: string;
  summary?: string;
  description?: string;
  tags: string[];
  responseSchema?: string;
  hasHandler: boolean;
  hasSeed: boolean;
  security: unknown[];
  specId: string;       // NEW: which spec this endpoint belongs to
}

export const useRegistryStore = defineStore('registry', () => {
  const specsStore = useSpecsStore();

  // State — per-spec registries
  const registries = ref<Map<string, {
    endpoints: EndpointEntry[];
    stats: unknown;
  }>>(new Map());

  // Computed — all endpoints (optionally filtered by active spec)
  const filteredEndpoints = computed(() => {
    const filter = specsStore.activeSpecFilter;

    if (filter) {
      return registries.value.get(filter)?.endpoints ?? [];
    }

    // All endpoints across all specs
    const all: EndpointEntry[] = [];
    for (const [, reg] of registries.value) {
      all.push(...reg.endpoints);
    }
    return all;
  });

  // Computed — grouped by spec, then by tag
  const groupedBySpec = computed(() => {
    const result: Map<string, Map<string, EndpointEntry[]>> = new Map();

    for (const [specId, reg] of registries.value) {
      const byTag = new Map<string, EndpointEntry[]>();
      for (const ep of reg.endpoints) {
        const tag = ep.tags[0] ?? ep.responseSchema ?? 'default';
        if (!byTag.has(tag)) byTag.set(tag, []);
        byTag.get(tag)!.push(ep);
      }
      result.set(specId, byTag);
    }

    return result;
  });

  // Actions
  function setRegistryData(specId: string, data: { endpoints: unknown[]; stats: unknown }) {
    const endpoints = (data.endpoints as EndpointEntry[]).map((ep) => ({
      ...ep,
      specId,
    }));
    registries.value.set(specId, { endpoints, stats: data.stats });
  }

  return {
    registries,
    filteredEndpoints,
    groupedBySpec,
    setRegistryData,
  };
});
```

### 6.3 Updated: Timeline Store

**File:** `packages/devtools-client/src/stores/timeline.ts` — **Updated**

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useSpecsStore } from './specs';

interface TimelineEntry {
  id: string;
  timestamp: string;
  type: 'request' | 'response';
  data: unknown;
  specId: string;   // NEW
}

export const useTimelineStore = defineStore('timeline', () => {
  const specsStore = useSpecsStore();

  // State — all entries across all specs
  const entries = ref<TimelineEntry[]>([]);

  // Computed — filtered by active spec
  const filteredEntries = computed(() => {
    const filter = specsStore.activeSpecFilter;
    if (!filter) return entries.value;
    return entries.value.filter((e) => e.specId === filter);
  });

  // Actions
  function addEntry(entry: TimelineEntry) {
    entries.value.push(entry);
  }

  function clear(specId?: string) {
    if (specId) {
      entries.value = entries.value.filter((e) => e.specId !== specId);
    } else {
      entries.value = [];
    }
  }

  return { entries, filteredEntries, addEntry, clear };
});
```

### 6.4 New: NanoJSON Editor Component

**File:** `packages/devtools-client/src/components/NanoJsonEditor.vue`

```typescript
// Component wrapping NanoJSON with Vue lifecycle management
//
// Props:
//   data: unknown           - JSON data to display
//   readonly: boolean       - Disable editing
//
// Events:
//   update:data(newData)    - Emitted when user edits data
//
// Implementation:
//   - Dynamic import from CDN on mount
//   - Creates JSONEditor instance targeting a container div
//   - Syncs props → editor via editor.import()
//   - Syncs editor → emit via lifecycle hooks
//   - Destroys editor on unmount
//   - CSS overrides for dark/light theme consistency
//
// INVESTIGATION REQUIRED (Phase 4 start):
//   Before implementing this component, verify how NanoJSON applies its CSS:
//   - If it uses Shadow DOM → external CSS overrides won't work; need ::part()
//     pseudo-element or CSS custom properties for theming
//   - If it injects global styles → may conflict with OpenProps variables;
//     use scoped CSS or specificity overrides
//   This determines the theming approach for dark/light mode consistency.

// Key implementation detail — dynamic import:
async function loadNanoJSON() {
  const module = await import(
    /* @vite-ignore */
    'https://cdn.jsdelivr.net/npm/@pardnchiu/nanojson@1.1.7/dist/NanoJSON.esm.js'
  );
  return module.JSONEditor;
}
```

### 6.5 New: Spec Filter Component

**File:** `packages/devtools-client/src/components/SpecFilter.vue`

```
Reusable spec filter chips for all pages.

Props: none (reads from specsStore)

Template structure:
┌─────────────────────────────────────────┐
│ SPECS                                    │
│ [● petstore] [● billing] [● inventory]  │
└─────────────────────────────────────────┘

Each chip:
- Shows spec color dot + spec id
- Toggle on/off via specsStore.toggleFilter()
- Active state: filled background
- Inactive state: outline only
- Single-select: clicking one deactivates the other
  (null = all specs shown)
```

### 6.6 Updated: WebSocket Composable

**File:** `packages/devtools-client/src/composables/useWebSocket.ts` — **Updated**

Key changes:
- `connected` event handler extracts `specs` array and populates `specsStore`
- All event handlers extract `specId` from event data
- Command methods accept optional `specId` parameter

```typescript
// On 'connected' event:
function handleConnected(data: { serverVersion: string; specs: SpecInfo[] }) {
  serverVersion.value = data.serverVersion;
  specsStore.setSpecs(data.specs);

  // Request initial data for all specs
  for (const spec of data.specs) {
    send({ type: 'get:registry', data: { specId: spec.id } });
    send({ type: 'get:timeline', data: { specId: spec.id } });
  }
}

// On 'request'/'response' events:
function handleTimelineEvent(data: unknown & { specId: string }) {
  timelineStore.addEntry({
    ...data,
    specId: data.specId,
  });
}

// Command wrappers with specId:
function getStore(specId: string, schema: string) {
  send({ type: 'get:store', data: { specId, schema } });
}

function setSimulation(specId: string, config: SimulationConfig) {
  send({ type: 'set:simulation', data: { specId, ...config } });
}

function reseed(specId: string) {
  send({ type: 'reseed', data: { specId } });
}
```

### 6.7 Page Updates Summary

| Page | Changes |
|------|---------|
| **RoutesPage.vue** | Add `<SpecFilter>` to filter panel. Endpoint list grouped by spec (Level 0) then tags (Level 1). When single spec filtered, Level 0 collapses. Counter shows `X endpoints \| Y specs`. |
| **TimelinePage.vue** | Add `<SpecFilter>` to filter panel. Each `<TimelineEntry>` shows `<SpecBadge>`. Entries filtered by `timelineStore.filteredEntries`. Clear button respects spec filter. |
| **ModelsPage.vue** | Add spec dropdown before schema dropdown. Schema dropdown filtered to selected spec. Replace `<JsonEditor>` with `<NanoJsonEditor>`. Reseed/Clear scoped to spec. |
| **SimulatorPage.vue** | Active simulations list shows `<SpecBadge>` per entry. Add spec dropdown in "Add Simulation" form. Endpoint dropdown filtered to selected spec. Clear All clears all specs. |

---

## 7. Data Models

### 7.1 Spec Instance (Runtime)

```typescript
interface SpecInstance {
  id: string;
  info: SpecInfo;
  server: OpenApiServer;
  config: ResolvedSpecConfig;
}
```

### 7.2 SpecInfo (Shared)

```typescript
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

### 7.3 Endpoint Entry (Extended)

```typescript
// Core EndpointEntry — unchanged
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

// DevTools client — adds specId for UI grouping
interface DevToolsEndpointEntry extends EndpointEntry {
  key: string;     // "METHOD:path"
  specId: string;  // which spec this belongs to
}
```

### 7.4 Timeline Entry (Extended)

```typescript
// Core TimelineEntry — unchanged
interface TimelineEntry {
  id: string;
  timestamp: string;
  type: 'request' | 'response';
  data: unknown;
}

// Multi-spec — adds specId (added by orchestrator wrapper)
interface MultiSpecTimelineEntry extends TimelineEntry {
  specId: string;
}
```

### 7.5 Simulation (Extended)

```typescript
// Core SimulationBase — unchanged
interface SimulationBase {
  path: string;
  operationId?: string;
  status: number;
  delay?: number;
  body?: unknown;
}

// Multi-spec — commands include specId
interface MultiSpecSimulationCommand extends SimulationBase {
  specId: string;
}
```

---

## 8. Communication Protocol

### 8.1 WebSocket Messages

**Server → Client:**

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ serverVersion, specs: SpecInfo[] }` | Connection established, includes all spec metadata |
| `request` | `RequestLogEntry & { specId }` | New request received |
| `response` | `ResponseLogEntry & { specId }` | Response sent |
| `store:updated` | `{ specId, schema, action, count? }` | Store data changed |
| `handlers:updated` | `{ specId, count }` | Handlers hot-reloaded |
| `seeds:updated` | `{ specId, count }` | Seeds hot-reloaded |
| `simulation:added` | `{ specId, path }` | Simulation added |
| `simulation:removed` | `{ specId, path }` | Simulation removed |
| `simulations:cleared` | `{ specId, count }` | All simulations cleared |
| `registry` | `{ specId, endpoints[], stats }` | Registry data response |
| `timeline` | `{ specId, entries[], count, total }` | Timeline data response |
| `store` | `{ specId, schema, items[], count }` | Store data response |
| `store:set` | `{ specId, schema, success, count }` | Store set acknowledgment |
| `store:cleared` | `{ specId, schema, success }` | Store clear acknowledgment |
| `simulation:set` | `{ specId, path, success }` | Simulation set acknowledgment |
| `simulation:cleared` | `{ specId, path, success }` | Simulation clear acknowledgment |
| `reseeded` | `{ specId, success, schemas[] }` | Reseed acknowledgment |
| `timeline:cleared` | `{ specId, count }` | Timeline clear acknowledgment |
| `error` | `{ specId?, command, message }` | Command error |

**Client → Server:**

| Command | Payload | Scope | Description |
|---------|---------|-------|-------------|
| `get:specs` | — | Global | Request all spec metadata |
| `get:registry` | `{ specId? }` | Global/Spec | Registry (all or one spec) |
| `get:timeline` | `{ specId?, limit? }` | Global/Spec | Timeline (all or one spec) |
| `clear:timeline` | `{ specId? }` | Global/Spec | Clear timeline |
| `get:store` | `{ specId, schema }` | Spec | Get store data |
| `set:store` | `{ specId, schema, items[] }` | Spec | Replace store data |
| `clear:store` | `{ specId, schema }` | Spec | Clear schema |
| `set:simulation` | `{ specId, path, status, ... }` | Spec | Add simulation |
| `clear:simulation` | `{ specId, path }` | Spec | Remove simulation |
| `reseed` | `{ specId }` | Spec | Re-execute seeds |

### 8.2 Connection Initialization Sequence

```
Client                          Server
  │                                │
  │  WebSocket connect             │
  ├───────────────────────────────►│
  │                                │
  │  { type: 'connected',         │
  │    data: {                     │
  │      serverVersion: '<pkg>',  │
  │      specs: [                  │
  │        { id: 'petstore',      │
  │          title: '...',         │
  │          color: '#4ade80',     │
  │          ... },                │
  │        { id: 'billing', ... } │
  │      ]                         │
  │    }                           │
  │  }                             │
  │◄───────────────────────────────┤
  │                                │
  │  specsStore.setSpecs(specs)    │
  │  (client-side initialization)  │
  │                                │
  │  get:registry { specId: 'petstore' }
  ├───────────────────────────────►│
  │  get:registry { specId: 'billing' }
  ├───────────────────────────────►│
  │  get:timeline (all)            │
  ├───────────────────────────────►│
  │                                │
  │  registry { specId: 'petstore', ... }
  │◄───────────────────────────────┤
  │  registry { specId: 'billing', ... }
  │◄───────────────────────────────┤
  │  timeline { entries: [...], ... }
  │◄───────────────────────────────┤
  │                                │
  │  UI fully initialized          │
```

---

## 9. Implementation Phases

### Phase 1: Multi-Spec Core Infrastructure

**Duration:** 1-2 weeks

**Deliverables:**
- `SpecConfig` and `OpenApiServerOptions` types (rewritten `types.ts`)
- `spec-id.ts` — ID derivation and validation
- `proxy-path.ts` — proxy path auto-detection and validation
- `orchestrator.ts` — create N instances, mount on single Hono app
- `multi-proxy.ts` — configure Vite with N proxy entries
- `resolveOptions()` — updated for `specs[]` array

**Exit Criteria:**
- [ ] Multiple specs configured and served from single port
- [ ] Each spec's endpoints reachable via its proxy path
- [ ] Spec IDs derived correctly (explicit and auto)
- [ ] Proxy paths derived correctly (explicit and auto from servers[0].url)
- [ ] Duplicate ID and overlapping path validation works
- [ ] Existing core tests pass unchanged

### Phase 2: Per-Spec Isolation & Hot Reload

**Duration:** 1 week

**Deliverables:**
- Per-spec file watchers (`hot-reload.ts` updated)
- Per-spec handler reload
- Per-spec seed reload
- Validation that same schema name in different specs doesn't conflict

**Exit Criteria:**
- [ ] Handler change in spec A doesn't reload spec B
- [ ] Seed change in spec A only repopulates spec A's store
- [ ] Same-named schemas in different specs are independent
- [ ] Store operations scoped to correct spec instance

### Phase 3: WebSocket & Internal API (Multi-Spec)

**Duration:** 1-2 weeks

**Deliverables:**
- `multi-ws.ts` — multi-spec WebSocket wrapper
- `multi-command.ts` — command routing by specId
- `multi-internal-api.ts` — aggregated + per-spec HTTP API
- `SpecInfo` type exported from core
- Updated `connected` event with specs metadata

**Exit Criteria:**
- [ ] WebSocket events include specId
- [ ] `connected` event includes full spec metadata
- [ ] Commands route to correct spec instance
- [ ] `/_api/specs` returns all spec metadata
- [ ] `/_api/specs/:specId/*` routes work correctly
- [ ] Aggregated `/_api/registry` works

### Phase 4: DevTools Multi-Spec UI

**Duration:** 2-3 weeks

**Deliverables:**
- `specs.ts` store (new)
- `SpecFilter.vue` component (new)
- `SpecBadge.vue` component (new)
- `NanoJsonEditor.vue` component (new — NanoJSON via CDN)
- Updated `useWebSocket.ts` composable
- Updated `registry.ts`, `timeline.ts`, `models.ts`, `simulation.ts` stores
- Updated all 4 pages (Routes, Timeline, Models, Simulator)

**Exit Criteria:**
- [ ] Spec filter chips visible on all pages
- [ ] Filter state shared across page navigation
- [ ] Routes page groups by spec → tags → endpoints
- [ ] Timeline shows spec indicators and interleaves entries
- [ ] Models page has spec dropdown, uses NanoJSON
- [ ] Simulator shows global simulation overview
- [ ] Colors consistent across all views
- [ ] NanoJSON loads from CDN (not bundled)
- [ ] CSS overrides for dark/light theme

### Phase 5: Banner, Logging, Tests & Migration

**Duration:** 1-2 weeks

**Deliverables:**
- `banner.ts` updated for multi-spec output
- Spec-prefixed request logging
- Updated test suite (multi-spec scenarios)
- Migration documentation in README

**Exit Criteria:**
- [ ] Banner shows each spec's details
- [ ] Logs prefixed with `[OpenAPI:specId]`
- [ ] All existing tests pass
- [ ] New tests cover multi-spec creation, routing, WebSocket, proxy
- [ ] README migration guide complete

### Phase 6: Playground & Release

**Duration:** 1 week

**Deliverables:**
- Playground updated with petstore + billing specs
- Playground mocks reorganized (`mocks/petstore/`, `mocks/billing/`)
- Version bump: all packages to 1.0.0
- Changeset creation
- npm publishing

**Exit Criteria:**
- [ ] Playground runs with 2 specs simultaneously
- [ ] DevTools shows both specs with filtering
- [ ] All packages at 1.0.0
- [ ] Published to npm

---

## Appendix A: File Changes Summary

### New Files

| Package | File | Purpose |
|---------|------|---------|
| server | `orchestrator.ts` | Multi-spec orchestrator factory |
| server | `spec-id.ts` | Spec ID derivation and validation |
| server | `proxy-path.ts` | Proxy path auto-detection |
| server | `multi-proxy.ts` | Multi-path Vite proxy configuration |
| server | `multi-ws.ts` | Multi-spec WebSocket wrapper |
| server | `multi-command.ts` | Spec-scoped command routing |
| server | `multi-internal-api.ts` | Aggregated internal API |
| devtools-client | `stores/specs.ts` | Spec metadata store |
| devtools-client | `components/SpecFilter.vue` | Spec filter chips |
| devtools-client | `components/SpecBadge.vue` | Spec color indicator |
| devtools-client | `components/NanoJsonEditor.vue` | NanoJSON wrapper |
| devtools-client | `composables/useSpecs.ts` | Spec utilities composable |
| playground | `openapi/billing.yaml` | Second spec for demo |
| playground | `mocks/billing/` | Billing handlers and seeds |

### Modified Files

| Package | File | Change Type |
|---------|------|-------------|
| core | `index.ts` | Add `SpecInfo` export |
| core | `server.ts` | Add `getTimeline()` and `clearTimeline()` to `OpenApiServer` interface |
| core | `websocket/hub.ts` | Add `autoConnect?: boolean` option to `WebSocketHubOptions` |
| core | `websocket/protocol.ts` | Add multi-spec type variants |
| server | `types.ts` | Rewritten (`SpecConfig[]`) |
| server | `plugin.ts` | Rewritten (orchestrator-based) |
| server | `banner.ts` | Updated for multi-spec output |
| server | `hot-reload.ts` | Updated for per-spec watching |
| devtools-client | `stores/registry.ts` | Per-spec registries |
| devtools-client | `stores/timeline.ts` | specId on entries |
| devtools-client | `stores/models.ts` | Spec-scoped |
| devtools-client | `stores/simulation.ts` | Spec-scoped |
| devtools-client | `composables/useWebSocket.ts` | Spec-aware events |
| devtools-client | `pages/RoutesPage.vue` | Spec grouping + filter |
| devtools-client | `pages/TimelinePage.vue` | Spec indicators + filter |
| devtools-client | `pages/ModelsPage.vue` | Spec dropdown + NanoJSON |
| devtools-client | `pages/SimulatorPage.vue` | Spec dropdown + global overview |
| devtools-client | `components/EndpointList.vue` | Spec grouping level |
| devtools-client | `components/EndpointDetail.vue` | Spec context |
| devtools-client | `components/TimelineEntry.vue` | Spec indicator |
| devtools-client | `App.vue` | Spec context provider |
| playground | `vite.config.ts` | Multi-spec configuration |
| playground | `mocks/` | Reorganized by spec |

### Unchanged Files

All files in `packages/core/src/` except `index.ts`, `server.ts`, `websocket/hub.ts`, and `websocket/protocol.ts`.

---

## Appendix B: Error Codes (New)

| Code | Description |
|------|-------------|
| `SPEC_ID_MISSING` | Cannot derive spec ID (no title, no explicit id) |
| `SPEC_ID_DUPLICATE` | Two specs have the same ID |
| `PROXY_PATH_MISSING` | Cannot derive proxy path (no servers, no explicit proxyPath) |
| `PROXY_PATH_TOO_BROAD` | Proxy path is "/" — would capture all requests |
| `PROXY_PATH_DUPLICATE` | Two specs have the same proxy path |
| `PROXY_PATH_OVERLAP` | One proxy path is a prefix of another |
| `SPEC_NOT_FOUND` | Command references unknown specId |
| `SPECS_EMPTY` | No specs configured in options array |

---

## Appendix C: Previous Technical Specification

The original technical specification (v0.x) is preserved at `history/TECHNICAL-SPECIFICATION.md` for historical reference. All implementations defined there are considered complete. This document (V2) builds upon that foundation.

---

*Document generated: February 2026*
