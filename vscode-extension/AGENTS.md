# AGENTS.md — vscode-extension/

## Purpose

VS Code extension for ARV. Provides a graphical interface for managing review sessions, threads, and agent patches — all backed by the same core logic as the CLI.

## Architecture

```
src/
├── extension.ts          # Entry point — activate/deactivate lifecycle
├── core-bridge.ts        # Adapter wrapping CLI core modules (../../src/)
├── event-bus.ts          # Typed singleton EventEmitter (threads-changed, session-changed)
├── commands/             # Command handlers registered in the command palette
├── providers/            # Tree view, gutter decorations, status bar
├── panels/               # Webview panels (thread conversation UI)
├── watchers/             # File system watcher for .agentreview/ changes
└── util/                 # Workspace helper, webview HTML builder
tests/
├── __mocks__/vscode.ts   # Comprehensive vscode API stub
├── unit/                 # Unit tests for providers, bridge, HTML builder
└── integration/          # End-to-end command tests against real git repos
```

**Data flow:** Commands/Watchers → CoreBridge → core/ logic → EventBus → Providers refresh UI.

## Key Concepts

- **CoreBridge** — single adapter that wraps all CLI core modules. All core calls go through this. Error-swallowing (returns `undefined` on failure) except `applyPatch` which re-throws.
- **EventBus** — singleton that decouples data mutations from UI updates. Two events: `threads-changed` and `session-changed`. Commands emit; providers listen.
- **Activation** — lazy via `workspaceContains:**/.agentreview/session.json`. Only activates when a review session exists.

## Build & Test

```sh
npm run build       # esbuild → dist/extension.js (CJS, node18, vscode external)
npm run watch       # esbuild in watch mode
npm test            # vitest run (60+ tests)
npm run test:watch  # vitest in watch mode
```

## Extension Manifest (package.json)

| Key | Value |
|-----|-------|
| Activity bar | `arv` container with `arvThreads` tree view |
| Commands | `arv.initSession`, `arv.addThread`, `arv.exportBundle`, `arv.applyPatch`, `arv.showStatus`, `arv.openThread` |
| Context menu | `arv.addThread` when `editorHasSelection` |
| Engine | VS Code `^1.85.0` |
