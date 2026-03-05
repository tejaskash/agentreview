import * as vscode from "vscode";
import type { CoreBridge } from "../core-bridge.js";
import type { ThreadStatus } from "agntrev";

export async function showStatus(bridge: CoreBridge): Promise<void> {
  const session = bridge.loadSession();
  if (!session) {
    vscode.window.showErrorMessage("No review session found.");
    return;
  }

  const threads = bridge.listThreads();
  const counts: Record<ThreadStatus, number> = {
    open: 0,
    "needs-human": 0,
    addressed: 0,
    resolved: 0,
    orphaned: 0,
  };
  for (const t of threads) {
    counts[t.status]++;
  }

  const lines = [
    `Session: ${session.headBranch} → ${session.baseBranch} (${session.status})`,
    `Total threads: ${threads.length}`,
    `  Open: ${counts.open}`,
    `  Needs Human: ${counts["needs-human"]}`,
    `  Addressed: ${counts.addressed}`,
    `  Resolved: ${counts.resolved}`,
    `  Orphaned: ${counts.orphaned}`,
  ];

  vscode.window.showInformationMessage(lines.join("\n"), { modal: true });
}
