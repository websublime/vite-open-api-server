# PRODUCT REQUIREMENTS SPECIFICATION

## vite-open-api-client

**Version:** 1.0.0  
**Last Updated:** 2025-01-XX  
**Status:** Draft - Ready for Review  
**Author:** Development Team  
**Related:** vite-plugin-open-api-server PRD

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals and Objectives](#3-goals-and-objectives)
4. [Target Users](#4-target-users)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Technical Architecture](#7-technical-architecture)
8. [API Specification](#8-api-specification)
9. [UI/UX Specification](#9-uiux-specification)
10. [Integration Points](#10-integration-points)
11. [Testing Strategy](#11-testing-strategy)
12. [Build & Deployment](#12-build--deployment)
13. [Future Enhancements](#13-future-enhancements)
14. [Acceptance Criteria](#14-acceptance-criteria)
15. [Appendix](#15-appendix)

---

## 1. Executive Summary

### 1.1 Product Overview

The `vite-open-api-client` is a Vue 3 application that provides a unified DevTools interface for the OpenAPI Mock Server. It runs as an iframe within Vue DevTools (via `addCustomTab`) and offers three core functionalities:

1. **State** - Browse and inspect all API endpoints, schemas, and security schemes
2. **Timeline** - Real-time log of all API requests with detailed information
3. **Simulate** - Configure response overrides per endpoint to test edge cases

### 1.2 Value Proposition

| Value | Description |
|-------|-------------|
| **Unified Interface** | Single DevTools tab for all mock server management |
| **Real-time Monitoring** | Live request timeline without console log hunting |
| **Zero-Code Testing** | Simulate errors, delays, and custom responses via UI |
| **Schema-Aware Editing** | JSON editor with schema hints and validation |
| **Developer Productivity** | Quick access to endpoint details and simulation controls |

### 1.3 Relationship to vite-plugin-open-api-server

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Vue DevTools                                   │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Custom Tab (iframe)                             │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │              vite-open-api-client                           │  │  │
│  │  │  ┌─────────┐  ┌──────────┐  ┌──────────┐                   │  │  │
│  │  │  │  State  │  │ Timeline │  │ Simulate │                   │  │  │
│  │  │  └─────────┘  └──────────┘  └──────────┘                   │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP (fetch)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    vite-plugin-open-api-server                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      Hono Mock Server                              │  │
│  │                                                                    │  │
│  │  GET  /_openapiserver/registry      → Endpoint/Schema data        │  │
│  │  GET  /_openapiserver/timeline      → Request logs                │  │
│  │  GET  /_openapiserver/simulate      → Active overrides            │  │
│  │  POST /_openapiserver/simulate      → Set override                │  │
│  │  DELETE /_openapiserver/simulate    → Clear overrides             │  │
│  │                                                                    │  │
│  │  ALL  /*                            → Mock responses              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Scope

**In Scope:**
- Vue 3 SPA with three views (State, Timeline, Simulate)
- Communication with Hono mock server via REST API
- Static build output for embedding in vite-plugin-open-api-server
- JSON editor with schema validation for response overrides
- CSS styling with Open Props

**Out of Scope:**
- Authentication/authorization
- Persistent storage (overrides reset on server restart)
- Multi-server management
- Export/import of configurations

---

## 2. Problem Statement

### 2.1 Current Pain Points

| Pain Point | Impact | Current Workaround |
|-----------|--------|-------------------|
| No unified view of mock server state | Developers don't know what endpoints are available | Read OpenAPI spec manually |
| Request logs scattered in console | Hard to find specific requests | Filter console logs manually |
| Testing error scenarios requires code changes | Slow iteration, requires rebuild | Modify handlers or use query params |
| No visual feedback for active overrides | Forget what's being simulated | Check code or restart server |
| Query param simulation URLs are cumbersome | Error-prone, not discoverable | Copy-paste from documentation |

### 2.2 User Stories

**US-001:** As a frontend developer, I want to see all available mock endpoints in one place so that I know what APIs I can call.

**US-002:** As a frontend developer, I want to see a real-time log of API requests so that I can debug my application without digging through console logs.

**US-003:** As a QA engineer, I want to simulate error responses (401, 500, timeouts) via UI so that I can test error handling without modifying code.

**US-004:** As a frontend developer, I want to provide custom JSON responses for specific endpoints so that I can test edge cases with specific data.

**US-005:** As a developer, I want schema hints when editing response JSON so that I provide valid response structures.

**US-006:** As a developer, I want to quickly reset all simulations to default behavior so that I can return to normal development.

**US-007:** As a developer, I want to navigate from an endpoint in State view directly to Simulate view so that I can quickly set up overrides.

---

## 3. Goals and Objectives

### 3.1 Primary Goals

| Goal | Description | Success Metric |
|------|-------------|----------------|
| **G-001** | Unified mock server management | All features accessible from single tab |
| **G-002** | Real-time request visibility | <1s delay for request logs |
| **G-003** | Zero-code response simulation | Set overrides without touching code |
| **G-004** | Schema-aware editing | JSON validation against OpenAPI schemas |

### 3.2 Secondary Goals

| Goal | Description | Success Metric |
|------|-------------|----------------|
| **G-005** | Fast and responsive UI | <100ms interaction latency |
| **G-006** | Minimal bundle size | <200KB gzipped |
| **G-007** | Consistent with DevTools aesthetics | Dark theme, familiar patterns |
| **G-008** | Keyboard accessible | Full keyboard navigation |

### 3.3 Non-Goals (Out of Scope)

- Persistent storage of simulations across server restarts
- Multi-server/multi-spec management
- GraphQL support
- Request modification/interception (only response simulation)
- Performance profiling or metrics

---

## 4. Target Users

### 4.1 Primary Users

| Persona | Role | Key Needs |
|---------|------|-----------|
| **Frontend Developer** | Builds UI with mock APIs | Quick endpoint lookup, request debugging, error simulation |
| **QA Engineer** | Tests application flows | Simulate edge cases without code changes |
| **Full-Stack Developer** | Works on frontend with mock backend | Monitor requests, verify payloads |

### 4.2 Usage Context

- Development environment only (not production)
- Accessed via Vue DevTools browser extension
- Used alongside application development workflow
- Typically open for extended periods during development sessions

---

## 5. Functional Requirements

### 5.1 Core Features

---

#### FR-001: State View - Endpoint Browser

**Priority:** P0 (Critical)

**Description:** Display all API endpoints from the OpenAPI specification with their details.

**Acceptance Criteria:**
- [ ] List all endpoints grouped by tag or path
- [ ] Show HTTP method with color coding (GET=green, POST=blue, PUT=orange, DELETE=red, PATCH=purple)
- [ ] Show endpoint path with parameter placeholders highlighted
- [ ] Show operationId for each endpoint
- [ ] Indicate if endpoint has custom handler (badge)
- [ ] Indicate if endpoint has custom seed (badge)
- [ ] Show endpoint summary/description from OpenAPI spec
- [ ] Expandable details showing:
  - Path parameters with types
  - Query parameters with types and required status
  - Request body schema (if applicable)
  - Response schemas by status code
- [ ] Search/filter endpoints by path, method, or operationId
- [ ] Quick action button to navigate to Simulate view for endpoint

**Data Source:** `GET /_openapiserver/registry`

**UI Mockup (Text):**
```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔍 Search endpoints...                                              │
├─────────────────────────────────────────────────────────────────────┤
│ ▼ pet (8 endpoints)                                                 │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ POST   /pet                      addPet         [Handler]   │ ⚡│
│   │ PUT    /pet                      updatePet                  │ ⚡│
│   │ GET    /pet/findByStatus         findPetsByStatus  [Seed]   │ ⚡│
│   │ GET    /pet/findByTags           findPetsByTags             │ ⚡│
│   │ GET    /pet/{petId}              getPetById                 │ ⚡│
│   │ POST   /pet/{petId}              updatePetWithForm          │ ⚡│
│   │ DELETE /pet/{petId}              deletePet                  │ ⚡│
│   │ POST   /pet/{petId}/uploadImage  uploadFile                 │ ⚡│
│   └─────────────────────────────────────────────────────────────┘   │
│ ▶ store (4 endpoints)                                               │
│ ▶ user (8 endpoints)                                                │
├─────────────────────────────────────────────────────────────────────┤
│ Total: 20 endpoints │ 8 with handlers │ 3 with seeds               │
└─────────────────────────────────────────────────────────────────────┘

⚡ = Quick navigate to Simulate
```

**Expanded Endpoint Detail:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ GET /pet/{petId}                                        getPetById  │
├─────────────────────────────────────────────────────────────────────┤
│ Find pet by ID                                                      │
│ Returns a single pet                                                │
├─────────────────────────────────────────────────────────────────────┤
│ Path Parameters:                                                    │
│   • petId (integer, required) - ID of pet to return                │
├─────────────────────────────────────────────────────────────────────┤
│ Responses:                                                          │
│   200 - successful operation → Pet                                  │
│   400 - Invalid ID supplied                                         │
│   404 - Pet not found                                               │
├─────────────────────────────────────────────────────────────────────┤
│ [⚡ Simulate This Endpoint]                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

#### FR-002: State View - Schema Browser

**Priority:** P1 (High)

**Description:** Display all schemas defined in the OpenAPI specification.

**Acceptance Criteria:**
- [ ] List all schemas from `components/schemas`
- [ ] Show schema name and type
- [ ] Expandable to show full schema definition
- [ ] Show properties with types, required status, and descriptions
- [ ] Show nested/referenced schemas inline or as links
- [ ] Syntax highlighted JSON schema view option

**UI Mockup (Text):**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Schemas (12)                                                        │
├─────────────────────────────────────────────────────────────────────┤
│ ▶ Pet                    object    (6 properties)                   │
│ ▶ Category               object    (2 properties)                   │
│ ▶ Tag                    object    (2 properties)                   │
│ ▶ Order                  object    (6 properties)                   │
│ ▶ User                   object    (8 properties)                   │
│ ▼ ApiResponse            object    (3 properties)                   │
│   ├─ code: integer                                                  │
│   ├─ type: string                                                   │
│   └─ message: string                                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

#### FR-003: Timeline View - Request Log

**Priority:** P0 (Critical)

**Description:** Display real-time log of all API requests to the mock server.

**Acceptance Criteria:**
- [ ] Poll server every 1 second for new logs
- [ ] Display last 100 requests (configurable limit on server)
- [ ] Show for each request:
  - Timestamp (HH:MM:SS.mmm)
  - HTTP method with color coding
  - Request path
  - Status code with color (2xx=green, 4xx=orange, 5xx=red)
  - Response time (ms)
  - operationId (if matched)
  - Indicator if override was active
- [ ] Expandable request details showing:
  - Full URL with query parameters
  - Request headers
  - Request body (if present)
  - Response headers
  - Response body (truncated with expand option)
- [ ] Clear button to reset timeline
- [ ] Pause/resume polling toggle
- [ ] Filter by method, status code, or path
- [ ] Auto-scroll to newest (with toggle to disable)

**Data Source:** `GET /_openapiserver/timeline`

**UI Mockup (Text):**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Timeline                              [▶ Live] [🔍 Filter] [🗑 Clear]│
├─────────────────────────────────────────────────────────────────────┤
│ 14:32:45.123  GET    /pet/findByStatus    200   45ms   findPets    │
│ 14:32:44.891  POST   /pet                 201   123ms  addPet      │
│ 14:32:43.456  GET    /pet/999             404   12ms   getPetById  │
│ 14:32:42.789  DELETE /pet/5               200   34ms   deletePet 🔧│
│ 14:32:41.234  GET    /store/inventory     500   5ms    getInv   🔧│
├─────────────────────────────────────────────────────────────────────┤
│ 🔧 = Override active                                                │
└─────────────────────────────────────────────────────────────────────┘

🔧 indicates the response was modified by an active simulation override
```

**Expanded Request Detail:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ GET /pet/findByStatus?status=available                              │
│ 14:32:45.123 │ 200 OK │ 45ms │ findPetsByStatus                    │
├─────────────────────────────────────────────────────────────────────┤
│ Request Headers:                                                    │
│   Accept: application/json                                          │
│   User-Agent: Mozilla/5.0 ...                                       │
├─────────────────────────────────────────────────────────────────────┤
│ Response Headers:                                                   │
│   Content-Type: application/json                                    │
│   X-Mock-Server: scalar                                             │
├─────────────────────────────────────────────────────────────────────┤
│ Response Body:                                                      │
│ [                                                                   │
│   { "id": 1, "name": "Fluffy", "status": "available" },            │
│   { "id": 2, "name": "Buddy", "status": "available" }              │
│ ]                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

#### FR-004: Simulate View - Response Override Configuration

**Priority:** P0 (Critical)

**Description:** Configure response overrides for specific endpoints to simulate various scenarios.

**Acceptance Criteria:**
- [ ] Endpoint selector dropdown (searchable)
- [ ] Show selected endpoint details (method, path, operationId)
- [ ] Status code selector with all valid responses from OpenAPI spec
- [ ] Delay input (milliseconds) for simulating slow responses
- [ ] Error type selector:
  - None (normal response)
  - Timeout (never responds)
  - Network Error (connection refused)
  - Connection Reset
- [ ] Response body JSON editor with:
  - Syntax highlighting
  - JSON validation (show errors inline)
  - Schema hints based on selected status code
  - Pre-populated with example from schema
  - Format/prettify button
- [ ] Enable/disable toggle for the override
- [ ] Save override button
- [ ] Reset button to clear current endpoint override
- [ ] Reset All button to clear all overrides
- [ ] Visual indicator showing which endpoints have active overrides
- [ ] Only ONE override active per endpoint at a time

**Data Source:** 
- `GET /_openapiserver/simulate` - Get active overrides
- `POST /_openapiserver/simulate` - Set override
- `DELETE /_openapiserver/simulate/:operationId` - Clear specific override
- `DELETE /_openapiserver/simulate` - Clear all overrides

**Override Priority:**
When a simulate override is active for an endpoint, it takes **highest priority**:
1. Simulate override (if active) ← **WINS**
2. Custom handler (x-handler)
3. Custom seed (x-seed)
4. Scalar auto-generated response

**UI Mockup (Text):**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Simulate                                              [Reset All 🗑]│
├─────────────────────────────────────────────────────────────────────┤
│ Select Endpoint:                                                    │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ GET /pet/{petId} (getPetById)                               ▼  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │  GET   /pet/{petId}                              getPetById     │ │
│ │  Find pet by ID - Returns a single pet                         │ │
│ └─────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│ Override Settings:                                   [✓ Enabled]   │
├─────────────────────────────────────────────────────────────────────┤
│ Status Code:        │ Delay (ms):        │ Error Type:             │
│ ┌─────────────────┐ │ ┌────────────────┐ │ ┌─────────────────────┐ │
│ │ 404 Not Found ▼│ │ │ 0              │ │ │ None              ▼│ │
│ └─────────────────┘ │ └────────────────┘ │ └─────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│ Response Body:                              [Format] [Load Example] │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ {                                                               │ │
│ │   "code": 404,                                                  │ │
│ │   "type": "error",                                              │ │
│ │   "message": "Pet not found"                                    │ │
│ │ }                                                               │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ ℹ Schema: ApiResponse { code: integer, type: string, message: ... }│
├─────────────────────────────────────────────────────────────────────┤
│                                      [Reset Endpoint] [💾 Save]     │
└─────────────────────────────────────────────────────────────────────┘
```

**Active Overrides Summary:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ Active Overrides (3):                                               │
├─────────────────────────────────────────────────────────────────────┤
│ 🔧 GET  /pet/{petId}       → 404 Not Found                    [✕]  │
│ 🔧 GET  /store/inventory   → 500 + 2000ms delay               [✕]  │
│ 🔧 POST /pet               → Timeout                          [✕]  │
└─────────────────────────────────────────────────────────────────────┘
```

---

#### FR-005: JSON Editor with Schema Validation

**Priority:** P1 (High)

**Description:** Provide a robust JSON editor for response body configuration with schema awareness.

**Acceptance Criteria:**
- [ ] Syntax highlighting for JSON
- [ ] Line numbers
- [ ] Real-time JSON validation
- [ ] Error indicators for invalid JSON (red underline, margin icon)
- [ ] Schema validation against OpenAPI response schema
- [ ] Warning indicators for schema mismatches
- [ ] Auto-completion hints based on schema (nice-to-have)
- [ ] Format/prettify button
- [ ] Load Example button that populates with schema example or generated data
- [ ] Undo/redo support
- [ ] Dark theme matching DevTools

**Library Options (ordered by preference):**
1. **CodeMirror 6** - Lightweight, extensible, good Vue integration
2. **Monaco Editor** - Full-featured but heavier (~2MB)
3. **Prism.js + contenteditable** - Lightweight but limited editing features

**Recommendation:** CodeMirror 6 with `@codemirror/lang-json` for best balance of features and bundle size.

---

#### FR-006: Navigation and Quick Actions

**Priority:** P1 (High)

**Description:** Enable quick navigation between views and contextual actions.

**Acceptance Criteria:**
- [ ] Tab navigation: State | Timeline | Simulate
- [ ] Keyboard shortcuts:
  - `1` / `2` / `3` - Switch tabs
  - `Ctrl+K` or `/` - Focus search
  - `Esc` - Close expanded panels
- [ ] From State view: Click ⚡ icon to go to Simulate with endpoint pre-selected
- [ ] From Timeline view: Click request to expand details
- [ ] URL state preservation (tab selection in hash/query for reload)
- [ ] Breadcrumb or back navigation when drilling into details

---

### 5.2 Server-Side Requirements (Hono Mock Server)

These requirements are implemented in `vite-plugin-open-api-server` but are documented here as dependencies.

---

#### FR-007: Timeline API Endpoint

**Priority:** P0 (Critical)

**Description:** Hono endpoint to retrieve request logs for Timeline view.

**Endpoint:** `GET /_openapiserver/timeline`

**Response:**
```typescript
interface TimelineResponse {
  logs: RequestLogEntry[];
  total: number;
  limit: number;
}

interface RequestLogEntry {
  id: string;                    // Unique request ID
  timestamp: string;             // ISO 8601 timestamp
  method: string;                // HTTP method
  path: string;                  // Request path
  url: string;                   // Full URL with query params
  operationId: string | null;    // Matched operationId
  status: number;                // Response status code
  duration: number;              // Response time in ms
  requestHeaders: Record<string, string>;
  requestBody: unknown | null;
  responseHeaders: Record<string, string>;
  responseBody: unknown | null;
  hasOverride: boolean;          // Was simulate override active?
  error: string | null;          // Error message if request failed
}
```

**Implementation Notes:**
- Store logs in memory (array with max 100 entries, FIFO)
- Return newest first
- Clear logs on `DELETE /_openapiserver/timeline`

---

#### FR-008: Simulate API Endpoints

**Priority:** P0 (Critical)

**Description:** Hono endpoints to manage response overrides.

**Endpoints:**

**GET /_openapiserver/simulate**
```typescript
interface SimulateListResponse {
  overrides: SimulateOverride[];
}

interface SimulateOverride {
  operationId: string;
  enabled: boolean;
  statusCode: number;
  delay: number;                    // ms
  errorType: 'none' | 'timeout' | 'network-error' | 'reset';
  responseBody: unknown | null;
  createdAt: string;                // ISO 8601
}
```

**POST /_openapiserver/simulate**
```typescript
interface SimulateSetRequest {
  operationId: string;
  enabled?: boolean;                // default: true
  statusCode?: number;              // default: from spec
  delay?: number;                   // default: 0
  errorType?: 'none' | 'timeout' | 'network-error' | 'reset';
  responseBody?: unknown;           // default: null (use generated)
}

// Response: 200 OK with the created/updated override
```

**DELETE /_openapiserver/simulate/:operationId**
```typescript
// Response: 204 No Content
```

**DELETE /_openapiserver/simulate**
```typescript
// Response: 204 No Content (clears all overrides)
```

---

#### FR-009: Simulate Middleware

**Priority:** P0 (Critical)

**Description:** Hono middleware that applies simulate overrides to responses.

**Implementation:**
```typescript
const simulateOverrides = new Map<string, SimulateOverride>();

app.use('*', async (c, next) => {
  // Skip internal endpoints
  if (c.req.path.startsWith('/_openapiserver')) {
    return next();
  }
  
  const operationId = matchOperationId(c.req.method, c.req.path);
  const override = simulateOverrides.get(operationId);
  
  if (override?.enabled) {
    // Mark request as having override (for timeline)
    c.set('hasOverride', true);
    
    // Apply delay
    if (override.delay > 0) {
      await new Promise(r => setTimeout(r, override.delay));
    }
    
    // Handle error types
    switch (override.errorType) {
      case 'timeout':
        // Never respond
        return new Promise(() => {});
      
      case 'network-error':
        throw new Error('Simulated network error');
      
      case 'reset':
        // Close connection abruptly (implementation depends on runtime)
        c.req.raw.destroy?.();
        return;
    }
    
    // Return override response
    if (override.responseBody !== null) {
      return c.json(override.responseBody, override.statusCode);
    } else {
      // Use specified status but let Scalar generate body
      // This requires modifying the response after Scalar
      c.set('overrideStatus', override.statusCode);
    }
  }
  
  await next();
});
```

**Priority Order:**
1. Simulate override (if `enabled: true`) → Return immediately
2. Custom handler (x-handler) → Normal flow
3. Custom seed (x-seed) → Normal flow
4. Scalar auto-generation → Normal flow

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Initial load time | <500ms | Time to interactive |
| Timeline polling overhead | <10ms per request | Network + parse time |
| JSON editor responsiveness | <50ms keystroke latency | Input to render |
| Bundle size (gzipped) | <200KB | Production build |

### 6.2 Usability

| Requirement | Target |
|-------------|--------|
| Dark theme | Match Vue DevTools aesthetics |
| Responsive layout | Work in DevTools panel (min 400px width) |
| Keyboard navigation | Full functionality without mouse |
| Error feedback | Clear, actionable error messages |
| Loading states | Skeleton/spinner for async operations |

### 6.3 Reliability

| Requirement | Target |
|-------------|--------|
| Graceful degradation | Show error state if server unavailable |
| Auto-reconnect | Retry timeline polling on failure |
| State preservation | Don't lose form data on tab switch |
| Error boundaries | Catch and display component errors |

### 6.4 Compatibility

| Requirement | Target |
|-------------|--------|
| Vue DevTools | v6.x and v7.x |
| Browsers | Chrome 90+, Firefox 90+, Safari 15+, Edge 90+ |
| Vue version | Vue 3.3+ |
| Node.js | 18.x, 20.x (for build) |

---

## 7. Technical Architecture

### 7.1 Package Structure

```
packages/
└── vite-open-api-client/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    ├── src/
    │   ├── main.ts                 # App entry point
    │   ├── App.vue                 # Root component with tab navigation
    │   ├── api/
    │   │   ├── client.ts           # HTTP client (fetch wrapper)
    │   │   ├── registry.ts         # Registry API calls
    │   │   ├── timeline.ts         # Timeline API calls
    │   │   └── simulate.ts         # Simulate API calls
    │   ├── stores/
    │   │   ├── registry.ts         # Pinia store for endpoints/schemas
    │   │   ├── timeline.ts         # Pinia store for request logs
    │   │   └── simulate.ts         # Pinia store for overrides
    │   ├── views/
    │   │   ├── StateView.vue       # Endpoint/schema browser
    │   │   ├── TimelineView.vue    # Request log viewer
    │   │   └── SimulateView.vue    # Override configuration
    │   ├── components/
    │   │   ├── common/
    │   │   │   ├── TabNav.vue
    │   │   │   ├── Badge.vue
    │   │   │   ├── Button.vue
    │   │   │   ├── Select.vue
    │   │   │   ├── Input.vue
    │   │   │   └── Toggle.vue
    │   │   ├── state/
    │   │   │   ├── EndpointList.vue
    │   │   │   ├── EndpointCard.vue
    │   │   │   ├── SchemaList.vue
    │   │   │   └── SchemaCard.vue
    │   │   ├── timeline/
    │   │   │   ├── RequestList.vue
    │   │   │   ├── RequestRow.vue
    │   │   │   └── RequestDetail.vue
    │   │   └── simulate/
    │   │       ├── EndpointSelector.vue
    │   │       ├── OverrideForm.vue
    │   │       ├── JsonEditor.vue
    │   │       └── ActiveOverrides.vue
    │   ├── composables/
    │   │   ├── usePolling.ts       # Polling logic for timeline
    │   │   ├── useKeyboard.ts      # Keyboard shortcuts
    │   │   └── useTheme.ts         # Dark theme detection
    │   ├── utils/
    │   │   ├── http-colors.ts      # Method/status color mappings
    │   │   ├── formatters.ts       # Date, duration, JSON formatters
    │   │   └── schema-utils.ts     # Schema parsing helpers
    │   └── styles/
    │       ├── main.css            # Global styles + Open Props
    │       ├── variables.css       # CSS custom properties
    │       └── utilities.css       # Utility classes
    └── dist/                       # Build output (copied to server)
```

### 7.2 Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Vue 3.4+ | Project standard, Composition API |
| State Management | Pinia | Official Vue state management |
| Styling | CSS + Open Props | Lightweight, design tokens |
| JSON Editor | CodeMirror 6 | Best balance of features/size |
| Build | Vite | Fast builds, good Vue support |
| TypeScript | 5.x | Type safety |

### 7.3 Component Hierarchy

```
App.vue
├── TabNav.vue
│   ├── [State]
│   ├── [Timeline]
│   └── [Simulate]
├── StateView.vue (v-if tab === 'state')
│   ├── SearchInput.vue
│   ├── EndpointList.vue
│   │   └── EndpointCard.vue (v-for)
│   │       └── EndpointDetail.vue (v-if expanded)
│   └── SchemaList.vue
│       └── SchemaCard.vue (v-for)
├── TimelineView.vue (v-if tab === 'timeline')
│   ├── TimelineControls.vue
│   │   ├── Toggle (Live/Paused)
│   │   ├── FilterDropdown
│   │   └── Button (Clear)
│   └── RequestList.vue
│       └── RequestRow.vue (v-for)
│           └── RequestDetail.vue (v-if expanded)
└── SimulateView.vue (v-if tab === 'simulate')
    ├── ActiveOverrides.vue
    ├── EndpointSelector.vue
    ├── OverrideForm.vue
    │   ├── Select (Status Code)
    │   ├── Input (Delay)
    │   ├── Select (Error Type)
    │   ├── JsonEditor.vue
    │   └── Toggle (Enabled)
    └── ActionButtons.vue
```

### 7.4 Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Vue Application                             │
│                                                                      │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│  │  StateView   │     │ TimelineView │     │ SimulateView │        │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘        │
│         │                    │                     │                │
│         │   ┌────────────────┴────────────────┐   │                │
│         │   │                                  │   │                │
│  ┌──────▼───▼──────┐  ┌───────────────┐  ┌───▼───▼──────┐         │
│  │  registryStore  │  │ timelineStore │  │ simulateStore│         │
│  │                 │  │               │  │              │         │
│  │ - endpoints     │  │ - logs[]      │  │ - overrides  │         │
│  │ - schemas       │  │ - isPolling   │  │ - current    │         │
│  │ - stats         │  │ - filters     │  │ - form       │         │
│  └────────┬────────┘  └───────┬───────┘  └──────┬───────┘         │
│           │                   │                  │                  │
└───────────┼───────────────────┼──────────────────┼──────────────────┘
            │                   │                  │
            │    ┌──────────────┴──────────────┐   │
            │    │        API Client           │   │
            │    └──────────────┬──────────────┘   │
            │                   │                  │
            ▼                   ▼                  ▼
     GET /registry      GET /timeline      POST /simulate
            │                   │                  │
            └───────────────────┼──────────────────┘
                                │
                                ▼
                    ┌───────────────────┐
                    │   Hono Server     │
                    └───────────────────┘
```

---

## 8. API Specification

### 8.1 Client API Types

```typescript
// api/types.ts

/**
 * Registry API Types
 */
export interface RegistryResponse {
  endpoints: EndpointEntry[];
  schemas: SchemaEntry[];
  securitySchemes: SecuritySchemeEntry[];
  stats: RegistryStats;
}

export interface EndpointEntry {
  operationId: string;
  method: string;
  path: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: ParameterEntry[];
  requestBody?: RequestBodyEntry;
  responses: Record<string, ResponseEntry>;
  hasHandler: boolean;
  hasSeed: boolean;
  security?: SecurityRequirement[];
}

export interface ParameterEntry {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  schema: JsonSchema;
  description?: string;
}

export interface RequestBodyEntry {
  required: boolean;
  content: Record<string, MediaTypeEntry>;
}

export interface ResponseEntry {
  description: string;
  content?: Record<string, MediaTypeEntry>;
}

export interface MediaTypeEntry {
  schema: JsonSchema;
  example?: unknown;
}

export interface SchemaEntry {
  name: string;
  schema: JsonSchema;
}

export interface SecuritySchemeEntry {
  name: string;
  type: string;
  scheme?: string;
  bearerFormat?: string;
  in?: string;
}

export interface RegistryStats {
  totalEndpoints: number;
  withHandlers: number;
  withSeeds: number;
  totalSchemas: number;
  totalSecuritySchemes: number;
}

export type JsonSchema = Record<string, unknown>;

/**
 * Timeline API Types
 */
export interface TimelineResponse {
  logs: RequestLog[];
  total: number;
  limit: number;
}

export interface RequestLog {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  url: string;
  operationId: string | null;
  status: number;
  duration: number;
  requestHeaders: Record<string, string>;
  requestBody: unknown | null;
  responseHeaders: Record<string, string>;
  responseBody: unknown | null;
  hasOverride: boolean;
  error: string | null;
}

/**
 * Simulate API Types
 */
export interface SimulateListResponse {
  overrides: SimulateOverride[];
}

export interface SimulateOverride {
  operationId: string;
  enabled: boolean;
  statusCode: number;
  delay: number;
  errorType: ErrorType;
  responseBody: unknown | null;
  createdAt: string;
}

export type ErrorType = 'none' | 'timeout' | 'network-error' | 'reset';

export interface SimulateSetRequest {
  operationId: string;
  enabled?: boolean;
  statusCode?: number;
  delay?: number;
  errorType?: ErrorType;
  responseBody?: unknown;
}
```

### 8.2 API Client Implementation

```typescript
// api/client.ts

const BASE_URL = '/_openapiserver';

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// Registry
export const registryApi = {
  getRegistry: () => fetchJson<RegistryResponse>('/registry'),
};

// Timeline
export const timelineApi = {
  getLogs: () => fetchJson<TimelineResponse>('/timeline'),
  clear: () => fetch(`${BASE_URL}/timeline`, { method: 'DELETE' }),
};

// Simulate
export const simulateApi = {
  list: () => fetchJson<SimulateListResponse>('/simulate'),
  
  set: (override: SimulateSetRequest) => 
    fetchJson<SimulateOverride>('/simulate', {
      method: 'POST',
      body: JSON.stringify(override),
    }),
  
  remove: (operationId: string) =>
    fetch(`${BASE_URL}/simulate/${encodeURIComponent(operationId)}`, {
      method: 'DELETE',
    }),
  
  clearAll: () =>
    fetch(`${BASE_URL}/simulate`, { method: 'DELETE' }),
};
```

---

## 9. UI/UX Specification

### 9.1 Design System

**Colors (Open Props based):**
```css
:root {
  /* Background */
  --bg-primary: var(--gray-9);      /* #1a1a1a */
  --bg-secondary: var(--gray-8);    /* #262626 */
  --bg-tertiary: var(--gray-7);     /* #404040 */
  
  /* Text */
  --text-primary: var(--gray-1);    /* #f5f5f5 */
  --text-secondary: var(--gray-4);  /* #a3a3a3 */
  --text-muted: var(--gray-5);      /* #737373 */
  
  /* Accent */
  --accent-primary: var(--green-5); /* #22c55e */
  --accent-hover: var(--green-4);   /* #4ade80 */
  
  /* HTTP Methods */
  --method-get: var(--green-5);
  --method-post: var(--blue-5);
  --method-put: var(--orange-5);
  --method-patch: var(--violet-5);
  --method-delete: var(--red-5);
  
  /* Status Codes */
  --status-2xx: var(--green-5);
  --status-3xx: var(--yellow-5);
  --status-4xx: var(--orange-5);
  --status-5xx: var(--red-5);
  
  /* UI */
  --border-color: var(--gray-6);
  --focus-ring: var(--blue-5);
  --error: var(--red-5);
  --warning: var(--yellow-5);
  --success: var(--green-5);
}
```

**Typography:**
```css
:root {
  --font-sans: system-ui, -apple-system, sans-serif;
  --font-mono: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  
  --text-xs: 0.75rem;   /* 12px */
  --text-sm: 0.8125rem; /* 13px */
  --text-base: 0.875rem;/* 14px */
  --text-lg: 1rem;      /* 16px */
}
```

**Spacing:**
```css
:root {
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-5: 1.5rem;   /* 24px */
  --space-6: 2rem;     /* 32px */
}
```

### 9.2 Component Specifications

**Method Badge:**
```
┌───────┐
│  GET  │  Background: --method-get, Text: dark
└───────┘
Size: padding 2px 6px, font-size 11px, border-radius 4px, font-weight 600
```

**Status Badge:**
```
┌───────┐
│  200  │  Background: --status-2xx (faded), Text: --status-2xx
└───────┘
Size: padding 2px 8px, font-size 12px, border-radius 4px
```

**Tab Navigation:**
```
┌─────────────────────────────────────────────────────────────────┐
│  State          Timeline          Simulate                      │
│  ━━━━━━                                                         │
└─────────────────────────────────────────────────────────────────┘
Active: underline with --accent-primary, text --text-primary
Inactive: no underline, text --text-secondary
```

**Card/Panel:**
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Content                                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
Background: --bg-secondary
Border: 1px solid --border-color
Border-radius: 6px
Padding: --space-3
```

**Button (Primary):**
```
┌─────────────────┐
│   💾 Save       │
└─────────────────┘
Background: --accent-primary
Text: dark (#052e16)
Padding: 8px 16px
Border-radius: 6px
Font-weight: 500
```

**Button (Secondary):**
```
┌─────────────────┐
│   🔄 Reset      │
└─────────────────┘
Background: --bg-tertiary
Text: --text-primary
Border: 1px solid --border-color
```

### 9.3 Responsive Considerations

Minimum width: 400px (typical DevTools panel width)

```
< 600px: 
  - Single column layout
  - Collapsible sections
  - Smaller font sizes

600px - 900px:
  - Two column layout for forms
  - Side-by-side controls

> 900px:
  - Full layout with sidebars if needed
```

### 9.4 Accessibility

- All interactive elements focusable via Tab
- Visible focus indicators (--focus-ring)
- ARIA labels for icon-only buttons
- Color not sole indicator (icons + color for status)
- Keyboard shortcuts documented and discoverable
- Reduced motion support (`prefers-reduced-motion`)

---

## 10. Integration Points

### 10.1 Vue DevTools Integration

The client app is displayed via `addCustomTab`:

```typescript
// In vite-plugin-open-api-server browser-client.ts

import { addCustomTab } from '@vue/devtools-api';

addCustomTab({
  name: 'openapi-server',
  title: 'OpenAPI Server',
  icon: 'api',  // or custom icon URL
  view: {
    type: 'iframe',
    src: `${window.location.origin}${proxyPath}/_openapiserver/client/`,
  },
  category: 'app',
});
```

### 10.2 Build Integration

The client build is copied to the server plugin during build:

```json
// vite-plugin-open-api-server/package.json
{
  "scripts": {
    "build": "tsdown && pnpm copy-client",
    "copy-client": "cp -r ../vite-open-api-client/dist ./dist/client"
  }
}
```

Or via a build script:

```typescript
// scripts/build.ts
import { cpSync } from 'node:fs';
import { resolve } from 'node:path';

// After building both packages
cpSync(
  resolve(__dirname, '../packages/vite-open-api-client/dist'),
  resolve(__dirname, '../packages/vite-plugin-open-api-server/dist/client'),
  { recursive: true }
);
```

### 10.3 Hono Server Integration

Serve the client static files:

```typescript
// In openapi-server-runner.mts
import { serveStatic } from '@hono/node-server/serve-static';

// Serve client app
app.use('/_openapiserver/client/*', serveStatic({
  root: './dist/client',
  rewriteRequestPath: (path) => path.replace('/_openapiserver/client', ''),
}));

// Or with sirv for better caching
import sirv from 'sirv';
app.use('/_openapiserver/client', sirv('./dist/client', { single: true }));
```

---

## 11. Testing Strategy

### 11.1 Unit Tests

| Component | Test Focus |
|-----------|------------|
| API Client | Mock fetch, error handling |
| Stores | State mutations, computed properties |
| Composables | usePolling, useKeyboard |
| Utils | formatters, http-colors |

**Tools:** Vitest, @vue/test-utils

### 11.2 Component Tests

| Component | Test Focus |
|-----------|------------|
| EndpointCard | Render, expand/collapse, badge display |
| RequestRow | Render, click to expand |
| JsonEditor | Input handling, validation errors |
| OverrideForm | Form validation, submit |

**Tools:** Vitest, @testing-library/vue

### 11.3 Integration Tests

| Flow | Test Focus |
|------|------------|
| Load State | Fetch registry, render endpoints |
| Timeline Polling | Start/stop polling, update list |
| Create Override | Fill form, submit, see in list |
| Clear Override | Click remove, confirm gone |

**Tools:** Vitest, MSW for API mocking

### 11.4 E2E Tests (Optional)

| Scenario | Test Focus |
|----------|------------|
| Full flow | Navigate tabs, create override, see in timeline |
| Error states | Server unavailable, API errors |

**Tools:** Playwright or Cypress

---

## 12. Build & Deployment

### 12.1 Package Configuration

```json
// packages/vite-open-api-client/package.json
{
  "name": "@websublime/vite-open-api-client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "typecheck": "vue-tsc --noEmit",
    "lint": "biome check src/"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "pinia": "^2.1.0",
    "@codemirror/lang-json": "^6.0.0",
    "@codemirror/view": "^6.0.0",
    "codemirror": "^6.0.0",
    "open-props": "^1.7.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "@vue/test-utils": "^2.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0",
    "vue-tsc": "^2.0.0"
  }
}
```

### 12.2 Vite Configuration

```typescript
// packages/vite-open-api-client/vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: '/_openapiserver/client/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          codemirror: ['codemirror', '@codemirror/lang-json', '@codemirror/view'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/_openapiserver': {
        target: 'http://localhost:3456',
        changeOrigin: true,
      },
    },
  },
});
```

### 12.3 Monorepo Build Order

```bash
# In monorepo root
pnpm -F @websublime/vite-open-api-client build
pnpm -F @websublime/vite-plugin-open-api-server build
```

Or via turbo/nx:

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "@websublime/vite-plugin-open-api-server#build": {
      "dependsOn": ["@websublime/vite-open-api-client#build"]
    }
  }
}
```

---

## 13. Future Enhancements

### 13.1 Short-Term (v1.1)

| Feature | Description |
|---------|-------------|
| Request replay | Click to re-execute a request from Timeline |
| Export/Import | Save and load override configurations |
| Favorite endpoints | Pin frequently used endpoints |
| Response diff | Compare override response vs original |

### 13.2 Medium-Term (v1.2)

| Feature | Description |
|---------|-------------|
| Request builder | Construct and send test requests |
| Response templates | Save common override patterns |
| Search across all views | Global search command |
| WebSocket timeline | Real-time updates without polling |

### 13.3 Long-Term (v2.0)

| Feature | Description |
|---------|-------------|
| Multiple servers | Manage multiple mock server instances |
| Collaboration | Share configurations via URL |
| Recording mode | Record real backend responses as seeds |
| Performance metrics | Response time graphs, slowest endpoints |

---

## 14. Acceptance Criteria

### 14.1 MVP Criteria (v1.0)

**State View:**
- [ ] Display all endpoints from registry
- [ ] Group by tag with expand/collapse
- [ ] Show method, path, operationId
- [ ] Show handler/seed badges
- [ ] Search/filter functionality
- [ ] Quick action to navigate to Simulate

**Timeline View:**
- [ ] Poll and display request logs
- [ ] Show method, path, status, duration
- [ ] Indicate override was active
- [ ] Expand for full request/response details
- [ ] Clear button
- [ ] Pause/resume toggle

**Simulate View:**
- [ ] Endpoint selector (searchable)
- [ ] Status code selector
- [ ] Delay input
- [ ] Error type selector
- [ ] JSON editor with syntax highlighting
- [ ] JSON validation with error display
- [ ] Schema hints
- [ ] Load example from schema
- [ ] Save override
- [ ] Reset endpoint / Reset all
- [ ] Active overrides list

**General:**
- [ ] Tab navigation
- [ ] Dark theme
- [ ] Responsive layout (min 400px)
- [ ] Error states for API failures
- [ ] Loading states

### 14.2 Quality Criteria

| Metric | Target |
|--------|--------|
| Unit test coverage | >80% |
| Bundle size (gzipped) | <200KB |
| Lighthouse Performance | >90 |
| No TypeScript errors | 0 |
| No ESLint/Biome errors | 0 |

---

## 15. Appendix

### 15.1 Glossary

| Term | Definition |
|------|------------|
| Override | A configured response modification for an endpoint |
| operationId | Unique identifier for an API operation in OpenAPI |
| Polling | Periodically fetching data from server |
| Schema | JSON Schema defining data structure |
| Seed | Pre-defined response data for an endpoint |
| Handler | Custom code that generates response for an endpoint |

### 15.2 References

- [Vue DevTools API](https://devtools.vuejs.org/plugins/api)
- [Open Props](https://open-props.style/)
- [CodeMirror 6](https://codemirror.net/)
- [Pinia](https://pinia.vuejs.org/)
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.1.0)
- [vite-plugin-inspect](https://github.com/antfu-collective/vite-plugin-inspect) (reference implementation)

### 15.3 File Structure Summary

```
packages/vite-open-api-client/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── api/
│   ├── stores/
│   ├── views/
│   ├── components/
│   ├── composables/
│   ├── utils/
│   └── styles/
└── dist/

packages/vite-plugin-open-api-server/
├── dist/
│   ├── client/          ← Copied from vite-open-api-client/dist
│   ├── index.mjs
│   └── ...
└── ...
```

### 15.4 Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0-draft | 2025-01-XX | Initial PRD creation |

---

**Document Status:** Draft - Ready for Review

**Next Steps:**
1. Review and approve PRD
2. Create package structure
3. Implement server-side endpoints (timeline, simulate)
4. Build Vue client application
5. Integration testing
6. Release as part of vite-plugin-open-api-server
