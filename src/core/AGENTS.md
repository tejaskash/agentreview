# AGENTS.md — src/core/

## Purpose

Core business logic for ARV. All stateful operations (reading/writing JSON files, interacting with git) live here. Command handlers in `commands/` delegate to these modules.

## Files

| File | Responsibility |
|------|---------------|
| `session.ts` | Session lifecycle — create, load, delete sessions. Provides path helpers (`sessionDir()`, `sessionFile()`, `threadsFile()`, `runsDir()`). Manages `.gitignore` entry for `.agentreview/`. |
| `threads.ts` | Thread CRUD — add threads, add replies, list/filter, resolve/reopen. Handles automatic status transitions (e.g., `needs-human` → `open` on human reply). Generates sequential IDs (`t-1`, `t-2`). |
| `anchors.ts` | Code anchoring — creates anchors from file + line range (captures 3 lines of context). Re-anchors threads after patches using exact match first, then fuzzy LCS matching (60% similarity threshold). |
| `git.ts` | Git wrapper — current branch detection, commit hashes, diff generation, patch validation and application. Uses `simple-git` library. |
| `export.ts` | Export bundles — generates JSON bundles with diff + actionable threads + prompt hint. Manages run records (`run-001.json`, etc.) for tracking export/apply cycles. |

## Key Algorithms

- **Fuzzy anchor matching** (`anchors.ts`): Uses Longest Common Subsequence (LCS) to find the best match for displaced anchor text after code changes. Threshold is 60% similarity. Falls back to marking thread as `orphaned` if no match found.
- **Thread re-anchoring** (`anchors.ts`): After a patch is applied, iterates all open threads and attempts to relocate their anchors in the modified files. Updates line numbers and status accordingly.

## Data Flow

```
commands/ → core/session.ts (get paths) → core/threads.ts or core/export.ts (business logic) → filesystem (.agentreview/*.json)
                                        → core/git.ts (git operations)
                                        → core/anchors.ts (anchor creation/matching)
```
