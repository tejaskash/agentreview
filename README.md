# ARV — Agent Review

A code review tool for the age of AI-generated code. VS Code extension + CLI.

## The Problem

AI agents generate a lot of code — fast. But the review process hasn't kept up. GitHub PR reviews, AI-assisted or not, tend to skim the surface: style nits, obvious bugs, rubber stamps. The hard problems — logic gaps, security holes, architectural drift — slip through because there's no structured way to anchor feedback to specific code, track whether it was actually fixed, and close the loop.

You should be reviewing your own code. ARV makes that practical.

## The Solution

ARV gives you a structured, git-aware review workflow. Open a review session, anchor comments directly to lines of code, mark issues as `comment` or `must-fix`, and track resolution — all inside VS Code or from the command line. When you're working with an AI agent, export the review context as a single JSON bundle or let the agent read the review files directly.

## Quick Start (VS Code)

### 1. Install

```sh
git clone <this repo>
cd agentreview
npm install
npm run turbo:build

# Install the VS Code extension
cd vscode-extension
vsce package
code --install-extension arv-vscode-*.vsix
```

If you don't have `vsce`: `npm install -g @vscode/vsce`

### 2. Start a review

Open your project in VS Code. Run **ARV: Initialize Review Session** from the command palette (`Cmd+Shift+P`). ARV auto-detects your base branch.

### 3. Add review comments

Select code in the editor and type a comment in the inline comment widget that appears — it creates a thread anchored to that code. Threads default to `comment` severity. Click the flame icon (or the badge in the comment body) to escalate to `must-fix`.

You can also right-click a selection and choose **ARV: Add Thread**, or use the keyboard shortcut `Cmd+Shift+T`.

### 4. Track progress

The **Agent Review** panel in the activity bar shows all threads grouped by status. Gutter icons and hover tooltips mark anchored lines. The status bar shows open thread counts.

### 5. Let an agent fix it

If you use [Claude Code](https://docs.anthropic.com/en/docs/claude-code), install the `/arv` skill (see below) and type `/arv` — the agent reads all threads and fixes them in priority order.

For other agents, export a bundle: **ARV: Export for Agent** from the command palette, then feed the JSON to your agent.

## Quick Start (CLI)

```sh
npm install
npm run build
npm link   # makes `arv` available globally

# Start a review session on your feature branch
arv init

# Add review comments anchored to code
arv thread add src/auth.ts 42-58 -m "This auth check skips token expiry" --severity must-fix
arv thread add src/api.ts 10 -m "Consider adding rate limiting"

# Check progress
arv status
arv thread list

# Export for a sandboxed agent, or let an agent read .agentreview/ directly
arv export -o review-bundle.json

# Apply the agent's patch — threads auto-update based on what changed
arv apply agent-fix.diff
```

## Commands (CLI)

### Session

| Command | Description |
|---------|-------------|
| `arv init [--base <branch>]` | Start a review session. Auto-detects `main` or `master` as the base branch. |
| `arv status` | Show session info, thread counts by status, and run history. |
| `arv diff [--stat]` | Show the diff between base and head branches. |
| `arv end` | End the current review session. |

### Threads

| Command | Description |
|---------|-------------|
| `arv thread add <file> <line-range> -m <message> [--severity <level>]` | Create a review thread anchored to a line or range (e.g. `42` or `42-58`). Severity: `comment`, `must-fix`. |
| `arv thread reply <id> -m <message> [--role <role>] [--status <status>]` | Reply to a thread. Role is `human` or `agent`. Optionally set status. |
| `arv thread list [--status <status>] [--file <path>]` | List threads, optionally filtered. |
| `arv thread show <id>` | Show a thread's full conversation and anchor context. |
| `arv thread resolve <id>` | Mark a thread as resolved. |
| `arv thread reopen <id>` | Reopen a resolved thread. |

### Agent Integration

| Command | Description |
|---------|-------------|
| `arv export [-o <file>]` | Export a JSON bundle for sandboxed agents that can't access the filesystem. Writes to stdout if no file given. |
| `arv apply <patch> [--dry-run]` | Apply a unified diff patch. Re-anchors all threads to their new positions and updates statuses automatically. |

> **Tip:** Agents with filesystem access (like Claude Code) don't need the export step — they can read `.agentreview/session.json` and `.agentreview/threads.json` directly.

## How It Works

### Anchors

When you add a thread, ARV captures the exact text at the specified lines plus 3 lines of surrounding context. After a patch is applied, ARV relocates each anchor using exact text matching first, then falls back to fuzzy matching (LCS algorithm, 60% similarity threshold). If an anchor can't be found at all, the thread is marked `orphaned`.

### Thread Status

Threads move through statuses automatically:

- **open** — default state
- **needs-human** — agent flagged it for human attention
- **addressed** — anchor text was changed by a patch (the agent likely fixed it)
- **resolved** — human marked it done
- **orphaned** — anchor text can't be found after a patch

Some transitions happen automatically: replying as a human to a `needs-human` thread moves it to `open`. Applying a patch that changes the anchored code moves the thread to `addressed`.

### Data Storage

All review state is stored locally in `.agentreview/` at the repo root (automatically added to `.gitignore`):

```
.agentreview/
├── session.json       # Session metadata
├── threads.json       # All threads
└── runs/              # One file per export/apply cycle
    ├── run-001.json
    └── ...
```

## VS Code Extension

The extension provides the full ARV experience inside VS Code:

- **Inline comments** — anchor review threads to code selections via the Comment API
- **Severity toggle** — clickable badge in the comment body to switch between `comment` and `must-fix`
- **Activity bar panel** — tree view of all threads grouped by status
- **Gutter decorations** — icons and hover tooltips on anchored lines
- **Command palette** — init, add thread, export, apply patch, status, end session
- **Right-click menu** — add a thread from any selection
- **File watcher** — auto-refreshes when `.agentreview/` data changes on disk
- **Multi-repo** — open a parent folder with multiple git repos and ARV discovers all sessions

The extension bundles the core logic via esbuild — **the CLI does not need to be installed**.

## Claude Code Integration

ARV ships with a `/arv` skill for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that lets an agent read all review threads and fix them automatically — no export step needed.

### Install the `/arv` skill

```sh
mkdir -p ~/.claude/skills/arv
cp docs/skills/arv/SKILL.md ~/.claude/skills/arv/SKILL.md
```

### Usage

1. Start a review session and add threads (via VS Code or CLI)

2. Open Claude Code in the same repo and type:

```
/arv
```

Claude will read all threads, fix issues in priority order (must-fix first), reply to each thread, and print a summary.

3. Filter if needed:

```
/arv only must-fix threads
/arv skip comments
/arv only fix threads in src/auth.ts
```

## Development

```sh
npm install            # Install all dependencies (both packages)
npm run turbo:build    # Build CLI + extension
npm run turbo:test     # Test CLI + extension
npm run build          # CLI only
npm test               # CLI tests only
```

## License

MIT
