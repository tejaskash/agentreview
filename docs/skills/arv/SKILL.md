---
name: arv
description: Read ARV review threads and address all actionable feedback
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
user-invocable: true
---

# ARV Review Skill

You are addressing code review feedback from AgentReview (ARV). Follow these steps:

## 1. Export the review bundle

Run:
```
arv export -o /tmp/arv-bundle.json
```

If `arv` is not available or fails, read the `.agentreview/` directory at the repo root directly:
- `.agentreview/session.json` — current session metadata
- `.agentreview/threads.json` — all review threads
- `.agentreview/runs/` — run history

## 2. Parse actionable threads

Read the exported bundle (or threads.json). Identify all threads that need action:
- Status: `open`, `addressed`, or `needs-human`
- Skip threads with status `resolved` or `wont-fix`

For each actionable thread, note:
- Thread ID
- Severity (must-fix, should-fix, nit, question)
- The anchored file path and line range
- The reviewer's feedback message

## 3. Prioritize and fix

Address threads in priority order:
1. **must-fix** — these are blocking
2. **should-fix** — important improvements
3. **nit** — style/minor issues
4. **question** — respond with an explanation, no code change needed

For each thread:
- Read the anchored file to understand context
- Make the fix using Edit (prefer minimal, targeted changes)
- If a thread is a question, prepare a reply but don't change code

If the user provided arguments (e.g., "only must-fix", "skip nits"), respect those filters.

## 4. Reply to each thread

After fixing, reply to each addressed thread:
```
arv thread reply <thread-id> -m "<explanation of what was changed>" --role agent
```

If `arv` CLI is unavailable, note the replies you would make.

## 5. Summarize

Print a summary table:

```
## ARV Review Summary

| Thread | Severity | File | Action |
|--------|----------|------|--------|
| #id    | must-fix | path | Fixed: <brief description> |
| ...    | ...      | ...  | ...    |

Addressed: X threads
Skipped: Y threads (resolved/wont-fix)
```
