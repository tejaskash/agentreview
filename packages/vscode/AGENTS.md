# AGENTS.md — packages/vscode/

## Purpose

VS Code extension for ARV. Provides a graphical interface for managing review sessions, threads, and agent patches — all backed by the same core logic as the CLI. **Does not require the CLI to be installed** — core logic is bundled via esbuild.

## Architecture

```
src/
├── extension.ts          # Entry point — activate/deactivate lifecycle
├── bridge-manager.ts     # Multi-repo bridge discovery and routing
├── core-bridge.ts        # Adapter wrapping core modules from "agentreview"
├── event-bus.ts          # Typed singleton EventEmitter (threads-changed, session-changed)
├── commands/             # Command handlers registered in the command palette
├── providers/            # Tree view, gutter decorations, status bar, inline comments
├── panels/               # Webview panels (thread conversation UI)
├── watchers/             # File system watcher for .agentreview/ changes
└── util/                 # Workspace helper, webview HTML builder
tests/
├── __mocks__/vscode.ts   # Comprehensive vscode API stub
├── unit/                 # Unit tests for providers, bridge, HTML builder
└── integration/          # End-to-end command tests against real git repos
```

**Data flow:** Commands/Watchers → BridgeManager → CoreBridge → core/ logic → EventBus → Providers refresh UI.

## Key Concepts

- **BridgeManager** — central class that discovers all repos in the workspace (via workspace folders + `findFiles("**/.agentreview/session.json")`). Maintains a `Map<repoRoot, CoreBridge>` and a `Map<repoRoot, FileWatcher>`. Provides `getBridgeForFile(path)` (longest-prefix match), `getActiveBridge()` (from active editor), and `pickBridge()` (interactive QuickPick for ambiguous cases).
- **CoreBridge** — per-repo adapter wrapping all CLI core modules. Error-swallowing (returns `undefined` on failure) except `applyPatch` which re-throws.
- **EventBus** — singleton that decouples data mutations from UI updates. Two events: `threads-changed` and `session-changed`. Commands emit; providers listen.
- **Multi-repo support** — opening a parent folder containing multiple git repos with `.agentreview/` sessions works automatically. The tree view shows a `RepoNode` per repo when >1 is detected; single-repo workspaces look the same as before.
- **Activation** — lazy via `workspaceContains:**/.agentreview/session.json`. Only activates when a review session exists. Dynamic discovery via workspace folder change listener and session file watcher.

## Build & Test

```sh
npm run build       # esbuild → dist/extension.js (CJS, node18, vscode external)
npm run watch       # esbuild in watch mode
npm test            # vitest run (60 tests)
npm run test:watch  # vitest in watch mode
```

## Extension Manifest (package.json)

| Key | Value |
|-----|-------|
| Activity bar | `arv` container with `arvThreads` tree view |
| Commands | `arv.initSession`, `arv.addThread`, `arv.exportBundle`, `arv.applyPatch`, `arv.showStatus`, `arv.openThread`, `arv.bulkResolve`, `arv.bulkResolveGroup`, `arv.endSession` |
| Comment commands | `arv.replyComment`, `arv.resolveComment`, `arv.reopenComment`, `arv.markMustFix`, `arv.markComment` (inline thread buttons) |
| Context menu | `arv.addThread` when `editorHasSelection` |
| Engine | VS Code `^1.85.0` |
