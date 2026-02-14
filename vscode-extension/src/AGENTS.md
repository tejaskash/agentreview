# AGENTS.md — vscode-extension/src/

## Purpose

All extension source code. Entry point, core bridge, event bus, and four subdirectories for commands, providers, panels, and watchers.

## Key Files

| File | Role |
|------|------|
| `extension.ts` | Entry point — `activate()` wires up bridge, providers, commands, watcher; `deactivate()` is a no-op (cleanup via disposables) |
| `core-bridge.ts` | Adapter wrapping CLI core modules from `../../src/`. Methods: session CRUD, git ops (async), thread CRUD, anchor ops, export bundle generation. All wrapped in try/catch returning `undefined` on error, except `applyPatch` which re-throws. |
| `event-bus.ts` | Typed singleton `ArvEventBus` extending `EventEmitter`. Events: `threads-changed`, `session-changed`. Emit methods + typed listeners. |

## Subdirectories

- `commands/` — Command handlers (one per file). Each takes a `CoreBridge` and uses VS Code APIs for user interaction.
- `providers/` — UI providers: tree view, gutter decorations, status bar. All subscribe to event bus for auto-refresh.
- `panels/` — Webview panels for thread conversations.
- `watchers/` — File system watcher for `.agentreview/` data files.
- `util/` — Small helpers: workspace root detection, webview HTML builder.
