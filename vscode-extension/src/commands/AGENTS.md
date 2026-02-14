# AGENTS.md — vscode-extension/src/commands/

## Purpose

Command handlers registered in the VS Code command palette and context menus. Each is an async function taking a `CoreBridge` instance.

## Files

| File | Command ID | Palette Title | What it does |
|------|-----------|---------------|-------------|
| `init-session.ts` | `arv.initSession` | ARV: Initialize Review Session | Checks git repo, detects base branch (main/master), prompts for confirmation, creates session, updates gitignore |
| `add-thread.ts` | `arv.addThread` | ARV: Add Thread | Guards on session + editor + selection, prompts for comment and severity, creates anchor + thread |
| `export-bundle.ts` | `arv.exportBundle` | ARV: Export for Agent | Generates bundle + run record, offers clipboard copy or save-to-file |
| `apply-patch.ts` | `arv.applyPatch` | ARV: Apply Patch | Opens file dialog (.diff/.patch), validates, applies patch, re-anchors threads, reports addressed/orphaned counts |
| `show-status.ts` | `arv.showStatus` | ARV: Show Status | Loads session + threads, counts by status, shows modal info message |

## Conventions

- All handlers emit event bus events after mutating data (`emitThreadsChanged`, `emitSessionChanged`).
- Guards (no session, no editor, etc.) show `vscode.window.showWarningMessage` and return early.
- User input via `showInputBox`, `showQuickPick`, `showOpenDialog`, `showSaveDialog`.
