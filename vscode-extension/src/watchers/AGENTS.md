# AGENTS.md — vscode-extension/src/watchers/

## Purpose

File system watcher that detects external changes to `.agentreview/` data files and triggers UI refresh.

## Files

| File | What it does |
|------|-------------|
| `file-watcher.ts` | Watches `.agentreview/{session.json,threads.json}` using `vscode.RelativePattern`. Fires both `eventBus.emitSessionChanged()` and `emitThreadsChanged()` on create, change, or delete events. Uses a 300ms debounce to coalesce rapid changes (e.g., CLI writing multiple files). |

## Why This Exists

The CLI and extension share the same `.agentreview/` data directory. When the CLI modifies data (e.g., `arv apply`), the extension needs to pick up changes without a manual refresh.
