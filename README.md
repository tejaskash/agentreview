# ARV — Agent Review

A local CLI tool for collaborative code reviews between humans and AI agents.

## The Problem

AI agents can write code, but code review is still a back-and-forth conversation. Today, that conversation happens in chat windows or PR comments that agents can't easily parse — there's no structured way to point an agent at specific lines, explain what's wrong, get a fix back, and track whether each issue was actually addressed. You end up copy-pasting diffs, re-explaining context, and manually checking if the agent's patch even touched the right code.

## The Solution

ARV gives that review conversation a structured, git-aware format. You anchor comments to exact lines of code, export the full review context as a single JSON bundle an agent can consume, and apply the agent's patch back — with automatic tracking of which threads were addressed, which need another look, and which got lost in the diff.

## Install

```sh
npm install
npm run build
npm link   # makes `arv` available globally
```

For development without building:

```sh
npx tsx src/cli.ts <command>
```

## Quick Start

```sh
# 1. On your feature branch, start a review session
arv init

# 2. Add review comments anchored to code
arv thread add src/auth.ts 42-58 -m "This auth check skips token expiry" --severity must-fix
arv thread add src/api.ts 10 -m "Consider adding rate limiting" --severity suggestion

# 3. See what you've got
arv status
arv thread list

# 4. Export a bundle for your AI agent
arv export -o review-bundle.json

# 5. Hand the bundle to your agent. It reads the threads, generates a patch.
#    Then apply the patch:
arv apply agent-fix.diff

# 6. Check progress — threads auto-update based on what changed
arv status
```

## Commands

### Session

| Command | Description |
|---------|-------------|
| `arv init [--base <branch>]` | Start a review session. Auto-detects `main` or `master` as the base branch. |
| `arv status` | Show session info, thread counts by status, and run history. |
| `arv diff [--stat]` | Show the diff between base and head branches. |

### Threads

| Command | Description |
|---------|-------------|
| `arv thread add <file> <line-range> -m <message> [--severity <level>]` | Create a review thread anchored to a line or range (e.g. `42` or `42-58`). Severity: `comment`, `suggestion`, `must-fix`. |
| `arv thread reply <id> -m <message> [--role <role>] [--status <status>]` | Reply to a thread. Role is `human` or `agent`. Optionally set status. |
| `arv thread list [--status <status>] [--file <path>]` | List threads, optionally filtered. |
| `arv thread show <id>` | Show a thread's full conversation and anchor context. |
| `arv thread resolve <id>` | Mark a thread as resolved. |
| `arv thread reopen <id>` | Reopen a resolved thread. |

### Agent Integration

| Command | Description |
|---------|-------------|
| `arv export [-o <file>]` | Export a JSON bundle containing the diff, all actionable threads, and a prompt hint. Writes to stdout if no file given. |
| `arv apply <patch> [--dry-run]` | Apply a unified diff patch. Re-anchors all threads to their new positions and updates statuses automatically. |

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

### Export Bundles

The export bundle is a self-contained JSON file with everything an agent needs:

- The full diff between base and head branches
- All actionable threads (open, addressed, needs-human) with their anchors and conversation history
- A prompt hint with instructions for the agent

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

## Development

```sh
npm install            # Install dependencies
npm run build          # Compile TypeScript to dist/
npm test               # Run the full test suite
npm run test:watch     # Run tests in watch mode
```

## License

MIT
