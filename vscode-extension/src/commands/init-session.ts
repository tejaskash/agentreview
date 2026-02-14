import * as vscode from "vscode";
import type { CoreBridge } from "../core-bridge.js";
import { eventBus } from "../event-bus.js";

export async function initSession(bridge: CoreBridge): Promise<void> {
  if (!(await bridge.isGitRepo())) {
    vscode.window.showErrorMessage("Not a git repository.");
    return;
  }

  if (bridge.sessionExists()) {
    vscode.window.showWarningMessage("A review session already exists.");
    return;
  }

  const headBranch = await bridge.getCurrentBranch();
  if (!headBranch) {
    vscode.window.showErrorMessage("Could not determine current branch.");
    return;
  }

  // Auto-detect base branch
  let baseBranch: string | undefined;
  if (await bridge.branchExists("main")) {
    baseBranch = "main";
  } else if (await bridge.branchExists("master")) {
    baseBranch = "master";
  }

  // Let user override
  const input = await vscode.window.showInputBox({
    prompt: "Base branch for the review",
    value: baseBranch ?? "main",
    placeHolder: "main",
  });

  if (!input) return; // Cancelled
  baseBranch = input;

  if (!(await bridge.branchExists(baseBranch))) {
    vscode.window.showErrorMessage(`Branch "${baseBranch}" does not exist.`);
    return;
  }

  const baseCommit = await bridge.getCommitHash(baseBranch);
  const headCommit = await bridge.getCommitHash(headBranch);
  if (!baseCommit || !headCommit) {
    vscode.window.showErrorMessage("Could not resolve commit hashes.");
    return;
  }

  const session = bridge.createSession({
    baseBranch,
    baseCommit,
    headBranch,
    headCommit,
  });

  if (!session) {
    vscode.window.showErrorMessage("Failed to create session.");
    return;
  }

  bridge.addToGitignore();
  eventBus.emitSessionChanged();
  eventBus.emitThreadsChanged();
  vscode.window.showInformationMessage(
    `Review session initialized: ${headBranch} → ${baseBranch}`
  );
}
