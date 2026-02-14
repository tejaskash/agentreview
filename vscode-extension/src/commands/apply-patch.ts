import * as vscode from "vscode";
import type { CoreBridge } from "../core-bridge.js";
import { eventBus } from "../event-bus.js";

export async function applyPatchCommand(bridge: CoreBridge): Promise<void> {
  if (!bridge.sessionExists()) {
    vscode.window.showErrorMessage("No review session found.");
    return;
  }

  const uris = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: { "Patch files": ["diff", "patch"] },
    openLabel: "Select Patch File",
  });

  if (!uris || uris.length === 0) return;
  const patchPath = uris[0].fsPath;

  // Validate patch
  const check = await bridge.checkPatch(patchPath);
  if (!check.valid) {
    vscode.window.showErrorMessage(
      `Patch cannot be applied: ${check.error}`
    );
    return;
  }

  try {
    await bridge.applyPatch(patchPath);
  } catch (err: any) {
    vscode.window.showErrorMessage(`Failed to apply patch: ${err.message}`);
    return;
  }

  // Re-anchor threads for modified files
  // Parse patch to find modified files
  const fs = await import("node:fs");
  const patchContent = fs.readFileSync(patchPath, "utf-8");
  const modifiedFiles = [
    ...new Set(
      patchContent
        .split("\n")
        .filter((l) => l.startsWith("+++ b/"))
        .map((l) => l.slice(6))
    ),
  ];

  const result = bridge.reanchorThreads(modifiedFiles);

  eventBus.emitThreadsChanged();
  vscode.window.showInformationMessage(
    `Patch applied. ${result.addressed.length} addressed, ${result.orphaned.length} orphaned.`
  );
}
