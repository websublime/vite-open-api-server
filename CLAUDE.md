# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Note**: This project uses [bd (beads)](https://github.com/steveyegge/beads)
for issue tracking. Use `bd` commands instead of markdown TODOs.
See AGENTS.md for workflow details.

## Project Overview

The `vite-plugin-open-api-server` is a Vite plugin that integrates the Scalar Mock Server into the development workflow. It automatically spawns a mock API server based on OpenAPI specifications, enabling frontend developers to work independently of backend services during local development.

The canonical upstream is https://codeberg.org/ctietze/beads.el

## Beads Version Compatibility

Tested with **beads CLI 0.46.0**. Version info maintained in `.claude/skills/beads-compat/references/version-info.md`.

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
