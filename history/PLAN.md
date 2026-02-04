# DEVELOPMENT PLAN

## vite-plugin-open-api-server v2.0

**Created:** January 2026  
**Based on:** PRODUCT-REQUIREMENTS-DOC.md, TECHNICAL-SPECIFICATION.md

---

## Overview

This plan defines the development roadmap for v2.0, structured as beads issues (epics, tasks, subtasks). Each phase corresponds to an epic, with tasks and subtasks for detailed tracking.

---

## Epic 1: Core Foundation

**Priority:** 0 (Critical)  
**Duration:** 2-3 weeks  
**Description:** Build the core Hono server package with OpenAPI processing, routing, store, and data generation.

### Task 1.1: Project Setup

**Priority:** 0  
**Description:** Initialize monorepo structure, configure TypeScript, and set up build tooling.

#### Subtasks:

- **1.1.1** Create packages/core/ directory structure
- **1.1.2** Configure package.json with dependencies (hono, @scalar/*, @faker-js/faker)
- **1.1.3** Configure tsconfig.json with strict mode
- **1.1.4** Set up tsup for library build
- **1.1.5** Create src/index.ts with public exports

### Task 1.2: OpenAPI Processor

**Priority:** 0  
**Description:** Implement the pipeline to bundle, upgrade, and dereference OpenAPI documents.

**References:** TECHNICAL-SPECIFICATION.md Section 4.1

#### Subtasks:

- **1.2.1** Implement bundle step with @scalar/json-magic
- **1.2.2** Implement upgrade step with @scalar/openapi-upgrader (to 3.1)
- **1.2.3** Implement dereference step with @scalar/openapi-parser
- **1.2.4** Add ProcessorError class for error handling
- **1.2.5** Write unit tests for processor

### Task 1.3: In-Memory Store

**Priority:** 1  
**Description:** Create the in-memory data store with CRUD operations and configurable ID fields.

**References:** TECHNICAL-SPECIFICATION.md Section 4.2

#### Subtasks:

- **1.3.1** Implement Store interface and createStore factory
- **1.3.2** Add list, get, create, update, delete operations
- **1.3.3** Add configurable ID field per schema
- **1.3.4** Add clear, clearAll, getSchemas, getCount utilities
- **1.3.5** Write unit tests for store

### Task 1.4: Hono Router

**Priority:** 1  
**Description:** Build Hono routes dynamically from OpenAPI path definitions.

**References:** TECHNICAL-SPECIFICATION.md Section 4.3

#### Subtasks:

- **1.4.1** Create path converter (OpenAPI to Hono format)
- **1.4.2** Build endpoint registry from OpenAPI document
- **1.4.3** Create route builder that generates Hono handlers
- **1.4.4** Implement request/response logging hooks
- **1.4.5** Write unit tests for router

### Task 1.5: Data Generator

**Priority:** 1  
**Description:** Implement fake data generation from OpenAPI schemas using Faker.js.

**References:** TECHNICAL-SPECIFICATION.md Section 4.6

#### Subtasks:

- **1.5.1** Implement generateFromSchema for basic types
- **1.5.2** Add format-based generation (email, uuid, date, etc.)
- **1.5.3** Add field name detection for smart generation
- **1.5.4** Handle arrays and nested objects
- **1.5.5** Write unit tests for generator

### Task 1.6: Server Factory

**Priority:** 1  
**Description:** Create the main createOpenApiServer() factory function.

**References:** TECHNICAL-SPECIFICATION.md Section 4.7

#### Subtasks:

- **1.6.1** Implement createOpenApiServer with config options
- **1.6.2** Wire up processor, store, router, generator
- **1.6.3** Add CORS middleware
- **1.6.4** Add internal API routes (/_api/*)
- **1.6.5** Implement start() and stop() methods
- **1.6.6** Write integration tests

---

## Epic 2: Handlers & Seeds

**Priority:** 1 (High)  
**Duration:** 1-2 weeks  
**Description:** Implement custom handler execution and seed data loading system.

### Task 2.1: Handler System

**Priority:** 1  
**Description:** Create the handler loading and execution system with context injection.

**References:** TECHNICAL-SPECIFICATION.md Section 4.4, PRD FR-006

#### Subtasks:

- **2.1.1** Define HandlerContext interface (req, res, store, faker, logger)
- **2.1.2** Define HandlerFn type and return types
- **2.1.3** Implement executeHandler with error handling
- **2.1.4** Implement response normalization
- **2.1.5** Create defineHandlers() type helper
- **2.1.6** Write unit tests for handler execution

### Task 2.2: Seed System

**Priority:** 1  
**Description:** Create the seed loading and execution system with context injection.

**References:** TECHNICAL-SPECIFICATION.md Section 6.3, PRD FR-005

#### Subtasks:

- **2.2.1** Define SeedContext interface (seed, store, faker, schema)
- **2.2.2** Implement seed helper with count() method
- **2.2.3** Implement executeSeeds to populate store
- **2.2.4** Create defineSeeds() type helper
- **2.2.5** Write unit tests for seed execution

### Task 2.3: Response Priority

**Priority:** 2  
**Description:** Implement the response priority system: Handler > Seed > Example > Generated.

**References:** PRD Decision Log

#### Subtasks:

- **2.3.1** Update route handler to check for custom handler
- **2.3.2** Add seed data lookup fallback
- **2.3.3** Add OpenAPI example fallback
- **2.3.4** Add generated data fallback
- **2.3.5** Write integration tests for priority chain

---

## Epic 3: Vite Integration

**Priority:** 1 (High)  
**Duration:** 1 week  
**Description:** Create the Vite plugin wrapper with proxy configuration and hot reload.

### Task 3.1: Plugin Core

**Priority:** 1  
**Description:** Implement the main openApiServer() Vite plugin function.

**References:** TECHNICAL-SPECIFICATION.md Section 6.1

#### Subtasks:

- **3.1.1** Create packages/server/ directory structure
- **3.1.2** Configure package.json with peer dependencies (vite, vue)
- **3.1.3** Implement plugin with configureServer hook
- **3.1.4** Configure Vite proxy for API routes
- **3.1.5** Implement startup banner
- **3.1.6** Write integration tests

### Task 3.2: File Loading

**Priority:** 1  
**Description:** Implement dynamic loading of handler and seed files.

**References:** TECHNICAL-SPECIFICATION.md Section 6.2, 6.3

#### Subtasks:

- **3.2.1** Implement loadHandlers() with glob pattern matching
- **3.2.2** Implement loadSeeds() with glob pattern matching
- **3.2.3** Handle TypeScript files with cache-busting
- **3.2.4** Log loaded handlers/seeds on startup
- **3.2.5** Write unit tests for file loading

### Task 3.3: Hot Reload

**Priority:** 2  
**Description:** Implement file watching and hot reload for handlers and seeds.

**References:** PRD FR-007

#### Subtasks:

- **3.3.1** Set up chokidar file watcher
- **3.3.2** Implement handler hot reload
- **3.3.3** Implement seed hot reload with store re-population
- **3.3.4** Emit WebSocket events on reload
- **3.3.5** Write integration tests for hot reload

---

## Epic 4: WebSocket & DevTools SPA

**Priority:** 2 (Medium)  
**Duration:** 2-3 weeks  
**Description:** Build WebSocket communication hub and Vue DevTools SPA.

### Task 4.1: WebSocket Hub

**Priority:** 1  
**Description:** Implement the WebSocket hub for bidirectional communication.

**References:** TECHNICAL-SPECIFICATION.md Section 4.5, 8.1

#### Subtasks:

- **4.1.1** Create WebSocketHub interface and factory
- **4.1.2** Implement client connection management
- **4.1.3** Implement broadcast to all clients
- **4.1.4** Define server event types
- **4.1.5** Define client command types
- **4.1.6** Implement command handlers
- **4.1.7** Write unit tests for WebSocket hub

### Task 4.2: DevTools SPA Setup

**Priority:** 1  
**Description:** Initialize the Vue SPA for DevTools.

**References:** TECHNICAL-SPECIFICATION.md Section 5.1

#### Subtasks:

- **4.2.1** Create packages/devtools-client/ directory structure
- **4.2.2** Configure Vue 3 with TypeScript
- **4.2.3** Set up Pinia for state management
- **4.2.4** Configure Vue Router with tabs
- **4.2.5** Set up OpenProps and Lucide icons
- **4.2.6** Configure Vite for library build

### Task 4.3: WebSocket Composable

**Priority:** 1  
**Description:** Create Vue composable for WebSocket connection.

**References:** TECHNICAL-SPECIFICATION.md Section 5.2

#### Subtasks:

- **4.3.1** Implement useWebSocket composable
- **4.3.2** Add auto-reconnect logic
- **4.3.3** Implement event subscription system
- **4.3.4** Add connection status tracking
- **4.3.5** Write unit tests

### Task 4.4: Routes Page

**Priority:** 1  
**Description:** Implement the endpoint listing page.

**References:** PRD FR-100

#### Subtasks:

- **4.4.1** Create registry Pinia store
- **4.4.2** Create EndpointList component
- **4.4.3** Create EndpointDetail component
- **4.4.4** Add search and filter functionality
- **4.4.5** Show handler/seed status indicators
- **4.4.6** Write component tests

### Task 4.5: Timeline Page

**Priority:** 1  
**Description:** Implement the request/response timeline.

**References:** PRD FR-101

#### Subtasks:

- **4.5.1** Create timeline Pinia store
- **4.5.2** Create TimelineEntry component
- **4.5.3** Implement real-time updates via WebSocket
- **4.5.4** Add request/response detail view
- **4.5.5** Add clear timeline action
- **4.5.6** Write component tests

### Task 4.6: Vue DevTools Integration

**Priority:** 2  
**Description:** Integrate DevTools SPA into Vue DevTools via iframe.

**References:** PRD FR-100

#### Subtasks:

- **4.6.1** Research Vue DevTools custom tab API
- **4.6.2** Create registerDevTools() function
- **4.6.3** Serve DevTools SPA from /_devtools/*
- **4.6.4** Test in Vue DevTools browser extension
- **4.6.5** Write integration tests

---

## Epic 5: Advanced Features

**Priority:** 2 (Medium)  
**Duration:** 2 weeks  
**Description:** Implement advanced DevTools features and security handling.

### Task 5.1: Models Page

**Priority:** 2  
**Description:** Implement the store data editor page.

**References:** PRD FR-102

#### Subtasks:

- **5.1.1** Create models Pinia store
- **5.1.2** Create JsonEditor component
- **5.1.3** Implement schema listing
- **5.1.4** Implement data editing
- **5.1.5** Add reseed action
- **5.1.6** Write component tests

### Task 5.2: Simulator Page

**Priority:** 2  
**Description:** Implement the error simulation page.

**References:** PRD FR-103

#### Subtasks:

- **5.2.1** Create simulation Pinia store
- **5.2.2** Define simulation presets (slow, 500, 429, 404, etc.)
- **5.2.3** Create SimulationPreset component
- **5.2.4** Implement add/remove simulation
- **5.2.5** Show active simulations indicator
- **5.2.6** Write component tests

### Task 5.3: Simulation Manager

**Priority:** 2  
**Description:** Implement the server-side simulation manager.

**References:** TECHNICAL-SPECIFICATION.md Section 4.7

#### Subtasks:

- **5.3.1** Create SimulationManager interface
- **5.3.2** Implement get, set, remove, list methods
- **5.3.3** Integrate with route handler
- **5.3.4** Add delay support
- **5.3.5** Write unit tests

### Task 5.4: Security Handling

**Priority:** 3  
**Description:** Implement OpenAPI security scheme handling.

**References:** PRD FR-010

#### Subtasks:

- **5.4.1** Parse security requirements from OpenAPI
- **5.4.2** Implement header-based auth (API key, Bearer)
- **5.4.3** Pass security context to handlers
- **5.4.4** Add security info to endpoint registry
- **5.4.5** Write unit tests

---

## Epic 6: Playground & Release

**Priority:** 2 (Medium)  
**Duration:** 1 week  
**Description:** Create demo application and prepare for npm release.

### Task 6.1: Playground App

**Priority:** 2  
**Description:** Create a demo application showcasing all features.

**References:** PRD FR-011, TECHNICAL-SPECIFICATION.md Section 3.1

#### Subtasks:

- **6.1.1** Create packages/playground/ with Vue app (private)
- **6.1.2** Add petstore.yaml OpenAPI spec
- **6.1.3** Create example handlers
- **6.1.4** Create example seeds
- **6.1.5** Configure vite.config.ts with plugin
- **6.1.6** Add demo UI to exercise endpoints

### Task 6.2: Documentation

**Priority:** 2  
**Description:** Write comprehensive documentation.

#### Subtasks:

- **6.2.1** Update root README.md with full API docs
- **6.2.2** Add handler authoring guide
- **6.2.3** Add seed authoring guide
- **6.2.4** Add DevTools usage guide
- **6.2.5** Add troubleshooting section

### Task 6.3: Release Preparation

**Priority:** 2  
**Description:** Prepare packages for npm publication.

#### Subtasks:

- **6.3.1** Configure package.json for each package
- **6.3.2** Set up exports and type definitions
- **6.3.3** Add changesets configuration
- **6.3.4** Create GitHub Actions for CI/CD
- **6.3.5** Publish to npm

---

## Summary

| Epic | Description | Tasks | Priority | Duration |
|------|-------------|-------|----------|----------|
| 1 | Core Foundation | 6 | Critical | 2-3 weeks |
| 2 | Handlers & Seeds | 3 | High | 1-2 weeks |
| 3 | Vite Integration | 3 | High | 1 week |
| 4 | WebSocket & DevTools SPA | 6 | Medium | 2-3 weeks |
| 5 | Advanced Features | 4 | Medium | 2 weeks |
| 6 | Playground & Release | 3 | Medium | 1 week |

**Total Duration:** ~10-12 weeks

---

*Document generated: January 2026*
