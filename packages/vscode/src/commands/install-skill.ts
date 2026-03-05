import * as vscode from "vscode";
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const SKILL_CONTENT = `---
name: arv
description: Read ARV review threads and address all actionable feedback
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
user-invocable: true
---

# ARV Review Skill

You are addressing code review feedback from AgentReview (ARV). Follow these steps:

## 1. Read the review data

Read the \`.agentreview/\` directory at the repo root directly:
- \`.agentreview/session.json\` — current session (base/head branches, status)
- \`.agentreview/threads.json\` — all review threads with anchors, messages, severity, status

No export step is needed — these files contain everything. You can also run \`git diff <baseBranch>...<headBranch>\` using the branches from \`session.json\` if you need the full diff.

## 2. Parse actionable threads

Read \`.agentreview/threads.json\`. Identify all threads that need action:
- Status: \`open\`, \`addressed\`, or \`needs-human\`
- Skip threads with status \`resolved\` or \`orphaned\`

For each actionable thread, note:
- Thread ID (e.g., \`t-1\`)
- Severity: \`must-fix\` or \`comment\`
- The anchored file path and line range (\`file\`, \`anchor.startLine\`, \`anchor.endLine\`)
- The \`anchor.anchorText\` (the exact code the thread is about)
- The full message history in \`messages[]\`

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
\`\`\`
arv thread reply <thread-id> -m "<explanation of what was changed>" --role agent
\`\`\`

If the \`arv\` CLI is not installed, edit \`.agentreview/threads.json\` directly instead. For each thread, append a message to its \`messages\` array:

\`\`\`json
{
  "role": "agent",
  "body": "<explanation of what was changed>",
  "createdAt": "<ISO 8601 timestamp>"
}
\`\`\`

If you made a code change that addresses the thread, also set the thread's \`status\` to \`"addressed"\`.

## 5. Summarize

Print a summary table:

\`\`\`
## ARV Review Summary

| Thread | Severity | File | Action |
|--------|----------|------|--------|
| t-1    | must-fix | path | Fixed: <brief description> |
| ...    | ...      | ...  | ...    |

Addressed: X threads
Skipped: Y threads (resolved/orphaned)
\`\`\`
`;

function isArvCliInstalled(): boolean {
  const sep = process.platform === "win32" ? ";" : ":";
  const dirs = (process.env.PATH || "").split(sep);
  return dirs.some((dir) => existsSync(join(dir, "arv")));
}

/**
 * Install the ARV skill for Claude Code.
 * @param silent If true, skip messages (used on activation). If false, show feedback (command palette).
 * @param context Extension context for persisting dismissal state. Optional.
 */
export async function installSkill(silent = false, context?: vscode.ExtensionContext): Promise<void> {
  const claudeDir = join(homedir(), ".claude");

  if (!existsSync(claudeDir)) {
    if (!silent) {
      vscode.window.showInformationMessage(
        "Claude Code not detected (~/.claude not found). Install Claude Code first."
      );
    }
    return;
  }

  try {
    const skillDir = join(claudeDir, "skills", "arv");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, "SKILL.md"), SKILL_CONTENT, "utf-8");

    if (!silent) {
      vscode.window.showInformationMessage(
        "ARV skill installed for Claude Code (~/.claude/skills/arv/SKILL.md)."
      );
    }

    const dismissed = context?.globalState.get<boolean>("arv.cliNudgeDismissed");
    if (!dismissed && !isArvCliInstalled()) {
      const action = await vscode.window.showInformationMessage(
        "The ARV CLI is not installed. Install it for terminal-based reviews and agent integration.",
        "Copy Install Command",
        "Don't Show Again"
      );
      if (action === "Copy Install Command") {
        await vscode.env.clipboard.writeText("npm install -g agentreview");
        vscode.window.showInformationMessage("Copied: npm install -g agentreview");
      } else if (action === "Don't Show Again") {
        await context?.globalState.update("arv.cliNudgeDismissed", true);
      }
    }
  } catch (err) {
    if (!silent) {
      vscode.window.showErrorMessage(
        `Failed to install ARV skill: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}
