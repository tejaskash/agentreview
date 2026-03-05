---
name: arv
description: Read ARV review threads and address all actionable feedback
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
user-invocable: true
---

# ARV Review Skill

You are addressing code review feedback from AgentReview (ARV). Follow these steps:

## 1. Read the review data

Read the `.agentreview/` directory at the repo root directly:
- `.agentreview/session.json` — current session (base/head branches, status)
- `.agentreview/threads.json` — all review threads with anchors, messages, severity, status

No export step is needed — these files contain everything. You can also run `git diff <baseBranch>...<headBranch>` using the branches from `session.json` if you need the full diff.

## 2. Parse actionable threads

Read `.agentreview/threads.json`. Identify all threads that need action:
- Status: `open`, `addressed`, or `needs-human`
- Skip threads with status `resolved` or `orphaned`

For each actionable thread, note:
- Thread ID (e.g., `t-1`)
- Severity: `must-fix` or `comment`
- The anchored file path and line range (`file`, `anchor.startLine`, `anchor.endLine`)
- The `anchor.anchorText` (the exact code the thread is about)
- The full message history in `messages[]`

## 3. Prioritize and fix

Address threads in priority order:
1. **must-fix** — these are blocking issues
2. **comment** — observations, questions, or minor notes — respond but code changes are optional

For each thread:
- Read the anchored file to understand context
- Make the fix using Edit (prefer minimal, targeted changes)
- If a thread is a comment/question, prepare a reply but don't change code unless warranted

If the user provided arguments (e.g., "only must-fix", "skip comments"), respect those filters.

## 4. Reply to each thread

After fixing, reply to each addressed thread. Try the CLI first:
```
arv thread reply <thread-id> -m "<explanation of what was changed>" --role agent
```

If the `arv` CLI is not installed, edit `.agentreview/threads.json` directly instead. For each thread, append a message to its `messages` array:

```json
{
  "role": "agent",
  "body": "<explanation of what was changed>",
  "createdAt": "<ISO 8601 timestamp>"
}
```

If you made a code change that addresses the thread, also set the thread's `status` to `"addressed"`.

## 5. Summarize

Print a summary table:

```
## ARV Review Summary

| Thread | Severity | File | Action |
|--------|----------|------|--------|
| t-1    | must-fix | path | Fixed: <brief description> |
| ...    | ...      | ...  | ...    |

Addressed: X threads
Skipped: Y threads (resolved/orphaned)
```
