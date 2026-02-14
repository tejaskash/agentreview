# AGENTS.md — vscode-extension/src/providers/

## Purpose

UI providers that render review data in VS Code. All subscribe to the event bus for automatic refresh when data changes.

## Files

| File | Class | What it provides |
|------|-------|-----------------|
| `tree-provider.ts` | `ArvTreeProvider` | Tree view in the activity bar sidebar. Root children: SessionNode + 5 StatusGroupNodes (open, needs-human, addressed, resolved, orphaned). Each group contains ThreadNodes. Clicking a ThreadNode fires `arv.openThread`. |
| `decoration-provider.ts` | `DecorationProvider` | Gutter icons and overview ruler marks on anchored lines. One decoration type per thread status with distinct colors. Also registers a hover provider showing thread summary + clickable "Open thread" link. |
| `status-bar.ts` | `StatusBarProvider` | Left-aligned status bar item showing thread count summary (e.g., "ARV: 3 open, 1 addressed"). Hides when no session. Clicking focuses the arvThreads tree view. |

## Refresh Pattern

All providers listen to `eventBus.onThreadsChanged` and/or `eventBus.onSessionChanged`, then reload data from `CoreBridge` and update their UI. No polling.
