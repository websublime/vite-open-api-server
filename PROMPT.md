# Session Workflow Template

This document defines the systematic workflow for each development session. Follow these instructions precisely to maintain consistency, quality, and traceability across all development work.

---

## 🎯 Session Objective

Each session focuses on **one task** and its subtasks. Work is atomic, reviewed, and committed per subtask.

---

## 📋 Pre-Session Checklist

Before starting any work, verify:

- [ ] You are in the project root directory
- [ ] Git is clean (`git status` shows no uncommitted changes)
- [ ] bd is synchronized (`bd sync`)

---

## 🚀 Phase 1: Session Initialization

### 1.1 Discover Current State

```bash
# Check for work in progress
bd list --status in_progress --json

# Check current branch
git branch --show-current

# Check git status
git status
```

### 1.2 Decision Tree

**If there's a task in_progress:**
- Continue from where it left off
- Identify the next open subtask

**If starting fresh (no in_progress tasks):**
- Checkout and pull main
- Identify the next ready task from Phase 0 (or current phase)

```bash
# Switch to main and update
git checkout main
git pull origin main
bd sync

# Find next ready task
bd ready --json
```

### 1.3 Setup Task Branch

```bash
# Create feature branch (naming convention: feature/p0-XX-short-description)
git checkout -b feature/<task-id-kebab-case>
```

### 1.4 Create Workspace Changeset

**CRITICAL**: Every feature branch MUST have an associated changeset for version control and changelog generation.

```bash
# Create changeset for this branch (interactive mode)
workspace changeset create

# Or use non-interactive mode with explicit options
workspace changeset create --bump <patch|minor|major> --message "<description>" --non-interactive
```

**Command Options:**

| Option | Description |
|--------|-------------|
| `--bump <TYPE>` | Bump type: `major`, `minor`, or `patch` |
| `--message <TEXT>` | Description of the changes |
| `--packages <LIST>` | Comma-separated list of packages (auto-detected if omitted) |
| `--env <LIST>` | Comma-separated list of environments (e.g., `staging,prod`) |
| `--branch <NAME>` | Branch name (defaults to current Git branch) |
| `--non-interactive` | Uses provided flags without prompting |
| `--force` | Overwrite existing changeset for this branch |

**Bump Type Guidelines:**

- `patch` - Bug fixes, documentation, refactoring (no API changes)
- `minor` - New features, backwards-compatible additions
- `major` - Breaking changes, API modifications

**Examples:**

```bash
# Feature addition (minor bump)
workspace changeset create --bump minor --message "Add OpenAPI schema validation" --non-interactive

# Bug fix (patch bump)
workspace changeset create --bump patch --message "Fix response type inference" --non-interactive

# Breaking change (major bump)
workspace changeset create --bump major --message "Refactor plugin configuration API" --non-interactive

# Specific packages only
workspace changeset create --bump minor --packages "vite-open-api-server,@voas/core" --non-interactive
```

**Other Changeset Commands:**

```bash
# List all pending changesets
workspace changeset list

# Show details of a specific changeset
workspace changeset show

# Edit an existing changeset
workspace changeset edit

# Delete a changeset
workspace changeset delete

# Check if changeset exists for current branch
workspace changeset check
```

### 1.5 Start Task

```bash
# Set task to in_progress
bd update <task-id> --status in_progress --json

# Sync bd
bd sync
```

### 1.6 Load Task Context

**CRITICAL**: Always read the PLAN.md section for the task before implementation.

```bash
# Get task details to find PLAN.md line references
bd show <task-id> --json
```

Then read the relevant section from `history/PLAN.md` using the line numbers from the task description (e.g., `📖 history/PLAN.md#L533-950`).

---

## 🔄 Phase 2: Subtask Loop

Repeat this loop for each subtask until all are complete.

### 2.1 Identify Next Subtask

```bash
# Show task with dependents (subtasks)
bd show <parent-task-id> --json
```

Pick the first subtask with `status: "open"`.

### 2.2 Start Subtask

```bash
# Set subtask to in_progress
bd update <subtask-id> --status in_progress --json
```

### 2.3 Implement

Execute the subtask according to its description and the PLAN.md specifications.

**During implementation, ensure:**
- Follow existing code patterns and conventions
- Add proper documentation (module-level, functions, types)
- Handle errors appropriately
- Consider edge cases

### 2.4 Review (Critical Step)

Before committing, perform a thorough review:

#### 2.4.1 Code Quality Review

- [ ] **Robustness**: Does the code handle errors and edge cases properly?
- [ ] **Improvements**: Can readability, performance, or patterns be improved?
- [ ] **Consistency**: Does it follow the project's existing patterns?
- [ ] **Documentation**: Are modules, structs, functions, and types documented?
- [ ] **Clean Code**: No dead code, TODOs, or temporary comments?
- [ ] **No Assumptions**: All APIs and sources verified, not assumed?

#### 2.4.2 Acceptance Criteria Check

Review the subtask description and verify all requirements are met.

#### 2.4.3 Technical DoD (Definition of Done)

Run validations when applicable:

```bash
# Lint check (when biome is configured)
pnpm lint

# Type check (when TypeScript is configured)
pnpm typecheck

# Run tests (when tests exist)
pnpm test
```

### 2.5 Decision Point

**If review PASSES:**
- Proceed to commit

**If review FAILS:**
- Fix the issues
- Return to step 2.4

### 2.6 Atomic Commit

```bash
# Stage changes
git add <files>

# Commit with conventional commits format
git commit -m "<type>(<scope>): <description>

<body - what was done>

Closes: <subtask-id>"
```

**Conventional Commits Reference:**
- `feat`: New feature
- `fix`: Bug fix
- `chore`: Maintenance tasks
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Adding tests

**Scope**: Use subtask ID (e.g., `P0-03.2`)

### 2.7 Close Subtask

```bash
# Close with descriptive reason
bd close <subtask-id> --reason "<what was accomplished>" --json

# Sync bd
bd sync
```

### 2.8 Loop Back

Return to **2.1** to process the next subtask.

---

## ✅ Phase 3: Task Completion

When all subtasks are closed:

### 3.1 Verify All Subtasks Complete

```bash
# Show task - all dependents should be closed
bd show <task-id> --json
```

### 3.2 Close Parent Task

```bash
bd close <task-id> --reason "<summary of all work completed>" --json
bd sync
```

### 3.3 Push Branch

```bash
git push -u origin <branch-name>
```

---

## 🏁 Phase 4: Session End

### 4.1 Final Sync

```bash
bd sync
```

### 4.2 Generate Session Summary

Provide a summary including:
- Task completed
- All subtasks completed with brief descriptions
- Files created/modified
- Commits made
- Branch name for PR

### 4.3 Next Steps

Indicate:
- Branch ready for PR/merge
- Next task to pick up in the next session

---

## 📚 Quick Reference

### bd Commands

```bash
bd ready --json                    # Find unblocked tasks
bd show <id> --json                # Show task details with subtasks
bd update <id> --status in_progress --json  # Start work
bd close <id> --reason "..." --json         # Complete work
bd sync                            # Sync with git
bd list --status in_progress --json         # Find WIP
```

### Git Commands

```bash
git checkout -b feature/<name>     # Create feature branch
git add <files>                    # Stage changes
git commit -m "..."                # Commit
git push -u origin <branch>        # Push branch
git checkout main                  # Switch to main
git pull origin main               # Update main
```

### Workspace Changeset Commands

```bash
workspace changeset create         # Create changeset (interactive)
workspace changeset create --bump patch --message "..." --non-interactive  # Non-interactive
workspace changeset list           # List all pending changesets
workspace changeset show           # Show changeset details
workspace changeset edit           # Edit existing changeset
workspace changeset delete         # Delete a changeset
workspace changeset check          # Check if changeset exists for branch
```

### Conventional Commit Template

```
<type>(<scope>): <short description>

<detailed description of what was done>

Closes: <issue-id>
```

---

## ⚠️ Important Rules

1. **Never assume** - Always check APIs, source code, and documentation
2. **One subtask at a time** - Complete and commit before moving to next
3. **Always review** - Code quality check before every commit
4. **Atomic commits** - Each commit corresponds to exactly one subtask
5. **Descriptive close reasons** - Document what was accomplished
6. **Sync bd frequently** - After every subtask completion
7. **Read the PLAN** - Always load context from PLAN.md before implementation
8. **Create changeset early** - Run `workspace changeset create` right after creating the feature branch

---

## 🔧 Troubleshooting

### bd sync fails
```bash
bd doctor --fix
bd sync
```

### Git conflicts
```bash
git stash
git pull origin main
git stash pop
# Resolve conflicts manually
```

### Need to abandon subtask work
```bash
git checkout -- .                  # Discard all changes
bd update <subtask-id> --status open --json  # Reset status
```
