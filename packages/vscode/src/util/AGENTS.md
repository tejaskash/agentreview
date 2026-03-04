# AGENTS.md — packages/vscode/src/util/

## Purpose

Small utility modules used across the extension.

## Files

| File | What it does |
|------|-------------|
| `workspace.ts` | `getRepoRoot()` — returns the first workspace folder's `fsPath`, or `undefined` if no folder is open. Used as a fallback by `extension.ts` during activation when BridgeManager discovers no repos. |
| `webview-html.ts` | `buildThreadPanelHtml(thread, cspSource, cssUri, jsUri)` — generates the full HTML document for thread panel webviews. Renders anchor code block (with dimmed context lines), message history (human=left, agent=right), reply textarea, and action buttons. Includes HTML escaping and CSP meta tag. |
