# AGENTS.md — vscode-extension/src/panels/

## Purpose

Webview panels for displaying thread conversations and accepting replies.

## Files

| File | What it does |
|------|-------------|
| `thread-panel.ts` | Creates/reveals a webview panel for a single thread. Opens the anchored file in the editor alongside. Handles 4 message types from the webview JS: `reply`, `reply-agent`, `resolve`, `reopen`. |

## Message Passing

The webview (`media/webview/thread-panel.js`) communicates with the extension host via `postMessage`:

| Message type | Direction | Action |
|-------------|-----------|--------|
| `reply` | webview → host | `bridge.replyToThread(id, { role: "human" })` |
| `reply-agent` | webview → host | `bridge.replyToThread(id, { role: "agent" })` |
| `resolve` | webview → host | `bridge.resolveThread(id)` |
| `reopen` | webview → host | `bridge.reopenThread(id)` |

All handlers emit `eventBus.emitThreadsChanged()` and refresh the panel HTML.

## Panel Lifecycle

- Module-level `openPanels: Map<string, WebviewPanel>` prevents duplicate panels per thread.
- Panel HTML is built by `util/webview-html.ts` with CSP restricting scripts/styles to the webview's own origin.
- CSS and JS are loaded from `media/webview/`.
