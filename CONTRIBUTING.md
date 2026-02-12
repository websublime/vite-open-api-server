# Contributing to vite-plugin-open-api-server

Thank you for your interest in contributing to vite-plugin-open-api-server! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Changeset Workflow](#changeset-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)

## Getting Started

### Prerequisites

- **Node.js**: `^20.19.0` or `>=22.12.0`
- **pnpm**: `9.15.0` or higher

### Setup

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/websublime/vite-open-api-server.git
   cd vite-open-api-server
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Verify your setup by building and running tests:

   ```bash
   pnpm build
   pnpm test
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names with the following prefixes:

| Prefix | Use Case |
|--------|----------|
| `feature/` | New features or enhancements |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Code refactoring without behavior changes |
| `test/` | Adding or updating tests |
| `chore/` | Maintenance tasks (dependencies, configs) |

Example: `feature/add-response-validation`, `fix/handler-hot-reload`

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code refactoring |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |
| `perf` | Performance improvements |

**Examples:**

```bash
feat(plugin): add support for OpenAPI 3.1

fix(handlers): resolve hot reload race condition

docs(readme): add seed data examples

chore(deps): update @scalar/mock-server to 1.2.0
```

### Development Commands

```bash
# Start plugin in watch mode (for development)
pnpm dev

# In another terminal, run the playground
pnpm playground

# Run tests
pnpm test
pnpm test:watch

# Lint and format
pnpm lint
pnpm lint:fix
pnpm format

# Type checking
pnpm typecheck
```

## Changeset Workflow

This project uses [workspace-tools](https://github.com/nicco-io/workspace-tools) for version management. **Every feature branch must have an associated changeset.**

### Creating a Changeset

After making your changes, create a changeset:

```bash
pnpm changeset
```

Or use the non-interactive mode:

```bash
workspace changeset create --bump <patch|minor|major> --message "<description>" --non-interactive
```

### Choosing the Bump Type

| Bump Type | When to Use | Example |
|-----------|-------------|---------|
| `patch` | Bug fixes, documentation, refactoring (no API changes) | Fixing a handler loading bug |
| `minor` | New features, backwards-compatible additions | Adding a new plugin option |
| `major` | Breaking changes, API modifications | Changing configuration structure |

### Changeset Guidelines

- Write clear, user-facing descriptions
- Explain what changed and why
- Reference related issues if applicable

**Good changeset message:**

```
Add response validation option to verify mock responses against OpenAPI schema
```

**Poor changeset message:**

```
Fixed stuff
```

## Code Standards

### Linting and Formatting

We use [Biome](https://biomejs.dev/) for linting and formatting:

```bash
# Check for issues
pnpm lint

# Auto-fix issues
pnpm lint:fix

# Format code
pnpm format
```

### TypeScript

- Use TypeScript strict mode
- Export all public types
- Document public APIs with TSDoc comments

```typescript
/**
 * Configuration options for the OpenAPI server plugin.
 *
 * @example
 * ```typescript
 * openApiServerPlugin({
 *   openApiPath: './api/openapi.yaml',
 *   port: 3456,
 * })
 * ```
 */
export interface OpenApiServerPluginOptions {
  /** Path to the OpenAPI specification file (YAML or JSON) */
  openApiPath: string;
  /** Port number for the mock server (default: 3456) */
  port?: number;
}
```

### Code Style Guidelines

- Prefer named exports over default exports
- Use meaningful variable and function names
- Keep functions focused and small
- Handle errors appropriately
- Add comments for complex logic

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test -- --coverage
```

### Writing Tests

- Place test files next to the source files with `.test.ts` or `.spec.ts` extension
- Use descriptive test names
- Test edge cases and error scenarios
- Aim for >80% code coverage

```typescript
import { describe, it, expect } from 'vitest';
import { parseOpenApiPath } from './utils';

describe('parseOpenApiPath', () => {
  it('should resolve relative paths correctly', () => {
    const result = parseOpenApiPath('./api/spec.yaml');
    expect(result).toContain('api/spec.yaml');
  });

  it('should throw for non-existent files', () => {
    expect(() => parseOpenApiPath('./missing.yaml')).toThrow();
  });
});
```

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass:**

   ```bash
   pnpm test
   ```

2. **Check linting:**

   ```bash
   pnpm lint
   ```

3. **Verify types:**

   ```bash
   pnpm typecheck
   ```

4. **Create a changeset** (if applicable):

   ```bash
   pnpm changeset
   ```

5. **Update documentation** if you changed public APIs

### Submitting a PR

1. Push your branch to your fork
2. Open a pull request against the appropriate branch:
   - **`next`**: For v1.0.0 development (multi-spec features, breaking changes)
   - **`main`**: For patches to the current stable release (0.x)
3. Fill out the PR template with:
   - Description of changes
   - Related issues
   - Breaking changes (if any)
   - Testing performed

### PR Review Checklist

- [ ] Code follows project conventions
- [ ] Tests added/updated for changes
- [ ] Documentation updated (if applicable)
- [ ] Changeset created (if applicable)
- [ ] All CI checks pass

### After Merge

- Your changeset will be included in the next release
- The release workflow will automatically publish to npm
- You'll be credited in the changelog

## Questions?

If you have questions or need help:

1. Check existing [issues](https://github.com/websublime/vite-open-api-server/issues)
2. Open a new issue for bugs or feature requests
3. Start a discussion for general questions

Thank you for contributing! 🎉
