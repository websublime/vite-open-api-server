# vite-plugin-open-api-server

[![npm version](https://img.shields.io/npm/v/@websublime/vite-plugin-open-api-server.svg)](https://www.npmjs.com/package/@websublime/vite-plugin-open-api-server)
[![license](https://img.shields.io/npm/l/@websublime/vite-plugin-open-api-server.svg)](./LICENSE)
[![node version](https://img.shields.io/node/v/@websublime/vite-plugin-open-api-server.svg)](https://nodejs.org/)

Vite plugin for OpenAPI-based mock server with Scalar integration. Enables frontend developers to work independently of backend services during local development, with realistic mock data and customizable response logic.

## Features

- 🚀 **Automatic Mock Server** - Powered by [@scalar/mock-server](https://github.com/scalar/scalar)
- 📄 **OpenAPI 3.x Support** - Load specifications from YAML or JSON files
- 🔄 **Hot Reload** - Automatically reload handlers and seeds on file changes
- 🎯 **Custom Handlers** - Override mock responses with custom logic per endpoint
- 🌱 **Seed Data** - Provide consistent test data with optional Faker.js integration
- 🔌 **Vite Integration** - Seamless integration with Vite's development server
- 📊 **Endpoint Registry** - Track all available endpoints and their customization status
- 🛡️ **TypeScript** - Full TypeScript support with exported types

## Quick Start

### Installation

```bash
pnpm add -D @websublime/vite-plugin-open-api-server
```

### Basic Usage

Add the plugin to your `vite.config.ts`:

```typescript
import { openApiServerPlugin } from '@websublime/vite-plugin-open-api-server';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    openApiServerPlugin({
      openApiPath: './src/api/openapi.yaml',
      port: 3456,
      proxyPath: '/api',
    }),
  ],
});
```

The plugin will:

1. Parse your OpenAPI specification
2. Start a mock server on the specified port
3. Proxy requests from `/api/*` to the mock server
4. Generate realistic responses based on your schema

For detailed configuration options, see the [plugin README](./packages/vite-plugin-open-api-server/README.md).

## Monorepo Structure

This repository is organized as a pnpm monorepo:

```
vite-open-api-server/
├── packages/
│   └── vite-plugin-open-api-server/  # Main plugin package (published to npm)
├── playground/
│   └── petstore-app/                 # Test application with Petstore API
├── history/                          # Planning and architecture documents
└── .github/                          # GitHub Actions workflows
```

| Directory | Description |
|-----------|-------------|
| `packages/vite-plugin-open-api-server` | The main Vite plugin, published to npm as `@websublime/vite-plugin-open-api-server` |
| `playground/petstore-app` | Vue 3 application demonstrating plugin usage with the Swagger Petstore API |

## Development

### Prerequisites

- **Node.js**: `^20.19.0` or `>=22.12.0`
- **pnpm**: `9.15.0` or higher

### Getting Started

```bash
# Install dependencies
pnpm install

# Build the plugin
pnpm build

# Run the playground application
pnpm playground

# Run tests
pnpm test

# Lint and format code
pnpm lint
pnpm format
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm dev` | Start plugin in watch mode |
| `pnpm build` | Build the plugin for production |
| `pnpm test` | Run tests with Vitest |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Check code with Biome |
| `pnpm lint:fix` | Fix linting issues automatically |
| `pnpm format` | Format code with Biome |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm playground` | Start the playground application |
| `pnpm clean` | Remove dist and node_modules |

## AI-Assisted Development

This project uses a **structured AI-assisted development workflow**. This is not vibe coding for non-programmers — we follow a rigorous process to plan, design, and implement features systematically.

### Development Philosophy

Every feature goes through a deliberate process:

1. **Research & Iteration** - Features are first researched, iterated, and refined
2. **Product Requirements** - Documented in `history/PRODUCT-REQUIREMENTS-SPECIFICATION.md` with clear goals and acceptance criteria
3. **Technical Planning** - Detailed implementation plan in `history/PLAN.md` with context, architecture decisions, and step-by-step implementation guides
4. **Task Breakdown** - Epics, tasks, and subtasks are created in [beads](https://github.com/steveyegge/beads) (Git-backed issue tracker)
5. **Implementation** - Structured development following the workflow below

### Workflow Commands

The project uses Claude Code slash commands (`.claude/commands/`) to orchestrate development:

| Command | Role | Description |
|---------|------|-------------|
| `/developer` | Implementer | Picks up tasks from beads, implements features, commits with conventional commits, marks for review |
| `/coder` | Refiner | Refines code for clarity and consistency, applies project standards, preserves functionality |
| `/review` | Reviewer | Validates implementation, runs quality checks, approves or requests changes |

### Development Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  developer  │ ──▶ │    coder    │ ──▶ │   review    │
│ implements  │     │   refines   │     │  validates  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
  needs-review       needs-review         reviewed
                                              or
                                        needs-changes
```

### Issue Tracking with Beads

We use [beads](https://github.com/steveyegge/beads) for issue tracking — a Git-backed tracker designed for AI-supervised coding workflows.

```bash
# Find ready tasks
bd ready --json

# Start work on a task
bd update <task-id> --status in_progress

# Close a task
bd close <task-id> --reason "Implemented feature X"

# Sync with git
bd sync
```

For more details, see `.github/copilot-instructions.md`.

### Key Documents

| Document | Purpose |
|----------|---------|
| `history/PRODUCT-REQUIREMENTS-SPECIFICATION.md` | Product goals, features, and acceptance criteria |
| `history/PLAN.md` | Technical implementation details and architecture |
| `.claude/commands/*.md` | AI agent workflow instructions |
| `.github/copilot-instructions.md` | Beads usage and project rules |

## Documentation

- [Plugin Documentation](./packages/vite-plugin-open-api-server/README.md) - Detailed usage, configuration, and API reference
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute to this project
- [Playground README](./playground/petstore-app/README.md) - Using the test application

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Development setup
- Changeset workflow for versioning
- Code standards and conventions
- Pull request process

## License

[MIT](./LICENSE) © WebSublime