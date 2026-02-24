# GitHub Copilot Instructions

## Issue Tracking with bd

This project uses **bd (beads)** for issue tracking - a Git-backed tracker designed for AI-supervised coding workflows.

**Key Features:**
- Dependency-aware issue tracking
- Auto-sync with Git via JSONL
- AI-optimized CLI with JSON output
- Built-in daemon for background operations
- MCP server integration for Claude and other AI assistants

**CRITICAL**: Use bd for ALL task tracking. Do NOT create markdown TODO lists.

### Essential Commands

```bash
# Find work
bd ready --json                    # Unblocked issues
bd stale --days 30 --json          # Forgotten issues

# Create and manage
bd create "Title" -t bug|feature|task -p 0-4 --json
bd create "Subtask" --parent <epic-id> --json  # Hierarchical subtask
bd update <id> --status in_progress --json
bd close <id> --reason "Done" --json

# Search
bd list --status open --priority 1 --json
bd show <id> --json

# Sync (CRITICAL at end of session!)
bd sync  # Force immediate export/commit/push
```

### Workflow

1. **Check ready work**: `bd ready --json`
2. **Claim task**: `bd update <id> --status in_progress`
3. **Work on it**: Implement, test, document
4. **Discover new work?** `bd create "Found bug" -p 1 --deps discovered-from:<parent-id> --json`
5. **Complete**: `bd close <id> --reason "Done" --json`
6. **Sync**: `bd sync` (flushes changes to git immediately)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Git Workflow

- Always commit `.beads/issues.jsonl` with code changes
- Run `bd sync` at end of work sessions
- Install git hooks: `bd hooks install` (ensures DB ↔ JSONL consistency)

### MCP Server (Recommended)

For MCP-compatible clients (Claude Desktop, etc.), install the beads MCP server:
- Install: `pip install beads-mcp`
- Functions: `mcp__beads__ready()`, `mcp__beads__create()`, etc.

## CLI Help

Run `bd <command> --help` to see all available flags for any command.
For example: `bd create --help` shows `--parent`, `--deps`, `--assignee`, etc.

## AI-Assisted Development Flow

This project uses a structured AI-assisted development workflow with three specialized agents:

### Workflow Commands

| Command | Role | Description |
|---------|------|-------------|
| `/developer` | Implementer | Picks up tasks, implements features, commits with conventional commits, marks for review |
| `/coder` | Challenger | Deep code analysis to find bugs, suggest improvements, identify inconsistencies (like CodeRabbit) |
| `/review` | Reviewer | Final validation, runs quality checks, manages labels (approves or requests changes) |

### Development Pipeline

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  developer  │ ──▶ │    coder    │ ──▶ │   review    │
│ implements  │     │ challenges  │     │  validates  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
  needs-review        findings            reviewed
  (adds label)      (PR comments)            or
                    (no labels)         needs-changes
```

### Label Management

**IMPORTANT**: Only `/review` manages workflow labels.

| Label | Meaning | Who Adds | Who Removes |
|-------|---------|----------|-------------|
| `needs-review` | Ready for code analysis/review | `/developer` | `/review` |
| `needs-changes` | Issues found, developer must fix | `/review` | Developer (after fixing) |
| `reviewed` | Approved for merge | `/review` | - |

### Typical Flow

1. **Developer implements** → adds `needs-review` label
2. **Coder challenges** → analyzes code deeply, outputs findings (PR comments or report)
3. **Developer addresses** → fixes critical findings
4. **Review validates** → final check, manages labels (`reviewed` or `needs-changes`)

### Key Rules

- `/coder` does NOT modify code or labels - only analyzes and reports
- `/review` is the gatekeeper - only it can approve or request changes
- All agents use `bd` commands for task tracking
- See `.claude/commands/*.md` for detailed agent instructions

## Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Run `bd sync` at end of sessions
- ✅ Run `bd <cmd> --help` to discover available flags
- ❌ Do NOT create markdown files with TODO lists
- ❌ Do NOT commit `.beads/beads.db` (JSONL only)
