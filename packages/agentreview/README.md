# AgentReview (ARV)

Code review CLI for AI-generated code. Anchor review threads to specific lines, track resolution, and let agents fix issues automatically.

## Install

```sh
npm install -g agentreview
```

## Quick Start

```sh
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

## Commands

### Session

| Command | Description |
|---------|-------------|
| `arv init [--base <branch>]` | Start a review session. Auto-detects `main` or `master`. |
| `arv status` | Show session info and thread counts by status. |
| `arv diff [--stat]` | Show the diff between base and head branches. |
| `arv end` | End the current review session. |

### Threads

| Command | Description |
|---------|-------------|
| `arv thread add <file> <line-range> -m <message> [--severity <level>]` | Create a thread anchored to a line or range (e.g. `42` or `42-58`). Severity: `comment`, `must-fix`. |
| `arv thread reply <id> -m <message> [--role <role>] [--status <status>]` | Reply to a thread. Role: `human` or `agent`. |
| `arv thread list [--status <status>] [--file <path>]` | List threads, optionally filtered. |
| `arv thread show <id>` | Show a thread's full conversation and anchor context. |
| `arv thread resolve <id>` | Mark a thread as resolved. |
| `arv thread reopen <id>` | Reopen a resolved thread. |

### Agent Integration

| Command | Description |
|---------|-------------|
| `arv export [-o <file>]` | Export a JSON bundle for sandboxed agents. Writes to stdout if no file given. |
| `arv apply <patch> [--dry-run]` | Apply a unified diff. Re-anchors threads and updates statuses automatically. |

Agents with filesystem access (like Claude Code) can read `.agentreview/session.json` and `.agentreview/threads.json` directly — no export needed.

## How It Works

All state lives in `.agentreview/` at the repo root (auto-added to `.gitignore`). When a patch is applied, anchors are relocated using exact text matching first, then fuzzy matching (LCS, 60% similarity threshold). Threads whose anchors can't be found are marked `orphaned`. Threads whose anchor text changed are marked `addressed`.

## VS Code Extension

The [AgentReview VS Code extension](https://marketplace.visualstudio.com/items?itemName=agentreview.agentreview-vscode) provides inline comments, gutter decorations, an activity bar panel, and full command palette integration. The CLI does not need to be installed to use the extension.

## License

MIT
