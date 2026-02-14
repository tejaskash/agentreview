# AGENTS.md — ARV (Agent Review)

## Project Purpose

ARV is a local CLI tool for collaborative code reviews between humans and AI agents. It manages review sessions tied to git branches, allowing humans to create review threads anchored to specific code regions and agents to read full context and provide fixes via patches.

## Monorepo Structure

This is an npm workspaces monorepo managed by Turborepo.

```
.
├── src/                    # CLI source code
├── tests/                  # CLI tests
├── vscode-extension/       # VS Code extension (separate package)
│   ├── src/                # Extension source
│   └── tests/              # Extension tests
├── turbo.json              # Turborepo task config
└── package.json            # Root package (CLI + workspaces)
```

**Two packages:**
- **Root (`arv`)** — CLI tool. TypeScript + Commander + simple-git.
- **`vscode-extension` (`arv-vscode`)** — VS Code extension. Imports core logic from the root package via `../../src/`.

**Turbo commands:**
- `npm run turbo:build` — build both packages
- `npm run turbo:test` — test both packages
- `npx turbo build/test` — equivalent direct invocations

## CLI Architecture

```
src/
├── cli.ts              # CLI entry point — defines all commands via Commander
├── types.ts            # Shared TypeScript interfaces (Anchor, Thread, Message, Session, etc.)
├── commands/           # Command handlers — thin wrappers that call into core/
└── core/               # Business logic — session, threads, anchors, git, export
tests/                  # Vitest test suite — unit, integration, and e2e tests
```

**Layered design:** CLI → Commands → Core. Commands are thin; all logic lives in `core/`.

## Tech Stack

- **Language:** TypeScript (strict mode, ES2022 target)
- **CLI framework:** Commander
- **Git integration:** simple-git
- **Testing:** Vitest
- **Build output:** `dist/` (compiled JS), binary entry at `dist/cli.js`

## Data Model

All state lives in `.agentreview/` at the repo root (auto-added to `.gitignore`):

- `session.json` — one active session per repo (base/head branch refs, status)
- `threads.json` — array of review threads, each with anchors, messages, severity, status
- `runs/` — export snapshots and patch application records (`run-001.json`, etc.)

## Key Concepts

- **Session:** A review tied to a feature branch vs a base branch. One session at a time.
- **Thread:** A review comment anchored to a line range in a file. Has severity (`comment`, `suggestion`, `must-fix`) and status (`open`, `needs-human`, `addressed`, `resolved`, `orphaned`).
- **Anchor:** A code region identified by line numbers + surrounding context text. Supports fuzzy re-matching via LCS (60% similarity threshold) after patches are applied.
- **Export Bundle:** JSON payload containing the diff, all actionable threads, and a prompt hint — designed to be consumed by an AI agent.
- **Run Record:** Tracks each export/apply cycle for auditability.

## Typical Workflow

1. `arv init` — start session on a feature branch
2. `arv thread add <file> <lines> -m <msg>` — create review threads
3. `arv export -o bundle.json` — export context for an agent
4. Agent reads bundle, generates a unified diff patch, and replies to threads
5. `arv apply patch.diff` — apply patch, automatically re-anchor threads
6. `arv status` — check progress

## Commands

| Command | Purpose |
|---------|---------|
| `arv init [--base]` | Start review session (auto-detects main/master) |
| `arv thread add/reply/list/show/resolve/reopen` | Thread CRUD and status management |
| `arv export [-o file]` | Generate agent-consumable bundle |
| `arv apply <patch> [--dry-run]` | Apply patch, re-anchor threads |
| `arv status` | Show session summary and thread counts |
| `arv diff [--stat]` | Show branch diff |

## VS Code Extension

The extension in `vscode-extension/` provides a full GUI for ARV inside VS Code. See `vscode-extension/AGENTS.md` for its architecture and file details. Key points:

- **CoreBridge** wraps all CLI core logic — the extension imports directly from `../../src/`.
- **EventBus** (singleton) coordinates UI updates across providers.
- Built with esbuild (CJS bundle), tested with Vitest + a vscode mock.

## Building and Testing

```sh
npm install
npm run build        # TypeScript → dist/ (CLI only)
npm test             # Run CLI test suite
npx tsx src/cli.ts   # Run CLI in development

# Monorepo-wide via turbo
npm run turbo:build  # Build CLI + extension
npm run turbo:test   # Test CLI + extension
```

## Conventions

- All file paths in data structures are relative to the repo root.
- Thread IDs are sequential (`t-1`, `t-2`, ...). Run IDs are zero-padded (`run-001`).
- Thread status transitions happen automatically (e.g., `needs-human` → `open` on human reply, `open` → `addressed` when anchor text changes after patch, → `orphaned` when anchor can't be found).
- JSON files use 2-space indentation.
