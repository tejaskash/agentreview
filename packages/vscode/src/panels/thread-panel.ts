import * as vscode from "vscode";
import path from "node:path";
import type { CoreBridge } from "../core-bridge.js";

/**
 * Navigate to a thread's anchored location in the editor.
 * The inline comment (via Comment API) will be visible at that location.
 */
export async function openThreadPanel(
  bridge: CoreBridge,
  threadId: string,
  _extensionPath: string
): Promise<void> {
  const thread = bridge.getThread(threadId);
  if (!thread) {
    vscode.window.showErrorMessage(`Thread ${threadId} not found.`);
    return;
  }

  const filePath = path.join(bridge.repoRoot, thread.file);
  const doc = await vscode.workspace.openTextDocument(filePath);
  const startLine = Math.max(0, thread.anchor.startLine - 1);
  await vscode.window.showTextDocument(doc, {
    selection: new vscode.Range(
      startLine,
      0,
      thread.anchor.endLine - 1,
      0
    ),
  });
}
