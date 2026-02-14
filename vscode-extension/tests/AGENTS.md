# AGENTS.md — vscode-extension/tests/

## Purpose

Vitest test suite for the VS Code extension. Uses a comprehensive vscode API mock.

## Files

| File | Scope | What it tests |
|------|-------|--------------|
| `__mocks__/vscode.ts` | Mock | Full vscode API stub: classes (TreeItem, Uri, Range, etc.), enums, namespace stubs (window, workspace, commands, languages, env). Aliased via vitest config. |
| `unit/core-bridge.test.ts` | Unit | CoreBridge methods against real temp git repos: session CRUD, git operations, thread CRUD, anchor creation, export bundle generation (21 tests) |
| `unit/tree-provider.test.ts` | Unit | Tree view structure: root children, session node, status groups, thread placement, node labels/commands (9 tests) |
| `unit/decoration-provider.test.ts` | Unit | Decoration type creation, line range mapping, clearing for out-of-repo files (4 tests) |
| `unit/status-bar.test.ts` | Unit | Hide when no session, thread count display, empty-threads text (3 tests) |
| `unit/webview-html.test.ts` | Unit | CSP tag, anchor rendering, message alignment, severity badges, resolve/reopen buttons, HTML escaping (10 tests) |
| `integration/commands.test.ts` | Integration | Command handlers against real git repos: initSession, addThread, showStatus, exportBundle with mocked vscode UI (10 tests) |

## Conventions

- Unit tests for providers use the vscode mock; core-bridge tests use real git repos via `createTestRepo()`/`cleanupTestRepo()` helpers from the CLI package.
- Integration tests combine real git repos with mocked vscode API surfaces (showInputBox, showQuickPick, etc.).
- All test repos are created in OS temp directories.
