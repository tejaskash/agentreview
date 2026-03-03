# AGENTS.md — vscode-extension/src/

## Purpose

All extension source code. Entry point, bridge manager, core bridge, event bus, and four subdirectories for commands, providers, panels, and watchers.

## Key Files

| File | Role |
|------|------|
| `extension.ts` | Entry point — `activate()` creates BridgeManager, discovers repos, wires up providers + commands; `deactivate()` is a no-op (cleanup via disposables). Listens for workspace folder changes and new session file creation for dynamic repo discovery. |
| `bridge-manager.ts` | Multi-repo manager. `discoverRepos()` scans workspace folders and `findFiles("**/.agentreview/session.json")`. Maintains `Map<repoRoot, CoreBridge>` and `Map<repoRoot, FileWatcher>`. Key methods: `getBridgeForFile(path)` (longest-prefix match), `getActiveBridge()` (from active editor, falls back to single bridge), `pickBridge()` (QuickPick when ambiguous), `getActiveBridges()` (bridges with sessions). |
| `core-bridge.ts` | Per-repo adapter wrapping CLI core modules from `../../src/`. Methods: session CRUD, git ops (async), thread CRUD, anchor ops, export bundle generation. All wrapped in try/catch returning `undefined` on error, except `applyPatch` which re-throws. |
| `event-bus.ts` | Typed singleton `ArvEventBus` extending `EventEmitter`. Events: `threads-changed`, `session-changed`. Emit methods + typed listeners. |

## Subdirectories

- `commands/` — Command handlers (one per file). Each takes a `CoreBridge` and uses VS Code APIs for user interaction. The bridge is resolved by `extension.ts` via BridgeManager before calling the handler.
- `providers/` — UI providers: tree view, gutter decorations, status bar, inline comments. All take `BridgeManager` and subscribe to event bus for auto-refresh.
- `panels/` — Webview panels for thread conversations.
- `watchers/` — File system watcher for `.agentreview/` data files. BridgeManager creates one per discovered repo.
- `util/` — Small helpers: workspace root detection, webview HTML builder.
