# DEVELOPMENT PLAN — V2

## vite-plugin-open-api-server v1.0.0

**Created:** February 2026  
**Based on:** PRODUCT-REQUIREMENTS-DOC-V2.md, TECHNICAL-SPECIFICATION-V2.md

---

## Overview

This plan defines the development roadmap for v1.0.0 (multi-spec support), structured as beads issues (epics, tasks, subtasks). Each phase corresponds to an epic, with tasks and subtasks for detailed tracking.

**Key constraint:** The core package (`createOpenApiServer()`) remains largely unchanged. Multi-spec orchestration is layered on top in the server package. This minimizes risk and allows existing tests to pass throughout development.

**Dependency chain:**

```
Epic 1 → Epic 2 → Epic 3 ──┬──→ Epic 4 ──┬──→ Epic 6
                            └──→ Epic 5* ──┘
```

*Epic 5 Tasks 5.1 (Banner), 5.2 (Logging), and 5.3 (Migration Docs) can start after Epic 3 in parallel with Epic 4 — they only depend on the server package. Task 5.4 (Comprehensive Tests) depends on both Epic 4 and Epic 5 Tasks 5.1-5.3 being complete. Epic 6 depends on both Epic 4 and Epic 5.*

---

## Epic 1: Multi-Spec Core Infrastructure

**Priority:** 0 (Critical)  
**Duration:** 1-2 weeks  
**Description:** Build the orchestrator that creates N spec instances, derives IDs and proxy paths, and mounts all on a single Hono app. This is the foundational layer — nothing else works without it.

**Blocked by:** Nothing (first epic)  
**Blocks:** Epic 2, Epic 3, Epic 4, Epic 5, Epic 6

### Task 1.1: Core Package Minor Extensions

**Priority:** 0  
**Description:** Add the minimal extensions to the core package needed by the orchestrator.

**References:** TECHNICAL-SPECIFICATION-V2.md Section 4.1

#### Subtasks:

- **1.1.1** Add `getTimeline(): TimelineEntry[]` to `OpenApiServer` interface and implementation
- **1.1.2** Add `clearTimeline(): number` to `OpenApiServer` interface and implementation
- **1.1.3** Add `autoConnect?: boolean` option to `WebSocketHubOptions` in `hub.ts` — when `false`, `addClient()` skips the automatic `connected` event. Default `true` (backward-compatible)
- **1.1.4** Export `SpecInfo` interface from `packages/core/src/index.ts`
- **1.1.5** Add `MultiSpecServerEvent` and `MultiSpecClientCommand` type definitions to `protocol.ts`
- **1.1.6** Run existing core tests — all must pass with no modifications

### Task 1.2: Plugin Configuration Types

**Priority:** 0  
**Description:** Rewrite `packages/server/src/types.ts` with the new `specs: SpecConfig[]` configuration shape.

**References:** TECHNICAL-SPECIFICATION-V2.md Section 5.1

#### Subtasks:

- **1.2.1** Define `SpecConfig` interface (`spec`, `id?`, `proxyPath?`, `handlersDir?`, `seedsDir?`, `idFields?`)
- **1.2.2** Define `OpenApiServerOptions` interface (`specs`, `port?`, `enabled?`, `timelineLimit?`, `devtools?`, `cors?`, `corsOrigin?`, `logger?`, `silent?`)
- **1.2.3** Define `ResolvedSpecConfig` (include `proxyPathSource: 'auto' | 'explicit'` field for banner display) and `ResolvedOptions` internal interfaces
- **1.2.4** Define `ValidationError` class with `code` field matching Tech Spec Appendix B error codes (`SPEC_ID_MISSING`, `SPEC_ID_DUPLICATE`, `PROXY_PATH_MISSING`, `PROXY_PATH_TOO_BROAD`, `PROXY_PATH_DUPLICATE`, `PROXY_PATH_OVERLAP`, `SPEC_NOT_FOUND`, `SPECS_EMPTY`). Use this class in all validation functions across Tasks 1.2–1.4 instead of generic `Error()`.
- **1.2.5** Implement `resolveOptions()` with validation (non-empty specs array, non-empty spec paths) — throw `ValidationError` with code `SPECS_EMPTY` for empty array
- **1.2.6** Write unit tests for `resolveOptions()` (validation, defaults, edge cases) — verify `ValidationError.code` values

### Task 1.3: Spec ID Derivation

**Priority:** 0  
**Description:** Implement spec ID derivation — explicit from config or auto-derived from `info.title`.

**References:** TECHNICAL-SPECIFICATION-V2.md Section 5.2, PRD FR-002

#### Subtasks:

- **1.3.1** Implement `slugify()` function (lowercase, replace special chars with hyphens, trim)
- **1.3.2** Implement `deriveSpecId()` — explicit ID priority, fallback to slugified `info.title`
- **1.3.3** Implement `validateUniqueIds()` — throw on duplicates with helpful error message
- **1.3.4** Write unit tests for `slugify()` (edge cases: empty, special chars, unicode, consecutive hyphens)
- **1.3.5** Write unit tests for `deriveSpecId()` (explicit, auto-derived, missing title error)
- **1.3.6** Write unit tests for `validateUniqueIds()` (duplicates, unique, case sensitivity)

### Task 1.4: Proxy Path Auto-Detection

**Priority:** 0  
**Description:** Implement proxy path auto-detection from `servers[0].url` with validation.

**References:** TECHNICAL-SPECIFICATION-V2.md Section 5.3, PRD FR-003

#### Subtasks:

- **1.4.1** Implement `deriveProxyPath()` — explicit priority, fallback to `servers[0].url` path extraction. Return `proxyPathSource: 'auto' | 'explicit'` alongside the path so the banner can display the source (PRD FR-003: "Log the derived path in startup banner with source indication").
- **1.4.2** Implement `normalizeProxyPath()` — leading slash, no trailing slash, reject root "/"
- **1.4.3** Implement `validateUniqueProxyPaths()` — duplicate detection + overlap detection (prefix nesting)
- **1.4.4** Write unit tests for `deriveProxyPath()` (full URLs, relative paths, missing servers, explicit override)
- **1.4.5** Write unit tests for `normalizeProxyPath()` (edge cases: root, trailing slash, no leading slash)
- **1.4.6** Write unit tests for `validateUniqueProxyPaths()` (duplicates, overlapping prefixes)

### Task 1.5: Orchestrator

**Priority:** 0  
**Description:** Implement the central orchestrator that creates N spec instances and mounts them on a single Hono app.

**References:** TECHNICAL-SPECIFICATION-V2.md Section 5.4, PRD FR-001

**Depends on:** Task 1.2, Task 1.3, Task 1.4

#### Subtasks:

- **1.5.1** Define `SpecInstance` and `OrchestratorResult` interfaces
- **1.5.2** Implement Phase 1: process each spec document, load handlers/seeds, create core server instances
- **1.5.3** Implement Phase 2: derive IDs and proxy paths, validate uniqueness
- **1.5.4** Implement Phase 3: build main Hono app with CORS, DevTools, Internal API, WebSocket mounts
- **1.5.5** Implement X-Spec-Id dispatch middleware (single middleware with `app.fetch()` dispatch — no per-spec sub-routers)
- **1.5.6** Implement `start()` and `stop()` lifecycle methods
- **1.5.7** Define `SPEC_COLORS` palette for deterministic color assignment
- **1.5.8** Write integration test: create orchestrator with 2 specs, verify both are reachable

### Task 1.6: Multi-Path Proxy Configuration

**Priority:** 0  
**Description:** Configure Vite to proxy requests for each spec to the shared server port.

**References:** TECHNICAL-SPECIFICATION-V2.md Section 5.7, PRD FR-013

#### Subtasks:

- **1.6.1** Implement `configureMultiProxy()` — one Vite proxy entry per spec with path rewriting and `X-Spec-Id` header
- **1.6.2** Add shared service proxies (`/_devtools`, `/_api`, `/_ws`)
- **1.6.3** Write unit tests for proxy configuration generation (correct target, rewrite regex, headers)

### Task 1.7: Plugin Entry Point Rewrite

**Priority:** 0  
**Description:** Rewrite `packages/server/src/plugin.ts` to use the orchestrator instead of a single core instance.

**References:** TECHNICAL-SPECIFICATION-V2.md Section 5.9

**Depends on:** Task 1.5, Task 1.6

#### Subtasks:

- **1.7.1** Rewrite `configureServer` hook: create orchestrator, start, configure multi-proxy, set up file watchers
- **1.7.2** Preserve `resolveId` / `load` / `transformIndexHtml` hooks (unchanged from v0.x)
- **1.7.3** Update `closeBundle` cleanup: close all file watchers, stop orchestrator
- **1.7.4** Write integration test: plugin with 2 specs, verify Vite proxy config generated correctly

---

## Epic 2: Per-Spec Isolation & Hot Reload

**Priority:** 1 (High)  
**Duration:** 1 week  
**Description:** Ensure all existing features (handlers, seeds, simulations, store) work correctly in multi-spec context with per-spec hot reload.

**Blocked by:** Epic 1  
**Blocks:** Epic 3

### Task 2.1: Per-Spec File Watchers

**Priority:** 1  
**Description:** Implement independent file watchers for each spec's handlers and seeds directories.

**References:** TECHNICAL-SPECIFICATION-V2.md Section 5.8, PRD FR-012

#### Subtasks:

- **2.1.1** Implement `createPerSpecFileWatchers()` — one watcher per spec with debounced reload callbacks
- **2.1.2** Implement `reloadSpecHandlers()` — reload handlers for a single spec instance
- **2.1.3** Implement `reloadSpecSeeds()` — reload seeds for a single spec instance (clear + re-execute)
- **2.1.4** Write test: change handler in spec A, verify spec B is not reloaded
- **2.1.5** Write test: change seed in spec A, verify spec B store is not affected

### Task 2.2: Store Isolation Validation

**Priority:** 1  
**Description:** Validate that same-named schemas in different specs do not conflict.

**References:** PRD FR-007

#### Subtasks:

- **2.2.1** Write test: two specs both with "User" schema, verify independent CRUD operations
- **2.2.2** Write test: clear store for spec A's "User" does not affect spec B's "User"
- **2.2.3** Write test: per-spec `idFields` configuration applies correctly

### Task 2.3: Default Directory Derivation

**Priority:** 2  
**Description:** Verify default `handlersDir` and `seedsDir` derivation from spec ID.

**References:** PRD FR-008, FR-009

#### Subtasks:

- **2.3.1** Implement default directory resolution: `./mocks/{specId}/handlers` and `./mocks/{specId}/seeds`
- **2.3.2** Write test: omit `handlersDir`/`seedsDir`, verify correct default paths
- **2.3.3** Write test: explicit `handlersDir`/`seedsDir` overrides default

---

## Epic 3: WebSocket & Internal API (Multi-Spec)

**Priority:** 1 (High)  
**Duration:** 1-2 weeks  
**Description:** Update WebSocket protocol and internal API for multi-spec awareness. Single WebSocket hub with spec-tagged events, spec-scoped commands, and aggregated internal API.

**Blocked by:** Epic 1, Epic 2  
**Blocks:** Epic 4

### Task 3.1: Multi-Spec WebSocket Wrapper

**Priority:** 1  
**Description:** Create the multi-spec WebSocket hub that wraps core broadcasts with `specId`.

**References:** TECHNICAL-SPECIFICATION-V2.md Section 5.5, PRD FR-014

#### Subtasks:

- **3.1.1** Implement `createMultiSpecWebSocketHub()` — single hub with `autoConnect: false`
- **3.1.2** Override `addClient()` to send enhanced `connected` event with `specs` metadata and `PACKAGE_VERSION`
- **3.1.3** Wire each core server's `wsHub.broadcast()` to add `specId` to event data
- **3.1.4** Write test: connect client, verify single `connected` event with specs array (no duplicate)
- **3.1.5** Write test: trigger broadcast on spec A, verify event has `specId: 'a'` and that all original event data fields are preserved after specId enrichment (e.g., `action`, `count`, `schema` on `store:updated` events)

### Task 3.2: Multi-Spec Command Handler

**Priority:** 1  
**Description:** Create the command handler that routes WebSocket commands to the correct spec instance.

**References:** TECHNICAL-SPECIFICATION-V2.md Section 5.5.1

#### Subtasks:

- **3.2.1** Implement `createMultiSpecCommandHandler()` with `MultiCommandHandlerDeps` interface
- **3.2.2** Implement `get:specs` command — return enhanced connected event
- **3.2.3** Implement `get:registry` command — single spec (by `specId`) or all specs
- **3.2.4** Implement spec-scoped commands (`get:store`, `set:store`, `clear:store`, `set:simulation`, `clear:simulation`, `reseed`) — validate `specId` required, delegate to instance's handler with specId stripped
- **3.2.5** Implement `get:timeline` command — single spec (uses `getTimeline()`) or all specs
- **3.2.6** Implement `clear:timeline` command — single spec (uses `clearTimeline()`) or all specs
- **3.2.7** Implement `sendError()` helper for consistent error responses
- **3.2.8** Write test: send spec-scoped command without `specId`, verify error response
- **3.2.9** Write test: send command with unknown `specId`, verify error response
- **3.2.10** Write test: send `get:registry` without `specId`, verify all specs return registries
- **3.2.11** Write test: send `reseed` for spec A, verify spec A store repopulated with seed data, verify spec B store unchanged

### Task 3.3: Multi-Spec Internal API

**Priority:** 1  
**Description:** Create aggregated and per-spec HTTP API routes.

**References:** TECHNICAL-SPECIFICATION-V2.md Section 5.6, PRD FR-005

#### Subtasks:

- **3.3.1** Implement `mountMultiSpecInternalApi()` function
- **3.3.2** Implement aggregated routes: `GET /_api/specs`, `GET /_api/registry`, `GET /_api/health`
- **3.3.3** Implement spec resolution middleware: `/_api/specs/:specId/*` with 404 for unknown spec
- **3.3.4** Implement per-spec routes: `GET /_api/specs/:specId/registry`, `GET /_api/specs/:specId/store`, `GET /_api/specs/:specId/store/:schema`, `GET /_api/specs/:specId/document`, `GET /_api/specs/:specId/simulations`, `GET /_api/specs/:specId/timeline`
- **3.3.5** Implement health endpoint with `PACKAGE_VERSION` (not hardcoded)
- **3.3.6** Write integration tests: hit aggregated endpoints, verify data from all specs
- **3.3.7** Write integration tests: hit per-spec endpoints, verify correct spec data

---

## Epic 4: DevTools Multi-Spec UI

**Priority:** 2 (Medium)  
**Duration:** 2-3 weeks  
**Description:** Update all DevTools pages for multi-spec awareness. Add spec filter, spec badges, NanoJSON editor, and spec-aware stores.

**Blocked by:** Epic 3  
**Blocks:** Epic 5

### Task 4.1: Specs Store & Composable

**Priority:** 1  
**Description:** Create the spec metadata store and utility composable.

**References:** TECHNICAL-SPECIFICATION-V2.md Section 6.1, PRD FR-101

#### Subtasks:

- **4.1.1** Create `packages/devtools-client/src/stores/specs.ts` — `specs`, `activeSpecFilter`, `specMap`, `specIds`, `activeSpec`, `isFiltered` state/computed
- **4.1.2** Implement `setSpecs()`, `setFilter()`, `toggleFilter()`, `getColor()` actions
- **4.1.3** Create `packages/devtools-client/src/composables/useSpecs.ts` — spec utility composable
- **4.1.4** Write unit tests for specs store (toggle, filter persistence, color lookup)

### Task 4.2: Spec Filter Component

**Priority:** 1  
**Description:** Create reusable spec filter chips for all pages.

**References:** TECHNICAL-SPECIFICATION-V2.md Section 6.5, PRD FR-101

#### Subtasks:

- **4.2.1** Create `SpecFilter.vue` — reads from `specsStore`, renders color dot + spec id per chip
- **4.2.2** Implement toggle behavior (single-select: click one deactivates others, click active deactivates all)
- **4.2.3** Create `SpecBadge.vue` — small colored indicator for inline use in timeline entries, simulation lists
- **4.2.4** Write component tests for SpecFilter (toggle, active state, color rendering)

### Task 4.3: Updated WebSocket Composable

**Priority:** 1  
**Description:** Update `useWebSocket.ts` to handle spec-aware events and populate specs store.

**References:** TECHNICAL-SPECIFICATION-V2.md Section 6.6

#### Subtasks:

- **4.3.1** Update `connected` event handler to extract `specs` array and call `specsStore.setSpecs()`
- **4.3.2** Update all event handlers to extract `specId` from event data
- **4.3.3** Update command wrappers to accept `specId` parameter (`getStore()`, `setSimulation()`, `reseed()`, etc.)
- **4.3.4** On connect, request initial data for all specs (per-spec `get:registry` + global `get:timeline`)
- **4.3.5** Write tests for spec-aware event handling

### Task 4.4: Updated Stores (Registry, Timeline, Models, Simulation)

**Priority:** 1  
**Description:** Update existing Pinia stores for multi-spec data with spec filtering.

**References:** TECHNICAL-SPECIFICATION-V2.md Sections 6.2, 6.3

#### Subtasks:

- **4.4.1** Update `registry.ts` — per-spec registries Map, `filteredEndpoints` computed (respects spec filter), `groupedBySpec` computed, `globalStats` computed (totalEndpoints, totalSpecs — used by Routes page counter per PRD FR-005: "Stats computed per-spec and globally")
- **4.4.2** Update `timeline.ts` — entries with `specId`, `filteredEntries` computed (respects spec filter), `clear()` accepts optional `specId`
- **4.4.3** Update `models.ts` — spec-scoped schema listing, selected spec state
- **4.4.4** Update `simulation.ts` — spec-scoped simulation listing, selected spec state
- **4.4.5** Write unit tests for filtered computeds (all specs, single spec filter)

### Task 4.5: Routes Page (Multi-Spec)

**Priority:** 1  
**Description:** Add spec grouping and spec filter to Routes page.

**References:** PRD FR-102

#### Subtasks:

- **4.5.1** Add `<SpecFilter>` to filter panel alongside existing METHODS and STATUS filters
- **4.5.2** Implement spec grouping hierarchy: Spec (Level 0) → Tag (Level 1) → Endpoint (Level 2)
- **4.5.3** When single spec filtered, collapse Level 0 (matches v0.x layout)
- **4.5.4** Update counter: `X endpoints | Y specs` reflecting filters
- **4.5.5** Add spec context to endpoint detail panel
- **4.5.6** Write component tests for spec grouping and filter interaction

### Task 4.6: Timeline Page (Multi-Spec)

**Priority:** 1  
**Description:** Add spec indicators and spec filter to Timeline page.

**References:** PRD FR-103

#### Subtasks:

- **4.6.1** Add `<SpecFilter>` to filter panel alongside existing METHODS, STATUS (2xx/3xx/4xx/5xx), and TYPE filters
- **4.6.2** Add `<SpecBadge>` color indicator and spec name to each timeline entry
- **4.6.3** Timeline entries from all specs interleaved by timestamp (global view)
- **4.6.4** Clear button respects spec filter (clear all vs clear one spec)
- **4.6.5** Add spec context to entry detail panel
- **4.6.6** Write component tests for spec indicators and filter interaction

### Task 4.7: Models Page (Multi-Spec + NanoJSON)

**Priority:** 2  
**Description:** Add spec dropdown and replace JSON editor with NanoJSON.

**References:** PRD FR-104, TECHNICAL-SPECIFICATION-V2.md Section 6.4

#### Subtasks:

- **4.7.1** **Investigation:** Verify NanoJSON CSS strategy — Shadow DOM vs global styles (determines theming approach)
- **4.7.2** Create `NanoJsonEditor.vue` wrapper component — dynamic import from jsDelivr CDN with `/* @vite-ignore */`, lifecycle management, props/events sync
- **4.7.3** Apply CSS overrides for dark/light theme consistency with OpenProps (based on investigation from 4.7.1)
- **4.7.4** Add spec dropdown before schema dropdown
- **4.7.5** Schema dropdown filtered to selected spec's schemas
- **4.7.6** Replace existing JSON editor with `<NanoJsonEditor>`
- **4.7.7** Save, Clear, Reseed buttons scoped to selected spec
- **4.7.8** Write component tests for spec dropdown interaction and NanoJSON lifecycle

### Task 4.8: Simulator Page (Multi-Spec)

**Priority:** 2  
**Description:** Add global simulation overview and spec dropdown to Simulator page.

**References:** PRD FR-105

#### Subtasks:

- **4.8.1** Active simulations list shows `<SpecBadge>` + spec name per entry (all specs)
- **4.8.2** Add spec dropdown in "Add Simulation" form
- **4.8.3** Endpoint dropdown filtered to selected spec's endpoints
- **4.8.4** Clear All removes simulations across all specs
- **4.8.5** Individual remove (×) is spec-scoped
- **4.8.6** Write component tests for global overview and spec-scoped actions

---

## Epic 5: Banner, Logging, Migration & Tests

**Priority:** 2 (Medium)  
**Duration:** 1-2 weeks  
**Description:** Updated startup output, logging, migration support, and comprehensive test suite.

**Blocked by:** Epic 3 (Tasks 5.1–5.3 can start after Epic 3, in parallel with Epic 4). Task 5.4 (Comprehensive Tests) blocked by Epic 4 completion.  
**Blocks:** Epic 6

### Task 5.1: Multi-Spec Startup Banner

**Priority:** 2  
**Description:** Update `banner.ts` for multi-spec output showing each spec's details.

**References:** PRD Section 7, TECHNICAL-SPECIFICATION-V2.md (banner format)

#### Subtasks:

- **5.1.1** Implement `printMultiSpecBanner()` — per-spec block with color indicator, spec file, API name/version, endpoints, schemas, proxy path (with source: auto vs explicit), handlers, seeds, security
- **5.1.2** Implement summary footer — server URL, DevTools URL, WebSocket URL, specs count, proxies list
- **5.1.3** Implement `printReloadNotification()` — spec-prefixed reload messages
- **5.1.4** Write tests for banner output format

### Task 5.2: Spec-Prefixed Request Logging

**Priority:** 2  
**Description:** Update request logging to include spec context.

#### Subtasks:

- **5.2.1** Log format: `[OpenAPI:{specId}] → {METHOD} {path} [{operationId}]`
- **5.2.2** Log format: `[OpenAPI:{specId}] ✓ {status} {METHOD} {path} ({duration}ms)`
- **5.2.3** Simulation indicator: `[SIMULATION: {status}]` suffix
- **5.2.4** Write tests for log output format

### Task 5.3: Migration Documentation

**Priority:** 2  
**Description:** Write migration guide for 0.x → 1.0.

**References:** PRD Section 8

#### Subtasks:

- **5.3.1** Document config shape change (`spec: string` → `specs: SpecConfig[]`)
- **5.3.2** Document what moved (per-spec options)
- **5.3.3** Document directory structure migration (flat → per-spec)
- **5.3.4** Add migration example to README.md
- **5.3.5** Document new features summary

### Task 5.4: Comprehensive Test Suite

**Priority:** 1  
**Description:** Write **integration-level** tests that verify the full stack end-to-end (browser → proxy → orchestrator → core → WS → DevTools). Earlier task tests (1.x–4.x) are unit/component tests validating individual modules. These integration tests verify the modules work together correctly as a system.

**Depends on:** Epic 4, Tasks 5.1–5.3

#### Subtasks:

- **5.4.1** Integration test: 2-spec orchestrator — create, start, verify both specs reachable via proxy paths
- **5.4.2** Integration test: spec ID collision detection (duplicate IDs throw)
- **5.4.3** Integration test: proxy path collision detection (duplicate paths throw)
- **5.4.4** Integration test: proxy path overlap detection (nested paths throw)
- **5.4.5** Integration test: WebSocket connected event with specs metadata
- **5.4.6** Integration test: spec-scoped WebSocket command routing
- **5.4.7** Integration test: aggregated internal API (`/_api/specs`, `/_api/registry`, `/_api/health`)
- **5.4.8** Integration test: per-spec internal API (`/_api/specs/:specId/registry`, etc.)
- **5.4.9** Integration test: per-spec hot reload (change spec A handler, verify spec B unaffected)
- **5.4.10** Verify all existing v0.x tests still pass — this covers unchanged core behaviors including FR-004 (minimal valid document), FR-010 (data generator), and FR-011 (security scheme handling)

---

## Epic 6: Playground & Release

**Priority:** 2 (Medium)  
**Duration:** 1 week  
**Description:** Update playground for multi-spec demo and bump all packages to 1.0.0.

**Blocked by:** Epic 5

### Task 6.1: Playground Multi-Spec Update

**Priority:** 2  
**Description:** Update playground to demonstrate multi-spec features.

#### Subtasks:

- **6.1.1** Create `packages/playground/openapi/billing.yaml` — simple billing API spec
- **6.1.2** Create `packages/playground/mocks/billing/handlers/` — billing handlers
- **6.1.3** Create `packages/playground/mocks/billing/seeds/` — billing seeds
- **6.1.4** Reorganize existing petstore mocks to `mocks/petstore/handlers/` and `mocks/petstore/seeds/`
- **6.1.5** Update `vite.config.ts` with `specs: [petstore, billing]` configuration
- **6.1.6** Update playground UI to show both specs (e.g., tabs or sections for pet store vs billing API calls)
- **6.1.7** Verify DevTools shows both specs with filtering, timeline interleaving, spec-scoped models/simulations

### Task 6.2: Documentation Update

**Priority:** 2  
**Description:** Update README.md with multi-spec configuration and migration guide.

#### Subtasks:

- **6.2.1** Update configuration section with `specs: SpecConfig[]` examples (single, multi, auto-derived)
- **6.2.2** Add multi-spec section explaining orchestration, spec IDs, proxy path auto-detection
- **6.2.3** Add migration guide section (0.x → 1.0)
- **6.2.4** Update DevTools section for multi-spec filtering and NanoJSON editor

### Task 6.3: Version Bump & Release

**Priority:** 2  
**Description:** Bump all packages to 1.0.0 and publish.

#### Subtasks:

- **6.3.1** Bump `packages/core/package.json` to 1.0.0
- **6.3.2** Bump `packages/devtools-client/package.json` to 1.0.0
- **6.3.3** Bump `packages/server/package.json` to 1.0.0
- **6.3.4** Bump `packages/playground/package.json` to 1.0.0
- **6.3.5** Create changeset with breaking change description
- **6.3.6** Run full CI pipeline: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
- **6.3.7** Publish to npm

---

## Summary

| Epic | Description | Tasks | Subtasks | Priority | Duration |
|------|-------------|-------|----------|----------|----------|
| 1 | Multi-Spec Core Infrastructure | 7 | 37 | Critical | 1-2 weeks |
| 2 | Per-Spec Isolation & Hot Reload | 3 | 10 | High | 1 week |
| 3 | WebSocket & Internal API | 3 | 25 | High | 1-2 weeks |
| 4 | DevTools Multi-Spec UI | 8 | 39 | Medium | 2-3 weeks |
| 5 | Banner, Logging, Migration & Tests | 4 | 19 | Medium | 1-2 weeks |
| 6 | Playground & Release | 3 | 14 | Medium | 1 week |

**Totals:** 28 tasks, 144 subtasks  
**Total Duration:** ~6-10 weeks (reduced from 7-11 due to Epic 4 ∥ Epic 5 parallelization)

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Hono `app.fetch()` dispatch may not preserve all request context | High | Test early in Task 1.5.5 with real HTTP requests through Vite proxy |
| NanoJSON CSS conflicts with OpenProps dark/light mode | Medium | Investigation task (4.7.1) scheduled before implementation |
| `autoConnect` option breaks existing hub tests | Low | Default `true` ensures backward compatibility; run core tests in Task 1.1.6 |
| Proxy path overlap detection may be too aggressive | Low | Start with strict validation, relax if user feedback requires it |
| Existing v0.x tests break during refactor | Medium | Task 5.4.10 as final gate; run existing tests after every epic |
| NanoJSON CDN unavailable (jsDelivr down or blocked in corporate network) | Medium | Graceful fallback to `<textarea>` with raw JSON when CDN import fails. Add `try/catch` around dynamic import in `NanoJsonEditor.vue` with fallback UI. |

---

## Verification Checkpoints

After each epic, verify:

1. **Epic 1:** `pnpm test` passes. 2 specs reachable via proxy. Spec IDs and proxy paths derived correctly.
2. **Epic 2:** Handler change in spec A doesn't reload spec B. Same-named schemas isolated. **Note:** Hot reload tests that verify `specId` in WebSocket events should be deferred to Epic 3 (after broadcast wiring in Task 3.1.3). Epic 2 tests validate only reload correctness (store state, handler registration), not WS event payloads.
3. **Epic 3:** WebSocket `connected` event includes specs. Commands route to correct spec. Internal API serves aggregated + per-spec data.
4. **Epic 4:** All DevTools pages show spec context. Spec filter works across pages. NanoJSON loads from CDN. **Verify:** Spec filter state persists across page navigation (filter on Routes → navigate to Timeline → filter still applied, per PRD FR-101).
5. **Epic 5:** Banner shows all specs. Logs prefixed with spec ID. All tests pass (old + new).
6. **Epic 6:** Playground runs with 2 specs. All packages at 1.0.0. Published to npm.

---

*Document generated: February 2026*
