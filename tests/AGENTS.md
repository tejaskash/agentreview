# AGENTS.md — tests/

## Purpose

Vitest test suite covering unit, integration, and end-to-end tests for ARV.

## Files

| File | Scope | What it tests |
|------|-------|--------------|
| `helpers.ts` | Utilities | `createTestRepo()` — creates isolated temp git repos with an initial commit and feature branch. `cleanupTestRepo()` — removes them. Used by all test files. |
| `session.test.ts` | Unit | Session creation, loading, deletion, path helpers, gitignore management |
| `threads.test.ts` | Unit | Thread add, reply, list, filter, resolve, reopen, status transitions |
| `anchors.test.ts` | Unit | Anchor creation from files, exact matching, fuzzy LCS matching, re-anchoring after edits |
| `git.test.ts` | Unit | Branch detection, commit hashes, diff generation, patch validation/application |
| `export.test.ts` | Unit | Export bundle generation, run record creation and updates |
| `cli.test.ts` | Integration | CLI commands via subprocess execution (`npx tsx src/cli.ts`) |
| `e2e.test.ts` | E2E | Full workflow: init → thread add → export → apply → status |

## Running Tests

```sh
npm test              # Run all tests
npx vitest run <file> # Run a specific test file
```

## Conventions

- Each test file uses `beforeEach`/`afterEach` for setup and teardown of isolated git repos.
- Tests run with a 10-second timeout (configured in `vitest.config.ts`).
- CLI integration tests execute the CLI as a subprocess and assert on stdout/stderr.
- All test repos are created in OS temp directories to avoid polluting the project.
