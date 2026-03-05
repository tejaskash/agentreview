# AGENTS.md — ARV (Agent Review)

## Project Purpose

ARV is a local CLI tool + VS Code extension for collaborative code reviews between humans and AI agents. It manages review sessions tied to git branches, allowing humans to create review threads anchored to specific code regions and agents to read full context and provide fixes via patches.

## Monorepo Structure

This is an npm workspaces monorepo managed by Turborepo.

```
.
├── packages/
│   ├── agentreview/        # Core library + CLI ("agntrev" on NPM)
│   │   ├── src/
│   │   │   ├── core/       # types, session, threads, anchors, git, export
│   │   │   └── cli/        # CLI entry point + command handlers
│   │   └── tests/          # Vitest test suite — unit, integration, and e2e tests
│   └── vscode/             # VS Code extension ("arv-vscode")
│       ├── src/             # Extension source — imports from "agntrev"
│       └── tests/           # Extension tests
├── docs/skills/arv/         # Claude Code /arv skill
├── turbo.json               # Turborepo task config
└── package.json             # Workspace root (private)
```

**Two packages:**
- **`packages/agentreview` (`agentreview`)** — Core library + CLI. Types, session, threads, anchors, git, export logic, and CLI commands. Published to NPM with both library exports and a `agentreview` binary.
- **`packages/vscode` (`arv-vscode`)** — VS Code extension. Depends on `agentreview`, bundles it via esbuild.

**Turbo commands:**
- `npm run build` — build all packages (agentreview first, then extension)
- `npm test` — test all packages
- `npx turbo build/test` — equivalent direct invocations

## Package Architecture (`packages/agentreview/`)

```
packages/agentreview/
├── src/
│   ├── core/              # Core library
│   │   ├── index.ts       # Barrel re-export of all public API
│   │   ├── types.ts       # Shared TypeScript interfaces (Anchor, Thread, Message, Session, etc.)
│   │   ├── session.ts     # Session CRUD, .agentreview directory management
│   │   ├── threads.ts     # Thread CRUD, status transitions, bulk operations
│   │   ├── anchors.ts     # Anchor creation, LCS fuzzy matching, re-anchoring
│   │   ├── git.ts         # simple-git wrappers (branch, diff, patch)
│   │   └── export.ts      # Export bundle generation, run records
│   └── cli/               # CLI tool
│       ├── cli.ts         # CLI entry point — defines all commands via Commander
│       └── commands/      # Command handlers — thin wrappers importing from core
└── tests/                 # Vitest test suite — unit, integration, and e2e tests
```

**Layered design:** CLI → Commands → Core. Commands are thin; all logic lives in the core modules.

**Subpath exports:** Import specific modules via `agentreview/session`, `agentreview/threads`, etc., or use `agentreview` for types and the full API.

## Tech Stack

- **Language:** TypeScript (strict mode, ES2022 target)
- **CLI framework:** Commander
- **Git integration:** simple-git
- **Testing:** Vitest
- **Build output:** `dist/` (compiled JS), binary entry at `dist/cli/cli.js`

## Data Model

All state lives in `.agentreview/` at the repo root (auto-added to `.gitignore`):

- `session.json` — one active session per repo (base/head branch refs, status)
- `threads.json` — array of review threads, each with anchors, messages, severity, status
- `runs/` — export snapshots and patch application records (`run-001.json`, etc.)

**Agents with filesystem access can read these files directly** — no export step needed. The export command exists for sandboxed agents that receive a single JSON blob.

## Key Concepts

- **Session:** A review tied to a feature branch vs a base branch. One session at a time.
- **Thread:** A review comment anchored to a line range in a file. Has severity (`comment`, `must-fix`) and status (`open`, `needs-human`, `addressed`, `resolved`, `orphaned`).
- **Anchor:** A code region identified by line numbers + surrounding context text. Supports fuzzy re-matching via LCS (60% similarity threshold) after patches are applied.
- **Export Bundle:** JSON payload containing the diff, all actionable threads, and a prompt hint — designed for sandboxed agents without filesystem access.
- **Run Record:** Tracks each export/apply cycle for auditability.

## Typical Workflow

### Human + CLI agent (with filesystem access)

1. `agentreview init` — start session on a feature branch
2. `agentreview thread add <file> <lines> -m <msg>` — create review threads
3. Agent reads `.agentreview/session.json` and `.agentreview/threads.json` directly
4. Agent makes fixes, replies via `agentreview thread reply <id> -m '...' --role agent`
5. `agentreview status` — check progress

### Human + sandboxed agent (no filesystem access)

1. `agentreview init` — start session on a feature branch
2. `agentreview thread add <file> <lines> -m <msg>` — create review threads
3. `agentreview export -o bundle.json` — export context for the agent
4. Agent reads bundle, generates a unified diff patch
5. `agentreview apply patch.diff` — apply patch, automatically re-anchor threads
6. `agentreview status` — check progress

## Commands

| Command | Purpose |
|---------|---------|
| `agentreview init [--base]` | Start review session (auto-detects main/master) |
| `agentreview thread add/reply/list/show/resolve/reopen` | Thread CRUD and status management |
| `agentreview export [-o file]` | Export bundle for sandboxed agents |
| `agentreview apply <patch> [--dry-run]` | Apply patch, re-anchor threads |
| `agentreview status` | Show session summary and thread counts |
| `agentreview diff [--stat]` | Show branch diff |
| `agentreview end` | End the review session |

## VS Code Extension

The extension in `packages/vscode/` provides a full GUI for ARV inside VS Code. See `packages/vscode/AGENTS.md` for its architecture and file details. Key points:

- **BridgeManager** discovers and manages multiple repos in a workspace. Each repo gets its own `CoreBridge` and `FileWatcher`.
- **CoreBridge** wraps `agentreview` core logic — the extension bundles it via esbuild (no CLI install needed).
- **Multi-repo support** — opening a parent folder with multiple git repos auto-discovers all ARV sessions.
- **EventBus** (singleton) coordinates UI updates across providers.
- Built with esbuild (CJS bundle), tested with Vitest + a vscode mock.

## Building and Testing

```sh
# Monorepo-wide via turbo
npm run build    # Build all packages (agentreview → extension)
npm test         # Test all packages

# Individual package
cd packages/agentreview && npm run dev   # Run CLI in development
cd packages/agentreview && npm test      # Run tests only
cd packages/vscode && npm test           # Run extension tests only
```

## Conventions

- All file paths in data structures are relative to the repo root.
- Thread IDs are sequential (`t-1`, `t-2`, ...). Run IDs are zero-padded (`run-001`).
- Thread status transitions happen automatically (e.g., `needs-human` → `open` on human reply, `open` → `addressed` when anchor text changes after patch, → `orphaned` when anchor can't be found).
- JSON files use 2-space indentation.
