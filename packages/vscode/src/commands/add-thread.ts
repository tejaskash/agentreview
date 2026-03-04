import * as vscode from "vscode";
import path from "node:path";
import type { CoreBridge } from "../core-bridge.js";
import type { Severity } from "agentreview";
import { eventBus } from "../event-bus.js";

export async function addThread(bridge: CoreBridge): Promise<void> {
  if (!bridge.sessionExists()) {
    vscode.window.showErrorMessage(
      "No review session. Run 'ARV: Initialize Review Session' first."
    );
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor.");
    return;
  }

  const selection = editor.selection;
  if (selection.isEmpty) {
    vscode.window.showErrorMessage("Select code to create a review thread.");
    return;
  }

  const filePath = editor.document.uri.fsPath;
  const relPath = path.relative(bridge.repoRoot, filePath);

  // VS Code selections are 0-indexed, anchors are 1-indexed
  const startLine = selection.start.line + 1;
  const endLine = selection.end.line + 1;

  const anchor = bridge.createAnchor(relPath, startLine, endLine);
  if (!anchor) {
    vscode.window.showErrorMessage("Could not create anchor for selection.");
    return;
  }

  const message = await vscode.window.showInputBox({
    prompt: "Review comment",
    placeHolder: "Describe the issue or suggestion...",
  });
  if (!message) return;

  const severityPick = await vscode.window.showQuickPick(
    ["comment", "must-fix"],
    { placeHolder: "Severity" }
  );
  if (!severityPick) return;

  const thread = bridge.addThread({
    file: relPath,
    anchor,
    message,
    severity: severityPick as Severity,
  });

  if (!thread) {
    vscode.window.showErrorMessage("Failed to create thread.");
    return;
  }

  eventBus.emitThreadsChanged();
  vscode.window.showInformationMessage(
    `Thread ${thread.id} created on ${relPath}:${startLine}-${endLine}`
  );
}
