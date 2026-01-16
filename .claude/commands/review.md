---
allowed-tools: Bash(gh issue view:*), Bash(gh search:*), Bash(gh issue list:*), Bash(gh pr comment:*), Bash(gh pr diff:*), Bash(gh pr view:*), Bash(gh pr list:*), Bash(git diff:*), Bash(git log:*), Bash(git blame:*)
description: Code review for tasks marked with needs-review label
disable-model-invocation: false
---

You are an expert code reviewer. Your task is to review code changes for tasks marked with the `needs-review` label in beads, using local git diff analysis.

---

## 🤖 Workflow

### Step 1: Identify Tasks for Review

Find tasks marked with the `needs-review` label:

```bash
bd list --label needs-review --json
```

Pick a task and get its details:

```bash
bd show <task-id> --json
```

### Step 2: Load Context

Before reviewing, read the project context:

1. **Read the Requirements**: `history/PRODUCT-REQUIREMENTS-SPECIFICATION.md` - Understand the product goals
2. **Read the Plan**: `history/PLAN.md` - Understand the implementation details (use line references from task description)
3. **Read CLAUDE.md**: Check for project-specific coding standards

### Step 3: Checkout Branch and Get Diff

Switch to the task branch and analyze changes locally:

```bash
# Checkout the branch
git checkout <branch-name>

# Get the diff against main
git diff main..HEAD

# See changed files
git diff main..HEAD --stat

# Review commit history
git log main..HEAD --oneline
```

### Step 4: Run Quality Checks

Execute all validation checks before review:

```bash
# Lint check
pnpm lint

# Type check
pnpm typecheck

# Run tests
pnpm test

# Format check (if applicable)
pnpm format:check
```

### Step 5: Code Review Analysis

Launch 5 parallel review analyses to independently review the changes. Each analysis should return a list of issues with severity and reason:

1. **CLAUDE.md Compliance**: Audit the changes to ensure they comply with CLAUDE.md coding standards. Not all instructions apply during review - focus on applicable ones.

2. **Bug Detection**: Do a shallow scan for obvious bugs in the changed code. Focus on large bugs, avoid nitpicks. Ignore likely false positives.

3. **Historical Context**: Read `git blame` and history of modified code to identify bugs in light of historical context.

4. **Code Comments Compliance**: Read code comments in modified files and ensure changes comply with any guidance in the comments.

5. **Test Coverage**: Verify that new functionality has appropriate test coverage and existing tests still pass.

### Step 6: Score Issues

For each issue found, score on a scale of 0-100:

- **0**: False positive - doesn't stand up to scrutiny, or is a pre-existing issue
- **25**: Might be real, but could be false positive. Stylistic issues not explicitly in CLAUDE.md
- **50**: Verified real issue, but might be a nitpick or rare in practice
- **75**: Double-checked and very likely real. Will impact functionality or explicitly mentioned in CLAUDE.md
- **100**: Definitely real, will happen frequently. Evidence directly confirms this

**Filter out issues with score < 80.**

### Step 7: Examples of False Positives (Ignore These)

- Pre-existing issues
- Something that looks like a bug but is not
- Pedantic nitpicks a senior engineer wouldn't call out
- Issues a linter, typechecker, or compiler would catch
- General code quality issues unless explicitly required in CLAUDE.md
- Issues silenced in code (e.g., lint ignore comments)
- Intentional functionality changes related to the broader change
- Real issues on lines the developer did not modify

### Step 8: Update Beads Status

Based on review results:

**If issues found (score >= 80):**

```bash
# Add needs-changes label
bd label add <task-id> needs-changes

# Remove needs-review label
bd label remove <task-id> needs-review

# Sync
bd sync
```

**If no issues found:**

```bash
# Add reviewed label
bd label add <task-id> reviewed

# Remove needs-review label
bd label remove <task-id> needs-review

# Sync
bd sync
```

### Step 9: Comment on PR (Optional)

If a PR exists for this branch and you have `gh` CLI installed, comment with the review results:

```bash
# Check if PR exists
gh pr view --json number

# Comment on PR
gh pr comment <pr-number> --body "<review-comment>"
```

**If no PR is found:**

Ask the developer for the PR link:

> "I couldn't find a PR for this branch. Could you provide the PR link so I can add the review comments?"

Once the developer provides the link, use `gh pr comment` to add the review.

**Comment format for issues found:**

---

### Code review

Found N issues:

1. <brief description of bug> (CLAUDE.md says "<...>")

<link to file and line with full sha1 + line range>

2. <brief description of bug> (bug due to <reason>)

<link to file and line with full sha1 + line range>

🤖 Generated with [Claude Code](https://claude.ai/code)

<sub>- If this code review was useful, please react with 👍. Otherwise, react with 👎.</sub>

---

**Comment format for no issues:**

---

### Code review

No issues found. Checked for bugs and CLAUDE.md compliance.

🤖 Generated with [Claude Code](https://claude.ai/code)

---

## 📚 Quick Reference

### bd Commands

For more details on beads commands, see: `.github/copilot-instructions.md`

```bash
bd list --label needs-review --json   # Find tasks needing review
bd show <id> --json                   # Get task details
bd label add <id> needs-changes       # Mark as needing changes
bd label add <id> reviewed            # Mark as reviewed
bd label remove <id> needs-review     # Remove review label
bd sync                               # Sync with git
```

### Git Commands

```bash
git checkout <branch>                 # Switch to branch
git diff main..HEAD                   # See all changes
git diff main..HEAD --stat            # See changed files summary
git log main..HEAD --oneline          # See commits
git blame <file>                      # See line-by-line history
```

### gh CLI Commands

```bash
gh pr view --json number              # Check if PR exists
gh pr comment <number> --body "..."   # Comment on PR
gh pr list                            # List PRs
```

**Note**: To install `gh` CLI, visit: https://cli.github.com/

---

## ⚠️ Important Notes

- Do not check build signal or attempt to build/typecheck - these run separately in CI
- Use `git diff` for local analysis, `gh` only for PR comments
- Always cite and link each issue with full SHA and line range
- Filter out issues with confidence score < 80
- Focus on real bugs, not style nitpicks