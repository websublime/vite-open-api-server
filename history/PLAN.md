# DEVELOPMENT PLAN

## vite-plugin-open-api-server

**Version:** 1.0.0  
**Created:** 2026-01-08  
**Status:** In Progress  
**Source:** PRODUCT-REQUIREMENTS-SPECIFICATION.md v1.0.0  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Structure](#2-project-structure)
3. [Development Phases Overview](#3-development-phases-overview)
4. [Phase 0: Project Setup & Skeleton](#4-phase-0-project-setup--skeleton)
5. [Phase 1: Core Infrastructure](#5-phase-1-core-infrastructure)
6. [Phase 2: Handlers, Seeds & Enhancement](#6-phase-2-handlers-seeds--enhancement)
7. [Phase 3: Request Processing](#7-phase-3-request-processing)
8. [Phase 4: Process Management](#8-phase-4-process-management)
9. [Phase 5: Developer Experience](#9-phase-5-developer-experience)
10. [Dependency Graph](#10-dependency-graph)
11. [Effort Estimates Summary](#11-effort-estimates-summary)
12. [Risk Assessment](#12-risk-assessment)
13. [Definition of Done](#13-definition-of-done)
14. [Milestones & Timeline](#14-milestones--timeline)
15. [References](#15-references)

---

## 1. Executive Summary

### 1.1 Purpose

This document translates the approved PRODUCT-REQUIREMENTS-SPECIFICATION.md v1.0.0 into an actionable implementation roadmap. It defines:

- **WHAT** to build (derived from 15 Functional Requirements)
- **HOW** to build it (tasks, subtasks, technical approach)
- **WHEN** to build it (phases, dependencies, timeline)
- **WHO** is responsible (task assignments)

### 1.2 Scope

The plan covers the complete implementation of `@websublime/vite-plugin-open-api-server` from project initialization to v1.0.0 release, including:

- Project setup and tooling configuration
- Core plugin implementation (FR-001 to FR-015)
- Testing infrastructure
- Documentation
- CI/CD pipelines
- Release automation

### 1.3 Approach

Development follows a **phased approach** with clear dependencies between phases:

1. **Phase 0** - Foundation (setup, tooling, structure)
2. **Phase 1** - Core Infrastructure (plugin base, parser, Vite integration)
3. **Phase 2** - Data Layer (handlers, seeds, document enhancement, registry)
4. **Phase 3** - Request Processing (proxy, logging, errors, security)
5. **Phase 4** - Process Management (isolation, coordination, preservation)
6. **Phase 5** - Developer Experience (hot reload, Vue DevTools)

### 1.4 Estimation Guide

| Size | Story Points | Time Estimate | Description |
|------|-------------|---------------|-------------|
| **XS** | 1 | 0.5 day | Trivial, < 2 hours of work |
| **S** | 2 | 1 day | Small, well-understood task |
| **M** | 3-5 | 2-3 days | Medium complexity, some unknowns |
| **L** | 8 | 4-5 days | Large, significant complexity |
| **XL** | 13 | 6-10 days | Very large, should consider breaking down |

---

## 2. Project Structure

### 2.1 Monorepo Layout

```
vite-open-api-server/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                           # Lint, test, build on PR/push
│   │   └── release.yml                      # Automated release via workspace-tools
│   ├── copilot-instructions.md              # AI assistant instructions
│   └── CODEOWNERS                           # Code review assignments
│
├── packages/
│   └── vite-plugin-open-api-server/         # Main plugin package (published)
│       ├── src/
│       │   ├── index.ts                     # Public API exports
│       │   ├── plugin.ts                    # Main Vite plugin implementation
│       │   ├── types/
│       │   │   ├── index.ts                 # Type exports
│       │   │   ├── plugin-options.ts        # Plugin configuration types
│       │   │   ├── ipc-messages.ts          # IPC message protocol types
│       │   │   ├── registry.ts              # Endpoint registry types
│       │   │   ├── handlers.ts              # Handler API types
│       │   │   └── seeds.ts                 # Seed API types
│       │   ├── runner/
│       │   │   ├── index.ts                 # Runner exports
│       │   │   ├── openapi-server-runner.mts # ESM child process runner
│       │   │   ├── process-manager.ts       # Fork/kill/restart logic
│       │   │   ├── ipc-handler.ts           # IPC message handling
│       │   │   └── startup-coordinator.ts   # Ready state coordination
│       │   ├── enhancer/
│       │   │   ├── index.ts                 # Enhancer exports
│       │   │   ├── document-enhancer.ts     # x-handler/x-seed injection
│       │   │   ├── handler-loader.ts        # Load .mjs handler files
│       │   │   ├── seed-loader.ts           # Load .mjs seed files
│       │   │   ├── validator.ts             # Validate handlers/seeds
│       │   │   └── registry-builder.ts      # Build endpoint registry
│       │   ├── parser/
│       │   │   ├── index.ts                 # Parser exports
│       │   │   ├── openapi-loader.ts        # Load & parse OpenAPI specs
│       │   │   ├── schema-extractor.ts      # Extract schemas/operations
│       │   │   └── security-normalizer.ts   # Normalize security schemes
│       │   ├── proxy/
│       │   │   ├── index.ts                 # Proxy exports
│       │   │   └── proxy-config.ts          # Vite proxy configuration
│       │   ├── logging/
│       │   │   ├── index.ts                 # Logging exports
│       │   │   ├── logger.ts                # Vite-integrated logger
│       │   │   ├── request-logger.ts        # Request/response logging
│       │   │   └── startup-banner.ts        # Console banners
│       │   ├── devtools/
│       │   │   ├── index.ts                 # DevTools exports
│       │   │   ├── devtools-plugin.ts       # Vue DevTools integration
│       │   │   ├── global-state.ts          # $openApiServer exposure
│       │   │   └── sfc-generator.ts         # Custom tab SFC
│       │   └── utils/
│       │       ├── index.ts                 # Utility exports
│       │       ├── file-watcher.ts          # Chokidar file watching
│       │       ├── path-utils.ts            # Path resolution utilities
│       │       └── constants.ts             # Shared constants
│       ├── tests/
│       │   ├── unit/                        # Unit tests
│       │   ├── integration/                 # Integration tests
│       │   └── fixtures/                    # Test fixtures
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsdown.config.ts                 # Build configuration
│       └── README.md
│
├── playground/
│   └── petstore-app/                        # Demo/test application
│       ├── src/
│       │   ├── main.ts                      # Vue app entry
│       │   ├── App.vue                      # Root component
│       │   ├── components/                  # Demo components
│       │   └── apis/
│       │       └── petstore/
│       │           ├── petstore.openapi.yaml    # Swagger Petstore spec
│       │           ├── client.ts                # Generated API client
│       │           └── open-api-server/
│       │               ├── README.md            # Usage documentation
│       │               ├── handlers/
│       │               │   ├── pets.handler.mjs
│       │               │   ├── store.handler.mjs
│       │               │   └── user.handler.mjs
│       │               └── seeds/
│       │                   ├── pets.seed.mjs
│       │                   ├── store.seed.mjs
│       │                   └── user.seed.mjs
│       ├── public/
│       ├── index.html
│       ├── vite.config.ts                   # Uses the plugin
│       ├── package.json
│       ├── tsconfig.json
│       └── env.dev.json                     # Environment config
│
├── .beads/                                  # Issue tracking (bd)
│   └── issues.jsonl
├── .claude/                                 # Claude AI config
├── history/
│   ├── PRODUCT-REQUIREMENTS-SPECIFICATION.md
│   └── PLAN.md                              # This document
│
├── biome.json                               # Biome linter/formatter config
├── .editorconfig                            # Editor configuration
├── .gitattributes                           # Git attributes
├── .gitignore                               # Git ignore rules
├── .npmrc                                   # pnpm configuration
├── .node-version                            # Node.js version
├── pnpm-workspace.yaml                      # pnpm workspace config
├── repo.config.toml                         # workspace-tools config
├── tsconfig.json                            # Root TypeScript config
├── package.json                             # Root package.json
├── LICENSE                                  # MIT license
├── README.md                                # Project README
├── CONTRIBUTING.md                          # Contribution guidelines
├── CHANGELOG.md                             # Generated changelog
└── CLAUDE.md                                # AI assistant context
```

### 2.2 Package Purposes

| Package | Purpose | Published |
|---------|---------|-----------|
| `packages/vite-plugin-open-api-server` | Main Vite plugin - the core deliverable | ✅ npm |
| `playground/petstore-app` | Development/testing app using Swagger Petstore | ❌ local only |

### 2.3 Development Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Development Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Developer makes changes to packages/vite-plugin-open-api-server
│                              │                                   │
│                              ▼                                   │
│  2. pnpm dev (tsdown --watch)                                   │
│     - Rebuilds plugin on file changes                           │
│                              │                                   │
│                              ▼                                   │
│  3. playground/petstore-app uses workspace:*                    │
│     - Immediately picks up changes                              │
│                              │                                   │
│                              ▼                                   │
│  4. pnpm playground (runs Vite dev server)                      │
│     - Tests plugin in real Vue app                              │
│                              │                                   │
│                              ▼                                   │
│  5. pnpm test (vitest)                                          │
│     - Runs unit + integration tests                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Technical Details: pnpm Workspace Linking**

When you run `pnpm install` in the monorepo:

1. **Symlink Creation:**
   ```
   playground/petstore-app/node_modules/@websublime/vite-plugin-open-api-server
   → symlink to packages/vite-plugin-open-api-server
   ```

2. **Module Resolution:**
   - Node.js follows the symlink to the actual package
   - TypeScript resolves types from the source package
   - Vite's HMR watches the symlinked directory

3. **Build Output:**
   - `tsdown --watch` outputs to `packages/vite-plugin-open-api-server/dist`
   - Playground imports from `dist/index.js` (via package.json `exports`)
   - File changes → tsdown rebuild → Vite HMR detects change → browser reload

4. **Verification:**
   ```bash
   # Check symlink exists
   ls -la playground/petstore-app/node_modules/@websublime/
   
   # Should show: vite-plugin-open-api-server -> ../../../packages/vite-plugin-open-api-server
   ```

---

## 3. Development Phases Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEVELOPMENT PHASES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  PHASE 0: Project Setup & Skeleton                                    │  │
│  │  ──────────────────────────────────────────                          │  │
│  │  • pnpm workspace, Biome, EditorConfig                               │  │
│  │  • TypeScript configuration                                           │  │
│  │  • workspace-tools for versioning                                     │  │
│  │  • GitHub workflows (CI/CD)                                           │  │
│  │  • Plugin package skeleton                                            │  │
│  │  • Playground app skeleton                                            │  │
│  │                                                                        │  │
│  │  Estimate: L (5-7 days) | FRs: None (infrastructure)                 │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  PHASE 1: Core Infrastructure                                         │  │
│  │  ────────────────────────────────                                     │  │
│  │  • FR-003: OpenAPI Parser & Validation                                │  │
│  │  • FR-001: OpenAPI-Based Mock Generation                              │  │
│  │  • FR-002: Vite Dev Server Integration                                │  │
│  │                                                                        │  │
│  │  Estimate: L (5-8 days) | Priority: P0 (Critical)                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  PHASE 2: Handlers, Seeds & Enhancement                              │  │
│  │  ───────────────────────────────────────                              │  │
│  │  • FR-004: Handler/Seed File Loading & Validation                    │  │
│  │  • FR-005: OpenAPI Document Enhancement (x-handler/x-seed)           │  │
│  │  • FR-006: OpenAPI Endpoint Registry                                  │  │
│  │                                                                        │  │
│  │  Estimate: L (5-8 days) | Priority: P0/P1                            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  PHASE 3: Request Processing                                          │  │
│  │  ───────────────────────────                                          │  │
│  │  • FR-007: Request Proxying                                           │  │
│  │  • FR-008: Request/Response Logging                                   │  │
│  │  • FR-009: Error Simulation                                           │  │
│  │  • FR-010: Security Scheme Normalization                              │  │
│  │                                                                        │  │
│  │  Estimate: M (3-5 days) | Priority: P0/P1                            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  PHASE 4: Process Management                                          │  │
│  │  ───────────────────────────                                          │  │
│  │  • FR-011: Process Isolation                                          │  │
│  │  • FR-012: Startup Coordination                                       │  │
│  │  • FR-013: Preserve Existing x-handler/x-seed                         │  │
│  │                                                                        │  │
│  │  Estimate: M (3-5 days) | Priority: P0/P1                            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  PHASE 5: Developer Experience                                        │  │
│  │  ─────────────────────────────                                        │  │
│  │  • FR-014: Hot Reload for Seeds/Handlers                              │  │
│  │  • FR-015: Vue DevTools Integration                                   │  │
│  │                                                                        │  │
│  │  Estimate: XL (8-13 days) | Priority: P1                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  TOTAL ESTIMATED EFFORT: 29-46 days (6-9 weeks)                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Phase 0: Project Setup & Skeleton

### 4.1 Overview

**Objective:** Establish the foundational project infrastructure including package management, tooling, build configuration, CI/CD, and skeleton packages.

**Dependencies:** None (starting point)

**Deliverables:**
- Fully configured monorepo with pnpm
- Biome.js for linting and formatting
- TypeScript configuration
- workspace-tools integration for versioning
- GitHub Actions workflows
- Plugin package skeleton
- Playground application skeleton

---

### 4.2 Task Breakdown

#### P0-01: Initialize Monorepo Structure

**Description:** Create the foundational directory structure for a pnpm monorepo workspace containing the plugin package, playground application, documentation, and CI/CD configuration. This establishes the physical layout that will house all subsequent development work.

**Context:**
- This is a **pnpm workspace monorepo** with two distinct workspace areas:
  - `packages/*` - Published npm packages (vite-plugin-open-api-server)
  - `playground/*` - Local development/testing applications (petstore-app)
- The structure follows pnpm workspace conventions where each workspace has its own package.json
- The `history/` directory already exists from previous planning work and should be verified
- The `.github/` directory will house GitHub Actions workflows for CI/CD automation

**Implementation Approach:**
1. Use `mkdir -p` to create nested directories in a single command
2. Create the complete path including `src/` subdirectories to avoid multiple commands
3. Verify existing directories (history) before creating to avoid conflicts
4. Use git to track empty directories by adding .gitkeep files if needed

**Estimate:** XS (0.5 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P0-01.1 | Create plugin package structure | Create `packages/vite-plugin-open-api-server/src` with subdirectories for `core/`, `handlers/`, `mock/`, `registry/`, `types/`, `utils/`. This establishes the modular architecture for the plugin codebase. |
| P0-01.2 | Create playground app structure | Create `playground/petstore-app/src` with subdirectories for `apis/petstore/` (OpenAPI specs and handlers). This provides the testing environment for the plugin. |
| P0-01.3 | Verify history directory | Confirm `history/` directory exists with `PRODUCT-REQUIREMENTS-SPECIFICATION.md` and `PLAN.md`. This directory was created in previous planning phases and must be preserved. |
| P0-01.4 | Create GitHub workflows directory | Create `.github/workflows/` to house `ci.yml` and `release.yml`. This enables automated testing and deployment via GitHub Actions. |
| P0-01.5 | Add .gitkeep files | Add `.gitkeep` to empty directories that need to be tracked in git (e.g., `src/` subdirectories before code exists). Git doesn't track empty directories by default. |

**Technical Considerations:**
- **pnpm workspace structure**: The packages/ and playground/ naming is conventional for pnpm monorepos
- **src/ subdirectories**: Pre-creating module directories (core/, handlers/, etc.) helps establish the architecture early
- **Git empty directories**: Without .gitkeep, git won't track empty directories, causing issues for other developers
- **Path separators**: Use forward slashes (/) even on Windows - they work cross-platform in mkdir -p

**Expected Outputs:**
```
vite-open-api-server/
├── .github/
│   └── workflows/          # Empty, ready for workflow files
├── packages/
│   └── vite-plugin-open-api-server/
│       └── src/
│           ├── core/       # Plugin core logic
│           ├── handlers/   # Handler loading/execution
│           ├── mock/       # Mock server integration
│           ├── registry/   # Endpoint registry
│           ├── types/      # TypeScript type definitions
│           └── utils/      # Utility functions
├── playground/
│   └── petstore-app/
│       └── src/
│           └── apis/
│               └── petstore/ # OpenAPI specs and custom handlers
└── history/                # Already exists, contains planning docs
    ├── PRODUCT-REQUIREMENTS-SPECIFICATION.md
    └── PLAN.md
```

**Acceptance Criteria:**
- [ ] Directory structure matches section 2.1 of this plan
- [ ] All directories created with correct nesting
- [ ] `.gitkeep` files added to empty directories
- [ ] `history/` directory verified and intact
- [ ] Structure committed to git with message: `chore(setup): initialize monorepo directory structure`
- [ ] Can run `tree` command and see the expected hierarchy

---

#### P0-02: Configure pnpm Workspace

**Description:** Configure pnpm as the monorepo package manager with workspace support, enabling efficient dependency management, workspace linking, and consistent Node.js versions across the project. This setup ensures that the plugin package and playground app can share dependencies while maintaining isolation, and that `workspace:*` protocol works correctly for internal package references.

**Context:**
- **pnpm workspace** is a monorepo management system that uses symlinks and a content-addressable store for efficient disk usage
- **Workspace protocol** (`workspace:*`) enables the playground app to consume the local plugin package during development
- **Node.js version pinning** ensures consistent runtime behavior across development environments and CI/CD
- **only-allow pnpm** prevents accidental use of npm/yarn which would break workspace linking
- pnpm uses a `.npmrc` file for configuration (hoisting, shamefully-hoist, etc.)

**Why pnpm over npm/yarn:**
- Faster installs (content-addressable store)
- Strict dependency resolution (no phantom dependencies)
- Native workspace protocol support
- Better monorepo support than npm/yarn v1

**Implementation Approach:**
1. Create `.npmrc` with hoisting disabled for strict dependency management
2. Create `pnpm-workspace.yaml` defining workspace package glob patterns
3. Create `.node-version` file (used by nvm, fnm, and CI/CD)
4. Add `preinstall` script to root package.json that enforces pnpm usage

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P0-02.1 | Create .npmrc | Create `.npmrc` file with `shamefully-hoist=false` to enforce strict dependency resolution and prevent phantom dependencies. Also set `auto-install-peers=true` for convenience and `strict-peer-dependencies=false` to avoid peer dependency conflicts during development. |
| P0-02.2 | Create pnpm-workspace.yaml | Create `pnpm-workspace.yaml` defining workspace globs: `packages/*` (published packages) and `playground/*` (development apps). This tells pnpm which directories contain workspace packages. |
| P0-02.3 | Create .node-version | Create `.node-version` file pinning Node.js to version `20.x` or `22.x` (latest LTS). This file is read by version managers (nvm, fnm, asdf) and GitHub Actions `setup-node@v4` with `node-version-file` parameter. |
| P0-02.4 | Add preinstall script | Add `"preinstall": "npx only-allow pnpm"` to root package.json scripts. This prevents accidental `npm install` or `yarn install` which would break workspace symlinks and create conflicting lock files. |

**Technical Considerations:**
- **shamefully-hoist=false**: Prevents hoisting all dependencies to root, enforcing proper dependency declarations
- **auto-install-peers=true**: Automatically installs peer dependencies to reduce manual work
- **workspace protocol**: Only works with pnpm workspaces, not with npm/yarn
- **only-allow**: Uses npx to run without requiring installation, checks package manager before install runs
- **.node-version format**: Single line with version number (e.g., `20` or `22.18.0`)

**Expected Outputs:**

`.npmrc`:
```
shamefully-hoist=false
auto-install-peers=true
strict-peer-dependencies=false
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
  - 'playground/*'
```

`.node-version`:
```
20
```

Root `package.json` (partial):
```json
{
  "scripts": {
    "preinstall": "npx only-allow pnpm"
  }
}
```

**File: `.npmrc`**
```ini
auto-install-peers=false
strict-peer-dependencies=false
shell-emulator=true
```

**File: `pnpm-workspace.yaml`**
```yaml
packages:
  - 'packages/*'
  - 'playground/*'
```

**File: `.node-version`**
```
22.12.0
```

**Acceptance Criteria:**
- [ ] `pnpm install` works from root
- [ ] Workspace packages are linked correctly
- [ ] `npm install` is blocked with helpful error

---

#### P0-03: Create Root package.json

**Description:** Configure the root package.json as the monorepo orchestration hub, defining workspace-wide scripts for development, building, testing, linting, and releasing. This file serves as the entry point for all monorepo operations and ensures consistent tooling across all workspace packages.

**Context:**
- **Root package.json** in a pnpm workspace is always private and never published
- **Workspace scripts** use pnpm's `-r` (recursive) and `--filter` flags to target specific packages
- **packageManager field** (introduced in Node.js 16.9+) enables Corepack to auto-install correct pnpm version
- **engines field** enforces minimum Node.js version, preventing incompatibility issues
- **type: "module"** enables ES modules by default across the monorepo
- Scripts must handle both development (watch mode) and production (build once) scenarios

**Why this structure:**
- `dev` script runs all packages in parallel with `--parallel` flag for faster feedback
- `build` script filters only `packages/*` to exclude playground from production builds
- `playground` script uses `--filter` to run only the petstore-app, not all playground apps
- `clean` script uses `exec` to run shell commands in each workspace package

**Implementation Approach:**
1. Create package.json with `name`, `private: true`, and `type: "module"`
2. Add `packageManager` field matching installed pnpm version (run `pnpm --version`)
3. Add `engines` field requiring Node.js 20.x or 22.x (matching .node-version)
4. Define scripts in order: preinstall, dev, build, test, lint, format, typecheck, playground, clean, changeset, release
5. Use consistent pnpm flags: `-r` for recursive, `--filter` for targeting, `--parallel` for concurrent execution

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P0-03.1 | Create package.json structure | Initialize root package.json with `name: "@websublime/vite-open-api-server-monorepo"`, `private: true`, `type: "module"`. Set `packageManager: "pnpm@10.x.x"` matching installed version. This establishes the monorepo identity and enables ES modules. |
| P0-03.2 | Add development scripts | Add scripts: `dev` (runs tsdown --watch in packages), `build` (builds packages only, not playground), `test` (runs vitest), `lint` (biome check), `format` (biome format), `typecheck` (tsc --noEmit). These provide consistent commands for development workflow. |
| P0-03.3 | Add workspace scripts | Add `playground: "pnpm --filter petstore-app dev"` to run only the playground app, `clean: "pnpm -r exec rm -rf dist node_modules"` to reset workspace. Also add `changeset` and `release` scripts for workspace-tools integration (will be configured in P0-07). |
| P0-03.4 | Configure engines field | Add `engines: { "node": "^20.19.0 || >=22.12.0" }` to enforce minimum Node.js version. This prevents developers from using incompatible Node versions and ensures CI/CD uses correct runtime. |

**Technical Considerations:**
- **--filter syntax**: `./packages/*` matches all packages in packages/, while `petstore-app` matches by package name
- **--parallel flag**: Only safe for independent scripts like `dev`; build scripts should run sequentially
- **exec command**: Runs raw shell commands in each workspace; alternative to defining scripts in each package.json
- **packageManager field**: Enables Corepack but requires Node.js 16.9+; harmless if Corepack not enabled
- **pnpm -r order**: Dependencies are built before dependents automatically

**Expected Outputs:**

Root `package.json`:
```json
{
  "name": "@websublime/vite-open-api-server-monorepo",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.27.0",
  "engines": {
    "node": "^20.19.0 || >=22.12.0"
  },
  "scripts": {
    "preinstall": "npx only-allow pnpm",
    "dev": "pnpm -r --parallel --filter='./packages/*' run dev",
    "build": "pnpm -r --filter='./packages/*' run build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "typecheck": "tsc --noEmit",
    "playground": "pnpm --filter petstore-app dev",
    "clean": "pnpm -r exec rm -rf dist node_modules",
    "changeset": "workspace changeset create",
    "release": "workspace bump --execute --git-tag --git-push"
  }
}
```

**Acceptance Criteria:**
- [ ] Root `package.json` created with all required fields
- [ ] `pnpm install` succeeds from root directory
- [ ] `pnpm dev` starts all package dev scripts in parallel
- [ ] `pnpm build` builds only packages (not playground)
- [ ] `pnpm test` runs test suite successfully (even if no tests yet)
- [ ] `pnpm lint` runs Biome check on entire codebase
- [ ] `pnpm typecheck` runs TypeScript compiler in check mode
- [ ] `pnpm playground` starts only the petstore-app
- [ ] `npm install` is blocked with error message from only-allow
- [ ] `yarn install` is blocked with error message from only-allow
- [ ] packageManager field matches installed pnpm version
- [ ] Committed with message: `chore(setup): add root package.json with workspace scripts`
- [ ] All scripts execute without error
- [ ] `pnpm dev` starts plugin watch mode
- [ ] `pnpm playground` starts Vite dev server

---

#### P0-04: Configure Biome.js

**Description:** Set up Biome.js v2.x as the unified linter and formatter for the monorepo, replacing the traditional ESLint + Prettier stack. Biome provides faster linting (written in Rust), built-in formatting, and automatic import organization in a single tool with zero configuration conflicts. This configuration enforces consistent code style across TypeScript, JavaScript, JSON, and other supported languages.

**Context:**
- **Biome v2.x** introduces breaking changes from v1.x, particularly in the `files` configuration schema
- **Why Biome over ESLint + Prettier:**
  - 10-100x faster (Rust vs JavaScript)
  - Single configuration file (no conflicts between tools)
  - Built-in formatter (no Prettier needed)
  - Native TypeScript support (no parser plugins)
  - Automatic import sorting (no need for separate plugin)
- **VCS Integration**: Biome 2.x can read `.gitignore` files to respect version control ignore patterns
- **Schema Changes in v2.x**: `files.ignore` replaced by `files.includes` with negated patterns (`!`)
- **IDE Support**: VS Code extension `biomejs.biome` provides real-time linting and formatting

**Why This Configuration:**
- **2 spaces indentation**: Standard for TypeScript/JavaScript ecosystems
- **Single quotes**: Preferred in modern JavaScript (less escaping in JSX/HTML)
- **Trailing commas**: Cleaner git diffs when adding array/object items
- **Line width 100**: Balance between readability and screen real estate
- **Strict linter rules**: Catch common errors early (noUnusedVariables, noUnusedImports)
- **Warning for complexity**: noExcessiveCognitiveComplexity helps identify code that needs refactoring

**Implementation Approach:**
1. Install `@biomejs/biome` as workspace dev dependency with `-Dw` flag
2. Create `biome.json` at monorepo root with JSON schema reference for IDE autocomplete
3. Configure VCS integration to respect `.gitignore` patterns automatically
4. Set up `files.includes` with negated patterns for node_modules, dist, .beads, markdown, and lock files
5. Configure formatter with 2 spaces, 100 line width, single quotes, and trailing commas
6. Enable `organizeImports` for automatic import sorting on format
7. Configure linter with `recommended: true` baseline plus custom rules for complexity, correctness, style, and suspicious patterns
8. Add JavaScript-specific formatter settings for quotes, semicolons, and arrow function parentheses

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P0-04.1 | Install Biome | Run `pnpm add -Dw @biomejs/biome` to install Biome as a workspace dev dependency. The `-Dw` flag installs to root workspace (not individual packages). Verify installation with `pnpm exec biome --version`. Expected version: 2.3.11 or later. |
| P0-04.2 | Create biome.json with schema | Create `biome.json` at repository root with `$schema` field pointing to `https://biomejs.dev/schemas/2.3.11/schema.json`. This enables IDE autocomplete and validation. The schema URL should match the installed Biome version for accurate IntelliSense. |
| P0-04.3 | Configure VCS and files | Add `vcs` section with `enabled: true`, `clientKind: "git"`, and `useIgnoreFile: true` to respect `.gitignore`. Configure `files.includes` array with `["**", "!node_modules", "!dist", "!.beads", "!*.md", "!pnpm-lock.yaml"]` and `ignoreUnknown: false`. The `**` pattern matches all files, then negated patterns exclude specific paths. |
| P0-04.4 | Configure formatter settings | Set `formatter.enabled: true`, `indentStyle: "space"`, `indentWidth: 2`, `lineWidth: 100`, `lineEnding: "lf"`. Enable `organizeImports.enabled: true` for automatic import sorting. These settings apply to all supported languages unless overridden. |
| P0-04.5 | Configure linter rules | Set `linter.enabled: true` and `rules.recommended: true` for baseline rules. Add custom rules: `complexity.noExcessiveCognitiveComplexity` (warn at 15), `correctness.noUnusedVariables` (error), `correctness.noUnusedImports` (error), `style.useConst` (error), `style.noVar` (error), `style.useTemplate` (warn), `suspicious.noExplicitAny` (warn), `suspicious.noConsoleLog` (warn). These catch common issues and enforce best practices. |
| P0-04.6 | Configure JavaScript-specific settings | Add `javascript.formatter` section with `quoteStyle: "single"`, `trailingCommas: "all"`, `semicolons: "always"`, `arrowParentheses: "always"`. These override global formatter settings for JavaScript/TypeScript files specifically. |
| P0-04.7 | Test configuration | Run `pnpm lint` to verify Biome can check the codebase. Run `pnpm format` to test formatting. Both should execute without errors. Check that negated patterns are working by verifying `node_modules/` is not checked. |
| P0-04.8 | Install IDE extension | Install `biomejs.biome` VS Code extension for real-time linting and format-on-save. Verify extension uses workspace `biome.json` configuration. Test by opening a TypeScript file and triggering format (Shift+Alt+F on Windows/Linux, Shift+Option+F on macOS). |

**File: `biome.json`**
```json
{
  "$schema": "https://biomejs.dev/schemas/2.3.11/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "includes": [
      "**",
      "!node_modules",
      "!dist",
      "!.beads",
      "!*.md",
      "!pnpm-lock.yaml"
    ],
    "ignoreUnknown": false
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExcessiveCognitiveComplexity": {
          "level": "warn",
          "options": {
            "maxAllowedComplexity": 15
          }
        }
      },
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error"
      },
      "style": {
        "useConst": "error",
        "noVar": "error",
        "useTemplate": "warn"
      },
      "suspicious": {
        "noExplicitAny": "warn",
        "noConsoleLog": "warn"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "always",
      "arrowParentheses": "always"
    }
  }
}
```

**Technical Considerations:**
- **Biome 2.x breaking changes**: The `files.ignore` array was replaced by `files.includes` with negated patterns. Old v1.x configs will not work.
- **Pattern matching order**: In `files.includes`, the `**` pattern must come first, then negated patterns. Order matters - later patterns can override earlier ones.
- **Force-ignore syntax**: Use `!!` prefix (e.g., `!!**/dist`) to prevent scanner from indexing directories at all. Regular `!` still allows indexing for type inference.
- **VCS integration**: When `useIgnoreFile: true`, Biome reads `.gitignore` files recursively. This can conflict with `files.includes` if not careful.
- **Schema versioning**: The `$schema` URL should match the installed Biome version. Mismatch causes incorrect IDE autocomplete.
- **Line ending normalization**: `lineEnding: "lf"` ensures consistent line endings across Windows/macOS/Linux, preventing git diff noise.
- **organizeImports behavior**: Sorts imports alphabetically and removes unused ones. Runs automatically with `biome format --write`.
- **Rule severity levels**: `"error"` (exit code 1, fails CI), `"warn"` (exit code 0, informational), `"off"` (disabled), `"info"` (lowest priority).
- **JavaScript-specific overrides**: Settings in `javascript.formatter` override global `formatter` settings for .js, .jsx, .ts, .tsx files only.
- **Performance**: Biome is ~10-100x faster than ESLint because it's written in Rust and uses parallel processing.

**Expected Outputs:**

After completing this task:

1. **Installed package**:
   ```bash
   $ pnpm list @biomejs/biome
   @websublime/vite-open-api-server-monorepo
   └── @biomejs/biome@2.3.11 (dev)
   ```

2. **biome.json file**: Full configuration as shown above (see File section)

3. **Working commands**:
   ```bash
   $ pnpm lint
   # Runs biome check on entire codebase
   # Output: "✔ No errors found"
   
   $ pnpm format
   # Runs biome format --write on all files
   # Output: "Formatted X files"
   
   $ pnpm lint:fix
   # Runs biome check --write to auto-fix issues
   # Output: "Fixed X issues"
   ```

4. **IDE integration**: VS Code shows Biome diagnostics in real-time, format-on-save works

5. **Git ignore respected**: `node_modules/`, `dist/`, `.beads/` are automatically excluded from checking

**Acceptance Criteria:**
- [ ] `@biomejs/biome` installed as dev dependency in root package.json
- [ ] `biome.json` created at repository root with all sections configured
- [ ] `$schema` field points to correct Biome 2.x schema URL
- [ ] `files.includes` uses negated patterns (not `files.ignore`)
- [ ] `pnpm lint` executes successfully with no errors on empty/skeleton codebase
- [ ] `pnpm format` runs and reports "Formatted 0 files" or formats only biome.json itself
- [ ] `pnpm lint:fix` can auto-fix issues when code violations are introduced
- [ ] VCS integration works: files in `.gitignore` are not checked by Biome
- [ ] `node_modules/` directory is excluded from Biome checks
- [ ] `dist/` directory is excluded from Biome checks
- [ ] `.beads/` directory is excluded from Biome checks
- [ ] Markdown files (*.md) are excluded from Biome checks
- [ ] `pnpm-lock.yaml` is excluded from Biome checks
- [ ] Formatter uses 2 spaces for indentation (verify by formatting a .ts file)
- [ ] Formatter uses single quotes for strings (verify in formatted JavaScript)
- [ ] Formatter adds trailing commas in arrays/objects (verify in formatted code)
- [ ] Line width is 100 characters (verify long lines wrap at 100)
- [ ] Import sorting works: `organizeImports` runs when formatting
- [ ] Linter catches unused variables (test by adding `const unused = 1;`)
- [ ] Linter catches unused imports (test by importing something not used)
- [ ] Linter warns on `console.log` statements (test by adding one)
- [ ] Linter warns on `any` type (test by adding `: any` annotation)
- [ ] IDE extension installed and active in VS Code
- [ ] IDE shows real-time Biome diagnostics as you type
- [ ] Format-on-save works in IDE (test by saving a poorly formatted file)
- [ ] Committed with message: `chore(tooling): configure Biome.js v2.x for linting and formatting`

---

#### P0-05: Create .editorconfig

**Description:** Configure EditorConfig to provide baseline editor settings that work across all IDEs and editors (VS Code, IntelliJ, Vim, etc.). While Biome handles code formatting, EditorConfig ensures consistent settings for files Biome doesn't process (Markdown, Makefiles, etc.) and provides fallback settings for editors without Biome integration. This is especially important for non-JavaScript files and for developers who haven't installed the Biome extension.

**Context:**
- **EditorConfig** is a universal standard supported by all major editors via plugins or native support
- **Relationship with Biome**: EditorConfig provides editor-level settings (indent, line endings), while Biome provides language-specific formatting. They complement each other.
- **Biome's `useEditorconfig` option**: Set to `false` in our biome.json because Biome's settings take precedence. EditorConfig is for non-Biome files and editors without Biome.
- **Why still use EditorConfig with Biome:**
  - Handles files Biome doesn't support (Markdown, shell scripts, etc.)
  - Provides fallback for editors without Biome extension
  - Works in git commit messages, diff views, etc.
  - Standard that all team members' editors understand
- **File format**: INI-style with sections for glob patterns

**Why This Configuration:**
- **root = true**: Stops EditorConfig from searching parent directories for more config files
- **charset = utf-8**: Ensures all files use UTF-8 encoding (international character support)
- **indent_style = space**: Matches Biome configuration, prevents tab/space mixing
- **indent_size = 2**: Standard for modern JavaScript/TypeScript, matches Biome
- **end_of_line = lf**: Unix-style line endings, matches Biome's `lineEnding: "lf"`
- **insert_final_newline = true**: POSIX standard, prevents git diff issues
- **trim_trailing_whitespace = true**: Cleaner diffs, prevents whitespace-only changes
- **[*.md] exception**: Markdown uses trailing spaces for line breaks (two spaces = `<br>`)
- **Makefile exception**: Makefiles REQUIRE tabs for indentation (Make syntax)

**Implementation Approach:**
1. Create `.editorconfig` file at repository root (same level as package.json)
2. Add `root = true` as first line to prevent config inheritance
3. Add `[*]` section with universal settings for all files
4. Add `[*.md]` section to disable `trim_trailing_whitespace` for Markdown
5. Add `[*.{yaml,yml}]` section to explicitly set 2-space indentation for YAML
6. Add `[Makefile]` section to enforce tab indentation (required by Make)
7. Verify editor picks up settings by opening a new file and checking indent behavior

**Estimate:** XS (0.5 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P0-05.1 | Create .editorconfig structure | Create `.editorconfig` file at repository root with `root = true` and `[*]` section containing universal settings: `charset = utf-8`, `indent_style = space`, `indent_size = 2`, `end_of_line = lf`, `insert_final_newline = true`, `trim_trailing_whitespace = true`. These apply to all files by default. |
| P0-05.2 | Add Markdown exception | Add `[*.md]` section with `trim_trailing_whitespace = false`. Markdown uses two trailing spaces to indicate a line break (`<br>` tag), so trimming would break formatting. This overrides the global `trim_trailing_whitespace = true` for .md files only. |
| P0-05.3 | Add YAML explicit settings | Add `[*.{yaml,yml}]` section with `indent_size = 2`. While this matches the global setting, explicitly defining it for YAML files documents the intent and prevents issues if global defaults change. YAML is sensitive to indentation. |
| P0-05.4 | Add Makefile exception | Add `[Makefile]` section with `indent_style = tab`. Makefiles REQUIRE tab characters for indentation (Make syntax rule). Using spaces causes "missing separator" errors. This overrides the global `indent_style = space` for Makefiles only. |
| P0-05.5 | Test editor integration | Open various file types in the editor to verify EditorConfig is working: create a new .js file (should use 2 spaces), create a new .md file (trailing spaces preserved), create a Makefile (should use tabs). Check status bar for indent settings. |

**File: `.editorconfig`**
```ini
root = true

[*]
charset = utf-8
indent_style = space
indent_size = 2
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false

[*.{yaml,yml}]
indent_size = 2

[Makefile]
indent_style = tab
```

**Technical Considerations:**
- **EditorConfig vs Biome priority**: When both are present, Biome's formatter takes precedence for files it processes. EditorConfig provides baseline for everything else.
- **Editor support**: Most modern editors support EditorConfig natively or via plugin. VS Code requires the "EditorConfig for VS Code" extension, IntelliJ has native support.
- **Git integration**: `end_of_line = lf` prevents Windows-style CRLF from being committed, which would cause git diff noise across platforms.
- **insert_final_newline**: POSIX standard requires text files to end with a newline. Missing newlines cause warnings in many Unix tools.
- **Markdown trailing spaces**: Markdown uses `  \n` (two spaces + newline) for `<br>` tags. Trimming these breaks rendering.
- **Makefile tabs requirement**: GNU Make's syntax requires literal tab characters before commands. Spaces cause "*** missing separator" errors.
- **YAML indentation sensitivity**: YAML syntax is whitespace-dependent. Incorrect indentation breaks parsing. Always use spaces, never tabs.
- **Glob pattern syntax**: `[*.{yaml,yml}]` matches both extensions. `[*]` matches all files. More specific patterns override general ones.
- **root = true importance**: Without this, EditorConfig searches parent directories, potentially inheriting unwanted settings from user's home directory.

**Expected Outputs:**

After completing this task:

1. **.editorconfig file**: Created at repository root with all sections as shown above

2. **Editor behavior changes**:
   ```
   New .js file   → Auto-indents with 2 spaces
   New .ts file   → Auto-indents with 2 spaces
   New .md file   → Preserves trailing spaces
   New .yaml file → Auto-indents with 2 spaces
   New Makefile   → Auto-indents with tabs
   ```

3. **Status bar indicators**: Most editors show indent settings in status bar (e.g., "Spaces: 2" or "Tab Size: 2")

4. **Git behavior**: Line endings normalized to LF on commit, final newlines added automatically

**Acceptance Criteria:**
- [ ] `.editorconfig` file created at repository root (same directory as package.json)
- [ ] `root = true` is first line in file
- [ ] `[*]` section defines global defaults for all files
- [ ] `charset = utf-8` set for international character support
- [ ] `indent_style = space` matches Biome configuration
- [ ] `indent_size = 2` matches Biome's `indentWidth: 2`
- [ ] `end_of_line = lf` matches Biome's `lineEnding: "lf"`
- [ ] `insert_final_newline = true` ensures POSIX compliance
- [ ] `trim_trailing_whitespace = true` prevents whitespace-only changes in diffs
- [ ] `[*.md]` section disables trailing whitespace trimming for Markdown
- [ ] `[*.{yaml,yml}]` section explicitly sets 2-space indentation for YAML
- [ ] `[Makefile]` section enforces tab indentation
- [ ] EditorConfig extension/plugin installed in VS Code (or native support in other IDEs)
- [ ] Opening a new .js file uses 2 spaces for indentation (verify in editor status bar)
- [ ] Opening a new .ts file uses 2 spaces for indentation
- [ ] Opening a new .md file preserves trailing spaces when typing
- [ ] Opening a new Makefile uses tab characters for indentation
- [ ] Creating a file and saving adds a final newline automatically
- [ ] Files are saved with LF line endings regardless of OS (verify with `file` command or hex editor)
- [ ] Settings are consistent with Biome configuration (no conflicts)
- [ ] Committed with message: `chore(tooling): add .editorconfig for cross-editor consistency`

---

#### P0-06: Configure TypeScript

**Description:** Configure TypeScript with a shared base configuration at the monorepo root and specialized configurations for each package (plugin and playground). This establishes strict type checking, enables declaration file generation for the published plugin package, and provides IDE support with IntelliSense. The configuration uses modern TypeScript features (ES2023 target, module preservation, bundler resolution) optimized for Vite and tsdown build tools.

**Context:**
- **TypeScript configuration inheritance**: Child tsconfig.json files extend the root config using `extends` field, inheriting all settings and overriding only what's needed
- **Why `module: "preserve"`**: Preserves the original module format (ESM/CJS) from source code, letting bundlers (Vite, tsdown) handle module transformation
- **Why `moduleResolution: "bundler"`**: TypeScript 5.0+ option that matches modern bundler behavior (Vite, Rollup, esbuild), enabling package.json `exports` field resolution
- **Strict mode**: Enables all strict type checking options, catching more errors at compile time
- **Declaration files**: The plugin package needs `.d.ts` files for TypeScript consumers to get type information
- **Source maps**: Enable debugging in production with original TypeScript source code
- **isolatedModules**: Required for build tools that transpile files individually (tsdown, esbuild) without full TypeScript compiler
- **Build tool**: Using `tsdown` (not `tsc`) for the plugin package build, but `tsc --noEmit` for type checking

**Why This Configuration:**
- **target: ES2023**: Modern JavaScript features (top-level await, etc.), supported by Node.js 20+
- **strict: true**: Enables all strict checks (strictNullChecks, strictFunctionTypes, etc.)
- **noUnusedLocals/Parameters**: Catches dead code, enforced by linter but also caught by compiler
- **skipLibCheck: true**: Faster compilation by skipping type checking of declaration files in node_modules
- **resolveJsonModule: true**: Allows importing JSON files with type inference
- **esModuleInterop: true**: Better compatibility with CommonJS modules when using ESM imports
- **forceConsistentCasingInFileNames: true**: Prevents case-sensitivity issues across different operating systems

**Implementation Approach:**
1. Install TypeScript as workspace dev dependency with version 5.9+ (supports all modern features)
2. Create root `tsconfig.json` with base compiler options that apply to all packages
3. Create `packages/vite-plugin-open-api-server/tsconfig.json` extending root, adding Node.js types and output paths
4. Create `playground/petstore-app/tsconfig.json` extending root, adding Vue and DOM types
5. Verify type checking works with `pnpm typecheck` from root
6. Verify IDE picks up configurations and shows proper IntelliSense

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P0-06.1 | Install TypeScript | Run `pnpm add -Dw typescript@^5.9.0` to install TypeScript as workspace dev dependency. Version 5.9+ is required for `moduleResolution: "bundler"` and other modern features. The `-Dw` flag installs to root workspace devDependencies. Verify installation with `pnpm exec tsc --version`. |
| P0-06.2 | Create root tsconfig.json | Create `tsconfig.json` at repository root with base compiler options: `target: "ES2023"`, `module: "preserve"`, `moduleResolution: "bundler"`, `strict: true`, and strict checking options. Add `exclude: ["node_modules", "dist"]` to prevent TypeScript from checking build artifacts and dependencies. This config is inherited by all packages. |
| P0-06.3 | Create plugin tsconfig.json | Create `packages/vite-plugin-open-api-server/tsconfig.json` extending root config with `extends: "../../tsconfig.json"`. Add plugin-specific options: `outDir: "dist"`, `rootDir: "src"`, `lib: ["ES2023"]`, `types: ["node"]`. Set `include: ["src"]` to only check source files. Exclude test files with `exclude: ["**/*.spec.ts", "**/*.test.ts"]`. This configuration is used by tsdown for building and by IDE for type checking. |
| P0-06.4 | Create playground tsconfig.json | Create `playground/petstore-app/tsconfig.json` extending root config. Add Vue-specific options: `lib: ["ES2023", "DOM", "DOM.Iterable"]` for browser APIs, `types: ["vite/client"]` for Vite environment types. Set `include: ["src/**/*.ts", "src/**/*.vue"]` to check both TypeScript and Vue SFC files. Add `skipLibCheck: true` to skip checking Vue library types (improves performance). |
| P0-06.5 | Test type checking | Run `pnpm typecheck` from root to verify TypeScript compiles without errors. This runs `tsc --noEmit` which type-checks all files without generating output. Fix any initial type errors (there shouldn't be any with skeleton code). Verify IDE shows no TypeScript errors in the Problems panel. |
| P0-06.6 | Verify IDE integration | Open various TypeScript files in VS Code to verify IntelliSense works: hover over types shows documentation, Ctrl+Space shows completions, F12 goes to definition. Check that errors appear in real-time as you type. Verify that imports are auto-completed with correct paths. |

**File: `tsconfig.json` (root)**
```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "preserve",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "exclude": ["node_modules", "dist"]
}
```

**File: `packages/vite-plugin-open-api-server/tsconfig.json`**
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "lib": ["ES2023"],
    "types": ["node"]
  },
  "include": ["src"],
  "exclude": ["**/*.spec.ts", "**/*.test.ts"]
}
```

**Technical Considerations:**
- **module: "preserve" vs "esnext"**: `preserve` is newer and lets bundlers handle module resolution, while `esnext` might transform modules prematurely
- **moduleResolution: "bundler" vs "node16"**: `bundler` matches how Vite/Rollup resolve modules, `node16` matches pure Node.js resolution (doesn't understand `exports` field well)
- **isolatedModules requirement**: tsdown and esbuild transpile files independently, so each file must be valid without cross-file type information
- **skipLibCheck trade-off**: Faster compilation but might miss type errors in dependencies. Acceptable since we trust well-maintained packages.
- **declaration and declarationMap**: Both must be true for published packages to provide TypeScript support and source map debugging
- **lib array**: Determines which built-in APIs are available. Plugin uses only ES2023 (no DOM), playground uses ES2023 + DOM + DOM.Iterable
- **types array**: Explicitly lists ambient type packages to include. `node` for Node.js globals, `vite/client` for import.meta.env
- **rootDir importance**: Ensures output directory structure matches source structure. Without it, TypeScript might create nested dist folders
- **extends path resolution**: Relative paths from the child config file. `../../tsconfig.json` goes up two levels from package to root

**Expected Outputs:**

After completing this task:

1. **Installed TypeScript**:
   ```bash
   $ pnpm list typescript
   @websublime/vite-open-api-server-monorepo
   └── typescript@5.9.3 (dev)
   ```

2. **Root tsconfig.json**: Base configuration at repository root (see File section below)

3. **Plugin tsconfig.json**: At `packages/vite-plugin-open-api-server/tsconfig.json` (see File section below)

4. **Playground tsconfig.json**: At `playground/petstore-app/tsconfig.json` with Vue types

5. **Working typecheck command**:
   ```bash
   $ pnpm typecheck
   # Runs tsc --noEmit on entire codebase
   # Output: No errors when successful (exit code 0)
   ```

6. **IDE features**:
   - IntelliSense shows type information on hover
   - Auto-complete suggests methods/properties with types
   - F12 (Go to Definition) works for all symbols
   - Inline errors show for type mismatches
   - Import paths auto-completed

**Acceptance Criteria:**
- [ ] TypeScript ^5.9.0 installed as workspace dev dependency in root package.json
- [ ] Root `tsconfig.json` created with base compiler options
- [ ] Root config uses `target: "ES2023"` for modern JavaScript
- [ ] Root config uses `module: "preserve"` to preserve original module format
- [ ] Root config uses `moduleResolution: "bundler"` for Vite compatibility
- [ ] Root config has `strict: true` enabling all strict checks
- [ ] Root config has `declaration: true` and `declarationMap: true` for .d.ts generation
- [ ] Root config has `sourceMap: true` for debugging support
- [ ] Root config has `isolatedModules: true` for tsdown/esbuild compatibility
- [ ] Root config excludes `node_modules` and `dist` directories
- [ ] Plugin `tsconfig.json` created in `packages/vite-plugin-open-api-server/`
- [ ] Plugin config extends root with `extends: "../../tsconfig.json"`
- [ ] Plugin config sets `outDir: "dist"` and `rootDir: "src"`
- [ ] Plugin config includes `types: ["node"]` for Node.js globals
- [ ] Plugin config includes only `src` directory
- [ ] Plugin config excludes test files (`**/*.spec.ts`, `**/*.test.ts`)
- [ ] Playground `tsconfig.json` created in `playground/petstore-app/`
- [ ] Playground config extends root config
- [ ] Playground config includes `lib: ["ES2023", "DOM", "DOM.Iterable"]` for browser APIs
- [ ] Playground config includes `types: ["vite/client"]` for Vite types
- [ ] Playground config includes Vue files in `include` array
- [ ] `pnpm typecheck` executes successfully with no errors (exit code 0)
- [ ] `tsc --version` shows TypeScript 5.9+ installed
- [ ] IDE (VS Code) shows no TypeScript errors in Problems panel
- [ ] IntelliSense works: hovering over variables shows type information
- [ ] Auto-complete works: Ctrl+Space shows relevant suggestions
- [ ] Go to Definition (F12) navigates to source files correctly
- [ ] Import paths are auto-completed with proper relative paths
- [ ] Type errors appear in real-time as you type in the IDE
- [ ] Declaration files (.d.ts) will be generated by tsdown build (verified in later tasks)
- [ ] Committed with message: `chore(tooling): configure TypeScript with strict checking and declaration files`

---

#### P0-07: Configure workspace-tools

**Description:** Set up workspace-tools for changeset-based versioning and automated release management using a changeset-based workflow. workspace-tools is a Rust-based CLI tool from WebSublime that provides conventional commit parsing, semantic versioning, changelog generation, and Git tag automation for monorepos. This replaces traditional tools like Changesets or Lerna with a more modern, performant solution that integrates with GitHub Actions for fully automated releases.

**Context:**
- **workspace-tools** is a Rust CLI tool (`workspace` command) that manages versions, changelogs, and releases in monorepos
- **Changeset workflow**: Developers create changeset files describing changes, then workspace-tools reads these to bump versions and generate changelogs
- **Why workspace-tools over Changesets**: Built specifically for pnpm workspaces, faster (Rust), better conventional commit support, integrates with CI/CD
- **Installation**: Binary installed via shell script (not npm package), added to PATH automatically
- **Configuration**: Uses `repo.config.toml` file at repository root for versioning strategy, changelog settings, and git behavior
- **Independent versioning**: Each package gets its own version (vs fixed versioning where all packages share one version)
- **Conventional commits**: Uses commit message format (feat, fix, chore, etc.) to determine version bumps (major, minor, patch)
- **GitHub integration**: Creates git tags, pushes to GitHub, and can trigger GitHub releases via workflow

**Why This Configuration:**
- **strategy = "independent"**: Each package (plugin, playground) versions independently, allowing plugin to release without playground changes
- **pre_release_tag = "beta"**: Pre-releases use `-beta.X` suffix (e.g., 1.0.0-beta.1) for testing before stable release
- **tag_prefix = "v"**: Git tags use "v" prefix (e.g., v1.0.0) which is conventional and GitHub-friendly
- **changelog enabled**: Auto-generates CHANGELOG.md from changeset descriptions and conventional commits
- **conventional template**: Uses conventional commit format for changelog structure (Features, Bug Fixes, etc.)
- **push_tags = true**: Automatically pushes tags to remote after creating them
- **sign_commits = false**: Doesn't require GPG signing (can be enabled per-developer in their git config)

**Implementation Approach:**
1. Install workspace-tools binary using the official installation script (downloads from GitHub releases)
2. Verify installation by running `workspace --version`
3. Run `workspace init` to create initial `repo.config.toml` with defaults
4. Edit `repo.config.toml` to customize versioning strategy, changelog settings, and git behavior
5. Create `.changesets/` directory to store changeset files (git-tracked)
6. Add `workspace changeset create` and `workspace bump` commands to root package.json scripts
7. Create CONTRIBUTING.md documenting the changeset workflow for developers
8. Test the workflow by creating a test changeset and running `workspace bump --dry-run`

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P0-07.1 | Install workspace-tools binary | Download and install workspace-tools using the official installation script: `curl --proto '=https' --tlsv1.2 -LsSf https://github.com/websublime/workspace-tools/releases/latest/download/sublime_cli_tools-installer.sh \| sh`. This installs the `workspace` command to `~/.cargo/bin/` (or equivalent) and adds it to PATH. Verify installation with `workspace --version`. Expected output: version 0.x.x or later. |
| P0-07.2 | Initialize workspace configuration | Run `workspace init` from repository root to create initial `repo.config.toml` file with default settings. This interactive command asks questions about versioning strategy, changelog preferences, and git settings. Choose "independent" for versioning strategy, enable changelog generation, and configure git tag settings. |
| P0-07.3 | Customize repo.config.toml | Edit the generated `repo.config.toml` to set: `strategy = "independent"`, `environments = ["development", "staging", "production"]`, `pre_release_tag = "beta"`, `tag_prefix = "v"`, `changelog.enabled = true`, `changelog.template = "conventional"`, `git.push_tags = true`, `git.sign_commits = false`. This configuration enables independent versioning per package, conventional changelog generation, and automatic tag pushing. |
| P0-07.4 | Create .changesets directory | Create `.changesets/` directory at repository root to store changeset files. Add a `.gitignore` inside with empty content (to track the directory in git). Changeset files are JSON files created by `workspace changeset create` that describe changes and version bump types (major/minor/patch). |
| P0-07.5 | Add workspace scripts | Update root `package.json` scripts section with `"changeset": "workspace changeset create"` and `"release": "workspace bump --execute --git-tag --git-push"`. The `changeset` script creates new changeset files interactively, while `release` bumps versions, updates changelogs, creates git tags, and pushes to remote. |
| P0-07.6 | Document changeset workflow | Create `CONTRIBUTING.md` at repository root documenting the development workflow: 1) Make changes, 2) Run `pnpm changeset` to create changeset file, 3) Commit changes including changeset file, 4) On main branch merge, CI runs `pnpm release` to publish. Include examples of changeset creation and explain bump types (major, minor, patch). |
| P0-07.7 | Test workspace-tools | Run `workspace changeset create --help` to verify command works. Create a test changeset with `workspace changeset create`, choosing "patch" bump type and entering a description. Verify `.changesets/` contains a new JSON file. Run `workspace bump --dry-run` to see what would be bumped without making changes. Clean up test changeset afterward. |

**File: `repo.config.toml`**
```toml
[workspace]
strategy = "independent"
environments = ["development", "staging", "production"]

[versioning]
pre_release_tag = "beta"
tag_prefix = "v"

[changelog]
enabled = true
template = "conventional"

[git]
push_tags = true
sign_commits = false
```

**Technical Considerations:**
- **Installation method**: workspace-tools is a Rust binary, not an npm package. It's installed system-wide, not per-project.
- **PATH configuration**: The installer adds `~/.cargo/bin/` to PATH. May require shell restart or manual PATH update.
- **Platform support**: Supports macOS, Linux, and Windows. On Windows, uses PowerShell installer instead of shell script.
- **Independent vs Fixed versioning**: "independent" allows packages to version separately, "fixed" keeps all packages in sync (like Lerna).
- **Changeset file format**: JSON files with structure `{ "packages": ["pkg-name"], "type": "major|minor|patch", "description": "..." }`
- **Version bump determination**: workspace-tools reads all changesets in `.changesets/`, aggregates them per package, and bumps to highest bump type
- **Changelog generation**: Uses conventional commit format (## Features, ## Bug Fixes, ## Breaking Changes) automatically
- **Git tag format**: Tags follow semver with optional prefix (e.g., `v1.0.0`, `pkg-name@1.0.0` for multi-package monorepos)
- **Pre-release workflow**: Use `--pre-release` flag with bump command to create beta versions (1.0.0-beta.1, 1.0.0-beta.2, etc.)
- **Dry-run mode**: `--dry-run` flag shows what would happen without making changes (useful for testing)
- **CI/CD integration**: GitHub Actions workflow will use `workspace bump --execute` to perform automated releases
- **Conventional commit parsing**: workspace-tools can also generate changelogs from git history if changesets aren't used

**Expected Outputs:**

After completing this task:

1. **Installed workspace command**:
   ```bash
   $ workspace --version
   workspace 0.x.x
   
   $ which workspace
   /Users/username/.cargo/bin/workspace
   ```

2. **repo.config.toml**: Configuration file at repository root (see File section above)

3. **.changesets/ directory**: Empty directory for changeset files, tracked in git

4. **Updated package.json scripts**:
   ```json
   {
     "scripts": {
       "changeset": "workspace changeset create",
       "release": "workspace bump --execute --git-tag --git-push"
     }
   }
   ```

5. **CONTRIBUTING.md**: Documentation explaining changeset workflow:
   ```markdown
   ## Changeset Workflow
   
   1. Make your changes
   2. Run `pnpm changeset` to create a changeset
   3. Choose bump type (major/minor/patch)
   4. Write a description of changes
   5. Commit the changeset file along with your changes
   6. On merge to main, CI automatically runs `pnpm release`
   ```

6. **Working commands**:
   ```bash
   $ pnpm changeset
   # Interactive prompt to create changeset
   
   $ workspace bump --dry-run
   # Shows version changes without modifying files
   ```

**Acceptance Criteria:**
- [ ] workspace-tools binary installed successfully (verify with `workspace --version`)
- [ ] `workspace` command available in PATH (verify with `which workspace` or `where workspace` on Windows)
- [ ] Installation script completed without errors
- [ ] `repo.config.toml` created at repository root
- [ ] `repo.config.toml` has `[workspace]` section with `strategy = "independent"`
- [ ] `repo.config.toml` has `[versioning]` section with `pre_release_tag = "beta"` and `tag_prefix = "v"`
- [ ] `repo.config.toml` has `[changelog]` section with `enabled = true` and `template = "conventional"`
- [ ] `repo.config.toml` has `[git]` section with `push_tags = true` and `sign_commits = false`
- [ ] `.changesets/` directory created at repository root
- [ ] `.changesets/` directory is tracked in git (contains .gitkeep or empty .gitignore)
- [ ] Root `package.json` has `changeset` script pointing to `workspace changeset create`
- [ ] Root `package.json` has `release` script pointing to `workspace bump --execute --git-tag --git-push`
- [ ] `CONTRIBUTING.md` created with changeset workflow documentation
- [ ] `CONTRIBUTING.md` explains major/minor/patch bump types
- [ ] `CONTRIBUTING.md` includes example of creating a changeset
- [ ] `CONTRIBUTING.md` explains CI/CD automated release process
- [ ] `pnpm changeset` command executes successfully (prompts for input)
- [ ] `workspace changeset create --help` shows help text
- [ ] Can create a test changeset file successfully
- [ ] Changeset file appears in `.changesets/` directory with .json extension
- [ ] `workspace bump --dry-run` executes without errors
- [ ] `workspace bump --dry-run` shows which packages would be bumped and to what versions
- [ ] `workspace bump --dry-run` doesn't modify any files (dry-run mode)
- [ ] Test changeset can be deleted cleanly
- [ ] `workspace changeset list --json` shows available changesets
- [ ] Committed with message: `chore(tooling): configure workspace-tools for changeset-based releases`

---

#### P0-08: Create GitHub Workflow - CI

**Description:** Set up a comprehensive continuous integration (CI) workflow using GitHub Actions that runs on every pull request and push to the main branch. This workflow ensures code quality by running linting (Biome), type checking (TypeScript), testing (Vitest), and building (tsdown) in parallel jobs. The workflow uses caching to speed up dependency installation and includes concurrency controls to cancel outdated runs when new commits are pushed.

**Context:**
- **GitHub Actions** is GitHub's native CI/CD platform that runs workflows on GitHub-hosted runners (Ubuntu, macOS, Windows)
- **Workflow triggers**: `on.push` runs on every commit to main branch, `on.pull_request` runs on every PR update
- **Concurrency control**: `concurrency` with `cancel-in-progress: true` stops old runs when new commits pushed, saving CI minutes
- **Job parallelization**: Multiple jobs (lint, typecheck, test, build) run in parallel for faster feedback (typical run time: 2-4 minutes)
- **Caching strategy**: pnpm's store cache persists between runs, dramatically speeding up `pnpm install` (30s → 10s)
- **Node.js version**: Uses `.node-version` file for consistency with local development
- **Actions used**:
  - `actions/checkout@v4`: Checks out repository code
  - `pnpm/action-setup@v4`: Installs pnpm package manager
  - `actions/setup-node@v4`: Installs Node.js with caching support
- **Why separate jobs**: Parallel execution is faster than sequential, and GitHub shows per-job status (easier to identify failures)

**Why This Configuration:**
- **ubuntu-latest runner**: Fastest and cheapest GitHub-hosted runner (Linux)
- **Separate lint/typecheck/test jobs**: Failures are easier to diagnose when separated
- **Build job depends on others**: Uses `needs: [lint, typecheck, test]` to only build if quality gates pass
- **Frozen lockfile**: `pnpm install --frozen-lockfile` ensures reproducible installs, fails if lockfile is out of sync
- **Checkout v4**: Latest version with better performance and Node.js 20 support
- **pnpm action v4**: Latest version supporting pnpm 10.x

**Implementation Approach:**
1. Create `.github/workflows/` directory if not exists (from P0-01)
2. Create `ci.yml` file with workflow name and trigger configuration
3. Add `concurrency` section with group and cancel-in-progress settings
4. Create `lint` job with steps: checkout, install pnpm, setup Node.js, install deps, run Biome
5. Create `typecheck` job (parallel to lint) with steps: checkout, install pnpm, setup Node.js, install deps, run tsc
6. Create `test` job (parallel to lint) with steps: checkout, install pnpm, setup Node.js, install deps, run vitest
7. Create `build` job with `needs` dependency on other jobs, runs pnpm build
8. Configure pnpm caching using `actions/setup-node@v4` cache parameter
9. Test workflow by pushing to a branch and creating a PR

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P0-08.1 | Create ci.yml structure | Create `.github/workflows/ci.yml` file with workflow name "CI", triggers on `push.branches: [main]` and `pull_request.branches: [main]`, and concurrency group `${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true`. This ensures the workflow runs on PRs and main branch commits, and cancels outdated runs automatically. |
| P0-08.2 | Create lint job | Add `lint` job running on `ubuntu-latest` with steps: 1) `actions/checkout@v4` to clone repo, 2) `pnpm/action-setup@v4` with `version: 10` to install pnpm, 3) `actions/setup-node@v4` with `node-version-file: '.node-version'` and `cache: 'pnpm'` for Node.js and caching, 4) `pnpm install --frozen-lockfile` to install dependencies, 5) `pnpm lint` to run Biome check. This job validates code style and catches linter errors. |
| P0-08.3 | Create typecheck job | Add `typecheck` job (parallel to lint) with same initial steps as lint, but running `pnpm typecheck` instead of `pnpm lint`. This job validates TypeScript types without generating build output. It runs in parallel with lint for faster feedback. |
| P0-08.4 | Create test job | Add `test` job (parallel to lint and typecheck) with same initial steps, but running `pnpm test` to execute Vitest test suite. This job runs all unit and integration tests. Initially tests will pass trivially (no tests yet), but structure is ready for future tests. |
| P0-08.5 | Create build job with dependencies | Add `build` job with `needs: [lint, typecheck, test]` to ensure it only runs if all quality gates pass. Same initial steps as other jobs, but runs `pnpm build` to build all packages with tsdown. This verifies the code compiles and bundles correctly. The `needs` dependency prevents wasting CI minutes building broken code. |
| P0-08.6 | Configure pnpm caching | Verify `actions/setup-node@v4` has `cache: 'pnpm'` parameter in all jobs. This caches pnpm's store directory (`~/.local/share/pnpm/store` on Linux) between workflow runs, speeding up `pnpm install` from ~30s to ~10s. The cache key is based on `pnpm-lock.yaml` hash, so it invalidates when dependencies change. |
| P0-08.7 | Test workflow locally | Before pushing, validate the workflow syntax using `actionlint` (if installed) or GitHub's workflow validator. Push to a test branch and verify the workflow runs successfully. Check that all jobs show green checkmarks, caching works (second run faster), and build artifacts are correct. Fix any issues before marking task complete. |

**File: `.github/workflows/ci.yml`**
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: '.node-version'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run Biome
        run: pnpm lint

  typecheck:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: '.node-version'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run TypeScript
        run: pnpm typecheck

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: '.node-version'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]
    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: '.node-version'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build packages
        run: pnpm build
```

**Technical Considerations:**
- **Workflow concurrency**: The `${{ github.workflow }}-${{ github.ref }}` group ensures each branch has its own concurrency group, preventing cross-contamination
- **cancel-in-progress**: Saves CI minutes by stopping outdated runs when new commits pushed to same PR/branch
- **Job parallelization**: All jobs except `build` run in parallel, reducing total CI time from ~8min sequential to ~2-3min parallel
- **needs dependency**: The `build` job waits for lint/typecheck/test to complete, preventing wasteful builds of broken code
- **frozen-lockfile**: `--frozen-lockfile` flag fails CI if `pnpm-lock.yaml` is out of sync with package.json, catching dependency issues early
- **Cache key strategy**: `actions/setup-node` uses pnpm-lock.yaml hash as cache key, invalidating when dependencies change
- **Cache location**: pnpm store cached at `~/.local/share/pnpm/store` on Linux, `~/Library/pnpm/store` on macOS
- **Runner OS choice**: ubuntu-latest is fastest and cheapest (~2-3 min vs 3-4 min on macOS, and free tier has more Linux minutes)
- **Node.js version file**: Using `node-version-file: '.node-version'` ensures CI uses same Node.js version as local development
- **Action versions**: Using @v4 versions of actions ensures Node.js 20 support and latest features
- **pnpm version pinning**: `version: 10` in pnpm-action-setup ensures consistent pnpm version across all jobs
- **Checkout depth**: Default shallow clone (depth 1) is sufficient for CI, speeds up checkout
- **Status checks**: GitHub requires all jobs to pass before allowing PR merge (configured in branch protection rules)

**Expected Outputs:**

After completing this task:

1. **.github/workflows/ci.yml**: Complete CI workflow file (see File section above)

2. **GitHub Actions tab**: Workflow appears in repository's Actions tab

3. **PR status checks**: Pull requests show CI status checks:
   ```
   ✓ Lint - passed in 45s
   ✓ Type Check - passed in 52s
   ✓ Test - passed in 38s
   ✓ Build - passed in 1m 15s
   ```

4. **Workflow run output**: Example successful run:
   ```
   CI / Lint (pull_request) - ✓ 45s
   CI / Type Check (pull_request) - ✓ 52s
   CI / Test (pull_request) - ✓ 38s
   CI / Build (pull_request) - ✓ 1m 15s
   ```

5. **Cache performance**: Second run with cache:
   ```
   Install dependencies - Cache hit, restored 245MB in 8s
   (vs first run: Cache miss, installed in 32s)
   ```

6. **Failed build prevention**: If lint fails, build job skipped:
   ```
   ✗ Lint - failed in 48s
   ⊘ Build - skipped (dependency failed)
   ```

**Acceptance Criteria:**
- [ ] `.github/workflows/ci.yml` created with all jobs defined
- [ ] Workflow name is "CI" and appears in GitHub Actions tab
- [ ] Workflow triggers on `push` to main branch
- [ ] Workflow triggers on `pull_request` targeting main branch
- [ ] Concurrency group is `${{ github.workflow }}-${{ github.ref }}`
- [ ] Concurrency has `cancel-in-progress: true` to stop outdated runs
- [ ] `lint` job defined running on ubuntu-latest
- [ ] `lint` job uses `actions/checkout@v4` to clone repository
- [ ] `lint` job uses `pnpm/action-setup@v4` with `version: 10`
- [ ] `lint` job uses `actions/setup-node@v4` with `node-version-file: '.node-version'`
- [ ] `lint` job has `cache: 'pnpm'` in setup-node step for caching
- [ ] `lint` job runs `pnpm install --frozen-lockfile` to install dependencies
- [ ] `lint` job runs `pnpm lint` to execute Biome check
- [ ] `typecheck` job defined with same structure as lint but runs `pnpm typecheck`
- [ ] `test` job defined with same structure as lint but runs `pnpm test`
- [ ] `build` job defined with `needs: [lint, typecheck, test]` dependency
- [ ] `build` job runs `pnpm build` to build all packages
- [ ] All jobs use consistent pnpm and Node.js setup steps
- [ ] CI workflow runs successfully on initial push to main branch
- [ ] CI workflow runs successfully on pull request creation
- [ ] All jobs show green checkmarks (pass) on clean codebase
- [ ] Jobs run in parallel (lint, typecheck, test start at same time)
- [ ] Build job waits for other jobs to complete before starting
- [ ] Cache works: second run shows "Cache restored" message and is faster
- [ ] pnpm install takes ~30s on cache miss, ~10s on cache hit
- [ ] Total workflow time is 2-4 minutes with parallelization
- [ ] Failed lint/typecheck/test causes build job to be skipped
- [ ] Pushing new commit to PR cancels previous workflow run (cancel-in-progress works)
- [ ] GitHub PR shows status checks for all four jobs
- [ ] Branch protection can be configured to require CI checks before merge
- [ ] Workflow file syntax is valid (no YAML errors)
- [ ] Committed with message: `ci: add GitHub Actions CI workflow for lint, typecheck, test, and build`

---

#### P0-09: Create GitHub Workflow - Release

**Description:** Set up an automated release workflow using GitHub Actions and workspace-tools that publishes packages to npm when changesets are merged to the main branch. The workflow uses workspace-tools to bump versions, generate changelogs, create Git tags, and publish to npm. Critically, it ONLY publishes packages from `packages/*` directory, explicitly excluding playground applications (which are marked as private). The workflow also creates GitHub releases with generated release notes.

**Context:**
- **Automated releasing**: When changesets are merged to main, this workflow automatically handles versioning, changelog generation, tagging, and npm publishing
- **workspace-tools integration**: Uses `workspace bump` to read changesets, bump versions, and update CHANGELOG.md files
- **NPM_TOKEN secret**: Required GitHub secret containing npm authentication token for publishing packages
- **Package filtering**: Uses `pnpm -r --filter='./packages/*' publish` to ONLY publish packages from packages/ directory
- **Private package protection**: Playground apps have `"private": true` in package.json and are explicitly excluded by filter
- **Permission requirements**: Workflow needs `contents: write` for git operations and `packages: write` for npm publishing (if publishing to GitHub Packages)
- **fetch-depth: 0**: Clones full git history (not shallow) so workspace-tools can analyze commits and generate accurate changelogs
- **workflow_dispatch**: Allows manual triggering of release workflow from GitHub UI (useful for emergency releases)
- **Repository check**: `if: github.repository == 'websublime/vite-open-api-server'` prevents forks from attempting to publish

**Why This Configuration:**
- **on.push.branches: [main]**: Only releases from main branch, preventing accidental releases from feature branches
- **workflow_dispatch**: Enables manual releases without needing a push to main
- **concurrency without cancel-in-progress**: Ensures release workflows complete (canceling mid-publish would be dangerous)
- **fetch-depth: 0**: Required for workspace-tools to generate accurate changelogs from git history
- **NODE_AUTH_TOKEN from secrets**: Securely provides npm authentication without exposing token in workflow file
- **--access public**: Publishes packages as public (default is private for scoped packages like @websublime/*)
- **--no-git-checks**: Skips pnpm's git checks since workspace-tools already handles git operations

**Implementation Approach:**
1. Create `.github/workflows/release.yml` with workflow name and triggers
2. Add concurrency control (without cancel-in-progress for safety)
3. Create release job with repository check to prevent fork publishing
4. Add permissions for contents (git tags) and packages (npm publishing)
5. Add checkout step with full git history (fetch-depth: 0)
6. Install pnpm and Node.js with npm registry configuration
7. Install dependencies and build all packages
8. Install workspace-tools binary using official installation script
9. Check if changesets exist using `workspace changeset list --json`
10. Conditionally run release steps if changesets found
11. Use workspace-tools to bump versions and create git tags
12. Publish ONLY packages from packages/* to npm with public access
13. Test workflow with a test changeset (dry-run first)

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P0-09.1 | Create release.yml structure | Create `.github/workflows/release.yml` with workflow name "Release", triggers on `push.branches: [main]` and `workflow_dispatch` (manual trigger), concurrency group without cancel-in-progress (releases must complete), and `if: github.repository == 'websublime/vite-open-api-server'` check to prevent forks from publishing. Add `permissions: { contents: write, packages: write }` for git and npm operations. |
| P0-09.2 | Add checkout and setup steps | Add steps: 1) `actions/checkout@v4` with `fetch-depth: 0` to clone full git history (required for changelog generation), 2) `pnpm/action-setup@v4` with `version: 10`, 3) `actions/setup-node@v4` with `node-version-file: '.node-version'`, `cache: 'pnpm'`, and `registry-url: 'https://registry.npmjs.org'` (configures npm authentication), 4) `pnpm install --frozen-lockfile` to install dependencies, 5) `pnpm build` to build all packages before publishing. |
| P0-09.3 | Install workspace-tools in CI | Add step to install workspace-tools binary using the official installation script: `curl --proto '=https' --tlsv1.2 -LsSf https://github.com/websublime/workspace-tools/releases/latest/download/sublime_cli_tools-installer.sh \| sh`. This downloads and installs the workspace binary to the runner. Verify installation is successful (the script adds it to PATH automatically). |
| P0-09.4 | Check for changesets | Add step with `id: changesets` that runs `workspace changeset list --json \| jq '.total // 0'` to count available changesets. Output the count to `$GITHUB_OUTPUT` with `echo "count=$COUNT" >> $GITHUB_OUTPUT`. This allows subsequent steps to conditionally run only if changesets exist (avoids unnecessary operations when no releases needed). |
| P0-09.5 | Conditionally bump versions and publish | Add "Create release" step with `if: steps.changesets.outputs.count > 0` condition. Set environment variables `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` (for npm authentication) and `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` (for git operations). Run two commands: 1) `workspace bump --execute --git-tag --git-push --force` to bump versions, update changelogs, create git tags, and push to GitHub, 2) `pnpm -r --filter='./packages/*' publish --access public --no-git-checks` to publish ONLY packages from packages/ directory to npm, excluding playground apps. The `--filter` is critical to prevent publishing private packages. |
| P0-09.6 | Configure NPM_TOKEN secret | In GitHub repository settings, go to Settings → Secrets and variables → Actions → New repository secret. Create secret named `NPM_TOKEN` with value from npm access token (generate at npmjs.com → Access Tokens → Generate New Token → Automation type). This token allows CI to authenticate and publish to npm. Document this requirement in CONTRIBUTING.md. |
| P0-09.7 | Test release workflow | Create a test changeset with `pnpm changeset`, commit it to a test branch, merge to main, and observe the release workflow run. Verify: 1) Workflow detects changeset, 2) Versions are bumped correctly, 3) CHANGELOG.md is updated, 4) Git tags are created, 5) ONLY plugin package is published to npm (NOT playground app), 6) GitHub release is created. Test with `--dry-run` first if possible, or use a pre-release version (0.0.1-beta.0) for testing. |

**File: `.github/workflows/release.yml`**
```yaml
name: Release

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    if: github.repository == 'websublime/vite-open-api-server'
    permissions:
      contents: write
      packages: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: '.node-version'
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build packages
        run: pnpm build

      - name: Install workspace-tools
        run: |
          curl --proto '=https' --tlsv1.2 -LsSf \
            https://github.com/websublime/workspace-tools/releases/latest/download/sublime_cli_tools-installer.sh | sh

      - name: Check for changesets
        id: changesets
        run: |
          COUNT=$(workspace --format json changeset list | jq '.total // 0')
          echo "count=$COUNT" >> $GITHUB_OUTPUT

      - name: Create release
        if: steps.changesets.outputs.count > 0
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          workspace bump --execute --git-tag --git-push --force
          pnpm -r --filter='./packages/*' publish --access public --no-git-checks
```

**Technical Considerations:**
- **NPM_TOKEN security**: Token must be an Automation token type (not Classic token) for CI/CD use. Classic tokens are tied to user accounts and less secure.
- **fetch-depth: 0 requirement**: Shallow clones (default) don't have full git history, preventing workspace-tools from generating accurate changelogs
- **Package filtering importance**: Without `--filter='./packages/*'`, pnpm would attempt to publish ALL packages including private playground apps, which would fail
- **--no-git-checks necessity**: pnpm's git checks would fail because workspace-tools already committed and tagged, so we skip them
- **--access public**: Scoped packages (@websublime/*) default to private on npm, requiring explicit `--access public` flag
- **Concurrency without cancel**: Unlike CI workflow, we DON'T want cancel-in-progress for releases (partial publishes would be catastrophic)
- **if condition on repository**: Prevents forks from attempting to publish (they won't have NPM_TOKEN and would fail)
- **Conditional release steps**: Checking for changesets prevents unnecessary workflow runs when no releases are pending
- **GITHUB_TOKEN vs secrets.GITHUB_TOKEN**: `secrets.GITHUB_TOKEN` is automatically provided by GitHub Actions, no configuration needed
- **Version bumping order**: workspace-tools reads changesets, determines highest bump type per package, applies bumps, updates package.json and CHANGELOG.md
- **Git tag format**: workspace-tools creates tags like `v1.0.0` or `@websublime/vite-plugin-open-api-server@1.0.0` depending on configuration
- **npm publish output**: Shows which packages were published and to what versions (verify only plugin package appears in output)

**Expected Outputs:**

After completing this task:

1. **.github/workflows/release.yml**: Complete release workflow file (see File section above)

2. **NPM_TOKEN secret**: Configured in GitHub repository settings

3. **Successful release run output**:
   ```
   Release / release (push) - ✓ 2m 45s
   
   Check for changesets - Found 2 changesets
   Create release - Running...
   
   workspace bump output:
   ✓ Bumped @websublime/vite-plugin-open-api-server: 0.1.0 → 0.2.0
   ✓ Updated CHANGELOG.md
   ✓ Created tag v0.2.0
   ✓ Pushed to origin
   
   pnpm publish output:
   Publishing @websublime/vite-plugin-open-api-server@0.2.0
   ✓ Published to https://registry.npmjs.org
   
   (Note: petstore-app NOT in publish output - excluded by filter)
   ```

4. **Git tags created**: Tags like `v0.2.0` appear in repository

5. **npm registry**: Package published at https://www.npmjs.com/package/@websublime/vite-plugin-open-api-server

6. **CHANGELOG.md updated**: Generated from changeset descriptions

7. **GitHub release created**: Automatically created with tag and release notes

**Acceptance Criteria:**
- [ ] `.github/workflows/release.yml` created with all steps defined
- [ ] Workflow name is "Release" and appears in GitHub Actions tab
- [ ] Workflow triggers on `push` to main branch
- [ ] Workflow includes `workflow_dispatch` for manual triggering
- [ ] Workflow has `if: github.repository == 'websublime/vite-open-api-server'` check
- [ ] Concurrency group is `${{ github.workflow }}-${{ github.ref }}`
- [ ] Concurrency has `cancel-in-progress: false` (releases must complete)
- [ ] Workflow has `permissions: { contents: write, packages: write }`
- [ ] Checkout step uses `fetch-depth: 0` for full git history
- [ ] pnpm installed with version 10
- [ ] Node.js setup includes `registry-url: 'https://registry.npmjs.org'`
- [ ] Dependencies installed with `--frozen-lockfile`
- [ ] All packages built with `pnpm build` before publishing
- [ ] workspace-tools binary installed using official installation script
- [ ] Changeset count checked using `workspace changeset list --json | jq`
- [ ] Release steps conditional on `steps.changesets.outputs.count > 0`
- [ ] Release step has `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` environment variable
- [ ] Release step has `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` environment variable
- [ ] workspace bump runs with `--execute --git-tag --git-push --force` flags
- [ ] pnpm publish uses `--filter='./packages/*'` to exclude playground
- [ ] pnpm publish uses `--access public` for scoped packages
- [ ] pnpm publish uses `--no-git-checks` to skip git validation
- [ ] NPM_TOKEN secret configured in GitHub repository settings
- [ ] NPM_TOKEN is an Automation token type (not Classic)
- [ ] Test release workflow runs successfully with test changeset
- [ ] Workflow detects and processes changesets correctly
- [ ] Versions are bumped in package.json files
- [ ] CHANGELOG.md files are generated/updated
- [ ] Git tags are created and pushed to GitHub
- [ ] ONLY @websublime/vite-plugin-open-api-server is published to npm
- [ ] petstore-app is NOT published (verify in workflow output)
- [ ] Published package appears on npmjs.com registry
- [ ] GitHub releases are created automatically with tags
- [ ] Release notes are generated from changeset descriptions
- [ ] Workflow succeeds when no changesets present (skips release steps)
- [ ] Manual workflow_dispatch trigger works from GitHub UI
- [ ] Committed with message: `ci: add GitHub Actions release workflow with workspace-tools`

---

#### P0-10: Create Plugin Package Skeleton

**Description:** Create the foundational structure for the Vite plugin package including package.json with proper npm metadata, exports configuration, peer dependencies, entry point files, and type definitions. This establishes the package that will be published to npm and consumed by Vite applications. The skeleton includes placeholder implementations that will be filled in during later phases, but provides the correct structure for building, testing, and publishing.

**Context:**
- **Package scope**: Using `@websublime/` scope requires npm organization membership or access token with scope permissions
- **Exports field**: Modern package.json feature that defines public API entry points for ESM consumers
- **Peer dependencies**: Vite is a peer dependency (not regular dependency) because consumers already have Vite installed
- **Type: module**: Declares package as ESM-only (no CommonJS support), matching modern Vite/TypeScript ecosystem
- **Files field**: Whitelist of files to include in published package (reduces package size)
- **Repository field**: Links package to GitHub repository for discoverability and issue tracking
- **Keywords**: SEO for npm search, helps developers find the package
- **License**: MIT is permissive and widely used in JavaScript ecosystem
- **tsdown build**: Using tsdown (not tsc) for building because it bundles dependencies and handles mixed ESM/CJS better

**Why This Structure:**
- **src/index.ts**: Main entry point that exports the plugin function and types (matches package.json exports ".")
- **src/plugin.ts**: Separate file for plugin implementation (separation of concerns, easier testing)
- **src/types/index.ts**: Centralized type definitions for plugin options, context interfaces, etc.
- **Version 0.0.0**: Starting version (workspace-tools will bump on first release)
- **Peer dependency on Vite**: Plugin requires Vite but doesn't bundle it (consumers provide it)
- **Dev dependencies**: Tools needed for building/testing but not needed by consumers
- **peerDependenciesMeta**: Marks @faker-js/faker as optional peer (used for seeding but not required)

**Implementation Approach:**
1. Create package.json with all required npm fields (name, version, type, license, author, description, keywords)
2. Configure exports field with "." pointing to dist/index.js (ESM) and types pointing to dist/index.d.ts
3. Add repository, bugs, and homepage URLs for GitHub integration
4. Configure files array to include only dist/ directory in published package
5. Add scripts for dev (tsdown --watch) and build (tsdown)
6. Set engines.node requirement matching root workspace
7. Configure peerDependencies for vite (required) and peerDependenciesMeta for @faker-js/faker (optional)
8. Add dependencies for runtime libraries (@hono/node-server, @scalar/*, chokidar, yaml)
9. Add devDependencies for build tools (tsdown, typescript, vitest, @types/node, @vue/devtools-api)
10. Create src/index.ts that exports plugin function and types
11. Create src/plugin.ts with basic Vite plugin structure (name, configureServer stub)
12. Create src/types/index.ts with OpenApiServerPluginOptions interface
13. Create README.md with installation, usage, and configuration examples

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P0-10.1 | Create package.json with npm metadata | Create `packages/vite-plugin-open-api-server/package.json` with complete npm package metadata: `name: "@websublime/vite-plugin-open-api-server"`, `version: "0.0.0"`, `type: "module"`, `license: "MIT"`, `author: "WebSublime"`, `description` explaining the plugin's purpose, `keywords` array for npm search (vite, vite-plugin, openapi, mock-server, scalar, api, development), `repository` object with GitHub URL and directory path, `bugs` and `homepage` URLs. This establishes the package identity and discoverability on npm. |
| P0-10.2 | Configure package.json exports and files | Add `exports` field with `"."` entry pointing to `{ "import": "./dist/index.js", "types": "./dist/index.d.ts" }` for ESM consumers, and `"./package.json"` entry for package.json access. Add `files: ["dist"]` array to include only built files in published package (reduces package size, excludes source and tests). This defines the public API surface and published artifacts. |
| P0-10.3 | Add package.json scripts and engines | Add `scripts` object with `"dev": "tsdown --watch"` for development mode and `"build": "tsdown"` for production build, `"test": "vitest run"`, `"test:watch": "vitest"`, `"prepublishOnly": "pnpm run build"` to ensure package is built before publishing. Add `engines: { "node": "^20.19.0 || >=22.12.0" }` to enforce minimum Node.js version matching workspace. These scripts enable development workflow and enforce version requirements. |
| P0-10.4 | Configure dependencies and peerDependencies | Add `peerDependencies: { "vite": "^7.0.0" }` (consumers must provide Vite), `dependencies` with runtime libraries: `@hono/node-server: "^1.19.7"`, `@scalar/mock-server: "^0.8.9"`, `@scalar/openapi-parser: "^0.23.11"`, `chokidar: "^5.0.0"`, `yaml: "^2.8.2"`. Add `devDependencies` with build tools: `@types/node: "^25.0.3"`, `@vue/devtools-api: "^8.0.5"`, `tsdown: "^0.19.0-beta.5"`, `typescript: "^5.9.3"`, `vite: "^7.3.1"`, `vitest: "^4.0.16"`. Add `peerDependenciesMeta: { "@faker-js/faker": { "optional": true } }` to mark faker as optional peer. This establishes all package dependencies. |
| P0-10.5 | Create src/index.ts entry point | Create `packages/vite-plugin-open-api-server/src/index.ts` with exports: `export { openApiServerPlugin } from './plugin.js';` (main plugin function) and `export type * from './types/index.js';` (type exports). Add JSDoc comment explaining this is the main entry point. This file becomes dist/index.js after build and is what consumers import from the package. |
| P0-10.6 | Create src/plugin.ts with Vite plugin stub | Create `packages/vite-plugin-open-api-server/src/plugin.ts` with function `export function openApiServerPlugin(options?: OpenApiServerPluginOptions)` returning a Vite plugin object with `name: 'vite-plugin-open-api-server'` and stub methods `configureServer(server) {}`, `buildStart() {}`, `buildEnd() {}`. Import `OpenApiServerPluginOptions` from './types/index.js'. Add JSDoc comment explaining this implements the Vite plugin interface. This provides the basic plugin structure that will be filled in during Phase 1. |
| P0-10.7 | Create src/types/index.ts with type definitions | Create `packages/vite-plugin-open-api-server/src/types/index.ts` with exported interfaces: `OpenApiServerPluginOptions` (plugin configuration with optional fields: openApiPath, port, proxyPath, handlersDir, seedsDir, verbose), `OpenApiEndpointRegistry` (registry structure), `HandlerContext` (handler execution context), `SeedContext` (seed execution context). Add JSDoc comments explaining each interface purpose and fields. These types will be used throughout the plugin and exported for TypeScript consumers. |
| P0-10.8 | Create basic README.md | Create `packages/vite-plugin-open-api-server/README.md` with sections: Installation (`pnpm add -D @websublime/vite-plugin-open-api-server`), Usage (basic vite.config.ts example), Configuration (table of options with descriptions), Features (bullet list), Requirements (Node.js version, Vite version), License (MIT). Include placeholder text indicating more documentation will be added as features are implemented. This provides initial package documentation for npm and GitHub. |
| P0-10.9 | Verify package structure | Run `pnpm install` from root to ensure package.json is valid. Verify workspace linking works with `pnpm list @websublime/vite-plugin-open-api-server`. Check that TypeScript recognizes the package structure (no import errors in index.ts). Verify `pnpm --filter @websublime/vite-plugin-open-api-server build` would work (will fail until tsdown config is added in P0-11, but should recognize the command). Review package.json against npm best practices checklist. |

**File: `packages/vite-plugin-open-api-server/package.json`**
```json
{
  "name": "@websublime/vite-plugin-open-api-server",
  "version": "0.0.0",
  "type": "module",
  "license": "MIT",
  "author": "WebSublime",
  "description": "Vite plugin for OpenAPI-based mock server with Scalar integration",
  "keywords": [
    "vite",
    "vite-plugin",
    "openapi",
    "mock-server",
    "scalar",
    "api",
    "development"
  ],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/websublime/vite-open-api-server.git",
    "directory": "packages/vite-plugin-open-api-server"
  },
  "bugs": {
    "url": "https://github.com/websublime/vite-open-api-server/issues"
  },
  "homepage": "https://github.com/websublime/vite-open-api-server#readme",
  "files": ["dist"],
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "types": "./dist/index.d.mts"
    },
    "./package.json": "./package.json"
  },
  "scripts": {
    "dev": "tsdown --watch",
    "build": "tsdown",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "pnpm run build"
  },
  "engines": {
    "node": "^20.19.0 || >=22.12.0"
  },
  "peerDependencies": {
    "vite": "^6.0.0 || ^7.0.0"
  },
  "dependencies": {
    "@hono/node-server": "^1.19.7",
    "@scalar/mock-server": "^0.8.9",
    "@scalar/openapi-parser": "^0.23.11",
    "chokidar": "^5.0.0",
    "yaml": "^2.8.2"
  },
  "devDependencies": {
    "@types/node": "^25.0.3",
    "@vue/devtools-api": "^8.0.5",
    "tsdown": "^0.19.0-beta.5",
    "typescript": "^5.9.3",
    "vite": "^7.3.1",
    "vitest": "^4.0.16"
  },
  "peerDependenciesMeta": {
    "@faker-js/faker": {
      "optional": true
    }
  }
}
```

**File: `packages/vite-plugin-open-api-server/src/index.ts`**
```typescript
/**
 * @module @websublime/vite-plugin-open-api-server
 *
 * Vite plugin for OpenAPI-based mock server with Scalar integration.
 *
 * ## What
 * This module exports the main Vite plugin and related types for integrating
 * an OpenAPI mock server into Vite's development workflow.
 *
 * ## How
 * The plugin spawns a child process running @scalar/mock-server, enhanced with
 * custom handlers and seeds loaded from user-defined .mjs files.
 *
 * ## Why
 * Enables frontend developers to work independently of backend services during
 * local development, with realistic mock data and customizable response logic.
 *
 * @example
 * ```typescript
 * import { openApiServerPlugin } from '@websublime/vite-plugin-open-api-server';
 *
 * export default defineConfig({
 *   plugins: [
 *     openApiServerPlugin({
 *       openApiPath: './src/apis/petstore/petstore.openapi.yaml',
 *       port: 3456,
 *       handlersDir: './src/apis/petstore/open-api-server/handlers',
 *       seedsDir: './src/apis/petstore/open-api-server/seeds',
 *     }),
 *   ],
 * });
 * ```
 */

export { openApiServerPlugin } from './plugin';
export type { OpenApiServerPluginOptions } from './types';
```

**Technical Considerations:**
- **Package scope**: `@websublime/` is a scoped package requiring npm organization access or personal scope
- **Exports field format**: Modern Node.js (14+) understands `exports` field for subpath exports, older tools may not
- **ESM-only package**: `"type": "module"` means no CommonJS support, breaking older bundlers (acceptable for Vite ecosystem)
- **Peer dependency range**: `^6.0.0 || ^7.0.0` supports both Vite 6 and 7, maximizing compatibility
- **Optional peer dependency**: `@faker-js/faker` in `peerDependenciesMeta` doesn't force installation but allows usage for seed data
- **tsdown vs tsc**: tsdown bundles dependencies and handles ESM/types better, but requires separate config (added in P0-11)
- **dist/ extension**: tsdown outputs `.mjs` for ESM JavaScript and `.d.mts` for ESM TypeScript declarations
- **Files field**: Only `dist/` included in published package, reducing size and preventing source code exposure
- **prepublishOnly script**: Ensures package is always built before publishing, preventing accidental source-only publishes
- **Version 0.0.0**: Placeholder version that workspace-tools will bump on first release (never published as 0.0.0)
- **Dependency versions**: All dependencies pinned to specific minor versions (^) for stability while allowing patches
- **devDependencies in published package**: Not included in published package, only used for local development
- **Repository directory field**: Helps npm/GitHub link directly to package subdirectory in monorepo

**Expected Outputs:**

After completing this task:

1. **Package directory structure**:
   ```
   packages/vite-plugin-open-api-server/
   ├── package.json           # Complete npm package metadata
   ├── README.md              # Package documentation
   ├── src/
   │   ├── index.ts          # Main entry point (exports plugin)
   │   ├── plugin.ts         # Vite plugin implementation stub
   │   └── types/
   │       └── index.ts      # TypeScript type definitions
   └── tsconfig.json         # From P0-06, extends root config
   ```

2. **Workspace linking verification**:
   ```bash
   $ pnpm list @websublime/vite-plugin-open-api-server
   @websublime/vite-open-api-server-monorepo
   └── packages/vite-plugin-open-api-server
   ```

3. **TypeScript compilation check** (no build yet, just type checking):
   ```bash
   $ pnpm --filter @websublime/vite-plugin-open-api-server typecheck
   # No errors expected with stub implementation
   ```

4. **package.json exports field** enables modern imports:
   ```typescript
   // Consumers will import like this:
   import { openApiServerPlugin } from '@websublime/vite-plugin-open-api-server';
   import type { OpenApiServerPluginOptions } from '@websublime/vite-plugin-open-api-server';
   ```

5. **Stub plugin.ts** returns valid Vite plugin object:
   ```typescript
   export function openApiServerPlugin(options?: OpenApiServerPluginOptions) {
     return {
       name: 'vite-plugin-open-api-server',
       configureServer(server) {
         // Implementation in Phase 1
       },
     };
   }
   ```

**Acceptance Criteria:**
- [ ] `packages/vite-plugin-open-api-server/package.json` created with all fields
- [ ] Package name is `@websublime/vite-plugin-open-api-server` (scoped)
- [ ] Package version is `0.0.0` (will be bumped by workspace-tools)
- [ ] `type: "module"` declares package as ESM-only
- [ ] `license: "MIT"` set for permissive licensing
- [ ] `author: "WebSublime"` identifies package creator
- [ ] `description` clearly explains plugin purpose
- [ ] `keywords` array includes vite, vite-plugin, openapi, mock-server, scalar, api, development
- [ ] `repository` object has correct GitHub URL and directory path
- [ ] `bugs` URL points to GitHub issues
- [ ] `homepage` URL points to GitHub repository
- [ ] `files: ["dist"]` limits published package to built files only
- [ ] `exports` field defines "." entry with import and types subpaths
- [ ] `exports` field includes "./package.json" for package.json access
- [ ] `scripts.dev` is `tsdown --watch` for watch mode
- [ ] `scripts.build` is `tsdown` for production build
- [ ] `scripts.test` is `vitest run` for running tests
- [ ] `scripts.prepublishOnly` is `pnpm run build` to ensure build before publish
- [ ] `engines.node` matches root workspace requirement (`^20.19.0 || >=22.12.0`)
- [ ] `peerDependencies` includes `vite: "^6.0.0 || ^7.0.0"`
- [ ] `dependencies` includes @hono/node-server, @scalar/mock-server, @scalar/openapi-parser, chokidar, yaml
- [ ] `devDependencies` includes @types/node, @vue/devtools-api, tsdown, typescript, vite, vitest
- [ ] `peerDependenciesMeta` marks `@faker-js/faker` as optional
- [ ] `src/index.ts` created with exports for openApiServerPlugin and types
- [ ] `src/index.ts` includes comprehensive JSDoc module documentation
- [ ] `src/index.ts` exports plugin function using named export
- [ ] `src/index.ts` exports types using `export type *` syntax
- [ ] `src/plugin.ts` created with openApiServerPlugin function stub
- [ ] `src/plugin.ts` function returns Vite plugin object with `name` property
- [ ] `src/plugin.ts` includes stub methods: configureServer, buildStart, buildEnd
- [ ] `src/plugin.ts` imports OpenApiServerPluginOptions from './types/index.js'
- [ ] `src/plugin.ts` includes JSDoc comments explaining plugin purpose
- [ ] `src/types/index.ts` created with exported interfaces
- [ ] `src/types/index.ts` defines OpenApiServerPluginOptions interface
- [ ] OpenApiServerPluginOptions has fields: openApiPath, port, proxyPath, handlersDir, seedsDir, verbose (all optional)
- [ ] `src/types/index.ts` defines OpenApiEndpointRegistry interface (stub)
- [ ] `src/types/index.ts` defines HandlerContext interface (stub)
- [ ] `src/types/index.ts` defines SeedContext interface (stub)
- [ ] All interfaces have JSDoc comments explaining purpose
- [ ] `README.md` created with Installation section
- [ ] `README.md` includes Usage section with vite.config.ts example
- [ ] `README.md` includes Configuration section listing all options
- [ ] `README.md` includes Features section (placeholder)
- [ ] `README.md` includes Requirements section (Node.js, Vite versions)
- [ ] `README.md` includes License section (MIT)
- [ ] `pnpm install` from root succeeds without errors
- [ ] Package appears in `pnpm list @websublime/vite-plugin-open-api-server`
- [ ] TypeScript recognizes package (no import errors in index.ts)
- [ ] `pnpm typecheck` passes in plugin package directory
- [ ] No circular dependency warnings from TypeScript
- [ ] Plugin package linked correctly in workspace
- [ ] Committed with message: `feat(plugin): create plugin package skeleton with npm metadata and type definitions`

---

#### P0-11: Configure tsdown for Build

**Description:** Configure tsdown as the build tool for the Vite plugin package, replacing traditional tsc compilation with a modern bundler that handles TypeScript, generates ESM output, creates declaration files, and bundles dependencies intelligently. tsdown is built on top of esbuild and rollup-plugin-dts, providing fast builds with excellent TypeScript support. This configuration enables both development watch mode (`pnpm dev`) and production builds (`pnpm build`) that output ready-to-publish artifacts in the dist/ directory.

**Context:**
- **tsdown** is a TypeScript bundler created by egoist, designed specifically for building libraries (not applications)
- **Why tsdown over tsc**: tsdown bundles dependencies (tree-shaking), handles mixed ESM/CJS better, and is significantly faster than tsc
- **Why tsdown over other bundlers**: Purpose-built for TypeScript libraries, simpler configuration than Rollup, faster than webpack
- **Used by**: vite-plugin-vue, @egoist/tiged, and other popular Vite plugins (proven in production)
- **Build outputs**: 
  - `dist/index.mjs` - ESM JavaScript bundle
  - `dist/index.d.mts` - ESM TypeScript declarations
  - `dist/index.mjs.map` - Source map for debugging
- **Watch mode**: `tsdown --watch` for development, rebuilds on file changes (used in `pnpm dev`)
- **External dependencies**: Peer dependencies (vite) and optional peers (@faker-js/faker) are externalized (not bundled)
- **Clean builds**: `clean: true` removes dist/ before each build, preventing stale artifacts

**Why This Configuration:**
- **entry: ['src/index.ts']**: Single entry point matching package.json exports
- **format: ['esm']**: ESM-only output (no CJS), matching `"type": "module"` in package.json
- **dts: true**: Generates TypeScript declaration files (.d.mts) for type checking in consuming projects
- **clean: true**: Removes dist/ before build to prevent stale files from previous builds
- **sourcemap: true**: Generates source maps for debugging production builds
- **outDir: 'dist'**: Output directory matching package.json `files: ["dist"]` and `exports` paths
- **external: ['vite', '@faker-js/faker']**: Prevents bundling peer dependencies (consumers provide these)

**Implementation Approach:**
1. tsdown is already installed as devDependency in package.json (from P0-10), verify version
2. Create `tsdown.config.ts` at package root (same level as package.json)
3. Import `defineConfig` helper from 'tsdown' for type-safe configuration
4. Configure entry point, format, and output options
5. Add external dependencies to prevent bundling peer deps
6. Test build with `pnpm --filter @websublime/vite-plugin-open-api-server build`
7. Verify dist/ outputs: index.mjs, index.d.mts, index.mjs.map
8. Test watch mode with `pnpm --filter @websublime/vite-plugin-open-api-server dev`
9. Verify source maps work (can debug with original TypeScript source)

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P0-11.1 | Verify tsdown installation | Check that tsdown is installed in package.json devDependencies (should be `^0.19.0-beta.5` from P0-10). If not present, run `pnpm add -D tsdown@^0.19.0-beta.5` in the plugin package directory. Verify installation with `pnpm exec tsdown --version` from plugin directory. Expected output: version 0.19.x or later. |
| P0-11.2 | Create tsdown.config.ts | Create `packages/vite-plugin-open-api-server/tsdown.config.ts` with `defineConfig` import from 'tsdown' and export default configuration object. Set `entry: ['src/index.ts']` (single entry point), `format: ['esm']` (ESM-only), `dts: true` (generate .d.mts declarations), `clean: true` (remove dist/ before build), `sourcemap: true` (generate .mjs.map files), `outDir: 'dist'` (output directory), `external: ['vite', '@faker-js/faker']` (don't bundle peer deps). This config enables fast builds with proper TypeScript support. |
| P0-11.3 | Test production build | Run `pnpm --filter @websublime/vite-plugin-open-api-server build` from monorepo root to test the build. Verify dist/ directory is created with three files: `index.mjs` (bundled JavaScript), `index.d.mts` (TypeScript declarations), `index.mjs.map` (source map). Check that index.mjs starts with ESM imports, contains bundled plugin code, and doesn't include vite or @faker-js/faker (should be external). Verify index.d.mts contains type definitions for openApiServerPlugin and OpenApiServerPluginOptions. |
| P0-11.4 | Test watch mode | Run `pnpm --filter @websublime/vite-plugin-open-api-server dev` to start tsdown in watch mode. Make a small change to `src/plugin.ts` (e.g., add a comment) and verify tsdown automatically rebuilds. Check terminal output shows "Build succeeded" message. Verify dist/ files are updated (check file timestamps). Stop watch mode with Ctrl+C. This verifies the development workflow works correctly. |
| P0-11.5 | Verify source maps | Open `dist/index.mjs.map` and verify it contains source map content (JSON with "sources", "sourcesContent", "mappings" fields). The "sources" array should reference original TypeScript files (e.g., "../src/index.ts", "../src/plugin.ts"). This enables debugging in consuming projects where developers can step through original TypeScript source instead of compiled JavaScript. |
| P0-11.6 | Test external dependencies | Open `dist/index.mjs` in a text editor and search for import statements. Verify that `vite` and `@faker-js/faker` are NOT bundled (should not find their code in the file). Verify they appear as import statements at the top (e.g., `import { ... } from 'vite';` or similar). This confirms external configuration works, preventing bundle bloat and version conflicts. |

**File: `packages/vite-plugin-open-api-server/tsdown.config.ts`**
```typescript
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  outDir: 'dist',
  external: ['vite', '@faker-js/faker'],
});
```

**Technical Considerations:**
- **tsdown vs tsc**: tsc only transpiles, doesn't bundle. tsdown bundles and tree-shakes, producing smaller, optimized output
- **tsdown vs esbuild**: esbuild is faster but has weaker TypeScript support (no declaration files). tsdown uses esbuild for speed + rollup-plugin-dts for declarations
- **tsdown vs Rollup**: Rollup requires complex configuration for TypeScript + declarations. tsdown provides zero-config for common library use cases
- **Beta version**: tsdown 0.19.x is beta but stable enough for production (used by vite-plugin-vue and other popular packages)
- **.mjs extension**: Modern ESM convention, prevents ambiguity with CommonJS .js files
- **.d.mts extension**: TypeScript 5.0+ convention for ESM declaration files, matches .mjs extension
- **External dependencies**: Must externalize peer deps to avoid version conflicts and bundle size bloat
- **Clean builds**: Important for monorepos to prevent stale files from previous builds causing import errors
- **Watch mode performance**: tsdown watch is fast (~50-200ms rebuilds) due to esbuild, enabling smooth development experience
- **Source map debugging**: With source maps, debuggers (VS Code, Chrome DevTools) show original TypeScript code when debugging built package
- **Tree shaking**: tsdown automatically removes unused exports from dependencies, reducing bundle size
- **Minification**: Not enabled by default (unnecessary for libraries, adds overhead). Consumers' bundlers handle minification

**Expected Outputs:**

After completing this task:

1. **tsdown.config.ts file**: Configuration at `packages/vite-plugin-open-api-server/tsdown.config.ts`

2. **Build command working**:
   ```bash
   $ pnpm --filter @websublime/vite-plugin-open-api-server build
   
   tsdown v0.19.0
   ✓ Build succeeded in 245ms
   
   dist/index.mjs      12.3 KB
   dist/index.d.mts     2.1 KB
   dist/index.mjs.map   8.7 KB
   ```

3. **dist/ directory structure**:
   ```
   packages/vite-plugin-open-api-server/dist/
   ├── index.mjs        # ESM JavaScript bundle
   ├── index.d.mts      # TypeScript declaration file
   └── index.mjs.map    # Source map for debugging
   ```

4. **dist/index.mjs content** (example excerpt):
   ```javascript
   // External imports not bundled
   import { createServer } from '@hono/node-server';
   import { Scalar } from '@scalar/mock-server';
   
   // Plugin code bundled
   function openApiServerPlugin(options) {
     return {
       name: 'vite-plugin-open-api-server',
       configureServer(server) { ... }
     };
   }
   
   export { openApiServerPlugin };
   ```

5. **dist/index.d.mts content** (example excerpt):
   ```typescript
   interface OpenApiServerPluginOptions {
     openApiPath?: string;
     port?: number;
     // ...
   }
   
   declare function openApiServerPlugin(options?: OpenApiServerPluginOptions): any;
   
   export { openApiServerPlugin, OpenApiServerPluginOptions };
   ```

6. **Watch mode output**:
   ```bash
   $ pnpm --filter @websublime/vite-plugin-open-api-server dev
   
   tsdown v0.19.0 (watch mode)
   ✓ Build succeeded in 245ms
   
   Watching for changes...
   [file change detected]
   ✓ Build succeeded in 87ms
   ```

**Acceptance Criteria:**
- [ ] `tsdown.config.ts` created in plugin package directory
- [ ] Config imports `defineConfig` from 'tsdown' for type safety
- [ ] Config sets `entry: ['src/index.ts']` as single entry point
- [ ] Config sets `format: ['esm']` for ESM-only output
- [ ] Config sets `dts: true` to generate declaration files
- [ ] Config sets `clean: true` to remove dist/ before each build
- [ ] Config sets `sourcemap: true` to generate source maps
- [ ] Config sets `outDir: 'dist'` matching package.json paths
- [ ] Config sets `external: ['vite', '@faker-js/faker']` to externalize peer deps
- [ ] `pnpm --filter @websublime/vite-plugin-open-api-server build` executes successfully
- [ ] Build completes in under 5 seconds (typically 200-500ms)
- [ ] `dist/` directory created in plugin package
- [ ] `dist/index.mjs` file generated with ESM JavaScript
- [ ] `dist/index.d.mts` file generated with TypeScript declarations
- [ ] `dist/index.mjs.map` file generated with source mappings
- [ ] dist/index.mjs contains bundled plugin code
- [ ] dist/index.mjs does NOT contain vite or @faker-js/faker code (external)
- [ ] dist/index.mjs has import statements for external dependencies at top
- [ ] dist/index.d.mts contains exported types: OpenApiServerPluginOptions, openApiServerPlugin
- [ ] dist/index.mjs.map contains valid source map JSON
- [ ] dist/index.mjs.map "sources" array references original .ts files
- [ ] `pnpm --filter @websublime/vite-plugin-open-api-server dev` starts watch mode
- [ ] Watch mode rebuilds automatically when src/ files change
- [ ] Watch mode rebuild time is under 200ms (fast incremental builds)
- [ ] Watch mode can be stopped cleanly with Ctrl+C
- [ ] Root `pnpm build` command builds plugin package (via workspace script)
- [ ] Root `pnpm dev` command starts plugin watch mode (via workspace script)
- [ ] Built package size is reasonable (<50KB for index.mjs)
- [ ] No warnings or errors in build output
- [ ] Package.json exports paths match built file locations (./dist/index.mjs)
- [ ] Committed with message: `chore(plugin): configure tsdown bundler for ESM builds with declarations`

---

#### P0-12: Create Playground Application

**Description:** Set up the playground Vue application for testing the plugin. Uses `workspace:*` protocol to consume the local plugin package, enabling seamless hot-reload during development.

**Estimate:** M (2 days)

**Internal Dependency Strategy:**

The playground app consumes the plugin using pnpm's `workspace:*` protocol:

```json
"@websublime/vite-plugin-open-api-server": "workspace:*"
```

**Why `workspace:*`?**
- ✅ Always uses the latest local version from the workspace
- ✅ Creates symlink to `packages/vite-plugin-open-api-server`
- ✅ Hot-reload works: plugin changes trigger Vite HMR in playground
- ✅ No version bumps needed during development
- ✅ pnpm automatically replaces with proper semver range on publish
- ✅ Official pnpm recommendation for internal development dependencies

**Development Flow:**
1. Terminal 1: `pnpm --filter @websublime/vite-plugin-open-api-server dev` (tsdown --watch)
2. Terminal 2: `pnpm playground` (Vite dev server)
3. Edit plugin code → tsdown rebuilds → Vite HMR reloads playground

**Alternative Protocols (NOT used):**
- `workspace:^0.1.0` - Requires version bumps, less convenient
- `link:../../packages/...` - Fragile paths, not portable
- `file:...` - Copies files instead of symlinking, no hot-reload

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P0-12.1 | Create package.json | Create `playground/petstore-app/package.json` with `name: "petstore-app"`, `private: true` (prevent npm publishing), `version: "0.0.0"`, `type: "module"`. Add scripts: `dev: "vite"`, `build: "vue-tsc && vite build"`, `preview: "vite preview"`. Add dependencies: `vue: "^3.5.26"`. Add devDependencies: `@faker-js/faker: "^10.2.0"` (for seed data), `@vitejs/plugin-vue: "^6.0.3"` (Vue SFC support), `@websublime/vite-plugin-open-api-server: "workspace:*"` (local plugin), `typescript: "^5.9.3"`, `vite: "^7.3.1"`, `vue-tsc: "^3.2.2"` (Vue type checking). The `workspace:*` protocol creates symlink to local plugin package. |
| P0-12.2 | Create vite.config.ts | Create `playground/petstore-app/vite.config.ts` importing `defineConfig` from 'vite', `vue` from '@vitejs/plugin-vue', and `openApiServerPlugin` from local plugin. Export config with `plugins: [vue(), openApiServerPlugin({...})]`. Configure plugin with: `openApiPath: './src/apis/petstore/petstore.openapi.yaml'`, `port: 3456` (mock server port), `proxyPath: '/api/v3'` (API path prefix), `handlersDir: './src/apis/petstore/open-api-server/handlers'` (custom handlers), `seedsDir: './src/apis/petstore/open-api-server/seeds'` (seed data), `verbose: true` (detailed logging). This configuration demonstrates all plugin options. |
| P0-12.3 | Create index.html | Create `playground/petstore-app/index.html` with HTML5 boilerplate: `<!DOCTYPE html>`, `<html lang="en">`, `<head>` with charset, viewport meta, title "Petstore App - OpenAPI Mock Server". Add `<body>` with `<div id="app"></div>` (Vue mount point) and `<script type="module" src="/src/main.ts"></script>` (Vite entry). This is the standard Vite+Vue entry HTML that Vite serves at root. |
| P0-12.4 | Create src/main.ts | Create `playground/petstore-app/src/main.ts` with Vue app initialization: import `createApp` from 'vue', import `App` from './App.vue'. Call `createApp(App).mount('#app')`. This is the minimal Vue 3 entry point that mounts the root component to the DOM element with id "app". |
| P0-12.5 | Create src/App.vue | Create `playground/petstore-app/src/App.vue` with Vue SFC structure: `<template>` with heading "Petstore API Mock Server" and placeholder text "Plugin loaded. Mock server will be available at http://localhost:3456". Add `<script setup lang="ts">` section (empty for now, will add API calls later). Add `<style scoped>` with basic styling. This provides visual confirmation the app is running. |
| P0-12.6 | Create tsconfig.json | Create `playground/petstore-app/tsconfig.json` extending root config with `extends: "../../tsconfig.json"`. Override compilerOptions: `lib: ["ES2023", "DOM", "DOM.Iterable"]` (browser APIs), `types: ["vite/client"]` (Vite environment types), `jsx: "preserve"` (Vue handles JSX), `jsxImportSource: "vue"` (Vue JSX runtime). Set `include: ["src/**/*.ts", "src/**/*.vue"]` to check both TypeScript and Vue SFC files. This enables TypeScript support for Vue components. |
| P0-12.7 | Create directory structure for OpenAPI files | Create directory structure: `playground/petstore-app/src/apis/petstore/` for OpenAPI spec, `src/apis/petstore/open-api-server/handlers/` for custom handlers, `src/apis/petstore/open-api-server/seeds/` for seed data. Add `.gitkeep` files to empty directories so they're tracked in git. This establishes the expected structure for OpenAPI integration (spec and handlers added in P0-13). |
| P0-12.8 | Test workspace linking and hot-reload | Run `pnpm install` from root to create symlink for workspace:* dependency. Verify symlink exists: `ls -la playground/petstore-app/node_modules/@websublime/` should show symlink to `../../../packages/vite-plugin-open-api-server`. Run `pnpm playground` to start Vite dev server. Verify app loads at http://localhost:5173. In separate terminal, run `pnpm --filter @websublime/vite-plugin-open-api-server dev` to start plugin watch mode. Make a change to plugin source (e.g., add console.log), verify tsdown rebuilds, and verify Vite HMR reloads the playground app automatically. |

**File: `playground/petstore-app/package.json`**
```json
{
  "name": "petstore-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.5.26"
  },
  "devDependencies": {
    "@faker-js/faker": "^10.2.0",
    "@vitejs/plugin-vue": "^6.0.3",
    "@websublime/vite-plugin-open-api-server": "workspace:*",
    "typescript": "^5.9.3",
    "vite": "^7.3.1",
    "vue-tsc": "^3.2.2"
  }
}
```

**File: `playground/petstore-app/vite.config.ts`**
```typescript
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { openApiServerPlugin } from '@websublime/vite-plugin-open-api-server';

export default defineConfig({
  plugins: [
    vue(),
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

**Technical Considerations:**
- **workspace:* protocol**: pnpm-specific feature that creates symlinks to local packages, enabling real-time development without publishing
- **Symlink location**: pnpm creates symlink at `node_modules/@websublime/vite-plugin-open-api-server` → `../../../packages/vite-plugin-open-api-server`
- **Hot module replacement**: Vite's HMR watches symlinked directories, so plugin changes trigger reload in playground
- **Build order dependency**: Plugin must be built (dist/ exists) before playground can import it. Run `pnpm build` if plugin not built yet
- **private: true**: Critical to prevent accidental publishing of playground app to npm registry
- **Vue SFC support**: @vitejs/plugin-vue enables .vue file imports in TypeScript
- **Type checking**: vue-tsc is TypeScript wrapper that understands Vue SFC files for type checking
- **Port conflicts**: Plugin mock server uses port 3456, Vite dev server uses 5173 (default), ensure both available
- **Directory structure**: OpenAPI files go in src/apis/{api-name}/ to support multiple APIs in one app
- **Development workflow**: Two terminals needed: one for playground (pnpm playground), one for plugin watch (pnpm dev)
- **Vite config imports**: Can import from local plugin using workspace dependency before plugin is published

**Expected Outputs:**

After completing this task:

1. **Playground directory structure**:
   ```
   playground/petstore-app/
   ├── package.json              # Playground package config
   ├── vite.config.ts            # Vite config with plugin
   ├── tsconfig.json             # Vue TypeScript config
   ├── index.html                # Entry HTML
   ├── src/
   │   ├── main.ts              # Vue app entry
   │   ├── App.vue              # Root component
   │   └── apis/
   │       └── petstore/
   │           ├── petstore.openapi.yaml (P0-13)
   │           └── open-api-server/
   │               ├── handlers/ # Custom handlers
   │               └── seeds/    # Seed data
   └── node_modules/
       └── @websublime/
           └── vite-plugin-open-api-server → symlink
   ```

2. **Workspace symlink verification**:
   ```bash
   $ ls -la playground/petstore-app/node_modules/@websublime/
   vite-plugin-open-api-server -> ../../../packages/vite-plugin-open-api-server
   ```

3. **Dev server running**:
   ```bash
   $ pnpm playground
   
   VITE v7.3.1  ready in 245 ms
   
   ➜  Local:   http://localhost:5173/
   ➜  Network: use --host to expose
   ➜  press h + enter to show help
   ```

4. **Browser output**: Page loads showing "Petstore API Mock Server" heading

5. **Hot-reload demo**:
   ```
   Terminal 1: pnpm playground (Vite running)
   Terminal 2: pnpm --filter @websublime/vite-plugin-open-api-server dev (tsdown watch)
   
   [Edit src/plugin.ts in plugin package]
   Terminal 2: ✓ Build succeeded in 87ms
   Terminal 1: [vite] page reload src/plugin.ts
   Browser: Page reloads automatically
   ```

**Acceptance Criteria:**
- [ ] `playground/petstore-app/package.json` created with all dependencies
- [ ] Package has `private: true` to prevent npm publishing
- [ ] Package has `@websublime/vite-plugin-open-api-server: "workspace:*"` dependency
- [ ] `playground/petstore-app/vite.config.ts` created with plugin configuration
- [ ] Vite config imports `openApiServerPlugin` from local plugin successfully
- [ ] Plugin configured with all options: openApiPath, port, proxyPath, handlersDir, seedsDir, verbose
- [ ] `playground/petstore-app/index.html` created with Vue mount point
- [ ] index.html includes `<script type="module" src="/src/main.ts"></script>`
- [ ] `playground/petstore-app/src/main.ts` created with Vue app initialization
- [ ] main.ts imports and mounts App.vue component
- [ ] `playground/petstore-app/src/App.vue` created with template, script, and style sections
- [ ] App.vue displays "Petstore API Mock Server" heading
- [ ] `playground/petstore-app/tsconfig.json` created extending root config
- [ ] tsconfig.json includes Vue-specific options: DOM lib, vite/client types, jsx: preserve
- [ ] tsconfig.json includes .vue files in `include` array
- [ ] Directory structure created: `src/apis/petstore/open-api-server/handlers/`
- [ ] Directory structure created: `src/apis/petstore/open-api-server/seeds/`
- [ ] Empty directories have .gitkeep files for git tracking
- [ ] `pnpm install` from root creates symlink for workspace dependency
- [ ] Symlink exists at `node_modules/@websublime/vite-plugin-open-api-server`
- [ ] Symlink points to `../../../packages/vite-plugin-open-api-server`
- [ ] `pnpm playground` command starts Vite dev server successfully
- [ ] Vite dev server runs on http://localhost:5173 (default port)
- [ ] Vue app loads in browser without errors
- [ ] Browser console shows no TypeScript errors
- [ ] App displays placeholder content correctly
- [ ] Plugin configuration is parsed by Vite (no config errors)
- [ ] TypeScript recognizes plugin imports (IntelliSense works)
- [ ] Hot-reload works: plugin changes trigger tsdown rebuild
- [ ] Hot-reload works: Vite detects plugin changes and reloads page
- [ ] Can run plugin watch mode and playground simultaneously (two terminals)
- [ ] No port conflicts between mock server (3456) and Vite (5173)
- [ ] Committed with message: `feat(playground): create Vue playground app with workspace:* dependency for plugin testing`

---

#### P0-13: Add Swagger Petstore OpenAPI Spec

**Description:** Download the official Swagger Petstore OpenAPI 3.1.x specification and add it to the playground application as test data. The Petstore API is a canonical example API specification that demonstrates all major OpenAPI features (paths, operations, parameters, request/response schemas, authentication) and serves as the reference API for developing and testing the plugin. This task also creates placeholder handler and seed file structures that will be implemented in later phases.

**Context:**
- **Swagger Petstore**: Official example API from the OpenAPI Initiative demonstrating OpenAPI specification features
- **OpenAPI 3.1.x**: Latest OpenAPI specification version (based on JSON Schema 2020-12), supported by @scalar/openapi-parser
- **Spec location**: Official spec available at https://petstore3.swagger.io/api/v3/openapi.json (JSON) or https://petstore3.swagger.io/api/v3/openapi.yaml (YAML)
- **Why YAML format**: More readable than JSON, supports comments, standard format for OpenAPI specs in projects
- **Spec contents**: Petstore defines 19 endpoints across 3 tags (pet, store, user) with CRUD operations, authentication (apiKey, OAuth2), and complex schemas
- **Handler structure**: Handlers are TypeScript files that override default mock responses with custom logic (e.g., database queries, validation)
- **Seed structure**: Seeds are TypeScript files that populate mock server with initial data (e.g., sample pets, users)
- **File naming convention**: Use kebab-case for handler/seed files matching operationId from OpenAPI spec

**Why This Approach:**
- **Official spec**: Using official Petstore ensures we test against well-formed, complete OpenAPI spec
- **Version 3.1.x**: Latest version with improved JSON Schema support and better security scheme definitions
- **YAML format**: Easier to read, edit, and diff than JSON; standard in modern API projects
- **Placeholder files**: Creating empty handlers/seeds establishes structure without implementing functionality (done in Phase 2)
- **apis/ directory structure**: Supports multiple APIs in one playground app (future extensibility)

**Implementation Approach:**
1. Download official Swagger Petstore OpenAPI 3.1.x spec from petstore3.swagger.io
2. Save as `playground/petstore-app/src/apis/petstore/petstore.openapi.yaml` (matches vite.config.ts path)
3. Validate YAML syntax and OpenAPI schema compliance
4. Review spec to identify key operationIds (addPet, getPetById, updatePet, etc.)
5. Create placeholder handler files in `src/apis/petstore/open-api-server/handlers/` for commonly customized operations
6. Create placeholder seed files in `src/apis/petstore/open-api-server/seeds/` for initial data
7. Document spec structure in comments (tags, paths, security schemes)
8. Test that plugin can parse the spec (even if mock server isn't functional yet)

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P0-13.1 | Download Swagger Petstore spec | Download the official Swagger Petstore OpenAPI 3.1.x specification from https://petstore3.swagger.io/api/v3/openapi.yaml using curl or wget: `curl -o petstore.openapi.yaml https://petstore3.swagger.io/api/v3/openapi.yaml`. Verify download completed successfully by checking file size (should be ~50-100 KB). Review spec structure: should have `openapi: 3.1.0`, `info` with title "Swagger Petstore - OpenAPI 3.1", `servers` array, `paths` object with 19 endpoints, `components.schemas` with Pet/Order/User models. |
| P0-13.2 | Save spec in playground | Move downloaded file to `playground/petstore-app/src/apis/petstore/petstore.openapi.yaml`. This matches the `openApiPath` configured in vite.config.ts from P0-12. Verify file is in correct location by checking path from playground root: `src/apis/petstore/petstore.openapi.yaml`. Add comment at top of file: `# Swagger Petstore OpenAPI 3.1 Specification / # Official example API from OpenAPI Initiative / # Source: https://petstore3.swagger.io`. This documents the spec origin. |
| P0-13.3 | Validate OpenAPI spec | Install and use an OpenAPI validator to ensure spec is valid. Options: 1) `npx @redocly/cli lint petstore.openapi.yaml` (Redocly validator), 2) Use @scalar/openapi-parser programmatically (the library our plugin uses), 3) Use online validator at https://editor.swagger.io. Verify no errors or warnings. Check that spec complies with OpenAPI 3.1.x schema. Validate all $ref references resolve correctly. Confirm all operationIds are unique. |
| P0-13.4 | Create placeholder handler files | Create placeholder TypeScript handler files in `playground/petstore-app/src/apis/petstore/open-api-server/handlers/` for commonly customized operations. Create files: `add-pet.handler.ts` (POST /pet), `get-pet-by-id.handler.ts` (GET /pet/{petId}), `update-pet.handler.ts` (PUT /pet), `delete-pet.handler.ts` (DELETE /pet/{petId}). Each file should export a default async function with signature: `export default async function handler(context: HandlerContext) { return null; }` (returning null means "use default mock"). Add comment explaining handler purpose and when it will be implemented (Phase 2). Import HandlerContext type from plugin (will be defined in Phase 1). |
| P0-13.5 | Create placeholder seed files | Create placeholder TypeScript seed files in `playground/petstore-app/src/apis/petstore/open-api-server/seeds/` for initial data population. Create files: `pets.seed.ts` (sample pets), `users.seed.ts` (sample users), `orders.seed.ts` (sample orders). Each file should export a default async function with signature: `export default async function seed(context: SeedContext) { return []; }` (returning empty array for now). Add comment explaining seed purpose and when it will be implemented (Phase 2). Import SeedContext type from plugin (will be defined in Phase 1). |
| P0-13.6 | Document spec structure | Add a README.md file at `playground/petstore-app/src/apis/petstore/README.md` documenting the Petstore API structure. Include sections: "Overview" (what Petstore API is), "Endpoints" (table of 19 endpoints grouped by tag: pet, store, user), "Authentication" (apiKey and OAuth2 schemes), "Schemas" (Pet, Category, Tag, Order, User models), "Custom Handlers" (list of created handlers and their purpose), "Seeds" (list of created seeds and their purpose). This serves as reference documentation for understanding the API during development. |
| P0-13.7 | Test spec parsing | Run the playground app with `pnpm playground` and verify that the plugin can locate and load the OpenAPI spec file. Check Vite console output for plugin logs (if verbose: true is set). Expected behavior: Plugin finds spec at configured path, attempts to parse it (will fail gracefully if parser not implemented yet), no file not found errors. Check browser console for any errors. Verify spec file is accessible by Vite (not excluded by gitignore or similar). |

**Technical Considerations:**
- **OpenAPI 3.1.x vs 3.0.x**: Version 3.1.x is backward compatible with 3.0.x but uses full JSON Schema 2020-12 (more powerful validation)
- **YAML vs JSON**: YAML is human-readable and supports comments, but parsing is slightly slower than JSON (negligible for dev)
- **operationId uniqueness**: operationIds must be unique across entire spec; they're used to match handlers to endpoints
- **$ref resolution**: OpenAPI uses JSON Schema $ref for reusable components; validator must resolve all references
- **Security schemes**: Petstore uses apiKey (header/query/cookie) and OAuth2 (authorization code flow) for authentication examples
- **File naming for handlers**: Use kebab-case matching operationId (addPet → add-pet.handler.ts) for consistency
- **Handler/seed signatures**: Must match plugin's expected function signatures (defined in Phase 1 types)
- **Placeholder exports**: Returning null from handler means "use default mock"; returning empty array from seed means "no seed data"
- **Spec modifications**: Don't modify downloaded spec; keep it pristine for testing against official example
- **Multiple APIs support**: Directory structure (`apis/petstore/`) allows adding more APIs later (e.g., `apis/another-api/`)

**Expected Outputs:**

After completing this task:

1. **OpenAPI spec file**:
   ```
   playground/petstore-app/src/apis/petstore/petstore.openapi.yaml
   Size: ~50-100 KB
   Format: YAML
   Version: OpenAPI 3.1.0
   Endpoints: 19 operations (pet, store, user tags)
   ```

2. **Spec structure excerpt**:
   ```yaml
   openapi: 3.1.0
   info:
     title: Swagger Petstore - OpenAPI 3.1
     version: 1.0.19
   servers:
     - url: https://petstore3.swagger.io/api/v3
   paths:
     /pet:
       post:
         operationId: addPet
         # ...
     /pet/{petId}:
       get:
         operationId: getPetById
         # ...
   components:
     schemas:
       Pet:
         type: object
         properties:
           id: { type: integer }
           name: { type: string }
           # ...
   ```

3. **Handler files** (4 placeholder files):
   ```typescript
   // playground/petstore-app/src/apis/petstore/open-api-server/handlers/add-pet.handler.ts
   import type { HandlerContext } from '@websublime/vite-plugin-open-api-server';
   
   /**
    * Custom handler for POST /pet (addPet operation)
    * 
    * Returns null to use default mock behavior.
    * Implementation in Phase 2: P2-01 (Handler Loader)
    */
   export default async function handler(context: HandlerContext) {
     return null; // Use default mock
   }
   ```

4. **Seed files** (3 placeholder files):
   ```typescript
   // playground/petstore-app/src/apis/petstore/open-api-server/seeds/pets.seed.ts
   import type { SeedContext } from '@websublime/vite-plugin-open-api-server';
   
   /**
    * Seed data for Pet entities
    * 
    * Returns empty array for now.
    * Implementation in Phase 2: P2-02 (Seed Loader)
    */
   export default async function seed(context: SeedContext) {
     return []; // No seed data yet
   }
   ```

5. **README.md** at `src/apis/petstore/README.md`:
   ```markdown
   # Swagger Petstore API
   
   Official OpenAPI 3.1 example specification from the OpenAPI Initiative.
   
   ## Endpoints (19 operations)
   
   ### Pet Operations
   - POST /pet - addPet - Add a new pet
   - PUT /pet - updatePet - Update an existing pet
   - GET /pet/findByStatus - findPetsByStatus - Find pets by status
   - GET /pet/{petId} - getPetById - Find pet by ID
   - DELETE /pet/{petId} - deletePet - Delete a pet
   
   [... more endpoints ...]
   
   ## Custom Handlers
   - add-pet.handler.ts - POST /pet
   - get-pet-by-id.handler.ts - GET /pet/{petId}
   - update-pet.handler.ts - PUT /pet
   - delete-pet.handler.ts - DELETE /pet/{petId}
   
   ## Seeds
   - pets.seed.ts - Sample pet data
   - users.seed.ts - Sample user data
   - orders.seed.ts - Sample order data
   ```

6. **Directory structure**:
   ```
   playground/petstore-app/src/apis/petstore/
   ├── README.md
   ├── petstore.openapi.yaml
   └── open-api-server/
       ├── handlers/
       │   ├── add-pet.handler.ts
       │   ├── get-pet-by-id.handler.ts
       │   ├── update-pet.handler.ts
       │   └── delete-pet.handler.ts
       └── seeds/
           ├── pets.seed.ts
           ├── users.seed.ts
           └── orders.seed.ts
   ```

**Acceptance Criteria:**
- [ ] `petstore.openapi.yaml` downloaded from official source
- [ ] File saved at `playground/petstore-app/src/apis/petstore/petstore.openapi.yaml`
- [ ] File path matches `openApiPath` in vite.config.ts
- [ ] File size is 50-100 KB (reasonable for Petstore spec)
- [ ] YAML syntax is valid (no parse errors)
- [ ] Spec declares `openapi: 3.1.0` or `openapi: 3.1.x`
- [ ] Spec has `info.title: "Swagger Petstore - OpenAPI 3.1"`
- [ ] Spec contains `paths` object with 19 endpoint operations
- [ ] Spec contains `components.schemas` with Pet, Order, User models
- [ ] All operationIds are unique across the spec
- [ ] All $ref references resolve correctly (no broken references)
- [ ] OpenAPI validation passes with no errors (using validator tool)
- [ ] Comment added to spec file documenting source URL
- [ ] `handlers/` directory contains 4 placeholder handler files
- [ ] Handler files follow naming convention: kebab-case matching operationId
- [ ] Each handler file exports default async function with HandlerContext parameter
- [ ] Each handler function returns null (placeholder for default mock behavior)
- [ ] Handler files import HandlerContext type from plugin
- [ ] Handler files have JSDoc comments explaining purpose and implementation phase
- [ ] `seeds/` directory contains 3 placeholder seed files
- [ ] Each seed file exports default async function with SeedContext parameter
- [ ] Each seed function returns empty array (placeholder for no seed data)
- [ ] Seed files import SeedContext type from plugin
- [ ] Seed files have JSDoc comments explaining purpose and implementation phase
- [ ] README.md created documenting Petstore API structure
- [ ] README.md lists all 19 endpoints grouped by tag
- [ ] README.md documents authentication schemes (apiKey, OAuth2)
- [ ] README.md lists schemas (Pet, Category, Tag, Order, User)
- [ ] README.md explains custom handlers and their purposes
- [ ] README.md explains seeds and their purposes
- [ ] `pnpm playground` runs without file not found errors for OpenAPI spec
- [ ] Plugin logs show spec file located (if verbose logging enabled)
- [ ] No YAML parse errors in console when plugin tries to load spec
- [ ] TypeScript recognizes handler/seed imports (no import errors)
- [ ] All files committed to git (spec, handlers, seeds, README)
- [ ] Committed with message: `feat(playground): add Swagger Petstore OpenAPI 3.1 spec with placeholder handlers and seeds`
- [ ] Handler/seed directory structure exists
- [ ] Placeholder files have correct export format

---

#### P0-14: Create Documentation

**Description:** Create comprehensive project documentation including root README.md explaining the monorepo structure and purpose, CONTRIBUTING.md with changeset workflow and development guidelines, MIT LICENSE file, CLAUDE.md context file for AI assistants, and ensure the plugin package has proper README.md with usage examples. This documentation serves as the entry point for developers, contributors, and users, establishing clear guidelines for development, contribution, and usage of the Vite plugin.

**Context:**
- **Root README.md**: Entry point for the entire monorepo, explains project structure, quick start, and links to package READMEs
- **CONTRIBUTING.md**: Essential for open source projects, documents changeset workflow (from P0-07), development setup, code standards, and PR process
- **LICENSE**: Legal requirement for npm packages, MIT is permissive and widely accepted in JavaScript ecosystem
- **CLAUDE.md**: AI assistant context file (similar to .github/copilot-instructions.md), helps AI understand project structure and conventions
- **Plugin README.md**: Already created in P0-10, needs verification and potential updates based on implemented features
- **Documentation style**: Clear, concise, example-driven; follows best practices from popular Vite plugins (vite-plugin-vue, vite-plugin-react)

**Why This Documentation:**
- **README badges**: npm version, license, downloads - increase credibility and provide quick info
- **Installation instructions**: Must be clear and copy-pasteable for good DX
- **Usage examples**: Real code examples are more valuable than prose descriptions
- **Contribution guide**: Reduces friction for contributors, increases project sustainability
- **AI context files**: Help AI assistants provide better assistance to developers (follows GitHub Copilot pattern)

**Implementation Approach:**
1. Update root README.md with monorepo overview, quick start, package links, and badges
2. Create CONTRIBUTING.md documenting changeset workflow, branch strategy, commit conventions, and PR process
3. Copy MIT LICENSE template with WebSublime copyright
4. Update/create CLAUDE.md with project context, structure, and conventions for AI assistants
5. Verify plugin README.md from P0-10 is complete and accurate
6. Add README.md to playground app explaining its purpose as testing environment
7. Ensure all documentation uses consistent formatting (Markdown lint)

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P0-14.1 | Update root README.md | Update root `README.md` with project overview section explaining this is a monorepo for `@websublime/vite-plugin-open-api-server` Vite plugin. Add "Features" section listing key capabilities (OpenAPI-based mock server, Scalar integration, custom handlers, seed data). Add "Quick Start" with installation (`pnpm add -D @websublime/vite-plugin-open-api-server`) and basic usage example. Add "Monorepo Structure" section explaining packages/ (plugin) and playground/ (test app) directories. Add "Development" section with commands (`pnpm install`, `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm playground`). Add badges for npm version, license, and Node.js version requirement. Add links to CONTRIBUTING.md, LICENSE, and package README. |
| P0-14.2 | Create CONTRIBUTING.md | Create `CONTRIBUTING.md` at repository root documenting contribution workflow. Add "Getting Started" section with prerequisites (Node.js 20+, pnpm 10+) and setup steps (`pnpm install`, verify with `pnpm build`). Add "Changeset Workflow" section explaining how to create changesets (`pnpm changeset`), choose bump type (major/minor/patch), write descriptions, and commit changeset files. Add "Development Workflow" section with branch naming (`feature/`, `fix/`, `docs/`), commit message format (conventional commits), and PR process. Add "Code Standards" section referencing Biome linting, TypeScript strict mode, and >80% test coverage requirement. Add "Testing" section with `pnpm test` commands. Reference bd issue tracking workflow from .github/copilot-instructions.md. |
| P0-14.3 | Create LICENSE | Create `LICENSE` file at repository root with MIT License template. Use 2024 (or current year) as copyright year and "WebSublime" as copyright holder. MIT License grants permission to use, copy, modify, merge, publish, distribute, sublicense, and sell the software with minimal restrictions (attribution required). This matches the `"license": "MIT"` field in package.json files and is required for npm publishing. Verify license text matches official MIT License template from https://opensource.org/licenses/MIT. |
| P0-14.4 | Update CLAUDE.md | Create or update `CLAUDE.md` (or `.github/CLAUDE.md`) with AI assistant context. Add "Project Overview" section explaining this is a TypeScript monorepo for a Vite plugin. Add "Repository Structure" section with ASCII tree showing packages/, playground/, history/, .github/. Add "Technology Stack" listing pnpm workspaces, Biome, TypeScript, tsdown, Vitest, Vue 3. Add "Development Conventions" section with workspace:* protocol usage, conventional commits, changeset workflow, bd issue tracking. Add "Important Files" section listing key config files (biome.json, tsconfig.json, pnpm-workspace.yaml, repo.config.toml). Add "Build System" explaining tsdown for plugin, Vite for playground. Add "Testing Strategy" (unit tests with Vitest, playground for integration). This helps AI assistants understand project context in future sessions. |
| P0-14.5 | Verify plugin README.md | Verify `packages/vite-plugin-open-api-server/README.md` created in P0-10 is complete and accurate. Ensure it has: Installation section (`pnpm add -D @websublime/vite-plugin-open-api-server`), Usage section with vite.config.ts example showing all plugin options, Configuration section with table of options (openApiPath, port, proxyPath, handlersDir, seedsDir, verbose) and descriptions, Features section listing capabilities, Requirements section (Node.js 20+, Vite 6+), Examples section with handler and seed examples (placeholders for now), API Reference section (link to types), License section (MIT). Update if any information is missing or incorrect. This README appears on npm package page. |
| P0-14.6 | Create playground README.md | Create `playground/petstore-app/README.md` explaining this is a test/development application for the plugin. Add "Purpose" section: This Vue 3 app demonstrates plugin integration and serves as development environment. Add "Running" section with `pnpm playground` command. Add "Testing Plugin Changes" section explaining two-terminal workflow: terminal 1 runs `pnpm dev` in plugin package (watch mode), terminal 2 runs `pnpm playground`. Add "OpenAPI Spec" section explaining Petstore API location and structure. Add "Custom Handlers" section listing placeholder handlers. Add "Seeds" section listing placeholder seeds. Note this is NOT published to npm (private: true). |

**Technical Considerations:**
- **README badges**: Use shields.io for npm version, license, Node.js version badges (dynamic URLs)
- **Markdown formatting**: Use Markdown lint rules (headings, code blocks, tables) for consistency
- **Code examples**: Always use syntax highlighting with language tags (```typescript, ```bash, ```json)
- **LICENSE requirements**: MIT requires copyright notice and permission notice in all copies
- **CONTRIBUTING.md length**: Balance comprehensiveness with readability; link to external docs for details
- **CLAUDE.md vs copilot-instructions.md**: CLAUDE.md is for Claude AI specifically, copilot-instructions.md is for GitHub Copilot (both can coexist)
- **Documentation versioning**: READMEs should match implemented features (don't document unimplemented features)
- **Links**: Use relative links for files in repo (./CONTRIBUTING.md), absolute URLs for external resources
- **Examples accuracy**: All code examples must be syntactically correct and runnable

**Expected Outputs:**

After completing this task:

1. **Root README.md** (updated):
   ```markdown
   # vite-plugin-open-api-server
   
   [![npm version](https://img.shields.io/npm/v/@websublime/vite-plugin-open-api-server.svg)](...)
   [![license](https://img.shields.io/npm/l/@websublime/vite-plugin-open-api-server.svg)](./LICENSE)
   [![node version](https://img.shields.io/node/v/@websublime/vite-plugin-open-api-server.svg)](...)
   
   Vite plugin for OpenAPI-based mock server with Scalar integration.
   
   ## Features
   - OpenAPI 3.x specification parsing
   - Automatic mock server generation
   - Custom request handlers
   - Seed data support
   - [... more features ...]
   
   ## Quick Start
   [... installation and usage ...]
   
   ## Monorepo Structure
   - packages/vite-plugin-open-api-server - Main plugin package
   - playground/petstore-app - Test application
   
   ## Development
   [... development commands ...]
   ```

2. **CONTRIBUTING.md** (new):
   ```markdown
   # Contributing to vite-plugin-open-api-server
   
   ## Getting Started
   Prerequisites: Node.js 20+, pnpm 10+
   
   ## Changeset Workflow
   1. Make your changes
   2. Run `pnpm changeset` to create a changeset
   3. Choose bump type (major/minor/patch)
   4. Write clear description
   5. Commit changeset file with your changes
   
   ## Development Workflow
   - Branch naming: feature/*, fix/*, docs/*
   - Commit messages: Conventional commits format
   - PR process: [... details ...]
   
   ## Code Standards
   - Biome linting: `pnpm lint`
   - TypeScript strict mode
   - Test coverage: >80%
   ```

3. **LICENSE** (new):
   ```
   MIT License
   
   Copyright (c) 2024 WebSublime
   
   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:
   
   [... full MIT license text ...]
   ```

4. **CLAUDE.md** (new/updated):
   ```markdown
   # Claude AI Context
   
   ## Project Overview
   TypeScript monorepo for @websublime/vite-plugin-open-api-server Vite plugin
   
   ## Repository Structure
   vite-open-api-server/
   ├── packages/vite-plugin-open-api-server/  # Published plugin
   ├── playground/petstore-app/               # Test app
   ├── history/                               # Planning docs
   └── .github/                               # CI/CD
   
   ## Technology Stack
   - pnpm workspaces (monorepo)
   - Biome (linting/formatting)
   - TypeScript 5.9+ (strict mode)
   - tsdown (bundler)
   - Vitest (testing)
   
   ## Development Conventions
   [... conventions ...]
   ```

5. **Plugin README.md** (verified/updated): Complete with all sections

6. **Playground README.md** (new): Explains test app purpose and workflow

**Acceptance Criteria:**
- [ ] Root `README.md` updated with project overview section
- [ ] Root README includes badges for npm version, license, Node.js version
- [ ] Root README has "Features" section listing plugin capabilities
- [ ] Root README has "Quick Start" with installation and basic usage example
- [ ] Root README has "Monorepo Structure" explaining packages/ and playground/
- [ ] Root README has "Development" section with pnpm commands
- [ ] Root README links to CONTRIBUTING.md and LICENSE
- [ ] `CONTRIBUTING.md` created at repository root
- [ ] CONTRIBUTING.md has "Getting Started" with prerequisites and setup
- [ ] CONTRIBUTING.md has "Changeset Workflow" section explaining `pnpm changeset`
- [ ] CONTRIBUTING.md explains bump types (major/minor/patch) with examples
- [ ] CONTRIBUTING.md has "Development Workflow" with branch naming and commit conventions
- [ ] CONTRIBUTING.md has "Code Standards" referencing Biome, TypeScript, test coverage
- [ ] CONTRIBUTING.md references bd issue tracking workflow
- [ ] `LICENSE` file created at repository root
- [ ] LICENSE uses MIT License template with correct year (2024 or current)
- [ ] LICENSE copyright holder is "WebSublime"
- [ ] LICENSE text matches official MIT License template
- [ ] `CLAUDE.md` created (or `.github/CLAUDE.md`) with AI assistant context
- [ ] CLAUDE.md has "Project Overview" explaining monorepo purpose
- [ ] CLAUDE.md has "Repository Structure" with ASCII tree diagram
- [ ] CLAUDE.md lists technology stack (pnpm, Biome, TypeScript, tsdown, Vitest, Vue)
- [ ] CLAUDE.md documents development conventions (workspace:*, conventional commits, changesets)
- [ ] CLAUDE.md lists important config files with brief explanations
- [ ] `packages/vite-plugin-open-api-server/README.md` verified complete
- [ ] Plugin README has Installation, Usage, Configuration, Features, Requirements, License sections
- [ ] Plugin README usage example is syntactically correct TypeScript
- [ ] Plugin README configuration table lists all options with descriptions
- [ ] `playground/petstore-app/README.md` created
- [ ] Playground README explains purpose as test/development environment
- [ ] Playground README documents two-terminal development workflow
- [ ] Playground README references Petstore API location and structure
- [ ] All Markdown files use consistent formatting (headings, code blocks, lists)
- [ ] All code examples have proper syntax highlighting (```typescript, ```bash, etc.)
- [ ] All internal links use relative paths (./CONTRIBUTING.md)
- [ ] All external links use absolute URLs
- [ ] Markdown files pass linting (no broken links, consistent formatting)
- [ ] Documentation matches currently implemented features (no future features documented)
- [ ] Committed with message: `docs: create comprehensive project documentation with README, CONTRIBUTING, LICENSE, and CLAUDE context`

---

### 4.3 Phase 0 Summary

| Task ID | Task Name | Estimate | Dependencies |
|---------|-----------|----------|--------------|
| P0-01 | Initialize Monorepo Structure | XS | - |
| P0-02 | Configure pnpm Workspace | S | P0-01 |
| P0-03 | Create Root package.json | S | P0-02 |
| P0-04 | Configure Biome.js | M | P0-03 |
| P0-05 | Create .editorconfig | XS | P0-01 |
| P0-06 | Configure TypeScript | S | P0-03 |
| P0-07 | Configure workspace-tools | M | P0-03 |
| P0-08 | Create GitHub Workflow - CI | M | P0-04, P0-06 |
| P0-09 | Create GitHub Workflow - Release | M | P0-07, P0-08 |
| P0-10 | Create Plugin Package Skeleton | S | P0-06 |
| P0-11 | Configure tsdown for Build | S | P0-10 |
| P0-12 | Create Playground Application | M | P0-10 |
| P0-13 | Add Swagger Petstore OpenAPI Spec | S | P0-12 |
| P0-14 | Create Documentation | S | P0-01 |

**Total Estimate: 16.5 story points (~7 days)**

---

## 5. Phase 1: Core Infrastructure

### 5.1 Overview

**Objective:** Implement the foundational plugin infrastructure including OpenAPI parsing, mock server integration, and Vite plugin lifecycle.

**Dependencies:** Phase 0 complete

**Functional Requirements:**
- FR-003: OpenAPI Parser & Validation (P0 Critical)
- FR-001: OpenAPI-Based Mock Generation (P0 Critical)
- FR-002: Vite Dev Server Integration (P0 Critical)

**Deliverables:**
- Working OpenAPI document parser
- Basic Scalar Mock Server integration
- Vite plugin that starts/stops the mock server

---

### 5.2 Task Breakdown

#### P1-01: Implement OpenAPI Parser (FR-003)

**Description:** Implement OpenAPI document loading, parsing, and validation using @scalar/openapi-parser.

**Estimate:** M (3 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P1-01.1 | Create parser/openapi-loader.ts | Load and parse OpenAPI specs |
| P1-01.2 | Implement YAML/JSON detection | Support both formats |
| P1-01.3 | Implement validation | Use @scalar/openapi-parser validate() |
| P1-01.4 | Implement $ref resolution | Use dereference() |
| P1-01.5 | Implement statistics extraction | Count endpoints, schemas |
| P1-01.6 | Create parser/schema-extractor.ts | Extract operations and schemas |
| P1-01.7 | Implement error formatting | User-friendly error messages |
| P1-01.8 | Add unit tests | Test all parser functions |

**Acceptance Criteria (from PRS):**
- [ ] Use `@scalar/openapi-parser` as the primary parsing library
- [ ] Support both YAML (.yaml, .yml) and JSON (.json) formats
- [ ] Validate document structure before any enhancement
- [ ] Resolve all $ref references for proper schema matching
- [ ] Handle circular references gracefully
- [ ] Report validation errors clearly with line numbers if possible
- [ ] Extract all operations with their operationIds
- [ ] Extract all schemas from components/schemas
- [ ] Provide document statistics (endpoint count, schema count)

---

#### P1-02: Implement Security Normalizer (FR-010 partial)

**Description:** Implement security scheme normalization using @scalar/openapi-parser sanitize().

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P1-02.1 | Create parser/security-normalizer.ts | Security normalization logic |
| P1-02.2 | Implement sanitize() integration | Auto-generate missing schemes |
| P1-02.3 | Implement security scheme logging | Log detected schemes |
| P1-02.4 | Add unit tests | Test normalization |

**Acceptance Criteria:**
- [ ] Use @scalar/openapi-parser's sanitize() to normalize security schemes
- [ ] Auto-generate missing components.securitySchemes definitions
- [ ] Log normalized security schemes on startup

---

#### P1-03: Implement Plugin Types

**Description:** Define all TypeScript types for the plugin.

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P1-03.1 | Create types/plugin-options.ts | Plugin configuration types |
| P1-03.2 | Define OpenApiServerPluginOptions | All configuration options |
| P1-03.3 | Create types/registry.ts | Endpoint registry types |
| P1-03.4 | Create types/handlers.ts | Handler API types |
| P1-03.5 | Create types/seeds.ts | Seed API types |
| P1-03.6 | Create types/ipc-messages.ts | IPC message protocol |
| P1-03.7 | Export all types | From types/index.ts |

**File: Types to implement (from PRS Section 8)**
```typescript
// plugin-options.ts
interface OpenApiServerPluginOptions {
  openApiPath: string;
  port?: number;
  proxyPath?: string;
  seedsDir?: string;
  handlersDir?: string;
  enabled?: boolean;
  startupTimeout?: number;
  verbose?: boolean;
}

// registry.ts
interface OpenApiEndpointRegistry { ... }
interface OpenApiEndpointEntry { ... }
interface OpenApiServerSchemaEntry { ... }

// handlers.ts
interface HandlerCodeContext { ... }
type HandlerCodeGenerator = ...
interface HandlerFileExports { ... }

// seeds.ts
interface SeedCodeContext { ... }
type SeedCodeGenerator = ...
interface SeedFileExports { ... }

// ipc-messages.ts
type OpenApiServerMessage = ...
interface ReadyMessage { ... }
interface ErrorMessage { ... }
// etc.
```

**Acceptance Criteria:**
- [ ] All types from PRS Section 8 are implemented
- [ ] Types are exported from package
- [ ] Types compile without errors

---

#### P1-04: Implement Basic Vite Plugin (FR-002)

**Description:** Implement the main Vite plugin with lifecycle hooks.

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P1-04.1 | Create plugin.ts | Main plugin implementation |
| P1-04.2 | Implement config hook | Store resolved config |
| P1-04.3 | Implement configureServer hook | Start mock server |
| P1-04.4 | Implement server close hook | Stop mock server |
| P1-04.5 | Implement enabled check | Only activate in serve mode |
| P1-04.6 | Add plugin name and enforce | Plugin metadata |

**Acceptance Criteria (from PRS):**
- [ ] Register as a standard Vite plugin
- [ ] Start openapi server when Vite dev server starts
- [ ] Stop openapi server when Vite dev server stops
- [ ] Only activate during `serve` mode (not `build`)
- [ ] Respect `enabled` configuration option

---

#### P1-05: Implement Mock Server Integration (FR-001)

**Description:** Integrate @scalar/mock-server for response generation.

**Estimate:** M (3 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P1-05.1 | Create runner/openapi-server-runner.mts | ESM runner script |
| P1-05.2 | Implement createOpenApiServer() | Create Scalar mock server |
| P1-05.3 | Implement @hono/node-server integration | HTTP server |
| P1-05.4 | Implement environment variable reading | Configuration from parent |
| P1-05.5 | Implement basic request logging | Log incoming requests |
| P1-05.6 | Test with Petstore spec | End-to-end verification |

**Acceptance Criteria (from PRS):**
- [ ] Support OpenAPI 3.0 and 3.1 specifications
- [ ] Support YAML and JSON specification formats
- [ ] Generate responses matching schema definitions
- [ ] Respect response content types (application/json, etc.)
- [ ] Handle all HTTP methods (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)
- [ ] Support path parameters, query parameters, and request bodies
- [ ] Generate realistic data based on field types and formats

---

#### P1-06: Implement Startup Banner

**Description:** Implement console output banners for server startup.

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P1-06.1 | Create logging/startup-banner.ts | Banner generation |
| P1-06.2 | Implement loading banner | OpenAPI spec loading |
| P1-06.3 | Implement error banner | Spec validation errors |
| P1-06.4 | Use colors and formatting | Visual clarity |

**Acceptance Criteria:**
- [ ] Startup banner matches PRS examples
- [ ] Error banner is clear and helpful
- [ ] Consistent formatting

---

### 5.3 Phase 1 Summary

| Task ID | Task Name | Estimate | Dependencies | FR |
|---------|-----------|----------|--------------|-----|
| P1-01 | Implement OpenAPI Parser | M (3d) | P0 | FR-003 |
| P1-02 | Implement Security Normalizer | S (1d) | P1-01 | FR-010 |
| P1-03 | Implement Plugin Types | S (1d) | P0 | - |
| P1-04 | Implement Basic Vite Plugin | M (2d) | P1-03 | FR-002 |
| P1-05 | Implement Mock Server Integration | M (3d) | P1-01, P1-04 | FR-001 |
| P1-06 | Implement Startup Banner | S (1d) | P1-01 | - |

**Total Estimate: 11 story points (~6 days)**

---

## 6. Phase 2: Handlers, Seeds & Enhancement

### 6.1 Overview

**Objective:** Implement the handler/seed loading system, document enhancement, and endpoint registry.

**Dependencies:** Phase 1 complete

**Functional Requirements:**
- FR-004: Handler/Seed File Loading & Validation (P1 High)
- FR-005: OpenAPI Document Enhancement (P0 Critical)
- FR-006: OpenAPI Endpoint Registry (P0 Critical)

**Deliverables:**
- Handler file loader with validation
- Seed file loader with validation
- Document enhancer (x-handler/x-seed injection)
- Endpoint registry with runtime inspection

---

### 6.2 Task Breakdown

#### P2-01: Implement Handler Loader (FR-004)

**Description:** Implement loading and validation of handler .mjs files.

**Estimate:** M (3 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P2-01.1 | Create enhancer/handler-loader.ts | Handler loading logic |
| P2-01.2 | Implement directory scanning | Find all .mjs files |
| P2-01.3 | Implement dynamic import | Load ESM modules |
| P2-01.4 | Implement export validation | Check default export format |
| P2-01.5 | Implement string value handling | Direct code strings |
| P2-01.6 | Implement function value handling | Code generator functions |
| P2-01.7 | Build HandlerCodeContext | Context for functions |
| P2-01.8 | Add error handling | Graceful failure on bad files |
| P2-01.9 | Add unit tests | Test loader functionality |

**Acceptance Criteria (from PRS):**
- [ ] Load handler files from configurable directory
- [ ] Support `.mjs` and `.js` file extensions
- [ ] Validate file exports have correct structure (default export as object)
- [ ] Validate each key is a string (operationId)
- [ ] Validate each value is either:
  - A non-empty string (JavaScript code), OR
  - A function that returns a non-empty string (dynamic code generation)
- [ ] Support async functions for dynamic code generation
- [ ] Provide rich context to functions (operation/schema details, document)
- [ ] Report syntax errors with file name and details
- [ ] Continue loading other files if one fails (resilient)

---

#### P2-02: Implement Seed Loader (FR-004)

**Description:** Implement loading and validation of seed .mjs files.

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P2-02.1 | Create enhancer/seed-loader.ts | Seed loading logic |
| P2-02.2 | Implement directory scanning | Find all .mjs files |
| P2-02.3 | Implement dynamic import | Load ESM modules |
| P2-02.4 | Implement export validation | Check default export format |
| P2-02.5 | Implement string value handling | Direct code strings |
| P2-02.6 | Implement function value handling | Code generator functions |
| P2-02.7 | Build SeedCodeContext | Context for functions |
| P2-02.8 | Add unit tests | Test loader functionality |

**Acceptance Criteria (from PRS):**
- [ ] Load seed files from configurable directory
- [ ] Support `.mjs` and `.js` file extensions
- [ ] Validate each key is a string (schemaName)
- [ ] Validate each value is string or function
- [ ] Continue loading other files if one fails

---

#### P2-03: Implement Validator (FR-004)

**Description:** Implement validation of handlers/seeds against OpenAPI document.

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P2-03.1 | Create enhancer/validator.ts | Validation logic |
| P2-03.2 | Implement validateHandlerExports() | From PRS |
| P2-03.3 | Implement validateSeedExports() | From PRS |
| P2-03.4 | Implement operationId matching | Check against spec |
| P2-03.5 | Implement schemaName matching | Check against spec |
| P2-03.6 | Generate warnings for mismatches | Non-blocking warnings |

**Acceptance Criteria (from PRS):**
- [ ] Warn if operationId doesn't exist in OpenAPI spec
- [ ] Warn if schemaName doesn't exist in components/schemas
- [ ] Summary of validation results at end

---

#### P2-04: Implement Document Enhancer (FR-005)

**Description:** Implement x-handler and x-seed injection into OpenAPI document.

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P2-04.1 | Create enhancer/document-enhancer.ts | Enhancement logic |
| P2-04.2 | Implement document cloning | Preserve original |
| P2-04.3 | Implement findOperationById() | Find operations by ID |
| P2-04.4 | Implement x-handler injection | Into operations |
| P2-04.5 | Implement x-seed injection | Into schemas |
| P2-04.6 | Implement logging | Log each injection |
| P2-04.7 | Add unit tests | Test enhancement |

**Acceptance Criteria (from PRS):**
- [ ] Clone OpenAPI document in memory (preserve original)
- [ ] Match handlers to operations by operationId
- [ ] Match seeds to schemas by schema name
- [ ] Inject x-handler into the corresponding operation in paths
- [ ] Inject x-seed into the corresponding schema in components/schemas
- [ ] Log each injection for visibility
- [ ] Warn when handler/seed doesn't match any operation/schema

---

#### P2-05: Implement Preservation Logic (FR-013)

**Description:** Preserve existing x-handler/x-seed in OpenAPI spec unless overridden.

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P2-05.1 | Modify document-enhancer.ts | Add preservation logic |
| P2-05.2 | Check for existing extensions | Before injection |
| P2-05.3 | Log override warnings | When overriding |
| P2-05.4 | Add unit tests | Test preservation |

**Acceptance Criteria (from PRS):**
- [ ] External handler file overrides inline x-handler (with warning)
- [ ] External seed file overrides inline x-seed (with warning)
- [ ] Log when override occurs for visibility

---

#### P2-06: Implement Registry Builder (FR-006)

**Description:** Implement the endpoint registry that tracks all mocked endpoints.

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P2-06.1 | Create enhancer/registry-builder.ts | Registry building logic |
| P2-06.2 | Implement buildRegistry() | Build from enhanced doc |
| P2-06.3 | Extract all operations | Method, path, operationId |
| P2-06.4 | Track handler status | hasHandler flag |
| P2-06.5 | Track seed status | hasSeed flag |
| P2-06.6 | Compute statistics | Counts and summaries |
| P2-06.7 | Add unit tests | Test registry building |

**Acceptance Criteria (from PRS):**
- [ ] Extract all operations (method + path + operationId) from OpenAPI spec
- [ ] Map custom handlers to their corresponding operationIds
- [ ] Map custom seeds to their corresponding schema names
- [ ] Include endpoint count summary in startup logs

---

#### P2-07: Implement Registry Endpoint

**Description:** Implement the /_openapiserver/registry runtime inspection endpoint.

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P2-07.1 | Add registry endpoint to runner | /_openapiserver/registry |
| P2-07.2 | Return JSON response | Registry data |
| P2-07.3 | Include statistics | Endpoint counts |
| P2-07.4 | Test endpoint | Manual and automated |

**Acceptance Criteria (from PRS):**
- [ ] Provide `/_openapiserver/registry` endpoint for runtime inspection
- [ ] Return JSON with endpoints and stats

---

#### P2-08: Implement Registry Display

**Description:** Implement the startup console table showing all endpoints.

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P2-08.1 | Create formatRegistryTable() | Table formatting |
| P2-08.2 | Implement column alignment | METHOD, PATH, OPERATION ID, HANDLER |
| P2-08.3 | Show handler indicators | ✓ or - |
| P2-08.4 | Show summary line | Counts |

**Acceptance Criteria (from PRS):**
- [ ] Display endpoint registry table on server startup
- [ ] Indicate which endpoints have handlers: ✓ or -
- [ ] Match PRS example output format

---

### 6.3 Phase 2 Summary

| Task ID | Task Name | Estimate | Dependencies | FR |
|---------|-----------|----------|--------------|-----|
| P2-01 | Implement Handler Loader | M (3d) | P1 | FR-004 |
| P2-02 | Implement Seed Loader | M (2d) | P1 | FR-004 |
| P2-03 | Implement Validator | S (1d) | P2-01, P2-02 | FR-004 |
| P2-04 | Implement Document Enhancer | M (2d) | P2-03 | FR-005 |
| P2-05 | Implement Preservation Logic | S (1d) | P2-04 | FR-013 |
| P2-06 | Implement Registry Builder | M (2d) | P2-04 | FR-006 |
| P2-07 | Implement Registry Endpoint | S (1d) | P2-06 | FR-006 |
| P2-08 | Implement Registry Display | S (1d) | P2-06 | FR-006 |

**Total Estimate: 13 story points (~7 days)**

---

## 7. Phase 3: Request Processing

### 7.1 Overview

**Objective:** Implement request proxying, logging, error simulation, and complete security handling.

**Dependencies:** Phase 2 complete

**Functional Requirements:**
- FR-007: Request Proxying (P0 Critical)
- FR-008: Request/Response Logging (P1 High)
- FR-009: Error Simulation (P1 High)
- FR-010: Security Scheme Normalization (P1 High) - completion

**Deliverables:**
- Vite proxy configuration
- Request/response logging system
- Error simulation via query parameters
- Complete security scheme handling

---

### 7.2 Task Breakdown

#### P3-01: Implement Request Proxying (FR-007)

**Description:** Configure Vite to proxy API requests to the mock server.

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P3-01.1 | Create proxy/proxy-config.ts | Proxy configuration |
| P3-01.2 | Implement config hook proxy | Add proxy rules |
| P3-01.3 | Implement path rewriting | Strip proxy prefix |
| P3-01.4 | Test with playground | Verify proxying works |

**Acceptance Criteria (from PRS):**
- [ ] Configurable proxy path (e.g., `/api/v3`)
- [ ] Path rewriting from proxy path to root
- [ ] Preserve request headers
- [ ] Preserve request body
- [ ] Support all HTTP methods
- [ ] Handle CORS appropriately

---

#### P3-02: Implement Request Logger (FR-008)

**Description:** Implement logging of all mock server activity.

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P3-02.1 | Create logging/logger.ts | Vite-integrated logger |
| P3-02.2 | Create logging/request-logger.ts | Request/response logging |
| P3-02.3 | Implement request logging | Method, path, operationId |
| P3-02.4 | Implement response logging | Status code |
| P3-02.5 | Implement emoji indicators | ✔ for success, ✖ for error |
| P3-02.6 | Implement verbose mode | Detailed logging option |
| P3-02.7 | Add timestamps | To all log entries |

**Acceptance Criteria (from PRS):**
- [ ] Log each incoming request with method, path, and operationId
- [ ] Log response status codes
- [ ] Use emoji indicators for success/error (✔/✖)
- [ ] Support verbose mode for detailed logging
- [ ] Timestamps on all log entries
- [ ] Route logs through Vite's logger for consistent formatting

---

#### P3-03: Implement Error Simulation (FR-009)

**Description:** Implement error scenario simulation via query parameters.

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P3-03.1 | Document simulation query params | simulateError, delay, etc. |
| P3-03.2 | Create example handlers | With error simulation code |
| P3-03.3 | Update playground handlers | Add simulation support |
| P3-03.4 | Document in README | Usage examples |

**Acceptance Criteria (from PRS):**
- [ ] Simulate HTTP error codes (400, 401, 403, 404, 500, 503)
- [ ] Simulate empty responses
- [ ] Simulate network delays
- [ ] Configurable via query parameters: `?simulateError=401&delay=2000`
- [ ] Return appropriate error response bodies

**Note:** Error simulation is implemented in x-handler code, not in the plugin itself.

---

#### P3-04: Complete Security Implementation (FR-010)

**Description:** Complete the security scheme handling with runtime validation.

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P3-04.1 | Verify Scalar handles security | Test with Petstore |
| P3-04.2 | Document security behavior | In README |
| P3-04.3 | Add security scheme logging | On startup |
| P3-04.4 | Test all scheme types | Bearer, API Key, OAuth2 |

**Acceptance Criteria (from PRS):**
- [ ] Mock server validates presence of credentials (not validity)
- [ ] Return 401 Unauthorized when required credentials are missing
- [ ] Accept any non-empty credential value as valid
- [ ] Support all OpenAPI security scheme types
- [ ] Handle multiple security schemes with OR logic

---

### 7.3 Phase 3 Summary

| Task ID | Task Name | Estimate | Dependencies | FR |
|---------|-----------|----------|--------------|-----|
| P3-01 | Implement Request Proxying | S (1d) | P2 | FR-007 |
| P3-02 | Implement Request Logger | M (2d) | P2 | FR-008 |
| P3-03 | Implement Error Simulation | M (2d) | P2 | FR-009 |
| P3-04 | Complete Security Implementation | S (1d) | P1-02 | FR-010 |

**Total Estimate: 6 story points (~4 days)**

---

## 8. Phase 4: Process Management

### 8.1 Overview

**Objective:** Implement process isolation, IPC communication, and startup coordination.

**Dependencies:** Phase 3 complete

**Functional Requirements:**
- FR-011: Process Isolation (P1 High)
- FR-012: Startup Coordination (P1 High)

**Deliverables:**
- Child process spawning with fork()
- IPC message protocol
- Graceful shutdown handling
- Startup readiness coordination

---

### 8.2 Task Breakdown

#### P4-01: Implement Process Manager (FR-011)

**Description:** Implement child process spawning and management.

**Estimate:** M (3 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P4-01.1 | Create runner/process-manager.ts | Process management |
| P4-01.2 | Implement fork() spawning | Spawn child process |
| P4-01.3 | Pass environment variables | Configuration to child |
| P4-01.4 | Implement process cleanup | On Vite shutdown |
| P4-01.5 | Implement SIGTERM handling | Graceful shutdown |
| P4-01.6 | Implement force kill timeout | After graceful fails |
| P4-01.7 | Handle child crash | Don't crash Vite |
| P4-01.8 | Add error recovery | Log and continue |

**Acceptance Criteria (from PRS):**
- [ ] Spawn mock server using Node.js fork()
- [ ] IPC communication between plugin and mock server
- [ ] Mock server crash doesn't crash Vite
- [ ] Graceful shutdown on SIGTERM/SIGINT
- [ ] Force kill after timeout if graceful shutdown fails
- [ ] Proper cleanup on Vite server close

---

#### P4-02: Implement IPC Handler (FR-011)

**Description:** Implement IPC message protocol between parent and child.

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P4-02.1 | Create runner/ipc-handler.ts | IPC handling |
| P4-02.2 | Implement message sending | Child to parent |
| P4-02.3 | Implement message receiving | Parent from child |
| P4-02.4 | Implement INITIALIZING message | Startup phase |
| P4-02.5 | Implement READY message | Server ready |
| P4-02.6 | Implement ERROR message | Error reporting |
| P4-02.7 | Implement LOG message | Log forwarding |
| P4-02.8 | Implement REQUEST message | Request logging |

**Acceptance Criteria (from PRS Section 8.7):**
- [ ] Support all message types from IPC Message API
- [ ] Handle message flow correctly
- [ ] Forward logs to Vite logger

---

#### P4-03: Implement Startup Coordinator (FR-012)

**Description:** Implement startup readiness coordination.

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P4-03.1 | Create runner/startup-coordinator.ts | Coordination logic |
| P4-03.2 | Implement ready wait | Wait for READY message |
| P4-03.3 | Implement timeout handling | Configurable timeout |
| P4-03.4 | Display server URL | On successful startup |
| P4-03.5 | Show error on timeout | Clear error message |

**Acceptance Criteria (from PRS):**
- [ ] Mock server sends `ready` message via IPC
- [ ] Configurable startup timeout (default: 15000ms)
- [ ] Clear error message if startup times out
- [ ] Display mock server URL on successful startup

---

### 8.3 Phase 4 Summary

| Task ID | Task Name | Estimate | Dependencies | FR |
|---------|-----------|----------|--------------|-----|
| P4-01 | Implement Process Manager | M (3d) | P3 | FR-011 |
| P4-02 | Implement IPC Handler | M (2d) | P4-01 | FR-011 |
| P4-03 | Implement Startup Coordinator | S (1d) | P4-02 | FR-012 |

**Total Estimate: 6 story points (~4 days)**

---

## 9. Phase 5: Developer Experience

### 9.1 Overview

**Objective:** Implement hot reload and Vue DevTools integration for optimal developer experience.

**Dependencies:** Phase 4 complete

**Functional Requirements:**
- FR-014: Hot Reload for Seeds/Handlers (P1 High)
- FR-015: Vue DevTools Integration (P1 High)

**Deliverables:**
- File watching with chokidar
- Automatic server restart on changes
- Vue DevTools custom tab
- Global state exposure for debugging

---

### 9.2 Task Breakdown

#### P5-01: Implement File Watcher (FR-014)

**Description:** Implement file watching for handler/seed directories.

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P5-01.1 | Create utils/file-watcher.ts | File watching logic |
| P5-01.2 | Configure chokidar | Watch handler/seed dirs |
| P5-01.3 | Implement change detection | Add/modify/delete events |
| P5-01.4 | Debounce rapid changes | Avoid excessive restarts |
| P5-01.5 | Log file changes | Notify developer |

**Acceptance Criteria (from PRS):**
- [ ] Watch handler/seed directories for file changes
- [ ] Detect file add/modify/delete events

---

#### P5-02: Implement Hot Reload (FR-014)

**Description:** Implement automatic server restart on file changes.

**Estimate:** M (3 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P5-02.1 | Integrate file watcher with plugin | Connect events |
| P5-02.2 | Implement graceful restart | Kill and respawn |
| P5-02.3 | Reload handler/seed files | Fresh import |
| P5-02.4 | Re-enhance OpenAPI document | With new handlers/seeds |
| P5-02.5 | Wait for new server ready | Before continuing |
| P5-02.6 | Display reload notification | In Vite console |
| P5-02.7 | Measure reload time | Ensure < 2 seconds |

**Acceptance Criteria (from PRS):**
- [ ] Reload modified handler/seed files
- [ ] Re-enhance OpenAPI document with updated x-handler/x-seed
- [ ] Gracefully restart mock server child process
- [ ] Display clear reload notification in Vite console
- [ ] Reload completes in < 2 seconds

---

#### P5-03: Implement DevTools Plugin (FR-015)

**Description:** Implement Vue DevTools integration with custom tab.

**Estimate:** L (5 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P5-03.1 | Create devtools/devtools-plugin.ts | DevTools plugin |
| P5-03.2 | Implement detection guards | __DEV__, IS_CLIENT, HAS_PROXY |
| P5-03.3 | Implement plugin registration | addCustomTab() |
| P5-03.4 | Implement inspector | Endpoint tree view |
| P5-03.5 | Implement endpoint details | Show handler, seeds, etc. |
| P5-03.6 | Implement simulation panel | Query param generation |
| P5-03.7 | Implement refresh action | Manual registry refresh |
| P5-03.8 | Create devtools/sfc-generator.ts | Custom tab SFC |
| P5-03.9 | Test in Vue DevTools | Browser extension |

**Acceptance Criteria (from PRS):**
- [ ] Only register in development mode and browser environment
- [ ] Buffer pattern - plugins activated when DevTools connects
- [ ] Silent fallback if DevTools not installed
- [ ] Custom "OpenAPI Server" tab visible
- [ ] Endpoint registry displayed with filters
- [ ] Simulation capabilities work

---

#### P5-04: Implement Global State Exposure (FR-015)

**Description:** Expose global state for console debugging.

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P5-04.1 | Create devtools/global-state.ts | Global state exposure |
| P5-04.2 | Implement $openApiServer | Server state object |
| P5-04.3 | Implement $openApiRegistry | Registry object |
| P5-04.4 | Add TypeScript declarations | For global types |
| P5-04.5 | Document console usage | In README |

**Acceptance Criteria (from PRS):**
- [ ] Expose globalThis.$openApiServer with url, connected, port, etc.
- [ ] Expose globalThis.$openApiRegistry with endpoints, stats, etc.
- [ ] TypeScript declarations for global types

---

### 9.3 Phase 5 Summary

| Task ID | Task Name | Estimate | Dependencies | FR |
|---------|-----------|----------|--------------|-----|
| P5-01 | Implement File Watcher | M (2d) | P4 | FR-014 |
| P5-02 | Implement Hot Reload | M (3d) | P5-01 | FR-014 |
| P5-03 | Implement DevTools Plugin | L (5d) | P4 | FR-015 |
| P5-04 | Implement Global State Exposure | S (1d) | P5-03 | FR-015 |

**Total Estimate: 11 story points (~8 days)**

---

## 10. Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TASK DEPENDENCY GRAPH                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PHASE 0: Setup                                                              │
│  ────────────────                                                            │
│                                                                              │
│  P0-01 ──┬── P0-02 ──── P0-03 ──┬── P0-04 ──┬── P0-08                       │
│          │                      │           │                                │
│          │                      ├── P0-06 ──┼── P0-10 ──── P0-11            │
│          │                      │           │       │                        │
│          │                      └── P0-07 ──┴───────┴── P0-09               │
│          │                                          │                        │
│          └── P0-05                                  └── P0-12 ── P0-13      │
│                                                                              │
│          P0-14 (parallel)                                                    │
│                                                                              │
│  PHASE 1: Core Infrastructure                                                │
│  ────────────────────────────                                                │
│                                                                              │
│  P0 ──── P1-01 ──┬── P1-02                                                  │
│           │      │                                                           │
│           │      └── P1-05                                                   │
│           │           │                                                      │
│  P0 ──── P1-03 ────── P1-04 ────┘                                           │
│                        │                                                     │
│                        └── P1-06                                             │
│                                                                              │
│  PHASE 2: Handlers & Enhancement                                             │
│  ───────────────────────────────                                             │
│                                                                              │
│  P1 ──┬── P2-01 ──┬                                                         │
│       │           ├── P2-03 ──── P2-04 ──┬── P2-05                          │
│       └── P2-02 ──┘                      │                                   │
│                                          └── P2-06 ──┬── P2-07              │
│                                                      │                       │
│                                                      └── P2-08              │
│                                                                              │
│  PHASE 3: Request Processing                                                 │
│  ───────────────────────────                                                 │
│                                                                              │
│  P2 ──┬── P3-01                                                             │
│       ├── P3-02                                                              │
│       ├── P3-03                                                              │
│       └── P3-04 (depends on P1-02)                                          │
│                                                                              │
│  PHASE 4: Process Management                                                 │
│  ───────────────────────────                                                 │
│                                                                              │
│  P3 ──── P4-01 ──── P4-02 ──── P4-03                                        │
│                                                                              │
│  PHASE 5: Developer Experience                                               │
│  ─────────────────────────────                                               │
│                                                                              │
│  P4 ──┬── P5-01 ──── P5-02                                                  │
│       │                                                                      │
│       └── P5-03 ──── P5-04                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Effort Estimates Summary

### 11.1 By Phase

| Phase | Name | Story Points | Days | FRs |
|-------|------|-------------|------|-----|
| 0 | Project Setup & Skeleton | 16.5 | 7 | - |
| 1 | Core Infrastructure | 11 | 6 | FR-001, FR-002, FR-003 |
| 2 | Handlers, Seeds & Enhancement | 13 | 7 | FR-004, FR-005, FR-006, FR-013 |
| 3 | Request Processing | 6 | 4 | FR-007, FR-008, FR-009, FR-010 |
| 4 | Process Management | 6 | 4 | FR-011, FR-012 |
| 5 | Developer Experience | 11 | 8 | FR-014, FR-015 |
| **TOTAL** | | **63.5** | **36** | **15 FRs** |

### 11.2 By Task Size

| Size | Count | Total Points |
|------|-------|--------------|
| XS (0.5d) | 4 | 2 |
| S (1d) | 18 | 18 |
| M (2-3d) | 14 | 35.5 |
| L (4-5d) | 1 | 8 |
| XL (6-10d) | 0 | 0 |

### 11.3 Timeline Estimate

| Scenario | Duration | Notes |
|----------|----------|-------|
| **Optimistic** | 6 weeks | No blockers, everything goes smoothly |
| **Expected** | 8 weeks | Normal development pace with some issues |
| **Pessimistic** | 10 weeks | Significant blockers or scope changes |

---

## 12. Risk Assessment

### 12.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| @scalar/mock-server API changes | Medium | High | Pin version, monitor releases |
| @scalar/openapi-parser limitations | Low | Medium | Have fallback parsing strategy |
| Vite plugin API compatibility | Low | High | Test with multiple Vite versions |
| Vue DevTools API complexity | Medium | Medium | Start with minimal implementation |
| Child process management edge cases | Medium | Medium | Extensive testing on all OS |
| Hot reload reliability | Medium | Low | Graceful degradation to manual restart |

### 12.2 Schedule Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Underestimated task complexity | Medium | Medium | Add buffer to estimates |
| Scope creep | Medium | High | Strict adherence to PRS scope |
| Dependency on external packages | Low | High | Lock versions, monitor changelogs |
| Testing overhead | Medium | Low | Parallel test development |

### 12.3 Resource Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Single developer bottleneck | High | High | Document everything, clean code |
| Knowledge gaps in technologies | Low | Medium | Research spikes before implementation |

---

## 13. Definition of Done

**Overview:**

This section defines the quality gates and completion criteria at each level of work. Every level builds upon the previous one, ensuring consistent quality throughout the development process.

**Review Workflow:**

The project uses a **three-stage review process** for tasks:

1. **Self-Review 1 (During Development)** - Continuous
   - Developer reviews code as it's written
   - Ensures quality standards during implementation
   - Part of normal development process

2. **Self-Review 2 (At Completion)** - End of Dev Session
   - Developer reviews entire task when 100% complete
   - Verifies all acceptance criteria met
   - Marks task as `ready_for_review` in bd
   - Session ends here

3. **Final Review (Owner)** - Separate Session
   - Owner (ramosmig) reviews task independently
   - Validates quality, completeness, and correctness
   - Closes task in bd if approved
   - May request changes if needed

**DoD Hierarchy:**

```
┌─────────────────────────────────────────────────────────────────┐
│                     Definition of Done Hierarchy                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SUBTASK LEVEL                                                  │
│  ↓ Lint + Format + TypeCheck + Build + Tests                   │
│  ↓ Feature branch + Conventional commits                         │
│  ↓                                                               │
│  TASK LEVEL                                                      │
│  ↓ All subtasks done + Integration works                        │
│  ↓ Manual testing in playground                                 │
│  ↓ Self-review 1 (during dev) + Self-review 2 (at completion)  │
│  ↓ bd update <id> --status ready_for_review                     │
│  ↓ Final review by owner (separate session)                     │
│  ↓ bd close <task-id> --reason "..." (by owner)                 │
│  ↓                                                               │
│  PHASE LEVEL                                                     │
│  ↓ All tasks in phase done                                      │
│  ↓ End-to-end integration tested                                │
│  ↓ Changeset created + Phase milestone closed                   │
│  ↓ bd sync (commit + push)                                      │
│  ↓                                                               │
│  FEATURE LEVEL (per FR)                                         │
│  ↓ All acceptance criteria from PRS met                         │
│  ↓ >80% test coverage + Edge cases handled                      │
│  ↓ Documentation complete with examples                         │
│  ↓                                                               │
│  RELEASE LEVEL (v1.0.0)                                         │
│  ↓ All 15 FRs complete + All 5 phases done                      │
│  ↓ CI/CD green + CHANGELOG complete                             │
│  ↓ Published to npm + Git tagged                                │
│  ✓ PROJECT RELEASED                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Quick Reference Commands:**

| Level | Command | Purpose |
|-------|---------|---------|
| **Subtask** | `pnpm lint && pnpm format && pnpm typecheck && pnpm build && pnpm test` | Run all quality gates |
| **Task (Dev)** | `bd update <task-id> --status ready_for_review` | Mark task ready after self-review |
| **Task (Owner)** | `bd close <task-id> --reason "Completed: <summary>"` | Close task after final review |
| **Phase** | `bd sync` | Commit and push all bd changes |
| **Release** | `workspace bump --execute --git-tag --git-push` | Create release with workspace-tools |

**Branch Naming Convention:**
- Subtask/Task: `feature/<task-id>-<description>` (e.g., `feature/P0-04-biome-config`)
- Bugfix: `fix/<task-id>-<description>` (e.g., `fix/P1-03-type-error`)

**Commit Message Format:**
```
<type>(<scope>): <description>

[optional body]
[optional footer]
```
Examples:
- `feat(parser): implement OpenAPI parser with @scalar/openapi-parser`
- `fix(linter): resolve noUnusedImports rule violation`
- `docs(readme): add plugin configuration examples`
- `chore(deps): update @scalar/mock-server to v0.8.9`

---

### 13.1 Subtask-Level DoD

Each **subtask** must meet these criteria before moving to the next:

**Quality Gates:**
- [ ] **Code Complete**: Subtask implementation finished
- [ ] **Lint**: `pnpm lint` passes with no errors (Biome check)
- [ ] **Format**: `pnpm format` applied (Biome format)
- [ ] **Type Check**: `pnpm typecheck` passes (TypeScript compilation)
- [ ] **Build**: `pnpm build` succeeds for affected packages
- [ ] **Unit Tests**: Tests written and passing for new code (>80% coverage)
- [ ] **Documentation**: JSDoc comments on public APIs (if applicable)

**Workflow:**
- [ ] **Branch**: Work done in feature branch `feature/<task-id>-<subtask-id>-<description>`
- [ ] **Commit**: Changes committed with conventional commit message
- [ ] **Self-Review**: Code reviewed by developer before marking complete

**Example Branch Names:**
- `feature/P0-04-biome-config` (for P0-04: Configure Biome.js)
- `feature/P1-01-openapi-parser` (for P1-01: Implement OpenAPI Parser)

### 13.2 Task-Level DoD

A **task** (e.g., P0-04, P1-01) is considered **DONE** when:

**Completion Criteria:**
- [ ] **All Subtasks Done**: Every subtask meets Subtask-Level DoD
- [ ] **Integration**: All subtasks work together correctly
- [ ] **Lint**: `pnpm lint` passes on entire codebase
- [ ] **Format**: `pnpm format` applied consistently
- [ ] **Type Check**: `pnpm typecheck` passes for all packages
- [ ] **Build**: `pnpm build` succeeds for all affected packages
- [ ] **Tests**: `pnpm test` passes (unit + integration)
- [ ] **Manual Test**: Feature works in playground app (if applicable)
- [ ] **Acceptance Criteria**: All task-specific acceptance criteria met

**Documentation:**
- [ ] **Code Comments**: All public APIs documented with JSDoc
- [ ] **README**: Updated if public API changed
- [ ] **Examples**: Usage examples provided (in code or docs)

**Review Process (3 Stages - 2 Sessions):**

**SESSION 1 (Developer):**

*Stage 1 - Self-Review During Development:*
- [ ] **Continuous Review**: Developer reviews code during implementation
- [ ] **Quality Check**: Code meets standards as it's written
- [ ] **Refactoring**: Improvements made immediately during development

*Stage 2 - Self-Review at Completion:*
- [ ] **Final Self-Review**: Developer reviews all changes when task is 100% complete
- [ ] **Completeness Check**: All subtasks done, all acceptance criteria met
- [ ] **Quality Verification**: Lint, format, typecheck, build, tests all pass
- [ ] **Documentation Check**: All code properly documented
- [ ] **Manual Testing**: Feature tested in playground app
- [ ] **Ready for Owner Review**: Task marked as `ready_for_review` in bd
- [ ] **Session End**: Developer session ends, awaiting owner review

**SESSION 2 (Owner - Separate Session):**

*Stage 3 - Final Review by Owner:*
- [ ] **Code Review**: Owner reviews implementation approach and code quality
- [ ] **Functionality Check**: Owner validates feature works as expected
- [ ] **Standards Compliance**: Owner verifies project standards are met
- [ ] **Documentation Review**: Owner checks documentation completeness
- [ ] **Decision**: Owner approves or requests changes
- [ ] **bd Closed**: If approved, owner closes task with `bd close <id> --reason "Completed: <summary>"`

**Git Workflow:**
- [ ] **Merge**: Feature branches merged to main (or squashed)
- [ ] **Clean**: No dangling branches or uncommitted changes

**Review Session Workflow:**
```bash
# ============================================
# SESSION 1: Developer
# ============================================

# Stage 1: During development (continuous)
# Developer reviews code as they write it
# No bd commands needed - part of normal development

# Stage 2: Developer marks as ready (end of dev session)
pnpm lint && pnpm format && pnpm typecheck && pnpm build && pnpm test
bd update <id> --status ready_for_review --json

# Developer session ends here
# ============================================

# ============================================
# SESSION 2: Owner (separate, later)
# ============================================

# Stage 3: Owner reviews and closes
bd list --status ready_for_review --json  # List tasks ready for review
# ... owner reviews code, tests feature, validates quality ...
bd close <id> --reason "Completed: <summary>"

# Owner session ends here
# ============================================
```

**Complete Example:**
```bash
# ============================================
# SESSION 1: Developer (AI or human dev)
# ============================================
git checkout -b feature/P0-04-biome-config

# ... developer implements all subtasks ...
# ... continuous self-review during development ...

# All subtasks complete, running final checks:
pnpm lint                                    # ✓ Pass
pnpm format                                  # ✓ No changes needed
pnpm typecheck                               # ✓ No errors
pnpm build                                   # ✓ Success
pnpm test                                    # ✓ All tests pass

# Final self-review complete, marking ready:
bd update P0-04 --status ready_for_review --json

git add .
git commit -m "feat(config): configure Biome.js with linter and formatter"
git push origin feature/P0-04-biome-config

# Developer session ends
# ============================================

# ============================================
# SESSION 2: Owner (ramosmig - separate day/time)
# ============================================

# Check what needs review:
bd list --status ready_for_review --json

# Review P0-04:
# - Read code changes
# - Verify biome.json configuration
# - Test linting: pnpm lint
# - Test formatting: pnpm format
# - Check documentation
# - Validate all acceptance criteria met

# If approved:
bd close P0-04 --reason "Completed: Biome.js configured with linter, formatter, and organize imports. All quality gates pass."

git merge feature/P0-04-biome-config
git push origin main

bd sync  # Commit and push bd changes

# Owner session ends
# ============================================
```

### 13.3 Phase-Level DoD

A **phase** (e.g., Phase 0, Phase 1) is considered **DONE** when:

**All Tasks Complete:**
- [ ] All tasks in phase meet Task-Level DoD
- [ ] All tasks closed in bd

**Quality Assurance:**
- [ ] **Lint**: `pnpm lint` passes on entire codebase
- [ ] **Format**: `pnpm format` applied to all files
- [ ] **Type Check**: `pnpm typecheck` passes for all packages
- [ ] **Build**: `pnpm build` succeeds for all packages
- [ ] **Tests**: `pnpm test` passes (all unit + integration tests)
- [ ] **CI/CD**: All GitHub workflows pass (ci.yml)

**Integration & Demo:**
- [ ] **Playground**: Phase features demonstrated in petstore-app
- [ ] **End-to-End**: Phase features work together as expected
- [ ] **Edge Cases**: Error handling tested and working

**Documentation:**
- [ ] **README**: Updated with new features (if public-facing)
- [ ] **CHANGELOG**: Phase changes documented
- [ ] **Comments**: All code properly documented

**Versioning:**
- [ ] **Changeset**: Created for version bump (if applicable)
- [ ] **Version**: Package version bumped appropriately

**bd Tracking:**
- [ ] **Milestone**: Phase milestone closed in bd
- [ ] **Sync**: `bd sync` executed to commit and push changes

### 13.4 Feature-Level DoD (per FR)

A **Functional Requirement** (e.g., FR-001, FR-002) is **DONE** when:

**Requirements:**
- [ ] All acceptance criteria from PRODUCT-REQUIREMENTS-SPECIFICATION.md met
- [ ] Feature implemented across all relevant phases/tasks

**Quality:**
- [ ] **Lint**: No linting errors
- [ ] **Format**: Code properly formatted
- [ ] **Type Check**: TypeScript compiles without errors
- [ ] **Build**: Builds successfully
- [ ] **Tests**: >80% test coverage for feature code
- [ ] **Edge Cases**: Error conditions handled gracefully
- [ ] **Error Messages**: User-friendly error messages provided

**Validation:**
- [ ] **End-to-End**: Feature works completely in playground app
- [ ] **Manual Test**: Developer has manually tested all scenarios
- [ ] **Performance**: Feature performs acceptably (no obvious bottlenecks)

**Documentation:**
- [ ] **Usage Examples**: Feature documented with real examples
- [ ] **API Docs**: Public APIs have JSDoc comments
- [ ] **README**: Feature mentioned in README (if public-facing)

**bd Tracking:**
- [ ] All related tasks closed in bd
- [ ] FR marked as complete in tracking

### 13.5 Release DoD (v1.0.0)

The **v1.0.0 release** is ready when:

**All Features Complete:**
- [ ] All 15 Functional Requirements (FR-001 to FR-015) meet Feature-Level DoD
- [ ] All 5 phases meet Phase-Level DoD
- [ ] All tasks closed in bd

**Quality Gates:**
- [ ] **Lint**: `pnpm lint` passes with zero errors
- [ ] **Format**: `pnpm format` produces no changes
- [ ] **Type Check**: `pnpm typecheck` passes for all packages
- [ ] **Build**: `pnpm build` succeeds for all packages
- [ ] **Tests**: `pnpm test` passes with >80% overall coverage
- [ ] **CI/CD**: All GitHub workflows green (ci.yml, release.yml)

**Release Preparation:**
- [ ] **CHANGELOG**: Complete and accurate for v1.0.0
- [ ] **README**: Up-to-date with all features
- [ ] **Documentation**: All public APIs documented
- [ ] **Examples**: Playground app demonstrates all features
- [ ] **Licenses**: All dependencies reviewed and compatible

**Versioning:**
- [ ] **Version Bump**: Package version set to 1.0.0
- [ ] **Git Tag**: Release tagged in git
- [ ] **NPM Publish**: Package published to npm registry

**Validation:**
- [ ] **Fresh Install**: `pnpm install` from scratch works
- [ ] **Playground**: petstore-app runs without errors
- [ ] **Manual Smoke Test**: All major features tested manually

**bd Final Steps:**
- [ ] All issues closed in bd
- [ ] `bd sync` executed to finalize tracking
- [ ] Project marked as released in bd

---

## 14. Milestones & Timeline

### 14.1 Milestone Definitions

| Milestone | Description | Target | Deliverables |
|-----------|-------------|--------|--------------|
| **M0** | Project Setup Complete | Week 1 | Monorepo configured, CI/CD working, skeletons ready |
| **M1** | Core Working | Week 3 | Basic plugin works, parses OpenAPI, serves mock responses |
| **M2** | Handlers & Seeds | Week 5 | Custom handlers/seeds work, registry displays |
| **M3** | Full Feature Set | Week 7 | All FRs implemented |
| **M4** | Release Ready | Week 8 | Tested, documented, ready for npm publish |

### 14.2 Gantt Chart (Simplified)

```
Week    1    2    3    4    5    6    7    8
        ├────┼────┼────┼────┼────┼────┼────┼────┤
Phase 0 ████████                                    M0
Phase 1      ████████████                           M1
Phase 2                ████████████                 M2
Phase 3                     ████████
Phase 4                          ████████
Phase 5                               ████████████  M3
Testing                                    ████████ M4
Release                                         ██
```

### 14.3 Weekly Goals

| Week | Goals |
|------|-------|
| 1 | P0-01 to P0-09 complete, CI/CD working |
| 2 | P0-10 to P0-14 complete, P1-01 to P1-03 started |
| 3 | P1 complete, basic plugin works end-to-end |
| 4 | P2-01 to P2-05 complete |
| 5 | P2 complete, handlers/seeds working |
| 6 | P3 and P4 complete |
| 7 | P5 complete, all features working |
| 8 | Testing, documentation, release prep |

---

## 15. References

### 15.1 Source Documents

| Document | Location | Version |
|----------|----------|---------|
| Product Requirements Specification | `history/PRODUCT-REQUIREMENTS-SPECIFICATION.md` | 1.0.0 |
| This Development Plan | `history/PLAN.md` | 1.0.0 |

### 15.2 External References

| Reference | URL |
|-----------|-----|
| Vite Plugin API | https://vite.dev/guide/api-plugin.html |
| @scalar/openapi-parser | https://github.com/scalar/scalar/tree/main/packages/openapi-parser |
| @scalar/mock-server | https://github.com/scalar/scalar/tree/main/packages/mock-server |
| @vue/devtools-api | https://devtools.vuejs.org/plugins/api |
| workspace-tools | https://github.com/websublime/workspace-tools |
| Biome.js | https://biomejs.dev |
| tsdown | https://github.com/nicksrandall/tsdown |
| Swagger Petstore | https://petstore3.swagger.io |

### 15.3 Issue Tracking

All tasks from this plan will be created as issues in bd (beads) for tracking:

```bash
# Example: Create Phase 0 issues
bd create "P0-01: Initialize Monorepo Structure" -t task -p 1
bd create "P0-02: Configure pnpm Workspace" -t task -p 1 --deps P0-01
# ... etc
```

---

## Appendix A: Conventional Commit Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, dependencies |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |

---

## Appendix B: Changeset Workflow

```bash
# 1. Start feature branch
git checkout -b feat/implement-parser

# 2. Create changeset
workspace changeset create --bump minor

# 3. Develop and commit
git commit -m "feat(parser): implement OpenAPI parser"

# 4. Update changeset with commits
workspace changeset update

# 5. Preview version changes
workspace bump --dry-run

# 6. Merge to main and release
git checkout main
git merge feat/implement-parser
workspace bump --execute --git-tag --git-push
```

---

**Document Status:** ✅ Complete - Ready for Implementation

**Next Steps:**
1. Review and approve this plan
2. Define Definition of Done criteria (if adjustments needed)
3. Create bd issues for Phase 0 tasks
4. Begin implementation of P0-01