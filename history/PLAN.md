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

**Description:** Implement a robust OpenAPI document loader and parser using @scalar/openapi-parser that reads OpenAPI specifications from the file system (YAML or JSON format), validates them against the OpenAPI schema, resolves all $ref references, and returns a normalized, fully dereferenced specification object. This parser serves as the foundation for the entire plugin, converting the OpenAPI specification into a usable data structure for mock server generation, endpoint registration, and handler routing.

**Context:**
- **@scalar/openapi-parser**: Scalar's official OpenAPI parser supporting OpenAPI 3.0.x and 3.1.x specifications
- **Parser capabilities**: Reads files, validates schema compliance, resolves $ref references (internal and external), dereferences schemas
- **Why @scalar/openapi-parser**: Same parser used by Scalar's mock server and API reference tools, ensuring consistency and compatibility
- **File format support**: Must handle both YAML (.yaml, .yml) and JSON (.json) formats automatically
- **$ref resolution**: OpenAPI specs use JSON Schema $ref for reusability (e.g., `$ref: '#/components/schemas/Pet'`), parser must resolve these
- **Dereferencing**: Converting $ref references into inline objects for easier access (mock server needs dereferenced schemas)
- **Validation errors**: Parser should provide detailed error messages with line numbers and context for developer debugging
- **File watching**: Parser will be called on initial load and on file changes (for hot reload in Phase 5)

**Why This Implementation:**
- **fs/promises**: Use async file reading for non-blocking I/O in Node.js
- **path.resolve**: Convert relative paths from vite.config.ts to absolute paths for reliable file access
- **YAML detection**: Check file extension (.yaml, .yml) to determine format, fall back to JSON
- **Error handling**: Wrap parser in try-catch to provide actionable error messages if spec is invalid
- **Type safety**: Use TypeScript types from @scalar/openapi-parser for parsed spec structure
- **Caching**: Cache parsed spec in memory to avoid re-parsing on every endpoint request

**Implementation Approach:**
1. Create `src/core/parser/` directory for parser modules
2. Create `openapi-loader.ts` with `loadOpenApiSpec(path: string)` async function
3. Implement file reading using `fs.promises.readFile` with UTF-8 encoding
4. Detect file format by checking extension (.yaml/.yml vs .json)
5. Import `yaml` package for YAML parsing, use `JSON.parse` for JSON
6. Use @scalar/openapi-parser's `parse()` method with dereferencing enabled
7. Validate parsed spec using parser's built-in validation
8. Handle errors with detailed context (file not found, parse errors, validation errors)
9. Return normalized OpenAPI specification object (dereferenced)
10. Create types for parsed spec structure (OpenApiDocument interface)
11. Add unit tests for valid specs, invalid specs, missing files, YAML/JSON formats

**Estimate:** M (3 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P1-01.1 | Create parser directory structure | Create `packages/vite-plugin-open-api-server/src/core/parser/` directory with `openapi-loader.ts` and `index.ts` files. The `openapi-loader.ts` will contain the main parsing logic, while `index.ts` exports the public API. This establishes the modular structure for parser functionality. |
| P1-01.2 | Implement file reading with path resolution | Create `loadOpenApiSpec(openApiPath: string)` async function that resolves relative paths to absolute using `path.resolve(process.cwd(), openApiPath)`. Read file contents using `fs.promises.readFile(absolutePath, 'utf-8')`. Handle file not found errors with helpful message including attempted path. Return file contents as string for parsing. |
| P1-01.3 | Implement format detection and parsing | Detect file format by checking extension: `path.extname(openApiPath)` returns `.yaml`, `.yml`, or `.json`. For YAML, use `yaml.parse(contents)` from `yaml` package. For JSON, use `JSON.parse(contents)`. Handle parse errors with line number context. Return parsed JavaScript object representing the OpenAPI spec. |
| P1-01.4 | Integrate @scalar/openapi-parser | Import `parse` function from `@scalar/openapi-parser`. Call `await parse(parsedObject, { dereference: true })` to validate and dereference the spec. The `dereference: true` option resolves all $ref references, converting them to inline objects. Handle validation errors returned by parser, extracting error messages and locations. Return the dereferenced OpenAPI specification object. |
| P1-01.5 | Create OpenAPI type definitions | Create `src/core/parser/types.ts` with TypeScript interfaces for parsed OpenAPI structure. Define `OpenApiDocument` interface with fields: `openapi` (version string), `info` (metadata), `servers` (array), `paths` (endpoint definitions), `components` (schemas, responses, parameters), `security` (authentication schemes). Use types from @scalar/openapi-parser where available, supplement with custom types for plugin-specific needs. Export all types from parser/index.ts. |
| P1-01.6 | Implement error handling and logging | Wrap all file operations and parsing in try-catch blocks. Create custom error classes: `OpenApiFileNotFoundError`, `OpenApiParseError`, `OpenApiValidationError`. Each error should include file path, error message, and contextual information (line number for parse errors, validation path for validation errors). Log errors using console.error with prefix "[OpenAPI Parser]" for easy identification. Provide actionable error messages guiding developers to fix issues. |
| P1-01.7 | Add caching mechanism | Implement simple in-memory cache using a Map to store parsed specs keyed by file path. Before reading file, check if cached version exists and file modification time hasn't changed (use `fs.stat(path).mtime`). Return cached spec if valid, otherwise parse and cache new version. This optimization prevents re-parsing on every request during development. Cache will be cleared on file changes (hot reload in Phase 5). |
| P1-01.8 | Create unit tests | Create `src/core/parser/__tests__/openapi-loader.test.ts` with Vitest tests. Test cases: 1) Valid YAML spec parses successfully, 2) Valid JSON spec parses successfully, 3) Invalid YAML throws parse error, 4) Invalid OpenAPI schema throws validation error, 5) Non-existent file throws file not found error, 6) $ref references are dereferenced correctly, 7) Cached spec is returned on second call. Use test fixtures in `__tests__/fixtures/` directory with sample valid/invalid specs. |

**Technical Considerations:**
- **@scalar/openapi-parser API**: Uses async `parse(spec, options)` function returning Promise<{ valid: boolean, specification: object, errors: array }>
- **Dereferencing performance**: Dereferencing can be slow for large specs with many $ref references; caching is critical
- **Circular references**: OpenAPI allows circular $refs (e.g., recursive schemas like LinkedList); parser handles these but results in objects with circular JavaScript references
- **Path resolution**: Relative paths in vite.config.ts are relative to Vite's root (usually project root), must resolve correctly
- **YAML parsing**: yaml package is pure JavaScript and handles all YAML 1.2 features, but can throw on invalid syntax
- **JSON parsing**: Native JSON.parse is fast but provides limited error context; consider using json-parse-better-errors for better messages
- **File watching**: File modification time (mtime) is sufficient for cache invalidation; inode changes handled by hot reload in Phase 5
- **Memory usage**: Parsed specs can be large (megabytes for complex APIs); cache size should be monitored in production
- **Error types**: Different error types enable consumers to handle errors appropriately (file not found vs validation error)
- **OpenAPI versions**: Parser supports both 3.0.x and 3.1.x; 3.1.x uses JSON Schema 2020-12 (more features)
- **External $refs**: Parser can resolve external file references (e.g., `$ref: './schemas/Pet.yaml'`), but our plugin focuses on single-file specs initially
- **Validation strictness**: Parser validates against official OpenAPI schema; some tools accept invalid specs, so validation errors are expected

**Expected Outputs:**

After completing this task:

1. **Parser directory structure**:
   ```
   packages/vite-plugin-open-api-server/src/core/parser/
   ├── index.ts                    # Public exports
   ├── openapi-loader.ts           # Main parsing logic
   ├── types.ts                    # TypeScript interfaces
   └── __tests__/
       ├── openapi-loader.test.ts  # Unit tests
       └── fixtures/
           ├── valid-petstore.yaml # Valid spec fixture
           ├── invalid-yaml.yaml   # Invalid YAML fixture
           └── invalid-schema.yaml # Invalid OpenAPI fixture
   ```

2. **openapi-loader.ts exports**:
   ```typescript
   // Main parsing function
   export async function loadOpenApiSpec(openApiPath: string): Promise<OpenApiDocument>
   
   // Custom error classes
   export class OpenApiFileNotFoundError extends Error
   export class OpenApiParseError extends Error
   export class OpenApiValidationError extends Error
   ```

3. **Usage example** (in plugin.ts):
   ```typescript
   import { loadOpenApiSpec } from './core/parser';
   
   const spec = await loadOpenApiSpec(options.openApiPath);
   console.log(`Loaded OpenAPI spec: ${spec.info.title}`);
   console.log(`Endpoints: ${Object.keys(spec.paths).length}`);
   ```

4. **Parsed spec structure** (OpenApiDocument):
   ```typescript
   {
     openapi: '3.1.0',
     info: { title: 'Swagger Petstore', version: '1.0.19' },
     servers: [{ url: 'https://petstore3.swagger.io/api/v3' }],
     paths: {
       '/pet': {
         post: { operationId: 'addPet', requestBody: {...}, responses: {...} },
         put: { operationId: 'updatePet', ... }
       },
       '/pet/{petId}': {
         get: { operationId: 'getPetById', parameters: [...], responses: {...} }
       }
     },
     components: {
       schemas: {
         Pet: { type: 'object', properties: { id: {...}, name: {...} } },
         Category: { ... },
         User: { ... }
       },
       securitySchemes: {
         petstore_auth: { type: 'oauth2', flows: {...} },
         api_key: { type: 'apiKey', in: 'header', name: 'api_key' }
       }
     }
   }
   ```

5. **Error handling examples**:
   ```typescript
   // File not found
   throw new OpenApiFileNotFoundError(
     `OpenAPI spec not found at: ${absolutePath}\n` +
     `Resolved from: ${openApiPath}\n` +
     `Current working directory: ${process.cwd()}`
   );
   
   // YAML parse error
   throw new OpenApiParseError(
     `Failed to parse YAML file: ${openApiPath}\n` +
     `Error at line 23: unexpected indentation\n` +
     `${yamlError.message}`
   );
   
   // Validation error
   throw new OpenApiValidationError(
     `Invalid OpenAPI specification: ${openApiPath}\n` +
     `Errors:\n` +
     errors.map(e => `  - ${e.path}: ${e.message}`).join('\n')
   );
   ```

6. **Cache implementation**:
   ```typescript
   const cache = new Map<string, { spec: OpenApiDocument, mtime: number }>();
   
   // Check cache
   const cached = cache.get(absolutePath);
   const stats = await fs.stat(absolutePath);
   if (cached && cached.mtime === stats.mtimeMs) {
     return cached.spec; // Return cached version
   }
   
   // Parse and cache
   const spec = await parseSpec(contents);
   cache.set(absolutePath, { spec, mtime: stats.mtimeMs });
   ```

**Acceptance Criteria:**
- [ ] `src/core/parser/` directory created with proper structure
- [ ] `openapi-loader.ts` implements `loadOpenApiSpec(path: string)` async function
- [ ] Function resolves relative paths to absolute using `path.resolve(process.cwd(), path)`
- [ ] Function reads file using `fs.promises.readFile` with UTF-8 encoding
- [ ] Function detects YAML format by checking .yaml or .yml extension
- [ ] Function detects JSON format for .json extension
- [ ] YAML files parsed using `yaml` package's `parse()` method
- [ ] JSON files parsed using `JSON.parse()`
- [ ] @scalar/openapi-parser's `parse()` function called with `dereference: true` option
- [ ] All $ref references in spec are dereferenced (resolved to inline objects)
- [ ] Parser validates spec against OpenAPI 3.x schema
- [ ] Validation errors are caught and wrapped in `OpenApiValidationError`
- [ ] File not found errors are caught and wrapped in `OpenApiFileNotFoundError`
- [ ] YAML/JSON parse errors are caught and wrapped in `OpenApiParseError`
- [ ] Error messages include file path and contextual information
- [ ] Parse errors include line numbers when available
- [ ] Validation errors include JSON path and error descriptions
- [ ] `types.ts` created with `OpenApiDocument` interface
- [ ] `OpenApiDocument` interface includes: openapi, info, servers, paths, components, security
- [ ] Custom error classes extend Error with proper names and messages
- [ ] Caching mechanism implemented using Map keyed by file path
- [ ] Cache checks file modification time (mtime) before returning cached version
- [ ] Cache invalidates when file mtime changes
- [ ] Cached spec returned on second call without re-parsing (performance optimization)
- [ ] Circular references in $refs handled gracefully (no infinite loops)
- [ ] Parser supports both OpenAPI 3.0.x and 3.1.x specifications
- [ ] Petstore spec from P0-13 parses successfully without errors
- [ ] Parsed spec has all paths extracted (19 endpoints for Petstore)
- [ ] Parsed spec has all schemas extracted (Pet, Order, User, etc. for Petstore)
- [ ] Unit tests created in `__tests__/openapi-loader.test.ts`
- [ ] Test: Valid YAML spec parses and returns OpenApiDocument
- [ ] Test: Valid JSON spec parses and returns OpenApiDocument
- [ ] Test: Invalid YAML throws OpenApiParseError
- [ ] Test: Invalid OpenAPI schema throws OpenApiValidationError
- [ ] Test: Non-existent file throws OpenApiFileNotFoundError
- [ ] Test: $ref references are dereferenced in returned spec
- [ ] Test: Second call returns cached spec (verify mtime check)
- [ ] Test fixtures directory created with sample specs
- [ ] All tests pass with `pnpm test`
- [ ] TypeScript compiles without errors (`pnpm typecheck`)
- [ ] Biome linting passes (`pnpm lint`)
- [ ] Parser function exported from `core/parser/index.ts`
- [ ] Error classes exported from `core/parser/index.ts`
- [ ] Types exported from `core/parser/index.ts`
- [ ] Documentation added to functions explaining parameters and return values
- [ ] Committed with message: `feat(parser): implement OpenAPI parser with @scalar/openapi-parser for YAML/JSON loading, validation, and $ref dereferencing`

---

#### P1-02: Implement Security Normalizer (FR-010 partial)

**Description:** Implement security scheme normalization that analyzes the parsed OpenAPI specification, identifies missing or incomplete security scheme definitions, and auto-generates default configurations for common authentication patterns (API keys, OAuth2, HTTP Basic). This normalizer ensures that the mock server can handle authenticated endpoints even when the OpenAPI spec has incomplete security definitions, improving developer experience by reducing configuration overhead.

**Context:**
- **Security schemes**: OpenAPI security defines authentication methods (apiKey, http, oauth2, openIdConnect)
- **Missing definitions**: Many OpenAPI specs reference security schemes in operations but don't define them in components.securitySchemes
- **@scalar/openapi-parser sanitize**: Scalar's utility function that normalizes incomplete specs (not primary purpose, but useful)
- **Why normalization**: Incomplete security definitions would cause mock server to reject authenticated requests unnecessarily
- **Common patterns**: apiKey (header/query/cookie), HTTP Basic Auth, OAuth2 (various flows), Bearer tokens
- **Auto-generation**: Plugin generates sensible defaults when schemes are referenced but not defined
- **Security in operations**: Operations can have `security: [{ api_key: [] }]` requiring auth, or be public (no security array)

**Why This Implementation:**
- **Detect missing schemes**: Scan all operations for security references, compare against components.securitySchemes
- **Generate defaults**: For missing schemes, create default configurations (apiKey in header, basic auth, etc.)
- **Preserve existing**: Don't override explicitly defined schemes, only fill in gaps
- **Logging**: Inform developers which schemes were auto-generated so they can add proper definitions
- **Type-specific defaults**: Different default configurations for apiKey (header: X-API-Key), http (basic), oauth2 (dummy endpoints)

**Implementation Approach:**
1. Create `src/core/parser/security-normalizer.ts` with `normalizeSecuritySchemes(spec: OpenApiDocument)` function
2. Extract all security requirements from operations (scan spec.paths[path][method].security)
3. Build set of referenced scheme names (e.g., "api_key", "petstore_auth")
4. Compare against defined schemes in spec.components.securitySchemes
5. For each missing scheme, generate default configuration based on naming pattern
6. Add generated schemes to spec.components.securitySchemes
7. Log generated schemes with warning that proper definitions should be added
8. Return modified spec with complete security definitions
9. Create unit tests with specs having missing/incomplete security

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P1-02.1 | Create security-normalizer.ts structure | Create `src/core/parser/security-normalizer.ts` with `normalizeSecuritySchemes(spec: OpenApiDocument): OpenApiDocument` function that takes a parsed OpenAPI spec and returns the same spec with normalized security schemes. Initialize components.securitySchemes if it doesn't exist. This function will be called after parsing in openapi-loader.ts. |
| P1-02.2 | Extract security requirements | Implement `extractSecurityRequirements(spec: OpenApiDocument): Set<string>` helper function that iterates through all paths and operations, collecting security scheme names from `operation.security` arrays. Each security requirement is an object like `{ api_key: [] }` where the key is the scheme name. Return a Set of all referenced scheme names across the entire spec. |
| P1-02.3 | Detect missing schemes | Compare the set of referenced scheme names against `spec.components.securitySchemes` (if it exists). Create an array of missing scheme names that are referenced in operations but not defined in components. Log a warning for each missing scheme: `[Security Normalizer] Warning: Security scheme '${name}' referenced but not defined, generating default`. |
| P1-02.4 | Generate default security schemes | For each missing scheme name, generate a default security scheme definition based on naming patterns: 1) If name contains "api" or "key" → apiKey type with `in: "header"`, `name: "X-API-Key"`, 2) If name contains "basic" or "auth" → http type with `scheme: "basic"`, 3) If name contains "bearer" or "token" → http type with `scheme: "bearer"`, 4) If name contains "oauth" → oauth2 type with dummy authorization/token URLs, 5) Default fallback → apiKey in header. Create proper OpenAPI SecurityScheme objects for each. |
| P1-02.5 | Add generated schemes to spec | Add all generated security scheme definitions to `spec.components.securitySchemes`. If components.securitySchemes doesn't exist, create it as an empty object first. Preserve any existing scheme definitions (don't override). Log each generated scheme with its type and configuration: `[Security Normalizer] Generated '${name}' scheme: ${type} (${details})`. Return the modified spec. |
| P1-02.6 | Create unit tests | Create `src/core/parser/__tests__/security-normalizer.test.ts` with Vitest tests. Test cases: 1) Spec with no security returns unchanged, 2) Spec with defined security schemes returns unchanged, 3) Spec with missing scheme gets default generated, 4) Multiple missing schemes all get generated, 5) apiKey pattern generates apiKey type, 6) oauth pattern generates oauth2 type, 7) Existing schemes are preserved (not overridden), 8) Generated schemes are valid OpenAPI SecurityScheme objects. Use test fixtures with various security configurations. |

**Technical Considerations:**
- **Security scheme types**: OpenAPI supports apiKey, http, oauth2, openIdConnect (4 types with different required fields)
- **apiKey locations**: Can be in header, query, or cookie; header is most common default
- **HTTP schemes**: Supports basic, bearer, digest, and others; basic and bearer are most common
- **OAuth2 flows**: Supports implicit, password, clientCredentials, authorizationCode; each requires different URLs
- **Naming patterns**: Heuristic-based generation isn't perfect but provides reasonable defaults for common patterns
- **Security requirements format**: `security: [{ scheme1: [], scheme2: ['scope1', 'scope2'] }]` where scopes are OAuth2-specific
- **Global security**: Can be defined at root level (applies to all operations) or per-operation (overrides global)
- **Empty security**: `security: []` means operation explicitly allows unauthenticated access
- **Mock server compatibility**: Generated schemes must be valid for @scalar/mock-server to accept them
- **Warning vs Error**: Missing schemes are warnings (auto-generated), not errors (spec is still valid)

**Expected Outputs:**

After completing this task:

1. **security-normalizer.ts exports**:
   ```typescript
   export function normalizeSecuritySchemes(spec: OpenApiDocument): OpenApiDocument
   ```

2. **Generated scheme example** (for missing "api_key" reference):
   ```typescript
   {
     "api_key": {
       "type": "apiKey",
       "in": "header",
       "name": "X-API-Key",
       "description": "Auto-generated API key scheme. Please define properly in your OpenAPI spec."
     }
   }
   ```

3. **Console output example**:
   ```
   [Security Normalizer] Warning: Security scheme 'api_key' referenced but not defined, generating default
   [Security Normalizer] Generated 'api_key' scheme: apiKey (header: X-API-Key)
   [Security Normalizer] Warning: Security scheme 'petstore_auth' referenced but not defined, generating default
   [Security Normalizer] Generated 'petstore_auth' scheme: oauth2 (authorization code flow)
   ```

4. **Usage in openapi-loader.ts**:
   ```typescript
   import { normalizeSecuritySchemes } from './security-normalizer';
   
   // After parsing
   const spec = await parse(parsedObject, { dereference: true });
   
   // Normalize security schemes
   const normalizedSpec = normalizeSecuritySchemes(spec);
   ```

**Acceptance Criteria:**
- [ ] `security-normalizer.ts` created in `src/core/parser/` directory
- [ ] `normalizeSecuritySchemes(spec)` function implemented and exported
- [ ] Function extracts all security requirements from all operations
- [ ] Function identifies schemes referenced but not defined
- [ ] Function generates default apiKey scheme for names containing "api" or "key"
- [ ] Function generates default http basic scheme for names containing "basic" or "auth"
- [ ] Function generates default http bearer scheme for names containing "bearer" or "token"
- [ ] Function generates default oauth2 scheme for names containing "oauth"
- [ ] Generated apiKey schemes use header location with name "X-API-Key"
- [ ] Generated http basic schemes use scheme "basic"
- [ ] Generated http bearer schemes use scheme "bearer"
- [ ] Generated oauth2 schemes include dummy authorization and token URLs
- [ ] All generated schemes include description noting they're auto-generated
- [ ] Function preserves existing security scheme definitions (no overrides)
- [ ] Function creates components.securitySchemes object if it doesn't exist
- [ ] Function logs warning for each missing security scheme detected
- [ ] Function logs info for each generated scheme with type and details
- [ ] Modified spec is returned with all security schemes defined
- [ ] Unit tests created testing various security configurations
- [ ] Test: Spec with no security requirements returns unchanged
- [ ] Test: Spec with all schemes defined returns unchanged
- [ ] Test: Spec with one missing scheme gets default generated
- [ ] Test: Generated schemes are valid OpenAPI SecurityScheme objects
- [ ] Test: Existing schemes are not overridden by generator
- [ ] All tests pass with `pnpm test`
- [ ] TypeScript compiles without errors
- [ ] Function integrated into openapi-loader.ts parsing flow
- [ ] Petstore spec (which has complete security definitions) processes without changes
- [ ] Committed with message: `feat(parser): implement security scheme normalizer to auto-generate missing authentication definitions`

---

#### P1-03: Implement Plugin Types

**Description:** Define comprehensive TypeScript types for the entire plugin architecture, including plugin configuration options, endpoint registry structures, handler/seed APIs, IPC message protocols, and security normalization types. These types form the contract between different plugin subsystems and provide strong type safety for both plugin internals and public API consumers. All types must be derived from PRS Section 8 (Type Definitions) and maintain compatibility with Vite's plugin API types.

**Context:**
- **Type-first design**: Types are implemented before implementation code to establish clear contracts and enable TDD
- **Public vs internal types**: Plugin options and handler/seed contexts are public API; IPC messages and registry internals are private
- **Vite compatibility**: Plugin options extend Vite's Plugin type, ensuring lifecycle hooks match Vite's expectations
- **OpenAPI alignment**: Registry and endpoint types mirror OpenAPI 3.1 structure (Operation Object, Schema Object, Security Scheme)
- **IPC protocol**: Message types define parent-child process communication protocol for mock server isolation

**Implementation Approach:**
1. Start with **plugin-options.ts**: Core configuration interface that users pass to plugin function
2. Create **registry.ts**: Internal structures for storing parsed OpenAPI endpoints, schemas, and security schemes
3. Define **handlers.ts**: Public API for custom request handlers (context object, return types)
4. Define **seeds.ts**: Public API for seed data generators (context object, faker integration)
5. Implement **ipc-messages.ts**: Discriminated union types for parent↔child process messages
6. Create **security.ts**: Normalized security scheme types (extracted from OpenAPI spec, used by handlers)
7. Export all public types from **types/index.ts** for consumer imports
8. Verify types compile with `pnpm typecheck` and check no circular dependencies

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P1-03.1 | Create types/plugin-options.ts | Define `OpenApiServerPluginOptions` interface with all configuration properties from PRS Section 8.1: `openApiPath` (required), `port`, `proxyPath`, `seedsDir`, `handlersDir`, `enabled`, `startupTimeout`, `verbose`. Add JSDoc for each property explaining purpose, default value, and constraints. |
| P1-03.2 | Create types/registry.ts | Define `OpenApiEndpointRegistry` (Map-like structure), `OpenApiEndpointEntry` (method, path, operationId, parameters, requestBody, responses), `OpenApiServerSchemaEntry` (name, schema object), and `OpenApiSecuritySchemeEntry` (type, scheme, bearerFormat, flows). Mirror OpenAPI 3.1 structure. |
| P1-03.3 | Create types/handlers.ts | Define `HandlerContext` (request, params, query, body, headers, logger, registry, security), `HandlerResponse` (status, body, headers), `HandlerCodeGenerator` function type, and `HandlerFileExports` (default export signature). Include generic types for typed request/response bodies. |
| P1-03.4 | Create types/seeds.ts | Define `SeedContext` (faker instance, logger, registry, schemas), `SeedData` (array of objects matching schema), `SeedCodeGenerator` function type, and `SeedFileExports` (default export signature). Support typed seed data with schema validation. |
| P1-03.5 | Create types/ipc-messages.ts | Define discriminated union `OpenApiServerMessage` with `type` discriminator. Include message interfaces: `ReadyMessage`, `ErrorMessage`, `RequestMessage`, `ResponseMessage`, `ShutdownMessage`, `LogMessage`. Each has unique `type` string literal and relevant payload. Enable type-safe IPC communication. |
| P1-03.6 | Create types/security.ts | Define normalized security types: `NormalizedSecurityScheme` (union of ApiKey, HTTP, OAuth2, OpenIdConnect), `SecurityRequirement` (scheme name + scopes array), `SecurityContext` (current scheme, credentials, scopes). Used by handlers to access authentication state. |
| P1-03.7 | Export all types from types/index.ts | Re-export all public types (plugin options, handler/seed contexts, security types). Do NOT export internal types (registry internals, IPC messages). Add JSDoc module documentation explaining type categories and usage. |
| P1-03.8 | Add type tests | Create `types/__tests__/types.test-d.ts` using `tsd` or similar type testing library. Verify type inference works correctly (e.g., handler context provides correct types, discriminated unions narrow properly). Ensures types are usable and catch breaking changes. |

**Technical Considerations:**
- **Discriminated unions**: IPC messages use `type` field as discriminator for exhaustive switch statements and type narrowing
- **Generic types**: `HandlerContext<TBody = unknown>` allows typed request bodies when handler knows schema
- **Readonly properties**: Registry entries should be `Readonly<...>` to prevent mutation after parsing
- **Exact types**: Use `type X = { ... }` instead of `interface X { ... }` when exact shape matters (prevents extension)
- **Optional chaining support**: All optional fields use `?:` operator for safe property access
- **Vite Plugin type**: Plugin options should be compatible with Vite's `Plugin` interface (avoid conflicting property names)
- **OpenAPI references**: Registry types include `$ref` resolution metadata for tracking schema inheritance
- **Logger interface**: Use Vite's `Logger` type for consistency with Vite's logging system
- **Faker typing**: Import `@faker-js/faker` types conditionally (peer dependency, may not be installed)
- **Node types**: IPC message payloads must be JSON-serializable (no functions, symbols, or circular refs)

**Expected Outputs:**

1. **types/plugin-options.ts**:
```typescript
/**
 * Configuration options for the OpenAPI Server plugin.
 * 
 * @example
 * ```ts
 * openApiServerPlugin({
 *   openApiPath: './petstore.openapi.yaml',
 *   port: 3001,
 *   proxyPath: '/api',
 * })
 * ```
 */
export interface OpenApiServerPluginOptions {
  /** Path to OpenAPI 3.1 spec file (YAML or JSON). Relative to project root. */
  openApiPath: string;
  
  /** Port for mock server child process. Default: 3001. Must not conflict with Vite dev server. */
  port?: number;
  
  /** Base path to proxy to mock server. Default: '/api'. Example: '/api' proxies '/api/pets' to mock server. */
  proxyPath?: string;
  
  /** Directory for seed data files. Default: './open-api-server/seeds' relative to spec file. */
  seedsDir?: string;
  
  /** Directory for custom handlers. Default: './open-api-server/handlers' relative to spec file. */
  handlersDir?: string;
  
  /** Enable/disable plugin. Default: true. Set false to disable in production builds. */
  enabled?: boolean;
  
  /** Timeout (ms) to wait for mock server startup. Default: 5000. Increase for large specs. */
  startupTimeout?: number;
  
  /** Enable verbose logging. Default: false. Shows detailed startup, IPC, and request logs. */
  verbose?: boolean;
}
```

2. **types/registry.ts**:
```typescript
import type { OpenAPIV3_1 } from 'openapi-types';

/**
 * Parsed OpenAPI endpoint registry.
 * Maps endpoint keys (e.g., 'GET /pets') to operation metadata.
 */
export interface OpenApiEndpointRegistry {
  endpoints: Map<string, OpenApiEndpointEntry>;
  schemas: Map<string, OpenApiServerSchemaEntry>;
  securitySchemes: Map<string, OpenApiSecuritySchemeEntry>;
}

/**
 * Single endpoint entry in registry.
 * Contains all metadata needed to handle requests for this operation.
 */
export interface OpenApiEndpointEntry {
  method: string;
  path: string;
  operationId: string;
  summary?: string;
  description?: string;
  parameters: OpenAPIV3_1.ParameterObject[];
  requestBody?: OpenAPIV3_1.RequestBodyObject;
  responses: Record<string, OpenAPIV3_1.ResponseObject>;
  security?: OpenAPIV3_1.SecurityRequirementObject[];
  tags?: string[];
}

/**
 * Schema entry for component schemas.
 * Used for validation and seed data generation.
 */
export interface OpenApiServerSchemaEntry {
  name: string;
  schema: OpenAPIV3_1.SchemaObject;
}

/**
 * Security scheme entry (API key, OAuth2, etc.).
 * Extracted from components.securitySchemes.
 */
export interface OpenApiSecuritySchemeEntry {
  name: string;
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  scheme?: string; // For http type: 'bearer', 'basic', etc.
  bearerFormat?: string; // For http bearer: 'JWT', etc.
  in?: 'query' | 'header' | 'cookie'; // For apiKey type
  flows?: OpenAPIV3_1.OAuth2SecurityScheme['flows']; // For oauth2
}
```

3. **types/handlers.ts**:
```typescript
import type { Logger } from 'vite';
import type { OpenApiEndpointRegistry } from './registry';
import type { SecurityContext } from './security';

/**
 * Context object passed to custom handler functions.
 * Provides access to request data, registry, logger, and security state.
 * 
 * @template TBody - Type of request body (defaults to unknown)
 */
export interface HandlerContext<TBody = unknown> {
  /** HTTP method (GET, POST, etc.) */
  method: string;
  
  /** Request path (e.g., '/pets/123') */
  path: string;
  
  /** Path parameters (e.g., { petId: '123' }) */
  params: Record<string, string>;
  
  /** Query parameters (e.g., { status: 'available' }) */
  query: Record<string, string | string[]>;
  
  /** Parsed request body (JSON or form data) */
  body: TBody;
  
  /** Request headers (lowercase keys) */
  headers: Record<string, string | string[] | undefined>;
  
  /** Vite logger for consistent logging */
  logger: Logger;
  
  /** OpenAPI registry (read-only access to schemas, endpoints, security) */
  registry: Readonly<OpenApiEndpointRegistry>;
  
  /** Security context (current scheme, credentials, scopes) */
  security: SecurityContext;
}

/**
 * Response returned by custom handler functions.
 * Null means "use default mock behavior".
 */
export interface HandlerResponse {
  /** HTTP status code (200, 404, etc.) */
  status: number;
  
  /** Response body (will be JSON.stringify'd if object) */
  body: unknown;
  
  /** Response headers (optional) */
  headers?: Record<string, string>;
}

/**
 * Custom handler function signature.
 * Async function that receives context and returns response or null.
 */
export type HandlerCodeGenerator<TBody = unknown> = (
  context: HandlerContext<TBody>
) => Promise<HandlerResponse | null>;

/**
 * Expected exports from handler files.
 * Must default export an async function matching HandlerCodeGenerator signature.
 */
export interface HandlerFileExports {
  default: HandlerCodeGenerator;
}
```

4. **types/seeds.ts**:
```typescript
import type { Faker } from '@faker-js/faker';
import type { Logger } from 'vite';
import type { OpenApiEndpointRegistry } from './registry';

/**
 * Context object passed to seed generator functions.
 * Provides faker instance, logger, and registry for generating realistic data.
 */
export interface SeedContext {
  /** Faker instance for generating realistic fake data */
  faker: Faker;
  
  /** Vite logger for logging seed generation progress */
  logger: Logger;
  
  /** OpenAPI registry (schemas for validation) */
  registry: Readonly<OpenApiEndpointRegistry>;
  
  /** Schema name this seed is for (e.g., 'Pet') */
  schemaName: string;
}

/**
 * Seed data returned by generator functions.
 * Array of objects matching the schema.
 */
export type SeedData = unknown[];

/**
 * Seed generator function signature.
 * Async function that receives context and returns array of seed objects.
 */
export type SeedCodeGenerator = (context: SeedContext) => Promise<SeedData>;

/**
 * Expected exports from seed files.
 * Must default export an async function matching SeedCodeGenerator signature.
 */
export interface SeedFileExports {
  default: SeedCodeGenerator;
}
```

5. **types/ipc-messages.ts**:
```typescript
/**
 * IPC message protocol for parent ↔ child process communication.
 * All messages are JSON-serializable and include a 'type' discriminator.
 */

/**
 * Child → Parent: Mock server is ready and listening.
 */
export interface ReadyMessage {
  type: 'ready';
  port: number;
  endpointCount: number;
}

/**
 * Child → Parent: Fatal error during startup or runtime.
 */
export interface ErrorMessage {
  type: 'error';
  message: string;
  stack?: string;
}

/**
 * Parent → Child: Forward HTTP request to mock server.
 */
export interface RequestMessage {
  type: 'request';
  id: string; // Correlation ID
  method: string;
  path: string;
  headers: Record<string, string | string[]>;
  body?: unknown;
}

/**
 * Child → Parent: HTTP response from mock server.
 */
export interface ResponseMessage {
  type: 'response';
  id: string; // Correlation ID (matches request)
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

/**
 * Parent → Child: Graceful shutdown request.
 */
export interface ShutdownMessage {
  type: 'shutdown';
}

/**
 * Child → Parent: Log message for verbose mode.
 */
export interface LogMessage {
  type: 'log';
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: number;
}

/**
 * Discriminated union of all IPC message types.
 * Use type narrowing in switch statements.
 */
export type OpenApiServerMessage =
  | ReadyMessage
  | ErrorMessage
  | RequestMessage
  | ResponseMessage
  | ShutdownMessage
  | LogMessage;
```

6. **types/security.ts**:
```typescript
/**
 * Normalized security scheme types.
 * Extracted from OpenAPI spec and provided to handlers.
 */

export interface ApiKeySecurityScheme {
  type: 'apiKey';
  name: string; // Header/query param name
  in: 'query' | 'header' | 'cookie';
}

export interface HttpSecurityScheme {
  type: 'http';
  scheme: 'bearer' | 'basic' | string;
  bearerFormat?: string; // e.g., 'JWT'
}

export interface OAuth2SecurityScheme {
  type: 'oauth2';
  flows: Record<string, { scopes: Record<string, string> }>;
}

export interface OpenIdConnectSecurityScheme {
  type: 'openIdConnect';
  openIdConnectUrl: string;
}

/**
 * Union of all security scheme types.
 */
export type NormalizedSecurityScheme =
  | ApiKeySecurityScheme
  | HttpSecurityScheme
  | OAuth2SecurityScheme
  | OpenIdConnectSecurityScheme;

/**
 * Security requirement (scheme name + scopes).
 * Extracted from operation.security array.
 */
export interface SecurityRequirement {
  schemeName: string;
  scopes: string[];
}

/**
 * Security context provided to handlers.
 * Contains current authentication state.
 */
export interface SecurityContext {
  /** Security requirements for this operation (from spec) */
  requirements: SecurityRequirement[];
  
  /** Matched security scheme (null if no auth required) */
  scheme: NormalizedSecurityScheme | null;
  
  /** Extracted credentials (API key, bearer token, etc.) */
  credentials: string | null;
  
  /** Validated scopes (for OAuth2) */
  scopes: string[];
}
```

7. **types/index.ts** (public API exports):
```typescript
/**
 * Public type definitions for @websublime/vite-plugin-open-api-server.
 * 
 * @module @websublime/vite-plugin-open-api-server/types
 */

// Plugin configuration
export type { OpenApiServerPluginOptions } from './plugin-options';

// Handler API (public)
export type {
  HandlerContext,
  HandlerResponse,
  HandlerCodeGenerator,
  HandlerFileExports,
} from './handlers';

// Seed API (public)
export type {
  SeedContext,
  SeedData,
  SeedCodeGenerator,
  SeedFileExports,
} from './seeds';

// Security API (public)
export type {
  NormalizedSecurityScheme,
  SecurityRequirement,
  SecurityContext,
  ApiKeySecurityScheme,
  HttpSecurityScheme,
  OAuth2SecurityScheme,
  OpenIdConnectSecurityScheme,
} from './security';

// Internal types (NOT exported):
// - registry.ts (internal data structures)
// - ipc-messages.ts (internal IPC protocol)
```

**Acceptance Criteria:**
- [ ] `types/plugin-options.ts` created with `OpenApiServerPluginOptions` interface
- [ ] All 8 configuration properties documented with JSDoc comments
- [ ] Required property `openApiPath` is non-optional (no `?:`)
- [ ] Optional properties use `?:` operator (port, proxyPath, seedsDir, handlersDir, enabled, startupTimeout, verbose)
- [ ] Default values documented in JSDoc (e.g., "Default: 3001")
- [ ] `types/registry.ts` created with registry interfaces
- [ ] `OpenApiEndpointRegistry` contains `endpoints`, `schemas`, `securitySchemes` Maps
- [ ] `OpenApiEndpointEntry` contains all operation metadata (method, path, operationId, parameters, requestBody, responses, security, tags)
- [ ] Registry types use `openapi-types` library for OpenAPI 3.1 object types
- [ ] `types/handlers.ts` created with handler API types
- [ ] `HandlerContext` is generic with `<TBody = unknown>` template parameter
- [ ] `HandlerContext` includes all request data (method, path, params, query, body, headers)
- [ ] `HandlerContext` includes tools (logger, registry, security)
- [ ] `HandlerResponse` includes status, body, optional headers
- [ ] `HandlerCodeGenerator` type signature is `(context) => Promise<HandlerResponse | null>`
- [ ] Null return type documented as "use default mock behavior"
- [ ] `types/seeds.ts` created with seed API types
- [ ] `SeedContext` includes faker instance, logger, registry, schemaName
- [ ] `SeedData` is typed as `unknown[]` (array of objects)
- [ ] `SeedCodeGenerator` type signature is `(context) => Promise<SeedData>`
- [ ] `types/ipc-messages.ts` created with IPC protocol types
- [ ] All 6 message types defined (Ready, Error, Request, Response, Shutdown, Log)
- [ ] Each message has unique `type` string literal for discrimination
- [ ] `OpenApiServerMessage` is discriminated union of all message types
- [ ] All message payloads are JSON-serializable (no functions or circular refs)
- [ ] Request/Response messages include correlation ID for pairing
- [ ] `types/security.ts` created with normalized security types
- [ ] All 4 security scheme types defined (ApiKey, HTTP, OAuth2, OpenIdConnect)
- [ ] `NormalizedSecurityScheme` is union type
- [ ] `SecurityContext` includes requirements, scheme, credentials, scopes
- [ ] `types/index.ts` exports all public types
- [ ] Internal types (registry, IPC messages) NOT exported from index.ts
- [ ] Module-level JSDoc documentation added to index.ts
- [ ] All files use `export type` for type-only exports (better tree-shaking)
- [ ] `pnpm typecheck` passes with no type errors
- [ ] No circular dependencies between type files
- [ ] `openapi-types` package added to dependencies in package.json
- [ ] `@faker-js/faker` types imported conditionally (peer dependency)
- [ ] All types follow TypeScript naming conventions (PascalCase for types/interfaces)
- [ ] Generic types use meaningful template parameter names (`TBody`, not `T`)
- [ ] All public types have JSDoc comments with examples where appropriate
- [ ] Committed with message: `feat(types): implement comprehensive plugin type definitions`

---

---

#### P1-04: Implement Basic Vite Plugin Skeleton (FR-002)

**Description:** Implement the main Vite plugin factory function and skeleton structure with essential lifecycle hooks (`config`, `configureServer`, `configResolved`, `buildStart`, `closeBundle`). This establishes the plugin's entry point, validates user-provided options, sets up integration points with Vite's dev server, and prepares hooks for mock server lifecycle management. The skeleton provides structure for Phase 2-5 implementations while being functional enough to load without errors.

**Context:**
- **Plugin factory pattern**: Function that accepts options and returns Vite `Plugin` object
- **Lifecycle hooks order**: `config` → `configResolved` → `configureServer` → `buildStart` → ... → `closeBundle`
- **Option validation**: Happens in factory function before returning plugin object (fail fast)
- **Default values**: Applied in factory function, merged with user options
- **Dev-only behavior**: Mock server only runs in dev mode (`apply: 'serve'` or runtime check in hooks)
- **Plugin name**: `vite-plugin-open-api-server` for debugging and error messages
- **Enforce order**: Use `enforce: 'pre'` to run before other plugins (important for proxy setup)

**Implementation Approach:**
1. Create `src/plugin.ts` with `openApiServerPlugin()` factory function
2. Accept `OpenApiServerPluginOptions` parameter (partial, since most fields optional)
3. Validate required option `openApiPath` (throw error if missing or invalid type)
4. Merge user options with defaults using object spread
5. Return Vite `Plugin` object with `name`, `enforce`, and lifecycle hooks
6. Implement `config()` hook to merge Vite config (proxy setup placeholder)
7. Implement `configResolved()` hook to store resolved Vite config reference
8. Implement `configureServer()` hook to access dev server instance (middleware setup placeholder)
9. Implement `buildStart()` hook to start mock server (child process spawn placeholder)
10. Implement `closeBundle()` hook to shutdown mock server (graceful cleanup placeholder)
11. Add internal state tracking (mockServerProcess, mockServerPort, isReady)
12. Export plugin function from `src/index.ts`

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P1-04.1 | Create plugin factory function | Implement `openApiServerPlugin(options)` function in `src/plugin.ts`. Accept partial `OpenApiServerPluginOptions`, validate `openApiPath` is provided (required field), throw descriptive error if missing. Return Vite `Plugin` object structure. |
| P1-04.2 | Merge options with defaults | Define `DEFAULT_OPTIONS` constant with default values (port: 3001, proxyPath: '/api', enabled: true, startupTimeout: 5000, verbose: false). Merge user options with defaults using `{ ...DEFAULT_OPTIONS, ...options }`. Handle seedsDir/handlersDir defaults (resolve relative to spec file, computed later). |
| P1-04.3 | Implement config() hook | Add `config()` hook to return partial Vite config. Placeholder for proxy configuration (will add Vite server.proxy setup in Phase 3). Return empty object for now. Log "config() called" if verbose mode. |
| P1-04.4 | Implement configResolved() hook | Add `configResolved(resolvedConfig)` hook to store Vite's resolved configuration in plugin closure variable. Needed to access root dir, logger, and other Vite config values in later hooks. Log resolved config.root if verbose. |
| P1-04.5 | Implement configureServer() hook | Add `configureServer(server)` hook to access Vite dev server instance. Placeholder for middleware registration (will add request interception in Phase 3). Store server reference in closure. Log "configureServer() called" if verbose. |
| P1-04.6 | Implement buildStart() hook | Add `buildStart()` hook to trigger mock server startup. Placeholder comment: "// Phase 4: P4-01 - Spawn child process and wait for ready message". Log "Mock server start triggered" if verbose. For now, just log, no actual spawn. |
| P1-04.7 | Implement closeBundle() hook | Add `closeBundle()` hook to trigger mock server shutdown. Placeholder comment: "// Phase 4: P4-03 - Send shutdown IPC message and wait for exit". Log "Mock server shutdown triggered" if verbose. For now, just log, no actual cleanup. |
| P1-04.8 | Add internal state management | Create closure variables to track plugin state: `mockServerProcess` (ChildProcess | null), `mockServerPort` (number | null), `isReady` (boolean). Initialize all to null/false. Will be populated in Phase 4 when process management is implemented. |
| P1-04.9 | Add plugin metadata | Set plugin object properties: `name: 'vite-plugin-open-api-server'`, `enforce: 'pre'` (run early for proxy setup), `apply: 'serve'` (dev mode only, don't run in build). Add JSDoc comment explaining plugin purpose. |
| P1-04.10 | Export plugin from index.ts | Update `src/index.ts` to export `openApiServerPlugin` function as default and named export. Also export types from `types/index.ts`. Verify TypeScript compilation and Vite can load plugin. |

**Technical Considerations:**
- **Option validation timing**: Validate in factory function (early failure) rather than in hooks (late failure after Vite setup)
- **Partial options type**: Use `Partial<OpenApiServerPluginOptions>` in function signature since only `openApiPath` is required
- **Default value strategy**: Use const object for defaults, document each default in JSDoc, merge with spread operator
- **Closure state vs class**: Use closure variables (functional style) rather than class with instance properties (simpler, matches Vite plugin patterns)
- **Hook execution order**: `config` runs first (for Vite config merging), `configResolved` runs after Vite resolves full config, `configureServer` runs after server creation, `buildStart` runs when Vite build starts (dev or production)
- **Dev-only enforcement**: Use `apply: 'serve'` to prevent plugin from running in production builds (mock server is dev-only feature)
- **Enforce pre**: Use `enforce: 'pre'` to ensure proxy middleware runs before other plugins' middleware
- **Logger access**: Get logger from resolved Vite config in `configResolved` hook, use for all plugin logging
- **Server reference**: Store server instance from `configureServer` hook for middleware registration in Phase 3
- **Async hooks**: All hooks except `config` can be async (return Promise) if needed for Phase 4 process management
- **Error handling**: Wrap hook implementations in try-catch to prevent plugin crashes from breaking Vite dev server

**Expected Outputs:**

1. **src/plugin.ts** (skeleton implementation):
```typescript
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import type { OpenApiServerPluginOptions } from './types';
import type { ChildProcess } from 'node:child_process';

/**
 * Default plugin options.
 * Merged with user-provided options.
 */
const DEFAULT_OPTIONS = {
  port: 3001,
  proxyPath: '/api',
  enabled: true,
  startupTimeout: 5000,
  verbose: false,
} as const;

/**
 * Vite plugin for OpenAPI mock server.
 * 
 * Spawns a child process to run mock server, proxies requests from Vite dev server,
 * and provides hot reload when OpenAPI spec, handlers, or seeds change.
 * 
 * @param options - Plugin configuration options
 * @returns Vite plugin object
 * 
 * @example
 * ```ts
 * // vite.config.ts
 * import { openApiServerPlugin } from '@websublime/vite-plugin-open-api-server';
 * 
 * export default defineConfig({
 *   plugins: [
 *     openApiServerPlugin({
 *       openApiPath: './petstore.openapi.yaml',
 *       port: 3001,
 *       proxyPath: '/api',
 *     }),
 *   ],
 * });
 * ```
 */
export function openApiServerPlugin(
  options: Partial<OpenApiServerPluginOptions>
): Plugin {
  // Validate required options
  if (!options.openApiPath) {
    throw new Error(
      '[vite-plugin-open-api-server] Missing required option: openApiPath'
    );
  }

  if (typeof options.openApiPath !== 'string') {
    throw new Error(
      '[vite-plugin-open-api-server] openApiPath must be a string'
    );
  }

  // Merge with defaults
  const pluginOptions: OpenApiServerPluginOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    openApiPath: options.openApiPath, // Required, no default
  };

  // Plugin state (managed in closure)
  let resolvedConfig: ResolvedConfig | null = null;
  let devServer: ViteDevServer | null = null;
  let mockServerProcess: ChildProcess | null = null;
  let mockServerPort: number | null = null;
  let isReady = false;

  const plugin: Plugin = {
    name: 'vite-plugin-open-api-server',
    enforce: 'pre', // Run early to set up proxy before other plugins
    apply: 'serve', // Dev mode only (don't run in production build)

    /**
     * Modify Vite config before it's resolved.
     * Used to add proxy configuration for mock server.
     */
    config() {
      if (pluginOptions.verbose) {
        console.log('[vite-plugin-open-api-server] config() called');
      }

      // Phase 3: P3-01 - Add proxy configuration
      // return {
      //   server: {
      //     proxy: {
      //       [pluginOptions.proxyPath]: {
      //         target: `http://localhost:${pluginOptions.port}`,
      //         changeOrigin: true,
      //         rewrite: (path) => path.replace(new RegExp(`^${pluginOptions.proxyPath}`), ''),
      //       },
      //     },
      //   },
      // };

      return {};
    },

    /**
     * Store resolved Vite config for later use.
     */
    configResolved(config) {
      resolvedConfig = config;

      if (pluginOptions.verbose) {
        console.log(
          `[vite-plugin-open-api-server] configResolved() - root: ${config.root}`
        );
      }
    },

    /**
     * Access Vite dev server to register middleware.
     */
    configureServer(server) {
      devServer = server;

      if (pluginOptions.verbose) {
        console.log('[vite-plugin-open-api-server] configureServer() called');
      }

      // Phase 3: P3-02 - Register request interception middleware
      // server.middlewares.use((req, res, next) => {
      //   // Intercept requests matching proxyPath
      //   // Forward to mock server child process via IPC
      // });
    },

    /**
     * Start mock server child process when Vite dev server starts.
     */
    async buildStart() {
      if (!pluginOptions.enabled) {
        if (pluginOptions.verbose) {
          console.log('[vite-plugin-open-api-server] Plugin disabled via options');
        }
        return;
      }

      if (pluginOptions.verbose) {
        console.log('[vite-plugin-open-api-server] buildStart() - Mock server start triggered');
      }

      // Phase 4: P4-01 - Spawn child process
      // mockServerProcess = spawn('node', ['./dist/mock-server.mjs'], { ... });
      // mockServerProcess.on('message', (msg: OpenApiServerMessage) => { ... });
      // Wait for ReadyMessage with timeout
    },

    /**
     * Shutdown mock server child process when Vite dev server closes.
     */
    async closeBundle() {
      if (pluginOptions.verbose) {
        console.log('[vite-plugin-open-api-server] closeBundle() - Mock server shutdown triggered');
      }

      // Phase 4: P4-03 - Graceful shutdown
      // if (mockServerProcess) {
      //   mockServerProcess.send({ type: 'shutdown' });
      //   await waitForExit(mockServerProcess, 5000);
      //   mockServerProcess = null;
      // }
    },
  };

  return plugin;
}
```

2. **src/index.ts** (updated exports):
```typescript
/**
 * @websublime/vite-plugin-open-api-server
 * 
 * Vite plugin for OpenAPI-driven mock servers with custom handlers and seed data.
 * 
 * @packageDocumentation
 */

export { openApiServerPlugin } from './plugin';
export { openApiServerPlugin as default } from './plugin';

export type {
  OpenApiServerPluginOptions,
  HandlerContext,
  HandlerResponse,
  HandlerCodeGenerator,
  HandlerFileExports,
  SeedContext,
  SeedData,
  SeedCodeGenerator,
  SeedFileExports,
  NormalizedSecurityScheme,
  SecurityRequirement,
  SecurityContext,
} from './types';
```

3. **Verification** (playground app can load plugin):
```typescript
// playground/petstore-app/vite.config.ts
import { defineConfig } from 'vite';
import { openApiServerPlugin } from '@websublime/vite-plugin-open-api-server';

export default defineConfig({
  plugins: [
    openApiServerPlugin({
      openApiPath: './src/apis/petstore/petstore.openapi.yaml',
      port: 3001,
      proxyPath: '/api',
      verbose: true, // See plugin hooks in console
    }),
  ],
});
```

4. **Console output** when running `pnpm playground`:
```
[vite-plugin-open-api-server] config() called
[vite-plugin-open-api-server] configResolved() - root: /path/to/playground/petstore-app
[vite-plugin-open-api-server] configureServer() called
[vite-plugin-open-api-server] buildStart() - Mock server start triggered
```

**Acceptance Criteria:**
- [ ] `src/plugin.ts` created with `openApiServerPlugin()` factory function
- [ ] Function accepts `Partial<OpenApiServerPluginOptions>` parameter
- [ ] Required option `openApiPath` is validated (throw error if missing or wrong type)
- [ ] Error message is descriptive: "[vite-plugin-open-api-server] Missing required option: openApiPath"
- [ ] `DEFAULT_OPTIONS` constant defined with all default values
- [ ] User options merged with defaults using spread operator
- [ ] Plugin object has `name: 'vite-plugin-open-api-server'`
- [ ] Plugin object has `enforce: 'pre'` (run before other plugins)
- [ ] Plugin object has `apply: 'serve'` (dev mode only)
- [ ] `config()` hook implemented (returns empty object with placeholder comment)
- [ ] `configResolved()` hook implemented (stores resolved config)
- [ ] `configureServer()` hook implemented (stores server instance)
- [ ] `buildStart()` hook implemented (logs "start triggered" with placeholder comment)
- [ ] `closeBundle()` hook implemented (logs "shutdown triggered" with placeholder comment)
- [ ] Verbose logging works (console.log statements conditional on `pluginOptions.verbose`)
- [ ] Closure state variables declared (mockServerProcess, mockServerPort, isReady)
- [ ] All state variables initialized to null/false
- [ ] Placeholder comments reference Phase 3/4 tasks for future implementation
- [ ] Function has comprehensive JSDoc documentation with @param, @returns, @example
- [ ] `src/index.ts` exports plugin function as default and named export
- [ ] `src/index.ts` re-exports all public types from `types/index.ts`
- [ ] Package documentation added at top of index.ts with @packageDocumentation
- [ ] `pnpm typecheck` passes with no type errors
- [ ] Plugin compiles to `dist/index.mjs` and `dist/index.d.mts` with tsdown
- [ ] Playground app can import and use plugin without errors
- [ ] Running `pnpm playground` shows plugin hook logs in console (when verbose: true)
- [ ] Plugin does not throw errors during Vite dev server startup
- [ ] Plugin does not throw errors during Vite dev server shutdown
- [ ] Vite dev server starts successfully with plugin enabled
- [ ] Default values are correct (port: 3001, proxyPath: '/api', enabled: true, startupTimeout: 5000, verbose: false)
- [ ] Committed with message: `feat(plugin): implement basic Vite plugin skeleton with lifecycle hooks`

---

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

**Description:** Integrate @scalar/mock-server library to create a standalone HTTP server that generates mock responses from OpenAPI specs. The mock server runs as a child process, using Hono as the HTTP framework and @hono/node-server as the Node.js adapter. This task implements the core mock server logic that will be spawned by the Vite plugin in Phase 4, focusing on Scalar integration, HTTP server setup, configuration via environment variables, and basic request logging.

**Context:**
- **@scalar/mock-server**: Library that generates mock responses from OpenAPI specs using realistic data
- **Hono**: Lightweight web framework (Express alternative) with excellent TypeScript support and performance
- **@hono/node-server**: Node.js adapter for Hono (serves Hono apps on Node's http.Server)
- **Child process design**: Mock server runs in isolation, communicates with parent via IPC (Phase 4)
- **Configuration via env vars**: Parent process passes config (port, spec path, etc.) via environment variables
- **ESM module**: Runner script is `.mts` (ESM TypeScript) for modern Node.js compatibility
- **Request logging**: Hono middleware logs all incoming requests for debugging

**Implementation Approach:**
1. Create `src/runner/openapi-server-runner.mts` as the child process entry point
2. Read configuration from environment variables (PORT, OPENAPI_SPEC_PATH, VERBOSE, etc.)
3. Load and parse OpenAPI spec file using parser from P1-01
4. Create Scalar mock server instance with parsed spec
5. Wrap Scalar mock server in Hono app (Hono provides routing, middleware, error handling)
6. Add request logging middleware (log method, path, status code)
7. Start HTTP server using @hono/node-server on configured port
8. Send "ready" IPC message to parent process with port and endpoint count
9. Set up graceful shutdown handler (listen for SIGTERM and IPC shutdown message)
10. Test with Petstore spec to verify all 19 endpoints work

**Estimate:** M (3 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P1-05.1 | Create runner/openapi-server-runner.mts | Create ESM TypeScript entry point file at `src/runner/openapi-server-runner.mts`. This will be compiled by tsdown and executed by child process. Add shebang `#!/usr/bin/env node` for direct execution. |
| P1-05.2 | Read environment variables | Read config from env vars: `PORT` (default 3001), `OPENAPI_SPEC_PATH` (required), `VERBOSE` (default false), `HANDLERS_DIR`, `SEEDS_DIR`. Throw error if OPENAPI_SPEC_PATH missing. Parse boolean/number values correctly. |
| P1-05.3 | Load and parse OpenAPI spec | Import `parseOpenApiSpec()` from P1-01 parser. Load spec file from `OPENAPI_SPEC_PATH`. Parse YAML/JSON. Validate spec structure. Exit with error code 1 if parsing fails. Log parse errors to stderr. |
| P1-05.4 | Create Scalar mock server | Import `createMockServer` from `@scalar/mock-server`. Pass parsed OpenAPI spec. Configure Scalar options (strict mode, faker seed, response selection). Get Hono app instance from Scalar. |
| P1-05.5 | Add request logging middleware | Add Hono middleware before Scalar routes to log all requests: `app.use('*', async (c, next) => { ... })`. Log: timestamp, method, path, query params, status code, response time. Conditional on VERBOSE env var. |
| P1-05.6 | Start HTTP server | Import `serve` from `@hono/node-server`. Call `serve({ fetch: app.fetch, port })` to start Node.js HTTP server. Listen on configured PORT. Log "Server listening on http://localhost:{port}" to stdout. |
| P1-05.7 | Send ready IPC message | After server starts, send IPC message to parent: `process.send({ type: 'ready', port, endpointCount })`. Count endpoints from parsed spec. Parent waits for this message before considering server ready. |
| P1-05.8 | Implement graceful shutdown | Listen for `process.on('SIGTERM')` and `process.on('message')` (IPC shutdown). On shutdown signal, stop HTTP server gracefully, close connections, exit with code 0. Timeout after 5 seconds and force exit. |
| P1-05.9 | Add error handling | Wrap main logic in try-catch. Send IPC error message on uncaught exceptions: `process.send({ type: 'error', message, stack })`. Exit with code 1 on fatal errors. Handle promise rejections. |
| P1-05.10 | Test with Petstore spec | Run `node dist/runner/openapi-server-runner.mjs` with Petstore spec path. Verify all 19 endpoints respond. Test GET /pet/findByStatus, POST /pet, DELETE /pet/{petId}. Check response schemas match spec. Verify logging output. |

**Technical Considerations:**
- **ESM vs CommonJS**: Use `.mts` extension and `"type": "module"` in package.json for native ESM support
- **Environment variable precedence**: Env vars override defaults, command-line args (if added) override env vars
- **Boolean parsing**: Env vars are strings; parse "true"/"false" with `value === 'true'`
- **Port conflicts**: If port in use, server should fail fast with clear error message
- **IPC availability**: `process.send()` only exists when spawned with `{ ipc: true }` option (Phase 4 ensures this)
- **Scalar response selection**: Scalar supports multiple responses (200, 404, etc.); configure to prefer 2xx responses
- **Hono middleware order**: Logging middleware must run before Scalar routes to capture all requests
- **Error serialization**: IPC messages must be JSON-serializable; serialize Error objects to { message, stack }
- **Graceful shutdown timing**: Allow time for in-flight requests to complete before forcing exit
- **Faker integration**: Scalar uses faker internally; seed should be deterministic for reproducible responses
- **OpenAPI versions**: Test with both 3.0 and 3.1 specs to ensure compatibility

**Expected Outputs:**

1. **src/runner/openapi-server-runner.mts**:
```typescript
#!/usr/bin/env node
/**
 * OpenAPI Mock Server Runner
 * 
 * Standalone HTTP server that generates mock responses from OpenAPI specs.
 * Runs as a child process, communicates with Vite plugin via IPC.
 * 
 * Configuration via environment variables:
 * - PORT: HTTP server port (default: 3001)
 * - OPENAPI_SPEC_PATH: Path to OpenAPI spec file (required)
 * - VERBOSE: Enable verbose logging (default: false)
 * - HANDLERS_DIR: Custom handlers directory
 * - SEEDS_DIR: Seed data directory
 */

import { serve } from '@hono/node-server';
import { createMockServer } from '@scalar/mock-server';
import { parseOpenApiSpec } from '../parser/openapi-parser';
import type { OpenApiServerMessage } from '../types/ipc-messages';

// Read configuration from environment variables
const PORT = parseInt(process.env.PORT || '3001', 10);
const OPENAPI_SPEC_PATH = process.env.OPENAPI_SPEC_PATH;
const VERBOSE = process.env.VERBOSE === 'true';

if (!OPENAPI_SPEC_PATH) {
  console.error('[mock-server] ERROR: OPENAPI_SPEC_PATH environment variable is required');
  process.exit(1);
}

async function startServer() {
  try {
    // Parse OpenAPI spec
    if (VERBOSE) {
      console.log(`[mock-server] Loading OpenAPI spec from: ${OPENAPI_SPEC_PATH}`);
    }

    const spec = await parseOpenApiSpec(OPENAPI_SPEC_PATH);
    const endpointCount = Object.keys(spec.paths || {}).length;

    if (VERBOSE) {
      console.log(`[mock-server] Parsed ${endpointCount} endpoints from spec`);
    }

    // Create Scalar mock server (returns Hono app)
    const app = createMockServer({
      specification: spec,
      options: {
        strict: false, // Allow requests not in spec
        fakerSeed: 42, // Deterministic fake data
        preferredResponseCode: 200, // Prefer success responses
      },
    });

    // Add request logging middleware
    if (VERBOSE) {
      app.use('*', async (c, next) => {
        const start = Date.now();
        const method = c.req.method;
        const path = c.req.path;

        await next();

        const duration = Date.now() - start;
        const status = c.res.status;
        console.log(`[mock-server] ${method} ${path} - ${status} (${duration}ms)`);
      });
    }

    // Start HTTP server
    const server = serve({
      fetch: app.fetch,
      port: PORT,
    });

    console.log(`[mock-server] Server listening on http://localhost:${PORT}`);

    // Send ready message to parent process (via IPC)
    if (process.send) {
      const readyMessage: OpenApiServerMessage = {
        type: 'ready',
        port: PORT,
        endpointCount,
      };
      process.send(readyMessage);
    }

    // Graceful shutdown
    const shutdown = async () => {
      console.log('[mock-server] Shutting down...');
      // Hono/serve doesn't expose server.close(), so just exit
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    
    // Listen for IPC shutdown message
    process.on('message', (msg: unknown) => {
      if (typeof msg === 'object' && msg !== null && 'type' in msg) {
        const message = msg as OpenApiServerMessage;
        if (message.type === 'shutdown') {
          shutdown();
        }
      }
    });

  } catch (error) {
    const err = error as Error;
    console.error('[mock-server] Fatal error:', err.message);

    // Send error message to parent (if IPC available)
    if (process.send) {
      const errorMessage: OpenApiServerMessage = {
        type: 'error',
        message: err.message,
        stack: err.stack,
      };
      process.send(errorMessage);
    }

    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[mock-server] Unhandled rejection:', reason);
  process.exit(1);
});

// Start server
startServer();
```

2. **package.json** (add dependencies):
```json
{
  "dependencies": {
    "@scalar/mock-server": "^0.2.0",
    "@hono/node-server": "^1.12.0",
    "hono": "^4.5.0"
  }
}
```

3. **Test output** (running `PORT=3001 OPENAPI_SPEC_PATH=./petstore.openapi.yaml VERBOSE=true node dist/runner/openapi-server-runner.mjs`):
```
[mock-server] Loading OpenAPI spec from: ./petstore.openapi.yaml
[mock-server] Parsed 19 endpoints from spec
[mock-server] Server listening on http://localhost:3001
[mock-server] GET /pet/findByStatus?status=available - 200 (45ms)
[mock-server] POST /pet - 200 (23ms)
[mock-server] GET /pet/123 - 200 (12ms)
```

**Acceptance Criteria:**
- [ ] `src/runner/openapi-server-runner.mts` created with shebang and ESM imports
- [ ] Environment variables read and validated (PORT, OPENAPI_SPEC_PATH, VERBOSE)
- [ ] OPENAPI_SPEC_PATH is required; process exits with code 1 if missing
- [ ] PORT defaults to 3001 if not provided
- [ ] VERBOSE defaults to false if not provided
- [ ] OpenAPI spec loaded and parsed using parser from P1-01
- [ ] Parser errors logged to stderr with helpful messages
- [ ] Scalar mock server created with `createMockServer()` from `@scalar/mock-server`
- [ ] Scalar configured with options: strict=false, fakerSeed=42, preferredResponseCode=200
- [ ] Hono app instance obtained from Scalar
- [ ] Request logging middleware added to Hono app (runs on all routes)
- [ ] Logging conditional on VERBOSE env var
- [ ] Logged data includes: method, path, status code, response time
- [ ] HTTP server started with `serve()` from `@hono/node-server`
- [ ] Server listens on configured PORT
- [ ] "Server listening" message logged to stdout
- [ ] Ready IPC message sent to parent with `process.send()`
- [ ] Ready message includes port and endpointCount
- [ ] SIGTERM signal handler registered for graceful shutdown
- [ ] SIGINT signal handler registered (Ctrl+C support)
- [ ] IPC shutdown message handler registered (listens for `{ type: 'shutdown' }`)
- [ ] Shutdown handler stops server and exits with code 0
- [ ] Uncaught exceptions caught and logged
- [ ] Error IPC message sent to parent on fatal errors
- [ ] Error message includes message and stack trace
- [ ] Process exits with code 1 on fatal errors
- [ ] Unhandled promise rejections caught and logged
- [ ] Tested with Petstore spec (all 19 endpoints)
- [ ] GET /pet/findByStatus returns 200 with array of pets
- [ ] POST /pet returns 200 with created pet object
- [ ] GET /pet/{petId} returns 200 with single pet object
- [ ] DELETE /pet/{petId} returns 200 or 204
- [ ] Response bodies match OpenAPI schema definitions
- [ ] Response content-type headers set correctly (application/json)
- [ ] Path parameters extracted correctly (e.g., petId from /pet/123)
- [ ] Query parameters extracted correctly (e.g., status from ?status=available)
- [ ] All HTTP methods supported (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)
- [ ] TypeScript compiles without errors
- [ ] Runner script compiles to `dist/runner/openapi-server-runner.mjs`
- [ ] Script is executable: `chmod +x dist/runner/openapi-server-runner.mjs`
- [ ] @scalar/mock-server, @hono/node-server, hono added to package.json dependencies
- [ ] Committed with message: `feat(runner): implement mock server with Scalar and Hono integration`

---

#### P1-06: Implement Startup Banner (FR-014)

**Description:** Implement colorful console banners for mock server startup and error states. Banners provide visual feedback during plugin initialization, show OpenAPI spec loading progress, display parsed endpoint counts, and highlight errors with helpful formatting. Uses ANSI color codes and box-drawing characters for clear visual hierarchy. Banners appear in Vite dev server console when plugin starts.

**Context:**
- **Visual feedback**: Helps developers understand plugin state without reading verbose logs
- **PRS examples**: Section 4.1 shows expected banner format with colors and ASCII art
- **ANSI colors**: Use standard color codes (green for success, red for errors, cyan for info)
- **Box drawing**: Use Unicode box-drawing characters (┌─┐│└─┘) for visual structure
- **Vite logger**: Use Vite's logger API for consistency with Vite's output style
- **Timing**: Loading banner shows during spec parsing; success banner shows when server ready; error banner shows on failures
- **Information density**: Show critical info (port, endpoint count, spec path) without clutter

**Implementation Approach:**
1. Create `src/logging/startup-banner.ts` utility module
2. Implement `printLoadingBanner(specPath, logger)` for spec loading state
3. Implement `printSuccessBanner(port, endpointCount, specPath, logger)` for ready state
4. Implement `printErrorBanner(error, specPath, logger)` for error state
5. Use ANSI escape codes for colors (green=\x1b[32m, red=\x1b[31m, cyan=\x1b[36m, reset=\x1b[0m)
6. Use Unicode box-drawing characters for borders (┌─┬─┐, │, └─┴─┘)
7. Format endpoint count, port, and timing information
8. Add helpful error messages with suggestions (e.g., "Check file path", "Validate YAML syntax")
9. Call banner functions from plugin hooks (buildStart for loading, ready message handler for success)
10. Test with Petstore spec to verify output matches PRS examples

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P1-06.1 | Create logging/startup-banner.ts | Create utility module at `src/logging/startup-banner.ts`. Export banner functions with Vite logger parameter for consistent output. Import color constants and box-drawing characters. |
| P1-06.2 | Define color constants | Create constants for ANSI color codes: `GREEN`, `RED`, `CYAN`, `YELLOW`, `RESET`. Add `dim` and `bold` codes for text styling. Export for reuse in other modules. |
| P1-06.3 | Define box-drawing characters | Create constants for Unicode box-drawing: `BOX_TOP_LEFT`, `BOX_TOP_RIGHT`, `BOX_BOTTOM_LEFT`, `BOX_BOTTOM_RIGHT`, `BOX_HORIZONTAL`, `BOX_VERTICAL`. Use single-line style (─│┌┐└┘). |
| P1-06.4 | Implement printLoadingBanner() | Show "Loading OpenAPI spec..." with animated spinner or static icon. Display spec file path. Use cyan color for info state. Call from plugin buildStart() hook before parsing spec. |
| P1-06.5 | Implement printSuccessBanner() | Show "Mock server ready!" with checkmark (✓). Display: port (http://localhost:3001), endpoint count (e.g., "19 endpoints"), spec path. Use green color for success. Include box border for emphasis. Call when ready IPC message received. |
| P1-06.6 | Implement printErrorBanner() | Show "Failed to start mock server" with cross (✗). Display error message and stack trace (truncated). Use red color for errors. Include helpful suggestions based on error type (file not found → check path, YAML parse error → validate syntax). Call when error IPC message received or parsing fails. |
| P1-06.7 | Format endpoint statistics | In success banner, show endpoint breakdown by method: "GET: 10, POST: 5, PUT: 2, DELETE: 2". Calculate from endpoint registry. Makes it easy to see API surface area at a glance. |
| P1-06.8 | Add timing information | Track time between loading banner and success banner. Display startup time in success banner: "Ready in 1.2s". Helps identify slow startup (large specs, slow file I/O). |
| P1-06.9 | Integrate with plugin hooks | Call `printLoadingBanner()` in plugin buildStart() hook. Call `printSuccessBanner()` when ready IPC message received. Call `printErrorBanner()` when error IPC message received or spec parsing throws. Pass Vite logger to all banner functions. |
| P1-06.10 | Test banner output | Run `pnpm playground` with verbose mode. Verify loading banner appears immediately. Verify success banner appears when server ready with correct port/endpoint count. Test error banner by providing invalid spec path. Verify colors display correctly in terminal. |

**Technical Considerations:**
- **ANSI color support**: Check `process.stdout.isTTY` to detect if colors are supported; fallback to plain text
- **Vite logger API**: Use `logger.info()` for success/loading, `logger.error()` for errors (respects Vite's log level config)
- **Unicode support**: Ensure terminal encoding is UTF-8 for box-drawing characters to display correctly
- **Multi-line formatting**: Use `\n` for line breaks, align text within boxes using spaces
- **Error truncation**: Limit stack traces to 5-10 lines to avoid console spam
- **Color reset**: Always reset colors after colored text to prevent bleeding into subsequent output
- **CI/CD compatibility**: Colors may not work in CI logs; provide `--no-color` option (read from Vite config)
- **Timing accuracy**: Use `performance.now()` for sub-millisecond precision
- **Error suggestions**: Use pattern matching on error messages to provide relevant help (e.g., "ENOENT" → file not found)
- **Internationalization**: Banner text in English; structure allows for i18n in future

**Expected Outputs:**

1. **src/logging/startup-banner.ts**:
```typescript
import type { Logger } from 'vite';

// ANSI color codes
export const GREEN = '\x1b[32m';
export const RED = '\x1b[31m';
export const CYAN = '\x1b[36m';
export const YELLOW = '\x1b[33m';
export const RESET = '\x1b[0m';
export const DIM = '\x1b[2m';
export const BOLD = '\x1b[1m';

// Unicode box-drawing characters
const BOX_TOP_LEFT = '┌';
const BOX_TOP_RIGHT = '┐';
const BOX_BOTTOM_LEFT = '└';
const BOX_BOTTOM_RIGHT = '┘';
const BOX_HORIZONTAL = '─';
const BOX_VERTICAL = '│';

/**
 * Check if terminal supports colors.
 */
function supportsColor(): boolean {
  return process.stdout.isTTY === true;
}

/**
 * Apply color if terminal supports it.
 */
function color(text: string, colorCode: string): string {
  return supportsColor() ? `${colorCode}${text}${RESET}` : text;
}

/**
 * Print loading banner during OpenAPI spec parsing.
 */
export function printLoadingBanner(specPath: string, logger: Logger): void {
  const banner = [
    '',
    color('⏳ Loading OpenAPI spec...', CYAN),
    color(`   ${DIM}${specPath}${RESET}`, CYAN),
    '',
  ].join('\n');

  logger.info(banner, { timestamp: true });
}

/**
 * Print success banner when mock server is ready.
 */
export function printSuccessBanner(
  port: number,
  endpointCount: number,
  specPath: string,
  startTime: number,
  logger: Logger
): void {
  const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  const url = `http://localhost:${port}`;

  const banner = [
    '',
    color(BOX_TOP_LEFT + BOX_HORIZONTAL.repeat(50) + BOX_TOP_RIGHT, GREEN),
    color(`${BOX_VERTICAL} ${BOLD}✓ Mock Server Ready!${RESET}${' '.repeat(28)}${color(BOX_VERTICAL, GREEN)}`, GREEN),
    color(BOX_VERTICAL + ' '.repeat(50) + BOX_VERTICAL, GREEN),
    color(`${BOX_VERTICAL}   URL:       ${url}${' '.repeat(50 - 14 - url.length)}${BOX_VERTICAL}`, GREEN),
    color(`${BOX_VERTICAL}   Endpoints: ${endpointCount} operations${' '.repeat(50 - 14 - `${endpointCount} operations`.length)}${BOX_VERTICAL}`, GREEN),
    color(`${BOX_VERTICAL}   Spec:      ${specPath}${' '.repeat(50 - 14 - specPath.length)}${BOX_VERTICAL}`, GREEN),
    color(`${BOX_VERTICAL}   Ready in:  ${duration}s${' '.repeat(50 - 14 - `${duration}s`.length)}${BOX_VERTICAL}`, GREEN),
    color(BOX_BOTTOM_LEFT + BOX_HORIZONTAL.repeat(50) + BOX_BOTTOM_RIGHT, GREEN),
    '',
  ].join('\n');

  logger.info(banner, { timestamp: true });
}

/**
 * Print error banner when mock server fails to start.
 */
export function printErrorBanner(
  error: Error,
  specPath: string,
  logger: Logger
): void {
  // Provide helpful suggestions based on error type
  let suggestion = 'Check the error message above for details.';
  if (error.message.includes('ENOENT')) {
    suggestion = 'File not found. Check the path to your OpenAPI spec.';
  } else if (error.message.includes('YAML') || error.message.includes('parse')) {
    suggestion = 'YAML/JSON parse error. Validate your spec with a linter.';
  } else if (error.message.includes('Invalid OpenAPI')) {
    suggestion = 'Invalid OpenAPI spec. Ensure it follows OpenAPI 3.0/3.1 format.';
  }

  const banner = [
    '',
    color(BOX_TOP_LEFT + BOX_HORIZONTAL.repeat(60) + BOX_TOP_RIGHT, RED),
    color(`${BOX_VERTICAL} ${BOLD}✗ Failed to start mock server${RESET}${' '.repeat(29)}${color(BOX_VERTICAL, RED)}`, RED),
    color(BOX_VERTICAL + ' '.repeat(60) + BOX_VERTICAL, RED),
    color(`${BOX_VERTICAL}   Spec: ${specPath}${' '.repeat(60 - 9 - specPath.length)}${BOX_VERTICAL}`, RED),
    color(`${BOX_VERTICAL}   Error: ${error.message}${' '.repeat(60 - 10 - error.message.length)}${BOX_VERTICAL}`, RED),
    color(BOX_VERTICAL + ' '.repeat(60) + BOX_VERTICAL, RED),
    color(`${BOX_VERTICAL}   ${DIM}${suggestion}${RESET}${' '.repeat(60 - 3 - suggestion.length)}${color(BOX_VERTICAL, RED)}`, RED),
    color(BOX_BOTTOM_LEFT + BOX_HORIZONTAL.repeat(60) + BOX_BOTTOM_RIGHT, RED),
    '',
  ].join('\n');

  logger.error(banner, { timestamp: true });
}
```

2. **Usage in plugin.ts** (buildStart hook):
```typescript
import { printLoadingBanner, printSuccessBanner, printErrorBanner } from './logging/startup-banner';

// In buildStart() hook:
async buildStart() {
  const startTime = performance.now();
  
  printLoadingBanner(pluginOptions.openApiPath, resolvedConfig.logger);
  
  try {
    // Parse spec, spawn process, wait for ready message
    // ... (Phase 4 implementation)
    
    // When ready message received:
    printSuccessBanner(
      mockServerPort,
      endpointCount,
      pluginOptions.openApiPath,
      startTime,
      resolvedConfig.logger
    );
  } catch (error) {
    printErrorBanner(
      error as Error,
      pluginOptions.openApiPath,
      resolvedConfig.logger
    );
    throw error;
  }
}
```

3. **Console output** (success case):
```
⏳ Loading OpenAPI spec...
   ./src/apis/petstore/petstore.openapi.yaml

┌──────────────────────────────────────────────────┐
│ ✓ Mock Server Ready!                             │
│                                                  │
│   URL:       http://localhost:3001              │
│   Endpoints: 19 operations                      │
│   Spec:      ./src/apis/petstore/petstore.op... │
│   Ready in:  1.23s                              │
└──────────────────────────────────────────────────┘
```

4. **Console output** (error case):
```
⏳ Loading OpenAPI spec...
   ./missing.yaml

┌────────────────────────────────────────────────────────────┐
│ ✗ Failed to start mock server                              │
│                                                            │
│   Spec: ./missing.yaml                                     │
│   Error: ENOENT: no such file or directory                │
│                                                            │
│   File not found. Check the path to your OpenAPI spec.    │
└────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria:**
- [ ] `src/logging/startup-banner.ts` created with banner functions
- [ ] ANSI color constants defined (GREEN, RED, CYAN, YELLOW, RESET, DIM, BOLD)
- [ ] Unicode box-drawing constants defined (┌─┐│└─┘)
- [ ] `supportsColor()` function checks `process.stdout.isTTY` for color support
- [ ] `color()` helper function applies colors conditionally
- [ ] `printLoadingBanner()` implemented with cyan loading icon and spec path
- [ ] `printSuccessBanner()` implemented with green checkmark and box border
- [ ] Success banner displays: URL, endpoint count, spec path, startup time
- [ ] `printErrorBanner()` implemented with red cross and box border
- [ ] Error banner displays: spec path, error message, helpful suggestion
- [ ] Error suggestions provided for common errors (ENOENT, YAML parse, invalid spec)
- [ ] Timing tracked with `performance.now()` for accurate duration
- [ ] All banner functions accept Vite logger parameter
- [ ] Banners use `logger.info()` or `logger.error()` for output
- [ ] Loading banner called in plugin buildStart() hook
- [ ] Success banner called when ready IPC message received
- [ ] Error banner called when error IPC message received or parsing fails
- [ ] Startup time calculated between loading and success banners
- [ ] Colors display correctly in terminal (green for success, red for errors, cyan for info)
- [ ] Box borders render correctly with Unicode characters
- [ ] Text alignment within boxes is correct (no overlapping or wrapping)
- [ ] Banners work without colors in CI/CD environments (fallback to plain text)
- [ ] Multi-line text formatted correctly with `\n` breaks
- [ ] Color codes reset after colored text (prevents bleeding)
- [ ] Tested with Petstore spec (success case)
- [ ] Tested with missing spec file (error case with "File not found" suggestion)
- [ ] Tested with invalid YAML (error case with "Validate syntax" suggestion)
- [ ] Tested in terminal with color support (verified colors display)
- [ ] Tested in CI environment without TTY (verified plain text fallback)
- [ ] TypeScript compiles without errors
- [ ] Committed with message: `feat(logging): implement colorful startup and error banners`

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

**Description:** Implement the handler file loading system that scans a directory for custom handler files (`.handler.ts` pattern), dynamically imports them as ESM modules, validates their default export signature matches `HandlerCodeGenerator`, and builds a map of operationId → handler function. Handlers allow developers to override default mock responses with custom logic. The loader must be resilient (continue on individual file errors) and provide detailed validation errors.

**Context:**
- **Handler files**: TypeScript files with `.handler.ts` suffix (e.g., `add-pet.handler.ts`)
- **Naming convention**: Filename (before `.handler.ts`) should match operationId in kebab-case for clarity, but operationId comes from file content
- **Default export**: Each handler file must export a default async function matching `HandlerCodeGenerator` signature
- **Dynamic import**: Use ESM `import()` to load handler files at runtime (enables hot reload in Phase 5)
- **Validation**: Check function signature, parameter count, return type (HandlerResponse | null)
- **Resilience**: If one handler file fails to load/validate, log error and continue with others
- **Context provision**: Handlers receive `HandlerContext` with request data, registry, logger, security info

**Implementation Approach:**
1. Create `src/loaders/handler-loader.ts` module
2. Implement `loadHandlers(handlersDir, registry, logger)` function
3. Scan `handlersDir` for files matching `*.handler.{ts,js,mts,mjs}` pattern using glob
4. For each file, use dynamic `import(filePath)` to load ESM module
5. Validate default export exists and is a function
6. Validate function signature matches `HandlerCodeGenerator` (async, accepts context, returns Promise)
7. Extract operationId from file content or metadata (handlers self-identify their operationId)
8. Map operationId → handler function in a Map structure
9. Cross-reference operationIds with registry to warn about handlers for non-existent operations
10. Return `Map<string, HandlerCodeGenerator>` for use in mock server

**Estimate:** M (3 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P2-01.1 | Create loaders/handler-loader.ts | Create module at `src/loaders/handler-loader.ts`. Export `loadHandlers()` function. Import types: `HandlerCodeGenerator`, `OpenApiEndpointRegistry`, `Logger`. Set up error handling wrapper. |
| P2-01.2 | Implement directory scanning | Use `fast-glob` package to scan `handlersDir` for `*.handler.{ts,js,mts,mjs}` files. Handle missing directory gracefully (return empty map with warning). Support recursive subdirectories. Log found file count if verbose. |
| P2-01.3 | Implement dynamic import | For each file path, use `await import(filePath)` to load ESM module. Handle import errors (syntax errors, missing files). Wrap in try-catch per file to continue on failure. Log import errors with file path. |
| P2-01.4 | Validate default export | Check `module.default` exists and is a function (`typeof module.default === 'function'`). Throw validation error if missing or wrong type. Include filename in error message. Check function is async (returns Promise). |
| P2-01.5 | Extract operationId from handler | Use filename as operationId hint (convert kebab-case to camelCase). Alternatively, expect handler to declare operationId in JSDoc comment or via exported constant. For now, derive from filename: `add-pet.handler.ts` → `addPet`. |
| P2-01.6 | Build handler map | Create `Map<string, HandlerCodeGenerator>` to store operationId → handler function mappings. Add each valid handler to map. Warn on duplicate operationIds (later handler overwrites earlier). |
| P2-01.7 | Cross-reference with registry | Compare handler operationIds with `registry.endpoints.keys()`. Log warnings for handlers that don't match any endpoint in OpenAPI spec. Log info for endpoints that have handlers (useful for debugging). |
| P2-01.8 | Add error handling | Wrap file loading in try-catch per file. Collect errors in array. Continue loading other files on individual failures. At end, log summary: "Loaded X handlers, Y errors". Don't throw on partial failures. |
| P2-01.9 | Add unit tests | Create `loaders/__tests__/handler-loader.test.ts`. Test: empty directory, valid handlers, invalid exports, syntax errors, missing files, duplicate operationIds. Mock filesystem with test fixtures. Verify error resilience. |

**Technical Considerations:**
- **ESM dynamic import**: `import()` returns Promise, requires `await`, works with relative and absolute paths
- **File extensions**: Support both `.ts` (source) and `.js/.mjs` (compiled) for flexibility
- **Path resolution**: Convert relative paths to absolute using `path.resolve()` before import
- **URL format**: Node.js ESM requires `file://` URL protocol on some systems; use `pathToFileURL()` from `node:url`
- **Hot reload**: Store file paths alongside handlers to enable re-import on file change (Phase 5)
- **Validation depth**: Don't validate handler implementation (runtime errors handled by mock server), only signature
- **OperationId casing**: OpenAPI operationIds are camelCase; filenames are kebab-case; convert consistently
- **Glob patterns**: `**/*.handler.{ts,js}` matches recursively; `*.handler.ts` matches only top-level
- **Error types**: Distinguish between import errors (syntax), validation errors (wrong export), and registry mismatches (warning)
- **Performance**: Dynamic imports are async and cached by Node.js; subsequent imports of same module are instant

**Expected Outputs:**

1. **src/loaders/handler-loader.ts**:
```typescript
import { glob } from 'fast-glob';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import type { Logger } from 'vite';
import type { HandlerCodeGenerator } from '../types/handlers';
import type { OpenApiEndpointRegistry } from '../types/registry';

/**
 * Load custom handler files from a directory.
 * 
 * Scans for `*.handler.{ts,js,mts,mjs}` files, validates exports,
 * and returns a map of operationId → handler function.
 * 
 * @param handlersDir - Directory containing handler files
 * @param registry - OpenAPI endpoint registry (for validation)
 * @param logger - Vite logger
 * @returns Map of operationId to handler function
 */
export async function loadHandlers(
  handlersDir: string,
  registry: OpenApiEndpointRegistry,
  logger: Logger
): Promise<Map<string, HandlerCodeGenerator>> {
  const handlers = new Map<string, HandlerCodeGenerator>();
  const errors: string[] = [];

  try {
    // Scan for handler files
    const files = await glob('**/*.handler.{ts,js,mts,mjs}', {
      cwd: handlersDir,
      absolute: true,
    });

    if (files.length === 0) {
      logger.warn(`[handler-loader] No handler files found in ${handlersDir}`);
      return handlers;
    }

    logger.info(`[handler-loader] Found ${files.length} handler file(s)`);

    // Load each handler file
    for (const filePath of files) {
      try {
        // Dynamic import (ESM)
        const fileUrl = pathToFileURL(filePath).href;
        const module = await import(fileUrl);

        // Validate default export
        if (!module.default || typeof module.default !== 'function') {
          throw new Error(
            `Handler file must export a default async function: ${filePath}`
          );
        }

        // Extract operationId from filename
        const filename = path.basename(filePath, path.extname(filePath));
        const operationId = kebabToCamelCase(filename.replace('.handler', ''));

        // Add to map
        if (handlers.has(operationId)) {
          logger.warn(
            `[handler-loader] Duplicate handler for ${operationId}, overwriting`
          );
        }

        handlers.set(operationId, module.default as HandlerCodeGenerator);
        logger.info(`[handler-loader] Loaded handler: ${operationId}`);
      } catch (error) {
        const err = error as Error;
        errors.push(`${filePath}: ${err.message}`);
        logger.error(`[handler-loader] Failed to load ${filePath}: ${err.message}`);
      }
    }

    // Cross-reference with registry
    for (const [operationId, handler] of handlers) {
      if (!registry.endpoints.has(operationId)) {
        logger.warn(
          `[handler-loader] Handler "${operationId}" does not match any endpoint in OpenAPI spec`
        );
      }
    }

    // Log summary
    const successCount = handlers.size;
    const errorCount = errors.length;
    logger.info(
      `[handler-loader] Loaded ${successCount} handler(s), ${errorCount} error(s)`
    );

    return handlers;
  } catch (error) {
    const err = error as Error;
    logger.error(`[handler-loader] Fatal error: ${err.message}`);
    return handlers;
  }
}

/**
 * Convert kebab-case to camelCase.
 * Example: "add-pet" → "addPet"
 */
function kebabToCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
```

2. **Usage in mock server runner**:
```typescript
// In openapi-server-runner.mts
import { loadHandlers } from '../loaders/handler-loader';

const handlersDir = process.env.HANDLERS_DIR || './handlers';
const handlers = await loadHandlers(handlersDir, registry, logger);

// Pass handlers to Scalar mock server (Phase 3 integration)
```

**Acceptance Criteria:**
- [ ] `src/loaders/handler-loader.ts` created
- [ ] `loadHandlers()` function exported with correct signature
- [ ] Function accepts `handlersDir` (string), `registry` (OpenApiEndpointRegistry), `logger` (Logger)
- [ ] Function returns `Promise<Map<string, HandlerCodeGenerator>>`
- [ ] Directory scanned using `fast-glob` with pattern `**/*.handler.{ts,js,mts,mjs}`
- [ ] Missing directory handled gracefully (returns empty map with warning)
- [ ] Empty directory handled gracefully (returns empty map with warning)
- [ ] Each file imported using `await import(fileUrl)` with `pathToFileURL()` conversion
- [ ] Import errors caught per file (syntax errors, missing files)
- [ ] Default export validated (exists and is a function)
- [ ] Validation errors logged with filename
- [ ] OperationId extracted from filename (kebab-case → camelCase conversion)
- [ ] Filename pattern: `<operationId>.handler.ts` → operationId
- [ ] Duplicate operationIds logged as warnings (later handler overwrites)
- [ ] Handler map built: `Map<string, HandlerCodeGenerator>`
- [ ] Cross-reference check: handlers without matching endpoints → warning logged
- [ ] Error handling: individual file failures don't stop loader
- [ ] Errors collected in array and logged at end
- [ ] Summary logged: "Loaded X handlers, Y errors"
- [ ] `kebabToCamelCase()` utility function implemented
- [ ] Unit tests created in `loaders/__tests__/handler-loader.test.ts`
- [ ] Tests cover: empty directory, valid handlers, invalid exports, syntax errors, duplicates
- [ ] Tests use filesystem mocks (e.g., `memfs` or fixture files)
- [ ] `fast-glob` package added to dependencies
- [ ] TypeScript compiles without errors
- [ ] Committed with message: `feat(loaders): implement handler file loader with validation`

---

#### P2-02: Implement Seed Loader (FR-004)

**Description:** Implement the seed data loader that scans a directory for seed generator files (`.seed.ts` pattern), dynamically imports them as ESM modules, validates their default export signature matches `SeedCodeGenerator`, and builds a map of schemaName → seed function. Seeds provide pre-populated data for schemas (e.g., sample pets, users). The loader must validate exports, handle errors gracefully, and cross-reference schema names with OpenAPI components.

**Context:**
- **Seed files**: TypeScript files with `.seed.ts` suffix (e.g., `pets.seed.ts`)
- **Naming convention**: Filename maps to schema name (singular or plural, e.g., `pets.seed.ts` → `Pet` schema)
- **Default export**: Each seed file exports a default async function matching `SeedCodeGenerator` signature
- **Faker integration**: Seed functions receive `faker` instance in context for realistic data generation
- **Dynamic import**: ESM `import()` enables hot reload (Phase 5)
- **Schema validation**: Cross-reference seed schema names with `components.schemas` in OpenAPI spec
- **Return type**: Seed functions return array of objects matching schema shape

**Implementation Approach:**
1. Create `src/loaders/seed-loader.ts` module (mirror structure of handler-loader)
2. Implement `loadSeeds(seedsDir, registry, logger)` function
3. Scan `seedsDir` for `*.seed.{ts,js,mts,mjs}` files
4. For each file, use dynamic `import()` to load module
5. Validate default export is async function matching `SeedCodeGenerator`
6. Extract schema name from filename (e.g., `pets.seed.ts` → `Pet`)
7. Map schemaName → seed function in Map structure
8. Cross-reference schema names with `registry.schemas` to warn about seeds for non-existent schemas
9. Return `Map<string, SeedCodeGenerator>` for mock server initialization

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P2-02.1 | Create loaders/seed-loader.ts | Create module at `src/loaders/seed-loader.ts`. Export `loadSeeds()` function. Import types: `SeedCodeGenerator`, `OpenApiEndpointRegistry`, `Logger`. Mirror handler-loader structure. |
| P2-02.2 | Implement directory scanning | Use `fast-glob` to scan `seedsDir` for `*.seed.{ts,js,mts,mjs}` files. Handle missing/empty directory gracefully (return empty map). Support recursive subdirectories. Log found file count if verbose. |
| P2-02.3 | Implement dynamic import | For each file, use `await import(pathToFileURL(filePath).href)` to load ESM module. Catch import errors per file. Continue on failure. Log import errors with filename. |
| P2-02.4 | Validate default export | Check `module.default` exists and is a function. Throw validation error if missing or wrong type. Check function is async (returns Promise). Include filename in error messages. |
| P2-02.5 | Extract schema name from filename | Use filename as schema name hint. Convert to PascalCase (e.g., `pets.seed.ts` → `Pet` or `Pets`). Allow plural forms (try both singular and plural against registry). Store mapping. |
| P2-02.6 | Build seed map | Create `Map<string, SeedCodeGenerator>` to store schemaName → seed function. Add each valid seed to map. Warn on duplicate schema names (later seed overwrites). |
| P2-02.7 | Cross-reference with registry | Compare seed schema names with `registry.schemas.keys()`. Warn for seeds that don't match any schema in OpenAPI spec. Log info for schemas that have seed data. |
| P2-02.8 | Add error handling | Wrap file loading in try-catch per file. Collect errors. Continue loading other files on individual failures. Log summary at end: "Loaded X seeds, Y errors". |
| P2-02.9 | Add unit tests | Create `loaders/__tests__/seed-loader.test.ts`. Test: empty directory, valid seeds, invalid exports, syntax errors, missing schemas, duplicates. Mock filesystem. Verify error resilience. |

**Technical Considerations:**
- **Schema name resolution**: OpenAPI schemas are PascalCase; filenames are lowercase; conversion logic must handle plurals
- **Faker availability**: `@faker-js/faker` is peer dependency; loader should handle case where it's not installed
- **Seed data size**: Large seed arrays (thousands of objects) may slow startup; consider lazy loading
- **Deterministic data**: Use seeded faker (`faker.seed(42)`) for reproducible results across runs
- **Schema validation**: Don't validate seed data against schema at load time (expensive); validate at runtime if needed
- **Singular/plural**: `pets.seed.ts` could map to `Pet` or `Pets` schema; try both, warn if neither exists
- **File extensions**: Same as handlers (`.ts`, `.js`, `.mts`, `.mjs`)
- **Error resilience**: Individual seed failures shouldn't break entire loader

**Expected Outputs:**

1. **src/loaders/seed-loader.ts**:
```typescript
import { glob } from 'fast-glob';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import type { Logger } from 'vite';
import type { SeedCodeGenerator } from '../types/seeds';
import type { OpenApiEndpointRegistry } from '../types/registry';

/**
 * Load seed data generator files from a directory.
 * 
 * Scans for `*.seed.{ts,js,mts,mjs}` files, validates exports,
 * and returns a map of schemaName → seed function.
 * 
 * @param seedsDir - Directory containing seed files
 * @param registry - OpenAPI endpoint registry (for schema validation)
 * @param logger - Vite logger
 * @returns Map of schema name to seed generator function
 */
export async function loadSeeds(
  seedsDir: string,
  registry: OpenApiEndpointRegistry,
  logger: Logger
): Promise<Map<string, SeedCodeGenerator>> {
  const seeds = new Map<string, SeedCodeGenerator>();
  const errors: string[] = [];

  try {
    // Scan for seed files
    const files = await glob('**/*.seed.{ts,js,mts,mjs}', {
      cwd: seedsDir,
      absolute: true,
    });

    if (files.length === 0) {
      logger.warn(`[seed-loader] No seed files found in ${seedsDir}`);
      return seeds;
    }

    logger.info(`[seed-loader] Found ${files.length} seed file(s)`);

    // Load each seed file
    for (const filePath of files) {
      try {
        // Dynamic import (ESM)
        const fileUrl = pathToFileURL(filePath).href;
        const module = await import(fileUrl);

        // Validate default export
        if (!module.default || typeof module.default !== 'function') {
          throw new Error(
            `Seed file must export a default async function: ${filePath}`
          );
        }

        // Extract schema name from filename
        const filename = path.basename(filePath, path.extname(filePath));
        const baseSchemaName = filename.replace('.seed', '');
        
        // Try to match with registry schemas (handle singular/plural)
        const schemaName = findMatchingSchema(baseSchemaName, registry);

        if (!schemaName) {
          logger.warn(
            `[seed-loader] Seed "${baseSchemaName}" does not match any schema in OpenAPI spec`
          );
        }

        const finalSchemaName = schemaName || capitalize(baseSchemaName);

        // Add to map
        if (seeds.has(finalSchemaName)) {
          logger.warn(
            `[seed-loader] Duplicate seed for ${finalSchemaName}, overwriting`
          );
        }

        seeds.set(finalSchemaName, module.default as SeedCodeGenerator);
        logger.info(`[seed-loader] Loaded seed: ${finalSchemaName}`);
      } catch (error) {
        const err = error as Error;
        errors.push(`${filePath}: ${err.message}`);
        logger.error(`[seed-loader] Failed to load ${filePath}: ${err.message}`);
      }
    }

    // Log summary
    const successCount = seeds.size;
    const errorCount = errors.length;
    logger.info(
      `[seed-loader] Loaded ${successCount} seed(s), ${errorCount} error(s)`
    );

    return seeds;
  } catch (error) {
    const err = error as Error;
    logger.error(`[seed-loader] Fatal error: ${err.message}`);
    return seeds;
  }
}

/**
 * Find matching schema name in registry.
 * Tries exact match, singular, and plural forms.
 */
function findMatchingSchema(
  baseName: string,
  registry: OpenApiEndpointRegistry
): string | null {
  const candidates = [
    capitalize(baseName),              // pets → Pets
    capitalize(singularize(baseName)), // pets → Pet
    baseName,                          // pets
    singularize(baseName),             // pet
  ];

  for (const candidate of candidates) {
    if (registry.schemas.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Capitalize first letter.
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Simple singularization (remove trailing 's').
 * Can be enhanced with pluralize library if needed.
 */
function singularize(str: string): string {
  return str.endsWith('s') ? str.slice(0, -1) : str;
}
```

2. **Example seed file** (`pets.seed.ts`):
```typescript
import type { SeedContext, SeedData } from '@websublime/vite-plugin-open-api-server';

export default async function generatePets(context: SeedContext): Promise<SeedData> {
  const { faker } = context;
  
  return Array.from({ length: 10 }, (_, id) => ({
    id: id + 1,
    name: faker.animal.dog(),
    status: faker.helpers.arrayElement(['available', 'pending', 'sold']),
    category: {
      id: faker.number.int({ min: 1, max: 5 }),
      name: faker.animal.type(),
    },
  }));
}
```

**Acceptance Criteria:**
- [ ] `src/loaders/seed-loader.ts` created
- [ ] `loadSeeds()` function exported with correct signature
- [ ] Function accepts `seedsDir` (string), `registry` (OpenApiEndpointRegistry), `logger` (Logger)
- [ ] Function returns `Promise<Map<string, SeedCodeGenerator>>`
- [ ] Directory scanned with `fast-glob` pattern `**/*.seed.{ts,js,mts,mjs}`
- [ ] Missing/empty directory handled gracefully (returns empty map with warning)
- [ ] Each file imported using `await import(fileUrl)` with `pathToFileURL()`
- [ ] Import errors caught per file (doesn't break entire loader)
- [ ] Default export validated (exists and is function)
- [ ] Schema name extracted from filename (e.g., `pets.seed.ts` → `Pet`)
- [ ] Schema name resolution tries singular and plural forms
- [ ] `findMatchingSchema()` helper checks multiple candidates against registry
- [ ] Unmatched schemas logged as warnings (non-blocking)
- [ ] Duplicate schema names logged as warnings (later seed overwrites)
- [ ] Seed map built: `Map<string, SeedCodeGenerator>`
- [ ] Cross-reference check: seeds without matching schemas → warning
- [ ] Error handling: individual file failures don't stop loader
- [ ] Errors collected and logged at end
- [ ] Summary logged: "Loaded X seeds, Y errors"
- [ ] Helper functions: `findMatchingSchema()`, `capitalize()`, `singularize()`
- [ ] Unit tests created in `loaders/__tests__/seed-loader.test.ts`
- [ ] Tests cover: empty directory, valid seeds, invalid exports, schema mismatches, duplicates
- [ ] TypeScript compiles without errors
- [ ] Committed with message: `feat(loaders): implement seed file loader with schema validation`

---

#### P2-03: Implement Document Enhancer (FR-005)

**Description:** Implement the OpenAPI document enhancer that clones the parsed spec, injects `x-handler` extensions into operations that have custom handlers, injects `x-seed` extensions into schemas that have seed data, and logs each injection for visibility. The enhanced document is passed to Scalar mock server, which uses the extensions to call custom handlers and pre-populate data. Enhancement happens after loading handlers/seeds and before starting the mock server.

**Context:**
- **Document cloning**: Deep clone OpenAPI spec object to preserve original (needed for hot reload)
- **x-handler extension**: Custom OpenAPI extension added to operation objects (under `paths[path][method]`)
- **x-seed extension**: Custom OpenAPI extension added to schema objects (under `components.schemas[name]`)
- **Extension format**: `x-handler: "javascript:functionName"` or inline function reference
- **Scalar integration**: Scalar mock server reads `x-handler` to call custom logic instead of generating mock response
- **Preservation logic**: Check for existing `x-handler`/`x-seed` in spec; external files override with warning (FR-013)
- **Validation**: Cross-reference handler operationIds and seed schema names with spec (warn on mismatches)

**Implementation Approach:**
1. Create `src/enhancer/document-enhancer.ts` module
2. Implement `enhanceDocument(spec, handlers, seeds, logger)` function
3. Deep clone spec object using `structuredClone()` or JSON.parse(JSON.stringify())
4. Iterate through `handlers` map and find matching operations by operationId
5. For each match, inject `x-handler: handlerFunction` (or reference) into operation object
6. Iterate through `seeds` map and find matching schemas by name
7. For each match, inject `x-seed: seedFunction` (or reference) into schema object
8. Log each injection: "Injected x-handler into POST /pet (addPet)"
9. Warn when overriding existing extensions
10. Return enhanced spec for use in mock server

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P2-03.1 | Create enhancer/document-enhancer.ts | Create module at `src/enhancer/document-enhancer.ts`. Export `enhanceDocument()` function. Import OpenAPI types, handler/seed maps, logger. |
| P2-03.2 | Implement document cloning | Deep clone OpenAPI spec using `structuredClone()` (Node 17+) or `JSON.parse(JSON.stringify(spec))`. Preserve all properties. Test that original spec is unmodified after enhancement. |
| P2-03.3 | Implement findOperationById() helper | Create helper function that searches `spec.paths` for operation with given operationId. Return `{ path, method, operation }` tuple. Handle missing operations gracefully. |
| P2-03.4 | Implement x-handler injection | For each handler in map, find matching operation using `findOperationById()`. If found, set `operation['x-handler'] = handlerRef`. Log injection with path, method, operationId. Skip if operation not found (warning logged by loader). |
| P2-03.5 | Implement x-seed injection | For each seed in map, find matching schema in `spec.components.schemas[schemaName]`. If found, set `schema['x-seed'] = seedRef`. Log injection with schema name. Skip if schema not found (warning logged by loader). |
| P2-03.6 | Implement preservation checks | Before injecting, check if `operation['x-handler']` or `schema['x-seed']` already exists in original spec. If exists, log warning: "Overriding existing x-handler for addPet". Then inject (external file takes precedence). |
| P2-03.7 | Add injection logging | Log each successful injection at info level: "[enhancer] Injected x-handler into POST /pet (addPet)". Log skipped injections at debug level. Log overrides at warn level. |
| P2-03.8 | Return enhanced document | Return cloned and enhanced spec object. Ensure type is `OpenAPIV3_1.Document`. Verify all injections are present in returned spec. Original spec remains unmodified. |
| P2-03.9 | Add unit tests | Create `enhancer/__tests__/document-enhancer.test.ts`. Test: handler injection, seed injection, preservation (overrides), missing operations/schemas, empty handlers/seeds. Mock spec and handler/seed maps. |

**Technical Considerations:**
- **Deep cloning**: `structuredClone()` handles complex objects but not functions; if storing function references, use custom clone
- **Extension format**: Scalar expects string references or function objects; decide on format (likely function object for runtime)
- **Operation lookup**: Iterating `paths` is O(n); for large specs, consider building operationId index first
- **Reference vs inline**: For `x-handler`, store function reference directly (not string) for efficient runtime calls
- **Immutability**: Original spec must remain unmodified for hot reload (re-enhance from original on change)
- **Type safety**: Use `OpenAPIV3_1.Document` type to ensure enhanced spec is valid
- **Scalar compatibility**: Verify Scalar mock server actually reads `x-handler` extension (may need custom integration)
- **Performance**: Cloning large specs (100+ endpoints) may take 10-50ms; acceptable for startup

**Expected Outputs:**

1. **src/enhancer/document-enhancer.ts**:
```typescript
import type { OpenAPIV3_1 } from 'openapi-types';
import type { Logger } from 'vite';
import type { HandlerCodeGenerator } from '../types/handlers';
import type { SeedCodeGenerator } from '../types/seeds';

/**
 * Enhance OpenAPI document with x-handler and x-seed extensions.
 * 
 * @param spec - Parsed OpenAPI specification
 * @param handlers - Map of operationId to handler function
 * @param seeds - Map of schema name to seed function
 * @param logger - Vite logger
 * @returns Enhanced OpenAPI document (clone of original)
 */
export function enhanceDocument(
  spec: OpenAPIV3_1.Document,
  handlers: Map<string, HandlerCodeGenerator>,
  seeds: Map<string, SeedCodeGenerator>,
  logger: Logger
): OpenAPIV3_1.Document {
  // Deep clone spec to preserve original
  const enhanced = structuredClone(spec);

  let handlerCount = 0;
  let seedCount = 0;

  // Inject x-handler extensions
  for (const [operationId, handlerFn] of handlers) {
    const operationInfo = findOperationById(enhanced, operationId);

    if (!operationInfo) {
      // Warning already logged by handler-loader
      continue;
    }

    const { path, method, operation } = operationInfo;

    // Check for existing x-handler (preservation logic)
    if ('x-handler' in operation) {
      logger.warn(
        `[enhancer] Overriding existing x-handler for ${operationId}`
      );
    }

    // Inject handler reference
    (operation as any)['x-handler'] = handlerFn;
    handlerCount++;

    logger.info(
      `[enhancer] Injected x-handler into ${method.toUpperCase()} ${path} (${operationId})`
    );
  }

  // Inject x-seed extensions
  if (enhanced.components?.schemas) {
    for (const [schemaName, seedFn] of seeds) {
      const schema = enhanced.components.schemas[schemaName];

      if (!schema) {
        // Warning already logged by seed-loader
        continue;
      }

      // Check for existing x-seed
      if ('x-seed' in schema) {
        logger.warn(
          `[enhancer] Overriding existing x-seed for ${schemaName}`
        );
      }

      // Inject seed reference
      (schema as any)['x-seed'] = seedFn;
      seedCount++;

      logger.info(`[enhancer] Injected x-seed into schema ${schemaName}`);
    }
  }

  logger.info(
    `[enhancer] Enhanced document: ${handlerCount} handler(s), ${seedCount} seed(s)`
  );

  return enhanced;
}

/**
 * Find operation by operationId in OpenAPI paths.
 * 
 * @returns Operation info or null if not found
 */
function findOperationById(
  spec: OpenAPIV3_1.Document,
  operationId: string
): { path: string; method: string; operation: OpenAPIV3_1.OperationObject } | null {
  if (!spec.paths) return null;

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem) continue;

    for (const method of ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const) {
      const operation = pathItem[method] as OpenAPIV3_1.OperationObject | undefined;

      if (operation?.operationId === operationId) {
        return { path, method, operation };
      }
    }
  }

  return null;
}
```

2. **Usage in mock server runner**:
```typescript
// After loading handlers and seeds
const enhancedSpec = enhanceDocument(spec, handlers, seeds, logger);

// Pass enhanced spec to Scalar
const app = createMockServer({ specification: enhancedSpec });
```

**Acceptance Criteria:**
- [ ] `src/enhancer/document-enhancer.ts` created
- [ ] `enhanceDocument()` function exported with correct signature
- [ ] Function accepts `spec` (OpenAPIV3_1.Document), `handlers` (Map), `seeds` (Map), `logger` (Logger)
- [ ] Function returns enhanced `OpenAPIV3_1.Document`
- [ ] Document deep cloned using `structuredClone()` or JSON parse/stringify
- [ ] Original spec object remains unmodified after enhancement
- [ ] `findOperationById()` helper implemented
- [ ] Helper searches all paths and methods for matching operationId
- [ ] Helper returns `{ path, method, operation }` tuple or null
- [ ] Handler injection: iterate handlers map, find operations, inject `x-handler`
- [ ] Seed injection: iterate seeds map, find schemas, inject `x-seed`
- [ ] `x-handler` injected into operation object at correct location
- [ ] `x-seed` injected into schema object at correct location
- [ ] Preservation check: warn if existing `x-handler`/`x-seed` found
- [ ] Override behavior: external file overwrites inline extension
- [ ] Injection logging: each injection logged with path/method/operationId or schema name
- [ ] Summary logged: "Enhanced document: X handlers, Y seeds"
- [ ] Skipped injections (no match) logged at debug level
- [ ] Override warnings logged at warn level
- [ ] Handler count tracked and included in summary
- [ ] Seed count tracked and included in summary
- [ ] Enhanced spec has all `x-handler` extensions in correct operations
- [ ] Enhanced spec has all `x-seed` extensions in correct schemas
- [ ] Unit tests created in `enhancer/__tests__/document-enhancer.test.ts`
- [ ] Tests cover: handler injection, seed injection, overrides, missing ops/schemas, empty maps
- [ ] Tests verify original spec unmodified
- [ ] TypeScript compiles without errors
- [ ] Committed with message: `feat(enhancer): implement OpenAPI document enhancer with x-handler and x-seed injection`

---

#### P2-04: Implement Registry Builder (FR-006)

**Description:** Implement the endpoint registry builder that constructs a runtime-inspectable data structure from the enhanced OpenAPI document. The registry maps endpoint keys (e.g., "GET /pets") to operation metadata (method, path, operationId, parameters, responses, security), tracks which endpoints have custom handlers, stores schema definitions, and provides statistics for logging and debugging. The registry is used by handlers for context and by the plugin for displaying mock server state.

**Context:**
- **Registry purpose**: Provides fast lookup of endpoint metadata without parsing OpenAPI spec repeatedly
- **Endpoint key format**: `"METHOD /path"` (e.g., `"GET /pets"`, `"POST /pet"`)
- **Operation metadata**: Extracted from OpenAPI: method, path, operationId, parameters, requestBody, responses, security, tags
- **Handler tracking**: Registry marks which endpoints have `x-handler` extension (custom vs default mock)
- **Seed tracking**: Registry marks which schemas have `x-seed` extension (pre-populated vs empty)
- **Schema storage**: Copy of `components.schemas` for validation and seed generation
- **Security storage**: Copy of `components.securitySchemes` for authentication handling
- **Statistics**: Count total endpoints, endpoints with handlers, schemas with seeds

**Implementation Approach:**
1. Create `src/registry/registry-builder.ts` module
2. Implement `buildRegistry(spec, logger)` function that accepts enhanced OpenAPI spec
3. Initialize registry object with empty Maps for endpoints, schemas, securitySchemes
4. Iterate through `spec.paths` and extract all operations (GET, POST, etc.)
5. For each operation, create endpoint entry with metadata and handler flag
6. Store in `endpoints` Map with key format `"METHOD /path"`
7. Copy `spec.components.schemas` to `schemas` Map
8. Copy `spec.components.securitySchemes` to `securitySchemes` Map
9. Compute statistics (endpoint count, handler count, seed count)
10. Return `OpenApiEndpointRegistry` object

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P2-04.1 | Create registry/registry-builder.ts | Create module at `src/registry/registry-builder.ts`. Export `buildRegistry()` function. Import types: `OpenApiEndpointRegistry`, `OpenApiEndpointEntry`, `OpenAPIV3_1.Document`. |
| P2-04.2 | Implement registry initialization | Create empty registry object: `{ endpoints: new Map(), schemas: new Map(), securitySchemes: new Map() }`. Type as `OpenApiEndpointRegistry`. |
| P2-04.3 | Implement path iteration | Iterate `spec.paths` using `Object.entries()`. For each path, iterate HTTP methods (get, post, put, patch, delete, options, head). Extract operation object for each method. |
| P2-04.4 | Implement endpoint entry creation | For each operation, create `OpenApiEndpointEntry` object with: `method` (uppercase), `path`, `operationId`, `summary`, `description`, `parameters`, `requestBody`, `responses`, `security`, `tags`. |
| P2-04.5 | Implement endpoint key generation | Generate endpoint key: `"${method.toUpperCase()} ${path}"` (e.g., "GET /pets/{id}"). Use as Map key for fast lookup. Ensure uniqueness (one operation per method+path). |
| P2-04.6 | Implement handler flag detection | Check if operation has `x-handler` property (injected by enhancer). Set flag in endpoint entry or registry metadata. Used for statistics and debugging. |
| P2-04.7 | Implement schema copying | Copy `spec.components.schemas` to `registry.schemas` Map. Key is schema name (string), value is `OpenApiServerSchemaEntry` with name and schema object. |
| P2-04.8 | Implement security scheme copying | Copy `spec.components.securitySchemes` to `registry.securitySchemes` Map. Key is scheme name, value is `OpenApiSecuritySchemeEntry` with normalized scheme data. |
| P2-04.9 | Compute statistics | Count: total endpoints, endpoints with handlers, total schemas, schemas with seeds, security schemes. Log statistics: "Registry built: X endpoints (Y with handlers), Z schemas (W with seeds)". |
| P2-04.10 | Add unit tests | Create `registry/__tests__/registry-builder.test.ts`. Test: empty spec, spec with operations, endpoints with/without handlers, schemas with/without seeds. Verify Map structure and statistics. |

**Technical Considerations:**
- **Map vs object**: Use Map for O(1) lookup; keys are strings (endpoint keys, schema names)
- **Endpoint key uniqueness**: OpenAPI guarantees one operation per method+path combination
- **Path parameters**: Path like `/pets/{id}` stored as-is in registry; matching uses path-to-regexp at runtime
- **Method casing**: Normalize to uppercase (GET, POST) for consistency
- **Missing components**: Handle specs without `components.schemas` or `components.securitySchemes` gracefully
- **Large specs**: Registry building is O(n) where n = endpoint count; acceptable for 100s of endpoints
- **Memory usage**: Registry is in-memory; large specs (1000+ endpoints) use ~1-5 MB
- **Immutability**: Registry should be frozen or marked readonly after building (no runtime modifications)
- **Handler detection**: Check for `x-handler` property presence, not value (value is function reference)

**Expected Outputs:**

1. **src/registry/registry-builder.ts**:
```typescript
import type { OpenAPIV3_1 } from 'openapi-types';
import type { Logger } from 'vite';
import type {
  OpenApiEndpointRegistry,
  OpenApiEndpointEntry,
  OpenApiServerSchemaEntry,
  OpenApiSecuritySchemeEntry,
} from '../types/registry';

/**
 * Build endpoint registry from enhanced OpenAPI document.
 * 
 * @param spec - Enhanced OpenAPI spec (with x-handler/x-seed)
 * @param logger - Vite logger
 * @returns Endpoint registry with all operations and schemas
 */
export function buildRegistry(
  spec: OpenAPIV3_1.Document,
  logger: Logger
): OpenApiEndpointRegistry {
  const registry: OpenApiEndpointRegistry = {
    endpoints: new Map(),
    schemas: new Map(),
    securitySchemes: new Map(),
  };

  let handlerCount = 0;
  let seedCount = 0;

  // Extract endpoints from paths
  if (spec.paths) {
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      if (!pathItem) continue;

      for (const method of ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const) {
        const operation = pathItem[method] as OpenAPIV3_1.OperationObject | undefined;
        if (!operation) continue;

        // Create endpoint entry
        const entry: OpenApiEndpointEntry = {
          method: method.toUpperCase(),
          path,
          operationId: operation.operationId || `${method}_${path}`,
          summary: operation.summary,
          description: operation.description,
          parameters: (operation.parameters || []) as OpenAPIV3_1.ParameterObject[],
          requestBody: operation.requestBody as OpenAPIV3_1.RequestBodyObject | undefined,
          responses: operation.responses as Record<string, OpenAPIV3_1.ResponseObject>,
          security: operation.security,
          tags: operation.tags,
        };

        // Generate endpoint key
        const key = `${entry.method} ${path}`;
        registry.endpoints.set(key, entry);

        // Track handler presence
        if ('x-handler' in operation) {
          handlerCount++;
        }
      }
    }
  }

  // Copy schemas
  if (spec.components?.schemas) {
    for (const [name, schema] of Object.entries(spec.components.schemas)) {
      if (!schema) continue;

      registry.schemas.set(name, {
        name,
        schema: schema as OpenAPIV3_1.SchemaObject,
      });

      // Track seed presence
      if ('x-seed' in schema) {
        seedCount++;
      }
    }
  }

  // Copy security schemes
  if (spec.components?.securitySchemes) {
    for (const [name, scheme] of Object.entries(spec.components.securitySchemes)) {
      if (!scheme) continue;

      // Normalize security scheme (simplified for now)
      registry.securitySchemes.set(name, {
        name,
        type: (scheme as any).type,
        scheme: (scheme as any).scheme,
        bearerFormat: (scheme as any).bearerFormat,
        in: (scheme as any).in,
        flows: (scheme as any).flows,
      });
    }
  }

  // Log statistics
  logger.info(
    `[registry] Built registry: ${registry.endpoints.size} endpoint(s) (${handlerCount} with handlers), ` +
    `${registry.schemas.size} schema(s) (${seedCount} with seeds), ` +
    `${registry.securitySchemes.size} security scheme(s)`
  );

  return registry;
}
```

2. **Usage in mock server runner**:
```typescript
// After enhancing document
const registry = buildRegistry(enhancedSpec, logger);

// Registry is now available for handlers
const handlerContext: HandlerContext = {
  // ... request data ...
  registry, // Read-only access to endpoints, schemas, security
};
```

3. **Registry structure example**:
```typescript
{
  endpoints: Map {
    'GET /pets' => {
      method: 'GET',
      path: '/pets',
      operationId: 'listPets',
      parameters: [...],
      responses: { '200': {...} },
    },
    'POST /pet' => {
      method: 'POST',
      path: '/pet',
      operationId: 'addPet',
      requestBody: {...},
      responses: { '200': {...} },
    },
  },
  schemas: Map {
    'Pet' => {
      name: 'Pet',
      schema: { type: 'object', properties: {...} },
    },
  },
  securitySchemes: Map {
    'api_key' => {
      name: 'api_key',
      type: 'apiKey',
      in: 'header',
    },
  },
}
```

**Acceptance Criteria:**
- [ ] `src/registry/registry-builder.ts` created
- [ ] `buildRegistry()` function exported with correct signature
- [ ] Function accepts `spec` (OpenAPIV3_1.Document), `logger` (Logger)
- [ ] Function returns `OpenApiEndpointRegistry` object
- [ ] Registry object has three Maps: `endpoints`, `schemas`, `securitySchemes`
- [ ] All Maps initialized as empty before population
- [ ] `spec.paths` iterated correctly with `Object.entries()`
- [ ] All HTTP methods checked (get, post, put, patch, delete, options, head)
- [ ] Endpoint entry created for each operation with all metadata fields
- [ ] Endpoint key format: `"METHOD /path"` (e.g., "GET /pets")
- [ ] Method normalized to uppercase in entry
- [ ] OperationId defaulted to `"method_path"` if missing in spec
- [ ] Parameters array copied from operation (or empty array)
- [ ] RequestBody copied from operation (or undefined)
- [ ] Responses object copied from operation
- [ ] Security array copied from operation (or undefined)
- [ ] Tags array copied from operation (or undefined)
- [ ] Endpoint entries stored in `registry.endpoints` Map with correct keys
- [ ] Handler presence detected by checking `x-handler` property in operation
- [ ] Handler count tracked for statistics
- [ ] `spec.components.schemas` copied to `registry.schemas` Map
- [ ] Schema entries have `name` and `schema` properties
- [ ] Seed presence detected by checking `x-seed` property in schema
- [ ] Seed count tracked for statistics
- [ ] `spec.components.securitySchemes` copied to `registry.securitySchemes` Map
- [ ] Security scheme entries normalized with correct properties
- [ ] Missing components (no schemas/securitySchemes) handled gracefully
- [ ] Statistics logged: endpoint count, handler count, schema count, seed count, security scheme count
- [ ] Log message format: "[registry] Built registry: X endpoints (Y with handlers), Z schemas (W with seeds), N security schemes"
- [ ] Unit tests created in `registry/__tests__/registry-builder.test.ts`
- [ ] Tests cover: empty spec, spec with operations, handlers, seeds, missing components
- [ ] Tests verify Map structure, endpoint keys, metadata accuracy
- [ ] TypeScript compiles without errors
- [ ] Committed with message: `feat(registry): implement registry builder with endpoint and schema tracking`

---

#### P2-05: Implement Preservation Logic (FR-013)

> **Note:** This task was integrated into **P2-03 (Document Enhancer)** during detailed planning. The preservation logic (checking for existing `x-handler`/`x-seed` extensions and logging override warnings) is implemented as part of the `enhanceDocument()` function. This task remains for tracking purposes but requires no additional implementation.

**Description:** Preserve existing `x-handler`/`x-seed` extensions in OpenAPI spec unless overridden by external handler/seed files. When external files are loaded, they take precedence over inline extensions, but a warning is logged for visibility. This prevents accidental loss of inline customizations and alerts developers to conflicts.

**Context:**
- **Preservation principle**: Inline extensions (already in spec) should be respected unless explicitly overridden
- **Override behavior**: External files (loaded from handlers/seeds directories) take precedence over inline
- **Warning logging**: When override occurs, log at warn level: "Overriding existing x-handler for addPet"
- **Implementation location**: Already integrated in P2-03 `enhanceDocument()` function
- **Check timing**: Before injecting `x-handler`/`x-seed`, check if property already exists in operation/schema

**Implementation Status:**
- ✅ Implemented in `src/enhancer/document-enhancer.ts` (P2-03)
- ✅ Preservation check: `if ('x-handler' in operation)` before injection
- ✅ Override warning logged when existing extension found
- ✅ External file always overwrites (intentional override behavior)
- ✅ Unit tests included in P2-03 test suite

**Estimate:** S (1 day) — **Already completed in P2-03**

**Acceptance Criteria:**
- [x] External handler file overrides inline x-handler (with warning) — Implemented in P2-03
- [x] External seed file overrides inline x-seed (with warning) — Implemented in P2-03
- [x] Log when override occurs for visibility — Implemented in P2-03
- [ ] Verify warning messages appear in console when overrides occur
- [ ] Test with OpenAPI spec containing inline x-handler extensions
- [ ] Test with OpenAPI spec containing inline x-seed extensions
- [ ] Confirm external files take precedence (override behavior)
- [ ] Unit tests cover preservation and override scenarios

---

#### P2-06: Implement Registry Builder (FR-006)

> **Note:** This task was enriched and renumbered as **P2-04 (Registry Builder)** during detailed planning. The registry building functionality is fully specified in P2-04. This entry remains for tracking and reference purposes.

**Description:** Implement the endpoint registry builder that constructs a runtime-inspectable data structure from the enhanced OpenAPI document. The registry maps endpoint keys to operation metadata, tracks handler/seed presence, stores schemas and security schemes, and provides statistics for logging and debugging.

**Implementation Status:**
- ✅ Detailed implementation plan in P2-04
- ✅ Module location: `src/registry/registry-builder.ts`
- ✅ Function: `buildRegistry(spec, logger)`
- ✅ Returns: `OpenApiEndpointRegistry` with endpoints, schemas, securitySchemes Maps
- ✅ Tracks: handler presence, seed presence, statistics

**Estimate:** M (2 days) — **Fully specified in P2-04**

**Acceptance Criteria:**
- [ ] See P2-04 for complete acceptance criteria (30+ detailed criteria)
- [ ] Extract all operations (method + path + operationId) from OpenAPI spec
- [ ] Map custom handlers to their corresponding operationIds
- [ ] Map custom seeds to their corresponding schema names
- [ ] Include endpoint count summary in startup logs
- [ ] Registry available to handlers via HandlerContext
- [ ] Registry available to mock server for inspection endpoints

---

#### P2-07: Implement Registry Inspection Endpoint (FR-006)

**Description:** Implement a special runtime inspection endpoint `/_openapiserver/registry` that returns the complete endpoint registry as JSON. This endpoint allows developers to inspect which endpoints are mocked, which have custom handlers, schema definitions, and statistics. Useful for debugging, documentation, and integration testing. The endpoint is served by the mock server alongside OpenAPI endpoints.

**Context:**
- **Endpoint path**: `/_openapiserver/registry` (reserved path, not from OpenAPI spec)
- **HTTP method**: GET only
- **Response format**: JSON with registry structure (endpoints array, schemas, statistics)
- **Use cases**: Debugging (which endpoints exist?), integration tests (verify handler registration), documentation generation
- **Security**: No authentication required (dev-only feature)
- **Implementation location**: Mock server runner (Hono route)
- **Registry serialization**: Convert Maps to arrays/objects for JSON compatibility

**Implementation Approach:**
1. Add special Hono route in `openapi-server-runner.mts` before Scalar routes
2. Register route: `app.get('/_openapiserver/registry', (c) => { ... })`
3. Access registry from closure or global state (passed to runner)
4. Serialize registry: convert Maps to arrays/objects
5. Compute statistics: total endpoints, handler count, seed count
6. Return JSON response with `Content-Type: application/json`
7. Include helpful metadata: OpenAPI spec version, server info, timestamps
8. Test endpoint manually with curl and automated with supertest

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P2-07.1 | Add registry route to Hono app | In `openapi-server-runner.mts`, add `app.get('/_openapiserver/registry', handler)` before Scalar routes. Route must run before wildcard Scalar handler to avoid conflicts. |
| P2-07.2 | Serialize registry to JSON | Convert `registry.endpoints` Map to array of endpoint objects. Convert `registry.schemas` Map to object/array. Convert `registry.securitySchemes` Map to array. Handle non-JSON-serializable values (functions, etc.). |
| P2-07.3 | Compute statistics | Count: total endpoints, endpoints with handlers, total schemas, schemas with seeds. Calculate percentages (e.g., "50% of endpoints have handlers"). Include in response metadata. |
| P2-07.4 | Format response structure | Structure response as: `{ meta: { ... }, endpoints: [...], schemas: [...], securitySchemes: [...], statistics: { ... } }`. Include OpenAPI spec version, server port, timestamp in meta. |
| P2-07.5 | Add endpoint documentation | Include `_openapiserver/registry` in startup logs: "Special endpoints: /_openapiserver/registry (inspection)". Add JSDoc comment explaining endpoint purpose and response format. |
| P2-07.6 | Test endpoint manually | Start mock server, curl `http://localhost:3001/_openapiserver/registry`. Verify JSON response structure. Check all endpoints listed. Verify handler flags correct. |
| P2-07.7 | Add automated tests | Create `runner/__tests__/registry-endpoint.test.ts`. Use supertest to test endpoint. Verify response status 200, Content-Type header, JSON structure, statistics accuracy. |

**Technical Considerations:**
- **Route priority**: Registry endpoint must be registered before Scalar routes (Scalar catches all paths)
- **Map serialization**: Use `Array.from(map.entries())` or `Object.fromEntries(map)` to convert Maps
- **Function references**: Registry contains handler/seed functions (from x-handler/x-seed); exclude from JSON (serialize presence flag only)
- **Response size**: Large specs (100+ endpoints) may produce 100KB+ JSON; acceptable for dev tool
- **Caching**: Registry is static after startup; consider caching serialized response
- **CORS**: No CORS needed (same-origin, dev-only)
- **Formatting**: Pretty-print JSON for readability: `JSON.stringify(data, null, 2)`
- **Performance**: Serialization is O(n) where n = endpoint count; <10ms for 100 endpoints

**Expected Outputs:**

1. **Route registration** in `openapi-server-runner.mts`:
```typescript
// Add registry inspection endpoint BEFORE Scalar routes
app.get('/_openapiserver/registry', (c) => {
  const response = {
    meta: {
      version: '1.0.0',
      openApiVersion: spec.openapi,
      port: PORT,
      timestamp: new Date().toISOString(),
    },
    endpoints: Array.from(registry.endpoints.entries()).map(([key, entry]) => ({
      key,
      method: entry.method,
      path: entry.path,
      operationId: entry.operationId,
      summary: entry.summary,
      hasHandler: 'x-handler' in entry,
      tags: entry.tags,
    })),
    schemas: Array.from(registry.schemas.keys()),
    securitySchemes: Array.from(registry.securitySchemes.keys()),
    statistics: {
      totalEndpoints: registry.endpoints.size,
      endpointsWithHandlers: Array.from(registry.endpoints.values()).filter(
        (e) => 'x-handler' in e
      ).length,
      totalSchemas: registry.schemas.size,
      schemasWithSeeds: Array.from(registry.schemas.values()).filter(
        (s) => 'x-seed' in s.schema
      ).length,
    },
  };

  return c.json(response, 200);
});
```

2. **Example response**:
```json
{
  "meta": {
    "version": "1.0.0",
    "openApiVersion": "3.1.0",
    "port": 3001,
    "timestamp": "2024-01-08T12:00:00.000Z"
  },
  "endpoints": [
    {
      "key": "GET /pets",
      "method": "GET",
      "path": "/pets",
      "operationId": "listPets",
      "summary": "List all pets",
      "hasHandler": false,
      "tags": ["pets"]
    },
    {
      "key": "POST /pet",
      "method": "POST",
      "path": "/pet",
      "operationId": "addPet",
      "summary": "Add a new pet",
      "hasHandler": true,
      "tags": ["pets"]
    }
  ],
  "schemas": ["Pet", "Category", "Tag", "Order", "User"],
  "securitySchemes": ["api_key", "petstore_auth"],
  "statistics": {
    "totalEndpoints": 19,
    "endpointsWithHandlers": 4,
    "totalSchemas": 5,
    "schemasWithSeeds": 3
  }
}
```

**Acceptance Criteria:**
- [ ] Registry inspection endpoint registered at `/_openapiserver/registry`
- [ ] Endpoint accessible via GET request
- [ ] Route registered before Scalar routes (to prevent path conflicts)
- [ ] Response Content-Type header is `application/json`
- [ ] Response status code is 200 for successful requests
- [ ] Response includes `meta` object with version, openApiVersion, port, timestamp
- [ ] Response includes `endpoints` array with all mocked endpoints
- [ ] Each endpoint object includes: key, method, path, operationId, summary, hasHandler, tags
- [ ] `hasHandler` flag correctly indicates presence of custom handler
- [ ] Response includes `schemas` array with all schema names
- [ ] Response includes `securitySchemes` array with all security scheme names
- [ ] Response includes `statistics` object with counts and percentages
- [ ] Statistics include: totalEndpoints, endpointsWithHandlers, totalSchemas, schemasWithSeeds
- [ ] Registry Maps correctly serialized to JSON-compatible arrays/objects
- [ ] Function references excluded from JSON response (only flags serialized)
- [ ] JSON response is pretty-printed for readability (if verbose mode)
- [ ] Endpoint listed in startup logs: "Special endpoints: /_openapiserver/registry"
- [ ] Manual test: curl endpoint returns valid JSON
- [ ] Automated tests created in `runner/__tests__/registry-endpoint.test.ts`
- [ ] Tests verify response structure, status code, Content-Type header
- [ ] Tests verify endpoint count matches expected value
- [ ] Tests verify handler flags match actual handler presence
- [ ] Committed with message: `feat(runner): add /_openapiserver/registry inspection endpoint`

---

#### P2-08: Implement Registry Console Display (FR-006)

**Description:** Implement a formatted console table that displays all mocked endpoints on mock server startup. The table shows method, path, operationId, and handler status (✓ for custom, - for default mock) in a clean, aligned format. This provides immediate visual feedback about what the mock server is serving and which endpoints have custom logic. The display appears after the success banner and before the "listening" message.

**Context:**
- **Display timing**: After registry built, before server starts listening (after success banner)
- **Table format**: ASCII table with columns: METHOD | PATH | OPERATION ID | HANDLER
- **Handler indicator**: ✓ (green checkmark) for custom handlers, - (dash) for default mocks
- **Column alignment**: Left-aligned text, columns padded to fit longest value
- **Color coding**: Green for custom handlers, default color for mocks, cyan for headers
- **Summary line**: After table, show totals: "19 endpoints (4 with custom handlers, 15 with default mocks)"
- **PRS reference**: Section 4.1 shows expected format with box-drawing characters
- **Implementation location**: `src/logging/registry-display.ts` utility module

**Implementation Approach:**
1. Create `src/logging/registry-display.ts` module
2. Implement `printRegistryTable(registry, logger)` function
3. Calculate column widths based on longest values in each column
4. Format table header with column names and separator line
5. Format each endpoint row with aligned columns and handler indicator
6. Add color coding: green for ✓, cyan for headers, default for paths
7. Add summary line with counts and percentages
8. Call from mock server runner after registry built, before server starts
9. Test with Petstore spec (19 endpoints, verify alignment and indicators)

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P2-08.1 | Create logging/registry-display.ts | Create utility module at `src/logging/registry-display.ts`. Export `printRegistryTable()` function. Import types: `OpenApiEndpointRegistry`, `Logger`. Import color constants from startup-banner.ts. |
| P2-08.2 | Calculate column widths | Iterate registry entries to find longest value in each column (method, path, operationId). Add padding (2 spaces) for readability. Use for alignment in table rows. |
| P2-08.3 | Format table header | Create header row with column names: "METHOD", "PATH", "OPERATION ID", "HANDLER". Add separator line below header using box-drawing characters (─) or dashes. Use cyan color for header text. |
| P2-08.4 | Format endpoint rows | For each endpoint in registry, create row with: method (uppercase, padded), path (padded), operationId (padded), handler indicator (✓ or -). Align columns using calculated widths. Use green color for ✓. |
| P2-08.5 | Add handler indicator | Check if endpoint has `x-handler` property. If yes, show `✓` in green. If no, show `-` in default color. Indicator column is 7 characters wide ("HANDLER"). |
| P2-08.6 | Compute summary statistics | Count total endpoints, endpoints with handlers (✓), endpoints with default mocks (-). Calculate percentage: `(handlersCount / total * 100).toFixed(0)%`. |
| P2-08.7 | Format summary line | After table, show summary: "19 endpoints (4 custom, 15 default)" or similar. Use dim color for summary. Include percentage if handlers > 0. |
| P2-08.8 | Integrate with runner | Call `printRegistryTable(registry, logger)` in `openapi-server-runner.mts` after registry built, before server starts. Place after success banner, before "Server listening" message. |
| P2-08.9 | Test display output | Run `pnpm playground` with Petstore spec. Verify table displays correctly. Check column alignment (no jagged edges). Verify ✓ appears for custom handlers. Verify colors display. Verify summary counts are accurate. |

**Technical Considerations:**
- **Column width calculation**: Use `Math.max(...values.map(v => v.length))` to find longest value per column
- **Padding strategy**: Use `String.prototype.padEnd()` for left-aligned text
- **Box-drawing characters**: Use Unicode (─│┌┐└┘) for professional look, or ASCII (+-|) for compatibility
- **Color support**: Check `process.stdout.isTTY` before applying colors (same as startup banner)
- **Large specs**: For 100+ endpoints, consider pagination or truncation (future enhancement)
- **Sorting**: Sort endpoints alphabetically by path, then by method for consistency
- **Table libraries**: Consider using `cli-table3` or `table` npm package for advanced formatting (optional)
- **Performance**: Formatting 100 endpoints takes <5ms; acceptable for startup

**Expected Outputs:**

1. **src/logging/registry-display.ts**:
```typescript
import type { Logger } from 'vite';
import type { OpenApiEndpointRegistry } from '../types/registry';
import { GREEN, CYAN, DIM, RESET, color } from './startup-banner';

/**
 * Print formatted registry table to console.
 * 
 * @param registry - OpenAPI endpoint registry
 * @param logger - Vite logger
 */
export function printRegistryTable(
  registry: OpenApiEndpointRegistry,
  logger: Logger
): void {
  const endpoints = Array.from(registry.endpoints.values());

  if (endpoints.length === 0) {
    logger.warn('[registry] No endpoints to display');
    return;
  }

  // Calculate column widths
  const methodWidth = Math.max(6, ...endpoints.map((e) => e.method.length)) + 2;
  const pathWidth = Math.max(4, ...endpoints.map((e) => e.path.length)) + 2;
  const operationWidth = Math.max(12, ...endpoints.map((e) => e.operationId.length)) + 2;
  const handlerWidth = 9; // "HANDLER" + padding

  // Format header
  const header = [
    color('METHOD'.padEnd(methodWidth), CYAN),
    color('PATH'.padEnd(pathWidth), CYAN),
    color('OPERATION ID'.padEnd(operationWidth), CYAN),
    color('HANDLER'.padEnd(handlerWidth), CYAN),
  ].join('');

  const separator = '─'.repeat(methodWidth + pathWidth + operationWidth + handlerWidth);

  // Format rows
  const rows = endpoints
    .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))
    .map((endpoint) => {
      const hasHandler = 'x-handler' in endpoint;
      const handlerIndicator = hasHandler ? color('✓', GREEN) : '-';

      return [
        endpoint.method.padEnd(methodWidth),
        endpoint.path.padEnd(pathWidth),
        endpoint.operationId.padEnd(operationWidth),
        handlerIndicator.padEnd(handlerWidth),
      ].join('');
    });

  // Compute statistics
  const total = endpoints.length;
  const withHandlers = endpoints.filter((e) => 'x-handler' in e).length;
  const withDefault = total - withHandlers;
  const percentage = total > 0 ? ((withHandlers / total) * 100).toFixed(0) : '0';

  // Format summary
  const summary = color(
    `${total} endpoints (${withHandlers} custom, ${withDefault} default) - ${percentage}% customized`,
    DIM
  );

  // Output table
  const table = [
    '',
    header,
    color(separator, CYAN),
    ...rows,
    '',
    summary,
    '',
  ].join('\n');

  logger.info(table);
}
```

2. **Usage in runner**:
```typescript
// In openapi-server-runner.mts, after buildRegistry():
import { printRegistryTable } from '../logging/registry-display';

const registry = buildRegistry(enhancedSpec, logger);
printRegistryTable(registry, logger);
```

3. **Console output example**:
```
METHOD  PATH                    OPERATION ID           HANDLER  
────────────────────────────────────────────────────────────────
POST    /pet                    addPet                 ✓
PUT     /pet                    updatePet              ✓
GET     /pet/findByStatus       findPetsByStatus       -
GET     /pet/findByTags         findPetsByTags         -
GET     /pet/{petId}            getPetById             ✓
POST    /pet/{petId}            updatePetWithForm      -
DELETE  /pet/{petId}            deletePet              ✓
POST    /pet/{petId}/uploadImg  uploadFile             -
GET     /store/inventory        getInventory           -
POST    /store/order            placeOrder             -
GET     /store/order/{orderId}  getOrderById           -
DELETE  /store/order/{orderId}  deleteOrder            -
POST    /user                   createUser             -
POST    /user/createWithList    createUsersWithList    -
GET     /user/login             loginUser              -
GET     /user/logout            logoutUser             -
GET     /user/{username}        getUserByName          -
PUT     /user/{username}        updateUser             -
DELETE  /user/{username}        deleteUser             -

19 endpoints (4 custom, 15 default) - 21% customized
```

**Acceptance Criteria:**
- [ ] `src/logging/registry-display.ts` created with `printRegistryTable()` function
- [ ] Function accepts `registry` (OpenApiEndpointRegistry), `logger` (Logger)
- [ ] Function returns void (outputs to logger)
- [ ] Empty registry handled gracefully (warning logged, no table)
- [ ] Column widths calculated based on longest values in registry
- [ ] Table header formatted with column names: METHOD, PATH, OPERATION ID, HANDLER
- [ ] Header uses cyan color
- [ ] Separator line added below header (box-drawing or dashes)
- [ ] Each endpoint row formatted with aligned columns
- [ ] Method column shows uppercase HTTP method (GET, POST, etc.)
- [ ] Path column shows full endpoint path (e.g., /pet/{petId})
- [ ] OperationId column shows OpenAPI operationId
- [ ] Handler column shows ✓ (green) for custom handlers, - for default mocks
- [ ] Endpoints sorted alphabetically by path, then by method
- [ ] Handler indicator check: presence of `x-handler` property determines ✓ or -
- [ ] Green color applied to ✓ checkmarks
- [ ] Summary line formatted below table
- [ ] Summary shows: total count, custom count, default count, percentage
- [ ] Summary uses dim color for less emphasis
- [ ] Percentage calculated as: (customCount / totalCount * 100)
- [ ] Table output uses logger.info() for consistency
- [ ] Function called in runner after registry built, before server starts
- [ ] Display appears in console between success banner and "listening" message
- [ ] Tested with Petstore spec (19 endpoints, 4 custom handlers)
- [ ] Column alignment verified (no jagged edges)
- [ ] Colors display correctly in terminal
- [ ] Summary counts verified accurate
- [ ] Table readable and professionally formatted
- [ ] Committed with message: `feat(logging): add formatted registry table display for startup`

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

**Description:** Configure Vite's dev server to proxy requests matching `proxyPath` (e.g., `/api`) to the mock server child process (e.g., `http://localhost:3001`). Path rewriting strips the proxy prefix so `/api/pets` becomes `/pets` when forwarded. This allows frontend code to make requests to `/api/*` which Vite automatically routes to the mock server, enabling seamless local development without CORS issues.

**Context:**
- **Vite proxy**: Built-in feature using `server.proxy` config option (uses http-proxy-middleware internally)
- **Path rewriting**: `rewrite: (path) => path.replace(/^\/api/, '')` strips prefix
- **CORS**: Same-origin proxy eliminates CORS issues (browser sees requests as same-origin)
- **Implementation location**: Plugin's `config()` hook returns proxy configuration
- **Target**: `http://localhost:${pluginOptions.port}` (mock server address)

**Implementation Approach:**
1. In plugin.ts `config()` hook, return Vite config with `server.proxy` object
2. Add proxy rule: key = `pluginOptions.proxyPath`, value = proxy config object
3. Set `target: http://localhost:${pluginOptions.port}`
4. Set `changeOrigin: true` to adjust Host header
5. Set `rewrite` function to strip proxy path prefix
6. Test with playground app making requests to `/api/pets`

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P3-01.1 | Implement config() hook proxy | In plugin.ts `config()` hook, return `{ server: { proxy: { ... } } }`. Use `pluginOptions.proxyPath` as key, `pluginOptions.port` in target URL. |
| P3-01.2 | Configure proxy options | Set `target` to mock server URL, `changeOrigin: true`, `ws: true` (WebSocket support), `secure: false` (dev mode). |
| P3-01.3 | Implement path rewriting | Add `rewrite: (path) => path.replace(new RegExp('^' + proxyPath), '')` to strip proxy prefix. Example: `/api/pets` → `/pets`. |
| P3-01.4 | Add proxy logging | If verbose mode, add `configure: (proxy) => { proxy.on('proxyReq', ...) }` to log proxied requests. |
| P3-01.5 | Test with playground | In playground app, make fetch request to `/api/pet/1`. Verify request reaches mock server. Check Vite logs show proxy activity. Verify response returns correctly. |

**Technical Considerations:**
- **Regex escaping**: Escape special chars in proxyPath for regex (e.g., `/api/v3` → `\/api\/v3`)
- **WebSocket support**: `ws: true` enables WebSocket proxying (future SSE/WebSocket mock support)
- **Trailing slashes**: Handle both `/api` and `/api/` configurations consistently
- **Multiple proxy paths**: Future enhancement could support array of proxy paths
- **Proxy timing**: Config hook runs before mock server starts; proxy is ready when server listening

**Expected Outputs:**

1. **Updated plugin.ts config() hook**:
```typescript
config() {
  if (!pluginOptions.enabled) return {};
  
  const proxyConfig = {
    [pluginOptions.proxyPath]: {
      target: `http://localhost:${pluginOptions.port}`,
      changeOrigin: true,
      ws: true,
      secure: false,
      rewrite: (path: string) => 
        path.replace(new RegExp(`^${pluginOptions.proxyPath}`), ''),
    },
  };

  if (pluginOptions.verbose) {
    logger.info(`[plugin] Configuring proxy: ${pluginOptions.proxyPath} → http://localhost:${pluginOptions.port}`);
  }

  return {
    server: {
      proxy: proxyConfig,
    },
  };
}
```

2. **Test request in playground**:
```typescript
// App.vue or similar
async function fetchPet() {
  const response = await fetch('/api/pet/1'); // Proxied to http://localhost:3001/pet/1
  const pet = await response.json();
  console.log(pet);
}
```

**Acceptance Criteria:**
- [ ] Plugin `config()` hook returns `server.proxy` configuration
- [ ] Proxy rule key matches `pluginOptions.proxyPath` (e.g., `/api`)
- [ ] Proxy target is `http://localhost:${pluginOptions.port}`
- [ ] `changeOrigin: true` set to adjust Host header
- [ ] `ws: true` set for WebSocket support
- [ ] `secure: false` set for dev mode (self-signed certs)
- [ ] `rewrite` function strips proxy path prefix
- [ ] Path rewriting tested: `/api/pets` → `/pets`
- [ ] Requests to `/api/*` proxied to mock server
- [ ] All HTTP methods supported (GET, POST, PUT, DELETE, etc.)
- [ ] Request headers preserved in proxy
- [ ] Request body preserved in proxy (POST/PUT)
- [ ] Response headers returned to client
- [ ] Response body returned to client
- [ ] CORS issues eliminated (same-origin proxy)
- [ ] Verbose logging shows proxy activity if enabled
- [ ] Tested with playground app fetch requests
- [ ] Vite dev server logs show proxy configuration
- [ ] Mock server receives requests without proxy path prefix
- [ ] 404 errors proxied correctly (mock server returns 404)
- [ ] Committed with message: `feat(plugin): implement Vite proxy configuration for mock server routing`

---

#### P3-02: Implement Request Logger (FR-008)

**Description:** Implement comprehensive request/response logging in the mock server with emoji indicators (✔ success, ✖ error), operationId resolution, timing information, and verbose mode for detailed headers/body logging. Logs are sent to parent process via IPC and displayed using Vite's logger for consistent formatting with the dev server output.

**Context:**
- **Logging location**: Mock server child process (Hono middleware)
- **Display location**: Parent process (Vite plugin) receives IPC log messages
- **Format**: `✔ GET /pets (listPets) 200 45ms` or `✖ POST /pet (addPet) 400 12ms`
- **Verbose mode**: Shows request/response headers, body (truncated), query params, path params
- **OperationId lookup**: Match request path+method against registry to find operationId
- **Color coding**: Green for 2xx, yellow for 3xx/4xx, red for 5xx

**Implementation Approach:**
1. Add Hono middleware in mock server runner before Scalar routes
2. Capture request start time with `performance.now()`
3. Call `next()` to process request, then capture response
4. Match request against registry to find operationId
5. Format log message with emoji, method, path, operationId, status, duration
6. Send log message to parent via IPC: `process.send({ type: 'log', ... })`
7. In parent process, listen for log messages and output via Vite logger
8. Support verbose mode with additional request/response details

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P3-02.1 | Add request logging middleware | In mock server runner, add Hono middleware: `app.use('*', async (c, next) => { ... })`. Middleware runs before all routes to capture timing. |
| P3-02.2 | Capture timing | Store request start time: `const start = performance.now()`. After `await next()`, calculate duration: `performance.now() - start`. |
| P3-02.3 | Resolve operationId | Match `c.req.method + ' ' + c.req.path` against registry endpoints to find operationId. Handle missing operationId gracefully (show "unknown"). |
| P3-02.4 | Format log message | Build message: `${emoji} ${method} ${path} (${operationId}) ${status} ${duration}ms`. Use ✔ for 2xx, ✖ for 4xx/5xx. |
| P3-02.5 | Send IPC log message | Use `process.send({ type: 'log', level: 'info', message, timestamp: Date.now() })` to send log to parent. |
| P3-02.6 | Add verbose details | If VERBOSE env var, include headers, query params, body preview (first 200 chars) in log message. |
| P3-02.7 | Handle log messages in parent | In plugin.ts, listen for `mockServerProcess.on('message', ...)`. If message type is 'log', output via `resolvedConfig.logger[level](message)`. |

**Technical Considerations:**
- **Middleware order**: Logging middleware must run before Scalar routes to capture all requests
- **Timing accuracy**: Use `performance.now()` for sub-millisecond precision
- **OperationId lookup**: O(n) search through registry; acceptable for <100 endpoints per request
- **IPC overhead**: Sending logs via IPC adds ~1ms latency; negligible for dev server
- **Log volume**: Verbose mode can generate 100+ lines per request; use sparingly
- **Color in IPC**: Don't send ANSI codes via IPC; apply colors in parent process
- **Body logging**: Truncate large bodies (>1KB) to prevent IPC message size issues

**Expected Outputs:**

1. **Logging middleware in runner**:
```typescript
app.use('*', async (c, next) => {
  const start = performance.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = (performance.now() - start).toFixed(0);
  const status = c.res.status;
  
  // Resolve operationId
  const key = `${method} ${path}`;
  const operationId = registry.endpoints.get(key)?.operationId || 'unknown';
  
  // Format message
  const emoji = status >= 200 && status < 300 ? '✔' : '✖';
  const message = `${emoji} ${method} ${path} (${operationId}) ${status} ${duration}ms`;
  
  // Send to parent
  if (process.send) {
    process.send({
      type: 'log',
      level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
      message,
      timestamp: Date.now(),
    });
  }
});
```

2. **Console output**:
```
✔ GET /pets (listPets) 200 45ms
✔ POST /pet (addPet) 201 23ms
✖ GET /pet/999 (getPetById) 404 12ms
✖ POST /pet (addPet) 400 8ms
```

**Acceptance Criteria:**
- [ ] Logging middleware added to Hono app before Scalar routes
- [ ] Request start time captured with `performance.now()`
- [ ] Response timing calculated: `performance.now() - start`
- [ ] OperationId resolved by matching method+path against registry
- [ ] Unknown operationId handled gracefully (show "unknown")
- [ ] Log message formatted: `emoji method path (operationId) status durationms`
- [ ] Emoji indicators: ✔ for 2xx, ✖ for 4xx/5xx
- [ ] Status code included in log message
- [ ] Duration in milliseconds (rounded to integer)
- [ ] Log message sent to parent via IPC (`process.send()`)
- [ ] IPC message type is 'log' with level, message, timestamp
- [ ] Parent process listens for 'message' events on mockServerProcess
- [ ] Log messages output via Vite logger (info/warn/error)
- [ ] Verbose mode shows additional details (headers, body preview)
- [ ] Query parameters logged in verbose mode
- [ ] Request headers logged in verbose mode (truncated if large)
- [ ] Response body preview logged in verbose mode (first 200 chars)
- [ ] Large bodies truncated to prevent IPC issues
- [ ] Timestamps included in all log messages
- [ ] Log level determined by status code (2xx=info, 4xx=warn, 5xx=error)
- [ ] Colors applied in parent process (not sent via IPC)
- [ ] Tested with playground app making requests
- [ ] Verified logs appear in Vite dev server console
- [ ] Verified operationId resolution works correctly
- [ ] Committed with message: `feat(logging): implement request/response logger with emoji indicators and IPC`

---

#### P3-03: Implement Error Simulation (FR-009)

**Description:** Document and provide example implementations of error simulation in custom handlers. Handlers can check for query parameters like `?simulateError=401&delay=2000` and return appropriate error responses or introduce delays. This is not a plugin feature but a pattern developers use in their custom handler code. Task focuses on documentation, example handlers, and playground demonstrations.

**Context:**
- **Implementation location**: Custom handler files (user code, not plugin code)
- **Query parameters**: `simulateError=<code>` (e.g., 401, 404, 500), `delay=<ms>` (e.g., 2000)
- **Error responses**: Return `HandlerResponse` with error status and body
- **Delay simulation**: Use `await new Promise(resolve => setTimeout(resolve, delay))`
- **Documentation**: README examples showing how to implement error simulation
- **Playground examples**: Update Petstore handlers to demonstrate pattern

**Implementation Approach:**
1. Create documentation section in README: "Error Simulation in Handlers"
2. Show example handler code checking for `simulateError` query param
3. Demonstrate returning error responses with appropriate status codes and bodies
4. Show delay simulation with setTimeout wrapped in Promise
5. Update playground handlers (add-pet.handler.ts, get-pet-by-id.handler.ts) with simulation
6. Add test cases in playground app to trigger simulations
7. Document common error scenarios (network timeout, server error, validation error, auth failure)

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P3-03.1 | Document error simulation pattern | Add README section "Error Simulation". Explain query parameter pattern. Show example handler code checking `context.query.simulateError`. List supported error codes: 400, 401, 403, 404, 500, 503. |
| P3-03.2 | Create example handler with simulation | Create `examples/error-simulation.handler.ts` showing full implementation: check simulateError param, switch on code, return appropriate response. Include delay simulation. |
| P3-03.3 | Implement delay simulation | Show pattern: `if (context.query.delay) { await new Promise(resolve => setTimeout(resolve, parseInt(context.query.delay))) }`. Demonstrate network timeout simulation. |
| P3-03.4 | Update playground add-pet handler | Modify `playground/petstore-app/.../add-pet.handler.ts` to check for simulateError/delay params. Return 400 for validation error, 500 for server error. |
| P3-03.5 | Update playground get-pet handler | Modify `get-pet-by-id.handler.ts` to simulate 404 not found, 401 unauthorized based on query params. |
| P3-03.6 | Add playground test UI | Create buttons in playground app to trigger error scenarios: "Test 404", "Test 500", "Test Slow Response (3s)". Make requests with appropriate query params. |
| P3-03.7 | Document error response bodies | Show examples of error response bodies: `{ error: 'Not Found', code: 404, message: '...' }`. Follow common error response patterns. |

**Technical Considerations:**
- **Type safety**: Query params are `string | string[]`; parse carefully with `parseInt()`, handle arrays
- **Error bodies**: Use consistent error response format across handlers (consider standard problem details RFC 7807)
- **Delay limits**: Document reasonable delay limits (e.g., max 10 seconds) to prevent hung requests
- **Default behavior**: Handlers return `null` by default (use mock); simulation is opt-in
- **Testing**: Error simulation enables frontend error handling testing without breaking real APIs

**Expected Outputs:**

1. **README documentation**:
```markdown
## Error Simulation

Custom handlers can check query parameters to simulate error scenarios:

### Supported Parameters

- `simulateError=<code>` - HTTP error code (400, 401, 403, 404, 500, 503)
- `delay=<ms>` - Response delay in milliseconds (e.g., 2000 for 2 seconds)

### Example Handler

```typescript
export default async function handler(context: HandlerContext) {
  // Simulate delay
  if (context.query.delay) {
    const ms = parseInt(context.query.delay as string);
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  // Simulate error
  if (context.query.simulateError) {
    const code = parseInt(context.query.simulateError as string);
    
    switch (code) {
      case 400:
        return { status: 400, body: { error: 'Bad Request', message: 'Invalid input' } };
      case 401:
        return { status: 401, body: { error: 'Unauthorized', message: 'Missing credentials' } };
      case 404:
        return { status: 404, body: { error: 'Not Found', message: 'Resource not found' } };
      case 500:
        return { status: 500, body: { error: 'Internal Server Error', message: 'Something went wrong' } };
    }
  }

  // Normal response
  return null; // Use default mock
}
```

### Usage

```typescript
// Simulate 404 error
fetch('/api/pet/999?simulateError=404')

// Simulate slow network (3 second delay)
fetch('/api/pets?delay=3000')

// Combine both
fetch('/api/pet/1?simulateError=500&delay=2000')
```
```

2. **Example handler file** (`examples/error-simulation.handler.ts`):
```typescript
import type { HandlerContext, HandlerResponse } from '@websublime/vite-plugin-open-api-server';

/**
 * Example handler demonstrating error simulation.
 * 
 * Query parameters:
 * - simulateError: HTTP error code (400, 401, 404, 500, 503)
 * - delay: Response delay in milliseconds
 */
export default async function simulateErrorHandler(
  context: HandlerContext
): Promise<HandlerResponse | null> {
  // Simulate network delay
  if (context.query.delay) {
    const delayMs = parseInt(context.query.delay as string, 10);
    if (!isNaN(delayMs) && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Simulate error response
  if (context.query.simulateError) {
    const errorCode = parseInt(context.query.simulateError as string, 10);

    const errorResponses: Record<number, HandlerResponse> = {
      400: {
        status: 400,
        body: { error: 'Bad Request', message: 'Invalid request parameters' },
      },
      401: {
        status: 401,
        body: { error: 'Unauthorized', message: 'Authentication required' },
      },
      403: {
        status: 403,
        body: { error: 'Forbidden', message: 'Access denied' },
      },
      404: {
        status: 404,
        body: { error: 'Not Found', message: 'Resource does not exist' },
      },
      500: {
        status: 500,
        body: { error: 'Internal Server Error', message: 'An unexpected error occurred' },
      },
      503: {
        status: 503,
        body: { error: 'Service Unavailable', message: 'Service temporarily unavailable' },
      },
    };

    if (errorCode in errorResponses) {
      return errorResponses[errorCode];
    }
  }

  // No simulation, use default mock
  return null;
}
```

**Acceptance Criteria:**
- [ ] README includes "Error Simulation" documentation section
- [ ] Query parameter pattern documented: `simulateError=<code>&delay=<ms>`
- [ ] Supported error codes documented: 400, 401, 403, 404, 500, 503
- [ ] Example handler code provided in documentation
- [ ] Example shows delay simulation with setTimeout
- [ ] Example shows error response generation with appropriate bodies
- [ ] Example handler file created at `examples/error-simulation.handler.ts`
- [ ] Example handler demonstrates all supported error codes
- [ ] Delay simulation implementation documented
- [ ] Error response body format documented (error, message, code)
- [ ] Playground add-pet handler updated with simulation support
- [ ] Playground get-pet-by-id handler updated with simulation support
- [ ] Playground app UI includes test buttons for error scenarios
- [ ] Test UI triggers: 404 error, 500 error, 3-second delay
- [ ] Query parameter parsing handles both string and array types
- [ ] parseInt used with error handling for invalid values
- [ ] Error responses include appropriate HTTP status codes
- [ ] Error bodies follow consistent format across examples
- [ ] Usage examples in README show fetch requests with query params
- [ ] Documentation explains this is handler pattern, not plugin feature
- [ ] Committed with message: `docs(examples): add error simulation pattern documentation and examples`

---

#### P3-04: Complete Security Implementation (FR-010)

**Description:** Verify that Scalar mock server handles security schemes correctly (presence validation only, not credential validity). Document security behavior in README with examples of how to include authentication headers in requests. Add logging to show which security schemes are configured on startup. Test all scheme types (API key, HTTP bearer, OAuth2) with Petstore spec.

**Context:**
- **Security normalization**: Already implemented in P1-02 (extracts schemes from spec)
- **Scalar behavior**: Scalar validates credential presence, not validity (any non-empty value accepted)
- **401 responses**: Returned when required credentials missing
- **OR logic**: Multiple schemes in security array handled with OR (any one sufficient)
- **Documentation focus**: Show developers how to include auth headers in requests
- **Testing**: Use Petstore spec (has api_key and petstore_auth schemes)

**Implementation Approach:**
1. Test Scalar with Petstore spec to verify security validation works
2. Make requests with and without required headers (API key, Bearer token)
3. Verify 401 returned when credentials missing
4. Verify request succeeds with any non-empty credential value
5. Document security behavior in README with curl examples
6. Add startup logging to show configured security schemes
7. Update registry display to show security requirements per endpoint

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P3-04.1 | Test Scalar security validation | Use Petstore spec with security requirements. Make request without API key header, verify 401 response. Make request with `api_key: test123`, verify 200 response. |
| P3-04.2 | Test Bearer authentication | Make request to endpoint requiring Bearer token. Try without Authorization header (expect 401). Try with `Authorization: Bearer test` (expect 200). Verify any non-empty token works. |
| P3-04.3 | Test OAuth2 schemes | Make request to endpoint with OAuth2 security. Verify presence validation (any Bearer token accepted). Document OAuth2 flows not validated (dev mode simplification). |
| P3-04.4 | Document security in README | Add "Security Schemes" section. Explain presence-only validation. Show examples: API key header, Bearer token, Basic auth. Include curl commands for each type. |
| P3-04.5 | Add security scheme logging | In mock server startup, log configured security schemes: "Security schemes: api_key (apiKey in header), petstore_auth (OAuth2)". List scheme types and locations. |
| P3-04.6 | Test multiple security schemes | Test endpoint with multiple schemes (OR logic). Verify request succeeds if any one scheme satisfied. Document OR behavior in README. |
| P3-04.7 | Update SecurityContext in handlers | Verify handlers receive populated SecurityContext with scheme, credentials, scopes. Test accessing security info in custom handler. Document handler security access. |

**Technical Considerations:**
- **Scalar limitations**: Scalar may not support all OpenAPI security features; document gaps
- **Dev mode simplification**: Production would validate token signatures; dev accepts any value
- **Credential extraction**: Headers must be extracted and passed to Scalar (verify Hono middleware)
- **Case sensitivity**: HTTP headers are case-insensitive; normalize to lowercase for comparison
- **Security context**: HandlerContext includes security info; handlers can access for custom validation

**Expected Outputs:**

1. **README security documentation**:
```markdown
## Security Schemes

The mock server validates the **presence** of authentication credentials, not their validity. Any non-empty credential value is accepted in development mode.

### API Key Authentication

```bash
# Without API key (returns 401)
curl http://localhost:3001/pet/1

# With API key (returns 200)
curl -H "api_key: my-test-key" http://localhost:3001/pet/1
```

### Bearer Token Authentication

```bash
# Without token (returns 401)
curl http://localhost:3001/store/inventory

# With token (returns 200)
curl -H "Authorization: Bearer my-test-token" http://localhost:3001/store/inventory
```

### Basic Authentication

```bash
# With Basic auth (any credentials accepted)
curl -H "Authorization: Basic dGVzdDp0ZXN0" http://localhost:3001/user/john
```

### Multiple Security Schemes (OR Logic)

Endpoints with multiple security schemes accept any one:

```typescript
security: [
  { api_key: [] },
  { petstore_auth: ['write:pets', 'read:pets'] }
]
```

Request succeeds if **either** `api_key` header **or** Bearer token provided.
```

2. **Security logging output**:
```
[mock-server] Security schemes configured:
  - api_key (apiKey in header 'api_key')
  - petstore_auth (OAuth2 with implicit, authorizationCode flows)
```

**Acceptance Criteria:**
- [ ] Scalar security validation tested with Petstore spec
- [ ] Request without required credentials returns 401 Unauthorized
- [ ] Request with any non-empty credential value returns 2xx
- [ ] API key authentication tested (header-based)
- [ ] Bearer token authentication tested (Authorization header)
- [ ] Basic authentication tested (Authorization header with Basic scheme)
- [ ] OAuth2 authentication tested (any Bearer token accepted)
- [ ] Multiple security schemes tested (OR logic verified)
- [ ] Credential presence validated, not validity (any value accepted)
- [ ] README includes "Security Schemes" documentation section
- [ ] Examples show API key, Bearer, Basic auth with curl commands
- [ ] OR logic for multiple schemes documented
- [ ] Security scheme logging added to startup output
- [ ] Startup log lists all configured schemes with types and locations
- [ ] SecurityContext populated correctly in handlers
- [ ] Handlers can access `context.security` with scheme, credentials, scopes
- [ ] Handler security access documented in README
- [ ] All OpenAPI security scheme types supported: apiKey, http, oauth2, openIdConnect
- [ ] Case-insensitive header matching works correctly
- [ ] Tested with Petstore spec (api_key and petstore_auth schemes)
- [ ] Verified 401 response body includes authentication error message
- [ ] Committed with message: `docs(security): document security scheme validation and add examples`

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

**Description:** Implement child process spawning using Node.js `fork()` to run the mock server in isolation. The process manager handles spawning, environment variable passing, IPC setup, crash recovery, graceful shutdown, and force-kill timeouts. This ensures the mock server runs independently and doesn't crash Vite if it fails.

**Context:**
- **fork() vs spawn()**: Use `fork()` for built-in IPC channel and Node.js process spawning
- **Entry point**: Fork `dist/runner/openapi-server-runner.mjs` compiled by tsdown
- **Environment variables**: Pass PORT, OPENAPI_SPEC_PATH, VERBOSE, HANDLERS_DIR, SEEDS_DIR
- **IPC channel**: Automatically created by fork(), used for ready/error/log messages
- **Crash isolation**: Child crashes logged but don't terminate parent (Vite continues)
- **Graceful shutdown**: Send IPC shutdown message, wait 5s, then SIGTERM, then SIGKILL

**Implementation Approach:**
1. Create `src/process/process-manager.ts` module
2. Implement `spawnMockServer(options, logger)` function
3. Use `fork()` with runner script path and IPC enabled
4. Pass configuration via `env` object (PORT, OPENAPI_SPEC_PATH, etc.)
5. Listen for child `exit` event to detect crashes
6. Implement `shutdownMockServer(process, timeout)` for graceful cleanup
7. Send IPC shutdown message, wait for exit, then escalate to SIGTERM/SIGKILL
8. Return ChildProcess handle for lifecycle management

**Estimate:** M (3 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P4-01.1 | Create process/process-manager.ts | Create module at `src/process/process-manager.ts`. Export `spawnMockServer()` and `shutdownMockServer()` functions. Import Node.js `fork` from `child_process`. |
| P4-01.2 | Implement spawnMockServer() | Use `fork(runnerPath, [], { env, stdio: 'pipe', cwd })` to spawn child. Pass PORT, OPENAPI_SPEC_PATH, VERBOSE env vars. Set `stdio: 'pipe'` to capture stdout/stderr. Return ChildProcess. |
| P4-01.3 | Build environment object | Create env object with `PORT`, `OPENAPI_SPEC_PATH`, `VERBOSE`, `HANDLERS_DIR`, `SEEDS_DIR` from plugin options. Inherit parent env with `...process.env`. |
| P4-01.4 | Listen for exit events | Add `childProcess.on('exit', (code, signal) => { ... })` listener. Log exit with code/signal. If unexpected exit (code !== 0), log error but don't crash parent. |
| P4-01.5 | Handle stdout/stderr | Pipe child stdout/stderr to parent logger: `childProcess.stdout.on('data', ...)`. Forward console output from child to Vite logger for unified logging. |
| P4-01.6 | Implement shutdownMockServer() | Send IPC shutdown message: `process.send({ type: 'shutdown' })`. Wait for exit event with timeout (5s). If no exit, send SIGTERM. Wait 2s more, then SIGKILL. Return Promise. |
| P4-01.7 | Add error recovery | Wrap fork() in try-catch. Handle ENOENT (runner not built), EACCES (permission denied). Log errors and return null instead of crashing. Vite continues without mock server. |
| P4-01.8 | Integrate with plugin | Call `spawnMockServer()` in plugin buildStart() hook. Store ChildProcess in closure. Call `shutdownMockServer()` in closeBundle() hook. Handle process reference cleanup. |

**Technical Considerations:**
- **Runner path**: Resolve relative to compiled dist directory: `path.resolve(__dirname, '../runner/openapi-server-runner.mjs')`
- **IPC availability**: fork() sets up IPC automatically; `process.send()` exists in child
- **Stdio piping**: Capture stdout/stderr for logging; don't inherit parent stdio (breaks Vite output)
- **Exit codes**: 0 = success, 1 = error, null = killed by signal
- **Zombie processes**: Always cleanup child processes to prevent resource leaks
- **Force kill**: SIGKILL is last resort (non-graceful); only use after timeout
- **Windows compatibility**: SIGTERM not fully supported on Windows; use IPC shutdown message first

**Expected Outputs:**

1. **src/process/process-manager.ts**:
```typescript
import { fork, ChildProcess } from 'node:child_process';
import path from 'node:path';
import type { Logger } from 'vite';
import type { OpenApiServerPluginOptions } from '../types';

export async function spawnMockServer(
  options: OpenApiServerPluginOptions,
  logger: Logger
): Promise<ChildProcess | null> {
  const runnerPath = path.resolve(__dirname, '../runner/openapi-server-runner.mjs');
  
  const env = {
    ...process.env,
    PORT: String(options.port || 3001),
    OPENAPI_SPEC_PATH: options.openApiPath,
    VERBOSE: String(options.verbose || false),
    HANDLERS_DIR: options.handlersDir || '',
    SEEDS_DIR: options.seedsDir || '',
  };

  try {
    const child = fork(runnerPath, [], {
      env,
      stdio: 'pipe',
      cwd: process.cwd(),
    });

    // Forward stdout/stderr
    child.stdout?.on('data', (data) => logger.info(data.toString().trim()));
    child.stderr?.on('data', (data) => logger.error(data.toString().trim()));

    // Handle unexpected exits
    child.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        logger.error(`[process-manager] Mock server exited with code ${code}`);
      } else if (signal) {
        logger.warn(`[process-manager] Mock server killed by signal ${signal}`);
      }
    });

    return child;
  } catch (error) {
    const err = error as Error;
    logger.error(`[process-manager] Failed to spawn mock server: ${err.message}`);
    return null;
  }
}

export async function shutdownMockServer(
  child: ChildProcess,
  timeout: number = 5000,
  logger: Logger
): Promise<void> {
  return new Promise((resolve) => {
    const forceKillTimer = setTimeout(() => {
      logger.warn('[process-manager] Force killing mock server (timeout)');
      child.kill('SIGKILL');
      resolve();
    }, timeout + 2000);

    child.once('exit', () => {
      clearTimeout(forceKillTimer);
      resolve();
    });

    // Try graceful shutdown via IPC
    if (child.send) {
      child.send({ type: 'shutdown' });
    }

    // Escalate to SIGTERM after timeout
    setTimeout(() => {
      if (child.exitCode === null) {
        logger.warn('[process-manager] Sending SIGTERM to mock server');
        child.kill('SIGTERM');
      }
    }, timeout);
  });
}
```

**Acceptance Criteria:**
- [ ] `src/process/process-manager.ts` created with spawn/shutdown functions
- [ ] `spawnMockServer()` uses Node.js `fork()` to spawn child process
- [ ] Runner path resolved correctly: `dist/runner/openapi-server-runner.mjs`
- [ ] Environment variables passed via `env` option in fork()
- [ ] PORT, OPENAPI_SPEC_PATH, VERBOSE, HANDLERS_DIR, SEEDS_DIR included in env
- [ ] Parent env inherited with `...process.env`
- [ ] stdio set to 'pipe' to capture output
- [ ] stdout forwarded to Vite logger with `logger.info()`
- [ ] stderr forwarded to Vite logger with `logger.error()`
- [ ] Exit event listener registered on child process
- [ ] Unexpected exits (code !== 0) logged as errors
- [ ] Normal exits (code === 0) logged as info
- [ ] Signal kills logged with signal name
- [ ] Parent process continues running if child crashes
- [ ] `shutdownMockServer()` sends IPC shutdown message first
- [ ] Graceful shutdown timeout configurable (default 5s)
- [ ] SIGTERM sent after timeout if child still running
- [ ] SIGKILL sent after additional 2s if still running
- [ ] Promise resolves when child exits
- [ ] Force kill timer cleared if child exits gracefully
- [ ] Error handling for fork() failures (ENOENT, EACCES)
- [ ] Returns null on spawn failure (doesn't crash parent)
- [ ] Integrated in plugin buildStart() hook
- [ ] Integrated in plugin closeBundle() hook
- [ ] ChildProcess reference stored in plugin closure
- [ ] Process cleanup prevents zombie processes
- [ ] Committed with message: `feat(process): implement process manager with fork, IPC, and graceful shutdown`

---

#### P4-02: Implement IPC Handler (FR-011)

**Description:** Implement structured IPC message handling between parent (Vite plugin) and child (mock server) processes. Define message handlers for each message type (ready, error, log, shutdown), validate message structure, and forward logs to Vite's logger for unified console output. Uses discriminated union types for type-safe message handling.

**Context:**
- **Message types**: ReadyMessage, ErrorMessage, LogMessage, ShutdownMessage (defined in P1-03)
- **Direction**: Mostly child → parent (status updates, logs); parent → child (shutdown command)
- **Type safety**: Use discriminated union with `type` field for exhaustive switch
- **Handler pattern**: Map message type to handler function
- **Validation**: Check message structure before processing to prevent crashes
- **Logging**: Forward all log messages to Vite logger with appropriate level

**Implementation Approach:**
1. In plugin.ts, add message listener: `childProcess.on('message', handleIpcMessage)`
2. Implement `handleIpcMessage(message)` function with type narrowing
3. Use switch on `message.type` to dispatch to appropriate handler
4. For 'ready': store port, set isReady flag, print success banner
5. For 'error': log error, print error banner, mark startup as failed
6. For 'log': forward to Vite logger at specified level
7. For 'shutdown': acknowledge (child-initiated shutdown)
8. Add message validation to ensure required fields present

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P4-02.1 | Add message listener in plugin | In buildStart() after spawn, add `mockServerProcess.on('message', handleIpcMessage)`. Remove listener in closeBundle() to prevent memory leaks. |
| P4-02.2 | Implement handleIpcMessage() | Create handler function with parameter typed as `unknown`. Validate it's an object with `type` property. Cast to `OpenApiServerMessage` union type. |
| P4-02.3 | Add type narrowing switch | Use `switch (message.type)` with cases for each message type. TypeScript narrows union type in each case. Add `default` case for unknown message types (log warning). |
| P4-02.4 | Handle ready message | Case 'ready': Extract port and endpointCount. Set `mockServerPort = message.port`, `isReady = true`. Call `printSuccessBanner()`. Resolve startup promise. |
| P4-02.5 | Handle error message | Case 'error': Extract message and stack. Log error with Vite logger. Call `printErrorBanner()`. Reject startup promise. Don't kill child (already crashed). |
| P4-02.6 | Handle log message | Case 'log': Extract level and message. Forward to Vite logger: `logger[message.level](message.message)`. Respect log level (info/warn/error/debug). |
| P4-02.7 | Handle shutdown message | Case 'shutdown': Log "Mock server initiated shutdown". Clean up process reference. Set `isReady = false`. (Child is shutting down on its own, rare but possible). |
| P4-02.8 | Add message validation | Before switch, check `typeof message === 'object' && message !== null && 'type' in message`. If invalid, log warning and return early. Prevents crashes from malformed messages. |

**Technical Considerations:**
- **Type safety**: Use TypeScript discriminated unions for exhaustive type checking
- **Message validation**: Always validate before accessing properties (child could send anything)
- **Error handling**: Wrap handler in try-catch to prevent uncaught exceptions
- **Memory leaks**: Remove message listener when plugin closes
- **Race conditions**: Ready message might arrive before listener attached; handle in startup coordinator
- **Log flooding**: Don't forward debug logs unless verbose mode enabled

**Expected Outputs:**

1. **IPC handler in plugin.ts**:
```typescript
function handleIpcMessage(message: unknown): void {
  // Validate message structure
  if (typeof message !== 'object' || message === null || !('type' in message)) {
    logger.warn('[plugin] Received invalid IPC message');
    return;
  }

  const ipcMessage = message as OpenApiServerMessage;

  try {
    switch (ipcMessage.type) {
      case 'ready':
        mockServerPort = ipcMessage.port;
        isReady = true;
        printSuccessBanner(
          ipcMessage.port,
          ipcMessage.endpointCount,
          pluginOptions.openApiPath,
          startTime,
          logger
        );
        break;

      case 'error':
        logger.error(`[plugin] Mock server error: ${ipcMessage.message}`);
        if (ipcMessage.stack) {
          logger.error(ipcMessage.stack);
        }
        printErrorBanner(
          new Error(ipcMessage.message),
          pluginOptions.openApiPath,
          logger
        );
        break;

      case 'log':
        if (pluginOptions.verbose || ipcMessage.level !== 'debug') {
          logger[ipcMessage.level](ipcMessage.message);
        }
        break;

      case 'shutdown':
        logger.info('[plugin] Mock server initiated shutdown');
        isReady = false;
        break;

      default:
        logger.warn(`[plugin] Unknown IPC message type: ${(ipcMessage as any).type}`);
    }
  } catch (error) {
    const err = error as Error;
    logger.error(`[plugin] Error handling IPC message: ${err.message}`);
  }
}
```

**Acceptance Criteria:**
- [ ] Message listener registered on childProcess: `childProcess.on('message', ...)`
- [ ] Listener added after process spawns in buildStart()
- [ ] Listener removed in closeBundle() to prevent leaks
- [ ] `handleIpcMessage()` function implemented with type validation
- [ ] Message structure validated: object with 'type' property
- [ ] Invalid messages logged as warnings and ignored
- [ ] Type narrowing switch statement on `message.type`
- [ ] 'ready' case: stores port, sets isReady flag, prints success banner
- [ ] 'error' case: logs error+stack, prints error banner
- [ ] 'log' case: forwards to Vite logger at correct level
- [ ] 'shutdown' case: logs shutdown, sets isReady=false
- [ ] Default case: warns about unknown message types
- [ ] Try-catch wraps handler to prevent crashes
- [ ] Log level filtering: debug logs only shown in verbose mode
- [ ] Success banner shows port, endpoint count, startup time
- [ ] Error banner shows error message and helpful suggestions
- [ ] All message types from IPC protocol supported
- [ ] TypeScript compiler checks exhaustiveness of switch
- [ ] Message handler tested with mock messages
- [ ] Committed with message: `feat(process): implement IPC message handler with type-safe dispatch`

---

#### P4-03: Implement Startup Coordinator (FR-012)

**Description:** Implement startup coordination that waits for the mock server's 'ready' IPC message with a configurable timeout. Uses Promise-based async/await pattern to block plugin initialization until server is ready or timeout expires. Displays success banner on ready or error banner on timeout/failure.

**Context:**
- **Blocking startup**: Plugin buildStart() should await mock server ready before continuing
- **Timeout**: Default 5000ms (configurable via `startupTimeout` option)
- **Promise pattern**: Create Promise that resolves on 'ready' message or rejects on timeout
- **Error handling**: Timeout shows clear error with troubleshooting steps
- **Success display**: Ready message triggers success banner with URL, endpoint count, timing

**Implementation Approach:**
1. Create `waitForReady(childProcess, timeout)` function returning Promise
2. Set up Promise that listens for 'ready' IPC message
3. Set timeout timer that rejects Promise if no ready message
4. In plugin buildStart(), await `waitForReady()` after spawning
5. On success: continue plugin initialization
6. On timeout: log error, print error banner, throw or continue (configurable)
7. Cleanup: clear timeout timer when Promise resolves/rejects

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P4-03.1 | Implement waitForReady() | Create async function `waitForReady(child, timeout)` returning `Promise<ReadyMessage>`. Promise resolves when 'ready' message received, rejects on timeout. |
| P4-03.2 | Set up message listener | Inside Promise, add one-time listener: `child.once('message', ...)`. Check if message type is 'ready', resolve if yes. |
| P4-03.3 | Set timeout timer | Use `setTimeout(() => reject(new Error('Timeout')), timeout)`. Clear timer in Promise finally block to prevent leaks. |
| P4-03.4 | Handle error messages | Also listen for 'error' messages during startup. If error received before ready, reject Promise with error details. |
| P4-03.5 | Integrate in buildStart() | After spawning, call `await waitForReady(childProcess, pluginOptions.startupTimeout)`. Wrap in try-catch for timeout handling. |
| P4-03.6 | Handle timeout errors | In catch block, check if error is timeout. Print error banner with troubleshooting: "Increase startupTimeout, check spec path, check port conflicts". |
| P4-03.7 | Display success on ready | When Promise resolves, extract port and endpointCount from ReadyMessage. Pass to printSuccessBanner() with startup time. |

**Technical Considerations:**
- **Race condition**: Ready message might arrive before listener attached (unlikely but possible)
- **Cleanup**: Always clear timeout timer to prevent memory leaks
- **Error vs timeout**: Distinguish between timeout (no response) and error (explicit failure)
- **Large specs**: Increase default timeout for specs with 100+ endpoints (parsing takes longer)
- **Configurable behavior**: Allow plugin to continue even on timeout (dev choice)

**Expected Outputs:**

1. **waitForReady() implementation**:
```typescript
function waitForReady(
  child: ChildProcess,
  timeout: number
): Promise<ReadyMessage> {
  return new Promise((resolve, reject) => {
    const timeoutTimer = setTimeout(() => {
      reject(new Error(`Mock server startup timeout after ${timeout}ms`));
    }, timeout);

    const messageHandler = (message: unknown) => {
      if (
        typeof message === 'object' &&
        message !== null &&
        'type' in message
      ) {
        const ipcMessage = message as OpenApiServerMessage;
        
        if (ipcMessage.type === 'ready') {
          clearTimeout(timeoutTimer);
          child.off('message', messageHandler);
          resolve(ipcMessage);
        } else if (ipcMessage.type === 'error') {
          clearTimeout(timeoutTimer);
          child.off('message', messageHandler);
          reject(new Error(ipcMessage.message));
        }
      }
    };

    child.on('message', messageHandler);
  });
}
```

2. **Usage in buildStart()**:
```typescript
async buildStart() {
  const startTime = performance.now();
  printLoadingBanner(pluginOptions.openApiPath, logger);

  mockServerProcess = await spawnMockServer(pluginOptions, logger);
  if (!mockServerProcess) {
    throw new Error('Failed to spawn mock server');
  }

  try {
    const readyMessage = await waitForReady(
      mockServerProcess,
      pluginOptions.startupTimeout || 5000
    );
    
    printSuccessBanner(
      readyMessage.port,
      readyMessage.endpointCount,
      pluginOptions.openApiPath,
      startTime,
      logger
    );
  } catch (error) {
    const err = error as Error;
    printErrorBanner(err, pluginOptions.openApiPath, logger);
    throw err;
  }
}
```

**Acceptance Criteria:**
- [ ] `waitForReady()` function implemented returning Promise
- [ ] Function accepts ChildProcess and timeout parameters
- [ ] Promise resolves when 'ready' IPC message received
- [ ] Promise rejects on timeout after configured milliseconds
- [ ] Promise rejects on 'error' IPC message
- [ ] Timeout timer set with `setTimeout()`
- [ ] Timeout timer cleared when Promise resolves or rejects
- [ ] Message listener removed after Promise settles (no memory leak)
- [ ] Default timeout is 5000ms (5 seconds)
- [ ] Timeout configurable via plugin option `startupTimeout`
- [ ] buildStart() hook awaits `waitForReady()` before continuing
- [ ] Try-catch wraps waitForReady() call
- [ ] Timeout error caught and handled gracefully
- [ ] Error banner printed on timeout with troubleshooting steps
- [ ] Success banner printed on ready with port, endpoint count, timing
- [ ] Startup time calculated: `performance.now() - startTime`
- [ ] Error message distinguishes timeout from explicit error
- [ ] Timeout message includes actual timeout value for debugging
- [ ] Large specs (>50 endpoints) recommendation: increase timeout
- [ ] Committed with message: `feat(process): implement startup coordinator with ready-wait and timeout handling`

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

**Description:** Implement file system watching using chokidar to detect changes in handler/seed directories. Emit events on file add/change/unlink, debounce rapid changes to prevent excessive restarts, and integrate with plugin to trigger hot reload. Watches `.ts`, `.js`, `.mts`, `.mjs` files matching handler/seed patterns.

**Context:**
- **chokidar**: Robust cross-platform file watcher (better than fs.watch)
- **Watch patterns**: `**/*.handler.{ts,js,mts,mjs}` and `**/*.seed.{ts,js,mts,mjs}`
- **Events**: 'add', 'change', 'unlink' (file created, modified, deleted)
- **Debouncing**: Wait 100ms after last change before emitting to batch rapid edits
- **Ignore**: node_modules, .git, dist directories
- **Integration**: Watcher emits 'change' event consumed by hot reload logic

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P5-01.1 | Create hot-reload/file-watcher.ts | Create module at `src/hot-reload/file-watcher.ts`. Export `createFileWatcher()` function returning EventEmitter. Import chokidar. |
| P5-01.2 | Configure chokidar instance | Call `chokidar.watch([handlersDir, seedsDir])` with options: `{ ignored: /node_modules|\.git|dist/, persistent: true, ignoreInitial: true }`. |
| P5-01.3 | Listen for file events | Add listeners for 'add', 'change', 'unlink' events. Log file path and event type. Emit custom 'file-change' event with file path and type. |
| P5-01.4 | Implement debouncing | Use lodash.debounce or custom debounce to batch changes. Wait 100ms after last event before emitting. Prevents restart spam during rapid saves. |
| P5-01.5 | Add watcher lifecycle | Implement `start()` and `stop()` methods on watcher. `stop()` calls `watcher.close()` to release resources. Call stop() in plugin closeBundle(). |
| P5-01.6 | Integrate with plugin | In plugin configureServer(), create file watcher. Listen for 'file-change' events. Trigger hot reload when event received. Log "File changed: path" in verbose mode. |

**Technical Considerations:**
- **chokidar options**: `ignoreInitial: true` prevents firing events for existing files on startup
- **Debounce timing**: 100ms good balance between responsiveness and batching
- **Memory usage**: chokidar keeps file tree in memory; acceptable for <1000 files
- **Platform differences**: chokidar abstracts away Windows/Linux/macOS file watcher differences

**Expected Outputs:**

1. **src/hot-reload/file-watcher.ts**:
```typescript
import chokidar, { FSWatcher } from 'chokidar';
import { EventEmitter } from 'node:events';
import debounce from 'lodash.debounce';

export interface FileChangeEvent {
  path: string;
  type: 'add' | 'change' | 'unlink';
}

export class FileWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;

  start(handlersDir: string, seedsDir: string): void {
    this.watcher = chokidar.watch([handlersDir, seedsDir], {
      ignored: /(node_modules|\.git|dist)/,
      persistent: true,
      ignoreInitial: true,
    });

    const emitChange = debounce((event: FileChangeEvent) => {
      this.emit('change', event);
    }, 100);

    this.watcher.on('add', (path) => emitChange({ path, type: 'add' }));
    this.watcher.on('change', (path) => emitChange({ path, type: 'change' }));
    this.watcher.on('unlink', (path) => emitChange({ path, type: 'unlink' }));
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}

export function createFileWatcher(): FileWatcher {
  return new FileWatcher();
}
```

**Acceptance Criteria:**
- [ ] `src/hot-reload/file-watcher.ts` created
- [ ] `createFileWatcher()` function returns FileWatcher instance
- [ ] FileWatcher extends EventEmitter for event-driven architecture
- [ ] `start()` method accepts handlersDir and seedsDir paths
- [ ] chokidar watch initialized with both directories
- [ ] Watch options: `ignored: /(node_modules|\.git|dist)/`
- [ ] Watch options: `persistent: true, ignoreInitial: true`
- [ ] Listeners registered for 'add', 'change', 'unlink' events
- [ ] File path logged when event fired (if verbose)
- [ ] Custom 'change' event emitted with path and type
- [ ] Debouncing implemented with 100ms delay
- [ ] Rapid file saves batched into single change event
- [ ] `stop()` method closes chokidar watcher
- [ ] Watcher resources released on stop (no memory leak)
- [ ] Integrated in plugin configureServer() hook
- [ ] File watcher started after mock server ready
- [ ] Watcher stopped in plugin closeBundle() hook
- [ ] 'change' event triggers hot reload logic (P5-02)
- [ ] chokidar package added to dependencies
- [ ] lodash.debounce package added to dependencies
- [ ] TypeScript types included (@types/lodash.debounce)
- [ ] Cross-platform file watching works (Windows, Linux, macOS)
- [ ] Committed with message: `feat(hot-reload): implement file watcher with chokidar and debouncing`

---

#### P5-02: Implement Hot Reload (FR-014)

**Description:** Implement automatic mock server restart when handler/seed files change. On file change event, gracefully shutdown current mock server, clear Node.js module cache for changed files, respawn mock server with reloaded handlers/seeds, wait for ready, and display reload notification with timing. Target: complete reload in <2 seconds for good DX.

**Context:**
- **Trigger**: File watcher emits 'change' event
- **Steps**: Shutdown → Clear cache → Respawn → Wait ready → Notify
- **Module cache**: Node.js caches dynamic imports; must clear for hot reload
- **Cache clearing**: Delete from `require.cache` and ESM loader cache (if possible)
- **Timing goal**: <2s from change to ready (includes shutdown, spawn, parse, enhance, listen)
- **UX**: Show "Reloading..." and "Reloaded in Xs" messages

**Estimate:** M (3 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P5-02.1 | Implement handleFileChange() | Create async handler for file watcher 'change' events. Extract file path and type. Log "File changed: path". Trigger reload sequence. |
| P5-02.2 | Implement reload sequence | Sequence: 1) Print "Reloading mock server...", 2) Shutdown current process, 3) Clear module cache, 4) Respawn process, 5) Wait for ready, 6) Print "Reloaded in Xs". |
| P5-02.3 | Clear Node.js module cache | For changed file path, delete from `require.cache[path]`. For ESM, use dynamic import with cache-busting query: `import(path + '?t=' + Date.now())`. |
| P5-02.4 | Implement graceful restart | Call `shutdownMockServer(currentProcess)` to gracefully stop. Then call `spawnMockServer()` to start new process. Store new process reference. |
| P5-02.5 | Wait for new server ready | After spawn, call `waitForReady()` with timeout. Ensure new server fully initialized before declaring reload complete. |
| P5-02.6 | Display reload notification | Print "[mock-server] Reloading..." at start. Print "[mock-server] Reloaded in 1.2s" at end. Use Vite logger for consistency. Add emoji for visual feedback. |
| P5-02.7 | Measure reload time | Capture `const reloadStart = performance.now()` before shutdown. Calculate duration after ready: `(performance.now() - reloadStart) / 1000`. Log with 2 decimal places. |
| P5-02.8 | Optimize reload speed | Test with Petstore: target <2s. If slower, profile bottlenecks. Consider keeping registry cached (don't re-parse spec unless changed). |

**Technical Considerations:**
- **ESM cache**: ESM imports cached by URL; add query param or use `delete import.meta.cache` (Node 20.6+)
- **File path normalization**: Normalize paths before cache lookup (Windows \ vs /)
- **Concurrency**: Prevent multiple reloads firing simultaneously (debounce or lock)
- **Error handling**: If reload fails, keep old server running (don't break dev)
- **Spec changes**: Watch OpenAPI spec file too; reload on spec changes

**Expected Outputs:**

1. **Hot reload handler**:
```typescript
async function handleFileChange(event: FileChangeEvent): Promise<void> {
  logger.info(`[hot-reload] File ${event.type}: ${event.path}`);
  
  const reloadStart = performance.now();
  logger.info('[hot-reload] ⟳ Reloading mock server...');

  try {
    // Graceful shutdown
    if (mockServerProcess) {
      await shutdownMockServer(mockServerProcess, 3000, logger);
    }

    // Clear module cache for changed file
    const normalizedPath = path.normalize(event.path);
    delete require.cache[normalizedPath];

    // Respawn
    mockServerProcess = await spawnMockServer(pluginOptions, logger);
    if (!mockServerProcess) {
      throw new Error('Failed to respawn mock server');
    }

    // Wait for ready
    const readyMessage = await waitForReady(
      mockServerProcess,
      pluginOptions.startupTimeout || 5000
    );

    // Success
    const duration = ((performance.now() - reloadStart) / 1000).toFixed(2);
    logger.info(`[hot-reload] ✓ Reloaded in ${duration}s`);
  } catch (error) {
    const err = error as Error;
    logger.error(`[hot-reload] ✗ Reload failed: ${err.message}`);
  }
}
```

2. **Console output**:
```
[hot-reload] File change: src/apis/petstore/open-api-server/handlers/add-pet.handler.ts
[hot-reload] ⟳ Reloading mock server...
[mock-server] Shutting down...
[mock-server] Loading OpenAPI spec...
[mock-server] Server listening on http://localhost:3001
[hot-reload] ✓ Reloaded in 1.24s
```

**Acceptance Criteria:**
- [ ] File watcher 'change' event handler implemented
- [ ] Handler extracts file path and change type from event
- [ ] Reload sequence triggered on file change
- [ ] "Reloading mock server..." message logged
- [ ] Current mock server gracefully shutdown with timeout
- [ ] Node.js require.cache cleared for changed file path
- [ ] ESM cache busting attempted (query param or import.meta)
- [ ] New mock server spawned with `spawnMockServer()`
- [ ] New process reference stored (replaces old)
- [ ] `waitForReady()` called on new process
- [ ] Reload timeout is configurable (use startupTimeout)
- [ ] Success message logged: "Reloaded in Xs"
- [ ] Reload time measured with `performance.now()`
- [ ] Reload time displayed with 2 decimal places
- [ ] Reload completes in <2 seconds for typical specs
- [ ] Error handling: reload failures don't crash Vite
- [ ] On reload failure, old server kept running (if possible)
- [ ] Concurrent reload prevented (lock or debounce)
- [ ] File path normalization for Windows compatibility
- [ ] Handler/seed file changes trigger reload
- [ ] OpenAPI spec file changes trigger reload (if watched)
- [ ] Visual feedback: ⟳ for reloading, ✓ for success, ✗ for failure
- [ ] Reload notification visible in Vite dev server console
- [ ] Tested with rapid file saves (debouncing works)
- [ ] Tested with handler file changes (new logic picked up)
- [ ] Tested with seed file changes (new data used)
- [ ] Committed with message: `feat(hot-reload): implement automatic mock server restart on file changes`

---

#### P5-03: Implement DevTools Plugin (FR-015)

**Description:** Implement Vue DevTools custom inspector plugin that displays OpenAPI registry, endpoint list, handler status, and request logs in a dedicated DevTools tab. Requires Vue 3 app using DevTools 6+ and browser environment. Plugin registers custom inspector showing endpoints, schemas, and live request activity.

**Context:**
- **Vue DevTools API**: Use `setupDevtoolsPlugin()` from `@vue/devtools-api`
- **Custom inspector**: Shows tree view of endpoints with metadata
- **State exposure**: Registry, handlers, request log accessible in DevTools
- **Detection guards**: Only register in browser, dev mode, with DevTools
- **Integration**: Inject DevTools plugin into Vite client code

**Estimate:** L (5 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P5-03.1 | Create devtools/devtools-plugin.ts | Vue DevTools plugin file. Import `setupDevtoolsPlugin` from `@vue/devtools-api`. Export plugin setup function. |
| P5-03.2 | Implement detection guards | Check `import.meta.env.DEV` (dev mode), `typeof window !== 'undefined'` (browser), `window.__VUE_DEVTOOLS_GLOBAL_HOOK__` (DevTools installed). Return early if any false. |
| P5-03.3 | Register custom inspector | Call `setupDevtoolsPlugin({ id: 'vite-openapi-server', label: 'OpenAPI Server', ... }, (api) => { ... })`. Create inspector with `api.addInspector()`. |
| P5-03.4 | Implement getInspectorTree() | Return tree structure of endpoints: root node "Endpoints" with children for each operation. Show method, path, operationId. Badge for custom handlers. |
| P5-03.5 | Implement getInspectorState() | When endpoint selected, show detailed state: parameters, requestBody schema, responses, security requirements. Format as key-value pairs. |
| P5-03.6 | Expose global state | Create `window.__VITE_OPENAPI_SERVER__` object with registry, handlers Map, request log array. DevTools plugin reads from this. |
| P5-03.7 | Add client injection | In plugin configureServer(), inject DevTools script into Vite's client. Use `server.middlewares.use()` to inject `<script>` tag. |
| P5-03.8 | Test with playground | Enable DevTools in playground app. Open DevTools, verify "OpenAPI Server" tab appears. Verify endpoint tree displays. Click endpoint, verify details shown. |

**Technical Considerations:**
- **Vue 3 only**: DevTools API only works with Vue 3 apps
- **Browser only**: DevTools runs in browser, not SSR
- **DevTools 6+**: Requires modern DevTools version with custom inspector API
- **Global state**: Avoid polluting global namespace; use namespaced key
- **Performance**: Large registries (100+ endpoints) may slow DevTools

**Expected Outputs:**

1. **src/devtools/devtools-plugin.ts**:
```typescript
import { setupDevtoolsPlugin } from '@vue/devtools-api';

export function setupOpenApiDevTools(registry: any): void {
  if (import.meta.env.PROD) return;
  if (typeof window === 'undefined') return;
  if (!window.__VUE_DEVTOOLS_GLOBAL_HOOK__) return;

  setupDevtoolsPlugin(
    {
      id: 'vite-openapi-server',
      label: 'OpenAPI Server',
      app: window.__VUE__?.[0],
    },
    (api) => {
      api.addInspector({
        id: 'openapi-endpoints',
        label: 'Endpoints',
        icon: 'api',
      });

      api.on.getInspectorTree((payload) => {
        if (payload.inspectorId === 'openapi-endpoints') {
          payload.rootNodes = [
            {
              id: 'endpoints',
              label: `Endpoints (${registry.endpoints.size})`,
              children: Array.from(registry.endpoints.values()).map((ep: any) => ({
                id: ep.operationId,
                label: `${ep.method} ${ep.path}`,
                tags: ep.hasHandler ? [{ label: 'Custom', color: 0x00ff00 }] : [],
              })),
            },
          ];
        }
      });

      api.on.getInspectorState((payload) => {
        if (payload.inspectorId === 'openapi-endpoints') {
          const endpoint = registry.endpoints.get(payload.nodeId);
          if (endpoint) {
            payload.state = {
              'Endpoint Info': [
                { key: 'Method', value: endpoint.method },
                { key: 'Path', value: endpoint.path },
                { key: 'Operation ID', value: endpoint.operationId },
                { key: 'Has Handler', value: endpoint.hasHandler },
              ],
            };
          }
        }
      });
    }
  );
}
```

**Acceptance Criteria:**
- [ ] `src/devtools/devtools-plugin.ts` created
- [ ] `setupOpenApiDevTools()` function exported
- [ ] Detection guards check: `import.meta.env.DEV`, browser, DevTools installed
- [ ] `setupDevtoolsPlugin()` called with plugin metadata
- [ ] Custom inspector registered with ID 'openapi-endpoints'
- [ ] Inspector label is "Endpoints"
- [ ] `getInspectorTree` handler returns endpoint tree structure
- [ ] Tree root shows total endpoint count
- [ ] Each endpoint child shows method, path, operationId
- [ ] Custom handlers marked with green "Custom" badge
- [ ] `getInspectorState` handler returns selected endpoint details
- [ ] Details include: method, path, operationId, hasHandler, parameters, requestBody, responses
- [ ] Global `window.__VITE_OPENAPI_SERVER__` object created
- [ ] Global object exposes registry, handlers, request log
- [ ] DevTools script injected into Vite client
- [ ] Injection middleware added in configureServer()
- [ ] `@vue/devtools-api` package added to dependencies
- [ ] Tested with Vue 3 playground app
- [ ] DevTools "OpenAPI Server" tab appears
- [ ] Endpoint tree displays correctly
- [ ] Clicking endpoint shows details in inspector
- [ ] Works in Chrome, Firefox, Edge DevTools
- [ ] Committed with message: `feat(devtools): implement Vue DevTools integration with custom inspector`
#### P5-04: Implement Global State Exposure (FR-015)

**Description:** Expose OpenAPI registry and runtime state on `window.__VITE_OPENAPI_SERVER__` for DevTools and debugging. Includes endpoint list, handler status, schema registry, request log, and helper methods. Only available in dev mode and browser environment. Provides programmatic access to mock server state for advanced debugging and testing.

**Context:**
- **Global object**: `window.__VITE_OPENAPI_SERVER__` namespace
- **Dev only**: Only expose in development mode (security)
- **Contents**: registry, endpoints array, handlers Map, schemas, request log, helpers
- **Use cases**: DevTools integration, console debugging, automated testing, documentation generation
- **Updates**: Registry set once on startup; request log updated in real-time (if logged)

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P5-04.1 | Define global interface | Create TypeScript interface for `__VITE_OPENAPI_SERVER__` object. Include: registry, endpoints, handlers, schemas, version, methods. |
| P5-04.2 | Implement global object | In client injection, create global object: `window.__VITE_OPENAPI_SERVER__ = { registry, getEndpoints(), getHandlers(), ... }`. |
| P5-04.3 | Add helper methods | `getEndpoints()` returns endpoint array. `getHandlerStatus(operationId)` returns boolean. `getSchema(name)` returns schema object. |
| P5-04.4 | Add request logging | If verbose mode, push request logs to global array: `window.__VITE_OPENAPI_SERVER__.requestLog.push(...)`. Limit to last 100 requests. |
| P5-04.5 | Document global API | Add section to README: "Debugging with Console". Show example: `window.__VITE_OPENAPI_SERVER__.getEndpoints()`. List all available methods and properties. |

**Technical Considerations:**
- **Security**: Only expose in dev mode; remove in production builds
- **TypeScript**: Extend Window interface for type safety
- **Memory**: Limit request log size to prevent memory leaks
- **Reactivity**: Global object is static snapshot; doesn't update automatically (except request log)

**Expected Outputs:**

1. **Global object structure**:
```typescript
declare global {
  interface Window {
    __VITE_OPENAPI_SERVER__?: {
      version: string;
      registry: OpenApiEndpointRegistry;
      getEndpoints(): Array<EndpointInfo>;
      getHandlerStatus(operationId: string): boolean;
      getSchema(name: string): SchemaObject | undefined;
      requestLog: Array<RequestLogEntry>;
    };
  }
}

window.__VITE_OPENAPI_SERVER__ = {
  version: '1.0.0',
  registry,
  getEndpoints: () => Array.from(registry.endpoints.values()),
  getHandlerStatus: (id) => registry.endpoints.get(id)?.hasHandler || false,
  getSchema: (name) => registry.schemas.get(name)?.schema,
  requestLog: [],
};
```

2. **Console debugging example**:
```javascript
// In browser console
window.__VITE_OPENAPI_SERVER__.getEndpoints()
// Returns: [{ method: 'GET', path: '/pets', operationId: 'listPets', ... }]

window.__VITE_OPENAPI_SERVER__.getHandlerStatus('addPet')
// Returns: true (has custom handler)

window.__VITE_OPENAPI_SERVER__.getSchema('Pet')
// Returns: { type: 'object', properties: { ... } }
```

**Acceptance Criteria:**
- [ ] Global object interface defined in TypeScript
- [ ] Window interface extended with `__VITE_OPENAPI_SERVER__` property
- [ ] Global object created in client injection code
- [ ] Object only created in dev mode (`import.meta.env.DEV`)
- [ ] Object only created in browser (`typeof window !== 'undefined'`)
- [ ] `version` property shows plugin version
- [ ] `registry` property exposes full OpenAPI registry
- [ ] `getEndpoints()` method returns array of all endpoints
- [ ] `getHandlerStatus(operationId)` method returns boolean
- [ ] `getSchema(name)` method returns schema object or undefined
- [ ] `requestLog` array initialized as empty
- [ ] Request log populated if verbose mode enabled
- [ ] Request log entries include: method, path, operationId, status, timestamp
- [ ] Request log limited to last 100 entries (circular buffer)
- [ ] README includes "Debugging with Console" section
- [ ] Documentation shows example console commands
- [ ] Documentation lists all available properties and methods
- [ ] TypeScript autocomplete works for global object
- [ ] Tested in browser console with playground app
- [ ] Verified methods return correct data
- [ ] Verified request log updates in real-time
- [ ] Committed with message: `feat(devtools): expose global state object for debugging and DevTools integration`
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

## 9.4 Phase 6: Advanced DevTools Simulation

### 9.4.1 Overview

**Objective:** Implement advanced DevTools features for response simulation and testing, as defined in PRS FR-015 but deferred from Phase 5.

**Dependencies:** Phase 5 (DevTools Plugin and Global State)

**Deliverables:**
- Interactive simulation panel UI in Vue DevTools
- HTTP status code simulation via UI controls
- Network condition simulation (latency, timeout, connection drops)
- Error scenario simulation (server errors, rate limiting)
- Edge case simulation (malformed responses, empty content)
- Query parameter generation for simulation URLs
- Simulation presets (save/load configurations)
- Request timeline logging in DevTools
- Copy URL to clipboard with simulation params

---

### 9.4.2 Task Breakdown

#### P6-01: Implement Request Timeline

**Description:** Add a timeline layer to Vue DevTools that logs all API requests made through the mock server. Shows request method, path, status, duration, and whether a custom handler was used.

**Context:**
- Uses `api.addTimelineLayer()` from @vue/devtools-api
- Subscribes to request events from the mock server
- Shows real-time request flow with timing information
- Integrates with existing requestLog from GlobalState

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P6-01.1 | Create timeline layer | Call `api.addTimelineLayer({ id: 'openapi-requests', label: 'API Requests', color: 0x3b82f6 })` |
| P6-01.2 | Hook into fetch/XHR | Intercept requests to proxyPath and log to timeline |
| P6-01.3 | Format timeline events | Show method badge, path, status code, duration |
| P6-01.4 | Add event details | Expand event to show headers, body, response preview |
| P6-01.5 | Connect to GlobalState | Sync timeline with `requestLog` array |

**Acceptance Criteria:**
- [ ] Timeline layer appears in Vue DevTools
- [ ] API requests logged in real-time
- [ ] Each event shows method, path, status, duration
- [ ] Click event to see full request/response details
- [ ] Timeline synced with GlobalState.requestLog

---

#### P6-02: Implement Simulation Panel UI

**Description:** Create an interactive panel in the DevTools inspector that allows configuring simulation parameters for the selected endpoint.

**Context:**
- Panel appears when an endpoint is selected in the inspector
- Provides dropdowns and inputs for simulation options
- Generates query parameters based on selections
- Shows live URL preview with simulation params

**Estimate:** L (3 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P6-02.1 | Design panel layout | Create state structure for simulation options |
| P6-02.2 | Add status code selector | Dropdown with available status codes from OpenAPI responses |
| P6-02.3 | Add delay input | Number input for response delay in milliseconds |
| P6-02.4 | Add error type selector | Dropdown for error scenarios (timeout, network, server, etc.) |
| P6-02.5 | Add edge case selector | Dropdown for response types (normal, empty, malformed, etc.) |
| P6-02.6 | Show URL preview | Live-updating URL with query parameters |
| P6-02.7 | Add Copy URL button | Copy generated URL to clipboard |

**Acceptance Criteria:**
- [ ] Simulation panel shows for selected endpoint
- [ ] All simulation options configurable via UI
- [ ] URL preview updates in real-time
- [ ] Copy button copies URL to clipboard
- [ ] Reset button clears all options

---

#### P6-03: Implement HTTP Status Simulation

**Description:** Allow simulating different HTTP status codes for responses. The mock server intercepts `?simulateStatus=XXX` and returns that status code.

**Context:**
- Status codes from OpenAPI spec responses + common error codes
- Mock server middleware checks for simulateStatus param
- Returns appropriate error body for each status

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P6-03.1 | Add middleware to mock server | Check for `simulateStatus` query param |
| P6-03.2 | Generate error responses | Create appropriate body for each status code |
| P6-03.3 | Extract available statuses | Read from OpenAPI operation responses |
| P6-03.4 | Update DevTools UI | Populate dropdown with available statuses |
| P6-03.5 | Add status to URL generator | Include simulateStatus in generated URL |

**Acceptance Criteria:**
- [ ] Mock server responds with simulated status
- [ ] Error body matches status code semantics
- [ ] DevTools shows available status codes per endpoint
- [ ] URL generator includes simulateStatus param

---

#### P6-04: Implement Network Condition Simulation

**Description:** Simulate network conditions like latency, timeouts, and connection drops via query parameters.

**Context:**
- `?simulateDelay=2000` adds response delay
- `?simulateTimeout=true` never responds (client timeout)
- `?simulateConnection=drop` closes connection mid-response

**Estimate:** M (2 days)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P6-04.1 | Implement delay simulation | Add setTimeout before response |
| P6-04.2 | Implement timeout simulation | Never send response, let client timeout |
| P6-04.3 | Implement connection drop | Close socket mid-response |
| P6-04.4 | Add presets in UI | Quick buttons for common scenarios (3G, 4G, Slow) |
| P6-04.5 | Update URL generator | Include network simulation params |

**Acceptance Criteria:**
- [ ] simulateDelay works with millisecond precision
- [ ] simulateTimeout causes client-side timeout
- [ ] simulateConnection=drop breaks response
- [ ] Presets apply correct values
- [ ] URL generator includes all network params

---

#### P6-05: Implement Simulation Presets

**Description:** Allow saving and loading simulation configurations as named presets for quick reuse.

**Context:**
- Presets stored in localStorage
- Common presets pre-configured (Slow Network, Server Error, etc.)
- UI to save current config as preset
- UI to load/delete presets

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P6-05.1 | Define preset structure | TypeScript interface for preset config |
| P6-05.2 | Add default presets | Pre-configured common scenarios |
| P6-05.3 | Implement save preset | Save current simulation config to localStorage |
| P6-05.4 | Implement load preset | Apply preset config to simulation panel |
| P6-05.5 | Implement delete preset | Remove custom preset from localStorage |
| P6-05.6 | Add preset UI | Dropdown/list of available presets |

**Acceptance Criteria:**
- [ ] Default presets available out of the box
- [ ] Save button creates new preset
- [ ] Load button applies preset values
- [ ] Delete button removes custom presets
- [ ] Presets persist across sessions (localStorage)

---

#### P6-06: Implement URL Generation with Copy

**Description:** Generate complete URLs with all simulation parameters and provide easy copy-to-clipboard functionality.

**Context:**
- Combines base URL, path, and simulation query params
- Shows full URL preview in DevTools
- Copy button with visual feedback
- Optional: "Open in Browser" button

**Estimate:** S (1 day)

**Subtasks:**

| ID | Subtask | Description |
|----|---------|-------------|
| P6-06.1 | Build URL generator function | Combine proxyPath, endpoint path, simulation params |
| P6-06.2 | Create URL preview component | Show formatted, scrollable URL |
| P6-06.3 | Implement copy to clipboard | Use Clipboard API with fallback |
| P6-06.4 | Add copy feedback | Visual indicator when URL copied |
| P6-06.5 | Add "Open in Browser" | Optional button to open URL in new tab |

**Acceptance Criteria:**
- [ ] URL correctly combines all simulation params
- [ ] URL preview shows full generated URL
- [ ] Copy button copies to clipboard
- [ ] Visual feedback confirms copy
- [ ] URL works when pasted in browser

---

### 9.4.3 Phase 6 Summary

| Task ID | Task Name | Estimate | Dependencies |
|---------|-----------|----------|--------------|
| P6-01 | Implement Request Timeline | M (2d) | P5-04 |
| P6-02 | Implement Simulation Panel UI | L (3d) | P5-03 |
| P6-03 | Implement HTTP Status Simulation | M (2d) | P6-02 |
| P6-04 | Implement Network Condition Simulation | M (2d) | P6-02 |
| P6-05 | Implement Simulation Presets | S (1d) | P6-02 |
| P6-06 | Implement URL Generation with Copy | S (1d) | P6-02 |

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
│  PHASE 6: Advanced DevTools Simulation                                       │
│  ─────────────────────────────────────                                       │
│                                                                              │
│  P5-04 ──── P6-01 (Request Timeline)                                        │
│                                                                              │
│  P5-03 ──── P6-02 ──┬── P6-03 (HTTP Status)                                 │
│                     ├── P6-04 (Network Conditions)                          │
│                     ├── P6-05 (Presets)                                     │
│                     └── P6-06 (URL Generation)                              │
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
| 6 | Advanced DevTools Simulation | 11 | 8 | FR-015 (advanced) |
| **TOTAL** | | **74.5** | **44** | **15 FRs** |

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