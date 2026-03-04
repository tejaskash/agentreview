# AGENTS.md — packages/vscode/src/providers/

## Purpose

UI providers that render review data in VS Code. All take `BridgeManager` (not a single `CoreBridge`) and subscribe to the event bus for automatic refresh when data changes.

## Files

| File | Class | What it provides |
|------|-------|-----------------|
| `tree-provider.ts` | `ArvTreeProvider` | Tree view in the activity bar sidebar. **Single repo:** SessionNode + 5 StatusGroupNodes (open, needs-human, addressed, resolved, orphaned). **Multi-repo:** root shows RepoNodes, each expanding to Session + StatusGroups. Each group contains ThreadNodes. Clicking a ThreadNode fires `arv.openThread` with `(threadId, repoRoot)`. |
| `decoration-provider.ts` | `DecorationProvider` | Gutter icons and overview ruler marks on anchored lines. Resolves bridge per file via `manager.getBridgeForFile()`. One decoration type per thread status with distinct colors. Also registers a hover provider showing thread summary + clickable "Open thread" link. |
| `status-bar.ts` | `StatusBarProvider` | Left-aligned status bar item. Shows per-repo counts when active editor is in a known repo (e.g., "ARV [repo-name]: 3 open, 1 resolved"). Shows aggregate when no active editor and multiple repos (e.g., "ARV: 5 threads (2 repos)"). Hides when no session. Listens to active editor changes. |
| `comment-provider.ts` | `ArvCommentProvider` | Inline comment threads via the VS Code Comment API. Uses composite keys (`repoRoot::threadId`) for the comment thread map and a reverse `threadData` map (`CommentThread → { repoRoot, threadId }`) for identity lookup. `contextValue` stores the severity string (`"comment"` or `"must-fix"`) to drive `when`-clause visibility for toggle buttons. `syncThreads()` iterates all bridges. Handles reply, resolve, reopen, and severity toggle via the reverse map. New inline thread creation defaults to `"comment"` severity (no QuickPick prompt). |

## Refresh Pattern

All providers listen to `eventBus.onThreadsChanged` and/or `eventBus.onSessionChanged`, then reload data from BridgeManager/CoreBridge and update their UI. No polling.
