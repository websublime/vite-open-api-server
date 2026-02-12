# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Note**: This project uses [bd (beads)](https://github.com/steveyegge/beads)
for issue tracking. Use `bd` commands instead of markdown TODOs.
See AGENTS.md for workflow details.

## Project Overview

The `@websublime/vite-plugin-open-api-server` is a Vite plugin that provides a local OpenAPI server for frontend development. It automatically creates API endpoints based on OpenAPI specifications, enabling frontend developers to work independently of backend services during local development.

### Key Capabilities

- Parse and process OpenAPI 2.0/3.x specifications (bundle, upgrade to 3.1, dereference)
- Custom Hono-based HTTP server with automatic route generation
- In-memory data store with CRUD operations per schema
- Custom request handlers for endpoint customization
- Seed data system for populating store with test data
- Automatic fake data generation with Faker.js
- Hot reload for handlers and seeds
- Vue DevTools integration via iframe SPA
- Real-time WebSocket communication for DevTools
- Error/delay simulation for testing edge cases

## Repository Structure

```
vite-open-api-server/
├── packages/
│   ├── core/                         # Core server logic (Hono, store, generator)
│   ├── devtools-client/              # Vue SPA for DevTools
│   ├── vite-plugin/                  # Vite plugin wrapper
│   └── playground/                   # Demo application
├── history/                          # Planning and architecture docs
│   ├── PRODUCT-REQUIREMENTS-DOC-V2.md # Product Requirements Document (v1.0.0)
│   ├── TECHNICAL-SPECIFICATION-V2.md  # Technical Specification (v1.0.0)
│   ├── PLAN-V2.md                     # Development Plan (v1.0.0)
│   ├── PRODUCT-REQUIREMENTS-DOC.md    # [Legacy] PRD (v0.x)
│   ├── TECHNICAL-SPECIFICATION.md     # [Legacy] Tech Spec (v0.x)
│   └── PLAN.md                        # [Legacy] Plan (v0.x)
├── .github/workflows/                # CI/CD workflows
└── biome.json, tsconfig.json, etc.   # Configuration files
```

## Technology Stack

| Technology | Purpose |
|------------|---------|
| **pnpm** | Package manager with workspace support |
| **TypeScript 5.x** | Language (strict mode enabled) |
| **Vite 5+** | Development server and build tool |
| **Hono** | HTTP server framework |
| **@scalar/openapi-parser** | OpenAPI parsing and dereferencing |
| **@scalar/json-magic** | External reference bundling |
| **@scalar/openapi-upgrader** | OpenAPI version upgrade (2.0/3.0 → 3.1) |
| **@faker-js/faker** | Fake data generation |
| **Vue 3** | DevTools client framework |
| **Pinia** | State management for DevTools |
| **tsup** | Library bundler |
| **Vitest** | Testing framework |
| **Biome** | Linting and formatting |

**Note on Dependencies:**
- `@types/node` is pinned to `^20.x` to match the minimum Node.js engine version (`^20.19.0`) despite supporting Node 22+. This ensures type compatibility across all supported Node.js versions and prevents type errors when developers use the minimum supported version.

## Development Commands

```bash
pnpm install        # Install dependencies
pnpm dev            # Watch mode for packages
pnpm build          # Build all packages
pnpm test           # Run tests
pnpm lint           # Check with Biome
pnpm typecheck      # TypeScript validation
pnpm playground     # Run playground app
```

## Beads Version Compatibility (bd)

Tested with **beads CLI 0.47.1**. Version info maintained in `.claude/skills/beads-compat/references/version-info.md`.

- Changelog: https://github.com/steveyegge/beads/blob/main/CHANGELOG.md
- Run `/beads-compat` to check installed version
- beads.el versioning mirrors beads CLI version (e.g., beads.el 0.44.0 = tested with beads 0.44.0)

**Testing the daemon connection**:
```bash
bd daemon --status
```

**CLI fallback** (when daemon unavailable):
```bash
bd list --json
bd ready --json
bd create "Title" --json
```

## Issue Tracking

This project uses **bd (beads)** for issue tracking. Do NOT use markdown TODOs.

```bash
bd ready              # Find available work
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Commit Strategy

**Atomic commits as you go** - Create logical commits during development, not after:

1. **Tests must pass** - Never commit breaking changes. Run `pnpm run test` before every commit.
2. **Fix code, not tests** - If tests fail, fix the implementation first. Only modify tests if they are genuinely wrong.
3. **Commit at logical points**:
   - When a beads task is complete
   - When a meaningful milestone is reached during an in-progress task
   - After fixing a bug or completing a feature unit
4. **No reconstructed history** - Don't batch changes then create artificial commits from a working state. Commits must represent actual development order so checking out any commit yields a working state.
5. **Branches and rollbacks are fine** - Use feature branches, rollback broken changes, experiment freely.

## Documentation

User-facing feature changes must be documented in README.md:
- Add new commands to the Usage section
- Add keybinding tables for new modes
- Add customization options with examples

For visual changes (new UI, modified display):
1. Create a beads task to capture an appropriate screenshot
2. Add an HTML comment in README.md where the screenshot should go:
   ```markdown
   <!-- TODO: Add screenshot for X (see bdel-xxx) -->
   ```

## Session Completion

Work is NOT complete until `git push` succeeds:
```bash
git pull --rebase && bd sync && git push
```
